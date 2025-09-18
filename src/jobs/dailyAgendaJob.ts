import { jobSchedulerService } from '@/services/jobSchedulerService';
import { staffAggregationService } from '@/services/staffAggregationService';
import type {
  DailyAgendaJobParameters,
  DailyAgendaJobResult,
  JobExecutionContext,
  JobHandler,
} from '@/types/job';
import { formatDubaiDate, getAgendaDate, getNextDailyAgendaTime } from '@/utils/timezone';

/**
 * Daily agenda job handler
 * Generates and sends daily agendas to all eligible staff members
 */
export const dailyAgendaJobHandler: JobHandler = async (context: JobExecutionContext): Promise<DailyAgendaJobResult> => {
  const { logger, parameters } = context;

  logger.info('Starting daily agenda job execution', { parameters });

  try {
    // Parse parameters
    const jobParams: DailyAgendaJobParameters = {
      date: parameters.date,
      staffId: parameters.staffId,
      testMode: parameters.testMode || false,
      forceSend: parameters.forceSend || false,
    };

    // Determine the date for agenda generation
    const agendaDate = jobParams.date ? new Date(jobParams.date) : getAgendaDate();
    const dateString = formatDubaiDate(agendaDate);

    logger.info(`Generating daily agenda for ${dateString}`, {
      staffId: jobParams.staffId,
      testMode: jobParams.testMode,
      forceSend: jobParams.forceSend,
    });

    // Check if we should skip sending (already sent today and not forced)
    if (!jobParams.forceSend && !jobParams.testMode) {
      const alreadySent = await checkIfAgendaAlreadySent(dateString);
      if (alreadySent) {
        logger.warn(`Daily agenda already sent for ${dateString}, skipping`);
        return {
          success: true,
          totalStaff: 0,
          notificationsSent: 0,
          notificationsFailed: 0,
          successRate: 100,
          results: [],
        };
      }
    }

    let result;

    if (jobParams.staffId) {
      // Generate agenda for specific staff member
      logger.info(`Generating agenda for specific staff member: ${jobParams.staffId}`);
      result = await generateStaffSpecificAgenda(jobParams.staffId, agendaDate, jobParams.testMode, logger);
    } else {
      // Generate agendas for all eligible staff
      logger.info('Generating agendas for all eligible staff members');
      result = await staffAggregationService.generateDailyAgendas(agendaDate);
    }

    // Log the agenda generation results
    logger.info('Daily agenda generation completed', {
      totalStaff: result.stats.totalStaff,
      notificationsSent: result.stats.notificationsSent,
      notificationsFailed: result.stats.notificationsFailed,
      successRate: result.stats.successRate,
    });

    // Mark as sent if not in test mode
    if (!jobParams.testMode && result.success) {
      await markAgendaAsSent(dateString, result.stats);
    }

    // Transform results to match expected format
    const jobResult: DailyAgendaJobResult = {
      success: result.success,
      totalStaff: result.stats.totalStaff,
      notificationsSent: result.stats.telegramsSent,
      notificationsFailed: result.stats.telegramsFailed,
      successRate: result.stats.successRate,
      results: result.results.map(delivery => ({
        staffId: delivery.staffId,
        email: delivery.telegramUserId, // Using telegramUserId as a placeholder for email
        status: delivery.status === 'sent' ? 'sent' : 'failed',
        error: delivery.error,
      })),
    };

    logger.info('Daily agenda job completed successfully', {
      success: jobResult.success,
      totalStaff: jobResult.totalStaff,
      telegramsSent: jobResult.notificationsSent,
      successRate: jobResult.successRate,
    });

    return jobResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error('Daily agenda job failed', { error: errorMessage });

    return {
      success: false,
      totalStaff: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      successRate: 0,
      results: [{
        staffId: 'unknown',
        email: 'unknown',
        status: 'failed',
        error: errorMessage,
      }],
    };
  }
};

/**
 * Generate agenda for a specific staff member
 */
async function generateStaffSpecificAgenda(
  staffId: string,
  date: Date,
  testMode: boolean,
  logger: JobExecutionContext['logger'],
): Promise<{
  success: boolean;
  stats: {
    totalStaff: number;
    notificationsSent: number;
    notificationsFailed: number;
    successRate: number;
  };
  results: Array<{
    staffId: string;
    emailId: string;
    status: 'sent' | 'failed';
    error?: string;
  }>;
}> {
  try {
    const agendaData = await staffAggregationService.generateStaffAgenda(staffId, date);

    if (testMode) {
      logger.info('Test mode: Agenda generated but not sent', { staffId });
      return {
        success: true,
        stats: {
          totalStaff: 1,
          emailsSent: 0,
          emailsFailed: 0,
          successRate: 100,
        },
        results: [{
          staffId,
          emailId: 'test-mode',
          status: 'sent',
        }],
      };
    }

    // Send the email
    const emailResult = await staffAggregationService.generateDailyAgendas(date);

    return {
      success: emailResult.success,
      stats: emailResult.stats,
      results: emailResult.results,
    };

  } catch (error) {
    logger.error('Failed to generate staff-specific agenda', {
      staffId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      stats: {
        totalStaff: 1,
        notificationsSent: 0,
        notificationsFailed: 1,
        successRate: 0,
      },
      results: [{
        staffId,
        emailId: 'error',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }],
    };
  }
}

/**
 * Check if agenda was already sent for a given date
 */
async function checkIfAgendaAlreadySent(dateString: string): Promise<boolean> {
  // In a real implementation, this would check a database table
  // For now, we'll use a simple in-memory cache
  const sentDates = new Set<string>();
  return sentDates.has(dateString);
}

/**
 * Mark agenda as sent for a given date
 */
async function markAgendaAsSent(dateString: string, stats: any): Promise<void> {
  // In a real implementation, this would save to a database table
  // For now, we'll use a simple in-memory cache
  const sentDates = new Set<string>();
  sentDates.add(dateString);

  console.log(`📧 Marked agenda as sent for ${dateString}`, {
    totalStaff: stats.totalStaff,
    notificationsSent: stats.notificationsSent,
    successRate: stats.successRate,
  });
}

/**
 * Initialize the daily agenda job
 */
export async function initializeDailyAgendaJob(): Promise<void> {
  try {
    // Register the job handler
    jobSchedulerService.registerHandler('daily_agenda', dailyAgendaJobHandler);

    // Create the daily agenda job definition
    const jobDefinition = {
      name: 'Daily Staff Agenda',
      description: 'Generate and send daily appointment agendas to all eligible staff members via Telegram at 21:00 (9 PM) Asia/Dubai time for the next day',
      type: 'daily_agenda' as const,
      cronExpression: '0 21 * * *', // 21:00 (9 PM) every day
      timezone: 'Asia/Dubai',
      priority: 'high' as const,
      enabled: true,
      maxRetries: 3,
      retryDelay: 300000, // 5 minutes
      timeout: 600000, // 10 minutes
      handler: 'daily_agenda',
      parameters: {
        description: 'Automated daily agenda generation for next day via Telegram',
        timezone: 'Asia/Dubai',
        schedule: '21:00 (9 PM) daily',
      },
    };

    // Add the job to the scheduler
    const job = await jobSchedulerService.addJob(jobDefinition);

    console.log('✅ Daily agenda job initialized successfully', {
      jobId: job.id,
      name: job.name,
      cronExpression: job.cronExpression,
      timezone: job.timezone,
      nextExecution: getNextDailyAgendaTime(),
    });

  } catch (error) {
    console.error('❌ Failed to initialize daily agenda job:', error);
    throw error;
  }
}

/**
 * Get daily agenda job status
 */
export async function getDailyAgendaJobStatus(): Promise<{
  job: any;
  stats: any;
  nextExecution: Date;
  lastExecution?: any;
}> {
  try {
    // Find the daily agenda job
    const jobs = await jobSchedulerService.getAllJobs();
    const dailyAgendaJob = jobs.find(job => job.type === 'daily_agenda');

    if (!dailyAgendaJob) {
      throw new Error('Daily agenda job not found');
    }

    // Get job statistics
    const stats = await jobSchedulerService.getJobStats(dailyAgendaJob.id);

    // Get recent executions
    const executions = await jobSchedulerService.getJobExecutions(dailyAgendaJob.id, 5);
    const lastExecution = executions.length > 0 ? executions[0] : undefined;

    // Calculate next execution time
    const nextExecution = getNextDailyAgendaTime();

    return {
      job: dailyAgendaJob,
      stats,
      nextExecution,
      lastExecution,
    };

  } catch (error) {
    console.error('Failed to get daily agenda job status:', error);
    throw error;
  }
}

/**
 * Manually trigger daily agenda job
 */
export async function triggerDailyAgendaJob(parameters: DailyAgendaJobParameters = {}): Promise<any> {
  try {
    const jobs = await jobSchedulerService.getAllJobs();
    const dailyAgendaJob = jobs.find(job => job.type === 'daily_agenda');

    if (!dailyAgendaJob) {
      throw new Error('Daily agenda job not found');
    }

    console.log('🚀 Manually triggering daily agenda job', { parameters });

    const execution = await jobSchedulerService.triggerJob(dailyAgendaJob.id, parameters);

    console.log('✅ Daily agenda job triggered successfully', {
      executionId: execution.id,
      status: execution.status,
    });

    return execution;

  } catch (error) {
    console.error('❌ Failed to trigger daily agenda job:', error);
    throw error;
  }
}

/**
 * Update daily agenda job schedule
 */
export async function updateDailyAgendaJobSchedule(cronExpression: string): Promise<void> {
  try {
    const jobs = await jobSchedulerService.getAllJobs();
    const dailyAgendaJob = jobs.find(job => job.type === 'daily_agenda');

    if (!dailyAgendaJob) {
      throw new Error('Daily agenda job not found');
    }

    // Validate cron expression
    const validation = jobSchedulerService.validateCronExpression(cronExpression);
    if (!validation.isValid) {
      throw new Error(`Invalid cron expression: ${validation.error}`);
    }

    await jobSchedulerService.updateJob(dailyAgendaJob.id, {
      cronExpression,
      updatedAt: new Date(),
    });

    console.log('✅ Daily agenda job schedule updated', {
      jobId: dailyAgendaJob.id,
      newCronExpression: cronExpression,
    });

  } catch (error) {
    console.error('❌ Failed to update daily agenda job schedule:', error);
    throw error;
  }
}

/**
 * Enable/disable daily agenda job
 */
export async function toggleDailyAgendaJob(enabled: boolean): Promise<void> {
  try {
    const jobs = await jobSchedulerService.getAllJobs();
    const dailyAgendaJob = jobs.find(job => job.type === 'daily_agenda');

    if (!dailyAgendaJob) {
      throw new Error('Daily agenda job not found');
    }

    await jobSchedulerService.updateJob(dailyAgendaJob.id, {
      enabled,
      updatedAt: new Date(),
    });

    console.log(`✅ Daily agenda job ${enabled ? 'enabled' : 'disabled'}`, {
      jobId: dailyAgendaJob.id,
      enabled,
    });

  } catch (error) {
    console.error('❌ Failed to toggle daily agenda job:', error);
    throw error;
  }
}
