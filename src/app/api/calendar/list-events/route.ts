import { getGoogleCalendarService } from '@/services/googleCalendarService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ListEventsRequestSchema = z.object({
  google_calendar_id: z.string().min(1, 'Google Calendar ID is required'),
  max_results: z.number().min(1).max(100).optional().default(50),
  time_min: z.string().optional(),
  time_max: z.string().optional(),
  single_events: z.boolean().optional().default(true),
  order_by: z.enum(['startTime', 'updated']).optional().default('startTime')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = ListEventsRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        validation_errors: validationErrors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const {
      google_calendar_id,
      max_results,
      time_min,
      time_max,
      single_events,
      order_by
    } = validationResult.data;

    // Get Google Calendar service
    const googleCalendarService = getGoogleCalendarService();

    // Wait for service initialization
    let attempts = 0;
    const maxAttempts = 10;
    while (!googleCalendarService.isInitialized && attempts < maxAttempts) {
      console.log(`⏳ Waiting for Google Calendar service initialization in list-events... (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!googleCalendarService.isInitialized) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar service not available',
        error_code: 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    // List events from the calendar
    const events = await googleCalendarService.listEvents(google_calendar_id, {
      maxResults: max_results,
      timeMin: time_min,
      timeMax: time_max,
      singleEvents: single_events,
      orderBy: order_by
    });

    return NextResponse.json({
      success: true,
      data: {
        google_calendar_id,
        events,
        total_events: events.length,
        requested_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error listing events:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to list events',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

