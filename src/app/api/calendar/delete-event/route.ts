import { apiErrorHandler, generateRequestId, ValidationError } from '@/lib/apiErrorHandler';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const DeleteEventRequestSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID format'),
  google_calendar_id: z.string().min(1, 'Google Calendar ID is required'),
  google_event_id: z.string().min(1, 'Google Event ID is required'),
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * DELETE /api/calendar/delete-event - Delete a calendar event
 * This endpoint directly uses the Google Calendar API after ensuring the service is initialized.
 */
export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();
    const validationResult = DeleteEventRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const { staff_id, google_calendar_id, google_event_id } = validationResult.data;

    // Ensure Google Calendar service is initialized
    const googleCalendarService = getGoogleCalendarService();
    let attempts = 0;
    const maxAttempts = 10;
    while (!googleCalendarService.isInitialized && attempts < maxAttempts) {
      console.log(`⏳ Waiting for Google Calendar service initialization in delete-event... (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!googleCalendarService.isInitialized) {
      console.error('❌ Google Calendar service failed to initialize within timeout period in delete-event');
      return NextResponse.json({
        success: false,
        error: 'Google Calendar service not available',
        error_code: 'SERVICE_UNAVAILABLE',
        error_description: 'Google Calendar service failed to initialize',
        suggested_actions: ['Check Google Calendar configuration', 'Retry after a few moments'],
        retryable: true,
        timestamp: new Date().toISOString(),
        request_id: requestId
      }, { status: 503 });
    }

    // Use the initialized calendar client directly
    const calendar = googleCalendarService['calendar']; // Access private member for direct use

    if (!calendar) {
      throw new Error('Google Calendar client not available after initialization');
    }

    // Delete the event from Google Calendar
    await calendar.events.delete({
      calendarId: google_calendar_id,
      eventId: google_event_id,
    });

    console.log(`✅ Successfully deleted calendar event ${google_event_id} from calendar ${google_calendar_id}`);

    return NextResponse.json({
      success: true,
      data: {
        staff_id,
        google_calendar_id,
        google_event_id,
        deleted_at: new Date().toISOString()
      },
      message: 'Calendar event deleted successfully',
      timestamp: new Date().toISOString(),
      request_id: requestId
    }, { status: 200 });

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Delete Calendar Event');
  }
}

