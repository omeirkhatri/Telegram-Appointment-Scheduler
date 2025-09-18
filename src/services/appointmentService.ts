import {
    getNextOccurrenceDate,
} from '@/lib/recurrenceUtils';
import { supabase } from '@/lib/supabase';
// No longer using custom UUID utilities - using standard UUIDs
import type {
    Appointment,
    AppointmentFilters,
    CreateAppointment,
    UpdateAppointment
} from '@/types';
import {
    isValidAppointmentDate,
    isValidAppointmentTime,
    isValidDuration,
    isValidRecurringRule,
    validateAppointmentData,
} from '@/types/appointment';
import { appointmentStaffService } from './appointmentStaffService';
import { telegramNotificationService } from './telegramNotificationService';

export class AppointmentService {
  // Helper method to send notifications for appointment changes
  private async sendAppointmentNotifications(
    appointment: Appointment,
    notificationType: 'created' | 'updated' | 'cancelled',
    changedFields?: string[]
  ): Promise<void> {
    try {
      // Check if Telegram is configured
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        console.log('📱 Telegram not configured, skipping notifications');
        return;
      }

      // Get staff assignments for this appointment
      const staffAssignments = await appointmentStaffService.getStaffForAppointment(appointment.id);

      if (!staffAssignments || staffAssignments.length === 0) {
        console.log(`📱 No staff assignments found for appointment ${appointment.id}, skipping notifications`);
        return;
      }

      console.log(`📱 Sending ${notificationType} notifications for appointment ${appointment.id} to ${staffAssignments.length} staff members`);

      // Send notifications to all assigned staff members
      const result = await telegramNotificationService.sendAppointmentNotificationsToStaff(
        appointment,
        staffAssignments,
        notificationType
      );

      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        console.log(`📱 ${notificationType} notifications completed: ${successCount}/${result.results.length} successful`);
      } else {
        console.error(`❌ Failed to send ${notificationType} notifications:`, result.results);
      }
    } catch (error) {
      console.error(`❌ Error sending ${notificationType} notifications for appointment ${appointment.id}:`, error);
      // Don't throw error to prevent breaking the main operation
    }
  }

  // Get all appointments with optional filtering
  async getAppointments(filters?: AppointmentFilters): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name, phone, flat_villa_no, building_street, area, city)
      `)
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

    const regularAppointments = data || [];

    // If we have date filters, also get recurring appointments for that range
    if (filters?.date_from && filters?.date_to) {
      try {
        const recurringAppointments = await this.getRecurringAppointmentsForDateRange(
          filters.date_from,
          filters.date_to
        );

        // Combine regular and recurring appointments
        const allAppointments = [...regularAppointments, ...recurringAppointments];

        // Remove duplicates (in case a recurring appointment was also stored as a regular appointment)
        const uniqueAppointments = allAppointments.filter((appointment, index, self) =>
          index === self.findIndex(a => a.id === appointment.id)
        );

        return uniqueAppointments.sort((a, b) => {
          if (a.appointment_date !== b.appointment_date) {
            return a.appointment_date.localeCompare(b.appointment_date);
          }
          return a.start_time.localeCompare(b.start_time);
        });
      } catch (error) {
        console.error('Error fetching recurring appointments:', error);
        // Return regular appointments if recurring fetch fails
        return regularAppointments;
      }
    }

    return regularAppointments;
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

    // Send same-day appointment notifications if applicable
    await this.sendAppointmentNotifications(data, 'created');

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

    // Note: Reschedule notifications are handled by the API route to avoid duplicates

    return data;
  }

  // Delete an appointment
  async deleteAppointment(id: string): Promise<void> {
    // Get appointment data before deletion for notifications
    const appointment = await this.getAppointment(id);

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete appointment: ${error.message}`);
    }

    // Send cancellation notifications
    if (appointment) {
      await this.sendAppointmentNotifications(appointment, 'cancelled');
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
        new Date(baseAppointment.appointment_date),
        baseAppointment.recurring_rule!,
        i,
      );

      console.log(`Generating recurring appointment ${i}:`, {
        baseDate: baseAppointment.appointment_date,
        rule: baseAppointment.recurring_rule,
        occurrence: i,
        nextDate: nextDate.toISOString().split('T')[0]
      });

      const newAppointment: CreateAppointment = {
        ...baseAppointment,
        appointment_date: nextDate.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        recurring_rule: undefined, // Don't make the generated appointments recurring
        // Add metadata to track this is a generated recurring appointment
        custom_fields: {
          ...baseAppointment.custom_fields,
          is_recurring_generated: true,
          base_appointment_id: baseAppointmentId,
          occurrence_number: i
        }
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

  // Get recurring appointments for a date range (including generated ones)
  async getRecurringAppointmentsForDateRange(
    dateFrom: string,
    dateTo: string,
    baseAppointmentId?: string
  ): Promise<Appointment[]> {
    try {
      // First, get all base recurring appointments
      const baseQuery = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name, phone, flat_villa_no, building_street, area, city)
        `)
        .not('recurring_rule', 'is', null)
        .order('appointment_date', { ascending: true });

      if (baseAppointmentId) {
        baseQuery.eq('id', baseAppointmentId);
      }

      const { data: baseAppointments, error: baseError } = await baseQuery;

      if (baseError) {
        console.error('Error fetching base recurring appointments:', baseError);
        return []; // Return empty array instead of throwing error
      }

      if (!baseAppointments || baseAppointments.length === 0) {
        return [];
      }

      const allAppointments: Appointment[] = [];

      for (const baseAppointment of baseAppointments) {
        try {
          // Validate that the base appointment has a valid recurring rule
          if (!baseAppointment.recurring_rule) {
            console.warn(`Base appointment ${baseAppointment.id} has no recurring rule, skipping`);
            continue;
          }

          // Add the base appointment if it's in the date range
          if (baseAppointment.appointment_date >= dateFrom && baseAppointment.appointment_date <= dateTo) {
            allAppointments.push(baseAppointment);
          }

          // Generate occurrences for this base appointment
          const occurrences = this.calculateOccurrencesForDateRange(
            baseAppointment.appointment_date,
            baseAppointment.recurring_rule,
            dateFrom,
            dateTo
          );

          // Get cancelled occurrences from custom_fields
          const customFields = baseAppointment.custom_fields as any || {};
          const cancelledOccurrences = customFields.cancelled_occurrences || [];

          for (let i = 1; i <= occurrences; i++) {
            try {
              // Skip cancelled occurrences
              if (cancelledOccurrences.includes(i)) {
                continue;
              }

              const nextDate = getNextOccurrenceDate(
                new Date(baseAppointment.appointment_date),
                baseAppointment.recurring_rule!,
                i,
              );

              const occurrenceDate = nextDate.toISOString().split('T')[0];

              if (occurrenceDate >= dateFrom && occurrenceDate <= dateTo) {
                // Create a virtual appointment for this occurrence
                const virtualAppointment: Appointment = {
                  ...baseAppointment,
                  id: `${baseAppointment.id}_occurrence_${i}`,
                  appointment_date: occurrenceDate,
                  recurring_rule: undefined,
                  custom_fields: {
                    ...baseAppointment.custom_fields,
                    is_recurring_generated: true,
                    base_appointment_id: baseAppointment.id,
                    occurrence_number: i
                  }
                };

                allAppointments.push(virtualAppointment);
              }
            } catch (occurrenceError) {
              console.error(`Error generating occurrence ${i} for appointment ${baseAppointment.id}:`, occurrenceError);
              // Continue with other occurrences
            }
          }
        } catch (appointmentError) {
          console.error(`Error processing base appointment ${baseAppointment.id}:`, appointmentError);
          // Continue with other appointments
        }
      }

      return allAppointments.sort((a, b) => {
        if (a.appointment_date !== b.appointment_date) {
          return a.appointment_date.localeCompare(b.appointment_date);
        }
        return a.start_time.localeCompare(b.start_time);
      });
    } catch (error) {
      console.error('Error in getRecurringAppointmentsForDateRange:', error);
      return []; // Return empty array instead of throwing error
    }
  }

  // Calculate how many occurrences are needed for a date range
  private calculateOccurrencesForDateRange(
    baseDate: string,
    rule: any,
    dateFrom: string,
    dateTo: string
  ): number {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const base = new Date(baseDate);

    // Calculate maximum occurrences needed
    let maxOccurrences = 0;

    switch (rule.frequency) {
      case 'daily':
        maxOccurrences = Math.ceil((endDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24 * rule.interval));
        break;
      case 'weekly':
        maxOccurrences = Math.ceil((endDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24 * 7 * rule.interval));
        break;
      case 'monthly':
        maxOccurrences = Math.ceil((endDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24 * 30 * rule.interval));
        break;
      case 'yearly':
        maxOccurrences = Math.ceil((endDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24 * 365 * rule.interval));
        break;
    }

    // Respect end conditions
    if (rule.end_occurrences) {
      maxOccurrences = Math.min(maxOccurrences, rule.end_occurrences);
    }

    if (rule.end_date) {
      const ruleEndDate = new Date(rule.end_date);
      const ruleEndOccurrences = Math.ceil((ruleEndDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
      maxOccurrences = Math.min(maxOccurrences, ruleEndOccurrences);
    }

    return Math.max(0, maxOccurrences);
  }

  // Update a recurring appointment (this occurrence only)
  async updateRecurringAppointmentOccurrence(
    baseAppointmentId: string,
    occurrenceNumber: number,
    updateData: Partial<CreateAppointment>
  ): Promise<Appointment> {
    try {
      const baseAppointment = await this.getAppointment(baseAppointmentId);
      if (!baseAppointment) {
        throw new Error('Base appointment not found');
      }

      if (!baseAppointment.recurring_rule) {
        throw new Error('Appointment is not a recurring appointment');
      }

      // Calculate the date for this occurrence
      const occurrenceDate = getNextOccurrenceDate(
        new Date(baseAppointment.appointment_date),
        baseAppointment.recurring_rule!,
        occurrenceNumber
      );

      // Create a new appointment for this specific occurrence
      const occurrenceAppointment: CreateAppointment = {
        ...baseAppointment,
        ...updateData,
        appointment_date: occurrenceDate.toISOString().split('T')[0],
        recurring_rule: undefined, // This is a one-time occurrence
        custom_fields: {
          ...baseAppointment.custom_fields,
          ...updateData.custom_fields,
          is_recurring_occurrence: true,
          base_appointment_id: baseAppointmentId,
          occurrence_number: occurrenceNumber,
          original_recurring_rule: baseAppointment.recurring_rule
        }
      };

      delete (occurrenceAppointment as any).id;
      delete (occurrenceAppointment as any).created_at;
      delete (occurrenceAppointment as any).updated_at;

      const createdAppointment = await this.createAppointment(occurrenceAppointment);

      // Send reschedule notifications for recurring appointment occurrence update
      await this.sendAppointmentNotifications(createdAppointment, 'updated');

      return createdAppointment;
    } catch (error) {
      console.error('Error updating recurring appointment occurrence:', error);
      throw error;
    }
  }

  // Update a recurring appointment (all future occurrences)
  async updateRecurringAppointmentFuture(
    baseAppointmentId: string,
    updateData: Partial<CreateAppointment>
  ): Promise<Appointment> {
    try {
      const baseAppointment = await this.getAppointment(baseAppointmentId);
      if (!baseAppointment) {
        throw new Error('Base appointment not found');
      }

      if (!baseAppointment.recurring_rule) {
        throw new Error('Appointment is not a recurring appointment');
      }

      // Update the base recurring appointment
      const updatedAppointment = await this.updateAppointment(baseAppointmentId, updateData);

      // Delete all future generated occurrences that were created from this base appointment
      await this.deleteFutureRecurringOccurrences(baseAppointmentId);

      return updatedAppointment;
    } catch (error) {
      console.error('Error updating recurring appointment future:', error);
      throw error;
    }
  }

  // Delete future recurring occurrences for a base appointment
  private async deleteFutureRecurringOccurrences(baseAppointmentId: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('custom_fields->base_appointment_id', baseAppointmentId)
      .eq('custom_fields->is_recurring_generated', true);

    if (error) {
      console.error('Error deleting future recurring occurrences:', error);
    }
  }

  // Delete a single recurring appointment occurrence
  async deleteRecurringAppointmentOccurrence(
    appointmentId: string,
    occurrenceNumber: number
  ): Promise<void> {
    try {
      // Check if this is a virtual appointment ID (contains _occurrence_)
      if (appointmentId.includes('_occurrence_')) {
        // Extract the base appointment ID from the virtual ID
        const baseAppointmentId = appointmentId.split('_occurrence_')[0];

        // Get the base appointment to verify it's recurring
        const baseAppointment = await this.getAppointment(baseAppointmentId);
        if (!baseAppointment) {
          throw new Error('Base recurring appointment not found');
        }

        if (!baseAppointment.recurring_rule) {
          throw new Error('This is not a recurring appointment');
        }

        // For virtual appointments, cancel the specific occurrence
        await this.cancelRecurringOccurrence(baseAppointmentId, occurrenceNumber);
      } else {
        // This is a real appointment ID, check if it's a generated occurrence
        const appointment = await this.getAppointment(appointmentId);
        if (!appointment) {
          throw new Error('Appointment not found');
        }

        const customFields = appointment.custom_fields as any;
        if (customFields?.is_recurring_generated) {
          // This is a generated occurrence, delete it directly
          await this.deleteAppointment(appointmentId);
        } else if (appointment.recurring_rule) {
          // This is the base appointment, cancel the specific occurrence
          await this.cancelRecurringOccurrence(appointmentId, occurrenceNumber);
        } else {
          throw new Error('This is not a recurring appointment');
        }
      }
    } catch (error) {
      console.error('Error deleting recurring appointment occurrence:', error);
      throw error;
    }
  }

  // Cancel a specific occurrence of a recurring appointment
  private async cancelRecurringOccurrence(
    baseAppointmentId: string,
    occurrenceNumber: number
  ): Promise<void> {
    try {
      // Get the base appointment
      const baseAppointment = await this.getAppointment(baseAppointmentId);
      if (!baseAppointment) {
        throw new Error('Base recurring appointment not found');
      }

      // Get current cancelled occurrences from custom_fields
      const customFields = baseAppointment.custom_fields as any || {};
      const cancelledOccurrences = customFields.cancelled_occurrences || [];

      // Add this occurrence to the cancelled list if not already there
      if (!cancelledOccurrences.includes(occurrenceNumber)) {
        cancelledOccurrences.push(occurrenceNumber);
      }

      // Update the base appointment with the new cancelled occurrences list
      const { error } = await supabase
        .from('appointments')
        .update({
          custom_fields: {
            ...customFields,
            cancelled_occurrences: cancelledOccurrences
          }
        })
        .eq('id', baseAppointmentId);

      if (error) {
        throw new Error(`Failed to cancel recurring occurrence: ${error.message}`);
      }
    } catch (error) {
      console.error('Error cancelling recurring occurrence:', error);
      throw error;
    }
  }

  // Delete all future recurring appointments for a base appointment
  async deleteAllFutureRecurringAppointments(baseAppointmentId: string): Promise<void> {
    try {
      // Get the base appointment to verify it's recurring
      const baseAppointment = await this.getAppointment(baseAppointmentId);
      if (!baseAppointment) {
        throw new Error('Base appointment not found');
      }

      if (!baseAppointment.recurring_rule) {
        throw new Error('This is not a recurring appointment');
      }

      // Delete the base appointment
      await this.deleteAppointment(baseAppointmentId);

      // Delete all future generated occurrences
      await this.deleteFutureRecurringOccurrences(baseAppointmentId);
    } catch (error) {
      console.error('Error deleting all future recurring appointments:', error);
      throw error;
    }
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
