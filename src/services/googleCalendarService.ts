import { CalendarEventFormatter } from '@/lib/calendarEventFormatter';
import { googleCalendarAuth } from '@/lib/googleCalendarAuth';
import { retryWithBackoff, RETRY_CONFIGS, isRetryableError } from '@/lib/retryUtils';
import { 
  detectConflicts, 
  resolveConflicts, 
  validateAppointmentForSync,
  type CalendarEvent,
  type ConflictInfo 
} from '@/lib/conflictResolution';
import { operationQueue } from '@/lib/operationQueue';
import type { Staff } from '@/types';
import type { Appointment } from '@/types/appointment';
import { getAppointmentEndTime, getAppointmentTypeDisplayName } from '@/types/appointment';
import type { Patient } from '@/types/patient';
import { formatForGoogleCalendar } from '@/utils/date';

// Google Calendar API service for staff integration
export class GoogleCalendarService {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor() {
    // Initialize authentication on service creation
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      // Try to initialize service account authentication first
      await googleCalendarAuth.initializeServiceAccount();
    } catch (error) {
      console.warn('Service account authentication failed, falling back to API key:', error);
      try {
        googleCalendarAuth.initializeApiKey();
      } catch (apiKeyError) {
        console.error('Both service account and API key authentication failed:', apiKeyError);
        throw new Error('Google Calendar authentication not configured');
      }
    }
  }

  // Validate Google Calendar ID format
  validateCalendarId(calendarId: string): boolean {
    return googleCalendarAuth.validateCalendarId(calendarId);
  }

  // Test Google Calendar connection
  async testCalendarConnection(calendarId: string): Promise<boolean> {
    try {
      return await googleCalendarAuth.testCalendarAccess(calendarId);
    } catch (error) {
      console.error('Failed to test calendar connection:', error);
      return false;
    }
  }

  // Get calendar events for a staff member
  async getCalendarEvents(
    calendarId: string,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    try {
      const calendar = await googleCalendarAuth.getCalendarClient();

      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: startDate,
        timeMax: endDate,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      throw error;
    }
  }

  // Create calendar event for staff member with retry logic and conflict resolution
  async createCalendarEvent(
    calendarId: string,
    eventData: {
      summary: string;
      description: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      location?: string;
    },
    options: {
      appointmentId?: string;
      staffId?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      useQueue?: boolean;
    } = {}
  ): Promise<string> {
    const { appointmentId, staffId, priority = 'medium', useQueue = false } = options;

    // If queue is enabled and we have staff info, add to queue
    if (useQueue && staffId) {
      const operationId = operationQueue.addOperation('create_event', {
        calendarId,
        eventData,
      }, staffId, {
        appointmentId,
        priority,
      });

      console.log(`Queued calendar event creation: ${operationId}`);
      throw new Error(`Event creation queued: ${operationId}`);
    }

    // Validate event data before creating
    const validationErrors = this.validateEventData(eventData);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid event data: ${validationErrors.join(', ')}`);
    }

    // Use retry logic for the API call
    const result = await retryWithBackoff(async () => {
      const calendar = await googleCalendarAuth.getCalendarClient();

      const response = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: eventData,
        sendUpdates: 'all' // Notify attendees
      });

      return response.data.id!;
    }, RETRY_CONFIGS.write);

    if (!result.success) {
      console.error('Failed to create calendar event after retries:', result.error);
      
      // If it's a retryable error and we have staff info, queue the operation
      if (isRetryableError(result.error) && staffId) {
        const operationId = operationQueue.addOperation('create_event', {
          calendarId,
          eventData,
        }, staffId, {
          appointmentId,
          priority: 'high', // Elevate priority for failed operations
        });

        console.log(`Queued failed calendar event creation: ${operationId}`);
        throw new Error(`Event creation failed and queued for retry: ${operationId}`);
      }

      throw result.error || new Error('Failed to create calendar event');
    }

    console.log(`Successfully created calendar event: ${result.data}`);
    return result.data;
  }

  // Update calendar event with retry logic and conflict resolution
  async updateCalendarEvent(
    calendarId: string,
    eventId: string,
    eventData: {
      summary?: string;
      description?: string;
      start?: { dateTime: string; timeZone: string };
      end?: { dateTime: string; timeZone: string };
      location?: string;
    },
    options: {
      appointmentId?: string;
      staffId?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      useQueue?: boolean;
    } = {}
  ): Promise<void> {
    const { appointmentId, staffId, priority = 'medium', useQueue = false } = options;

    // If queue is enabled and we have staff info, add to queue
    if (useQueue && staffId) {
      const operationId = operationQueue.addOperation('update_event', {
        calendarId,
        eventId,
        eventData,
      }, staffId, {
        appointmentId,
        eventId,
        priority,
      });

      console.log(`Queued calendar event update: ${operationId}`);
      throw new Error(`Event update queued: ${operationId}`);
    }

    // Use retry logic for the API call
    const result = await retryWithBackoff(async () => {
      const calendar = await googleCalendarAuth.getCalendarClient();

      await calendar.events.patch({
        calendarId: calendarId,
        eventId: eventId,
        requestBody: eventData,
        sendUpdates: 'all' // Notify attendees
      });
    }, RETRY_CONFIGS.write);

    if (!result.success) {
      console.error('Failed to update calendar event after retries:', result.error);
      
      // If it's a retryable error and we have staff info, queue the operation
      if (isRetryableError(result.error) && staffId) {
        const operationId = operationQueue.addOperation('update_event', {
          calendarId,
          eventId,
          eventData,
        }, staffId, {
          appointmentId,
          eventId,
          priority: 'high', // Elevate priority for failed operations
        });

        console.log(`Queued failed calendar event update: ${operationId}`);
        throw new Error(`Event update failed and queued for retry: ${operationId}`);
      }

      throw result.error || new Error('Failed to update calendar event');
    }

    console.log(`Successfully updated calendar event: ${eventId}`);
  }

  // Delete calendar event with retry logic and conflict resolution
  async deleteCalendarEvent(
    calendarId: string, 
    eventId: string,
    options: {
      appointmentId?: string;
      staffId?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      useQueue?: boolean;
    } = {}
  ): Promise<void> {
    const { appointmentId, staffId, priority = 'medium', useQueue = false } = options;

    // If queue is enabled and we have staff info, add to queue
    if (useQueue && staffId) {
      const operationId = operationQueue.addOperation('delete_event', {
        calendarId,
        eventId,
      }, staffId, {
        appointmentId,
        eventId,
        priority,
      });

      console.log(`Queued calendar event deletion: ${operationId}`);
      throw new Error(`Event deletion queued: ${operationId}`);
    }

    // Use retry logic for the API call
    const result = await retryWithBackoff(async () => {
      const calendar = await googleCalendarAuth.getCalendarClient();

      await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
        sendUpdates: 'all' // Notify attendees
      });
    }, RETRY_CONFIGS.critical); // Use critical config for deletions

    if (!result.success) {
      console.error('Failed to delete calendar event after retries:', result.error);
      
      // If it's a retryable error and we have staff info, queue the operation
      if (isRetryableError(result.error) && staffId) {
        const operationId = operationQueue.addOperation('delete_event', {
          calendarId,
          eventId,
        }, staffId, {
          appointmentId,
          eventId,
          priority: 'critical', // Elevate priority for failed deletions
        });

        console.log(`Queued failed calendar event deletion: ${operationId}`);
        throw new Error(`Event deletion failed and queued for retry: ${operationId}`);
      }

      throw result.error || new Error('Failed to delete calendar event');
    }

    console.log(`Successfully deleted calendar event: ${eventId}`);
  }

  // Check staff availability for a time slot
  async checkStaffAvailability(
    staff: Staff,
    startTime: string,
    endTime: string,
    date: string,
  ): Promise<boolean> {
    if (!staff.google_calendar_id) {
      return true; // No calendar integration, assume available
    }

    try {
      const events = await this.getCalendarEvents(
        staff.google_calendar_id,
        `${date}T${startTime}:00Z`,
        `${date}T${endTime}:00Z`,
      );

      // Check for conflicting events
      const conflictingEvents = events.filter((event: any) => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        const requestedStart = new Date(`${date}T${startTime}:00Z`);
        const requestedEnd = new Date(`${date}T${endTime}:00Z`);

        // Check for overlap
        return eventStart < requestedEnd && eventEnd > requestedStart;
      });

      return conflictingEvents.length === 0;
    } catch (error) {
      console.error('Failed to check staff availability:', error);
      return false; // Assume unavailable if we can't check
    }
  }

  // Get staff calendar events for a date range
  async getStaffCalendarEvents(
    staff: Staff,
    startDate: string,
    endDate: string,
  ): Promise<any[]> {
    if (!staff.google_calendar_id) {
      return [];
    }

    try {
      return await this.getCalendarEvents(staff.google_calendar_id, startDate, endDate);
    } catch (error) {
      console.error('Failed to get staff calendar events:', error);
      return [];
    }
  }

  // Sync staff calendar events with database
  async syncStaffCalendar(staff: Staff, startDate: string, endDate: string): Promise<void> {
    if (!staff.google_calendar_id) {
      return;
    }

    try {
      const events = await this.getCalendarEvents(staff.google_calendar_id, startDate, endDate);

      // Here you would sync the events with your database
      // This is a placeholder for the actual sync logic
      console.log(`Syncing ${events.length} events for staff ${staff.id}`);

      // TODO: Implement actual sync logic with appointments table
    } catch (error) {
      console.error('Failed to sync staff calendar:', error);
      throw error;
    }
  }

  // Get calendar authentication status
  getAuthStatus(): {
    hasServiceAccount: boolean;
    hasApiKey: boolean;
    isInitialized: boolean;
  } {
    return {
      hasServiceAccount: googleCalendarAuth.hasServiceAccountAuth(),
      hasApiKey: googleCalendarAuth.hasApiKeyAuth(),
      isInitialized: googleCalendarAuth.hasServiceAccountAuth() || googleCalendarAuth.hasApiKeyAuth()
    };
  }

  // Refresh authentication token
  async refreshAuth(): Promise<void> {
    await googleCalendarAuth.refreshToken();
  }

  // Get available calendars for authenticated user/service account
  async getAvailableCalendars(): Promise<any[]> {
    try {
      return await googleCalendarAuth.getCalendarList();
    } catch (error) {
      console.error('Failed to get available calendars:', error);
      throw error;
    }
  }

  // Get appointments by staff member
  async getAppointmentsByStaff(staffId: string): Promise<any[]> {
    try {
      // This would typically call the appointment service
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      console.error('Failed to get appointments by staff:', error);
      throw error;
    }
  }

  // Get appointments by patient and staff
  async getAppointmentsByPatientAndStaff(patientId: string, staffId: string): Promise<any[]> {
    try {
      // This would typically call the appointment service
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      console.error('Failed to get appointments by patient and staff:', error);
      throw error;
    }
  }

  // Create appointment event with proper formatting
  async createAppointmentEvent(
    appointment: Appointment,
    patient: Patient,
    staff?: Staff,
    assignedStaff?: Staff[]
  ): Promise<string> {
    try {
      const eventData = CalendarEventFormatter.createEventData(
        appointment,
        patient,
        staff,
        assignedStaff
      );

      const calendarId = staff?.google_calendar_id;
      if (!calendarId) {
        throw new Error(`No Google Calendar ID configured for staff member ${staff?.id}`);
      }

      return await this.createCalendarEvent(calendarId, eventData);
    } catch (error) {
      console.error('Failed to create appointment event:', error);
      throw error;
    }
  }

  // Create staff-specific event based on staff type
  async createStaffSpecificEvent(
    appointment: Appointment,
    patient: Patient,
    staff: Staff
  ): Promise<string> {
    try {
      switch (staff.staff_type) {
        case 'driver':
          return await this.createDriverEvent(appointment, patient, staff);

        case 'doctor':
        case 'nurse':
        case 'physiotherapist':
        case 'caregiver':
        case 'lab_technician':
          return await this.createMedicalStaffEvent(appointment, patient, staff);

        default:
          throw new Error(`Unsupported staff type: ${staff.staff_type}`);
      }
    } catch (error) {
      console.error('Failed to create staff-specific event:', error);
      throw error;
    }
  }

  // Create events for all assigned staff members
  async createEventsForAllStaff(
    appointment: Appointment,
    patient: Patient,
    assignedStaff: Staff[]
  ): Promise<Record<string, string>> {
    const eventIds: Record<string, string> = {};

    for (const staff of assignedStaff) {
      try {
        const eventId = await this.createStaffSpecificEvent(appointment, patient, staff);
        eventIds[staff.id] = eventId;
      } catch (error) {
        console.error(`Failed to create event for staff ${staff.id}:`, error);
        // Continue with other staff members even if one fails
      }
    }

    return eventIds;
  }

  // Create driver-specific event
  async createDriverEvent(
    appointment: Appointment,
    patient: Patient,
    driver: Staff
  ): Promise<string> {
    try {
      const eventData = {
        summary: `🚗 Driver Assignment - ${patient.name}`,
        description: CalendarEventFormatter.createDriverEventDescription(
          appointment,
          patient,
          driver
        ),
        start: {
          dateTime: formatForGoogleCalendar(appointment.appointment_date, appointment.start_time),
          timeZone: 'Asia/Dubai',
        },
        end: {
          dateTime: formatForGoogleCalendar(
            appointment.appointment_date,
            getAppointmentEndTime(appointment.start_time, appointment.duration_minutes)
          ),
          timeZone: 'Asia/Dubai',
        },
        location: patient.google_maps_link,
        attendees: driver.email ? [{ email: driver.email }] : undefined,
      };

      const calendarId = driver.google_calendar_id;
      if (!calendarId) {
        throw new Error(`No Google Calendar ID configured for driver ${driver.id}`);
      }

      return await this.createCalendarEvent(calendarId, eventData);
    } catch (error) {
      console.error('Failed to create driver event:', error);
      throw error;
    }
  }

  // Create medical staff event
  async createMedicalStaffEvent(
    appointment: Appointment,
    patient: Patient,
    medicalStaff: Staff
  ): Promise<string> {
    try {
      const eventData = {
        summary: `👨‍⚕️ ${getAppointmentTypeDisplayName(appointment.appointment_type)} - ${patient.name}`,
        description: CalendarEventFormatter.createMedicalStaffEventDescription(
          appointment,
          patient,
          medicalStaff
        ),
        start: {
          dateTime: formatForGoogleCalendar(appointment.appointment_date, appointment.start_time),
          timeZone: 'Asia/Dubai',
        },
        end: {
          dateTime: formatForGoogleCalendar(
            appointment.appointment_date,
            getAppointmentEndTime(appointment.start_time, appointment.duration_minutes)
          ),
          timeZone: 'Asia/Dubai',
        },
        location: patient.google_maps_link,
        attendees: medicalStaff.email ? [{ email: medicalStaff.email }] : undefined,
      };

      const calendarId = medicalStaff.google_calendar_id;
      if (!calendarId) {
        throw new Error(`No Google Calendar ID configured for medical staff ${medicalStaff.id}`);
      }

      return await this.createCalendarEvent(calendarId, eventData);
    } catch (error) {
      console.error('Failed to create medical staff event:', error);
      throw error;
    }
  }

  // Set up calendar webhook for a staff member
  async setupCalendarWebhook(calendarId: string, webhookUrl: string): Promise<string> {
    try {
      const calendar = await googleCalendarAuth.getCalendarClient();

      const response = await calendar.events.watch({
        calendarId: calendarId,
        requestBody: {
          id: `webhook-${Date.now()}`,
          type: 'web_hook',
          address: webhookUrl,
          params: {
            ttl: '2592000', // 30 days
          },
        },
      });

      return response.data.id!;
    } catch (error) {
      console.error('Failed to setup calendar webhook:', error);
      throw error;
    }
  }

  // Stop calendar webhook
  async stopCalendarWebhook(calendarId: string, webhookId: string): Promise<void> {
    try {
      const calendar = await googleCalendarAuth.getCalendarClient();

      await calendar.events.stop({
        calendarId: calendarId,
        requestBody: {
          id: webhookId,
          resourceId: webhookId,
        },
      });
    } catch (error) {
      console.error('Failed to stop calendar webhook:', error);
      throw error;
    }
  }

  // Validate event data before creating/updating
  private validateEventData(eventData: any): string[] {
    const errors: string[] = [];

    if (!eventData.summary || typeof eventData.summary !== 'string') {
      errors.push('Event summary is required and must be a string');
    }

    if (!eventData.start || !eventData.start.dateTime) {
      errors.push('Event start time is required');
    }

    if (!eventData.end || !eventData.end.dateTime) {
      errors.push('Event end time is required');
    }

    if (eventData.start && eventData.end) {
      const startTime = new Date(eventData.start.dateTime);
      const endTime = new Date(eventData.end.dateTime);
      
      if (startTime >= endTime) {
        errors.push('Event end time must be after start time');
      }
    }

    return errors;
  }

  // Check for conflicts between appointment and calendar events
  async checkAppointmentConflicts(
    appointment: Appointment,
    staff: Staff,
    calendarEvents: CalendarEvent[]
  ): Promise<ConflictInfo[]> {
    // Find the corresponding calendar event for this appointment
    const eventId = appointment.google_event_ids?.[staff.id];
    const calendarEvent = eventId 
      ? calendarEvents.find(event => event.id === eventId) || null
      : null;

    // Detect conflicts
    const conflicts = detectConflicts(appointment, calendarEvent, staff);

    // Check for duplicate events
    const duplicateConflicts = detectDuplicateEvents(calendarEvents, appointment, staff);
    conflicts.push(...duplicateConflicts);

    // Validate appointment data
    const validationConflicts = validateAppointmentForSync(appointment, staff);
    conflicts.push(...validationConflicts);

    return conflicts;
  }

  // Resolve conflicts automatically or flag for manual review
  async resolveAppointmentConflicts(
    appointment: Appointment,
    staff: Staff,
    calendarEvents: CalendarEvent[]
  ): Promise<{
    resolved: boolean;
    action: string;
    conflicts: ConflictInfo[];
    requiresManualReview: boolean;
  }> {
    const conflicts = await this.checkAppointmentConflicts(appointment, staff, calendarEvents);
    
    if (conflicts.length === 0) {
      return {
        resolved: true,
        action: 'no_conflicts',
        conflicts: [],
        requiresManualReview: false,
      };
    }

    // Check if any conflicts require manual review
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    const timeConflicts = conflicts.filter(c => c.type === 'time_conflict');
    
    if (criticalConflicts.length > 0 || timeConflicts.length > 0) {
      return {
        resolved: false,
        action: 'manual_review_required',
        conflicts,
        requiresManualReview: true,
      };
    }

    // Try to resolve conflicts automatically
    const eventId = appointment.google_event_ids?.[staff.id];
    const calendarEvent = eventId 
      ? calendarEvents.find(event => event.id === eventId) || null
      : null;

    const resolution = resolveConflicts(conflicts, appointment, calendarEvent, staff);

    return {
      resolved: resolution.resolved,
      action: resolution.action,
      conflicts: resolution.conflicts,
      requiresManualReview: !resolution.resolved,
    };
  }

  // Sync appointment with calendar with conflict resolution
  async syncAppointmentWithCalendar(
    appointment: Appointment,
    staff: Staff,
    options: {
      forceSync?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): Promise<{
    success: boolean;
    eventId?: string;
    conflicts: ConflictInfo[];
    requiresManualReview: boolean;
  }> {
    const { forceSync = false, priority = 'medium' } = options;

    try {
      // Get current calendar events for the time period
      const startDate = new Date(appointment.appointment_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const calendarEvents = await this.getCalendarEvents(
        staff.google_calendar_id!,
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Check for conflicts
      const conflictResult = await this.resolveAppointmentConflicts(
        appointment,
        staff,
        calendarEvents
      );

      if (conflictResult.requiresManualReview && !forceSync) {
        return {
          success: false,
          conflicts: conflictResult.conflicts,
          requiresManualReview: true,
        };
      }

      // Perform the sync based on resolution
      const eventId = appointment.google_event_ids?.[staff.id];
      
      if (conflictResult.action === 'create_event' || !eventId) {
        // Create new event
        const newEventId = await this.createAppointmentEvent(
          appointment,
          { name: appointment.patient_name || 'Unknown' } as any, // Simplified patient object
          staff,
          undefined,
          { staffId: staff.id, appointmentId: appointment.id, priority }
        );

        return {
          success: true,
          eventId: newEventId,
          conflicts: conflictResult.conflicts,
          requiresManualReview: false,
        };
      } else if (conflictResult.action === 'update_calendar') {
        // Update existing event
        await this.updateCalendarEvent(
          staff.google_calendar_id!,
          eventId,
          {
            summary: `👨‍⚕️ ${appointment.appointment_type} - ${appointment.patient_name}`,
            start: {
              dateTime: formatForGoogleCalendar(appointment.appointment_date, appointment.start_time),
              timeZone: 'Asia/Dubai',
            },
            end: {
              dateTime: formatForGoogleCalendar(
                appointment.appointment_date,
                getAppointmentEndTime(appointment.start_time, appointment.duration_minutes)
              ),
              timeZone: 'Asia/Dubai',
            },
          },
          { staffId: staff.id, appointmentId: appointment.id, priority }
        );

        return {
          success: true,
          eventId,
          conflicts: conflictResult.conflicts,
          requiresManualReview: false,
        };
      }

      return {
        success: false,
        conflicts: conflictResult.conflicts,
        requiresManualReview: true,
      };

    } catch (error) {
      console.error('Failed to sync appointment with calendar:', error);
      
      // Queue the operation for retry
      if (staff.id) {
        operationQueue.addOperation('sync_calendar', {
          appointment,
          staff,
        }, staff.id, {
          appointmentId: appointment.id,
          priority: 'high',
        });
      }

      return {
        success: false,
        conflicts: [{
          type: 'data_mismatch',
          severity: 'high',
          description: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
          appointmentId: appointment.id,
          staffId: staff.id,
        }],
        requiresManualReview: false,
      };
    }
  }

  // Get queue status for monitoring
  getQueueStatus() {
    return operationQueue.getQueueStatus();
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;
