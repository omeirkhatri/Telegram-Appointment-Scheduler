import { auditTrailService } from '@/services/auditTrailService';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/transportation-segments/overrides/[id]/follow-up - Update follow-up reminder status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const overrideId = params.id;
    const body = await request.json();

    // Validate required fields
    if (typeof body.reminder_sent !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid reminder_sent field',
        },
        { status: 400 },
      );
    }

    // Update follow-up reminder status
    const result = await auditTrailService.updateTransportationSegmentOverrideFollowUp(
      overrideId,
      body.reminder_sent
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to update follow-up reminder status',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Follow-up reminder status updated successfully',
    });

  } catch (error) {
    console.error('Error updating follow-up reminder status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update follow-up reminder status',
      },
      { status: 500 },
    );
  }
}
