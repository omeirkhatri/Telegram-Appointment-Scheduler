/**
 * Simple Calendar Event Delete API Endpoint
 *
 * Deletes calendar events directly using Google Calendar API without complex service initialization.
 */

import { apiErrorHandler, generateRequestId, ValidationError } from '@/lib/apiErrorHandler';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const DeleteEventRequestSchema = z.object({
  google_calendar_id: z.string().min(1, 'Google Calendar ID is required'),
  event_id: z.string().min(1, 'Event ID is required')
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /api/calendar/delete-simple - Delete a calendar event directly
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate request
    const validationResult = DeleteEventRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const { google_calendar_id, event_id } = validationResult.data;

    console.log('🔧 Deleting calendar event directly...');
    console.log('📅 Event data:', { google_calendar_id, event_id });

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

    console.log('🔧 Deleting event from calendar:', google_calendar_id);
    await calendar.events.delete({
      calendarId: google_calendar_id,
      eventId: event_id
    });

    console.log('✅ Calendar event deleted successfully:', event_id);

    return NextResponse.json({
      success: true,
      data: {
        eventId: event_id,
        google_calendar_id
      },
      message: 'Calendar event deleted successfully',
      timestamp: new Date().toISOString(),
      request_id: requestId
    });

  } catch (error) {
    console.error('❌ Failed to delete calendar event:', error);
    return apiErrorHandler.handleError(error, requestId, 'Delete simple calendar event');
  }
}
