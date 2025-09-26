/**
 * Calendar Event Creation API Endpoint
 *
 * Creates calendar events for appointments in staff calendars.
 */

import { apiErrorHandler, generateRequestId, ValidationError } from '@/lib/apiErrorHandler';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
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
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required')
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /api/calendar/create-event - Create a calendar event
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

    const { staff_id, google_calendar_id, event_title, event_description, start_time, end_time } = validationResult.data;

    // Get Google Calendar service
    console.log('🔧 Getting Google Calendar service...');
    const googleCalendarService = getGoogleCalendarService();
    console.log('🔧 Google Calendar service obtained, isInitialized:', googleCalendarService.isInitialized);

    // Wait for service to initialize if needed
    let attempts = 0;
    const maxAttempts = 10;
    while (!googleCalendarService.isInitialized && attempts < maxAttempts) {
      console.log(`⏳ Waiting for Google Calendar service initialization... (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!googleCalendarService.isInitialized) {
      console.error('❌ Google Calendar service failed to initialize within timeout period');
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

    console.log('✅ Google Calendar service is ready, creating event...');

    // Create the calendar event
    const result = await googleCalendarService.createEvent({
      staff_id,
      google_calendar_id,
      event_title,
      event_description: event_description || '',
      start_time,
      end_time
    });

    console.log('📅 Calendar event creation result:', result);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.errorMessage || 'Failed to create calendar event',
        error_code: result.errorCode || 'EVENT_CREATION_FAILED',
        error_description: result.errorMessage || 'Failed to create calendar event',
        suggested_actions: ['Check your Google Calendar configuration', 'Verify staff calendar access'],
        retryable: true,
        timestamp: new Date().toISOString(),
        request_id: requestId
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        eventId: result.eventId,
        eventUrl: result.eventUrl,
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
    return apiErrorHandler.handleError(error, requestId, 'Create calendar event');
  }
}
