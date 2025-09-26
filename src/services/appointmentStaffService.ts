import { logCalendarOperation } from '@/lib/calendarOperations';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import type {
    AppointmentStaff,
    AppointmentStaffFilters,
    AppointmentStaffWithDetails,
    CreateAppointmentStaff,
    StaffAssignment,
    UpdateAppointmentStaff,
} from '@/types';
import {
    getAppointmentStaffSummary,
    validateAppointmentStaffData,
} from '@/types/appointmentStaff';
import { appointmentService } from './appointmentService';
import { getGoogleCalendarService } from './googleCalendarService';

export class AppointmentStaffService {
  // Get all appointment staff assignments with optional filtering
  async getAppointmentStaff(filters?: AppointmentStaffFilters): Promise<AppointmentStaff[]> {
    let query = supabase
      .from('appointment_staff')
      .select('*')
      .order('created_at', { ascending: true });

    // Apply filters
    if (filters?.appointment_id) {
      query = query.eq('appointment_id', filters.appointment_id);
    }

    if (filters?.staff_id) {
      query = query.eq('staff_id', filters.staff_id);
    }

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.is_primary !== undefined) {
      query = query.eq('is_primary', filters.is_primary);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch appointment staff: ${error.message}`);
    }

    return data || [];
  }

  // Get appointment staff with details (including appointment and staff info)
  async getAppointmentStaffWithDetails(filters?: AppointmentStaffFilters): Promise<AppointmentStaffWithDetails[]> {
    let query = supabase
      .from('appointment_staff')
      .select(`
        *,
        appointment:appointments(id, appointment_type, appointment_date, start_time, duration_minutes, status),
        staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .order('created_at', { ascending: true });

    // Apply filters
    if (filters?.appointment_id) {
      query = query.eq('appointment_id', filters.appointment_id);
    }

    if (filters?.staff_id) {
      query = query.eq('staff_id', filters.staff_id);
    }

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.is_primary !== undefined) {
      query = query.eq('is_primary', filters.is_primary);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch appointment staff with details: ${error.message}`);
    }

    return data || [];
  }

  // Get a single appointment staff assignment by ID
  async getAppointmentStaffById(id: string): Promise<AppointmentStaff | null> {
    const { data, error } = await supabase
      .from('appointment_staff')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Appointment staff not found
      }
      throw new Error(`Failed to fetch appointment staff: ${error.message}`);
    }

    return data;
  }

  // Create a new appointment staff assignment
  async createAppointmentStaff(appointmentStaffData: CreateAppointmentStaff): Promise<AppointmentStaff> {
    // Validate appointment staff data
    const errors = validateAppointmentStaffData(appointmentStaffData);
    console.log('Appointment staff validation errors:', errors);
    if (errors.length > 0) {
      console.error('Validation failed for appointment staff data:', appointmentStaffData);
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }

    const { data, error } = await supabase
      .from('appointment_staff')
      .insert(appointmentStaffData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create appointment staff: ${error.message}`);
    }

    // Handle calendar operations if calendar feature is enabled
    if (isFeatureEnabled('GOOGLE_CALENDAR_ENABLED')) {
      try {
        await this.handleStaffAssignmentCalendarSync(appointmentStaffData.appointment_id, 'add');
      } catch (calendarError) {
        console.error(`❌ Failed to sync calendar for staff assignment:`, calendarError);
        // Don't throw error as calendar sync failure shouldn't break staff assignment creation
      }
    }

    return data;
  }

  // Update an existing appointment staff assignment
  async updateAppointmentStaff(id: string, updates: Partial<UpdateAppointmentStaff>): Promise<AppointmentStaff> {
    const { data, error } = await supabase
      .from('appointment_staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update appointment staff: ${error.message}`);
    }

    return data;
  }

  // Delete an appointment staff assignment
  async deleteAppointmentStaff(id: string): Promise<void> {
    // Get the assignment before deletion for calendar sync
    const assignment = await this.getAppointmentStaffById(id);
    if (!assignment) {
      throw new Error('Appointment staff assignment not found');
    }

    const { error } = await supabase
      .from('appointment_staff')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete appointment staff: ${error.message}`);
    }

    // Handle calendar operations if calendar feature is enabled
    if (isFeatureEnabled('GOOGLE_CALENDAR_ENABLED')) {
      try {
        await this.handleStaffAssignmentCalendarSync(assignment.appointment_id, 'remove');
      } catch (calendarError) {
        console.error(`❌ Failed to sync calendar for staff assignment removal:`, calendarError);
        // Don't throw error as calendar sync failure shouldn't break staff assignment deletion
      }
    }
  }

  // Get staff assignments for a specific appointment
  async getStaffForAppointment(appointmentId: string): Promise<AppointmentStaffWithDetails[]> {
    const { data, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointment:appointments(id, appointment_type, appointment_date, start_time, duration_minutes, status),
        staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .eq('appointment_id', appointmentId)
      .order('is_primary', { ascending: false })
      .order('role', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch staff for appointment: ${error.message}`);
    }

    return data || [];
  }

  // Get appointments for a specific staff member
  async getAppointmentsForStaff(staffId: string): Promise<AppointmentStaffWithDetails[]> {
    // Get appointments from appointment_staff table
    const { data: appointmentStaff, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointment:appointments(id, appointment_type, appointment_date, start_time, duration_minutes, status),
        staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .eq('staff_id', staffId)
      .order('created_at', { ascending: true });

    // Also get appointments where staff is assigned as driver via driver_id
    const { data: driverAppointments, error: driverError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_type,
        appointment_date,
        start_time,
        duration_minutes,
        status,
        driver_id
      `)
      .eq('driver_id', staffId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments for staff: ${error.message}`);
    }

    if (driverError) {
      console.error('Error fetching driver appointments:', driverError);
    }

    // Transform driver appointments to match AppointmentStaffWithDetails format
    const driverAppointmentsList: AppointmentStaffWithDetails[] = (driverAppointments || []).map(appointment => ({
      id: `driver-${appointment.id}`,
      appointment_id: appointment.id,
      staff_id: staffId,
      role: 'driver',
      is_primary: false,
      google_event_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      appointment: {
        id: appointment.id,
        appointment_type: appointment.appointment_type,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        duration_minutes: appointment.duration_minutes,
        status: appointment.status
      },
      staff: {
        id: staffId,
        first_name: 'Driver',
        last_name: '',
        staff_type: 'driver',
        specialization: null,
        phone: '',
        email: ''
      }
    }));

    // Combine both lists, avoiding duplicates
    const allAppointments = [...(appointmentStaff || [])];
    for (const driverApp of driverAppointmentsList) {
      if (!allAppointments.find(app => app.appointment_id === driverApp.appointment_id)) {
        allAppointments.push(driverApp);
      }
    }

    return allAppointments;
  }

  // Update a staff assignment
  async updateStaffAssignment(
    appointmentId: string,
    staffId: string,
    updateData: Partial<Pick<AppointmentStaff, 'google_event_id' | 'role' | 'is_primary'>>
  ): Promise<AppointmentStaff> {
    const { data, error } = await supabase
      .from('appointment_staff')
      .update(updateData)
      .eq('appointment_id', appointmentId)
      .eq('staff_id', staffId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update staff assignment: ${error.message}`);
    }

    return data;
  }

  // Assign multiple staff to an appointment
  async assignStaffToAppointment(
    appointmentId: string,
    staffAssignments: StaffAssignment[],
  ): Promise<AppointmentStaff[]> {
    const createdAssignments: AppointmentStaff[] = [];

    console.log('assignStaffToAppointment called with:', {
      appointmentId,
      staffAssignments
    });

    for (const assignment of staffAssignments) {
      try {
        // Ensure role and is_primary are set correctly
        const role = assignment.role || 'assistant'; // Default to 'assistant' if no role provided
        const isPrimary = role === 'primary' || assignment.is_primary === true;

        const appointmentStaffData: CreateAppointmentStaff = {
          appointment_id: appointmentId,
          staff_id: assignment.staff_id,
          role: role,
          is_primary: isPrimary,
        };

        console.log('Creating appointment staff with data:', appointmentStaffData);

        const created = await this.createAppointmentStaff(appointmentStaffData);
        createdAssignments.push(created);
      } catch (error) {
        console.error(`Failed to assign staff ${assignment.staff_id} to appointment ${appointmentId}:`, error);
        throw error;
      }
    }

    return createdAssignments;
  }

  // Remove all staff from an appointment
  async removeAllStaffFromAppointment(appointmentId: string): Promise<void> {
    const { error } = await supabase
      .from('appointment_staff')
      .delete()
      .eq('appointment_id', appointmentId);

    if (error) {
      throw new Error(`Failed to remove all staff from appointment: ${error.message}`);
    }
  }

  // Get primary staff for an appointment
  async getPrimaryStaffForAppointment(appointmentId: string): Promise<AppointmentStaffWithDetails | null> {
    const { data, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointment:appointments(id, appointment_type, appointment_date, start_time, duration_minutes, status),
        staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .eq('appointment_id', appointmentId)
      .eq('is_primary', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No primary staff found
      }
      throw new Error(`Failed to fetch primary staff for appointment: ${error.message}`);
    }

    return data;
  }

  // Get assistants for an appointment
  async getAssistantsForAppointment(appointmentId: string): Promise<AppointmentStaffWithDetails[]> {
    const { data, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointment:appointments(id, appointment_type, appointment_date, start_time, duration_minutes, status),
        staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .eq('appointment_id', appointmentId)
      .eq('role', 'assistant');

    if (error) {
      throw new Error(`Failed to fetch assistants for appointment: ${error.message}`);
    }

    return data || [];
  }

  // Get drivers for an appointment
  async getDriversForAppointment(appointmentId: string): Promise<AppointmentStaffWithDetails[]> {
    const { data, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointment:appointments(id, appointment_type, appointment_date, start_time, duration_minutes, status),
        staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .eq('appointment_id', appointmentId)
      .eq('role', 'driver');

    if (error) {
      throw new Error(`Failed to fetch drivers for appointment: ${error.message}`);
    }

    return data || [];
  }


  // Get appointment staff summary for an appointment
  async getAppointmentStaffSummary(appointmentId: string): Promise<{
    primary?: AppointmentStaffWithDetails;
    assistants: AppointmentStaffWithDetails[];
    drivers: AppointmentStaffWithDetails[];
    backups: AppointmentStaffWithDetails[];
  }> {
    const appointmentStaff = await this.getStaffForAppointment(appointmentId);
    return getAppointmentStaffSummary(appointmentStaff);
  }

  // Check if staff is assigned to appointment
  async isStaffAssignedToAppointment(appointmentId: string, staffId: string): Promise<boolean> {
    const { error } = await supabase
      .from('appointment_staff')
      .select('id')
      .eq('appointment_id', appointmentId)
      .eq('staff_id', staffId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false; // Staff not assigned
      }
      throw new Error(`Failed to check staff assignment: ${error.message}`);
    }

    return true;
  }

  // Get staff assignments by role
  async getStaffAssignmentsByRole(appointmentId: string, role: string): Promise<AppointmentStaffWithDetails[]> {
    const { data, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointment:appointments(id, appointment_type, appointment_date, start_time, duration_minutes, status),
        staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .eq('appointment_id', appointmentId)
      .eq('role', role);

    if (error) {
      throw new Error(`Failed to fetch staff assignments by role: ${error.message}`);
    }

    return data || [];
  }

  // Get all appointments with staff assignments for a date range
  async getAppointmentsWithStaffForDateRange(
    startDate: string,
    endDate: string,
  ): Promise<AppointmentStaffWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('appointment_staff')
        .select(`
          *,
          appointment:appointments!inner(
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
            mini_notes,
            full_notes,
            pickup_instructions,
            recurring_rule,
            created_at,
            updated_at,
            patient:patients(
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
          staff:staff(
            id,
            first_name,
            last_name,
            staff_type,
            specialization,
            phone,
            email
          )
        `)
        .gte('appointment.appointment_date', startDate)
        .lte('appointment.appointment_date', endDate)
        .neq('appointment.status', 'deleted') // Exclude deleted appointments
        .order('appointment_id', { ascending: true });

      if (error) {
        console.error('Error fetching appointments with staff for date range:', error);
        throw new Error(`Failed to fetch appointments with staff for date range: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAppointmentsWithStaffForDateRange:', error);
      throw error;
    }
  }

  // =============================================================================
  // CALENDAR OPERATIONS
  // =============================================================================

  /**
   * Handle calendar sync when staff assignments change
   */
  private async handleStaffAssignmentCalendarSync(
    appointmentId: string,
    action: 'add' | 'remove' | 'update'
  ): Promise<void> {
    try {
      console.log(`📅 Handling calendar sync for appointment ${appointmentId} (${action})`);

      // Get the appointment details
      const appointment = await appointmentService.getAppointment(appointmentId);
      if (!appointment) {
        console.log(`📅 Appointment ${appointmentId} not found, skipping calendar sync`);
        return;
      }

      // Get current staff assignments
      const staffAssignments = await this.getStaffForAppointment(appointmentId);

      if (action === 'add' || action === 'update') {
        // Sync appointment to all staff calendars
        await this.syncAppointmentToStaffCalendars(appointment, staffAssignments);
      } else if (action === 'remove') {
        // For removal, we need to re-sync the appointment to remaining staff
        // and remove from the staff who was removed
        await this.syncAppointmentToStaffCalendars(appointment, staffAssignments);
      }

    } catch (error) {
      console.error(`❌ Failed to handle calendar sync for appointment ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * Sync appointment to staff calendars
   */
  private async syncAppointmentToStaffCalendars(
    appointment: any,
    staffAssignments: AppointmentStaffWithDetails[]
  ): Promise<void> {
    try {
      console.log(`📅 Syncing appointment ${appointment.id} to ${staffAssignments.length} staff calendars`);

      const googleCalendarService = getGoogleCalendarService();

      // Sync to each staff member's calendar
      for (const assignment of staffAssignments) {
        if (!assignment.staff?.google_calendar_id) {
          console.log(`📅 Staff ${assignment.staff?.first_name} ${assignment.staff?.last_name} has no calendar, skipping`);
          continue;
        }

        try {
          await this.createCalendarEventForStaff(appointment, assignment.staff, assignment.role);
        } catch (error) {
          console.error(`❌ Failed to sync appointment to calendar for staff ${assignment.staff.id}:`, error);
          // Continue with other staff members even if one fails
        }
      }

    } catch (error) {
      console.error(`❌ Failed to sync appointment to staff calendars:`, error);
      throw error;
    }
  }

  /**
   * Create calendar event for a specific staff member
   */
  private async createCalendarEventForStaff(
    appointment: any,
    staff: { id: string; first_name: string; last_name: string; google_calendar_id: string },
    role: string
  ): Promise<void> {
    try {
      console.log(`📅 Creating calendar event for staff ${staff.first_name} ${staff.last_name} (${role})`);

      // Log calendar event creation start
      await logCalendarOperation({
        staffId: staff.id,
        operationType: 'create_event',
        operationStatus: 'pending',
        googleCalendarId: staff.google_calendar_id
      });

      const googleCalendarService = getGoogleCalendarService();

      // Calculate event times
      const startDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + (appointment.duration_minutes || 60) * 60000);

      // Create event title based on role
      const eventTitle = this.buildEventTitle(appointment, role);
      const eventDescription = this.buildEventDescription(appointment, staff, role);

      // Create calendar event
      const eventResult = await googleCalendarService.createEvent({
        staff_id: staff.id,
        google_calendar_id: staff.google_calendar_id,
        event_title: eventTitle,
        event_description: eventDescription,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: appointment.patient?.address || '',
        attendees: [staff.google_calendar_id] // Add staff as attendee
      });

      if (!eventResult.success) {
        throw new Error(eventResult.errorMessage || 'Failed to create calendar event');
      }

      // Log successful event creation
      await logCalendarOperation({
        staffId: staff.id,
        operationType: 'create_event',
        operationStatus: 'success',
        googleCalendarId: staff.google_calendar_id,
        googleEventId: eventResult.eventId
      });

      console.log(`✅ Successfully created calendar event for staff ${staff.first_name} ${staff.last_name}`);

    } catch (error) {
      console.error(`❌ Failed to create calendar event for staff ${staff.id}:`, error);

      // Log event creation failure
      await logCalendarOperation({
        staffId: staff.id,
        operationType: 'create_event',
        operationStatus: 'failed',
        errorCode: 'CALENDAR_EVENT_CREATION_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        googleCalendarId: staff.google_calendar_id
      });

      throw error;
    }
  }

  /**
   * Build event title for calendar
   */
  private buildEventTitle(appointment: any, role: string): string {
    const patientName = appointment.patient?.name || 'Unknown Patient';
    const appointmentType = appointment.appointment_type || 'Appointment';

    if (role === 'primary') {
      return `${appointmentType} - ${patientName}`;
    } else {
      return `${appointmentType} - ${patientName} (${role})`;
    }
  }

  /**
   * Build event description for calendar
   */
  private buildEventDescription(
    appointment: any,
    staff: { first_name: string; last_name: string },
    role: string
  ): string {
    const parts = [];

    parts.push(`Patient: ${appointment.patient?.name || 'Unknown Patient'}`);
    parts.push(`Phone: ${appointment.patient?.phone || 'Not provided'}`);

    if (appointment.patient?.address) {
      parts.push(`Address: ${appointment.patient.address}`);
    }

    parts.push(`Staff: ${staff.first_name} ${staff.last_name} (${role})`);

    if (appointment.notes) {
      parts.push(`Notes: ${appointment.notes}`);
    }

    if (appointment.mini_notes) {
      parts.push(`Mini Notes: ${appointment.mini_notes}`);
    }

    return parts.join('\n');
  }
}

// Export singleton instance
export const appointmentStaffService = new AppointmentStaffService();
export default appointmentStaffService;
