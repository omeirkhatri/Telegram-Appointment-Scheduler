import { transportationSegmentService } from '@/services/transportationSegmentService';
import type { CreateTransportationSegment, TransportationSegmentFilters } from '@/types/transportationSegment';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments - Get all transportation segments with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query parameters
    const filters: TransportationSegmentFilters = {};

    if (searchParams.has('appointment_id')) {
      filters.appointment_id = searchParams.get('appointment_id')!;
    }

    if (searchParams.has('driver_id')) {
      filters.driver_id = searchParams.get('driver_id')!;
    }

    if (searchParams.has('segment_type')) {
      filters.segment_type = searchParams.get('segment_type') as any;
    }

    if (searchParams.has('status')) {
      filters.status = searchParams.get('status') as any;
    }

    if (searchParams.has('requires_follow_up')) {
      filters.requires_follow_up = searchParams.get('requires_follow_up') === 'true';
    }

    const segments = await transportationSegmentService.getTransportationSegments(filters);

    return NextResponse.json({
      success: true,
      data: segments,
      count: segments.length,
    });
  } catch (error) {
    console.error('Error fetching transportation segments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transportation segments',
      },
      { status: 500 },
    );
  }
}

// POST /api/transportation-segments - Create a new transportation segment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract segment data
    const segmentData: CreateTransportationSegment = {
      appointment_id: body.appointment_id,
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
      status: body.status || 'draft',
      manual_override: body.manual_override,
    };

    // Validate required fields
    const validationErrors = validateSegmentData(segmentData);
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

    // Create segment
    const segment = await transportationSegmentService.createTransportationSegment(segmentData);

    return NextResponse.json({
      success: true,
      data: segment,
      message: 'Transportation segment created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating transportation segment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transportation segment',
      },
      { status: 500 },
    );
  }
}

// Helper function to validate segment data
function validateSegmentData(data: CreateTransportationSegment): string[] {
  const errors: string[] = [];

  if (!data.appointment_id?.trim()) {
    errors.push('Appointment ID is required');
  }

  if (!data.segment_type) {
    errors.push('Segment type is required');
  }

  if (data.planned_start && data.planned_end) {
    const start = new Date(data.planned_start);
    const end = new Date(data.planned_end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('Invalid date format for planned start or end');
    } else if (end <= start) {
      errors.push('Planned end must be after planned start');
    }
  }

  if (data.title && data.title.trim().length === 0) {
    errors.push('Title cannot be empty');
  }

  if (data.travel_mode && data.travel_mode.trim().length === 0) {
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
