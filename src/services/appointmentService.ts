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
import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';

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
    // Try to get appointments with staff data, fallback to basic query if it fails
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name, phone, flat_villa_no, building_street, area, city, latitude, longitude, google_maps_link),
        appointment_staff(
          id,
          role,
          is_primary,
          staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
        )
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
      console.error('Error fetching appointments with staff data:', error);

      // Fallback to basic query without staff data
      console.log('Falling back to basic appointments query...');
      const fallbackQuery = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name, phone, flat_villa_no, building_street, area, city, latitude, longitude, google_maps_link)
        `)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Apply the same filters to fallback query
      if (filters?.patient_id) {
        fallbackQuery.eq('patient_id', filters.patient_id);
      }
      if (filters?.appointment_type) {
        fallbackQuery.eq('appointment_type', filters.appointment_type);
      }
      if (filters?.status) {
        fallbackQuery.eq('status', filters.status);
      }
      if (filters?.appointment_date) {
        fallbackQuery.eq('appointment_date', filters.appointment_date);
      }
      if (filters?.date_from) {
        fallbackQuery.gte('appointment_date', filters.date_from);
      }
      if (filters?.date_to) {
        fallbackQuery.lte('appointment_date', filters.date_to);
      }
      if (filters?.driver_id) {
        fallbackQuery.eq('driver_id', filters.driver_id);
      }
      if (filters?.transportation_type) {
        fallbackQuery.eq('transportation_type', filters.transportation_type);
      }
      if (filters?.has_recurring_rule !== undefined) {
        if (filters.has_recurring_rule) {
          fallbackQuery.not('recurring_rule', 'is', null);
        } else {
          fallbackQuery.is('recurring_rule', null);
        }
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) {
        throw new Error(`Failed to fetch appointments: ${fallbackError.message}`);
      }

      const regularAppointments = fallbackData || [];

      // Process appointments to add computed address field
      const processedAppointments = regularAppointments.map(appointment => ({
        ...appointment,
        patient: appointment.patient ? {
          ...appointment.patient,
          address: appointment.patient.flat_villa_no && appointment.patient.building_street && appointment.patient.area && appointment.patient.city
            ? `${appointment.patient.flat_villa_no}, ${appointment.patient.building_street}, ${appointment.patient.area}, ${appointment.patient.city}`
            : undefined
        } : undefined
      }));

      return processedAppointments;
    }

    const regularAppointments = data || [];

    // Process appointments to add computed address field and staff information
    const processedAppointments = regularAppointments.map(appointment => {
      // Process patient data
      const processedPatient = appointment.patient ? {
        ...appointment.patient,
        address: appointment.patient.flat_villa_no && appointment.patient.building_street && appointment.patient.area && appointment.patient.city
          ? `${appointment.patient.flat_villa_no}, ${appointment.patient.building_street}, ${appointment.patient.area}, ${appointment.patient.city}`
          : undefined
      } : undefined;

      // Process staff data - extract primary staff name and all staff for map display
      let primaryStaffName = 'Staff not assigned';
      let allStaffNames = 'Staff not assigned';

      if (appointment.appointment_staff && appointment.appointment_staff.length > 0) {
        const primaryStaff = appointment.appointment_staff.find(staff => staff.is_primary);
        if (primaryStaff && primaryStaff.staff) {
          primaryStaffName = `${primaryStaff.staff.first_name} ${primaryStaff.staff.last_name}`.trim();
        } else if (appointment.appointment_staff[0] && appointment.appointment_staff[0].staff) {
          // Fallback to first staff member if no primary is marked
          const firstStaff = appointment.appointment_staff[0].staff;
          primaryStaffName = `${firstStaff.first_name} ${firstStaff.last_name}`.trim();
        }

        // Create comprehensive staff list
        const staffNames = appointment.appointment_staff
          .filter(staff => staff.staff)
          .map(staff => {
            const name = `${staff.staff.first_name} ${staff.staff.last_name}`.trim();
            return staff.is_primary ? `${name} (Primary)` : name;
          });

        allStaffNames = staffNames.length > 0 ? staffNames.join(', ') : 'Staff not assigned';
      }

      return {
        ...appointment,
        patient: processedPatient,
        staff_name: primaryStaffName,
        all_staff_names: allStaffNames,
        // Keep the full staff data for detailed views
        appointment_staff: appointment.appointment_staff || []
      };
    });

    return processedAppointments;
  }

  // Get a single appointment by ID
  async getAppointment(id: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name, phone, flat_villa_no, building_street, area, city, latitude, longitude, google_maps_link),
        appointment_staff(
          id,
          role,
          is_primary,
          staff:staff(id, first_name, last_name, staff_type, specialization, phone, email)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Appointment not found
      }
      throw new Error(`Failed to fetch appointment: ${error.message}`);
    }

    // Process appointment to add computed address field
    const processedAppointment = {
      ...data,
      patient: data.patient ? {
        ...data.patient,
        address: data.patient.flat_villa_no && data.patient.building_street && data.patient.area && data.patient.city
          ? `${data.patient.flat_villa_no}, ${data.patient.building_street}, ${data.patient.area}, ${data.patient.city}`
          : undefined
      } : undefined
    };

    return processedAppointment;
  }

  // Create a new appointment
  async createAppointment(appointmentData: CreateAppointment): Promise<Appointment> {
    // Validate appointment data
    const errors = validateAppointmentData(appointmentData);
    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }

    // Log timezone context for appointment creation
    const artifacts = buildTimezoneArtifacts();
    console.log('📅 Creating appointment with timezone context:', {
      appointmentDate: appointmentData.appointment_date,
      startTime: appointmentData.start_time,
      timezone: artifacts.resolution.timezone,
      timezoneSource: artifacts.resolution.source,
      offsetMinutes: artifacts.resolution.offsetMinutes,
      timestamp: new Date().toISOString(),
    });

    // Prepare appointment data with new recurring fields
    const appointmentInsertData = {
      ...appointmentData,
      is_recurring_base: false, // Don't use database trigger, handle in application logic
      recurring_group_id: null, // Will be set by the base appointment
      recurring_occurrence_number: null // Will be set by the base appointment
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentInsertData)
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
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // If it's a recurring base appointment, delete all related occurrences first
    if (appointment.is_recurring_base) {
      const { error: deleteOccurrencesError } = await supabase
        .from('appointments')
        .delete()
        .eq('recurring_group_id', id);

      if (deleteOccurrencesError) {
        throw new Error(`Failed to delete recurring appointment occurrences: ${deleteOccurrencesError.message}`);
      }
    }

    // Delete the main appointment
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete appointment: ${error.message}`);
    }

    // Send cancellation notifications
    await this.sendAppointmentNotifications(appointment, 'cancelled');
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
    console.log('=== generateRecurringAppointments called ===');
    console.log('baseAppointmentId:', baseAppointmentId);
    console.log('occurrences:', occurrences);

    const baseAppointment = await this.getAppointment(baseAppointmentId);
    console.log('baseAppointment:', baseAppointment);

    if (!baseAppointment || !baseAppointment.recurring_rule) {
      console.log('ERROR: Base appointment not found or not recurring');
      throw new Error('Base appointment not found or not recurring');
    }

    const generatedAppointments: Appointment[] = [];

    // If occurrences is 0, we only have the base appointment, no additional ones to generate
    if (occurrences === 0) {
      console.log('No additional recurring appointments to generate (only base appointment)');
      return generatedAppointments;
    }

    for (let i = 1; i <= occurrences; i++) {
      let nextDate: Date;
      try {
        nextDate = getNextOccurrenceDate(
          new Date(baseAppointment.appointment_date),
          baseAppointment.recurring_rule!,
          i,
        );
        console.log(`Generated date for occurrence ${i}:`, nextDate.toISOString().split('T')[0]);

        // Check if we've exceeded the end date
        if (baseAppointment.recurring_rule!.end_date) {
          const endDate = new Date(baseAppointment.recurring_rule!.end_date);
          if (nextDate > endDate) {
            console.log(`Stopping at occurrence ${i} because next date ${nextDate.toISOString().split('T')[0]} exceeds end date ${endDate.toISOString().split('T')[0]}`);
            break;
          }
        }
      } catch (error) {
        console.error(`Error generating date for occurrence ${i}:`, error);
        continue;
      }

      console.log(`Generating recurring appointment ${i}:`, {
        baseDate: baseAppointment.appointment_date,
        rule: baseAppointment.recurring_rule,
        occurrence: i,
        nextDate: nextDate.toISOString().split('T')[0]
      });

      // Create a clean appointment object without patient/staff data
      const { patient, appointment_staff, ...cleanBaseAppointment } = baseAppointment;

      const newAppointment: CreateAppointment = {
        ...cleanBaseAppointment,
        appointment_date: nextDate.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
        start_time: baseAppointment.start_time.includes(':') && baseAppointment.start_time.split(':').length === 3
          ? baseAppointment.start_time.split(':').slice(0, 2).join(':') // Convert HH:MM:SS to HH:MM
          : baseAppointment.start_time, // Keep as is if already HH:MM format
        recurring_rule: undefined, // Don't make the generated appointments recurring
        // Add metadata to track this is a generated recurring appointment
        custom_fields: {
          ...baseAppointment.custom_fields,
          is_recurring_generated: true,
          base_appointment_id: baseAppointmentId,
          occurrence_number: i
        }
      };

      // Remove fields that shouldn't be in the database
      delete (newAppointment as any).id;
      delete (newAppointment as any).created_at;
      delete (newAppointment as any).updated_at;

      try {
        console.log(`Creating recurring appointment ${i}:`, {
          appointment_date: newAppointment.appointment_date,
          start_time: newAppointment.start_time,
          patient_id: newAppointment.patient_id,
          occurrence_number: i,
          total_expected: occurrences
        });
        const created = await this.createAppointment(newAppointment);
        generatedAppointments.push(created);
        console.log(`Successfully created recurring appointment ${i}:`, created.id);
      } catch (error) {
        console.error(`Failed to create recurring appointment ${i}:`, error);
        console.error('Appointment data that failed:', newAppointment);
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
      console.log('deleteRecurringAppointmentOccurrence called with:', {
        appointmentId,
        occurrenceNumber
      });

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
        console.log('Retrieved appointment from database:', {
          appointmentId,
          appointment: appointment ? {
            id: appointment.id,
            recurring_rule: appointment.recurring_rule,
            custom_fields: appointment.custom_fields
          } : null
        });

        if (!appointment) {
          throw new Error('Appointment not found');
        }

        const customFields = appointment.custom_fields as any;
        
        // Check if this is a recurring appointment in the new multi-row system
        const isRecurringAppointment = customFields?.is_recurring_generated || 
                                     customFields?.is_recurring_occurrence ||
                                     appointment.recurring_rule ||
                                     customFields?.base_appointment_id;

        if (isRecurringAppointment) {
          // This is a recurring appointment in the new system
          if (customFields?.is_recurring_generated || customFields?.is_recurring_occurrence) {
            // This is a generated occurrence, delete it directly
            console.log('Deleting generated occurrence directly');
            await this.deleteAppointment(appointmentId);
          } else if (appointment.recurring_rule) {
            // This is the base appointment - in multi-row system, we can delete it directly
            console.log('Deleting base recurring appointment directly (multi-row system)');
            await this.deleteAppointment(appointmentId);
          } else if (customFields?.base_appointment_id) {
            // This is a recurring occurrence with a base appointment ID
            console.log('Deleting recurring occurrence with base appointment ID');
            await this.deleteAppointment(appointmentId);
          } else {
            // This is a recurring appointment but we need to handle it differently
            console.log('Deleting recurring appointment (new multi-row system)');
            await this.deleteAppointment(appointmentId);
          }
        } else {
          console.error('Appointment is not recurring:', {
            appointmentId,
            hasRecurringRule: !!appointment.recurring_rule,
            isRecurringGenerated: !!customFields?.is_recurring_generated,
            isRecurringOccurrence: !!customFields?.is_recurring_occurrence,
            hasBaseAppointmentId: !!customFields?.base_appointment_id,
            customFields
          });
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
      console.log('deleteAllFutureRecurringAppointments called with:', { baseAppointmentId });

      // Get the base appointment to verify it's recurring
      const baseAppointment = await this.getAppointment(baseAppointmentId);
      if (!baseAppointment) {
        throw new Error('Base appointment not found');
      }

      console.log('Base appointment found:', {
        id: baseAppointment.id,
        recurring_rule: baseAppointment.recurring_rule,
        custom_fields: baseAppointment.custom_fields
      });

      // Check if this is a recurring appointment in the new multi-row system
      const customFields = baseAppointment.custom_fields as any;
      const isRecurringAppointment = baseAppointment.recurring_rule || 
                                   customFields?.is_recurring_generated ||
                                   customFields?.is_recurring_occurrence ||
                                   customFields?.base_appointment_id;

      if (!isRecurringAppointment) {
        throw new Error('This is not a recurring appointment');
      }

      // In the new multi-row system, we need to delete all related appointments
      if (customFields?.base_appointment_id) {
        // This is a recurring occurrence, delete all FUTURE occurrences with the same base_appointment_id
        console.log('Deleting all FUTURE occurrences with base_appointment_id:', customFields.base_appointment_id);
        await this.deleteAllFutureOccurrencesByBaseId(customFields.base_appointment_id, baseAppointment.appointment_date, baseAppointment.start_time);
      } else if (baseAppointment.recurring_rule) {
        // This is the base appointment, delete it and all future occurrences
        console.log('Deleting base appointment and all future occurrences');
        await this.deleteAppointment(baseAppointmentId);
        await this.deleteFutureRecurringOccurrences(baseAppointmentId);
      } else {
        // This is a recurring appointment in the new system, delete it directly
        console.log('Deleting recurring appointment (new multi-row system)');
        await this.deleteAppointment(baseAppointmentId);
      }
    } catch (error) {
      console.error('Error deleting all future recurring appointments:', error);
      throw error;
    }
  }

  // Delete all occurrences with the same base_appointment_id
  private async deleteAllOccurrencesByBaseId(baseAppointmentId: string): Promise<void> {
    try {
      console.log('Deleting all occurrences with base_appointment_id:', baseAppointmentId);
      
      // Try to find all appointments with this base_appointment_id
      let occurrences: any[] = [];
      
      try {
        // First try the JSON query
        const { data, error } = await supabase
          .from('appointments')
          .select('id, custom_fields, appointment_date, start_time')
          .eq('custom_fields->>base_appointment_id', baseAppointmentId);

        if (error) {
          console.warn('JSON query failed, trying alternative approach:', error.message);
          throw error;
        }
        
        occurrences = data || [];
      } catch (jsonError) {
        console.log('JSON query failed, fetching all appointments and filtering client-side');
        
        // Fallback: Get all appointments and filter client-side
        const { data: allAppointments, error: fetchError } = await supabase
          .from('appointments')
          .select('id, custom_fields, appointment_date, start_time');

        if (fetchError) {
          throw new Error(`Failed to fetch appointments: ${fetchError.message}`);
        }

        // Filter appointments that have the base_appointment_id in custom_fields
        occurrences = (allAppointments || []).filter(appointment => {
          const customFields = appointment.custom_fields as any;
          return customFields?.base_appointment_id === baseAppointmentId;
        });
      }

      console.log(`Found ${occurrences.length} occurrences to delete`);

      // Delete each occurrence
      if (occurrences.length > 0) {
        for (const occurrence of occurrences) {
          console.log('Deleting occurrence:', occurrence.id);
          await this.deleteAppointment(occurrence.id);
        }
      }

      // Also delete the base appointment if it exists
      await this.deleteAppointment(baseAppointmentId);
    } catch (error) {
      console.error('Error deleting all occurrences by base ID:', error);
      throw error;
    }
  }

  // Delete all FUTURE occurrences with the same base_appointment_id (not past ones)
  private async deleteAllFutureOccurrencesByBaseId(baseAppointmentId: string, currentDate: string, currentTime: string): Promise<void> {
    try {
      console.log('Deleting all FUTURE occurrences with base_appointment_id:', baseAppointmentId, 'from date:', currentDate, 'time:', currentTime);
      
      // Try to find all appointments with this base_appointment_id
      let occurrences: any[] = [];
      
      try {
        // First try the JSON query
        const { data, error } = await supabase
          .from('appointments')
          .select('id, custom_fields, appointment_date, start_time')
          .eq('custom_fields->>base_appointment_id', baseAppointmentId);

        if (error) {
          console.warn('JSON query failed, trying alternative approach:', error.message);
          throw error;
        }
        
        occurrences = data || [];
      } catch (jsonError) {
        console.log('JSON query failed, fetching all appointments and filtering client-side');
        
        // Fallback: Get all appointments and filter client-side
        const { data: allAppointments, error: fetchError } = await supabase
          .from('appointments')
          .select('id, custom_fields, appointment_date, start_time');

        if (fetchError) {
          throw new Error(`Failed to fetch appointments: ${fetchError.message}`);
        }

        // Filter appointments that have the base_appointment_id in custom_fields
        occurrences = (allAppointments || []).filter(appointment => {
          const customFields = appointment.custom_fields as any;
          return customFields?.base_appointment_id === baseAppointmentId;
        });
      }

      // Filter to only include FUTURE occurrences (same date with later time, or later dates)
      // Also exclude the base appointment itself from deletion
      const futureOccurrences = occurrences.filter(occurrence => {
        // Don't delete the base appointment itself
        if (occurrence.id === baseAppointmentId) {
          return false;
        }
        
        const occurrenceDate = occurrence.appointment_date;
        const occurrenceTime = occurrence.start_time;
        
        // If the date is later, it's definitely future
        if (occurrenceDate > currentDate) {
          return true;
        }
        
        // If the date is the same, check the time
        if (occurrenceDate === currentDate) {
          return occurrenceTime >= currentTime;
        }
        
        // If the date is earlier, it's past
        return false;
      });

      console.log(`Found ${occurrences.length} total occurrences, ${futureOccurrences.length} future occurrences to delete`);
      console.log('Base appointment ID:', baseAppointmentId);
      console.log('All occurrences:', occurrences.map(occ => ({ id: occ.id, date: occ.appointment_date, time: occ.start_time })));
      console.log('Future occurrences to delete:', futureOccurrences.map(occ => ({ id: occ.id, date: occ.appointment_date, time: occ.start_time })));

      // Delete each future occurrence
      if (futureOccurrences.length > 0) {
        for (const occurrence of futureOccurrences) {
          console.log('Deleting future occurrence:', occurrence.id, 'date:', occurrence.appointment_date, 'time:', occurrence.start_time);
          await this.deleteAppointment(occurrence.id);
        }
      }

      // Don't delete the base appointment when deleting future occurrences
      // The base appointment should remain as it represents the original recurring rule
      console.log('Keeping base appointment intact (not deleting it)');
    } catch (error) {
      console.error('Error deleting all future occurrences by base ID:', error);
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
