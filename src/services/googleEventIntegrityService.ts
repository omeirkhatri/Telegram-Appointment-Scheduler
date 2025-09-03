import { supabase } from '@/lib/supabase';
import {
    CleanupOperation,
    detectDuplicateEventIds,
    generateCleanupOperations,
    IntegrityCheckResult,
    IntegrityError,
    IntegrityStats,
    IntegrityWarning,
    validateGoogleEventIdsStructure
} from '@/lib/validations/googleEventIntegrity';
import { GoogleCalendarService } from './googleCalendarService';

export class GoogleEventIntegrityService {
  private googleCalendarService: GoogleCalendarService;

  constructor() {
    this.googleCalendarService = new GoogleCalendarService();
  }

  /**
   * Perform comprehensive integrity check on all google_event_ids
   */
  async performIntegrityCheck(): Promise<IntegrityCheckResult> {
    console.log('Starting Google Event IDs integrity check...');

    const errors: IntegrityError[] = [];
    const warnings: IntegrityWarning[] = [];

    try {
      // Get all appointments with google_event_ids
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, google_event_ids')
        .not('google_event_ids', 'is', null);

      if (appointmentsError) {
        throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
      }

      // Get all staff members
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, google_calendar_id')
        .eq('status', 'active');

      if (staffError) {
        throw new Error(`Failed to fetch staff: ${staffError.message}`);
      }

      const validStaffIds = new Set(staff.map(s => s.id));
      const staffWithCalendars = staff.filter(s => s.google_calendar_id);

      // Calculate basic stats
      const stats = this.calculateStats(appointments || []);

      // Validate structure of google_event_ids
      for (const appointment of appointments || []) {
        if (appointment.google_event_ids) {
          const structureErrors = validateGoogleEventIdsStructure(appointment.google_event_ids);
          structureErrors.forEach(error => {
            error.appointmentId = appointment.id;
            errors.push(error);
          });
        }
      }

      // Check for duplicate event IDs
      const duplicateErrors = detectDuplicateEventIds(appointments || []);
      errors.push(...duplicateErrors);

      // Check for invalid staff IDs
      for (const appointment of appointments || []) {
        if (appointment.google_event_ids) {
          for (const staffId of Object.keys(appointment.google_event_ids)) {
            if (!validStaffIds.has(staffId)) {
              errors.push({
                type: 'invalid_staff_id',
                message: `Staff ID ${staffId} does not exist or is inactive`,
                appointmentId: appointment.id,
                staffId,
                severity: 'error'
              });
            }
          }
        }
      }

      // Check for orphaned event IDs (events that don't exist in Google Calendar)
      const orphanedErrors = await this.detectOrphanedEvents(appointments || [], staffWithCalendars);
      errors.push(...orphanedErrors);

      // Generate warnings for potential issues
      const potentialWarnings = await this.generateWarnings(appointments || [], staffWithCalendars);
      warnings.push(...potentialWarnings);

      console.log(`Integrity check completed. Found ${errors.length} errors and ${warnings.length} warnings.`);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        stats
      };

    } catch (error) {
      console.error('Integrity check failed:', error);
      throw error;
    }
  }

  /**
   * Perform integrity check for a specific appointment
   */
  async checkAppointmentIntegrity(appointmentId: string): Promise<IntegrityCheckResult> {
    console.log(`Checking integrity for appointment ${appointmentId}...`);

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('id, google_event_ids')
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      throw new Error(`Appointment not found: ${appointmentId}`);
    }

    return this.performIntegrityCheck();
  }

  /**
   * Clean up invalid or orphaned event IDs
   */
  async cleanupInvalidEventIds(operations: CleanupOperation[]): Promise<{
    success: boolean;
    cleanedCount: number;
    errors: string[];
  }> {
    console.log(`Starting cleanup of ${operations.length} invalid event IDs...`);

    let cleanedCount = 0;
    const errors: string[] = [];

    for (const operation of operations) {
      try {
        await this.executeCleanupOperation(operation);
        cleanedCount++;
      } catch (error) {
        const errorMsg = `Failed to cleanup ${operation.type} for appointment ${operation.appointmentId}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Cleanup completed. Cleaned ${cleanedCount} operations with ${errors.length} errors.`);

    return {
      success: errors.length === 0,
      cleanedCount,
      errors
    };
  }

  /**
   * Auto-cleanup based on integrity check results
   */
  async autoCleanup(): Promise<{
    success: boolean;
    cleanedCount: number;
    errors: string[];
  }> {
    const integrityResult = await this.performIntegrityCheck();
    const operations = generateCleanupOperations(integrityResult.errors);

    return this.cleanupInvalidEventIds(operations);
  }

  /**
   * Validate and fix google_event_ids for a specific appointment
   */
  async validateAndFixAppointment(appointmentId: string): Promise<{
    success: boolean;
    fixed: boolean;
    errors: string[];
  }> {
    console.log(`Validating and fixing appointment ${appointmentId}...`);

    try {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select('id, google_event_ids')
        .eq('id', appointmentId)
        .single();

      if (error || !appointment) {
        throw new Error(`Appointment not found: ${appointmentId}`);
      }

      if (!appointment.google_event_ids || Object.keys(appointment.google_event_ids).length === 0) {
        return { success: true, fixed: false, errors: [] };
      }

      // Get staff members
      const { data: staff } = await supabase
        .from('staff')
        .select('id, google_calendar_id')
        .eq('status', 'active');

      const validStaffIds = new Set(staff?.map(s => s.id) || []);
      const staffWithCalendars = staff?.filter(s => s.google_calendar_id) || [];

      // Validate structure
      const structureErrors = validateGoogleEventIdsStructure(appointment.google_event_ids);
      if (structureErrors.length > 0) {
        // Remove invalid entries
        const cleanedEventIds = { ...appointment.google_event_ids };
        for (const error of structureErrors) {
          if (error.staffId) {
            delete cleanedEventIds[error.staffId];
          }
        }

        await supabase
          .from('appointments')
          .update({ google_event_ids: cleanedEventIds })
          .eq('id', appointmentId);

        return { success: true, fixed: true, errors: [] };
      }

      // Check for invalid staff IDs
      const cleanedEventIds = { ...appointment.google_event_ids };
      let hasChanges = false;

      for (const staffId of Object.keys(cleanedEventIds)) {
        if (!validStaffIds.has(staffId)) {
          delete cleanedEventIds[staffId];
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await supabase
          .from('appointments')
          .update({ google_event_ids: cleanedEventIds })
          .eq('id', appointmentId);

        return { success: true, fixed: true, errors: [] };
      }

      return { success: true, fixed: false, errors: [] };

    } catch (error) {
      console.error(`Failed to validate appointment ${appointmentId}:`, error);
      return { success: false, fixed: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }

  // Private helper methods
  private calculateStats(appointments: Array<{ id: string; google_event_ids: Record<string, string> }>): IntegrityStats {
    const appointmentsWithEventIds = appointments.filter(a => a.google_event_ids && Object.keys(a.google_event_ids).length > 0);
    const totalEventIds = appointmentsWithEventIds.reduce((sum, a) => sum + Object.keys(a.google_event_ids).length, 0);

    return {
      totalAppointments: appointments.length,
      appointmentsWithEventIds: appointmentsWithEventIds.length,
      totalEventIds,
      validEventIds: 0, // Will be calculated during validation
      invalidEventIds: 0, // Will be calculated during validation
      orphanedEventIds: 0, // Will be calculated during validation
      duplicateEventIds: 0 // Will be calculated during validation
    };
  }

  private async detectOrphanedEvents(
    appointments: Array<{ id: string; google_event_ids: Record<string, string> }>,
    staffWithCalendars: Array<{ id: string; google_calendar_id: string }>
  ): Promise<IntegrityError[]> {
    const errors: IntegrityError[] = [];

    // Group events by calendar for efficient checking
    const eventsByCalendar = new Map<string, Set<string>>();

    for (const appointment of appointments) {
      if (!appointment.google_event_ids) continue;

      for (const [staffId, eventId] of Object.entries(appointment.google_event_ids)) {
        const staff = staffWithCalendars.find(s => s.id === staffId);
        if (staff) {
          if (!eventsByCalendar.has(staff.google_calendar_id)) {
            eventsByCalendar.set(staff.google_calendar_id, new Set());
          }
          eventsByCalendar.get(staff.google_calendar_id)!.add(eventId);
        }
      }
    }

    // Check each calendar for orphaned events
    for (const [calendarId, eventIds] of eventsByCalendar) {
      try {
        const validEventIds = await this.getValidEventIds(calendarId, Array.from(eventIds));

        for (const eventId of eventIds) {
          if (!validEventIds.has(eventId)) {
            // Find the appointment and staff for this event
            for (const appointment of appointments) {
              if (appointment.google_event_ids) {
                for (const [staffId, eId] of Object.entries(appointment.google_event_ids)) {
                  if (eId === eventId) {
                    errors.push({
                      type: 'orphaned_event',
                      message: `Event ID ${eventId} does not exist in Google Calendar`,
                      appointmentId: appointment.id,
                      staffId,
                      eventId,
                      severity: 'error'
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to check calendar ${calendarId} for orphaned events:`, error);
      }
    }

    return errors;
  }

  private async getValidEventIds(calendarId: string, eventIds: string[]): Promise<Set<string>> {
    try {
      const validEventIds = new Set<string>();

      // Check events in batches to avoid API limits
      const batchSize = 50;
      for (let i = 0; i < eventIds.length; i += batchSize) {
        const batch = eventIds.slice(i, i + batchSize);

        for (const eventId of batch) {
          try {
            const event = await this.googleCalendarService.getEvent(calendarId, eventId);
            if (event) {
              validEventIds.add(eventId);
            }
          } catch (error) {
            // Event doesn't exist or is inaccessible
            console.debug(`Event ${eventId} not found in calendar ${calendarId}`);
          }
        }
      }

      return validEventIds;
    } catch (error) {
      console.warn(`Failed to validate events for calendar ${calendarId}:`, error);
      return new Set();
    }
  }

  private async generateWarnings(
    appointments: Array<{ id: string; google_event_ids: Record<string, string> }>,
    staffWithCalendars: Array<{ id: string; google_calendar_id: string }>
  ): Promise<IntegrityWarning[]> {
    const warnings: IntegrityWarning[] = [];

    // Check for appointments that should have event IDs but don't
    for (const appointment of appointments) {
      if (!appointment.google_event_ids || Object.keys(appointment.google_event_ids).length === 0) {
        // This could be a warning if the appointment should have been synced
        warnings.push({
          type: 'unused_event_id',
          message: `Appointment ${appointment.id} has no Google Calendar event IDs`,
          appointmentId: appointment.id
        });
      }
    }

    return warnings;
  }

  private async executeCleanupOperation(operation: CleanupOperation): Promise<void> {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('google_event_ids')
      .eq('id', operation.appointmentId)
      .single();

    if (error || !appointment) {
      throw new Error(`Appointment not found: ${operation.appointmentId}`);
    }

    const updatedEventIds = { ...appointment.google_event_ids };

    switch (operation.type) {
      case 'remove_orphaned':
      case 'remove_duplicate':
      case 'remove_invalid_format':
      case 'remove_invalid_staff':
        if (operation.staffId) {
          delete updatedEventIds[operation.staffId];
        }
        break;
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ google_event_ids: updatedEventIds })
      .eq('id', operation.appointmentId);

    if (updateError) {
      throw new Error(`Failed to update appointment: ${updateError.message}`);
    }
  }
}

// Export singleton instance
export const googleEventIntegrityService = new GoogleEventIntegrityService();
