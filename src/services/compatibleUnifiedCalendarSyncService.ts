/**
 * Compatible Unified Calendar Sync Service
 *
 * This version works with the existing database schema while providing
 * the unified sync functionality. It uses the existing google_event_id field
 * and adds basic status tracking using timestamps.
 */

import { createClient } from '@supabase/supabase-js';
import { getGoogleCalendarService } from './googleCalendarService';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
  retryable?: boolean;
}

export interface SyncHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  pendingSyncs: number;
  failedSyncs: number;
  lastSyncAt?: string;
  errors: string[];
}

export interface SyncStatistics {
  totalAssignments: number;
  pendingSyncs: number;
  syncedCount: number;
  withEvents: number;
  withoutEvents: number;
}

export class CompatibleUnifiedCalendarSyncService {
  private googleCalendarService = getGoogleCalendarService();
  private isProcessing = false;

  /**
   * Sync a newly created appointment to Google Calendar
   */
  async syncAppointmentCreate(appointmentId: string): Promise<void> {
    console.log(`📅 [UNIFIED] Syncing new appointment: ${appointmentId}`);

    try {
      // Get appointment with staff assignments that don't have calendar events
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id(id, name, phone, flat_villa_no, building_street, area, city, google_maps_link),
          appointment_staff!inner(
            id,
            staff_id,
            role,
            google_event_id,
            staff:staff_id(
              id,
              first_name,
              last_name,
              google_calendar_id,
              email
            )
          )
        `)
        .eq('id', appointmentId)
        .is('appointment_staff.google_event_id', null)
        .single();

      // Also check for driver_id assignments if no staff assignments found
      if (appointmentError && appointment?.driver_id) {
        const { data: driverData, error: driverError } = await supabase
          .from('staff')
          .select('id, first_name, last_name, google_calendar_id, email')
          .eq('id', appointment.driver_id)
          .single();

        if (!driverError && driverData?.google_calendar_id) {
          const driverAppointment = {
            ...appointment,
            appointment_staff: [{
              id: `driver-${appointment.driver_id}`,
              staff_id: appointment.driver_id,
              role: 'driver',
              google_event_id: null,
              staff: driverData
            }]
          };

          // Sync to driver's calendar
          for (const assignment of driverAppointment.appointment_staff) {
            await this.createCalendarEventForStaff(assignment.id, driverAppointment, assignment.staff, assignment.role);
          }
          return;
        }
      }

      if (appointmentError) {
        console.log(`📅 [UNIFIED] Appointment ${appointmentId} not found or already synced`);
        return;
      }

      if (!appointment || !appointment.appointment_staff || appointment.appointment_staff.length === 0) {
        console.log(`📅 [UNIFIED] No pending staff assignments for appointment ${appointmentId}`);
        return;
      }

      // Sync to each staff member's calendar
      for (const assignment of appointment.appointment_staff) {
        if (!assignment.staff?.google_calendar_id) {
          console.log(`📅 [UNIFIED] Staff ${assignment.staff?.first_name} ${assignment.staff?.last_name} has no calendar, skipping`);
          continue;
        }

        await this.createCalendarEventForStaff(assignment.id, appointment, assignment.staff, assignment.role);
      }

    } catch (error) {
      console.error(`❌ [UNIFIED] Failed to sync appointment create ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * Sync appointment updates to Google Calendar
   */
  async syncAppointmentUpdate(appointmentId: string): Promise<void> {
    console.log(`📅 [UNIFIED] Syncing updated appointment: ${appointmentId}`);

    try {
      // Get appointment with staff assignments that have calendar events
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id(id, name, phone, flat_villa_no, building_street, area, city, google_maps_link),
          appointment_staff!inner(
            id,
            staff_id,
            role,
            google_event_id,
            staff:staff_id(
              id,
              first_name,
              last_name,
              google_calendar_id,
              email
            )
          )
        `)
        .eq('id', appointmentId)
        .not('appointment_staff.google_event_id', 'is', null)
        .single();

      if (appointmentError) {
        console.log(`📅 [UNIFIED] Appointment ${appointmentId} not found or no calendar events to update`);
        return;
      }

      if (!appointment || !appointment.appointment_staff || appointment.appointment_staff.length === 0) {
        console.log(`📅 [UNIFIED] No calendar events found for appointment ${appointmentId}`);
        return;
      }

      // Update each staff member's calendar event
      for (const assignment of appointment.appointment_staff) {
        if (!assignment.staff?.google_calendar_id || !assignment.google_event_id) {
          continue;
        }

        await this.updateCalendarEventForStaff(assignment.id, appointment, assignment.staff, assignment.role, assignment.google_event_id);
      }

    } catch (error) {
      console.error(`❌ [UNIFIED] Failed to sync appointment update ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * Sync appointment deletion to Google Calendar
   */
  async syncAppointmentDelete(appointmentId: string): Promise<void> {
    console.log(`📅 [UNIFIED] Syncing appointment deletion: ${appointmentId}`);

    try {
      // Get staff assignments with calendar events for this appointment
      const { data: assignments, error: assignmentsError } = await supabase
        .from('appointment_staff')
        .select(`
          id,
          google_event_id,
          staff:staff_id(
            id,
            first_name,
            last_name,
            google_calendar_id
          )
        `)
        .eq('appointment_id', appointmentId)
        .not('google_event_id', 'is', null);

      if (assignmentsError) {
        throw new Error(`Failed to fetch staff assignments: ${assignmentsError.message}`);
      }

      if (!assignments || assignments.length === 0) {
        console.log(`📅 [UNIFIED] No calendar events found for appointment ${appointmentId}`);
        return;
      }

      // Delete each calendar event
      for (const assignment of assignments) {
        if (!assignment.staff?.google_calendar_id || !assignment.google_event_id) {
          continue;
        }

        await this.deleteCalendarEventForStaff(assignment.id, assignment.staff, assignment.google_event_id);
      }

    } catch (error) {
      console.error(`❌ [UNIFIED] Failed to sync appointment delete ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * Process pending syncs (used by daemon)
   */
  async processPendingSyncs(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ [UNIFIED] Sync already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('🔄 [UNIFIED] Processing pending calendar syncs...');

      // Find appointments with staff assignments that don't have calendar events
      const { data: pendingSyncs, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          appointment_type,
          status,
          driver_id,
          appointment_staff!inner(
            id,
            staff_id,
            role,
            google_event_id,
            staff:staff_id(
              id,
              first_name,
              last_name,
              google_calendar_id
            )
          )
        `)
        .eq('status', 'scheduled')
        .is('appointment_staff.google_event_id', null)
        .not('appointment_staff.staff.google_calendar_id', 'is', null)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(50);

      // Also find appointments with driver_id assignments that need sync
      const { data: driverSyncs, error: driverError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          appointment_type,
          status,
          driver_id,
          patient:patient_id(id, name, phone, flat_villa_no, building_street, area, city, google_maps_link)
        `)
        .eq('status', 'scheduled')
        .not('driver_id', 'is', null)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(50);

      // Process driver appointments
      if (!driverError && driverSyncs && driverSyncs.length > 0) {
        for (const appointment of driverSyncs) {
          const { data: driverData } = await supabase
            .from('staff')
            .select('id, first_name, last_name, google_calendar_id, email')
            .eq('id', appointment.driver_id)
            .single();

          if (driverData?.google_calendar_id) {
            const driverAppointment = {
              ...appointment,
              appointment_staff: [{
                id: `driver-${appointment.driver_id}`,
                staff_id: appointment.driver_id,
                role: 'driver',
                google_event_id: null,
                staff: driverData
              }]
            };

            try {
              for (const assignment of driverAppointment.appointment_staff) {
                await this.createCalendarEventForStaff(assignment.id, driverAppointment, assignment.staff, assignment.role);
              }
              processedCount++;
            } catch (error) {
              console.error(`❌ [UNIFIED] Failed to sync driver appointment ${appointment.id}:`, error);
              errorCount++;
            }
          }
        }
      }

      if (error) {
        throw new Error(`Failed to get pending syncs: ${error.message}`);
      }

      if (!pendingSyncs || pendingSyncs.length === 0) {
        console.log('✅ [UNIFIED] No pending syncs found');
        return;
      }

      console.log(`📅 [UNIFIED] Found ${pendingSyncs.length} appointments with pending syncs`);

      let processedCount = 0;
      let errorCount = 0;

      for (const appointment of pendingSyncs) {
        try {
          await this.syncAppointmentCreate(appointment.id);
          processedCount++;
        } catch (error) {
          console.error(`❌ [UNIFIED] Failed to process sync for appointment ${appointment.id}:`, error);
          errorCount++;
        }
      }

      console.log(`📊 [UNIFIED] Processed ${processedCount} syncs, ${errorCount} errors`);

    } catch (error) {
      console.error('❌ [UNIFIED] Failed to process pending syncs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clean up orphaned calendar events
   */
  async cleanupOrphanedEvents(): Promise<void> {
    console.log('🧹 [UNIFIED] Cleaning up orphaned calendar events...');

    try {
      // Find appointment_staff records with calendar events but no corresponding appointment
      const { data: orphanedEvents, error } = await supabase
        .from('appointment_staff')
        .select(`
          id,
          appointment_id,
          google_event_id,
          staff:staff_id(
            id,
            first_name,
            last_name,
            google_calendar_id
          ),
          appointments:appointment_id(id, status)
        `)
        .not('google_event_id', 'is', null)
        .not('staff.google_calendar_id', 'is', null);

      if (error) {
        throw new Error(`Failed to get potential orphaned events: ${error.message}`);
      }

      if (!orphanedEvents || orphanedEvents.length === 0) {
        console.log('✅ [UNIFIED] No orphaned events found');
        return;
      }

      // Filter for truly orphaned events (no appointment or deleted appointment)
      const trulyOrphaned = orphanedEvents.filter(event =>
        !event.appointments || event.appointments.status === 'deleted'
      );

      if (trulyOrphaned.length === 0) {
        console.log('✅ [UNIFIED] No truly orphaned events found');
        return;
      }

      console.log(`🗑️ [UNIFIED] Found ${trulyOrphaned.length} orphaned events`);

      let cleanedCount = 0;
      let errorCount = 0;

      for (const event of trulyOrphaned) {
        try {
          // Delete the calendar event
          const result = await this.googleCalendarService.deleteEvent(
            event.staff.google_calendar_id,
            event.google_event_id
          );

          if (result.success) {
            // Clear the event ID
            await supabase
              .from('appointment_staff')
              .update({ google_event_id: null })
              .eq('id', event.id);

            console.log(`✅ [UNIFIED] Cleaned up orphaned event for ${event.staff.first_name} ${event.staff.last_name}`);
            cleanedCount++;
          } else {
            console.error(`❌ [UNIFIED] Failed to delete orphaned event: ${result.errorMessage}`);
            errorCount++;
          }

        } catch (error) {
          console.error(`❌ [UNIFIED] Error cleaning orphaned event:`, error);
          errorCount++;
        }
      }

      console.log(`📊 [UNIFIED] Cleaned ${cleanedCount} orphaned events, ${errorCount} errors`);

    } catch (error) {
      console.error('❌ [UNIFIED] Failed to cleanup orphaned events:', error);
    }
  }

  /**
   * Get sync health status
   */
  async getHealthStatus(): Promise<SyncHealthStatus> {
    try {
      // Get basic statistics from existing tables
      const { data: totalAssignments, error: totalError } = await supabase
        .from('appointment_staff')
        .select('id', { count: 'exact' })
        .not('staff.google_calendar_id', 'is', null);

      const { data: withEvents, error: eventsError } = await supabase
        .from('appointment_staff')
        .select('id', { count: 'exact' })
        .not('google_event_id', 'is', null)
        .not('staff.google_calendar_id', 'is', null);

      const { data: pendingSync, error: pendingError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('status', 'scheduled')
        .is('appointment_staff.google_event_id', null)
        .not('appointment_staff.staff.google_calendar_id', 'is', null)
        .gte('appointment_date', new Date().toISOString().split('T')[0]);

      const pendingSyncs = pendingError ? 0 : (pendingSync?.length || 0);
      const failedSyncs = 0; // Can't determine without sync status fields

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      const errors: string[] = [];

      if (totalError) errors.push(`Error getting total assignments: ${totalError.message}`);
      if (eventsError) errors.push(`Error getting events count: ${eventsError.message}`);
      if (pendingError) errors.push(`Error getting pending syncs: ${pendingError.message}`);

      if (errors.length > 0) {
        status = 'degraded';
      }

      if (pendingSyncs > 50) {
        status = 'degraded';
        errors.push(`High pending syncs: ${pendingSyncs}`);
      }

      return {
        status,
        pendingSyncs,
        failedSyncs,
        lastSyncAt: new Date().toISOString(),
        errors
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        pendingSyncs: 0,
        failedSyncs: 0,
        errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<SyncStatistics> {
    try {
      const { count: totalAssignments } = await supabase
        .from('appointment_staff')
        .select('id', { count: 'exact' })
        .not('staff.google_calendar_id', 'is', null);

      const { count: withEvents } = await supabase
        .from('appointment_staff')
        .select('id', { count: 'exact' })
        .not('google_event_id', 'is', null)
        .not('staff.google_calendar_id', 'is', null);

      const { count: pendingSyncs } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('status', 'scheduled')
        .is('appointment_staff.google_event_id', null)
        .not('appointment_staff.staff.google_calendar_id', 'is', null)
        .gte('appointment_date', new Date().toISOString().split('T')[0]);

      return {
        totalAssignments: totalAssignments || 0,
        pendingSyncs: pendingSyncs || 0,
        syncedCount: withEvents || 0,
        withEvents: withEvents || 0,
        withoutEvents: (totalAssignments || 0) - (withEvents || 0)
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalAssignments: 0,
        pendingSyncs: 0,
        syncedCount: 0,
        withEvents: 0,
        withoutEvents: 0
      };
    }
  }

  // Private helper methods

  private async createCalendarEventForStaff(
    assignmentId: string,
    appointment: any,
    staff: any,
    role: string
  ): Promise<void> {
    console.log(`👤 [UNIFIED] Creating calendar event for ${staff.first_name} ${staff.last_name}`);

    try {
      const eventTitle = this.buildEventTitle(appointment, staff, role);
      const eventDescription = this.buildEventDescription(appointment, staff, role);
      const location = this.buildLocation(appointment);

      const startDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      const endDateTime = new Date(startDateTime.getTime() + (appointment.duration_minutes || 60) * 60000);

      const result = await this.googleCalendarService.createEvent({
        staff_id: staff.id,
        google_calendar_id: staff.google_calendar_id,
        event_title: eventTitle,
        event_description: eventDescription,
        location: location,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString()
      });

      if (result.success) {
        // Update the assignment with the event ID
        await supabase
          .from('appointment_staff')
          .update({
            google_event_id: result.eventId,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignmentId);

        console.log(`✅ [UNIFIED] Calendar event created successfully: ${result.eventId}`);
      } else {
        throw new Error(result.errorMessage || 'Failed to create calendar event');
      }

    } catch (error) {
      console.error(`❌ [UNIFIED] Failed to create calendar event:`, error);
      throw error;
    }
  }

  private async updateCalendarEventForStaff(
    assignmentId: string,
    appointment: any,
    staff: any,
    role: string,
    eventId: string
  ): Promise<void> {
    console.log(`👤 [UNIFIED] Updating calendar event for ${staff.first_name} ${staff.last_name}`);

    try {
      const eventTitle = this.buildEventTitle(appointment, staff, role);
      const eventDescription = this.buildEventDescription(appointment, staff, role);
      const location = this.buildLocation(appointment);

      const startDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      const endDateTime = new Date(startDateTime.getTime() + (appointment.duration_minutes || 60) * 60000);

      const result = await this.googleCalendarService.updateEvent(
        staff.google_calendar_id,
        eventId,
        {
          event_title: eventTitle,
          event_description: eventDescription,
          location: location,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString()
        }
      );

      if (result.success) {
        // Update the timestamp
        await supabase
          .from('appointment_staff')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', assignmentId);

        console.log(`✅ [UNIFIED] Calendar event updated successfully: ${eventId}`);
      } else {
        throw new Error(result.errorMessage || 'Failed to update calendar event');
      }

    } catch (error) {
      console.error(`❌ [UNIFIED] Failed to update calendar event:`, error);
      throw error;
    }
  }

  private async deleteCalendarEventForStaff(assignmentId: string, staff: any, eventId: string): Promise<void> {
    console.log(`🗑️ [UNIFIED] Deleting calendar event ${eventId} for ${staff.first_name} ${staff.last_name}`);

    try {
      const result = await this.googleCalendarService.deleteEvent(
        staff.google_calendar_id,
        eventId
      );

      if (result.success) {
        // Clear the event ID
        await supabase
          .from('appointment_staff')
          .update({
            google_event_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignmentId);

        console.log(`✅ [UNIFIED] Calendar event deleted successfully`);
      } else {
        throw new Error(result.errorMessage || 'Failed to delete calendar event');
      }

    } catch (error) {
      console.error(`❌ [UNIFIED] Failed to delete calendar event:`, error);
      throw error;
    }
  }

  private buildEventTitle(appointment: any, staff: any, role: string): string {
    const patientName = appointment.patient?.name || 'Unknown Patient';
    const appointmentType = this.getAppointmentTypeDisplayName(appointment.appointment_type);
    const area = appointment.patient?.area || appointment.patient?.city || 'Location TBD';
    const staffName = `${staff.first_name} ${staff.last_name}`;

    if (role === 'primary') {
      return `${patientName} - ${area} - ${appointmentType} - ${staffName}`;
    } else {
      return `${patientName} - ${area} - ${appointmentType} - ${staffName} (${role})`;
    }
  }

  private buildEventDescription(appointment: any, staff: any, role: string): string {
    const parts = [];

    parts.push('🏥 BESTDOC APPOINTMENT');
    parts.push('═'.repeat(50));

    // Patient Information
    parts.push('👤 PATIENT DETAILS:');
    parts.push(`   Name: ${appointment.patient?.name || 'Not provided'}`);
    parts.push(`   Phone: ${appointment.patient?.phone || 'Not provided'}`);

    // Appointment Details
    parts.push('\n📅 APPOINTMENT DETAILS:');
    parts.push(`   Type: ${this.getAppointmentTypeDisplayName(appointment.appointment_type)}`);
    parts.push(`   Date: ${appointment.appointment_date}`);
    parts.push(`   Time: ${appointment.start_time}`);
    parts.push(`   Duration: ${appointment.duration_minutes || 60} minutes`);

    // Staff Information
    parts.push('\n👨‍⚕️ STAFF ASSIGNMENT:');
    parts.push(`   Name: ${staff.first_name} ${staff.last_name}`);
    parts.push(`   Role: ${role.toUpperCase()}`);

    parts.push('\n' + '═'.repeat(50));
    parts.push('📱 Created by BestDOC Unified Calendar Sync');
    parts.push(`🕒 Generated: ${new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}`);

    return parts.join('\n');
  }

  private buildLocation(appointment: any): string {
    const locationParts = [];

    if (appointment.patient?.flat_villa_no) {
      locationParts.push(appointment.patient.flat_villa_no);
    }

    if (appointment.patient?.building_street) {
      locationParts.push(appointment.patient.building_street);
    }

    if (appointment.patient?.area) {
      locationParts.push(appointment.patient.area);
    }

    if (appointment.patient?.city) {
      locationParts.push(appointment.patient.city);
    }

    return locationParts.length > 0 ? locationParts.join(', ') : 'Location TBD';
  }

  private getAppointmentTypeDisplayName(type: string): string {
    const displayNames: Record<string, string> = {
      'doctor_on_call': 'Doctor On Call',
      'lab_test': 'Lab Test',
      'teleconsultation': 'Teleconsultation',
      'physiotherapy': 'Physiotherapy',
      'caregiver': 'Caregiver Service',
      'iv_therapy': 'IV Therapy'
    };
    return displayNames[type] || type;
  }
}

// Singleton instance
let compatibleUnifiedCalendarSyncServiceInstance: CompatibleUnifiedCalendarSyncService | null = null;

/**
 * Get the singleton instance of CompatibleUnifiedCalendarSyncService
 */
export function getCompatibleUnifiedCalendarSyncService(): CompatibleUnifiedCalendarSyncService {
  if (!compatibleUnifiedCalendarSyncServiceInstance) {
    compatibleUnifiedCalendarSyncServiceInstance = new CompatibleUnifiedCalendarSyncService();
  }
  return compatibleUnifiedCalendarSyncServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetCompatibleUnifiedCalendarSyncService(): void {
  compatibleUnifiedCalendarSyncServiceInstance = null;
}

export default CompatibleUnifiedCalendarSyncService;
