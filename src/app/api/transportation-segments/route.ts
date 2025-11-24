import { isDriverAssignmentOverhaulEnabled } from '@/lib/featureFlags';
import { transportationSegmentFiltersSchema, transportationSegmentFormSchema } from '@/lib/validations/transportationSegment';
import { transportationSegmentService } from '@/services/transportationSegmentService';
import type { CreateTransportationSegment, TransportationSegmentFilters } from '@/types/transportationSegment';
import { isValidPickupLocationType, requiresPickupLocationReference } from '@/types/transportationSegment';
import { hasLegacyFields, logLegacyFieldWarning } from '@/utils/transportationSegmentsBackwardCompatibility';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/transportation-segments - Get all transportation segments with optional filtering
export async function GET(request: NextRequest) {
  try {
    // Check if driver assignment overhaul is enabled
    if (!isDriverAssignmentOverhaulEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transportation segments API is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL is not enabled.',
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate filters from query parameters
    const rawFilters: Record<string, any> = {};

    // Extract all query parameters
    for (const [key, value] of searchParams.entries()) {
      if (key === 'requires_follow_up' || key === 'unassigned_only') {
        rawFilters[key] = value === 'true';
      } else if (value) {
        rawFilters[key] = value;
      }
    }

    // Validate filters using schema
    const validationResult = transportationSegmentFiltersSchema.safeParse(rawFilters);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filter parameters',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    const filters: TransportationSegmentFilters = validationResult.data;

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
    // Check if driver assignment overhaul is enabled
    if (!isDriverAssignmentOverhaulEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transportation segments API is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL is not enabled.',
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Check for legacy fields and log warning
    if (hasLegacyFields(body)) {
      const legacyFields = [];
      if (body.origin) legacyFields.push('origin');
      if (body.destination) legacyFields.push('destination');
      logLegacyFieldWarning(legacyFields);
    }

    // Extract segment data with backward compatibility
    const segmentData: CreateTransportationSegment = {
      appointment_id: body.appointment_id,
      segment_type: body.segment_type,
      title: body.title,
      planned_start: body.planned_start,
      planned_end: body.planned_end,
      driver_id: body.driver_id,
      travel_mode: body.travel_mode,
      // Support both old and new field names for backward compatibility
      pickup_location: body.pickup_location || body.origin,
      patient_location: body.patient_location || body.destination,
      pickup_location_type: body.pickup_location_type || 'custom',
      pickup_location_reference: body.pickup_location_reference,
      estimated_travel_minutes: body.estimated_travel_minutes,
      estimated_distance_km: body.estimated_distance_km,
      buffer_minutes: body.buffer_minutes,
      instructions: body.instructions,
      requires_follow_up: body.requires_follow_up,
      status: body.status || 'draft',
      manual_override: body.manual_override,
      // New assignment mode fields
      assignment_mode: body.assignment_mode || 'assign_now',
      priority: body.priority || null,
      recommended_driver_ids: body.recommended_driver_ids || [],
      recommendation_metadata: body.recommendation_metadata || {},
    };

    // Validate segment data using schema
    const validationResult = transportationSegmentFormSchema.safeParse(segmentData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    // Additional business logic validation
    const validationErrors = validateSegmentData(segmentData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Business logic validation failed',
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

  // Validate pickup location type
  if (!data.pickup_location_type) {
    errors.push('Pickup location type is required');
  } else if (!isValidPickupLocationType(data.pickup_location_type)) {
    errors.push('Invalid pickup location type. Must be one of: office, previous_appointment, metro_station, custom');
  }

  // Validate pickup location reference for types that require it
  if (data.pickup_location_type && requiresPickupLocationReference(data.pickup_location_type)) {
    if (!data.pickup_location_reference?.trim()) {
      errors.push(`Pickup location reference is required for ${data.pickup_location_type} pickup type`);
    }
  }

  // Validate pickup location type-specific requirements
  if (data.pickup_location_type) {
    switch (data.pickup_location_type) {
      case 'previous_appointment':
        if (!data.pickup_location_reference?.trim()) {
          errors.push('Previous appointment ID is required for pickup from previous appointment');
        }
        break;
      case 'metro_station':
        if (!data.pickup_location_reference?.trim()) {
          errors.push('Metro station ID is required for pickup from metro station');
        }
        break;
      case 'office':
        // Office pickup doesn't require a reference, but should have a valid office location
        if (!data.pickup_location) {
          errors.push('Office pickup location is required for office pickup type');
        }
        break;
      case 'custom':
        // Custom pickup requires a valid pickup location
        if (!data.pickup_location) {
          errors.push('Custom pickup location is required for custom pickup type');
        }
        break;
    }
  }

  // Validate that pickup and patient locations are provided
  if (!data.pickup_location) {
    errors.push('Pickup location is required');
  }

  if (!data.patient_location) {
    errors.push('Patient location is required');
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
