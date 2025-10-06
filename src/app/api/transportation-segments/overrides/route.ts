import { auditTrailService } from '@/services/auditTrailService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments/overrides - Get transportation segment overrides
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const segmentId = searchParams.get('segment_id');
    const appointmentId = searchParams.get('appointment_id');
    const userId = searchParams.get('user_id');
    const operationType = searchParams.get('operation_type') as any;
    const requiresFollowUp = searchParams.get('requires_follow_up');
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

    // Get transportation segment overrides
    const result = await auditTrailService.getTransportationSegmentOverrides({
      segment_id: segmentId || undefined,
      appointment_id: appointmentId || undefined,
      user_id: userId || undefined,
      operation_type: operationType || undefined,
      requires_follow_up: requiresFollowUp ? requiresFollowUp === 'true' : undefined,
      limit,
      offset,
    });

    if (!result.success) {
      // If the table doesn't exist, return empty results instead of error
      if (result.error?.includes('relation "transportation_segment_override_audit" does not exist')) {
        return NextResponse.json({
          success: true,
          data: {
            overrides: [],
            total_count: 0,
            has_more: false,
          },
          message: 'Transportation segment overrides retrieved successfully (table not yet created)',
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to retrieve transportation segment overrides',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Transportation segment overrides retrieved successfully',
    });

  } catch (error) {
    console.error('Error retrieving transportation segment overrides:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve transportation segment overrides',
      },
      { status: 500 },
    );
  }
}

// POST /api/transportation-segments/overrides - Create a transportation segment override
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'segment_id',
      'appointment_id',
      'operation_type',
      'override_reason',
      'user_id',
      'conflict_details',
      'override_justification',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`,
          },
          { status: 400 },
        );
      }
    }

    // Validate operation_type
    const validOperationTypes = [
      'transportation_segment_override',
      'driver_reassignment_override',
      'timing_override',
    ];
    if (!validOperationTypes.includes(body.operation_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid operation_type',
        },
        { status: 400 },
      );
    }

    // Validate override_reason
    const validOverrideReasons = [
      'driver_conflict',
      'timing_conflict',
      'travel_buffer_insufficient',
      'manual_requirement',
      'emergency_override',
    ];
    if (!validOverrideReasons.includes(body.override_reason)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid override_reason',
        },
        { status: 400 },
      );
    }

    // Create transportation segment override
    const result = await auditTrailService.createTransportationSegmentOverride({
      segment_id: body.segment_id,
      appointment_id: body.appointment_id,
      operation_type: body.operation_type,
      override_reason: body.override_reason,
      user_id: body.user_id,
      user_name: body.user_name,
      original_driver_id: body.original_driver_id,
      new_driver_id: body.new_driver_id,
      original_planned_start: body.original_planned_start,
      new_planned_start: body.new_planned_start,
      original_planned_end: body.original_planned_end,
      new_planned_end: body.new_planned_end,
      conflict_details: body.conflict_details,
      override_justification: body.override_justification,
      requires_follow_up: body.requires_follow_up || false,
      metadata: body.metadata || {},
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create transportation segment override',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        override_id: result.audit_trail_id,
      },
      message: 'Transportation segment override created successfully',
    });

  } catch (error) {
    console.error('Error creating transportation segment override:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transportation segment override',
      },
      { status: 500 },
    );
  }
}
