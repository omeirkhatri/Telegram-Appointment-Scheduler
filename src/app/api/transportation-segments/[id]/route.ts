import { transportationSegmentService } from '@/services/transportationSegmentService';
import type { UpdateTransportationSegment } from '@/types/transportationSegment';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments/[id] - Get a single transportation segment by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const segment = await transportationSegmentService.getTransportationSegment(id);

    if (!segment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transportation segment not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: segment,
    });
  } catch (error) {
    console.error('Error fetching transportation segment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transportation segment',
      },
      { status: 500 },
    );
  }
}

// PUT /api/transportation-segments/[id] - Update an existing transportation segment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if segment exists
    const existingSegment = await transportationSegmentService.getTransportationSegment(id);
    if (!existingSegment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transportation segment not found',
        },
        { status: 404 },
      );
    }

    // Extract update data
    const updateData: Partial<UpdateTransportationSegment> = {
      segment_type: body.segment_type,
      title: body.title,
      planned_start: body.planned_start,
      planned_end: body.planned_end,
      driver_id: body.driver_id,
      travel_mode: body.travel_mode,
      origin: body.origin,
      destination: body.destination,
      estimated_travel_minutes: body.estimated_travel_minutes,
      estimated_distance_km: body.estimated_distance_km,
      buffer_minutes: body.buffer_minutes,
      instructions: body.instructions,
      requires_follow_up: body.requires_follow_up,
      status: body.status,
      manual_override: body.manual_override,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateTransportationSegment] === undefined) {
        delete updateData[key as keyof UpdateTransportationSegment];
      }
    });

    // Validate update data if any fields are being updated
    const validationErrors = validateSegmentUpdateData(updateData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    // Update segment
    const updatedSegment = await transportationSegmentService.updateTransportationSegment(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedSegment,
      message: 'Transportation segment updated successfully',
    });
  } catch (error) {
    console.error('Error updating transportation segment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update transportation segment',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/transportation-segments/[id] - Delete a transportation segment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check if segment exists
    const segment = await transportationSegmentService.getTransportationSegment(id);
    if (!segment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transportation segment not found',
        },
        { status: 404 },
      );
    }

    // Delete segment
    await transportationSegmentService.deleteTransportationSegment(id);

    return NextResponse.json({
      success: true,
      message: 'Transportation segment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transportation segment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete transportation segment',
      },
      { status: 500 },
    );
  }
}

// Helper function to validate segment update data
function validateSegmentUpdateData(data: Partial<UpdateTransportationSegment>): string[] {
  const errors: string[] = [];

  if (data.planned_start !== undefined && data.planned_end !== undefined) {
    const start = new Date(data.planned_start);
    const end = new Date(data.planned_end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('Invalid date format for planned start or end');
    } else if (end <= start) {
      errors.push('Planned end must be after planned start');
    }
  }

  if (data.title !== undefined && data.title.trim().length === 0) {
    errors.push('Title cannot be empty');
  }

  if (data.travel_mode !== undefined && data.travel_mode.trim().length === 0) {
    errors.push('Travel mode cannot be empty');
  }

  if (data.estimated_travel_minutes !== undefined && (data.estimated_travel_minutes < 0 || data.estimated_travel_minutes > 1440)) {
    errors.push('Estimated travel minutes must be between 0 and 1440');
  }

  if (data.estimated_distance_km !== undefined && (data.estimated_distance_km < 0 || data.estimated_distance_km > 10000)) {
    errors.push('Estimated distance must be between 0 and 10000 km');
  }

  if (data.buffer_minutes !== undefined && (data.buffer_minutes < 0 || data.buffer_minutes > 360)) {
    errors.push('Buffer minutes must be between 0 and 360');
  }

  return errors;
}
