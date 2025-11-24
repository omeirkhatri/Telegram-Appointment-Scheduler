/**
 * Unified Calendar Sync Service
 *
 * This service provides a single, robust interface for all Google Calendar sync operations.
 * It eliminates the conflicts between multiple sync systems and provides reliable,
 * event-driven calendar synchronization.
 */
import 'server-only';

import { getServiceRoleClient } from '@/lib/supabase';
import { getGoogleCalendarService } from './googleCalendarService';

// Lazily acquire a server-only Supabase client when needed
function getServerSupabase() {
  if (typeof window !== 'undefined') {
    throw new Error('Server-only Supabase client used on the client');
  }
  return getServiceRoleClient();
}

// Types for sync operations
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
  failedCount: number;
  errorCount: number;
  withEvents: number;
  withoutEvents: number;
}

export interface PendingSync {
  appointmentStaffId: string;
  appointmentId: string;
  staffId: string;
  syncStatus: string;
  syncRetryCount: number;
  googleEventId?: string;
  appointmentDate: string;
  startTime: string;
  appointmentType: string;
  staffFirstName: string;
  staffLastName: string;
  staffGoogleCalendarId: string;
}

export interface OrphanedEvent {
  appointmentStaffId: string;
  googleEventId: string;
  staffGoogleCalendarId: string;
  staffName: string;
}

export class UnifiedCalendarSyncService {
  private googleCalendarService = getGoogleCalendarService();
  private isProcessing = false;

  /**
   * Sync a newly created appointment to Google Calendar
   */
  async syncAppointmentCreate(appointmentId: string): Promise<void> {
    console.log(`📅 [UNIFIED] Syncing new appointment: ${appointmentId}`);

    try {
      // Get appointment with staff assignments
      const { data: appointment, error: appointmentError } = await getServerSupabase()
        .from('appointments')
        .select(`
          *,
          patient:patient_id(id, name, phone, flat_villa_no, building_street, area, city, google_maps_link),
          appointment_staff!inner(
            id,
            staff_id,
            role,
            sync_status,
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
        .eq('appointment_staff.sync_status', 'pending')
        .single();

      if (appointmentError) {
        // If no staff assignments found, check for driver_id assignments
        if (appointment?.driver_id) {
          const { data: driverData, error: driverError } = await getServerSupabase()
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
                sync_status: 'pending',
                staff: driverData
              }]
            };

            // Sync to driver's calendar
            for (const assignment of driverAppointment.appointment_staff) {
              await this.syncStaffAssignment(assignment.id, driverAppointment, assignment.staff, assignment.role, 'create');
            }
            return;
          }
        }
        throw new Error(`Failed to fetch appointment: ${appointmentError.message}`);
      }

      if (!appointment) {
        console.log(`📅 [UNIFIED] Appointment ${appointmentId} not found or no pending staff assignments`);
        return;
      }

      // Sync to each staff member's calendar
      for (const assignment of appointment.appointment_staff) {
        if (!assignment.staff?.google_calendar_id) {
          console.log(`📅 [UNIFIED] Staff ${assignment.staff?.first_name} ${assignment.staff?.last_name} has no calendar, skipping`);
          continue;
        }

        await this.syncStaffAssignment(assignment.id, appointment, assignment.staff, assignment.role, 'create');
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
      const { data: appointment, error: appointmentError } = await getServerSupabase()
        .from('appointments')
        .select(`
          *,
          patient:patient_id(id, name, phone, flat_villa_no, building_street, area, city, google_maps_link),
          appointment_staff!inner(
            id,
            staff_id,
            role,
            google_event_id,
            sync_status,
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
        throw new Error(`Failed to fetch appointment: ${appointmentError.message}`);
      }

      if (!appointment) {
        console.log(`📅 [UNIFIED] Appointment ${appointmentId} not found or no calendar events to update`);
        return;
      }

      // Update each staff member's calendar event
      for (const assignment of appointment.appointment_staff) {
        if (!assignment.staff?.google_calendar_id || !assignment.google_event_id) {
          continue;
        }

        await this.syncStaffAssignment(assignment.id, appointment, assignment.staff, assignment.role, 'update');
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
      const { data: assignments, error: assignmentsError } = await getServerSupabase()
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

        await this.deleteCalendarEvent(assignment.id, assignment.staff, assignment.google_event_id);
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

      // Get pending syncs from database
      const { data: pendingSyncs, error } = await getServerSupabase()
        .rpc('get_pending_calendar_syncs', { limit_count: 50 });

      if (error) {
        throw new Error(`Failed to get pending syncs: ${error.message}`);
      }

      if (!pendingSyncs || pendingSyncs.length === 0) {
        console.log('✅ [UNIFIED] No pending syncs found');
        return;
      }

      console.log(`📅 [UNIFIED] Found ${pendingSyncs.length} pending syncs`);

      let processedCount = 0;
      let errorCount = 0;

      for (const sync of pendingSyncs) {
        try {
          await this.processSinglePendingSync(sync);
          processedCount++;
        } catch (error) {
          console.error(`❌ [UNIFIED] Failed to process sync ${sync.appointmentStaffId}:`, error);
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
      // Get orphaned events from database
      const { data: orphanedEvents, error } = await getServerSupabase()
        .rpc('get_orphaned_calendar_events');

      if (error) {
        throw new Error(`Failed to get orphaned events: ${error.message}`);
      }

      if (!orphanedEvents || orphanedEvents.length === 0) {
        console.log('✅ [UNIFIED] No orphaned events found');
        return;
      }

      console.log(`🗑️ [UNIFIED] Found ${orphanedEvents.length} orphaned events`);

      let cleanedCount = 0;
      let errorCount = 0;

      for (const event of orphanedEvents) {
        try {
          // Delete the calendar event
          const result = await this.googleCalendarService.deleteEvent(
            event.staffGoogleCalendarId,
            event.googleEventId
          );

          if (result.success) {
            // Remove the appointment_staff record
            await supabase
              .from('appointment_staff')
              .delete()
              .eq('id', event.appointmentStaffId);

            console.log(`✅ [UNIFIED] Cleaned up orphaned event for ${event.staffName}`);
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
      const { data: stats, error } = await getServerSupabase()
        .rpc('get_calendar_sync_statistics');

      if (error) {
        return {
          status: 'unhealthy',
          pendingSyncs: 0,
          failedSyncs: 0,
          errors: [`Failed to get statistics: ${error.message}`]
        };
      }

      const statistics = stats[0];
      const pendingSyncs = statistics.pendingSyncs;
      const failedSyncs = statistics.failedCount + statistics.errorCount;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      const errors: string[] = [];

      if (failedSyncs > 10) {
        status = 'unhealthy';
        errors.push(`High number of failed syncs: ${failedSyncs}`);
      } else if (pendingSyncs > 50 || failedSyncs > 0) {
        status = 'degraded';
        if (pendingSyncs > 50) errors.push(`High pending syncs: ${pendingSyncs}`);
        if (failedSyncs > 0) errors.push(`Some failed syncs: ${failedSyncs}`);
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
    const { data: stats, error } = await getServerSupabase()
      .rpc('get_calendar_sync_statistics');

    if (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }

    return stats[0];
  }

  // Private helper methods

  private async syncStaffAssignment(
    assignmentId: string,
    appointment: any,
    staff: any,
    role: string,
    operation: 'create' | 'update'
  ): Promise<void> {
    console.log(`👤 [UNIFIED] ${operation} calendar event for ${staff.first_name} ${staff.last_name}`);

    // Mark as syncing
    await this.updateSyncStatus(assignmentId, 'syncing');

    try {
      const eventTitle = this.buildEventTitle(appointment, staff, role);
      const eventDescription = this.buildEventDescription(appointment, staff, role);
      const location = this.buildLocation(appointment);

      const startDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
      const endDateTime = new Date(startDateTime.getTime() + (appointment.duration_minutes || 60) * 60000);

      let result: any;

      if (operation === 'create') {
        result = await this.googleCalendarService.createEvent({
          staff_id: staff.id,
          google_calendar_id: staff.google_calendar_id,
          event_title: eventTitle,
          event_description: eventDescription,
          location: location,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString()
        });
      } else {
        // Get the existing event ID
        const { data: assignment } = await getServerSupabase()
          .from('appointment_staff')
          .select('google_event_id')
          .eq('id', assignmentId)
          .single();

        if (!assignment?.google_event_id) {
          throw new Error('No existing calendar event to update');
        }

        result = await this.googleCalendarService.updateEvent(
          staff.google_calendar_id,
          assignment.google_event_id,
          {
            event_title: eventTitle,
            event_description: eventDescription,
            location: location,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString()
          }
        );
      }

      if (result.success) {
        await this.updateSyncStatus(assignmentId, 'synced', result.eventId);
        console.log(`✅ [UNIFIED] Calendar event ${operation}d successfully: ${result.eventId}`);
      } else {
        throw new Error(result.errorMessage || `Failed to ${operation} calendar event`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateSyncStatus(assignmentId, 'failed', undefined, errorMessage);
      console.error(`❌ [UNIFIED] Failed to ${operation} calendar event:`, error);
      throw error;
    }
  }

  private async deleteCalendarEvent(assignmentId: string, staff: any, eventId: string): Promise<void> {
    console.log(`🗑️ [UNIFIED] Deleting calendar event ${eventId} for ${staff.first_name} ${staff.last_name}`);

    try {
      const result = await this.googleCalendarService.deleteEvent(
        staff.google_calendar_id,
        eventId
      );

      if (result.success) {
        // Clear the event ID and mark as synced (deleted)
        await getServerSupabase()
          .from('appointment_staff')
          .update({
            google_event_id: null,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
            sync_error: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignmentId);

        console.log(`✅ [UNIFIED] Calendar event deleted successfully`);
      } else {
        throw new Error(result.errorMessage || 'Failed to delete calendar event');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateSyncStatus(assignmentId, 'failed', undefined, errorMessage);
      console.error(`❌ [UNIFIED] Failed to delete calendar event:`, error);
      throw error;
    }
  }

  private async processSinglePendingSync(sync: PendingSync): Promise<void> {
    console.log(`🔄 [UNIFIED] Processing sync for assignment ${sync.appointmentStaffId}`);

    // Create mock appointment object for sync methods
    const appointment = {
      id: sync.appointmentId,
      appointment_date: sync.appointmentDate,
      start_time: sync.startTime,
      appointment_type: sync.appointmentType,
      duration_minutes: 60, // Default duration
      patient: null // Will be fetched if needed
    };

    const staff = {
      id: sync.staffId,
      first_name: sync.staffFirstName,
      last_name: sync.staffLastName,
      google_calendar_id: sync.staffGoogleCalendarId
    };

    const operation = sync.googleEventId ? 'update' : 'create';

    await this.syncStaffAssignment(sync.appointmentStaffId, appointment, staff, 'primary', operation);
  }

  private async updateSyncStatus(
    assignmentId: string,
    status: string,
    eventId?: string,
    error?: string
  ): Promise<void> {
    await getServerSupabase().rpc('update_sync_status', {
      p_appointment_staff_id: assignmentId,
      p_status: status,
      p_event_id: eventId,
      p_error: error
    });
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
let unifiedCalendarSyncServiceInstance: UnifiedCalendarSyncService | null = null;

/**
 * Get the singleton instance of UnifiedCalendarSyncService
 */
export function getUnifiedCalendarSyncService(): UnifiedCalendarSyncService {
  if (!unifiedCalendarSyncServiceInstance) {
    unifiedCalendarSyncServiceInstance = new UnifiedCalendarSyncService();
  }
  return unifiedCalendarSyncServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetUnifiedCalendarSyncService(): void {
  unifiedCalendarSyncServiceInstance = null;
}

export default UnifiedCalendarSyncService;
