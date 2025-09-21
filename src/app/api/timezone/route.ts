import { NextRequest, NextResponse } from 'next/server';
import { 
  createApiResponse, 
  createErrorResponse, 
  buildTimezoneContext,
  shouldIncludeTimezoneMetadata,
  getApiVersion
} from '@/lib/apiUtils';
import { resolveTimezone, getAvailableTimezones, isValidTimezone } from '@/utils/timezone';

// GET /api/timezone - Get timezone information and resolution
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timezone = searchParams.get('timezone');
    const locationId = searchParams.get('location_id');
    const organizationId = searchParams.get('organization_id');

    // Build timezone context
    const timezoneContext = await buildTimezoneContext(request);
    const timezoneResolution = resolveTimezone(timezoneContext);
    const includeMetadata = shouldIncludeTimezoneMetadata(request);
    const apiVersion = getApiVersion(request);

    // If a specific timezone is requested, validate it
    if (timezone) {
      if (!isValidTimezone(timezone)) {
        const errorResponse = createErrorResponse(
          `Invalid timezone: ${timezone}`,
          { availableTimezones: getAvailableTimezones().slice(0, 10) }, // Show first 10 as example
          request
        );
        return NextResponse.json(errorResponse, { status: 400 });
      }
    }

    const responseData = {
      resolved: timezoneResolution,
      context: {
        explicitTimezone: timezoneContext.explicitTimezone,
        locationTimezone: timezoneContext.locationTimezone,
        organizationTimezone: timezoneContext.organizationTimezone,
        fallbackTimezone: timezoneContext.fallbackTimezone,
        preferLegacyFallback: timezoneContext.preferLegacyFallback,
      },
      availableTimezones: getAvailableTimezones(),
      apiVersion,
      features: {
        timezoneResolution: true,
        locationOverride: Boolean(timezoneContext.locationTimezone),
        organizationOverride: Boolean(timezoneContext.organizationTimezone),
        legacyFallback: timezoneContext.preferLegacyFallback ?? false,
      },
    };

    const response = createApiResponse(responseData, request, includeMetadata ? timezoneResolution : undefined);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching timezone info:', error);
    const errorResponse = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch timezone info',
      undefined,
      request
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// POST /api/timezone/resolve - Resolve timezone from context
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      explicitTimezone, 
      locationTimezone, 
      organizationTimezone, 
      fallbackTimezone,
      preferLegacyFallback = true 
    } = body;

    const timezoneContext = {
      explicitTimezone,
      locationTimezone,
      organizationTimezone,
      fallbackTimezone,
      preferLegacyFallback,
    };

    const timezoneResolution = resolveTimezone(timezoneContext);
    const includeMetadata = shouldIncludeTimezoneMetadata(request);

    const responseData = {
      resolution: timezoneResolution,
      context: timezoneContext,
      valid: isValidTimezone(timezoneResolution.timezone),
    };

    const response = createApiResponse(responseData, request, includeMetadata ? timezoneResolution : undefined);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error resolving timezone:', error);
    const errorResponse = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to resolve timezone',
      undefined,
      request
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
