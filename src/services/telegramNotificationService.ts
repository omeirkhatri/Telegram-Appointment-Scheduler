import { config } from '@/lib/env';
import { formatInTimeZone } from 'date-fns-tz';

import { patientService } from './patientService';
import { staffService } from './staffService';
import { TelegramMessage, telegramService } from './telegramService';

export class TelegramNotificationService {
  /**
   * Send appointment notification via Telegram
   */
  async sendAppointmentNotification(
    telegramUserId: string,
    appointment: any,
    staff: any,
    changeType: 'created' | 'updated' | 'cancelled',
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const startTime = Date.now();

    try {
      console.log(`📱 Preparing to send ${changeType} Telegram notification to user ${telegramUserId}`);

      // Get patient data for the notification
      const patient = await patientService.getPatient(appointment.patient_id);
      if (!patient) {
        console.error(`❌ Patient not found for appointment ${appointment.id}`);
        return {
          success: false,
          error: 'Patient not found',
        };
      }

      // Format the appointment message using staff-specific formatter
      const messageText = telegramService.formatAppointmentMessage(
        appointment,
        staff,
        changeType,
        patient
      );

      // Create Telegram message
      const message: TelegramMessage = {
        chat_id: telegramUserId,
        text: messageText,
        parse_mode: 'HTML',
      };

      // Send the message
      const result = await telegramService.sendMessage(message);

      if (result.success) {
        console.log(`✅ Telegram notification sent successfully to user ${telegramUserId} in ${Date.now() - startTime}ms`);
      } else {
        console.error(`❌ Failed to send Telegram notification to user ${telegramUserId}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending Telegram notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send daily agenda via Telegram
   */
  async sendDailyAgenda(
    telegramUserId: string,
    agenda: {
      staffName: string;
      appointments: any[];
      date: string;
      dayName: string;
      totalAppointments: number;
      timezone?: string;
      timezoneAbbreviation?: string;
    },
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const startTime = Date.now();

    try {
      console.log(`📱 Preparing to send daily agenda to user ${telegramUserId} for ${agenda.date}`);

      // Format the daily agenda message
      const messageText = telegramService.formatDailyAgendaMessage(agenda);

      // Create Telegram message
      const message: TelegramMessage = {
        chat_id: telegramUserId,
        text: messageText,
        parse_mode: 'HTML',
      };

      // Send the message
      const result = await telegramService.sendMessage(message);

      if (result.success) {
        console.log(`✅ Daily agenda sent successfully to user ${telegramUserId} in ${Date.now() - startTime}ms`);
      } else {
        console.error(`❌ Failed to send daily agenda to user ${telegramUserId}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending daily agenda:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send test message to verify Telegram integration
   */
  async sendTestMessage(
    telegramUserId: string,
    staffName: string,
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      console.log(`📱 Sending test message to user ${telegramUserId}`);

      const messageText = `🧪 <b>Test Message</b>\n\n` +
        `Hello ${staffName}! This is a test message from the Best DOC Scheduler Telegram bot.\n\n` +
        `✅ If you received this message, your Telegram integration is working correctly.\n\n` +
        `You will now receive appointment notifications and daily agendas via Telegram.`;

      const message: TelegramMessage = {
        chat_id: telegramUserId,
        text: messageText,
        parse_mode: 'HTML',
      };

      const result = await telegramService.sendMessage(message);

      if (result.success) {
        console.log(`✅ Test message sent successfully to user ${telegramUserId}`);
      } else {
        console.error(`❌ Failed to send test message to user ${telegramUserId}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending test message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send 1-hour reminder notifications to all assigned staff members
   */
  async sendOneHourReminderNotificationsToStaff(
    appointment: any,
    staffAssignments: any[],
  ): Promise<{ success: boolean; results: Array<{ staffId: string; success: boolean; error?: string; retryable?: boolean }> }> {
    const results: Array<{ staffId: string; success: boolean; error?: string; retryable?: boolean }> = [];

    console.log(`📱 Starting 1-hour reminder notifications for appointment ${appointment.id} to ${staffAssignments.length} staff members`);

    for (const assignment of staffAssignments) {
      const staff = await staffService.getStaffMember(assignment.staff_id);

      if (!staff) {
        console.error(`❌ Staff member not found for assignment ${assignment.staff_id}`);
        results.push({
          staffId: assignment.staff_id,
          success: false,
          error: 'Staff member not found',
          retryable: false, // Non-retryable error
        });
        continue;
      }

      if (!staff.telegram_user_id) {
        console.warn(`⚠️ Staff member ${staff.first_name} ${staff.last_name} has no Telegram user ID, skipping notification`);
        results.push({
          staffId: assignment.staff_id,
          success: false,
          error: 'No Telegram user ID',
          retryable: false, // Non-retryable error
        });
        continue;
      }

      try {
        console.log(`📱 Sending 1-hour reminder to ${staff.first_name} ${staff.last_name} (${staff.telegram_user_id})`);

        const result = await this.sendOneHourReminderNotificationWithRetry(
          staff.telegram_user_id,
          appointment,
          staff
        );

        results.push({
          staffId: assignment.staff_id,
          success: result.success,
          error: result.error,
          retryable: result.retryable,
        });

        if (result.success) {
          console.log(`✅ 1-hour reminder sent to ${staff.first_name} ${staff.last_name}`);
        } else {
          console.error(`❌ Failed to send 1-hour reminder to ${staff.first_name} ${staff.last_name}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error sending 1-hour reminder to ${staff.first_name} ${staff.last_name}:`, error);
        results.push({
          staffId: assignment.staff_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: this.isRetryableError(error),
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`📱 1-hour reminder notifications completed: ${successCount}/${results.length} successful`);

    return {
      success: successCount > 0,
      results,
    };
  }

  /**
   * Send 1-hour reminder notification via Telegram
   */
  async sendOneHourReminderNotification(
    telegramUserId: string,
    appointment: any,
    staff: any,
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const startTime = Date.now();

    try {
      console.log(`📱 Preparing to send 1-hour reminder to user ${telegramUserId}`);

      // Get patient data for the notification
      const patient = await patientService.getPatient(appointment.patient_id);
      if (!patient) {
        console.error(`❌ Patient not found for appointment ${appointment.id}`);
        return {
          success: false,
          error: 'Patient not found',
        };
      }

      // Format the 1-hour reminder message
      const messageText = telegramService.formatOneHourReminderMessage(
        appointment,
        staff,
        patient
      );

      // Create Telegram message
      const message: TelegramMessage = {
        chat_id: telegramUserId,
        text: messageText,
        parse_mode: 'HTML',
      };

      // Send the message
      const result = await telegramService.sendMessage(message);

      if (result.success) {
        console.log(`✅ 1-hour reminder sent successfully to user ${telegramUserId} in ${Date.now() - startTime}ms`);
      } else {
        console.error(`❌ Failed to send 1-hour reminder to user ${telegramUserId}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending 1-hour reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send appointment notifications to all assigned staff members
   */
  async sendAppointmentNotificationsToStaff(
    appointment: any,
    staffAssignments: any[],
    changeType: 'created' | 'updated' | 'cancelled',
  ): Promise<{ success: boolean; results: Array<{ staffId: string; success: boolean; error?: string }> }> {
    const results: Array<{ staffId: string; success: boolean; error?: string }> = [];

    console.log(`📱 Starting Telegram notifications for appointment ${appointment.id} to ${staffAssignments.length} staff members`);

    for (const assignment of staffAssignments) {
      const staff = await staffService.getStaffMember(assignment.staff_id);

      if (!staff) {
        console.error(`❌ Staff member not found for assignment ${assignment.staff_id}`);
        results.push({
          staffId: assignment.staff_id,
          success: false,
          error: 'Staff member not found',
        });
        continue;
      }

      if (!staff.telegram_user_id) {
        console.warn(`⚠️ Staff member ${staff.first_name} ${staff.last_name} has no Telegram user ID, skipping notification`);
        results.push({
          staffId: assignment.staff_id,
          success: false,
          error: 'No Telegram user ID',
        });
        continue;
      }

      try {
        console.log(`📱 Sending Telegram notification to ${staff.first_name} ${staff.last_name} (${staff.telegram_user_id})`);

        const result = await this.sendAppointmentNotification(
          staff.telegram_user_id,
          appointment,
          staff,
          changeType
        );

        results.push({
          staffId: assignment.staff_id,
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          console.log(`✅ Telegram notification sent to ${staff.first_name} ${staff.last_name}`);
        } else {
          console.error(`❌ Failed to send Telegram notification to ${staff.first_name} ${staff.last_name}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error sending Telegram notification to ${staff.first_name} ${staff.last_name}:`, error);
        results.push({
          staffId: assignment.staff_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`📱 Telegram notifications completed: ${successCount}/${results.length} successful`);

    return {
      success: successCount > 0,
      results,
    };
  }

  /**
   * Send daily agenda to all staff members with Telegram user IDs
   */
  async sendDailyAgendaToAllStaff(
    appointments: any[],
    date: string,
  ): Promise<{ success: boolean; results: Array<{ staffId: string; success: boolean; error?: string }> }> {
    const results: Array<{ staffId: string; success: boolean; error?: string }> = [];

    try {
      // Get all staff members with Telegram user IDs
      const staffMembers = await staffService.getStaff();
      const staffWithTelegram = staffMembers.filter((staff: any) => staff.telegram_user_id && staff.telegram_verified);

      console.log(`📱 Sending daily agenda to ${staffWithTelegram.length} staff members with Telegram`);

      for (const staff of staffWithTelegram) {
        // Filter appointments for this staff member
        const staffAppointments = appointments.filter(apt =>
          apt.staff_assignments?.some((assignment: any) => assignment.staff_id === staff.id)
        );

        try {
          console.log(`📱 Sending daily agenda to ${staff.first_name} ${staff.last_name} (${staffAppointments.length} appointments)`);

          const timezoneId = config.app.timezone;
          const dayName = formatInTimeZone(new Date(`${date}T00:00:00`), timezoneId, 'EEEE');
          const agendaPayload = {
            staffName: `${staff.first_name} ${staff.last_name}`,
            appointments: staffAppointments,
            date,
            dayName,
            totalAppointments: staffAppointments.length,
            timezone: timezoneId,
            timezoneAbbreviation: undefined,
          };

          const result = await this.sendDailyAgenda(
            staff.telegram_user_id!,
            agendaPayload,
          );

          results.push({
            staffId: staff.id,
            success: result.success,
            error: result.error,
          });

          if (result.success) {
            console.log(`✅ Daily agenda sent to ${staff.first_name} ${staff.last_name}`);
          } else {
            console.error(`❌ Failed to send daily agenda to ${staff.first_name} ${staff.last_name}:`, result.error);
          }
        } catch (error) {
          console.error(`❌ Error sending daily agenda to ${staff.first_name} ${staff.last_name}:`, error);
          results.push({
            staffId: staff.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`📱 Daily agenda completed: ${successCount}/${results.length} successful`);

      return {
        success: successCount > 0,
        results,
      };
    } catch (error) {
      console.error('❌ Error sending daily agenda to all staff:', error);
      return {
        success: false,
        results,
      };
    }
  }

  /**
   * Send 1-hour reminder notification with retry mechanism
   */
  private async sendOneHourReminderNotificationWithRetry(
    telegramUserId: string,
    appointment: any,
    staff: any,
    maxRetries: number = 3,
    retryDelay: number = 5000
  ): Promise<{ success: boolean; error?: string; retryable?: boolean }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📱 Attempt ${attempt}/${maxRetries} - Sending 1-hour reminder to ${staff.first_name} ${staff.last_name}`);

        const result = await this.sendOneHourReminderNotification(
          telegramUserId,
          appointment,
          staff
        );

        if (result.success) {
          if (attempt > 1) {
            console.log(`✅ 1-hour reminder sent successfully on attempt ${attempt} to ${staff.first_name} ${staff.last_name}`);
          }
          return { success: true };
        } else {
          lastError = new Error(result.error || 'Unknown error');

          // Check if error is retryable
          if (!this.isRetryableError(lastError) || attempt === maxRetries) {
            console.error(`❌ Non-retryable error or max retries reached for ${staff.first_name} ${staff.last_name}:`, lastError.message);
            return {
              success: false,
              error: lastError.message,
              retryable: this.isRetryableError(lastError)
            };
          }

          console.warn(`⚠️ Attempt ${attempt} failed for ${staff.first_name} ${staff.last_name}, retrying in ${retryDelay}ms:`, lastError.message);

          // Wait before retry
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === maxRetries) {
          console.error(`❌ Non-retryable error or max retries reached for ${staff.first_name} ${staff.last_name}:`, lastError.message);
          return {
            success: false,
            error: lastError.message,
            retryable: this.isRetryableError(lastError)
          };
        }

        console.warn(`⚠️ Attempt ${attempt} failed for ${staff.first_name} ${staff.last_name}, retrying in ${retryDelay}ms:`, lastError.message);

        // Wait before retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Max retries exceeded',
      retryable: true
    };
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString().toLowerCase();

    // Non-retryable errors
    const nonRetryableErrors = [
      'staff member not found',
      'no telegram user id',
      'patient not found',
      'invalid telegram user id',
      'user blocked the bot',
      'chat not found',
      'user is deactivated',
      'forbidden',
      'unauthorized'
    ];

    for (const nonRetryable of nonRetryableErrors) {
      if (errorMessage.includes(nonRetryable)) {
        return false;
      }
    }

    // Retryable errors
    const retryableErrors = [
      'network',
      'timeout',
      'connection',
      'rate limit',
      'too many requests',
      'server error',
      'internal error',
      'temporary',
      'unavailable'
    ];

    for (const retryable of retryableErrors) {
      if (errorMessage.includes(retryable)) {
        return true;
      }
    }

    // Default to retryable for unknown errors
    return true;
  }
}

// Export singleton instance
export const telegramNotificationService = new TelegramNotificationService();
