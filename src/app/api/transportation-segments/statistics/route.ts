import { transportationSegmentService } from '@/services/transportationSegmentService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments/statistics - Get segment statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const statistics = await transportationSegmentService.getSegmentStatistics(
      dateFrom || undefined,
      dateTo || undefined
    );

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching segment statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch segment statistics',
      },
      { status: 500 },
    );
  }
}
