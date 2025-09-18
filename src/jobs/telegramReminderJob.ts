import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import type {
  JobExecutionContext,
  JobHandler,
  TelegramReminderJobParameters,
  TelegramReminderJobResult,
} from '@/types/job';
import { formatDubaiDate, getCurrentDubaiTime, getTodayDubai } from '@/utils/timezone';

/**
 * Telegram reminder job handler
 * Sends 1-hour appointment reminders to all assigned staff members
 */
export const telegramReminderJobHandler: JobHandler = async (context: JobExecutionContext): Promise<TelegramReminderJobResult> => {
  const { logger, parameters } = context;

  logger.info('Starting Telegram reminder job execution', { parameters });

  try {
    // Parse parameters
    const jobParams: TelegramReminderJobParameters = {
      testMode: parameters.testMode || false,
      forceSend: parameters.forceSend || false,
      timeWindow: parameters.timeWindow || 15, // 15-minute window by default
    };

    logger.info('Processing 1-hour appointment reminders', {
      testMode: jobParams.testMode,
      forceSend: jobParams.forceSend,
      timeWindow: jobParams.timeWindow,
    });

    // Get current Dubai time
    const now = getCurrentDubaiTime();
    const today = getTodayDubai();
    const todayString = formatDubaiDate(today);

    logger.info(`Checking for appointments starting in 1 hour (${now.toISOString()})`);

    // Calculate time window for appointments starting in 1 hour
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const windowStart = new Date(oneHourFromNow.getTime() - jobParams.timeWindow * 60 * 1000); // 15 minutes before
    const windowEnd = new Date(oneHourFromNow.getTime() + jobParams.timeWindow * 60 * 1000); // 15 minutes after

    logger.info(`Time window: ${windowStart.toISOString()} to ${windowEnd.toISOString()}`);

    // Get appointments for today
    const appointments = await appointmentService.getAppointments({
      appointment_date: todayString,
      status: 'scheduled', // Only scheduled appointments
    });

    logger.info(`Found ${appointments.length} scheduled appointments for today`);

    // Filter appointments that start within our time window
    const reminderAppointments = appointments.filter(appointment => {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}:00`);
      const appointmentTime = new Date(appointmentDateTime.getTime());

      return appointmentTime >= windowStart && appointmentTime <= windowEnd;
    });

    logger.info(`Found ${reminderAppointments.length} appointments within reminder time window`);

    if (reminderAppointments.length === 0) {
      logger.info('No appointments found within reminder time window');
      return {
        success: true,
        totalAppointments: 0,
        notificationsSent: 0,
        notificationsFailed: 0,
        successRate: 100,
        results: [],
        message: 'No appointments found within reminder time window',
      };
    }

    // Process each appointment
    const results: Array<{
      appointmentId: string;
      patientName: string;
      appointmentTime: string;
      staffCount: number;
      notificationsSent: number;
      notificationsFailed: number;
      errors: string[];
    }> = [];

    let totalNotificationsSent = 0;
    let totalNotificationsFailed = 0;

    for (const appointment of reminderAppointments) {
      try {
        logger.info(`Processing reminder for appointment ${appointment.id}`, {
          patientId: appointment.patient_id,
          appointmentTime: appointment.start_time,
          appointmentType: appointment.appointment_type,
        });

        // Get staff assignments for this appointment
        const staffAssignments = await appointmentStaffService.getStaffForAppointment(appointment.id);

        if (!staffAssignments || staffAssignments.length === 0) {
          logger.warn(`No staff assignments found for appointment ${appointment.id}`);
          results.push({
            appointmentId: appointment.id,
            patientName: 'Unknown',
            appointmentTime: appointment.start_time,
            staffCount: 0,
            notificationsSent: 0,
            notificationsFailed: 0,
            errors: ['No staff assignments found'],
          });
          continue;
        }

        logger.info(`Sending 1-hour reminders for appointment ${appointment.id} to ${staffAssignments.length} staff members`);

        // Send 1-hour reminder notifications
        const notificationResult = await telegramNotificationService.sendOneHourReminderNotificationsToStaff(
          appointment,
          staffAssignments
        );

        const notificationsSent = notificationResult.results.filter(r => r.success).length;
        const notificationsFailed = notificationResult.results.filter(r => !r.success).length;
        const retryableErrors = notificationResult.results.filter(r => !r.success && r.retryable).length;
        const nonRetryableErrors = notificationResult.results.filter(r => !r.success && !r.retryable).length;
        const errors = notificationResult.results.filter(r => !r.success).map(r => r.error || 'Unknown error');

        totalNotificationsSent += notificationsSent;
        totalNotificationsFailed += notificationsFailed;

        // Get patient name for logging
        const patientName = 'Patient'; // We could fetch this if needed

        results.push({
          appointmentId: appointment.id,
          patientName,
          appointmentTime: appointment.start_time,
          staffCount: staffAssignments.length,
          notificationsSent,
          notificationsFailed,
          retryableErrors,
          nonRetryableErrors,
          errors,
        });

        logger.info(`Completed reminder processing for appointment ${appointment.id}`, {
          notificationsSent,
          notificationsFailed,
          errors,
        });

      } catch (error) {
        logger.error(`Error processing reminder for appointment ${appointment.id}:`, error);

        results.push({
          appointmentId: appointment.id,
          patientName: 'Unknown',
          appointmentTime: appointment.start_time,
          staffCount: 0,
          notificationsSent: 0,
          notificationsFailed: 1,
          retryableErrors: 0,
          nonRetryableErrors: 1,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });

        totalNotificationsFailed++;
      }
    }

    const successRate = totalNotificationsSent + totalNotificationsFailed > 0
      ? Math.round((totalNotificationsSent / (totalNotificationsSent + totalNotificationsFailed)) * 100)
      : 100;

    logger.info('Telegram reminder job completed', {
      totalAppointments: reminderAppointments.length,
      totalNotificationsSent,
      totalNotificationsFailed,
      successRate,
    });

    return {
      success: true,
      totalAppointments: reminderAppointments.length,
      notificationsSent: totalNotificationsSent,
      notificationsFailed: totalNotificationsFailed,
      successRate,
      results,
      message: `Processed ${reminderAppointments.length} appointments, sent ${totalNotificationsSent} notifications`,
    };

  } catch (error) {
    logger.error('Error in Telegram reminder job:', error);
    return {
      success: false,
      totalAppointments: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      successRate: 0,
      results: [],
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Initialize the Telegram reminder job
 * Registers the job handler and creates the job definition
 */
export async function initializeTelegramReminderJob(): Promise<void> {
  try {
    // Import job scheduler service
    const { jobSchedulerService } = await import('@/services/jobSchedulerService');

    // Register the job handler
    jobSchedulerService.registerHandler('telegram_reminder', telegramReminderJobHandler);

    // Create the Telegram reminder job definition
    const jobDefinition = {
      name: 'Telegram 1-Hour Reminders',
      description: 'Send 1-hour appointment reminders to all assigned staff members via Telegram every 15 minutes',
      type: 'telegram_reminder' as const,
      cronExpression: '*/15 * * * *', // Every 15 minutes
      timezone: 'Asia/Dubai',
      priority: 'high' as const,
      enabled: true,
      maxRetries: 3,
      retryDelay: 300000, // 5 minutes
      timeout: 300000, // 5 minutes
      handler: 'telegram_reminder',
      parameters: {
        description: 'Automated 1-hour appointment reminders via Telegram',
        timezone: 'Asia/Dubai',
        schedule: 'Every 15 minutes',
        timeWindow: 15, // 15-minute window for appointment detection
      },
    };

    // Add the job to the scheduler
    const job = await jobSchedulerService.addJob(jobDefinition);

    console.log('✅ Telegram reminder job initialized successfully', {
      jobId: job.id,
      name: job.name,
      cronExpression: job.cronExpression,
      timezone: job.timezone,
      timeWindow: jobDefinition.parameters.timeWindow,
    });

  } catch (error) {
    console.error('❌ Failed to initialize Telegram reminder job:', error);
    throw error;
  }
}

/**
 * Get Telegram reminder job status
 */
export async function getTelegramReminderJobStatus(): Promise<{
  job: any;
  stats: any;
  nextExecution?: Date;
  lastExecution?: any;
}> {
  try {
    const { jobSchedulerService } = await import('@/services/jobSchedulerService');

    // Get all jobs and find the Telegram reminder job
    const allJobs = await jobSchedulerService.getAllJobs();
    const reminderJob = allJobs.find(job => job.handler === 'telegram_reminder');

    if (!reminderJob) {
      throw new Error('Telegram reminder job not found');
    }

    // Get job statistics
    const stats = await jobSchedulerService.getJobStats(reminderJob.id);

    // Get recent executions
    const executions = await jobSchedulerService.getJobExecutions(reminderJob.id, 5);
    const lastExecution = executions.length > 0 ? executions[0] : null;

    return {
      job: reminderJob,
      stats,
      lastExecution,
    };

  } catch (error) {
    console.error('❌ Failed to get Telegram reminder job status:', error);
    throw error;
  }
}

/**
 * Manually trigger Telegram reminder job
 */
export async function triggerTelegramReminderJob(parameters: Partial<TelegramReminderJobParameters> = {}): Promise<any> {
  try {
    const { jobSchedulerService } = await import('@/services/jobSchedulerService');

    // Get all jobs and find the Telegram reminder job
    const allJobs = await jobSchedulerService.getAllJobs();
    const reminderJob = allJobs.find(job => job.handler === 'telegram_reminder');

    if (!reminderJob) {
      throw new Error('Telegram reminder job not found');
    }

    // Trigger the job with parameters
    const execution = await jobSchedulerService.triggerJob(reminderJob.id, parameters);

    console.log('✅ Telegram reminder job triggered manually', {
      executionId: execution.id,
      parameters,
    });

    return execution;

  } catch (error) {
    console.error('❌ Failed to trigger Telegram reminder job:', error);
    throw error;
  }
}

// Export the job handler
export default telegramReminderJobHandler;
