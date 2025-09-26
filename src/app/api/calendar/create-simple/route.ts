/**
 * Simple Calendar Event Creation API Endpoint
 *
 * Creates calendar events directly using Google Calendar API without complex service initialization.
 */

import { apiErrorHandler, generateRequestId, ValidationError } from '@/lib/apiErrorHandler';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const CreateEventRequestSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID format'),
  google_calendar_id: z.string().min(1, 'Google Calendar ID is required'),
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
 * POST /api/calendar/create-simple - Create a calendar event directly
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate request
    const validationResult = CreateEventRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const { staff_id, google_calendar_id, event_title, event_description, location, start_time, end_time } = validationResult.data;

    console.log('🔧 Creating calendar event directly...');
    console.log('📅 Event data:', { staff_id, google_calendar_id, event_title, start_time, end_time });

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

    // Create the event
    const eventResource = {
      summary: event_title,
      description: event_description || '',
      location: location || '',
      start: {
        dateTime: start_time,
        timeZone: 'Asia/Dubai'
      },
      end: {
        dateTime: end_time,
        timeZone: 'Asia/Dubai'
      }
    };

    console.log('🔧 Creating event in calendar:', google_calendar_id);
    const response = await calendar.events.insert({
      calendarId: google_calendar_id,
      resource: eventResource
    });

    const eventId = response.data.id;
    const eventUrl = response.data.htmlLink;

    console.log('✅ Calendar event created successfully:', eventId);

    return NextResponse.json({
      success: true,
      data: {
        eventId,
        eventUrl,
        staff_id,
        google_calendar_id,
        event_title,
        start_time,
        end_time
      },
      message: 'Calendar event created successfully',
      timestamp: new Date().toISOString(),
      request_id: requestId
    });

  } catch (error) {
    console.error('❌ Failed to create calendar event:', error);
    return apiErrorHandler.handleError(error, requestId, 'Create simple calendar event');
  }
}
