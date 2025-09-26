/**
 * Backward compatibility utilities for transportation segments API
 *
 * This module provides utilities to help with the transition from the old
 * origin/destination terminology to the new pickup_location/patient_location
 * terminology.
 */

import type { CreateTransportationSegment, UpdateTransportationSegment } from '@/types/transportationSegment';

/**
 * Legacy request body interface for backward compatibility
 */
export interface LegacyCreateTransportationSegmentRequest {
  appointment_id: string;
  segment_type: string;
  title?: string;
  planned_start?: string;
  planned_end?: string;
  driver_id?: string | null;
  travel_mode?: string | null;
  origin?: any; // Legacy field
  destination?: any; // Legacy field
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: number | null;
  buffer_minutes?: number | null;
  instructions?: string | null;
  requires_follow_up?: boolean | null;
  status?: string;
  manual_override?: boolean | null;
}

export interface LegacyUpdateTransportationSegmentRequest {
  segment_type?: string;
  title?: string;
  planned_start?: string;
  planned_end?: string;
  driver_id?: string | null;
  travel_mode?: string | null;
  origin?: any; // Legacy field
  destination?: any; // Legacy field
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: number | null;
  buffer_minutes?: number | null;
  instructions?: string | null;
  requires_follow_up?: boolean;
  status?: string;
  manual_override?: boolean;
}

/**
 * Converts legacy request body to new format with backward compatibility
 */
export function convertLegacyCreateRequest(
  legacyRequest: LegacyCreateTransportationSegmentRequest
): CreateTransportationSegment {
  return {
    appointment_id: legacyRequest.appointment_id,
    segment_type: legacyRequest.segment_type as any,
    title: legacyRequest.title,
    planned_start: legacyRequest.planned_start,
    planned_end: legacyRequest.planned_end,
    driver_id: legacyRequest.driver_id,
    travel_mode: legacyRequest.travel_mode,
    // Map legacy fields to new fields
    pickup_location: legacyRequest.origin,
    patient_location: legacyRequest.destination,
    pickup_location_type: 'custom', // Default for legacy requests
    pickup_location_reference: null,
    estimated_travel_minutes: legacyRequest.estimated_travel_minutes,
    estimated_distance_km: legacyRequest.estimated_distance_km,
    buffer_minutes: legacyRequest.buffer_minutes,
    instructions: legacyRequest.instructions,
    requires_follow_up: legacyRequest.requires_follow_up,
    status: (legacyRequest.status as any) || 'draft',
    manual_override: legacyRequest.manual_override,
  };
}

/**
 * Converts legacy update request to new format with backward compatibility
 */
export function convertLegacyUpdateRequest(
  legacyRequest: LegacyUpdateTransportationSegmentRequest
): Partial<UpdateTransportationSegment> {
  const updateData: Partial<UpdateTransportationSegment> = {
    segment_type: legacyRequest.segment_type as any,
    title: legacyRequest.title,
    planned_start: legacyRequest.planned_start,
    planned_end: legacyRequest.planned_end,
    driver_id: legacyRequest.driver_id,
    travel_mode: legacyRequest.travel_mode,
    estimated_travel_minutes: legacyRequest.estimated_travel_minutes,
    estimated_distance_km: legacyRequest.estimated_distance_km,
    buffer_minutes: legacyRequest.buffer_minutes,
    instructions: legacyRequest.instructions,
    requires_follow_up: legacyRequest.requires_follow_up,
    status: legacyRequest.status as any,
    manual_override: legacyRequest.manual_override,
  };

  // Map legacy fields to new fields if provided
  if (legacyRequest.origin !== undefined) {
    updateData.pickup_location = legacyRequest.origin;
  }
  if (legacyRequest.destination !== undefined) {
    updateData.patient_location = legacyRequest.destination;
  }

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof UpdateTransportationSegment] === undefined) {
      delete updateData[key as keyof UpdateTransportationSegment];
    }
  });

  return updateData;
}

/**
 * Converts new response format to legacy format for backward compatibility
 */
export function convertToLegacyResponse(segment: any): any {
  return {
    ...segment,
    // Add legacy field names for backward compatibility
    origin: segment.pickup_location,
    destination: segment.patient_location,
  };
}

/**
 * Validates if a request contains legacy field names
 */
export function hasLegacyFields(request: any): boolean {
  return 'origin' in request || 'destination' in request;
}

/**
 * Logs a deprecation warning for legacy field usage
 */
export function logLegacyFieldWarning(fields: string[]): void {
  console.warn(
    `[DEPRECATED] The following fields are deprecated and will be removed in a future version: ${fields.join(', ')}. ` +
    `Please use the new field names: ${fields.map(f => f === 'origin' ? 'pickup_location' : 'patient_location').join(', ')}.`
  );
}

/**
 * Migration helper to update existing data from legacy format
 */
export function migrateLegacySegment(legacySegment: any): any {
  return {
    ...legacySegment,
    pickup_location: legacySegment.origin,
    patient_location: legacySegment.destination,
    pickup_location_type: 'custom', // Default for migrated segments
    pickup_location_reference: null,
    // Remove legacy fields
    origin: undefined,
    destination: undefined,
  };
}
