import { transportationSegmentService } from '@/services/transportationSegmentService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments/availability - Check driver availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const driverId = searchParams.get('driver_id');
    const startTime = searchParams.get('start_time');
    const endTime = searchParams.get('end_time');

    if (!driverId || !startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'driver_id, start_time, and end_time are required',
        },
        { status: 400 },
      );
    }

    const availability = await transportationSegmentService.getDriverAvailability(
      driverId,
      startTime,
      endTime
    );

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('Error checking driver availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check driver availability',
      },
      { status: 500 },
    );
  }
}
