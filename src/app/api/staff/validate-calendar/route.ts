import { googleCalendarService } from '@/services/googleCalendarService';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/staff/validate-calendar - Validate Google Calendar ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { calendarId } = body;

    if (!calendarId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Calendar ID is required',
        },
        { status: 400 },
      );
    }

    // Basic format validation
    const basicFormatValid = calendarId.includes('@') && calendarId.includes('.');
    if (!basicFormatValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Google Calendar ID format',
          details: 'Calendar ID must be a valid email address or special Google Calendar ID',
        },
        { status: 400 },
      );
    }

    // Try to validate with Google Calendar service if available
    let isConnected = false;
    let validationMessage = 'Google Calendar ID format is valid';

    try {
      const isValidFormat = googleCalendarService.validateCalendarId(calendarId);
      if (!isValidFormat) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid Google Calendar ID format',
            details: 'Calendar ID must be a valid email address or special Google Calendar ID',
          },
          { status: 400 },
        );
      }

      // Test connection
      isConnected = await googleCalendarService.testCalendarConnection(calendarId);

      if (!isConnected) {
        // If connection test failed, it might be due to missing Google Calendar configuration
        // In that case, we should still allow the calendar ID if the format is valid
        validationMessage = 'Google Calendar ID format is valid (connection test failed - may be due to missing Google Calendar configuration)';
        isConnected = false;
      } else {
        validationMessage = 'Google Calendar ID is valid and accessible';
      }
    } catch (error) {
      // If Google Calendar service is not configured, just validate format
      console.warn('Google Calendar service not configured, performing basic validation only:', error);
      validationMessage = 'Google Calendar ID format is valid (connection not tested - Google Calendar not configured)';
      isConnected = false; // We can't verify connection without proper configuration
    }

    return NextResponse.json({
      success: true,
      message: validationMessage,
      data: {
        calendarId,
        isValid: true,
        isConnected: isConnected,
      },
    });
  } catch (error) {
    console.error('Error validating calendar ID:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate calendar ID',
      },
      { status: 500 },
    );
  }
}
