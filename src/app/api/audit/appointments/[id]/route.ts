import { auditTrailService } from '@/services';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/audit/appointments/[id] - Get audit trail for an appointment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const appointmentId = params.id;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Limit must be between 1 and 100',
        },
        { status: 400 },
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Offset must be non-negative',
        },
        { status: 400 },
      );
    }

    // Get audit trail
    const result = await auditTrailService.getAuditTrail({
      appointment_id: appointmentId,
      limit,
      offset,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to retrieve audit trail',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Audit trail retrieved successfully',
    });

  } catch (error) {
    console.error('Error retrieving audit trail:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve audit trail',
      },
      { status: 500 },
    );
  }
}
