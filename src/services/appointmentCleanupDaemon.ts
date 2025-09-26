import { logCalendarOperation } from '@/lib/calendarOperations';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import { appointmentService } from './appointmentService';
import { getGoogleCalendarService } from './googleCalendarService';

export interface DeletedAppointment {
  id: string;
  patient_id: string;
  appointment_type: string;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  google_event_ids: Record<string, string>;
  is_recurring_base: boolean;
  recurring_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export class AppointmentCleanupDaemon {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly BATCH_SIZE = 10; // Process 10 deleted appointments at a time

  /**
   * Start the daemon
   */
  start(): void {
    if (this.isRunning) {
      console.log('📅 Appointment cleanup daemon is already running');
      return;
    }

    console.log('🚀 Starting appointment cleanup daemon...');
    this.isRunning = true;

    // Run immediately on start
    this.processDeletedAppointments();

    // Then run every 30 seconds
    this.intervalId = setInterval(() => {
      this.processDeletedAppointments();
    }, this.CLEANUP_INTERVAL);

    console.log('✅ Appointment cleanup daemon started');
  }

  /**
   * Stop the daemon
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('📅 Appointment cleanup daemon is not running');
      return;
    }

    console.log('🛑 Stopping appointment cleanup daemon...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Appointment cleanup daemon stopped');
  }

  /**
   * Get the daemon status
   */
  getStatus(): { isRunning: boolean; lastRun?: Date } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun
    };
  }

  private lastRun: Date | undefined;

  /**
   * Process deleted appointments and clean up Google Calendar events
   */
  private async processDeletedAppointments(): Promise<void> {
    try {
      this.lastRun = new Date();
      console.log('🔍 Processing deleted appointments...');

      // Get deleted appointments in batches
      const deletedAppointments = await this.getDeletedAppointments();

      if (deletedAppointments.length === 0) {
        console.log('📅 No deleted appointments to process');
        return;
      }

      console.log(`📅 Found ${deletedAppointments.length} deleted appointments to process`);

      // Process appointments in batches
      for (let i = 0; i < deletedAppointments.length; i += this.BATCH_SIZE) {
        const batch = deletedAppointments.slice(i, i + this.BATCH_SIZE);
        await this.processBatch(batch);
      }

      console.log('✅ Finished processing deleted appointments');

    } catch (error) {
      console.error('❌ Error processing deleted appointments:', error);
    }
  }

  /**
   * Get deleted appointments from the database
   */
  private async getDeletedAppointments(): Promise<DeletedAppointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'deleted')
      .order('updated_at', { ascending: true })
      .limit(50); // Process max 50 at a time

    if (error) {
      throw new Error(`Failed to fetch deleted appointments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Process a batch of deleted appointments
   */
  private async processBatch(appointments: DeletedAppointment[]): Promise<void> {
    console.log(`📅 Processing batch of ${appointments.length} deleted appointments`);

    for (const appointment of appointments) {
      try {
        await this.cleanupAppointment(appointment);
      } catch (error) {
        console.error(`❌ Failed to cleanup appointment ${appointment.id}:`, error);
        // Continue with other appointments even if one fails
      }
    }
  }

  /**
   * Clean up a single deleted appointment
   */
  private async cleanupAppointment(appointment: DeletedAppointment): Promise<void> {
    console.log(`🧹 Cleaning up deleted appointment ${appointment.id}`);

    // Skip if calendar feature is not enabled
    if (!isFeatureEnabled('GOOGLE_CALENDAR_ENABLED')) {
      console.log(`📅 Calendar feature disabled, hard deleting appointment ${appointment.id}`);
      await appointmentService.hardDeleteAppointment(appointment.id);
      return;
    }

    // Clean up Google Calendar events
    await this.cleanupGoogleCalendarEvents(appointment);

    // Hard delete the appointment from database
    await appointmentService.hardDeleteAppointment(appointment.id);

    console.log(`✅ Successfully cleaned up appointment ${appointment.id}`);
  }

  /**
   * Clean up Google Calendar events for a deleted appointment
   */
  private async cleanupGoogleCalendarEvents(appointment: DeletedAppointment): Promise<void> {
    const googleEventIds = appointment.google_event_ids || {};

    if (Object.keys(googleEventIds).length === 0) {
      console.log(`📅 No Google Calendar events to cleanup for appointment ${appointment.id}`);
      return;
    }

    console.log(`📅 Cleaning up ${Object.keys(googleEventIds).length} Google Calendar events for appointment ${appointment.id}`);

    // Clean up events from all staff calendars
    for (const [staffId, eventId] of Object.entries(googleEventIds)) {
      try {
        await this.cleanupStaffCalendarEvent(staffId, eventId, appointment.id);
      } catch (error) {
        console.error(`❌ Failed to cleanup event ${eventId} from staff ${staffId}:`, error);
        // Continue with other events even if one fails
      }
    }
  }

  /**
   * Clean up a single Google Calendar event
   */
  private async cleanupStaffCalendarEvent(staffId: string, eventId: string, appointmentId: string): Promise<void> {
    try {
      // Get staff calendar ID
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('google_calendar_id')
        .eq('id', staffId)
        .single();

      if (staffError || !staff?.google_calendar_id) {
        console.log(`📅 Staff ${staffId} has no Google Calendar, skipping event cleanup`);
        return;
      }

      // Log calendar operation start
      await logCalendarOperation({
        staffId,
        appointmentId,
        operationType: 'delete_event',
        operationStatus: 'pending',
        googleEventId: eventId,
        googleCalendarId: staff.google_calendar_id
      });

      // Delete the event from Google Calendar
      const googleCalendarService = getGoogleCalendarService();
      const result = await googleCalendarService.deleteEvent(
        staff.google_calendar_id,
        eventId
      );

      if (result.success) {
        console.log(`✅ Successfully deleted event ${eventId} from staff ${staffId} calendar`);

        // Log successful operation
        await logCalendarOperation({
          staffId,
          appointmentId,
          operationType: 'delete_event',
          operationStatus: 'success',
          googleEventId: eventId,
          googleCalendarId: staff.google_calendar_id
        });
      } else {
        console.error(`❌ Failed to delete event ${eventId} from staff ${staffId} calendar:`, result.errorMessage);

        // Log failed operation
        await logCalendarOperation({
          staffId,
          appointmentId,
          operationType: 'delete_event',
          operationStatus: 'failed',
          errorCode: result.errorCode || 'CALENDAR_DELETE_FAILED',
          errorMessage: result.errorMessage || 'Unknown error',
          googleEventId: eventId,
          googleCalendarId: staff.google_calendar_id
        });
      }

    } catch (error) {
      console.error(`❌ Error cleaning up event ${eventId} for staff ${staffId}:`, error);

      // Log error
      await logCalendarOperation({
        staffId,
        appointmentId,
        operationType: 'delete_event',
        operationStatus: 'failed',
        errorCode: 'CALENDAR_CLEANUP_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        googleEventId: eventId
      });
    }
  }

  /**
   * Manually trigger cleanup of a specific appointment
   */
  async cleanupSpecificAppointment(appointmentId: string): Promise<void> {
    console.log(`🧹 Manually cleaning up appointment ${appointmentId}`);

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('status', 'deleted')
      .single();

    if (error || !appointment) {
      throw new Error(`Appointment ${appointmentId} not found or not deleted`);
    }

    await this.cleanupAppointment(appointment);
  }

  /**
   * Get statistics about deleted appointments
   */
  async getCleanupStats(): Promise<{
    totalDeleted: number;
    processedToday: number;
    pendingCleanup: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Get total deleted appointments
    const { count: totalDeleted } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'deleted');

    // Get appointments processed today (hard deleted)
    const { count: processedToday } = await supabase
      .from('calendar_operations_log')
      .select('*', { count: 'exact', head: true })
      .eq('operation_type', 'delete_event')
      .eq('operation_status', 'success')
      .gte('created_at', `${today}T00:00:00.000Z`);

    return {
      totalDeleted: totalDeleted || 0,
      processedToday: processedToday || 0,
      pendingCleanup: (totalDeleted || 0) - (processedToday || 0)
    };
  }
}

// Export singleton instance
export const appointmentCleanupDaemon = new AppointmentCleanupDaemon();
