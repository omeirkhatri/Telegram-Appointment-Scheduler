import { initializeDailyAgendaJob } from '@/jobs/dailyAgendaJob';
import { jobSchedulerService } from './jobSchedulerService';

/**
 * Service for initializing all scheduled jobs
 */
export class JobInitializationService {
  private initialized = false;

  /**
   * Initialize all scheduled jobs
   */
  async initializeAllJobs(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ Jobs already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing scheduled jobs...');

      // Initialize daily agenda job
      await initializeDailyAgendaJob();

      // Start the scheduler
      await jobSchedulerService.startScheduler();

      this.initialized = true;
      console.log('✅ All scheduled jobs initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Shutdown all jobs
   */
  async shutdownAllJobs(): Promise<void> {
    try {
      console.log('⏹️ Shutting down scheduled jobs...');

      await jobSchedulerService.stopScheduler();

      this.initialized = false;
      console.log('✅ All scheduled jobs shut down successfully');

    } catch (error) {
      console.error('❌ Failed to shutdown scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Check if jobs are initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get initialization status
   */
  async getInitializationStatus(): Promise<{
    initialized: boolean;
    schedulerRunning: boolean;
    totalJobs: number;
    enabledJobs: number;
  }> {
    const jobs = await jobSchedulerService.getAllJobs();
    const enabledJobs = jobs.filter(job => job.enabled);

    return {
      initialized: this.initialized,
      schedulerRunning: jobSchedulerService.isRunning(),
      totalJobs: jobs.length,
      enabledJobs: enabledJobs.length,
    };
  }
}

// Export singleton instance
export const jobInitializationService = new JobInitializationService();
