import { createClient } from '@/lib/supabase';
import type { JobDefinition, JobExecution, JobStats } from '@/types/job';

export interface JobPersistenceConfig {
  enablePersistence: boolean;
  persistenceInterval: number;
  maxRetentionDays: number;
  batchSize: number;
}

export class JobPersistenceService {
  private supabase = createClient();
  private config: JobPersistenceConfig;
  private isInitialized = false;

  constructor(config: Partial<JobPersistenceConfig> = {}) {
    this.config = {
      enablePersistence: true,
      persistenceInterval: 60000, // 1 minute
      maxRetentionDays: 30,
      batchSize: 100,
      ...config,
    };
  }

  /**
   * Initialize the persistence service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create tables if they don't exist
      await this.createTables();
      this.isInitialized = true;
      console.log('✅ Job persistence service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize job persistence service:', error);
      throw error;
    }
  }

  /**
   * Save job definition to database
   */
  async saveJob(job: JobDefinition): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('job_definitions')
        .upsert({
          id: job.id,
          name: job.name,
          description: job.description,
          type: job.type,
          cron_expression: job.cronExpression,
          timezone: job.timezone,
          priority: job.priority,
          enabled: job.enabled,
          max_retries: job.maxRetries,
          retry_delay: job.retryDelay,
          timeout: job.timeout,
          handler: job.handler,
          parameters: job.parameters,
          created_at: job.createdAt.toISOString(),
          updated_at: job.updatedAt.toISOString(),
        });

      if (error) {
        throw new Error(`Failed to save job: ${error.message}`);
      }

      console.log(`💾 Job '${job.name}' saved to database`);
    } catch (error) {
      console.error('❌ Error saving job:', error);
      throw error;
    }
  }

  /**
   * Load job definition from database
   */
  async loadJob(jobId: string): Promise<JobDefinition | null> {
    try {
      const { data, error } = await this.supabase
        .from('job_definitions')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Job not found
        }
        throw new Error(`Failed to load job: ${error.message}`);
      }

      return this.mapJobFromDatabase(data);
    } catch (error) {
      console.error('❌ Error loading job:', error);
      throw error;
    }
  }

  /**
   * Load all job definitions from database
   */
  async loadAllJobs(): Promise<JobDefinition[]> {
    try {
      const { data, error } = await this.supabase
        .from('job_definitions')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to load jobs: ${error.message}`);
      }

      return data.map(job => this.mapJobFromDatabase(job));
    } catch (error) {
      console.error('❌ Error loading jobs:', error);
      throw error;
    }
  }

  /**
   * Delete job from database
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('job_definitions')
        .delete()
        .eq('id', jobId);

      if (error) {
        throw new Error(`Failed to delete job: ${error.message}`);
      }

      console.log(`🗑️ Job ${jobId} deleted from database`);
    } catch (error) {
      console.error('❌ Error deleting job:', error);
      throw error;
    }
  }

  /**
   * Save job execution to database
   */
  async saveJobExecution(execution: JobExecution): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('job_executions')
        .insert({
          id: execution.id,
          job_id: execution.jobId,
          status: execution.status,
          started_at: execution.startedAt.toISOString(),
          completed_at: execution.completedAt?.toISOString(),
          duration: execution.duration,
          retry_count: execution.retryCount,
          result: execution.result,
          error: execution.error,
          logs: execution.logs,
        });

      if (error) {
        throw new Error(`Failed to save job execution: ${error.message}`);
      }

      console.log(`💾 Job execution ${execution.id} saved to database`);
    } catch (error) {
      console.error('❌ Error saving job execution:', error);
      throw error;
    }
  }

  /**
   * Load job executions from database
   */
  async loadJobExecutions(jobId: string, limit = 50): Promise<JobExecution[]> {
    try {
      const { data, error } = await this.supabase
        .from('job_executions')
        .select('*')
        .eq('job_id', jobId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to load job executions: ${error.message}`);
      }

      return data.map(exec => this.mapExecutionFromDatabase(exec));
    } catch (error) {
      console.error('❌ Error loading job executions:', error);
      throw error;
    }
  }

  /**
   * Get job statistics from database
   */
  async getJobStats(jobId: string): Promise<JobStats> {
    try {
      const { data, error } = await this.supabase
        .from('job_executions')
        .select('status, started_at, duration')
        .eq('job_id', jobId);

      if (error) {
        throw new Error(`Failed to get job stats: ${error.message}`);
      }

      return this.calculateStats(data);
    } catch (error) {
      console.error('❌ Error getting job stats:', error);
      throw error;
    }
  }

  /**
   * Get all job statistics from database
   */
  async getAllJobStats(): Promise<JobStats> {
    try {
      const { data, error } = await this.supabase
        .from('job_executions')
        .select('status, started_at, duration');

      if (error) {
        throw new Error(`Failed to get all job stats: ${error.message}`);
      }

      const stats = this.calculateStats(data);

      // Add total jobs count
      const { count } = await this.supabase
        .from('job_definitions')
        .select('*', { count: 'exact', head: true });

      stats.totalJobs = count || 0;

      return stats;
    } catch (error) {
      console.error('❌ Error getting all job stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old job executions
   */
  async cleanupOldExecutions(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.maxRetentionDays);

      const { error } = await this.supabase
        .from('job_executions')
        .delete()
        .lt('started_at', cutoffDate.toISOString());

      if (error) {
        throw new Error(`Failed to cleanup old executions: ${error.message}`);
      }

      console.log(`🧹 Cleaned up job executions older than ${this.config.maxRetentionDays} days`);
    } catch (error) {
      console.error('❌ Error cleaning up old executions:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    // This would typically be done via migrations, but we'll create them here for completeness
    const tables = [
      {
        name: 'job_definitions',
        sql: `
          CREATE TABLE IF NOT EXISTS job_definitions (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(100) NOT NULL,
            cron_expression VARCHAR(100) NOT NULL,
            timezone VARCHAR(50) NOT NULL,
            priority VARCHAR(20) NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT true,
            max_retries INTEGER NOT NULL DEFAULT 3,
            retry_delay INTEGER NOT NULL DEFAULT 5000,
            timeout INTEGER NOT NULL DEFAULT 300000,
            handler VARCHAR(100) NOT NULL,
            parameters JSONB,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
          );
        `,
      },
      {
        name: 'job_executions',
        sql: `
          CREATE TABLE IF NOT EXISTS job_executions (
            id UUID PRIMARY KEY,
            job_id UUID NOT NULL REFERENCES job_definitions(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL,
            started_at TIMESTAMPTZ NOT NULL,
            completed_at TIMESTAMPTZ,
            duration INTEGER,
            retry_count INTEGER NOT NULL DEFAULT 0,
            result JSONB,
            error TEXT,
            logs JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `,
      },
      {
        name: 'worker_status',
        sql: `
          CREATE TABLE IF NOT EXISTS worker_status (
            id VARCHAR(100) PRIMARY KEY,
            status VARCHAR(20) NOT NULL,
            uptime BIGINT,
            health_status VARCHAR(20),
            config JSONB,
            last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `,
      },
      {
        name: 'worker_health',
        sql: `
          CREATE TABLE IF NOT EXISTS worker_health (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            worker_id VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL,
            checks JSONB NOT NULL,
            details JSONB,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `,
      },
      {
        name: 'worker_events',
        sql: `
          CREATE TABLE IF NOT EXISTS worker_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            worker_id VARCHAR(100) NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            details JSONB,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `,
      },
    ];

    for (const table of tables) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', { sql: table.sql });
        if (error) {
          console.warn(`⚠️ Could not create table ${table.name}:`, error.message);
        }
      } catch (error) {
        console.warn(`⚠️ Could not create table ${table.name}:`, error);
      }
    }
  }

  /**
   * Map job from database format
   */
  private mapJobFromDatabase(data: any): JobDefinition {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      type: data.type,
      cronExpression: data.cron_expression,
      timezone: data.timezone,
      priority: data.priority,
      enabled: data.enabled,
      maxRetries: data.max_retries,
      retryDelay: data.retry_delay,
      timeout: data.timeout,
      handler: data.handler,
      parameters: data.parameters,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Map execution from database format
   */
  private mapExecutionFromDatabase(data: any): JobExecution {
    return {
      id: data.id,
      jobId: data.job_id,
      status: data.status,
      startedAt: new Date(data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      duration: data.duration,
      retryCount: data.retry_count,
      result: data.result,
      error: data.error,
      logs: data.logs || [],
    };
  }

  /**
   * Calculate statistics from execution data
   */
  private calculateStats(executions: any[]): JobStats {
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const successRate = total > 0 ? (completed / total) * 100 : 0;

    const completedExecutions = executions.filter(e => e.status === 'completed' && e.duration);
    const averageExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;

    const lastExecution = executions.length > 0
      ? executions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0].started_at
      : undefined;

    return {
      totalJobs: 0, // Will be set by caller
      activeJobs: 0, // Will be set by caller
      scheduledJobs: executions.filter(e => e.status === 'scheduled').length,
      completedJobs: completed,
      failedJobs: failed,
      successRate: Math.round(successRate * 100) / 100,
      averageExecutionTime: Math.round(averageExecutionTime),
      lastExecution: lastExecution ? new Date(lastExecution) : undefined,
    };
  }
}

// Export singleton instance
export const jobPersistenceService = new JobPersistenceService();
