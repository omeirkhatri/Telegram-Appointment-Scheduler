import { supabase } from '@/lib/supabase';
import type {
  Appointment,
  CreateAppointment,
  UpdateAppointment,
  AppointmentFilters,
} from '@/types';
import {
  isValidAppointmentDate,
  isValidAppointmentTime,
  isValidDuration,
  isValidRecurringRule,
  validateAppointmentData,
  getNextOccurrenceDate,
} from '@/types/appointment';

export class AppointmentService {
  // Get all appointments with optional filtering
  async getAppointments(filters?: AppointmentFilters): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Apply filters
    if (filters?.patient_id) {
      query = query.eq('patient_id', filters.patient_id);
    }

    if (filters?.appointment_type) {
      query = query.eq('appointment_type', filters.appointment_type);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.appointment_date) {
      query = query.eq('appointment_date', filters.appointment_date);
    }

    if (filters?.date_from) {
      query = query.gte('appointment_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('appointment_date', filters.date_to);
    }

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.transportation_type) {
      query = query.eq('transportation_type', filters.transportation_type);
    }

    if (filters?.has_recurring_rule !== undefined) {
      if (filters.has_recurring_rule) {
        query = query.not('recurring_rule', 'is', null);
      } else {
        query = query.is('recurring_rule', null);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch appointments: ${error.message}`);
    }

    return data || [];
  }

  // Get a single appointment by ID
  async getAppointment(id: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Appointment not found
      }
      throw new Error(`Failed to fetch appointment: ${error.message}`);
    }

    return data;
  }

  // Create a new appointment
  async createAppointment(appointmentData: CreateAppointment): Promise<Appointment> {
    // Validate appointment data
    const errors = validateAppointmentData(appointmentData);
    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create appointment: ${error.message}`);
    }

    return data;
  }

  // Update an existing appointment
  async updateAppointment(id: string, updates: Partial<UpdateAppointment>): Promise<Appointment> {
    // Validate updates if they include appointment data
    if (updates.appointment_date && !isValidAppointmentDate(updates.appointment_date)) {
      throw new Error('Appointment date must be today or in the future');
    }

    if (updates.start_time && !isValidAppointmentTime(updates.start_time)) {
      throw new Error('Invalid start time format (HH:MM)');
    }

    if (updates.duration_minutes && !isValidDuration(updates.duration_minutes)) {
      throw new Error('Duration must be between 1 and 1440 minutes');
    }

    if (updates.recurring_rule && !isValidRecurringRule(updates.recurring_rule)) {
      throw new Error('Invalid recurring rule');
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update appointment: ${error.message}`);
    }

    return data;
  }

  // Delete an appointment
  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete appointment: ${error.message}`);
    }
  }

  // Get appointments by patient
  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments by patient: ${error.message}`);
    }

    return data || [];
  }

  // Get appointments by date range
  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments by date range: ${error.message}`);
    }

    return data || [];
  }

  // Get appointments by type
  async getAppointmentsByType(appointmentType: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_type', appointmentType)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments by type: ${error.message}`);
    }

    return data || [];
  }

  // Get appointments by status
  async getAppointmentsByStatus(status: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', status)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments by status: ${error.message}`);
    }

    return data || [];
  }

  // Get recurring appointments
  async getRecurringAppointments(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .not('recurring_rule', 'is', null)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch recurring appointments: ${error.message}`);
    }

    return data || [];
  }

  // Get appointments for a specific date
  async getAppointmentsForDate(date: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', date)
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments for date: ${error.message}`);
    }

    return data || [];
  }

  // Get appointments by driver
  async getAppointmentsByDriver(driverId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('driver_id', driverId)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments by driver: ${error.message}`);
    }

    return data || [];
  }

  // Search appointments by custom fields
  async searchAppointmentsByCustomFields(searchTerm: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .textSearch('custom_fields', searchTerm)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to search appointments by custom fields: ${error.message}`);
    }

    return data || [];
  }

  // Update appointment status
  async updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update appointment status: ${error.message}`);
    }

    return data;
  }

  // Add Google Calendar event ID
  async addGoogleCalendarEventId(
    appointmentId: string,
    staffId: string,
    eventId: string,
  ): Promise<Appointment> {
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const updatedEventIds = {
      ...appointment.google_event_ids,
      [staffId]: eventId,
    };

    const { data, error } = await supabase
      .from('appointments')
      .update({ google_event_ids: updatedEventIds })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add Google Calendar event ID: ${error.message}`);
    }

    return data;
  }

  // Remove Google Calendar event ID
  async removeGoogleCalendarEventId(appointmentId: string, staffId: string): Promise<Appointment> {
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const updatedEventIds = { ...appointment.google_event_ids };
    delete updatedEventIds[staffId];

    const { data, error } = await supabase
      .from('appointments')
      .update({ google_event_ids: updatedEventIds })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to remove Google Calendar event ID: ${error.message}`);
    }

    return data;
  }

  // Generate recurring appointments
  async generateRecurringAppointments(
    baseAppointmentId: string,
    occurrences: number,
  ): Promise<Appointment[]> {
    const baseAppointment = await this.getAppointment(baseAppointmentId);
    if (!baseAppointment || !baseAppointment.recurring_rule) {
      throw new Error('Base appointment not found or not recurring');
    }

    const generatedAppointments: Appointment[] = [];

    for (let i = 1; i <= occurrences; i++) {
      const nextDate = getNextOccurrenceDate(
        baseAppointment.appointment_date,
        baseAppointment.recurring_rule,
        i,
      );

      const newAppointment: CreateAppointment = {
        ...baseAppointment,
        appointment_date: nextDate,
        recurring_rule: undefined, // Don't make the generated appointments recurring
      };

      delete (newAppointment as any).id;
      delete (newAppointment as any).created_at;
      delete (newAppointment as any).updated_at;

      try {
        const created = await this.createAppointment(newAppointment);
        generatedAppointments.push(created);
      } catch (error) {
        console.error(`Failed to create recurring appointment ${i}:`, error);
      }
    }

    return generatedAppointments;
  }

  // Get appointment statistics
  async getAppointmentStatistics(dateFrom?: string, dateTo?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    let query = supabase.from('appointments').select('*');

    if (dateFrom) {
      query = query.gte('appointment_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('appointment_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch appointment statistics: ${error.message}`);
    }

    const appointments = data || [];
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    appointments.forEach(appointment => {
      byStatus[appointment.status] = (byStatus[appointment.status] || 0) + 1;
      byType[appointment.appointment_type] = (byType[appointment.appointment_type] || 0) + 1;
    });

    return {
      total: appointments.length,
      byStatus,
      byType,
    };
  }
}

// Export singleton instance
export const appointmentService = new AppointmentService();
export default appointmentService;
