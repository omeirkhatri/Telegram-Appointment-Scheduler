import type {
    CronValidationResult,
    JobDefinition,
    JobExecution,
    JobExecutionContext,
    JobHandler,
    JobLog,
    JobLogger,
    JobSchedulerConfig,
    JobStats,
} from '@/types/job';
import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

export class JobSchedulerService {
  private jobs: Map<string, JobDefinition> = new Map();
  private executions: Map<string, JobExecution> = new Map();
  private cronTasks: Map<string, cron.ScheduledTask> = new Map();
  private runningExecutions: Map<string, JobExecution> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private config: JobSchedulerConfig;
  private isSchedulerRunning = false;
  private persistenceTimer?: NodeJS.Timeout;

  constructor(config: Partial<JobSchedulerConfig> = {}) {
    this.config = {
      timezone: 'Asia/Dubai',
      maxConcurrentJobs: 5,
      defaultTimeout: 300000, // 5 minutes
      defaultRetries: 3,
      defaultRetryDelay: 5000,
      logRetentionDays: 30,
      enablePersistence: true,
      persistenceInterval: 60000, // 1 minute
      ...config,
    };

    // Register default job handlers
    this.registerDefaultHandlers();
  }

  /**
   * Add a new job to the scheduler
   */
  async addJob(jobData: Omit<JobDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobDefinition> {
    const job: JobDefinition = {
      ...jobData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate cron expression
    const cronValidation = this.validateCronExpression(job.cronExpression);
    if (!cronValidation.isValid) {
      throw new Error(`Invalid cron expression: ${cronValidation.error}`);
    }

    // Validate job handler exists
    if (!this.handlers.has(job.handler)) {
      throw new Error(`Job handler '${job.handler}' not found`);
    }

    this.jobs.set(job.id, job);

    // Schedule the job if it's enabled
    if (job.enabled) {
      await this.scheduleJob(job);
    }

    console.log(`✅ Job '${job.name}' added with ID: ${job.id}`);
    return job;
  }

  /**
   * Update an existing job
   */
  async updateJob(jobId: string, updates: Partial<JobDefinition>): Promise<JobDefinition> {
    const existingJob = this.jobs.get(jobId);
    if (!existingJob) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    const updatedJob: JobDefinition = {
      ...existingJob,
      ...updates,
      id: jobId, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    // Validate cron expression if it changed
    if (updates.cronExpression) {
      const cronValidation = this.validateCronExpression(updatedJob.cronExpression);
      if (!cronValidation.isValid) {
        throw new Error(`Invalid cron expression: ${cronValidation.error}`);
      }
    }

    // Validate job handler if it changed
    if (updates.handler && !this.handlers.has(updatedJob.handler)) {
      throw new Error(`Job handler '${updatedJob.handler}' not found`);
    }

    // Unschedule existing job
    await this.unscheduleJob(jobId);

    // Update job
    this.jobs.set(jobId, updatedJob);

    // Reschedule if enabled
    if (updatedJob.enabled) {
      await this.scheduleJob(updatedJob);
    }

    console.log(`✅ Job '${updatedJob.name}' updated`);
    return updatedJob;
  }

  /**
   * Remove a job from the scheduler
   */
  async removeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // Unschedule the job
    await this.unscheduleJob(jobId);

    // Remove from jobs map
    this.jobs.delete(jobId);

    console.log(`✅ Job '${job.name}' removed`);
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<JobDefinition | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  async getAllJobs(): Promise<JobDefinition[]> {
    return Array.from(this.jobs.values());
  }

  /**
   * Start a job execution
   */
  async startJob(jobId: string): Promise<JobExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    if (!job.enabled) {
      throw new Error(`Job '${job.name}' is disabled`);
    }

    return await this.executeJob(job, {});
  }

  /**
   * Stop a running job execution
   */
  async stopJob(jobId: string): Promise<void> {
    const runningExecution = Array.from(this.runningExecutions.values())
      .find(exec => exec.jobId === jobId && exec.status === 'running');

    if (!runningExecution) {
      throw new Error(`No running execution found for job ${jobId}`);
    }

    runningExecution.status = 'cancelled';
    runningExecution.completedAt = new Date();
    runningExecution.duration = runningExecution.completedAt.getTime() - runningExecution.startedAt.getTime();

    this.runningExecutions.delete(runningExecution.id);
    this.executions.set(runningExecution.id, runningExecution);

    console.log(`⏹️ Job execution ${runningExecution.id} cancelled`);
  }

  /**
   * Manually trigger a job execution
   */
  async triggerJob(jobId: string, parameters: Record<string, any> = {}): Promise<JobExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    return await this.executeJob(job, parameters);
  }

  /**
   * Get job executions
   */
  async getJobExecutions(jobId: string, limit = 50): Promise<JobExecution[]> {
    const jobExecutions = Array.from(this.executions.values())
      .filter(exec => exec.jobId === jobId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);

    return jobExecutions;
  }

  /**
   * Get job statistics
   */
  async getJobStats(jobId: string): Promise<JobStats> {
    const executions = Array.from(this.executions.values())
      .filter(exec => exec.jobId === jobId);

    return this.calculateJobStats(executions);
  }

  /**
   * Get overall scheduler statistics
   */
  async getAllJobStats(): Promise<JobStats> {
    const allExecutions = Array.from(this.executions.values());
    const stats = this.calculateJobStats(allExecutions);

    // Add total jobs count
    stats.totalJobs = this.jobs.size;

    return stats;
  }

  /**
   * Start the scheduler
   */
  async startScheduler(): Promise<void> {
    if (this.isSchedulerRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Starting job scheduler...');

    // Schedule all enabled jobs
    for (const job of this.jobs.values()) {
      if (job.enabled) {
        await this.scheduleJob(job);
      }
    }

    // Start persistence timer
    if (this.config.enablePersistence) {
      this.startPersistenceTimer();
    }

    this.isSchedulerRunning = true;
    console.log('✅ Job scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  async stopScheduler(): Promise<void> {
    if (!this.isSchedulerRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    console.log('⏹️ Stopping job scheduler...');

    // Stop all cron tasks
    for (const [jobId, task] of this.cronTasks.entries()) {
      task.stop();
      console.log(`⏹️ Stopped cron task for job ${jobId}`);
    }
    this.cronTasks.clear();

    // Stop persistence timer
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = undefined;
    }

    // Cancel all running executions
    for (const execution of this.runningExecutions.values()) {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      this.executions.set(execution.id, execution);
    }
    this.runningExecutions.clear();

    this.isSchedulerRunning = false;
    console.log('✅ Job scheduler stopped successfully');
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.isSchedulerRunning;
  }

  /**
   * Register a job handler
   */
  registerHandler(name: string, handler: JobHandler): void {
    this.handlers.set(name, handler);
    console.log(`📝 Registered job handler: ${name}`);
  }

  /**
   * Validate cron expression
   */
  validateCronExpression(cronExpression: string): CronValidationResult {
    try {
      const isValid = cron.validate(cronExpression);
      if (!isValid) {
        return {
          isValid: false,
          nextExecutions: [],
          error: 'Invalid cron expression format',
        };
      }

      // Calculate next few executions
      const nextExecutions: Date[] = [];
      // This is a simplified version - in production you might want to use a more sophisticated library

      return {
        isValid: true,
        nextExecutions,
      };
    } catch (error) {
      return {
        isValid: false,
        nextExecutions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Schedule a job
   */
  private async scheduleJob(job: JobDefinition): Promise<void> {
    try {
      const task = cron.schedule(
        job.cronExpression,
        async () => {
          await this.executeJob(job, {});
        },
        {
          scheduled: false,
          timezone: job.timezone,
        },
      );

      this.cronTasks.set(job.id, task);
      task.start();

      console.log(`⏰ Scheduled job '${job.name}' with cron: ${job.cronExpression}`);
    } catch (error) {
      console.error(`❌ Failed to schedule job '${job.name}':`, error);
      throw error;
    }
  }

  /**
   * Unschedule a job
   */
  private async unscheduleJob(jobId: string): Promise<void> {
    const task = this.cronTasks.get(jobId);
    if (task) {
      task.stop();
      this.cronTasks.delete(jobId);
      console.log(`⏹️ Unscheduled job ${jobId}`);
    }
  }

  /**
   * Execute a job
   */
  private async executeJob(job: JobDefinition, parameters: Record<string, any>): Promise<JobExecution> {
    const executionId = uuidv4();
    const execution: JobExecution = {
      id: executionId,
      jobId: job.id,
      status: 'running',
      startedAt: new Date(),
      retryCount: 0,
      logs: [],
    };

    this.runningExecutions.set(executionId, execution);

    try {
      // Check concurrent job limit
      if (this.runningExecutions.size > this.config.maxConcurrentJobs) {
        throw new Error(`Maximum concurrent jobs limit (${this.config.maxConcurrentJobs}) exceeded`);
      }

      const handler = this.handlers.get(job.handler);
      if (!handler) {
        throw new Error(`Job handler '${job.handler}' not found`);
      }

      const logger = this.createJobLogger(execution);
      const context: JobExecutionContext = {
        jobId: job.id,
        executionId,
        startTime: execution.startedAt,
        parameters,
        logger,
      };

      logger.info(`Starting job execution: ${job.name}`);

      // Execute with timeout
      const result = await Promise.race([
        handler(context),
        this.createTimeoutPromise(job.timeout),
      ]);

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.result = result;

      logger.info(`Job execution completed successfully in ${execution.duration}ms`);

    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      const logger = this.createJobLogger(execution);
      logger.error(`Job execution failed: ${execution.error}`);

      // Handle retries
      if (execution.retryCount < job.maxRetries) {
        execution.retryCount++;
        logger.info(`Retrying job execution (${execution.retryCount}/${job.maxRetries}) in ${job.retryDelay}ms`);

        // Schedule retry
        setTimeout(async () => {
          await this.executeJob(job, parameters);
        }, job.retryDelay);
      }
    } finally {
      this.runningExecutions.delete(executionId);
      this.executions.set(executionId, execution);
    }

    return execution;
  }

  /**
   * Create job logger
   */
  private createJobLogger(execution: JobExecution): JobLogger {
    return {
      debug: (message: string, data?: any) => this.addLog(execution.id, 'debug', message, data),
      info: (message: string, data?: any) => this.addLog(execution.id, 'info', message, data),
      warn: (message: string, data?: any) => this.addLog(execution.id, 'warn', message, data),
      error: (message: string, data?: any) => this.addLog(execution.id, 'error', message, data),
    };
  }

  /**
   * Add log entry
   */
  private addLog(executionId: string, level: JobLog['level'], message: string, data?: any): void {
    const log: JobLog = {
      id: uuidv4(),
      executionId,
      timestamp: new Date(),
      level,
      message,
      data,
    };

    const execution = this.executions.get(executionId) || this.runningExecutions.get(executionId);
    if (execution) {
      execution.logs.push(log);
    }

    // Also log to console for debugging
    const logMessage = `[${executionId}] ${level.toUpperCase()}: ${message}`;
    switch (level) {
      case 'debug':
        console.debug(logMessage, data);
        break;
      case 'info':
        console.info(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'error':
        console.error(logMessage, data);
        break;
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Job execution timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Calculate job statistics
   */
  private calculateJobStats(executions: JobExecution[]): JobStats {
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    const completedExecutions = executions.filter(e => e.status === 'completed' && e.duration);
    const averageExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;

    const lastExecution = executions.length > 0
      ? executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0].startedAt
      : undefined;

    return {
      totalJobs: this.jobs.size,
      activeJobs: this.runningExecutions.size,
      scheduledJobs: executions.filter(e => e.status === 'scheduled').length,
      completedJobs: completed,
      failedJobs: failed,
      successRate: Math.round(successRate * 100) / 100,
      averageExecutionTime: Math.round(averageExecutionTime),
      lastExecution,
    };
  }

  /**
   * Register default job handlers
   */
  private registerDefaultHandlers(): void {
    // Daily agenda handler will be registered by the daily agenda job
    console.log('📝 Registering default job handlers...');
  }

  /**
   * Start persistence timer
   */
  private startPersistenceTimer(): void {
    this.persistenceTimer = setInterval(async () => {
      try {
        await this.saveJobs();
      } catch (error) {
        console.error('Failed to save jobs:', error);
      }
    }, this.config.persistenceInterval);
  }

  /**
   * Save jobs to persistence (placeholder - would integrate with database)
   */
  async saveJobs(): Promise<void> {
    // In a real implementation, this would save to database
    console.log('💾 Saving jobs to persistence...');
  }

  /**
   * Load jobs from persistence (placeholder - would integrate with database)
   */
  async loadJobs(): Promise<void> {
    // In a real implementation, this would load from database
    console.log('📂 Loading jobs from persistence...');
  }
}

// Export singleton instance
export const jobSchedulerService = new JobSchedulerService();
