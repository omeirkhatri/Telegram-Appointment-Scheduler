import { getGoogleCalendarService } from '@/services/googleCalendarService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EventExistsRequestSchema = z.object({
  google_calendar_id: z.string().min(1, 'Google Calendar ID is required'),
  google_event_id: z.string().min(1, 'Google Event ID is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = EventExistsRequestSchema.safeParse(body);

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

    const { google_calendar_id, google_event_id } = validationResult.data;

    // Get Google Calendar service
    const googleCalendarService = getGoogleCalendarService();

    // Wait for service initialization
    let attempts = 0;
    const maxAttempts = 10;
    while (!googleCalendarService.isInitialized && attempts < maxAttempts) {
      console.log(`⏳ Waiting for Google Calendar service initialization in event-exists... (attempt ${attempts + 1}/${maxAttempts})`);
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

    // Check if event exists
    const exists = await googleCalendarService.eventExists(google_calendar_id, google_event_id);

    return NextResponse.json({
      success: true,
      data: {
        google_calendar_id,
        google_event_id,
        exists,
        checked_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error checking event existence:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to check event existence',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

