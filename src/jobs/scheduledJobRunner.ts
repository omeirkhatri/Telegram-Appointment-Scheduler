import { googleCalendarMonitorJob } from './googleCalendarMonitorJob';
import { loggingService } from '@/services/loggingService';

export interface ScheduledJobConfig {
  googleCalendarMonitor: {
    enabled: boolean;
    cronExpression: string;
  };
}

export class ScheduledJobRunner {
  private config: ScheduledJobConfig;
  private isRunning = false;

  constructor(config: ScheduledJobConfig) {
    this.config = config;
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Scheduled job runner is already running');
      return;
    }

    this.isRunning = true;

    // Start Google Calendar monitor job if enabled
    if (this.config.googleCalendarMonitor.enabled) {
      googleCalendarMonitorJob.start();
      loggingService.info('Google Calendar monitor job started via scheduler', {
        component: 'scheduled-job-runner',
        action: 'job_started',
        metadata: {
          job: 'google-calendar-monitor',
          cronExpression: this.config.googleCalendarMonitor.cronExpression,
        },
      });
    }

    console.log('✅ Scheduled job runner started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Scheduled job runner is not running');
      return;
    }

    // Stop Google Calendar monitor job
    if (this.config.googleCalendarMonitor.enabled) {
      googleCalendarMonitorJob.stop();
      loggingService.info('Google Calendar monitor job stopped via scheduler', {
        component: 'scheduled-job-runner',
        action: 'job_stopped',
        metadata: {
          job: 'google-calendar-monitor',
        },
      });
    }

    this.isRunning = false;
    console.log('✅ Scheduled job runner stopped');
  }

  /**
   * Run a specific job manually
   */
  async runJob(jobName: string): Promise<void> {
    switch (jobName) {
      case 'google-calendar-monitor':
        if (this.config.googleCalendarMonitor.enabled) {
          await googleCalendarMonitorJob.runCheck();
        } else {
          throw new Error('Google Calendar monitor job is not enabled');
        }
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  /**
   * Get status of all jobs
   */
  getStatus(): {
    isRunning: boolean;
    jobs: {
      googleCalendarMonitor: {
        enabled: boolean;
        status: ReturnType<typeof googleCalendarMonitorJob.getStatus>;
      };
    };
  } {
    return {
      isRunning: this.isRunning,
      jobs: {
        googleCalendarMonitor: {
          enabled: this.config.googleCalendarMonitor.enabled,
          status: googleCalendarMonitorJob.getStatus(),
        },
      },
    };
  }
}

// Default configuration
const defaultConfig: ScheduledJobConfig = {
  googleCalendarMonitor: {
    enabled: process.env.GOOGLE_CALENDAR_MONITOR_ENABLED === 'true',
    cronExpression: process.env.GOOGLE_CALENDAR_MONITOR_CRON || '*/15 * * * *', // Every 15 minutes
  },
};

// Export singleton instance
export const scheduledJobRunner = new ScheduledJobRunner(defaultConfig);
