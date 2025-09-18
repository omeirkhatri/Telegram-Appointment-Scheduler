import { supabase } from '@/lib/supabase';
import { staffService } from '@/services/staffService';
import { telegramCommandFormatters } from '@/utils/telegramCommandFormatters';
import { telegramValidationService } from '@/utils/telegramValidation';
import { DUBAI_TIMEZONE, formatDubaiDate, getCurrentDubaiTime, toDubaiTime } from '@/utils/timezone';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';

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

export interface CommandResult {
  success: boolean;
  message: string;
  errorCode?: string;
  errorDetails?: string;
}

export class TelegramCommandService {
  /**
   * Handle /today command - Get today's schedule
   */
  async handleTodayCommand(telegramUserId: string): Promise<CommandResult> {
    try {
      // Validate input
      const validation = telegramValidationService.validateTelegramUserId(telegramUserId);
      if (!validation.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/today', false, validation.errorCode);
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage(validation.errorCode!, validation.error),
          errorCode: validation.errorCode
        };
      }

      // Check rate limiting
      const rateLimitCheck = telegramValidationService.checkRateLimit(telegramUserId);
      if (!rateLimitCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/today', false, rateLimitCheck.errorCode);
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage(rateLimitCheck.errorCode!, rateLimitCheck.error),
          errorCode: rateLimitCheck.errorCode
        };
      }

      // Check command cooldown
      const cooldownCheck = telegramValidationService.checkCommandCooldown(telegramUserId, '/today');
      if (!cooldownCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/today', false, cooldownCheck.errorCode);
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage(cooldownCheck.errorCode!, cooldownCheck.error),
          errorCode: cooldownCheck.errorCode
        };
      }

      // Get staff member
      const staff = await staffService.getStaffByTelegramUserId(telegramUserId);
      if (!staff) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/today', false, 'STAFF_NOT_FOUND');
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage('STAFF_NOT_FOUND'),
          errorCode: 'STAFF_NOT_FOUND'
        };
      }

      // Get appointments
      const today = getCurrentDubaiTime();
      const appointments = await this.getStaffAppointmentsForDate(staff.id, today);

      const message = telegramCommandFormatters.formatTodaySchedule(staff, appointments);

      // Record successful command usage
      telegramValidationService.recordCommandUsage(telegramUserId, '/today', true);

      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('❌ Error in handleTodayCommand:', error);
      telegramValidationService.recordCommandUsage(telegramUserId, '/today', false, 'UNKNOWN_ERROR');

      return {
        success: false,
        message: telegramCommandFormatters.formatErrorMessage('UNKNOWN_ERROR', 'An error occurred while retrieving today\'s schedule. Please try again later.'),
        errorCode: 'UNKNOWN_ERROR',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle /tomorrow command - Get tomorrow's schedule
   */
  async handleTomorrowCommand(telegramUserId: string): Promise<CommandResult> {
    try {
      // Validate input
      const validation = telegramValidationService.validateTelegramUserId(telegramUserId);
      if (!validation.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/tomorrow', false, validation.errorCode);
        return {
          success: false,
          message: `❌ ${validation.error}`,
          errorCode: validation.errorCode
        };
      }

      // Check rate limiting
      const rateLimitCheck = telegramValidationService.checkRateLimit(telegramUserId);
      if (!rateLimitCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/tomorrow', false, rateLimitCheck.errorCode);
        return {
          success: false,
          message: `❌ ${rateLimitCheck.error}`,
          errorCode: rateLimitCheck.errorCode
        };
      }

      // Check command cooldown
      const cooldownCheck = telegramValidationService.checkCommandCooldown(telegramUserId, '/tomorrow');
      if (!cooldownCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/tomorrow', false, cooldownCheck.errorCode);
        return {
          success: false,
          message: `❌ ${cooldownCheck.error}`,
          errorCode: cooldownCheck.errorCode
        };
      }

      // Get staff member
      const staff = await staffService.getStaffByTelegramUserId(telegramUserId);
      if (!staff) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/tomorrow', false, 'STAFF_NOT_FOUND');
        return {
          success: false,
          message: '❌ Staff member not found or not verified. Please contact your administrator.',
          errorCode: 'STAFF_NOT_FOUND'
        };
      }

      // Get appointments
      const tomorrow = addDays(getCurrentDubaiTime(), 1);
      const appointments = await this.getStaffAppointmentsForDate(staff.id, tomorrow);

      const message = telegramCommandFormatters.formatTomorrowSchedule(staff, appointments);

      // Record successful command usage
      telegramValidationService.recordCommandUsage(telegramUserId, '/tomorrow', true);

      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('❌ Error in handleTomorrowCommand:', error);
      telegramValidationService.recordCommandUsage(telegramUserId, '/tomorrow', false, 'UNKNOWN_ERROR');

      return {
        success: false,
        message: '❌ An error occurred while retrieving tomorrow\'s schedule. Please try again later.',
        errorCode: 'UNKNOWN_ERROR',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle /week command - Get this week's schedule
   */
  async handleWeekCommand(telegramUserId: string): Promise<CommandResult> {
    try {
      // Validate input
      const validation = telegramValidationService.validateTelegramUserId(telegramUserId);
      if (!validation.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/week', false, validation.errorCode);
        return {
          success: false,
          message: `❌ ${validation.error}`,
          errorCode: validation.errorCode
        };
      }

      // Check rate limiting
      const rateLimitCheck = telegramValidationService.checkRateLimit(telegramUserId);
      if (!rateLimitCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/week', false, rateLimitCheck.errorCode);
        return {
          success: false,
          message: `❌ ${rateLimitCheck.error}`,
          errorCode: rateLimitCheck.errorCode
        };
      }

      // Check command cooldown
      const cooldownCheck = telegramValidationService.checkCommandCooldown(telegramUserId, '/week');
      if (!cooldownCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/week', false, cooldownCheck.errorCode);
        return {
          success: false,
          message: `❌ ${cooldownCheck.error}`,
          errorCode: cooldownCheck.errorCode
        };
      }

      // Get staff member
      const staff = await staffService.getStaffByTelegramUserId(telegramUserId);
      if (!staff) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/week', false, 'STAFF_NOT_FOUND');
        return {
          success: false,
          message: '❌ Staff member not found or not verified. Please contact your administrator.',
          errorCode: 'STAFF_NOT_FOUND'
        };
      }

      // Get appointments
      const now = getCurrentDubaiTime();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

      const appointments = await this.getStaffAppointmentsForDateRange(staff.id, weekStart, weekEnd);

      const message = telegramCommandFormatters.formatWeekSchedule(staff, appointments);

      // Record successful command usage
      telegramValidationService.recordCommandUsage(telegramUserId, '/week', true);

      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('❌ Error in handleWeekCommand:', error);
      telegramValidationService.recordCommandUsage(telegramUserId, '/week', false, 'UNKNOWN_ERROR');

      return {
        success: false,
        message: '❌ An error occurred while retrieving this week\'s schedule. Please try again later.',
        errorCode: 'UNKNOWN_ERROR',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle /help command - Show help message
   */
  async handleHelpCommand(telegramUserId: string): Promise<CommandResult> {
    try {
      // Validate input
      const validation = telegramValidationService.validateTelegramUserId(telegramUserId);
      if (!validation.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/help', false, validation.errorCode);
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage(validation.errorCode!, validation.error),
          errorCode: validation.errorCode
        };
      }

      // Check rate limiting
      const rateLimitCheck = telegramValidationService.checkRateLimit(telegramUserId);
      if (!rateLimitCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/help', false, rateLimitCheck.errorCode);
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage(rateLimitCheck.errorCode!, rateLimitCheck.error),
          errorCode: rateLimitCheck.errorCode
        };
      }

      // Check command cooldown
      const cooldownCheck = telegramValidationService.checkCommandCooldown(telegramUserId, '/help');
      if (!cooldownCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/help', false, cooldownCheck.errorCode);
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage(cooldownCheck.errorCode!, cooldownCheck.error),
          errorCode: cooldownCheck.errorCode
        };
      }

      const message = telegramCommandFormatters.formatHelpMessage();

      // Record successful command usage
      telegramValidationService.recordCommandUsage(telegramUserId, '/help', true);

      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('❌ Error in handleHelpCommand:', error);
      telegramValidationService.recordCommandUsage(telegramUserId, '/help', false, 'UNKNOWN_ERROR');

      return {
        success: false,
        message: telegramCommandFormatters.formatErrorMessage('UNKNOWN_ERROR', 'An error occurred while retrieving help information. Please try again later.'),
        errorCode: 'UNKNOWN_ERROR',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle /info command - Show user information
   */
  async handleInfoCommand(telegramUserId: string, user: any): Promise<CommandResult> {
    try {
      // Validate input
      const validation = telegramValidationService.validateTelegramUserId(telegramUserId);
      if (!validation.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/info', false, validation.errorCode);
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage(validation.errorCode!, validation.error),
          errorCode: validation.errorCode
        };
      }

      // Check rate limiting
      const rateLimitCheck = telegramValidationService.checkRateLimit(telegramUserId);
      if (!rateLimitCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/info', false, rateLimitCheck.errorCode);
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage(rateLimitCheck.errorCode!, rateLimitCheck.error),
          errorCode: rateLimitCheck.errorCode
        };
      }

      // Check command cooldown
      const cooldownCheck = telegramValidationService.checkCommandCooldown(telegramUserId, '/info');
      if (!cooldownCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/info', false, cooldownCheck.errorCode);
        return {
          success: false,
          message: telegramCommandFormatters.formatErrorMessage(cooldownCheck.errorCode!, cooldownCheck.error),
          errorCode: cooldownCheck.errorCode
        };
      }

      const message = telegramCommandFormatters.formatInfoMessage(user);

      // Record successful command usage
      telegramValidationService.recordCommandUsage(telegramUserId, '/info', true);

      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('❌ Error in handleInfoCommand:', error);
      telegramValidationService.recordCommandUsage(telegramUserId, '/info', false, 'UNKNOWN_ERROR');

      return {
        success: false,
        message: telegramCommandFormatters.formatErrorMessage('UNKNOWN_ERROR', 'An error occurred while retrieving user information. Please try again later.'),
        errorCode: 'UNKNOWN_ERROR',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle /status command - Get current status and next appointment
   */
  async handleStatusCommand(telegramUserId: string): Promise<CommandResult> {
    try {
      // Validate input
      const validation = telegramValidationService.validateTelegramUserId(telegramUserId);
      if (!validation.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/status', false, validation.errorCode);
        return {
          success: false,
          message: `❌ ${validation.error}`,
          errorCode: validation.errorCode
        };
      }

      // Check rate limiting
      const rateLimitCheck = telegramValidationService.checkRateLimit(telegramUserId);
      if (!rateLimitCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/status', false, rateLimitCheck.errorCode);
        return {
          success: false,
          message: `❌ ${rateLimitCheck.error}`,
          errorCode: rateLimitCheck.errorCode
        };
      }

      // Check command cooldown
      const cooldownCheck = telegramValidationService.checkCommandCooldown(telegramUserId, '/status');
      if (!cooldownCheck.isValid) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/status', false, cooldownCheck.errorCode);
        return {
          success: false,
          message: `❌ ${cooldownCheck.error}`,
          errorCode: cooldownCheck.errorCode
        };
      }

      // Get staff member
      const staff = await staffService.getStaffByTelegramUserId(telegramUserId);
      if (!staff) {
        telegramValidationService.recordCommandUsage(telegramUserId, '/status', false, 'STAFF_NOT_FOUND');
        return {
          success: false,
          message: '❌ Staff member not found or not verified. Please contact your administrator.',
          errorCode: 'STAFF_NOT_FOUND'
        };
      }

      // Get status information
      const now = getCurrentDubaiTime();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get today's appointments
      const todayAppointments = await this.getStaffAppointmentsForDate(staff.id, today);

      // Get next appointment (today or tomorrow)
      const nextAppointment = await this.getNextAppointment(staff.id, now);

      // Get current appointment if any
      const currentAppointment = this.getCurrentAppointment(todayAppointments, now);

      const message = telegramCommandFormatters.formatStatusMessage(
        staff,
        todayAppointments,
        nextAppointment,
        currentAppointment
      );

      // Record successful command usage
      telegramValidationService.recordCommandUsage(telegramUserId, '/status', true);

      return {
        success: true,
        message
      };
    } catch (error) {
      console.error('❌ Error in handleStatusCommand:', error);
      telegramValidationService.recordCommandUsage(telegramUserId, '/status', false, 'UNKNOWN_ERROR');

      return {
        success: false,
        message: '❌ An error occurred while retrieving your status. Please try again later.',
        errorCode: 'UNKNOWN_ERROR',
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get staff appointments for a specific date
   */
  private async getStaffAppointmentsForDate(staffId: string, date: Date): Promise<ScheduleAppointment[]> {
    // Convert to YYYY-MM-DD format for database query (ensure we get the date in Dubai timezone)
    const dubaiDate = toDubaiTime(date);
    const dateString = format(dubaiDate, 'yyyy-MM-dd');

    const { data: appointmentStaff, error } = await supabase
      .from('appointment_staff')
      .select(`
        appointment_id,
        role,
        appointments!inner (
          id,
          appointment_type,
          appointment_date,
          start_time,
          duration_minutes,
          status,
          mini_notes,
          full_notes,
          pickup_instructions,
          patients (
            id,
            name,
            phone,
            flat_villa_no,
            building_street,
            area,
            city
          )
        ),
        staff!inner (
          id,
          first_name,
          last_name,
          staff_type
        )
      `)
      .eq('staff_id', staffId)
      .eq('appointments.appointment_date', dateString)
      .eq('appointments.status', 'scheduled');

    if (error) {
      console.error('Error fetching staff appointments:', error);
      return [];
    }

    // Transform the data to match our interface
    const appointments: ScheduleAppointment[] = (appointmentStaff || []).map(item => ({
      ...item.appointments,
      patient: item.appointments.patients, // Fix: use patients property and rename to patient
      staff_assignments: [{
        staff_id: item.staff.id,
        role: item.role,
        staff: {
          id: item.staff.id,
          first_name: item.staff.first_name,
          last_name: item.staff.last_name,
          staff_type: item.staff.staff_type
        }
      }]
    }));

    return appointments;
  }

  /**
   * Get staff appointments for a date range
   */
  private async getStaffAppointmentsForDateRange(staffId: string, startDate: Date, endDate: Date): Promise<ScheduleAppointment[]> {
    // Convert to YYYY-MM-DD format for database query (ensure we get the date in Dubai timezone)
    const startDubaiDate = toDubaiTime(startDate);
    const endDubaiDate = toDubaiTime(endDate);
    const startDateString = format(startDubaiDate, 'yyyy-MM-dd');
    const endDateString = format(endDubaiDate, 'yyyy-MM-dd');

    const { data: appointmentStaff, error } = await supabase
      .from('appointment_staff')
      .select(`
        appointment_id,
        role,
        appointments!inner (
          id,
          appointment_type,
          appointment_date,
          start_time,
          duration_minutes,
          status,
          mini_notes,
          full_notes,
          pickup_instructions,
          patients (
            id,
            name,
            phone,
            flat_villa_no,
            building_street,
            area,
            city
          )
        ),
        staff!inner (
          id,
          first_name,
          last_name,
          staff_type
        )
      `)
      .eq('staff_id', staffId)
      .gte('appointments.appointment_date', startDateString)
      .lte('appointments.appointment_date', endDateString)
      .eq('appointments.status', 'scheduled');

    if (error) {
      console.error('Error fetching staff appointments for date range:', error);
      return [];
    }

    // Transform the data to match our interface
    const appointments: ScheduleAppointment[] = (appointmentStaff || []).map(item => ({
      ...item.appointments,
      patient: item.appointments.patients, // Fix: use patients property and rename to patient
      staff_assignments: [{
        staff_id: item.staff.id,
        role: item.role,
        staff: {
          id: item.staff.id,
          first_name: item.staff.first_name,
          last_name: item.staff.last_name,
          staff_type: item.staff.staff_type
        }
      }]
    }));

    return appointments;
  }

  /**
   * Get next appointment for staff
   */
  private async getNextAppointment(staffId: string, fromDate: Date): Promise<ScheduleAppointment | null> {
    const fromDateString = formatDubaiDate(fromDate);

    const { data: appointmentStaff, error } = await supabase
      .from('appointment_staff')
      .select(`
        appointment_id,
        role,
        appointments!inner (
          id,
          appointment_type,
          appointment_date,
          start_time,
          duration_minutes,
          status,
          mini_notes,
          full_notes,
          pickup_instructions,
          patients (
            id,
            name,
            phone,
            flat_villa_no,
            building_street,
            area,
            city
          )
        ),
        staff!inner (
          id,
          first_name,
          last_name,
          staff_type
        )
      `)
      .eq('staff_id', staffId)
      .gte('appointments.appointment_date', fromDateString)
      .eq('appointments.status', 'scheduled')
      .order('appointments.appointment_date', { ascending: true })
      .order('appointments.start_time', { ascending: true })
      .limit(1);

    if (error || !appointmentStaff || appointmentStaff.length === 0) {
      return null;
    }

    const item = appointmentStaff[0];
    return {
      ...item.appointments,
      patient: item.appointments.patients, // Fix: use patients property and rename to patient
      staff_assignments: [{
        staff_id: item.staff.id,
        role: item.role,
        staff: {
          id: item.staff.id,
          first_name: item.staff.first_name,
          last_name: item.staff.last_name,
          staff_type: item.staff.staff_type
        }
      }]
    };
  }

  /**
   * Get current appointment (if any)
   */
  private getCurrentAppointment(appointments: ScheduleAppointment[], now: Date): ScheduleAppointment | null {
    const currentTime = format(now, 'HH:mm');

    for (const appointment of appointments) {
      const startTime = appointment.start_time;
      const endTime = this.getAppointmentEndTime(startTime, appointment.duration_minutes);

      if (currentTime >= startTime && currentTime <= endTime) {
        return appointment;
      }
    }

    return null;
  }

  /**
   * Format schedule message for a specific date
   */
  private formatScheduleMessage(title: string, staff: any, appointments: ScheduleAppointment[], date: Date): string {
    const dateString = format(date, 'EEEE, d MMM yyyy', { timeZone: DUBAI_TIMEZONE });

    let message = `📅 <b>${title} - ${dateString}</b>\n\n`;
    message += `👤 <b>${staff.first_name} ${staff.last_name}</b>\n`;
    message += `📊 <b>Total:</b> ${appointments.length} appointments\n\n`;

    if (appointments.length === 0) {
      message += `✅ No appointments scheduled.`;
      return message;
    }

    appointments.forEach((appointment, index) => {
      const startTime = appointment.start_time;
      const endTime = this.getAppointmentEndTime(startTime, appointment.duration_minutes);

      message += `${index + 1}. <b>${startTime} - ${endTime}</b>\n`;
      message += `   🏥 ${this.formatAppointmentType(appointment.appointment_type)}\n`;
      message += `   👤 ${appointment.patient.name}\n`;
      message += `   📞 ${appointment.patient.phone}\n`;

      if (appointment.patient.flat_villa_no || appointment.patient.building_street) {
        const address = this.formatAddress(appointment.patient);
        message += `   📍 ${address}\n`;
      }

      if (appointment.mini_notes) {
        message += `   📝 ${appointment.mini_notes}\n`;
      }

      message += `\n`;
    });

    return message;
  }

  /**
   * Format week schedule message
   */
  private formatWeekScheduleMessage(staff: any, appointments: ScheduleAppointment[], weekStart: Date, weekEnd: Date): string {
    const weekStartString = format(weekStart, 'd MMM', { timeZone: DUBAI_TIMEZONE });
    const weekEndString = format(weekEnd, 'd MMM yyyy', { timeZone: DUBAI_TIMEZONE });

    let message = `📅 <b>This Week's Schedule - ${weekStartString} to ${weekEndString}</b>\n\n`;
    message += `👤 <b>${staff.first_name} ${staff.last_name}</b>\n`;
    message += `📊 <b>Total:</b> ${appointments.length} appointments\n\n`;

    if (appointments.length === 0) {
      message += `✅ No appointments scheduled this week.`;
      return message;
    }

    // Group appointments by date
    const appointmentsByDate = this.groupAppointmentsByDate(appointments);

    Object.keys(appointmentsByDate).sort().forEach(date => {
      const dayAppointments = appointmentsByDate[date];
      const dayName = format(new Date(date), 'EEEE', { timeZone: DUBAI_TIMEZONE });

      message += `📅 <b>${dayName}, ${format(new Date(date), 'd MMM', { timeZone: DUBAI_TIMEZONE })}</b>\n`;

      dayAppointments.forEach((appointment, index) => {
        const startTime = appointment.start_time;
        const endTime = this.getAppointmentEndTime(startTime, appointment.duration_minutes);

        message += `   ${index + 1}. <b>${startTime} - ${endTime}</b>\n`;
        message += `      🏥 ${this.formatAppointmentType(appointment.appointment_type)}\n`;
        message += `      👤 ${appointment.patient.name}\n`;

        if (appointment.mini_notes) {
          message += `      📝 ${appointment.mini_notes}\n`;
        }

        message += `\n`;
      });
    });

    return message;
  }

  /**
   * Format appointment summary for status command
   */
  private formatAppointmentSummary(appointment: ScheduleAppointment): string {
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
  private groupAppointmentsByDate(appointments: ScheduleAppointment[]): Record<string, ScheduleAppointment[]> {
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
  private getAppointmentEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end.toTimeString().slice(0, 5); // HH:MM format
  }

  /**
   * Format appointment type
   */
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

  /**
   * Format staff type
   */
  private formatStaffType(type: string): string {
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
  private formatAddress(patient: any): string {
    const parts = [];
    if (patient.flat_villa_no) parts.push(patient.flat_villa_no);
    if (patient.building_street) parts.push(patient.building_street);
    if (patient.area) parts.push(patient.area);
    if (patient.city) parts.push(patient.city);
    return parts.join(', ');
  }
}

// Export singleton instance
export const telegramCommandService = new TelegramCommandService();
