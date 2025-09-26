import { transportationSegmentService } from '@/services/transportationSegmentService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments/conflicts - Check for driver conflicts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const driverId = searchParams.get('driver_id');
    const plannedStart = searchParams.get('planned_start');
    const plannedEnd = searchParams.get('planned_end');
    const excludeSegmentId = searchParams.get('exclude_segment_id');

    if (!driverId || !plannedStart || !plannedEnd) {
      return NextResponse.json(
        {
          success: false,
          error: 'driver_id, planned_start, and planned_end are required',
        },
        { status: 400 },
      );
    }

    const conflicts = await transportationSegmentService.checkDriverConflicts(
      driverId,
      plannedStart,
      plannedEnd,
      excludeSegmentId || undefined
    );

    return NextResponse.json({
      success: true,
      data: conflicts,
    });
  } catch (error) {
    console.error('Error checking driver conflicts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check driver conflicts',
      },
      { status: 500 },
    );
  }
}
