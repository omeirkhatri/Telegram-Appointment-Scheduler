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
    const { error } = await supabase
      .from('appointment_staff')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete appointment staff: ${error.message}`);
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
    const { data, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointment:appointments(id, appointment_type, appointment_date, start_time, duration_minutes, status),
        staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
      `)
      .eq('staff_id', staffId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments for staff: ${error.message}`);
    }

    return data || [];
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
    const { data, error } = await supabase
      .from('appointment_staff')
      .select(`
        *,
        appointment:appointments!inner(id, appointment_type, appointment_date, start_time, duration_minutes, status)
      `)
      .gte('appointment.appointment_date', startDate)
      .lte('appointment.appointment_date', endDate)
      .order('appointment.appointment_date', { ascending: true })
      .order('appointment.start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments with staff for date range: ${error.message}`);
    }

    return data || [];
  }
}

// Export singleton instance
export const appointmentStaffService = new AppointmentStaffService();
export default appointmentStaffService;
