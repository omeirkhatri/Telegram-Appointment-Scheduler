import type { JobDefinition, JobExecution, JobPersistenceData } from '@/types/job';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Simple file-based job persistence
 * In production, this would use a database
 */
export class JobPersistence {
  private readonly persistenceFile: string;
  private readonly executionsFile: string;

  constructor() {
    const dataDir = join(process.cwd(), 'data');
    this.persistenceFile = join(dataDir, 'jobs.json');
    this.executionsFile = join(dataDir, 'job-executions.json');

    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Save jobs to persistence
   */
  async saveJobs(jobs: JobDefinition[]): Promise<void> {
    try {
      const data: JobPersistenceData = {
        jobs,
        executions: [], // Executions are saved separately
        lastSaved: new Date(),
        version: '1.0.0',
      };

      writeFileSync(this.persistenceFile, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${jobs.length} jobs to persistence`);
    } catch (error) {
      console.error('Failed to save jobs to persistence:', error);
      throw error;
    }
  }

  /**
   * Load jobs from persistence
   */
  async loadJobs(): Promise<JobDefinition[]> {
    try {
      if (!existsSync(this.persistenceFile)) {
        console.log('📂 No jobs persistence file found, starting with empty jobs');
        return [];
      }

      const data = JSON.parse(readFileSync(this.persistenceFile, 'utf-8')) as JobPersistenceData;

      // Convert date strings back to Date objects
      const jobs = data.jobs.map(job => ({
        ...job,
        createdAt: new Date(job.createdAt),
        updatedAt: new Date(job.updatedAt),
      }));

      console.log(`📂 Loaded ${jobs.length} jobs from persistence`);
      return jobs;
    } catch (error) {
      console.error('Failed to load jobs from persistence:', error);
      return [];
    }
  }

  /**
   * Save job executions to persistence
   */
  async saveExecutions(executions: JobExecution[]): Promise<void> {
    try {
      // Keep only recent executions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentExecutions = executions.filter(exec =>
        new Date(exec.startedAt) > thirtyDaysAgo,
      );

      writeFileSync(this.executionsFile, JSON.stringify(recentExecutions, null, 2));
      console.log(`💾 Saved ${recentExecutions.length} job executions to persistence`);
    } catch (error) {
      console.error('Failed to save job executions to persistence:', error);
      throw error;
    }
  }

  /**
   * Load job executions from persistence
   */
  async loadExecutions(): Promise<JobExecution[]> {
    try {
      if (!existsSync(this.executionsFile)) {
        console.log('📂 No job executions persistence file found, starting with empty executions');
        return [];
      }

      const executions = JSON.parse(readFileSync(this.executionsFile, 'utf-8')) as JobExecution[];

      // Convert date strings back to Date objects
      const processedExecutions = executions.map(exec => ({
        ...exec,
        startedAt: new Date(exec.startedAt),
        completedAt: exec.completedAt ? new Date(exec.completedAt) : undefined,
        logs: exec.logs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp),
        })),
      }));

      console.log(`📂 Loaded ${processedExecutions.length} job executions from persistence`);
      return processedExecutions;
    } catch (error) {
      console.error('Failed to load job executions from persistence:', error);
      return [];
    }
  }

  /**
   * Clear all persistence data
   */
  async clearPersistence(): Promise<void> {
    try {
      if (existsSync(this.persistenceFile)) {
        require('fs').unlinkSync(this.persistenceFile);
      }
      if (existsSync(this.executionsFile)) {
        require('fs').unlinkSync(this.executionsFile);
      }
      console.log('🗑️ Cleared all job persistence data');
    } catch (error) {
      console.error('Failed to clear persistence data:', error);
      throw error;
    }
  }

  /**
   * Get persistence status
   */
  getPersistenceStatus(): {
    jobsFileExists: boolean;
    executionsFileExists: boolean;
    jobsFileSize: number;
    executionsFileSize: number;
  } {
    const jobsFileExists = existsSync(this.persistenceFile);
    const executionsFileExists = existsSync(this.executionsFile);

    let jobsFileSize = 0;
    let executionsFileSize = 0;

    if (jobsFileExists) {
      jobsFileSize = require('fs').statSync(this.persistenceFile).size;
    }

    if (executionsFileExists) {
      executionsFileSize = require('fs').statSync(this.executionsFile).size;
    }

    return {
      jobsFileExists,
      executionsFileExists,
      jobsFileSize,
      executionsFileSize,
    };
  }
}

// Export singleton instance
export const jobPersistence = new JobPersistence();
