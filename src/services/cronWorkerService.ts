import { initializeDailyAgendaJob } from '@/jobs/dailyAgendaJob';
import { getServiceRoleClient } from '@/lib/supabase';
import type { JobSchedulerConfig } from '@/types/job';
import { jobSchedulerService } from './jobSchedulerService';

export interface CronWorkerConfig {
  timezone: string;
  maxConcurrentJobs: number;
  healthCheckInterval: number;
  persistenceInterval: number;
  enableHealthChecks: boolean;
  enablePersistence: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class CronWorkerService {
  private config: CronWorkerConfig;
  private isRunning = false;
  private healthCheckTimer?: NodeJS.Timeout;
  private persistenceTimer?: NodeJS.Timeout;
  private supabase = getServiceRoleClient();
  private startTime: Date | null = null;

  constructor(config: Partial<CronWorkerConfig> = {}) {
    this.config = {
      timezone: 'Asia/Dubai',
      maxConcurrentJobs: 5,
      healthCheckInterval: 30000, // 30 seconds
      persistenceInterval: 60000, // 1 minute
      enableHealthChecks: true,
      enablePersistence: true,
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * Start the cron worker service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'Cron worker is already running');
      return;
    }

    this.log('info', 'Starting cron worker service...');
    this.startTime = new Date();

    try {
      // Initialize job scheduler
      await this.initializeJobScheduler();

      // Register default jobs
      await this.registerDefaultJobs();

      // Start the scheduler
      await jobSchedulerService.startScheduler();

      // Start health checks
      if (this.config.enableHealthChecks) {
        this.startHealthChecks();
      }

      // Start persistence
      if (this.config.enablePersistence) {
        this.startPersistence();
      }

      this.isRunning = true;
      this.log('info', 'Cron worker service started successfully', {
        timezone: this.config.timezone,
        maxConcurrentJobs: this.config.maxConcurrentJobs,
        healthChecks: this.config.enableHealthChecks,
        persistence: this.config.enablePersistence,
      });

      // Log startup completion
      await this.logStartup();

    } catch (error) {
      this.log('error', 'Failed to start cron worker service', { error });
      throw error;
    }
  }

  /**
   * Stop the cron worker service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log('warn', 'Cron worker is not running');
      return;
    }

    this.log('info', 'Stopping cron worker service...');

    try {
      // Stop health checks
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = undefined;
      }

      // Stop persistence
      if (this.persistenceTimer) {
        clearInterval(this.persistenceTimer);
        this.persistenceTimer = undefined;
      }

      // Stop the scheduler
      await jobSchedulerService.stopScheduler();

      this.isRunning = false;
      this.log('info', 'Cron worker service stopped successfully');

      // Log shutdown
      await this.logShutdown();

    } catch (error) {
      this.log('error', 'Error stopping cron worker service', { error });
      throw error;
    }
  }

  /**
   * Get worker status
   */
  getStatus(): {
    isRunning: boolean;
    uptime: number | null;
    config: CronWorkerConfig;
    schedulerStatus: boolean;
  } {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : null;

    return {
      isRunning: this.isRunning,
      uptime,
      config: this.config,
      schedulerStatus: jobSchedulerService.isRunning(),
    };
  }

  /**
   * Get worker health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    checks: {
      scheduler: boolean;
      database: boolean;
      jobs: boolean;
    };
    details: any;
  }> {
    const checks = {
      scheduler: jobSchedulerService.isRunning(),
      database: false,
      jobs: false,
    };

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    try {
      // Check database connection
      const { error } = await this.supabase.from('staff').select('id').limit(1);
      checks.database = !error;

      // Check jobs status
      const allJobs = await jobSchedulerService.getAllJobs();
      checks.jobs = allJobs.length > 0;

      // Determine overall status
      const healthyChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;

      if (healthyChecks === totalChecks) {
        status = 'healthy';
      } else if (healthyChecks > 0) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

    } catch (error) {
      status = 'unhealthy';
      this.log('error', 'Health check failed', { error });
    }

    return {
      status,
      checks,
      details: {
        uptime: this.startTime ? Date.now() - this.startTime.getTime() : null,
        startTime: this.startTime,
        config: this.config,
      },
    };
  }

  /**
   * Restart the worker service
   */
  async restart(): Promise<void> {
    this.log('info', 'Restarting cron worker service...');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await this.start();
  }

  /**
   * Initialize job scheduler with configuration
   */
  private async initializeJobScheduler(): Promise<void> {
    const schedulerConfig: Partial<JobSchedulerConfig> = {
      timezone: this.config.timezone,
      maxConcurrentJobs: this.config.maxConcurrentJobs,
      defaultTimeout: 300000, // 5 minutes
      defaultRetries: 3,
      defaultRetryDelay: 5000,
      logRetentionDays: 30,
      enablePersistence: this.config.enablePersistence,
      persistenceInterval: this.config.persistenceInterval,
    };

    // Update scheduler configuration
    Object.assign(jobSchedulerService, schedulerConfig);
  }

  /**
   * Register default jobs
   */
  private async registerDefaultJobs(): Promise<void> {
    try {
      // Initialize daily agenda job
      await initializeDailyAgendaJob();
      this.log('info', 'Daily agenda job registered');

      // Add more default jobs here as needed
      // await initializeOtherJobs();

    } catch (error) {
      this.log('error', 'Failed to register default jobs', { error });
      throw error;
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();

        if (health.status === 'unhealthy') {
          this.log('error', 'Health check failed - worker is unhealthy', health);
        } else if (health.status === 'degraded') {
          this.log('warn', 'Health check warning - worker is degraded', health);
        } else {
          this.log('debug', 'Health check passed', health);
        }

        // Save health status to database
        await this.saveHealthStatus(health);

      } catch (error) {
        this.log('error', 'Health check error', { error });
      }
    }, this.config.healthCheckInterval);

    this.log('info', 'Health checks started', {
      interval: this.config.healthCheckInterval,
    });
  }

  /**
   * Start persistence
   */
  private startPersistence(): void {
    this.persistenceTimer = setInterval(async () => {
      try {
        await this.persistWorkerState();
      } catch (error) {
        this.log('error', 'Persistence error', { error });
      }
    }, this.config.persistenceInterval);

    this.log('info', 'Persistence started', {
      interval: this.config.persistenceInterval,
    });
  }

  /**
   * Persist worker state to database
   */
  private async persistWorkerState(): Promise<void> {
    try {
      const status = this.getStatus();
      const health = await this.getHealthStatus();

      // Save worker status
      const { error } = await this.supabase
        .from('worker_status')
        .upsert({
          id: 'cron_worker',
          status: status.isRunning ? 'running' : 'stopped',
          uptime: status.uptime,
          health_status: health.status,
          config: this.config,
          last_updated: new Date().toISOString(),
        });

      if (error) {
        this.log('error', 'Failed to persist worker state', { error });
      } else {
        this.log('debug', 'Worker state persisted successfully');
      }

    } catch (error) {
      this.log('error', 'Error persisting worker state', { error });
    }
  }

  /**
   * Save health status to database
   */
  private async saveHealthStatus(health: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('worker_health')
        .insert({
          worker_id: 'cron_worker',
          status: health.status,
          checks: health.checks,
          details: health.details,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        this.log('error', 'Failed to save health status', { error });
      }

    } catch (error) {
      this.log('error', 'Error saving health status', { error });
    }
  }

  /**
   * Log startup event
   */
  private async logStartup(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('worker_events')
        .insert({
          worker_id: 'cron_worker',
          event_type: 'startup',
          message: 'Cron worker service started',
          details: {
            config: this.config,
            timestamp: new Date().toISOString(),
          },
        });

      if (error) {
        this.log('error', 'Failed to log startup event', { error });
      }

    } catch (error) {
      this.log('error', 'Error logging startup event', { error });
    }
  }

  /**
   * Log shutdown event
   */
  private async logShutdown(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('worker_events')
        .insert({
          worker_id: 'cron_worker',
          event_type: 'shutdown',
          message: 'Cron worker service stopped',
          details: {
            uptime: this.startTime ? Date.now() - this.startTime.getTime() : null,
            timestamp: new Date().toISOString(),
          },
        });

      if (error) {
        this.log('error', 'Failed to log shutdown event', { error });
      }

    } catch (error) {
      this.log('error', 'Error logging shutdown event', { error });
    }
  }

  /**
   * Log message with level
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CRON_WORKER] ${level.toUpperCase()}: ${message}`;

    // Check if we should log this level
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex >= currentLevelIndex) {
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
  }
}

// Export singleton instance
export const cronWorkerService = new CronWorkerService();
