import { supabase } from '@/lib/supabase';
import { buildTimezoneArtifacts, formatLocalDate, getCurrentLocalTime, type TimezoneArtifacts } from '@/lib/timezoneArtifacts';
import type { TimezoneContext } from '@/types/timezone';
import { staffService } from '@/services/staffService';
import { telegramCommandFormatters } from '@/utils/telegramCommandFormatters';
import { telegramValidationService } from '@/utils/telegramValidation';
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
  private getTimezoneArtifacts(overrides: Partial<TimezoneContext> = {}): TimezoneArtifacts {
    return buildTimezoneArtifacts(overrides);
  }

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

      // Resolve timezone context
      const timezone = this.getTimezoneArtifacts();

      // Get appointments
      const today = getCurrentLocalTime(timezone);
      const appointments = await this.getStaffAppointmentsForDate(staff.id, today, timezone);

      const message = telegramCommandFormatters.formatTodaySchedule(staff, appointments, {
        timezone: timezone.resolution.timezone,
        localDate: today,
      });

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

      const timezone = this.getTimezoneArtifacts();

      // Get appointments
      const tomorrow = addDays(getCurrentLocalTime(timezone), 1);
      const appointments = await this.getStaffAppointmentsForDate(staff.id, tomorrow, timezone);

      const message = telegramCommandFormatters.formatTomorrowSchedule(staff, appointments, {
        timezone: timezone.resolution.timezone,
        localDate: tomorrow,
      });

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

      const timezone = this.getTimezoneArtifacts();

      // Get appointments
      const now = getCurrentLocalTime(timezone);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

      const appointments = await this.getStaffAppointmentsForDateRange(staff.id, weekStart, weekEnd, timezone);

      const message = telegramCommandFormatters.formatWeekSchedule(staff, appointments, {
        timezone: timezone.resolution.timezone,
        weekStart,
        weekEnd,
      });

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

      const timezone = this.getTimezoneArtifacts();
      const message = telegramCommandFormatters.formatHelpMessage(
        `${timezone.resolution.timezone} (${timezone.resolution.abbreviation})`,
      );

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

      const timezone = this.getTimezoneArtifacts();

      // Get status information
      const now = getCurrentLocalTime(timezone);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get today's appointments
      const todayAppointments = await this.getStaffAppointmentsForDate(staff.id, today, timezone);

      // Get next appointment (today or tomorrow)
      const nextAppointment = await this.getNextAppointment(staff.id, now, timezone);

      // Get current appointment if any
      const currentAppointment = this.getCurrentAppointment(todayAppointments, now);

      const message = telegramCommandFormatters.formatStatusMessage(
        staff,
        todayAppointments,
        nextAppointment,
        currentAppointment,
        {
          timezone: timezone.resolution.timezone,
          now,
        },
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
  private async getStaffAppointmentsForDate(
    staffId: string,
    date: Date,
    timezone: TimezoneArtifacts,
  ): Promise<ScheduleAppointment[]> {
    const dateString = formatLocalDate(timezone, date, 'yyyy-MM-dd');

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
            city,
            latitude,
            longitude,
            google_maps_link
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
  private async getStaffAppointmentsForDateRange(
    staffId: string,
    startDate: Date,
    endDate: Date,
    timezone: TimezoneArtifacts,
  ): Promise<ScheduleAppointment[]> {
    const startDateString = formatLocalDate(timezone, startDate, 'yyyy-MM-dd');
    const endDateString = formatLocalDate(timezone, endDate, 'yyyy-MM-dd');

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
            city,
            latitude,
            longitude,
            google_maps_link
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
  private async getNextAppointment(
    staffId: string,
    fromDate: Date,
    timezone: TimezoneArtifacts,
  ): Promise<ScheduleAppointment | null> {
    const fromDateString = formatLocalDate(timezone, fromDate, 'yyyy-MM-dd');

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
            city,
            latitude,
            longitude,
            google_maps_link
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
   * Get appointment end time
   */
  private getAppointmentEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end.toTimeString().slice(0, 5); // HH:MM format
  }

}

// Export singleton instance
export const telegramCommandService = new TelegramCommandService();
