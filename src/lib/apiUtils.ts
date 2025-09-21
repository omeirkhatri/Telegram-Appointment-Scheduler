import type { NextRequest } from 'next/server';
import { config } from '@/lib/env';
import { getLocationTimezone, getOrganizationTimezone } from '@/services/timezoneContextService';
import { resolveTimezone, isValidTimezone, type TimezoneContext, type TimezoneResolution } from '@/utils/timezone';
import type { ApiResponse, ApiResponseMetadata, TimezoneAwareAppointment, TimezoneContextQuery, ApiVersionQuery } from '@/types/api';

export function parseTimezoneContextQuery(request: NextRequest): TimezoneContextQuery {
  const { searchParams } = new URL(request.url);
  
  // Check headers first, then query parameters
  const timezoneHeader = request.headers.get('x-timezone') || request.headers.get('timezone');
  const locationHeader = request.headers.get('x-location-id') || request.headers.get('location-id');
  const organizationHeader = request.headers.get('x-organization-id') || request.headers.get('organization-id');
  const includeMetadataHeader = request.headers.get('x-include-timezone-metadata') || request.headers.get('include-timezone-metadata');
  
  return {
    timezone: timezoneHeader || searchParams.get('timezone') || undefined,
    location_id: locationHeader || searchParams.get('location_id') || undefined,
    organization_id: organizationHeader || searchParams.get('organization_id') || undefined,
    include_timezone_metadata: includeMetadataHeader === 'true' || searchParams.get('include_timezone_metadata') === 'true',
  };
}

export function parseApiVersionQuery(request: NextRequest): ApiVersionQuery {
  const { searchParams } = new URL(request.url);
  
  return {
    version: searchParams.get('version') || searchParams.get('api_version') || undefined,
  };
}

export function getApiVersion(request: NextRequest): string {
  // Check for version in headers first (X-API-Version, API-Version)
  const headerVersion = request.headers.get('x-api-version') || request.headers.get('api-version');
  
  // Then check query parameters
  const versionQuery = parseApiVersionQuery(request);
  const queryVersion = versionQuery.version;
  
  // Use header version if available, otherwise query version, otherwise default
  const apiVersion = headerVersion || queryVersion || '1.0';
  
  // Validate version format (semantic versioning)
  const versionPattern = /^\d+\.\d+(\.\d+)?$/;
  if (!versionPattern.test(apiVersion)) {
    return '1.0'; // Default to 1.0 for invalid versions
  }
  
  return apiVersion;
}

export function shouldIncludeTimezoneMetadata(request: NextRequest): boolean {
  const timezoneQuery = parseTimezoneContextQuery(request);
  return timezoneQuery.include_timezone_metadata === true;
}

export async function buildTimezoneContext(request: NextRequest): Promise<TimezoneContext> {
  const timezoneQuery = parseTimezoneContextQuery(request);
  const explicitTimezone = timezoneQuery.timezone?.trim() || undefined;

  const [organization, location] = await Promise.all([
    getOrganizationTimezone(timezoneQuery.organization_id),
    timezoneQuery.location_id ? getLocationTimezone(timezoneQuery.location_id) : Promise.resolve(null),
  ]);

  const organizationTimezone = organization?.defaultTimezone ?? null;
  const locationTimezone = location?.timezone ?? null;

  const fallbackCandidates: Array<string | null | undefined> = [
    organizationTimezone,
    ...config.timezone.getEnvironmentFallbacks(),
    config.timezone.legacy,
  ];

  const fallbackTimezone = fallbackCandidates.find(value => typeof value === 'string' && isValidTimezone(value)) || undefined;
  const preferLegacyFallback = !explicitTimezone && !locationTimezone && !organizationTimezone;

  return config.timezone.buildResolverContext({
    explicitTimezone,
    locationTimezone,
    organizationTimezone,
    fallbackTimezone,
    preferLegacyFallback,
  });
}

export function buildApiResponseMetadata(
  request: NextRequest,
  timezoneResolution?: TimezoneResolution,
  requestId?: string
): ApiResponseMetadata {
  const apiVersion = getApiVersion(request);
  const includeTimezone = shouldIncludeTimezoneMetadata(request);
  
  return {
    timezone: includeTimezone && timezoneResolution ? timezoneResolution : undefined,
    apiVersion,
    generatedAt: new Date().toISOString(),
    requestId,
  };
}

export function createApiResponse<T>(
  data: T,
  request: NextRequest,
  timezoneResolution?: TimezoneResolution,
  requestId?: string
): ApiResponse<T> {
  const metadata = buildApiResponseMetadata(request, timezoneResolution, requestId);
  
  return {
    success: true,
    data,
    metadata,
  };
}

export function createErrorResponse(
  error: string,
  details?: any,
  request?: NextRequest,
  requestId?: string
): ApiResponse {
  const metadata = request ? buildApiResponseMetadata(request) : {
    generatedAt: new Date().toISOString(),
    requestId,
  };
  
  return {
    success: false,
    error,
    details,
    metadata,
  };
}

export function enhanceAppointmentWithTimezone(
  appointment: any,
  timezoneResolution: TimezoneResolution
): TimezoneAwareAppointment {
  const { formatInResolvedTimezone } = require('@/utils/timezone');
  
  // Calculate end time
  const startTime = appointment.start_time;
  const durationMinutes = appointment.duration_minutes;
  const [hours, minutes] = startTime.split(':').map(Number);
  const endMinutes = (hours * 60 + minutes + durationMinutes);
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  
  return {
    ...appointment,
    local_time: {
      appointment_date: appointment.appointment_date,
      start_time: startTime,
      end_time: endTime,
      timezone: timezoneResolution.timezone,
      timezone_abbreviation: timezoneResolution.abbreviation,
      offset_minutes: timezoneResolution.offsetMinutes,
    },
  };
}

export function getApiVersionInfo(): { version: string; supportedVersions: string[]; timezoneSupport: boolean; features: string[] } {
  return {
    version: '1.1',
    supportedVersions: ['1.0', '1.1'],
    timezoneSupport: true,
    features: [
      'timezone_metadata',
      'local_time_fields',
      'versioned_responses',
      'backward_compatibility',
    ],
  };
}

export function isVersionSupported(version: string): boolean {
  const supportedVersions = ['1.0', '1.1'];
  return supportedVersions.includes(version);
}

export function shouldUseLegacyFormat(version: string): boolean {
  return version === '1.0';
}

export function formatResponseForVersion<T>(
  data: T,
  request: NextRequest,
  timezoneResolution?: TimezoneResolution
): ApiResponse<T> {
  const apiVersion = getApiVersion(request);
  const useLegacyFormat = shouldUseLegacyFormat(apiVersion);
  const includeTimezone = shouldIncludeTimezoneMetadata(request);
  
  if (useLegacyFormat) {
    // Return legacy format without timezone metadata
    return {
      success: true,
      data,
      metadata: {
        apiVersion,
        generatedAt: new Date().toISOString(),
      },
    };
  }
  
  // Return enhanced format with timezone metadata if requested
  return createApiResponse(data, request, includeTimezone ? timezoneResolution : undefined);
}

export async function addVersionHeaders(response: Response, request: NextRequest): Promise<Response> {
  const apiVersion = getApiVersion(request);
  const timezoneQuery = parseTimezoneContextQuery(request);
  const includeTimezone = timezoneQuery.include_timezone_metadata === true;

  // Add version header
  response.headers.set('X-API-Version', apiVersion);
  
  // Add timezone header if timezone metadata is requested
  if (includeTimezone) {
    const timezoneContext = await buildTimezoneContext(request);
    const timezoneResolution = resolveTimezone(timezoneContext);

    response.headers.set('X-Timezone', timezoneResolution.timezone);
    response.headers.set('X-Timezone-Offset', timezoneResolution.offsetMinutes.toString());
    response.headers.set('X-Timezone-Abbreviation', timezoneResolution.abbreviation);
  }
  
  // Add feature flags
  response.headers.set('X-Features', 'timezone-metadata,versioned-responses,backward-compatibility');
  
  return response;
}

export function validateApiVersion(request: NextRequest): { valid: boolean; version: string; error?: string } {
  const apiVersion = getApiVersion(request);
  const isSupported = isVersionSupported(apiVersion);
  
  if (!isSupported) {
    return {
      valid: false,
      version: apiVersion,
      error: `Unsupported API version: ${apiVersion}. Supported versions: 1.0, 1.1`,
    };
  }
  
  return {
    valid: true,
    version: apiVersion,
  };
}
