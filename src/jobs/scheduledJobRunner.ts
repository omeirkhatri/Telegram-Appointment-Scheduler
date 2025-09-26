import { loggingService } from '@/services/loggingService';
import { googleCalendarMonitorJob } from './googleCalendarMonitorJob';
import { transportationSegmentOverrideReminderJob } from './transportationSegmentOverrideReminderJob';

export interface ScheduledJobConfig {
  googleCalendarMonitor: {
    enabled: boolean;
    cronExpression: string;
  };
  transportationSegmentOverrideReminder: {
    enabled: boolean;
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

    // Start Transportation Segment Override Reminder job if enabled
    if (this.config.transportationSegmentOverrideReminder.enabled) {
      transportationSegmentOverrideReminderJob.start();
      loggingService.info('Transportation segment override reminder job started via scheduler', {
        component: 'scheduled-job-runner',
        action: 'job_started',
        metadata: {
          job: 'transportation-segment-override-reminder',
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

    // Stop Transportation Segment Override Reminder job
    if (this.config.transportationSegmentOverrideReminder.enabled) {
      transportationSegmentOverrideReminderJob.stop();
      loggingService.info('Transportation segment override reminder job stopped via scheduler', {
        component: 'scheduled-job-runner',
        action: 'job_stopped',
        metadata: {
          job: 'transportation-segment-override-reminder',
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
      case 'transportation-segment-override-reminder':
        if (this.config.transportationSegmentOverrideReminder.enabled) {
          await transportationSegmentOverrideReminderJob.runReminderCheck();
        } else {
          throw new Error('Transportation segment override reminder job is not enabled');
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
      transportationSegmentOverrideReminder: {
        enabled: boolean;
        status: ReturnType<typeof transportationSegmentOverrideReminderJob.getStatus>;
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
        transportationSegmentOverrideReminder: {
          enabled: this.config.transportationSegmentOverrideReminder.enabled,
          status: transportationSegmentOverrideReminderJob.getStatus(),
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
  transportationSegmentOverrideReminder: {
    enabled: process.env.TRANSPORTATION_SEGMENT_OVERRIDE_REMINDER_ENABLED === 'true',
  },
};

// Export singleton instance
export const scheduledJobRunner = new ScheduledJobRunner(defaultConfig);
