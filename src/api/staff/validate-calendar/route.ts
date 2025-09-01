import { NextRequest, NextResponse } from 'next/server';
import { googleCalendarService } from '@/services/googleCalendarService';

// POST /api/staff/validate-calendar - Validate Google Calendar ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { calendarId } = body;

    if (!calendarId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Calendar ID is required' 
        },
        { status: 400 }
      );
    }

    // Validate format
    const isValidFormat = googleCalendarService.validateCalendarId(calendarId);
    if (!isValidFormat) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Google Calendar ID format',
          details: 'Calendar ID must be a valid email address or special Google Calendar ID'
        },
        { status: 400 }
      );
    }

    // Test connection
    const isConnected = await googleCalendarService.testCalendarConnection(calendarId);
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unable to connect to Google Calendar',
          details: 'Please check the calendar ID and ensure the calendar is accessible'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Google Calendar ID is valid and accessible',
      data: {
        calendarId,
        isValid: true,
        isConnected: true
      }
    });
  } catch (error) {
    console.error('Error validating calendar ID:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to validate calendar ID' 
      },
      { status: 500 }
    );
  }
}
