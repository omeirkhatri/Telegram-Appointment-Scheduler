/**
 * Telegram command response formatters
 * Enhanced formatting utilities for command responses with consistent styling and structure
 */

import { isSameDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export interface ScheduleAppointment {
  id: string;
  appointment_type: string;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  mini_notes?: string;
  full_notes?: string;
  pickup_instructions?: string;
  patient: {
    id: string;
    name: string;
    phone: string;
    flat_villa_no?: string;
    building_street?: string;
    area?: string;
    city?: string;
  };
  staff_assignments?: Array<{
    staff_id: string;
    role: 'primary' | 'secondary';
    staff: {
      id: string;
      first_name: string;
      last_name: string;
      staff_type: string;
    };
  }>;
}

export interface StaffInfo {
  id: string;
  first_name: string;
  last_name: string;
  staff_type: string;
}

export interface DayScheduleContext {
  timezone: string;
  localDate: Date;
}

export interface WeekScheduleContext {
  timezone: string;
  weekStart: Date;
  weekEnd: Date;
}

export interface StatusContext {
  timezone: string;
  now: Date;
}

export class TelegramCommandFormatters {
  /**
   * Format today's schedule message
   */
  static formatTodaySchedule(
    staff: StaffInfo,
    appointments: ScheduleAppointment[],
    context: DayScheduleContext,
  ): string {
    return this.formatScheduleMessage(
      'Today\'s Schedule',
      staff,
      appointments,
      context,
    );
  }

  /**
   * Format tomorrow's schedule message
   */
  static formatTomorrowSchedule(
    staff: StaffInfo,
    appointments: ScheduleAppointment[],
    context: DayScheduleContext,
  ): string {
    return this.formatScheduleMessage(
      'Tomorrow\'s Schedule',
      staff,
      appointments,
      context,
    );
  }

  /**
   * Format week schedule message
   */
  static formatWeekSchedule(
    staff: StaffInfo,
    appointments: ScheduleAppointment[],
    context: WeekScheduleContext,
  ): string {
    const weekStartString = formatInTimeZone(context.weekStart, context.timezone, 'd MMM');
    const weekEndString = formatInTimeZone(context.weekEnd, context.timezone, 'd MMM yyyy');

    let message = `📅 <b>This Week's Schedule - ${weekStartString} to ${weekEndString}</b>\n\n`;
    message += this.formatStaffHeader(staff);
    message += `📊 <b>Total Appointments:</b> ${appointments.length}\n\n`;

    if (appointments.length === 0) {
      message += this.formatEmptyState('No appointments scheduled this week.');
      return message;
    }

    // Group appointments by date
    const appointmentsByDate = this.groupAppointmentsByDate(appointments);

    Object.keys(appointmentsByDate).sort().forEach(date => {
      const dayAppointments = appointmentsByDate[date];
      const dateRef = new Date(`${date}T00:00:00`);
      const dayName = formatInTimeZone(dateRef, context.timezone, 'EEEE');
      const dayDate = formatInTimeZone(dateRef, context.timezone, 'd MMM');

      message += `📅 <b>${dayName}, ${dayDate}</b>\n`;

      dayAppointments.forEach((appointment, index) => {
        message += this.formatAppointmentItem(appointment, index + 1, true);
      });

      message += `\n`;
    });

    return message;
  }

  /**
   * Format status message
   */
  static formatStatusMessage(
    staff: StaffInfo,
    todayAppointments: ScheduleAppointment[],
    nextAppointment: ScheduleAppointment | null,
    currentAppointment: ScheduleAppointment | null,
    context: StatusContext,
  ): string {
    const now = context.now;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let message = this.formatStaffHeader(staff);
    message += `🏥 <b>Role:</b> ${this.formatStaffType(staff.staff_type)}\n`;
    message += `📅 <b>Status:</b> Active\n\n`;

    if (todayAppointments.length > 0) {
      message += `📊 <b>Today's Appointments:</b> ${todayAppointments.length}\n`;

      if (currentAppointment) {
        message += `\n⏰ <b>Current/Next Appointment:</b>\n`;
        message += this.formatAppointmentSummary(currentAppointment);
      }
    } else {
      message += `✅ <b>No appointments scheduled for today</b>\n`;
    }

    if (nextAppointment && !isSameDay(new Date(nextAppointment.appointment_date), today)) {
      message += `\n📅 <b>Next Appointment:</b>\n`;
      message += this.formatAppointmentSummary(nextAppointment);
    }

    return message;
  }

  /**
   * Format help message with enhanced features
   */
  static formatHelpMessage(timezoneLabel = 'your assigned timezone'): string {
    return `📋 <b>Best DOC Scheduler Bot - Help</b>\n\n` +
      `<b>📅 Schedule Commands:</b>\n` +
      `• <code>/today</code> - View today's schedule with mini notes\n` +
      `• <code>/tomorrow</code> - View tomorrow's schedule with mini notes\n` +
      `• <code>/week</code> - View this week's schedule (Monday to Sunday)\n` +
      `• <code>/status</code> - Check your current status and next appointment\n\n` +
      `<b>ℹ️ Information Commands:</b>\n` +
      `• <code>/help</code> - Show this help message\n` +
      `• <code>/info</code> - Show your Telegram user information\n\n` +
      `<b>🔔 Notification Features:</b>\n` +
      `• <b>Same-day notifications</b> - Instant alerts for today's appointments\n` +
      `• <b>1-hour reminders</b> - Automated reminders before appointments\n` +
      `• <b>Reschedule alerts</b> - Notifications when appointments change\n` +
      `• <b>Daily agendas</b> - Evening summary at 9 PM (${timezoneLabel})\n` +
      `• <b>Staff-specific formatting</b> - Messages tailored to your role\n\n` +
      `<b>📝 Enhanced Note System:</b>\n` +
      `• <b>Mini notes</b> - Brief summaries in schedule views\n` +
      `• <b>Full notes</b> - Detailed information in reminders\n` +
      `• <b>Pickup instructions</b> - Driver-specific details (drivers only)\n\n` +
      `<b>👥 Staff-Specific Features:</b>\n` +
      `• <b>Doctors</b> - Patient history, full notes, previous appointments\n` +
      `• <b>Nurses</b> - Lab details, equipment requirements\n` +
      `• <b>Caregivers</b> - Duration, backup caregiver info\n` +
      `• <b>Drivers</b> - Pickup instructions, patient location\n` +
      `• <b>Physiotherapists</b> - Treatment details, transportation\n\n` +
      `<b>⚙️ System Features:</b>\n` +
      `• <b>Rate limiting</b> - 10 commands per minute per user\n` +
      `• <b>Command cooldown</b> - 5 seconds between same commands\n` +
      `• <b>Error handling</b> - User-friendly error messages\n` +
      `• <b>Timezone support</b> - All times reflect ${timezoneLabel}\n\n` +
      `<b>💡 Getting Started:</b>\n` +
      `1. Use <code>/info</code> to get your User ID\n` +
      `2. Send your User ID to your administrator\n` +
      `3. You'll start receiving notifications!\n\n` +
      `<b>🆘 Troubleshooting:</b>\n` +
      `• <b>Rate limited?</b> Wait 1 minute before trying again\n` +
      `• <b>Command not working?</b> Wait 5 seconds and try again\n` +
      `• <b>No notifications?</b> Check with admin about your setup\n` +
      `• <b>Wrong timezone?</b> All times are shown in ${timezoneLabel}\n\n` +
      `For technical support, contact your administrator.`;
  }

  /**
   * Format info message
   */
  static formatInfoMessage(user: any): string {
    return `📋 <b>Your Telegram Information</b>\n\n` +
      `🆔 <b>User ID:</b> <code>${user.id}</code>\n` +
      `👤 <b>Name:</b> ${user.first_name} ${user.last_name || ''}\n` +
      `📛 <b>Username:</b> @${user.username || 'Not set'}\n` +
      `🌐 <b>Language:</b> ${user.language_code || 'Not set'}\n` +
      `🤖 <b>Bot User:</b> ${user.is_bot ? 'Yes' : 'No'}\n\n` +
      `<b>💡 To receive notifications:</b>\n` +
      `1. Copy your User ID: <code>${user.id}</code>\n` +
      `2. Send it to your administrator\n` +
      `3. They will add it to your staff profile\n\n` +
      `Use <code>/help</code> to see all available commands.`;
  }

  /**
   * Format error message
   */
  static formatErrorMessage(errorCode: string, customMessage?: string): string {
    const errorMessages: Record<string, string> = {
      'INVALID_USER_ID': '❌ Invalid user ID format',
      'INVALID_COMMAND': '❌ Invalid command format',
      'RATE_LIMIT_EXCEEDED': '⏰ Rate limit exceeded. Please wait before sending more commands.',
      'COMMAND_COOLDOWN': '⏳ Please wait before using this command again.',
      'STAFF_NOT_FOUND': '👤 Staff member not found or not verified. Please contact your administrator.',
      'DATABASE_ERROR': '🔧 Database error occurred. Please try again later.',
      'UNKNOWN_ERROR': '❓ An unknown error occurred. Please try again later.'
    };

    return customMessage || errorMessages[errorCode] || '❌ An error occurred. Please try again later.';
  }

  /**
   * Format rate limit message
   */
  static formatRateLimitMessage(remainingTime: number): string {
    return `⏰ <b>Rate Limit Exceeded</b>\n\n` +
      `You've reached the maximum number of commands per minute.\n` +
      `Please wait ${remainingTime} seconds before trying again.\n\n` +
      `💡 <b>Tip:</b> Commands are limited to 10 per minute to ensure system stability.`;
  }

  /**
   * Format cooldown message
   */
  static formatCooldownMessage(remainingTime: number, command: string): string {
    return `⏳ <b>Command Cooldown</b>\n\n` +
      `Please wait ${remainingTime} seconds before using <code>${command}</code> again.\n\n` +
      `💡 <b>Tip:</b> Commands have a 5-second cooldown to prevent spam.`;
  }

  /**
   * Format validation error message
   */
  static formatValidationErrorMessage(field: string, reason: string): string {
    return `❌ <b>Validation Error</b>\n\n` +
      `Invalid ${field}: ${reason}\n\n` +
      `Please check your input and try again.`;
  }

  /**
   * Format empty state message
   */
  static formatEmptyState(message: string): string {
    return `✅ <b>${message}</b>`;
  }

  /**
   * Format staff header
   */
  private static formatStaffHeader(staff: StaffInfo): string {
    return `👤 <b>${staff.first_name} ${staff.last_name}</b>\n`;
  }

  /**
   * Format schedule message for a specific date
   */
  private static formatScheduleMessage(
    title: string,
    staff: StaffInfo,
    appointments: ScheduleAppointment[],
    context: DayScheduleContext,
  ): string {
    const dateString = formatInTimeZone(context.localDate, context.timezone, 'EEEE, d MMM yyyy');
    let message = `📅 <b>${title} - ${dateString}</b>\n\n`;
    message += this.formatStaffHeader(staff);
    message += `📊 <b>Total Appointments:</b> ${appointments.length}\n\n`;

    if (appointments.length === 0) {
      message += this.formatEmptyState('No appointments scheduled.');
      return message;
    }

    appointments.forEach((appointment, index) => {
      message += this.formatAppointmentItem(appointment, index + 1, false);
    });

    return message;
  }

  /**
   * Format appointment item
   */
  private static formatAppointmentItem(appointment: ScheduleAppointment, index: number, isWeekView: boolean = false): string {
    const startTime = appointment.start_time;
    const endTime = this.getAppointmentEndTime(startTime, appointment.duration_minutes);
    const indent = isWeekView ? '   ' : '';

    let item = `${indent}${index}. <b>${startTime} - ${endTime}</b>\n`;
    item += `${indent}   🏥 ${this.formatAppointmentType(appointment.appointment_type)}\n`;
    item += `${indent}   👤 ${appointment.patient.name}\n`;
    item += `${indent}   📞 ${appointment.patient.phone}\n`;

    if (appointment.patient.flat_villa_no || appointment.patient.building_street) {
      const address = this.formatAddress(appointment.patient);
      item += `${indent}   📍 ${address}\n`;
    }

    if (appointment.mini_notes) {
      item += `${indent}   📝 ${appointment.mini_notes}\n`;
    }

    item += `\n`;

    return item;
  }

  /**
   * Format appointment summary for status command
   */
  private static formatAppointmentSummary(appointment: ScheduleAppointment): string {
    const startTime = appointment.start_time;
    const endTime = this.getAppointmentEndTime(startTime, appointment.duration_minutes);
    const dateString = format(new Date(appointment.appointment_date), 'EEEE, d MMM', { timeZone: DUBAI_TIMEZONE });

    let summary = `   🏥 ${this.formatAppointmentType(appointment.appointment_type)}\n`;
    summary += `   👤 ${appointment.patient.name}\n`;
    summary += `   📅 ${dateString} at ${startTime} - ${endTime}\n`;

    if (appointment.mini_notes) {
      summary += `   📝 ${appointment.mini_notes}\n`;
    }

    return summary;
  }

  /**
   * Group appointments by date
   */
  private static groupAppointmentsByDate(appointments: ScheduleAppointment[]): Record<string, ScheduleAppointment[]> {
    return appointments.reduce((groups, appointment) => {
      const date = appointment.appointment_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(appointment);
      return groups;
    }, {} as Record<string, ScheduleAppointment[]>);
  }

  /**
   * Get appointment end time
   */
  private static getAppointmentEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end.toTimeString().slice(0, 5); // HH:MM format
  }

  /**
   * Format appointment type
   */
  private static formatAppointmentType(type: string): string {
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

  /**
   * Format staff type
   */
  private static formatStaffType(type: string): string {
    const typeMap: Record<string, string> = {
      'doctor': 'Doctor',
      'nurse': 'Nurse',
      'physiotherapist': 'Physiotherapist',
      'caregiver': 'Caregiver',
      'driver': 'Driver',
      'lab_technician': 'Lab Technician',
    };
    return typeMap[type] || type;
  }

  /**
   * Format patient address
   */
  private static formatAddress(patient: any): string {
    const parts = [];
    if (patient.flat_villa_no) parts.push(patient.flat_villa_no);
    if (patient.building_street) parts.push(patient.building_street);
    if (patient.area) parts.push(patient.area);
    if (patient.city) parts.push(patient.city);
    return parts.length > 0 ? parts.join(', ') : 'Address not provided';
  }
}

// Export the class directly since all methods are static
export { TelegramCommandFormatters as telegramCommandFormatters };
