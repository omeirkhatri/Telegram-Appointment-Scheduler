import { supabase } from '@/lib/supabase';
import type { Staff } from '@/types';
import {
    formatAppointmentTime,
    getAgendaDate,
    getDubaiDayRange,
    getStaffForDailyAgenda,
    toDubaiTime
} from '@/utils/timezone';
import { format } from 'date-fns';
import { telegramNotificationService } from './telegramNotificationService';

interface TelegramDeliveryStatus {
  staffId: string;
  telegramUserId: string;
  status: 'sent' | 'failed';
  error?: string;
}

export class StaffAggregationService {
  /**
   * Generate daily agenda for all eligible staff members via Telegram
   */
  async generateDailyAgendas(date?: Date, jobExecutionId?: string): Promise<{
    success: boolean;
    results: TelegramDeliveryStatus[];
    stats: {
      totalStaff: number;
      telegramsSent: number;
      telegramsFailed: number;
      successRate: number;
    };
  }> {
    try {
      const agendaDate = date || getAgendaDate();
      // Convert to YYYY-MM-DD format for database query (ensure we get the date in Dubai timezone)
      const dubaiDate = toDubaiTime(agendaDate);
      const dateString = format(dubaiDate, 'yyyy-MM-dd');

      console.log(`📅 Generating daily agendas for ${dateString}`);

      // Get all eligible staff members
      const eligibleStaff = await this.getEligibleStaffForAgenda(agendaDate);

      if (eligibleStaff.length === 0) {
        console.log('No eligible staff members found for daily agenda');
        return {
          success: true,
          results: [],
          stats: {
            totalStaff: 0,
            telegramsSent: 0,
            telegramsFailed: 0,
            successRate: 100,
          },
        };
      }

      console.log(`Found ${eligibleStaff.length} eligible staff members`);

      // Generate and send agendas for each staff member via Telegram
      const results: TelegramDeliveryStatus[] = [];
      let telegramsSent = 0;
      let telegramsFailed = 0;

      for (const staff of eligibleStaff) {
        try {
          // Check if staff has Telegram configured
          if (!staff.telegram_user_id || !staff.telegram_verified) {
            console.warn(`⚠️ Staff ${staff.first_name} ${staff.last_name} has no verified Telegram ID, skipping`);
            telegramsFailed++;
            results.push({
              staffId: staff.id,
              telegramUserId: 'not-configured',
              status: 'failed',
              error: 'No verified Telegram ID',
            });
            continue;
          }

          const agendaData = await this.generateStaffAgenda(staff.id, agendaDate);
          const telegramResult = await telegramNotificationService.sendDailyAgenda(
            staff.telegram_user_id,
            agendaData
          );

          const deliveryStatus: TelegramDeliveryStatus = {
            staffId: staff.id,
            telegramUserId: staff.telegram_user_id,
            status: telegramResult.success ? 'sent' : 'failed',
            error: telegramResult.error,
          };

          results.push(deliveryStatus);

          if (telegramResult.success) {
            telegramsSent++;
            console.log(`✅ Agenda sent to ${staff.first_name} ${staff.last_name} via Telegram`);
          } else {
            telegramsFailed++;
            console.error(`❌ Failed to send agenda to ${staff.first_name} ${staff.last_name}:`, telegramResult.error);
          }
        } catch (error) {
          telegramsFailed++;
          console.error(`❌ Error generating agenda for staff ${staff.id}:`, error);

          results.push({
            staffId: staff.id,
            telegramUserId: staff.telegram_user_id || 'unknown',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const successRate = eligibleStaff.length > 0 ? (telegramsSent / eligibleStaff.length) * 100 : 100;

      console.log('📊 Daily agenda generation completed:', {
        totalStaff: eligibleStaff.length,
        telegramsSent,
        telegramsFailed,
        successRate: Math.round(successRate * 100) / 100,
      });

      return {
        success: true,
        results,
        stats: {
          totalStaff: eligibleStaff.length,
          telegramsSent,
          telegramsFailed,
          successRate: Math.round(successRate * 100) / 100,
        },
      };
    } catch (error) {
      console.error('Failed to generate daily agendas:', error);
      return {
        success: false,
        results: [],
        stats: {
          totalStaff: 0,
          telegramsSent: 0,
          telegramsFailed: 0,
          successRate: 0,
        },
      };
    }
  }

  /**
   * Generate agenda for a specific staff member
   */
  async generateStaffAgenda(staffId: string, date: Date): Promise<{
    date: string;
    dayName: string;
    staffName: string;
    appointments: any[];
    totalAppointments: number;
  }> {
    // Get staff information
    const staff = await this.getStaffById(staffId);
    if (!staff) {
      throw new Error(`Staff member with ID ${staffId} not found`);
    }

    // Get appointments for the staff member on the given date
    const appointments = await this.getStaffAppointmentsForDate(staffId, date);

    // Transform appointments to agenda format
    const agendaAppointments = await Promise.all(
      appointments.map(appointment => this.transformAppointmentToAgenda(appointment)),
    );

    // Sort appointments by start time
    agendaAppointments.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Format date for display
    // Convert to YYYY-MM-DD format for database query (ensure we get the date in Dubai timezone)
    const dubaiDate = toDubaiTime(date);
    const dateString = format(dubaiDate, 'yyyy-MM-dd');
    const { getRelativeDayName } = require('@/utils/timezone');

    const dayName = getRelativeDayName(date);

    return {
      date: dateString,
      dayName: dayName,
      staffName: `${staff.first_name} ${staff.last_name}`,
      appointments: agendaAppointments,
      totalAppointments: agendaAppointments.length,
    };
  }

  /**
   * Get all staff members eligible for daily agenda
   */
  private async getEligibleStaffForAgenda(date: Date): Promise<Array<{ id: string; first_name: string; last_name: string; telegram_user_id: string; telegram_verified: boolean }>> {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, first_name, last_name, telegram_user_id, telegram_verified, status, available_days')
      .eq('telegram_verified', true)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to fetch staff: ${error.message}`);
    }

    return getStaffForDailyAgenda(staff || [], date);
  }

  /**
   * Get staff member by ID
   */
  private async getStaffById(staffId: string): Promise<Staff | null> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch staff: ${error.message}`);
    }

    return data;
  }

  /**
   * Get appointments for a staff member on a specific date
   */
  private async getStaffAppointmentsForDate(staffId: string, date: Date): Promise<AppointmentWithDetails[]> {
    const { start, end } = getDubaiDayRange(date);
    // Convert to YYYY-MM-DD format for database query (ensure we get the date in Dubai timezone)
    const dubaiDate = toDubaiTime(date);
    const dateString = format(dubaiDate, 'yyyy-MM-dd');

    // Get appointments where the staff member is assigned
    const { data: appointmentStaff, error: staffError } = await supabase
      .from('appointment_staff')
      .select(`
        appointment_id,
        appointments!inner (
          id,
          patient_id,
          appointment_type,
          appointment_date,
          start_time,
          duration_minutes,
          status,
          custom_fields,
          transportation_type,
          transportation_method,
          driver_id,
          notes,
          patients (
            id,
            name,
            phone,
            flat_villa_no,
            building_street,
            area,
            city
          )
        )
      `)
      .eq('staff_id', staffId)
      .eq('appointments.appointment_date', dateString)
      .eq('appointments.status', 'scheduled');

    if (staffError) {
      throw new Error(`Failed to fetch staff appointments: ${staffError.message}`);
    }

    // Get driver information for appointments that have drivers
    const appointmentsWithDrivers = await Promise.all(
      (appointmentStaff || []).map(async (item) => {
        const appointment = item.appointments;
        let driver = null;

        if (appointment.driver_id) {
          const { data: driverData } = await supabase
            .from('staff')
            .select('id, first_name, last_name')
            .eq('id', appointment.driver_id)
            .single();
          driver = driverData;
        }

        return {
          ...appointment,
          driver,
        } as AppointmentWithDetails;
      }),
    );

    return appointmentsWithDrivers;
  }

  /**
   * Transform appointment to agenda format
   */
  private async transformAppointmentToAgenda(appointment: AppointmentWithDetails): Promise<AgendaAppointment> {
    const { startTime, endTime } = formatAppointmentTime(
      appointment.appointment_date,
      appointment.start_time,
      appointment.duration_minutes,
    );

    const appointmentTypeDisplay = appointment.appointment_type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const patient = appointment.patients;
    const patientName = patient ? patient.name : 'Unknown Patient';
    const patientPhone = patient ? patient.phone : 'N/A';
    const patientAddress = patient ?
      `${patient.flat_villa_no}, ${patient.building_street}, ${patient.area}, ${patient.city}` :
      'N/A';

    // Get assigned staff for this appointment
    const { data: assignedStaff } = await supabase
      .from('appointment_staff')
      .select(`
        staff_id,
        role,
        staff (
          id,
          first_name,
          last_name,
          staff_type
        )
      `)
      .eq('appointment_id', appointment.id);

    const staffNames = assignedStaff
      ?.filter(item => item.staff?.staff_type !== 'driver')
      .map(item => `${item.staff?.first_name} ${item.staff?.last_name}`)
      .join(', ');

    const driverName = appointment.driver ?
      `${appointment.driver.first_name} ${appointment.driver.last_name}` :
      undefined;

    let transportationInfo: string | undefined;
    if (appointment.transportation_type === 'driver' && driverName) {
      transportationInfo = `Driver: ${driverName}`;
    } else if (appointment.transportation_type === 'self_transport' && appointment.transportation_method) {
      transportationInfo = `Self-transport: ${appointment.transportation_method}`;
    }

    return {
      id: appointment.id,
      startTime,
      endTime,
      appointmentType: appointment.appointment_type,
      appointmentTypeDisplay,
      patientName,
      patientPhone,
      patientAddress,
      staffName: staffNames,
      driverName,
      transportationMethod: appointment.transportation_method,
      transportationInfo,
      notes: appointment.notes,
      customFields: appointment.custom_fields,
    };
  }


  /**
   * Get daily agenda statistics
   */
  async getDailyAgendaStats(date: Date): Promise<{
    totalStaff: number;
    eligibleStaff: number;
    totalAppointments: number;
    staffWithAppointments: number;
  }> {
    // Convert to YYYY-MM-DD format for database query (ensure we get the date in Dubai timezone)
    const dubaiDate = toDubaiTime(date);
    const dateString = format(dubaiDate, 'yyyy-MM-dd');

    // Get total staff count
    const { count: totalStaff } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get eligible staff count
    const eligibleStaff = await this.getEligibleStaffForAgenda(date);

    // Get total appointments for the date
    const { count: totalAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('appointment_date', dateString)
      .eq('status', 'scheduled');

    // Get staff with appointments count
    const { data: staffWithAppointmentsData } = await supabase
      .from('appointment_staff')
      .select('staff_id')
      .in('appointment_id',
        supabase
          .from('appointments')
          .select('id')
          .eq('appointment_date', dateString)
          .eq('status', 'scheduled'),
      );

    const uniqueStaffWithAppointments = new Set(
      staffWithAppointmentsData?.map(item => item.staff_id) || [],
    ).size;

    return {
      totalStaff: totalStaff || 0,
      eligibleStaff: eligibleStaff.length,
      totalAppointments: totalAppointments || 0,
      staffWithAppointments: uniqueStaffWithAppointments,
    };
  }
}

// Export singleton instance
export const staffAggregationService = new StaffAggregationService();
