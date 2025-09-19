import { config } from '@/lib/env';
import { telegramMessageFormatter, type MessageFormatterOptions } from '@/utils/telegramFormatters';

export interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: {
    inline_keyboard?: Array<Array<{
      text: string;
      callback_data?: string;
      url?: string;
    }>>;
  };
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: TelegramUser;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data?: string;
  };
}

export class TelegramService {
  private botToken: string | null = null;
  private baseUrl: string | null = null;

  constructor() {
    if (config.telegram.isConfigured()) {
      this.botToken = config.telegram.botToken!;
      this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    }
  }

  /**
   * Send a message to a Telegram chat
   */
  async sendMessage(message: TelegramMessage): Promise<{ success: boolean; messageId?: number; error?: string }> {
    if (!this.botToken || !this.baseUrl) {
      return {
        success: false,
        error: 'Telegram bot is not configured',
      };
    }

    try {
      console.log(`📱 Sending Telegram message to chat ${message.chat_id}`);

      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Telegram API error:', data);
        return {
          success: false,
          error: data.description || 'Failed to send message',
        };
      }

      console.log(`✅ Telegram message sent successfully. Message ID: ${data.result.message_id}`);
      return {
        success: true,
        messageId: data.result.message_id,
      };
    } catch (error) {
      console.error('❌ Error sending Telegram message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<{ success: boolean; bot?: any; error?: string }> {
    if (!this.botToken || !this.baseUrl) {
      return {
        success: false,
        error: 'Telegram bot is not configured',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/getMe`);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.description || 'Failed to get bot info',
        };
      }

      return {
        success: true,
        bot: data.result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Set webhook for the bot
   */
  async setWebhook(webhookUrl: string, secretToken?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.botToken || !this.baseUrl) {
      return {
        success: false,
        error: 'Telegram bot is not configured',
      };
    }

    try {
      const payload: any = {
        url: webhookUrl,
      };

      if (secretToken) {
        payload.secret_token = secretToken;
      }

      const response = await fetch(`${this.baseUrl}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.description || 'Failed to set webhook',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<{ success: boolean; webhook?: any; error?: string }> {
    if (!this.botToken || !this.baseUrl) {
      return {
        success: false,
        error: 'Telegram bot is not configured',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/getWebhookInfo`);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.description || 'Failed to get webhook info',
        };
      }

      return {
        success: true,
        webhook: data.result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<{ success: boolean; error?: string }> {
    if (!this.botToken || !this.baseUrl) {
      return {
        success: false,
        error: 'Telegram bot is not configured',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/deleteWebhook`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.description || 'Failed to delete webhook',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook secret token
   */
  verifyWebhookSecret(secretToken: string): boolean {
    if (!config.telegram.webhookSecret) {
      return false;
    }
    return secretToken === config.telegram.webhookSecret;
  }

  /**
   * Format appointment message for Telegram using the new staff-specific formatter
   */
  formatAppointmentMessage(
    appointment: any,
    staff: any,
    changeType: 'created' | 'updated' | 'cancelled',
    patient: any,
    notificationType?: 'same_day_created' | 'rescheduled' | 'one_hour_reminder' | 'cancelled'
  ): string {
    const options: MessageFormatterOptions = {
      appointment: {
        ...appointment,
        patient,
        staff_assignments: appointment.staff_assignments || []
      },
      staff,
      changeType,
      patient,
      notificationType
    };

    return telegramMessageFormatter.formatMessage(options);
  }

  /**
   * Format 1-hour reminder message for Telegram
   */
  formatOneHourReminderMessage(
    appointment: any,
    staff: any,
    patient: any
  ): string {
    const options: MessageFormatterOptions = {
      appointment: {
        ...appointment,
        patient,
        staff_assignments: appointment.staff_assignments || []
      },
      staff,
      changeType: 'created', // Use 'created' as base, but notificationType will override
      patient,
      notificationType: 'one_hour_reminder'
    };

    return telegramMessageFormatter.formatMessage(options);
  }

  /**
   * Format daily agenda message for Telegram
   */
  formatDailyAgendaMessage(staff: any, appointments: any[], date: string): string {
    const appointmentDate = new Date(date).toLocaleDateString('en-GB', {
      timeZone: 'Asia/Dubai',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      weekday: 'long'
    });

    let message = `📅 <b>Daily Agenda - ${appointmentDate}</b>\n\n`;
    message += `👤 <b>Staff:</b> ${staff.first_name} ${staff.last_name}\n`;
    message += `📊 <b>Total Appointments:</b> ${appointments.length}\n\n`;

    if (appointments.length === 0) {
      message += `✅ No appointments scheduled for today.`;
      return message;
    }

    // Sort appointments by time
    const sortedAppointments = appointments.sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );

    sortedAppointments.forEach((appointment, index) => {
      const startTime = appointment.start_time;
      const endTime = this.getAppointmentEndTime(startTime, appointment.duration_minutes);

      message += `${index + 1}. <b>${startTime} - ${endTime}</b>\n`;
      message += `   🏥 ${this.formatAppointmentType(appointment.appointment_type)}\n`;
      message += `   👤 ${appointment.patient.name}\n`;
      message += `   📞 ${appointment.patient.phone}\n`;

      if (appointment.patient.address) {
        message += `   📍 ${appointment.patient.address}\n`;
      }

      if (appointment.notes) {
        message += `   📝 ${appointment.notes}\n`;
      }

      message += `\n`;
    });

    return message;
  }

  private getAppointmentEndTime(startTime: string, durationMinutes: number): string {
    // Handle both HH:MM:SS and HH:MM formats
    const timeParts = startTime.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end.toTimeString().slice(0, 5); // HH:MM format
  }

  private formatAppointmentType(type: string): string {
    const typeMap: Record<string, string> = {
      'doctor_on_call': 'Doctor on Call',
      'lab_test': 'Lab Test',
      'teleconsultation': 'Teleconsultation',
      'physiotherapy': 'Physiotherapy',
      'caregiver': 'Caregiver',
      'iv_therapy': 'IV Therapy',
    };
    return typeMap[type] || type;
  }

  private formatStaffRole(role: string): string {
    const roleMap: Record<string, string> = {
      'doctor': 'Doctor',
      'nurse': 'Nurse',
      'physiotherapist': 'Physiotherapist',
      'caregiver': 'Caregiver',
      'driver': 'Driver',
      'lab_technician': 'Lab Technician',
    };
    return roleMap[role] || role;
  }
}

// Export singleton instance
export const telegramService = new TelegramService();
