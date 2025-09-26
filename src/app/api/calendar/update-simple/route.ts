/**
 * Simple Calendar Event Update API Endpoint
 *
 * Updates calendar events directly using Google Calendar API without complex service initialization.
 */

import { apiErrorHandler, generateRequestId, ValidationError } from '@/lib/apiErrorHandler';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const UpdateEventRequestSchema = z.object({
  google_calendar_id: z.string().min(1, 'Google Calendar ID is required'),
  event_id: z.string().min(1, 'Event ID is required'),
  event_title: z.string().min(1, 'Event title is required'),
  event_description: z.string().optional(),
  location: z.string().optional(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required')
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /api/calendar/update-simple - Update a calendar event directly
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate request
    const validationResult = UpdateEventRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const { google_calendar_id, event_id, event_title, event_description, location, start_time, end_time } = validationResult.data;

    console.log('🔧 Updating calendar event directly...');
    console.log('📅 Event data:', { google_calendar_id, event_id, event_title, start_time, end_time });

    // Get service account credentials directly from environment
    const serviceAccountKey = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY not found');
    }

    // Decode base64 credentials
    const credentials = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
    console.log('🔧 Service account credentials loaded');

    // Create GoogleAuth client with service account credentials
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    // Get the auth client
    const authClient = await auth.getClient();
    console.log('🔧 Auth client created');

    // Initialize calendar API
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    console.log('🔧 Calendar API initialized');

    // First get the existing event
    console.log('🔧 Fetching existing event...');
    const existingEvent = await calendar.events.get({
      calendarId: google_calendar_id,
      eventId: event_id
    });

    // Update the event with new data
    const updatedEvent = {
      ...existingEvent.data,
      summary: event_title,
      description: event_description || existingEvent.data.description || '',
      location: location || existingEvent.data.location || '',
      start: {
        dateTime: start_time,
        timeZone: 'Asia/Dubai'
      },
      end: {
        dateTime: end_time,
        timeZone: 'Asia/Dubai'
      }
    };

    console.log('🔧 Updating event in calendar:', google_calendar_id);
    const response = await calendar.events.update({
      calendarId: google_calendar_id,
      eventId: event_id,
      resource: updatedEvent
    });

    const eventId = response.data.id;
    const eventUrl = response.data.htmlLink;

    console.log('✅ Calendar event updated successfully:', eventId);

    return NextResponse.json({
      success: true,
      data: {
        eventId,
        eventUrl,
        google_calendar_id,
        event_title,
        start_time,
        end_time
      },
      message: 'Calendar event updated successfully',
      timestamp: new Date().toISOString(),
      request_id: requestId
    });

  } catch (error) {
    console.error('❌ Failed to update calendar event:', error);
    return apiErrorHandler.handleError(error, requestId, 'Update simple calendar event');
  }
}
