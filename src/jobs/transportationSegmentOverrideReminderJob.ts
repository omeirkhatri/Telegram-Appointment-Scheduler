import { isFeatureEnabled } from '@/lib/featureFlags';
import { auditTrailService } from '@/services/auditTrailService';
import { loggingService } from '@/services/loggingService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import { transportationSegmentService } from '@/services/transportationSegmentService';

/**
 * Transportation Segment Override Reminder Job
 *
 * This job checks for transportation segment overrides that require follow-up
 * and sends reminders to dispatchers when segments are approaching their start time.
 *
 * Runs every 30 minutes to check for overrides that need attention.
 */
export class TransportationSegmentOverrideReminderJob {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMs = 30 * 60 * 1000; // 30 minutes

  /**
   * Start the reminder job
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Transportation segment override reminder job is already running');
      return;
    }

    if (!isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED')) {
      console.log('Transportation segments feature is disabled, skipping override reminder job');
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.runReminderCheck().catch(error => {
        console.error('Error in transportation segment override reminder job:', error);
        loggingService.error('Transportation segment override reminder job failed', {
          component: 'transportation-segment-override-reminder-job',
          action: 'reminder_check',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }, this.intervalMs);

    console.log('✅ Transportation segment override reminder job started');
    loggingService.info('Transportation segment override reminder job started', {
      component: 'transportation-segment-override-reminder-job',
      action: 'job_started',
      metadata: {
        intervalMs: this.intervalMs,
      },
    });

    // Run immediately on start
    this.runReminderCheck().catch(error => {
      console.error('Error in initial transportation segment override reminder check:', error);
    });
  }

  /**
   * Stop the reminder job
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Transportation segment override reminder job is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('✅ Transportation segment override reminder job stopped');
    loggingService.info('Transportation segment override reminder job stopped', {
      component: 'transportation-segment-override-reminder-job',
      action: 'job_stopped',
    });
  }

  /**
   * Get the current status of the reminder job
   */
  getStatus(): {
    isRunning: boolean;
    intervalMs: number;
  } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
    };
  }

  /**
   * Run the reminder check manually
   */
  async runReminderCheck(): Promise<void> {
    console.log('🔔 Starting transportation segment override reminder check...');

    try {
      // Get all overrides requiring follow-up that haven't had reminders sent
      const overrides = await auditTrailService.getTransportationSegmentOverridesRequiringFollowUp();

      console.log(`📋 Found ${overrides.length} overrides requiring follow-up`);

      if (overrides.length === 0) {
        console.log('✅ No overrides need follow-up reminders right now');
        return;
      }

      // Process each override
      for (const override of overrides) {
        await this.processOverrideReminder(override);
      }

      console.log(`✅ Processed ${overrides.length} override reminders`);

    } catch (error) {
      console.error('❌ Error in transportation segment override reminder check:', error);
      loggingService.error('Transportation segment override reminder check failed', {
        component: 'transportation-segment-override-reminder-job',
        action: 'reminder_check',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Process a single override reminder
   */
  private async processOverrideReminder(override: any): Promise<void> {
    try {
      console.log(`🔍 Processing override reminder for segment ${override.segment_id}`);

      // Get the segment details
      const segment = await transportationSegmentService.getTransportationSegment(override.segment_id);
      if (!segment) {
        console.warn(`⚠️ Segment ${override.segment_id} not found, skipping reminder`);
        return;
      }

      // Check if the segment is approaching its start time
      const shouldSendReminder = this.shouldSendReminder(segment, override);
      if (!shouldSendReminder) {
        console.log(`⏰ Segment ${override.segment_id} not yet ready for reminder`);
        return;
      }

      // Send reminder notification
      await this.sendOverrideReminder(override, segment);

      // Mark reminder as sent
      await auditTrailService.updateTransportationSegmentOverrideFollowUp(override.id, true);

      console.log(`✅ Reminder sent for override ${override.id}`);

    } catch (error) {
      console.error(`❌ Error processing override reminder for ${override.segment_id}:`, error);
      loggingService.error('Failed to process override reminder', {
        component: 'transportation-segment-override-reminder-job',
        action: 'process_override_reminder',
        segmentId: override.segment_id,
        overrideId: override.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Determine if a reminder should be sent for this override
   */
  private shouldSendReminder(segment: any, override: any): boolean {
    if (!segment.planned_start) {
      return false; // No start time, can't determine when to send reminder
    }

    const now = new Date();
    const segmentStart = new Date(segment.planned_start);
    const timeUntilStart = segmentStart.getTime() - now.getTime();

    // Send reminder if segment starts within the next 2 hours
    const reminderWindowMs = 2 * 60 * 60 * 1000; // 2 hours
    return timeUntilStart > 0 && timeUntilStart <= reminderWindowMs;
  }

  /**
   * Send override reminder notification
   */
  private async sendOverrideReminder(override: any, segment: any): Promise<void> {
    try {
      const message = this.buildOverrideReminderMessage(override, segment);

      // Send Telegram notification to dispatchers
      await telegramNotificationService.sendMessage({
        chatId: process.env.DISPATCHER_TELEGRAM_CHAT_ID || '',
        message,
        parseMode: 'HTML',
      });

      console.log(`📱 Override reminder sent for segment ${segment.id}`);

    } catch (error) {
      console.error(`❌ Error sending override reminder for segment ${segment.id}:`, error);
      throw error;
    }
  }

  /**
   * Build the override reminder message
   */
  private buildOverrideReminderMessage(override: any, segment: any): string {
    const segmentTypeLabels = {
      pickup: 'Pickup',
      dropoff: 'Dropoff',
      stay_with_staff: 'Stay with Staff',
      metro_assist: 'Metro Assist',
      custom: 'Custom'
    };

    const segmentTypeLabel = segmentTypeLabels[segment.segment_type] || segment.segment_type;
    const startTime = segment.planned_start ? new Date(segment.planned_start).toLocaleString() : 'TBD';

    let message = `🔔 <b>Transportation Segment Override Reminder</b>\n\n`;
    message += `📋 <b>Segment:</b> ${segmentTypeLabel} - ${segment.title || 'Untitled'}\n`;
    message += `⏰ <b>Start Time:</b> ${startTime}\n`;
    message += `👤 <b>Driver:</b> ${segment.driver?.first_name} ${segment.driver?.last_name || ''}\n`;
    message += `🔧 <b>Override Reason:</b> ${override.override_reason.replace('_', ' ').toUpperCase()}\n`;
    message += `📝 <b>Justification:</b> ${override.override_justification}\n\n`;

    if (override.conflict_details?.driver_conflicts?.length > 0) {
      message += `⚠️ <b>Driver Conflicts:</b>\n`;
      override.conflict_details.driver_conflicts.forEach((conflict: string) => {
        message += `• ${conflict}\n`;
      });
      message += `\n`;
    }

    if (override.conflict_details?.timing_conflicts?.length > 0) {
      message += `⏰ <b>Timing Conflicts:</b>\n`;
      override.conflict_details.timing_conflicts.forEach((conflict: string) => {
        message += `• ${conflict}\n`;
      });
      message += `\n`;
    }

    if (override.conflict_details?.travel_buffer_issues?.length > 0) {
      message += `🚗 <b>Travel Buffer Issues:</b>\n`;
      override.conflict_details.travel_buffer_issues.forEach((issue: string) => {
        message += `• ${issue}\n`;
      });
      message += `\n`;
    }

    message += `🔗 <b>Action Required:</b> Please confirm driver availability and resolve any conflicts before the segment starts.\n\n`;
    message += `📅 <i>Override created: ${new Date(override.created_at).toLocaleString()}</i>`;

    return message;
  }
}

// Export singleton instance
export const transportationSegmentOverrideReminderJob = new TransportationSegmentOverrideReminderJob();
