import { emailTemplateEngine } from '@/lib/emailTemplateEngine';
import { supabase } from '@/lib/supabase';
import type { Staff } from '@/types';
import type {
    AgendaAppointment,
    AgendaEmailData,
    AppointmentWithDetails,
    EmailDeliveryStatus,
    StaffEmailPreferences,
} from '@/types/email';
import {
    formatAppointmentTime,
    formatDubaiDate,
    getAgendaDate,
    getDubaiDayRange,
    getStaffForDailyAgenda,
} from '@/utils/timezone';
import { emailService } from './emailService';

export class StaffAggregationService {
  /**
   * Generate daily agenda for all eligible staff members
   */
  async generateDailyAgendas(date?: Date, jobExecutionId?: string): Promise<{
    success: boolean;
    results: EmailDeliveryStatus[];
    stats: {
      totalStaff: number;
      emailsSent: number;
      emailsFailed: number;
      successRate: number;
    };
  }> {
    try {
      const agendaDate = date || getAgendaDate();
      const dateString = formatDubaiDate(agendaDate);

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
            emailsSent: 0,
            emailsFailed: 0,
            successRate: 100,
          },
        };
      }

      console.log(`Found ${eligibleStaff.length} eligible staff members`);

      // Generate and send agendas for each staff member
      const results: EmailDeliveryStatus[] = [];
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const staff of eligibleStaff) {
        try {
          const agendaData = await this.generateStaffAgenda(staff.id, agendaDate);
          const emailResult = await emailService.sendEmail({
            to: staff.email,
            subject: agendaData.subject,
            html: emailTemplateEngine.renderAgendaTemplate(agendaData),
            from: 'MediCare Scheduler <noreply@medicare.com>',
          }, {
            emailType: 'daily_agenda',
            staffId: staff.id,
            jobExecutionId,
            priority: 'high',
            metadata: {
              date: dateString,
              agendaData,
            },
          });

          const deliveryStatus: EmailDeliveryStatus = {
            emailId: emailResult.messageId || `email-${Date.now()}-${staff.id}`,
            staffId: staff.id,
            date: dateString,
            status: emailResult.success ? 'sent' : 'failed',
            sentAt: new Date(),
            error: emailResult.error,
            retryCount: 0,
          };

          results.push(deliveryStatus);

          if (emailResult.success) {
            emailsSent++;
            console.log(`✅ Agenda sent to ${staff.email}`);
          } else {
            emailsFailed++;
            console.error(`❌ Failed to send agenda to ${staff.email}:`, emailResult.error);
          }
        } catch (error) {
          emailsFailed++;
          console.error(`❌ Error generating agenda for staff ${staff.id}:`, error);

          results.push({
            emailId: `error-${Date.now()}-${staff.id}`,
            staffId: staff.id,
            date: dateString,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: 0,
          });
        }
      }

      const successRate = eligibleStaff.length > 0 ? (emailsSent / eligibleStaff.length) * 100 : 100;

      console.log('📊 Daily agenda generation completed:', {
        totalStaff: eligibleStaff.length,
        emailsSent,
        emailsFailed,
        successRate: Math.round(successRate * 100) / 100,
      });

      return {
        success: true,
        results,
        stats: {
          totalStaff: eligibleStaff.length,
          emailsSent,
          emailsFailed,
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
          emailsSent: 0,
          emailsFailed: 0,
          successRate: 0,
        },
      };
    }
  }

  /**
   * Generate agenda for a specific staff member
   */
  async generateStaffAgenda(staffId: string, date: Date): Promise<AgendaEmailData> {
    // Get staff information
    const staff = await this.getStaffById(staffId);
    if (!staff) {
      throw new Error(`Staff member with ID ${staffId} not found`);
    }

    // Get appointments for the staff member on the given date
    const appointments = await this.getStaffAppointmentsForDate(staffId, date);

    // Transform appointments to agenda format
    const agendaAppointments: AgendaAppointment[] = await Promise.all(
      appointments.map(appointment => this.transformAppointmentToAgenda(appointment)),
    );

    // Sort appointments by start time
    agendaAppointments.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return {
      subject: `Your Schedule for ${formatDubaiDate(date)}`,
      content: '',
      date: formatDubaiDate(date),
      staffName: `${staff.first_name} ${staff.last_name}`,
      staffEmail: staff.email,
      appointments: agendaAppointments,
      totalAppointments: agendaAppointments.length,
      multipleAppointments: agendaAppointments.length !== 1,
    };
  }

  /**
   * Get all staff members eligible for daily agenda
   */
  private async getEligibleStaffForAgenda(date: Date): Promise<Array<{ id: string; email: string }>> {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, email, email_notifications_enabled, status, available_days')
      .eq('email_notifications_enabled', true)
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
    const dateString = formatDubaiDate(date);

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
   * Get staff email preferences
   */
  async getStaffEmailPreferences(staffId: string): Promise<StaffEmailPreferences | null> {
    const { data, error } = await supabase
      .from('staff')
      .select('id, email_notifications_enabled')
      .eq('id', staffId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch staff preferences: ${error.message}`);
    }

    return {
      staffId: data.id,
      emailNotificationsEnabled: data.email_notifications_enabled,
      dailyAgendaEnabled: data.email_notifications_enabled,
      agendaTime: '06:00',
      timezone: 'Asia/Dubai',
    };
  }

  /**
   * Update staff email preferences
   */
  async updateStaffEmailPreferences(
    staffId: string,
    preferences: Partial<StaffEmailPreferences>,
  ): Promise<StaffEmailPreferences> {
    const updateData: any = {};

    if (preferences.emailNotificationsEnabled !== undefined) {
      updateData.email_notifications_enabled = preferences.emailNotificationsEnabled;
    }

    const { data, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', staffId)
      .select('id, email_notifications_enabled')
      .single();

    if (error) {
      throw new Error(`Failed to update staff preferences: ${error.message}`);
    }

    return {
      staffId: data.id,
      emailNotificationsEnabled: data.email_notifications_enabled,
      dailyAgendaEnabled: data.email_notifications_enabled,
      agendaTime: '06:00',
      timezone: 'Asia/Dubai',
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
    const dateString = formatDubaiDate(date);

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
