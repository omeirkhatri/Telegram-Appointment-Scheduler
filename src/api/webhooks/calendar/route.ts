import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { googleCalendarService } from '@/services/googleCalendarService';
import { patientService } from '@/services/patientService';
import { staffService } from '@/services/staffService';
import { retryWithBackoff, RETRY_CONFIGS } from '@/lib/retryUtils';
import { detectConflicts, resolveConflicts } from '@/lib/conflictResolution';
import { utcToDateString, utcToTimeString } from '@/utils/date';
import { NextRequest, NextResponse } from 'next/server';

// Webhook secret for verification (should be set in environment variables)
const WEBHOOK_SECRET = process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET;

/**
 * Google Calendar Webhook Handler
 * Handles bidirectional sync between Google Calendar events and appointments
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook authenticity
    if (!verifyWebhookAuthenticity(request, body)) {
      console.error('Webhook verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle different webhook types
    const webhookType = request.headers.get('x-goog-resource-state');
    const resourceId = request.headers.get('x-goog-resource-id');
    const channelId = request.headers.get('x-goog-channel-id');

    console.log(`Received webhook: ${webhookType} for resource: ${resourceId}, channel: ${channelId}`);

    switch (webhookType) {
      case 'sync':
        // Initial sync - set up the webhook
        await handleInitialSync(resourceId, channelId);
        break;

      case 'exists':
        // Resource exists - process calendar changes
        await handleCalendarChanges(resourceId, channelId);
        break;

      case 'not_exists':
        // Resource doesn't exist - clean up
        await handleResourceCleanup(resourceId, channelId);
        break;

      default:
        console.log(`Unknown webhook type: ${webhookType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook authenticity
 */
function verifyWebhookAuthenticity(request: NextRequest, body: any): boolean {
  // In production, implement proper webhook verification
  // For now, we'll use a simple secret check
  if (!WEBHOOK_SECRET) {
    console.warn('No webhook secret configured, skipping verification');
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === WEBHOOK_SECRET;
}

/**
 * Handle initial webhook sync
 */
async function handleInitialSync(resourceId: string | null, channelId: string | null) {
  console.log('Handling initial webhook sync');

  if (!resourceId || !channelId) {
    console.error('Missing resource ID or channel ID for initial sync');
    return;
  }

  try {
    // Store webhook information for future reference
    // This could be stored in a database table for webhook management
    console.log(`Webhook sync established for resource: ${resourceId}, channel: ${channelId}`);
  } catch (error) {
    console.error('Error handling initial sync:', error);
  }
}

/**
 * Handle calendar changes from Google Calendar
 */
async function handleCalendarChanges(resourceId: string | null, channelId: string | null) {
  console.log('Handling calendar changes');

  if (!resourceId || !channelId) {
    console.error('Missing resource ID or channel ID for calendar changes');
    return;
  }

  try {
    // Extract calendar ID from channel ID (format: webhook-{timestamp}-{calendarId})
    const calendarId = extractCalendarIdFromChannel(channelId);
    if (!calendarId) {
      console.error('Could not extract calendar ID from channel:', channelId);
      return;
    }

    // Get staff member associated with this calendar
    const staff = await staffService.getStaffByCalendarId(calendarId);
    if (!staff) {
      console.error('No staff member found for calendar ID:', calendarId);
      return;
    }

    // Get recent events from the calendar
    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const events = await googleCalendarService.getCalendarEvents(
      calendarId,
      startDate.toISOString(),
      endDate.toISOString()
    );

    // Process each event with conflict resolution
    for (const event of events) {
      await processCalendarEventWithConflictResolution(event, staff);
    }

    console.log(`Processed ${events.length} events for staff ${staff.id}`);
  } catch (error) {
    console.error('Error handling calendar changes:', error);
  }
}

/**
 * Handle resource cleanup when webhook is removed
 */
async function handleResourceCleanup(resourceId: string | null, channelId: string | null) {
  console.log('Handling resource cleanup');

  if (!resourceId || !channelId) {
    console.error('Missing resource ID or channel ID for cleanup');
    return;
  }

  try {
    // Clean up webhook references
    console.log(`Cleaning up webhook for resource: ${resourceId}, channel: ${channelId}`);

    // This could involve removing webhook records from database
    // and updating staff calendar integration status
  } catch (error) {
    console.error('Error handling resource cleanup:', error);
  }
}

/**
 * Extract calendar ID from channel ID
 */
function extractCalendarIdFromChannel(channelId: string): string | null {
  // Channel ID format: webhook-{timestamp}-{calendarId}
  const parts = channelId.split('-');
  if (parts.length >= 3) {
    return parts.slice(2).join('-'); // Rejoin in case calendar ID contains hyphens
  }
  return null;
}

/**
 * Process a calendar event and sync with appointment system
 */
async function processCalendarEvent(event: any, staff: any) {
  try {
    // Check if this event is already synced
    const existingAppointment = await findAppointmentByGoogleEventId(event.id, staff.id);

    if (existingAppointment) {
      // Update existing appointment
      await updateAppointmentFromCalendarEvent(existingAppointment, event, staff);
    } else {
      // Check if this might be a new appointment created in Google Calendar
      const potentialAppointment = await findAppointmentByEventDetails(event, staff);

      if (potentialAppointment) {
        // Link the Google Calendar event to existing appointment
        await linkGoogleEventToAppointment(potentialAppointment, event, staff);
      } else {
        // This might be a new appointment created in Google Calendar
        // We could create a new appointment, but for now we'll log it
        console.log(`New Google Calendar event detected: ${event.summary} (${event.id})`);
        console.log('Manual review required to create appointment from Google Calendar event');
      }
    }
  } catch (error) {
    console.error('Error processing calendar event:', error);
  }
}

/**
 * Process a calendar event with conflict resolution and retry logic
 */
async function processCalendarEventWithConflictResolution(event: any, staff: any) {
  try {
    // Use retry logic for processing
    const result = await retryWithBackoff(async () => {
      // Check if this event is already synced
      const existingAppointment = await findAppointmentByGoogleEventId(event.id, staff.id);

      if (existingAppointment) {
        // Check for conflicts before updating
        const conflicts = await checkConflictsForUpdate(existingAppointment, event, staff);
        
        if (conflicts.length > 0) {
          console.log(`Conflicts detected for appointment ${existingAppointment.id}:`, conflicts);
          
          // For now, log conflicts and continue with update
          // In a full implementation, you might want to flag for manual review
          await updateAppointmentFromCalendarEvent(existingAppointment, event, staff);
        } else {
          await updateAppointmentFromCalendarEvent(existingAppointment, event, staff);
        }
      } else {
        // Check if this might be a new appointment created in Google Calendar
        const potentialAppointment = await findAppointmentByEventDetails(event, staff);

        if (potentialAppointment) {
          // Check for conflicts before linking
          const conflicts = await checkConflictsForLink(potentialAppointment, event, staff);
          
          if (conflicts.length > 0) {
            console.log(`Conflicts detected when linking appointment ${potentialAppointment.id}:`, conflicts);
            // Log conflicts but proceed with linking
          }
          
          await linkGoogleEventToAppointment(potentialAppointment, event, staff);
        } else {
          // This might be a new appointment created in Google Calendar
          console.log(`New Google Calendar event detected: ${event.summary} (${event.id})`);
          console.log('Manual review required to create appointment from Google Calendar event');
        }
      }
    }, RETRY_CONFIGS.write);

    if (!result.success) {
      console.error('Failed to process calendar event after retries:', result.error);
    }
  } catch (error) {
    console.error('Error processing calendar event with conflict resolution:', error);
  }
}

/**
 * Check for conflicts when updating appointment from calendar event
 */
async function checkConflictsForUpdate(appointment: any, event: any, staff: any) {
  const conflicts = [];

  // Check for time conflicts
  const eventStart = new Date(event.start.dateTime || event.start.date);
  const eventEnd = new Date(event.end.dateTime || event.end.date);
  const appointmentStart = new Date(`${appointment.appointment_date}T${appointment.start_time}:00Z`);
  const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration_minutes * 60000);

  const timeDiff = Math.abs(eventStart.getTime() - appointmentStart.getTime());
  const durationDiff = Math.abs((eventEnd.getTime() - eventStart.getTime()) - 
                               (appointmentEnd.getTime() - appointmentStart.getTime()));

  if (timeDiff > 5 * 60 * 1000) { // More than 5 minutes difference
    conflicts.push({
      type: 'time_conflict',
      severity: 'medium',
      description: `Calendar event start time differs from appointment by ${Math.round(timeDiff / 60000)} minutes`,
    });
  }

  if (durationDiff > 5 * 60 * 1000) { // More than 5 minutes difference
    conflicts.push({
      type: 'time_conflict',
      severity: 'medium',
      description: `Calendar event duration differs from appointment by ${Math.round(durationDiff / 60000)} minutes`,
    });
  }

  return conflicts;
}

/**
 * Check for conflicts when linking calendar event to appointment
 */
async function checkConflictsForLink(appointment: any, event: any, staff: any) {
  const conflicts = [];

  // Check if appointment already has a Google Calendar event ID
  if (appointment.google_event_ids && appointment.google_event_ids[staff.id]) {
    conflicts.push({
      type: 'data_mismatch',
      severity: 'high',
      description: `Appointment ${appointment.id} already has a Google Calendar event ID for staff ${staff.id}`,
    });
  }

  // Check for time conflicts
  const eventStart = new Date(event.start.dateTime || event.start.date);
  const appointmentStart = new Date(`${appointment.appointment_date}T${appointment.start_time}:00Z`);
  
  const timeDiff = Math.abs(eventStart.getTime() - appointmentStart.getTime());
  
  if (timeDiff > 15 * 60 * 1000) { // More than 15 minutes difference
    conflicts.push({
      type: 'time_conflict',
      severity: 'medium',
      description: `Calendar event time differs from appointment by ${Math.round(timeDiff / 60000)} minutes`,
    });
  }

  return conflicts;
}

/**
 * Find appointment by Google Calendar event ID
 */
async function findAppointmentByGoogleEventId(eventId: string, staffId: string) {
  try {
    // Get all appointments for this staff member
    const appointments = await appointmentService.getAppointmentsByStaff(staffId);

    for (const appointment of appointments) {
      if (appointment.google_event_ids && appointment.google_event_ids[staffId] === eventId) {
        return appointment;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding appointment by Google event ID:', error);
    return null;
  }
}

/**
 * Find appointment by event details (fallback method)
 */
async function findAppointmentByEventDetails(event: any, staff: any) {
  try {
    // Extract appointment details from event summary and description
    const eventSummary = event.summary || '';
    const eventDescription = event.description || '';

    // Look for patient name in event summary
    const patientNameMatch = eventSummary.match(/- ([^-]+)$/);
    if (!patientNameMatch) {
      return null;
    }

    const patientName = patientNameMatch[1].trim();

    // Find patient by name
    const patients = await patientService.searchPatients({ name: patientName });
    if (patients.length === 0) {
      return null;
    }

    const patient = patients[0];

    // Find appointments for this patient and staff member
    const appointments = await appointmentService.getAppointmentsByPatientAndStaff(
      patient.id,
      staff.id
    );

    // Find the most recent appointment that matches the event time
    const eventStart = new Date(event.start.dateTime || event.start.date);

    for (const appointment of appointments) {
      const appointmentDate = new Date(appointment.appointment_date);
      const appointmentTime = appointment.start_time;

      // Check if dates and times match (within reasonable tolerance)
      if (isSameDate(appointmentDate, eventStart) &&
          isTimeClose(appointmentTime, eventStart.toTimeString().slice(0, 5))) {
        return appointment;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding appointment by event details:', error);
    return null;
  }
}

/**
 * Update appointment from Google Calendar event
 */
async function updateAppointmentFromCalendarEvent(appointment: any, event: any, staff: any) {
  try {
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);

    // Calculate duration in minutes
    const durationMinutes = Math.round((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60));

    // Update appointment details
    const updateData = {
      id: appointment.id,
      appointment_date: utcToDateString(eventStart),
      start_time: utcToTimeString(eventStart),
      duration_minutes: durationMinutes,
      notes: event.description || appointment.notes,
    };

    await appointmentService.updateAppointment(updateData);

    console.log(`Updated appointment ${appointment.id} from Google Calendar event ${event.id}`);
  } catch (error) {
    console.error('Error updating appointment from calendar event:', error);
  }
}

/**
 * Link Google Calendar event to existing appointment
 */
async function linkGoogleEventToAppointment(appointment: any, event: any, staff: any) {
  try {
    // Add Google Calendar event ID to appointment
    await appointmentService.addGoogleCalendarEventId(
      appointment.id,
      staff.id,
      event.id
    );

    // Update appointment staff assignment with Google Calendar event ID
    const staffAssignment = await appointmentStaffService.getStaffAssignment(
      appointment.id,
      staff.id
    );

    if (staffAssignment) {
      await appointmentStaffService.updateGoogleCalendarEventId(
        staffAssignment.id,
        event.id
      );
    }

    console.log(`Linked Google Calendar event ${event.id} to appointment ${appointment.id}`);
  } catch (error) {
    console.error('Error linking Google Calendar event to appointment:', error);
  }
}

/**
 * Helper function to check if two dates are the same
 */
function isSameDate(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Helper function to check if two times are close (within 15 minutes)
 */
function isTimeClose(time1: string, time2: string): boolean {
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);

  const totalMinutes1 = hours1 * 60 + minutes1;
  const totalMinutes2 = hours2 * 60 + minutes2;

  return Math.abs(totalMinutes1 - totalMinutes2) <= 15;
}

/**
 * GET endpoint for webhook verification (Google Calendar webhook setup)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    // Google Calendar webhook verification
    console.log('Google Calendar webhook verification challenge:', challenge);
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  return NextResponse.json({
    message: 'Google Calendar Webhook Handler',
    status: 'active'
  });
}
