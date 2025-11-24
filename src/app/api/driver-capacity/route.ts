import { isDriverAssignmentOverhaulEnabled } from '@/lib/featureFlags';
import { driverCapacityQuerySchema } from '@/lib/validations/transportationSegment';
import { transportationSegmentService } from '@/services/transportationSegmentService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/driver-capacity - Get aggregated driver capacity and availability metrics
export async function GET(request: NextRequest) {
  try {
    // Check if driver assignment overhaul is enabled
    if (!isDriverAssignmentOverhaulEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Driver capacity API is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL is not enabled.',
        },
        { status: 403 },
      );
    }
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const rawQuery: Record<string, any> = {};

    // Extract all query parameters
    for (const [key, value] of searchParams.entries()) {
      if (key === 'window_hours') {
        rawQuery[key] = parseInt(value) || 24;
      } else if (key === 'include_unassigned') {
        rawQuery[key] = value === 'true';
      } else if (value) {
        rawQuery[key] = value;
      }
    }

    // Validate query parameters using schema
    const validationResult = driverCapacityQuerySchema.safeParse(rawQuery);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      );
    }

    const validatedData = validationResult.data;
    const { start_date, end_date, window_hours, include_unassigned, service_line } = validatedData;

    // Calculate date range if not provided
    const now = new Date();
    const defaultStartDate = start_date || now.toISOString();
    const defaultEndDate = end_date || new Date(now.getTime() + window_hours * 60 * 60 * 1000).toISOString();

    // Get capacity metrics
    const capacityMetrics = await transportationSegmentService.getDriverCapacityMetrics({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      windowHours: window_hours,
      includeUnassigned: include_unassigned,
      serviceLine: service_line || undefined,
    });

    return NextResponse.json({
      success: true,
      data: capacityMetrics,
      meta: {
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        windowHours: window_hours,
        includeUnassigned: include_unassigned,
        serviceLine: service_line,
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching driver capacity metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch driver capacity metrics',
      },
      { status: 500 },
    );
  }
}
