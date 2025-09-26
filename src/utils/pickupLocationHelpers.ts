import type { Appointment } from '@/types';
import type { PickupLocationType, TransportationSegmentLocation } from '@/types/transportationSegment';

/**
 * Helper functions for pickup location type system
 */

export interface PickupLocationData {
  type: PickupLocationType;
  location: TransportationSegmentLocation | null;
  reference: string | null;
}

/**
 * Validates pickup location data based on type requirements
 */
export function validatePickupLocationData(data: PickupLocationData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.type) {
    errors.push('Pickup location type is required');
    return { isValid: false, errors };
  }

  if (!data.location) {
    errors.push('Pickup location is required');
    return { isValid: false, errors };
  }

  // Check if location has required coordinates
  if (data.location.lat === undefined || data.location.lng === undefined) {
    errors.push('Pickup location must have valid coordinates');
  }

  // Type-specific validation
  switch (data.type) {
    case 'office':
      if (data.reference !== 'office_location') {
        errors.push('Office location must have correct reference');
      }
      break;

    case 'previous_appointment':
      if (!data.reference) {
        errors.push('Previous appointment reference is required');
      }
      break;

    case 'metro_station':
      if (!data.reference) {
        errors.push('Metro station reference is required');
      }
      break;

    case 'custom':
      // Custom locations don't require a reference
      break;

    default:
      errors.push('Invalid pickup location type');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates pickup location data from office settings
 */
export function createOfficeLocationData(officeSettings: any): PickupLocationData {
  return {
    type: 'office',
    location: {
      lat: officeSettings.coordinates.lat,
      lng: officeSettings.coordinates.lng,
      address: officeSettings.address,
      formatted_address: officeSettings.address,
      city: officeSettings.address.split(',')[1]?.trim() || '',
      area: officeSettings.address.split(',')[0]?.trim() || '',
      building_name: officeSettings.name,
      place_id: 'office_location',
    },
    reference: 'office_location',
  };
}

/**
 * Creates pickup location data from previous appointment
 */
export function createPreviousAppointmentLocationData(
  appointment: Appointment,
  location: TransportationSegmentLocation
): PickupLocationData {
  return {
    type: 'previous_appointment',
    location,
    reference: appointment.id,
  };
}

/**
 * Creates pickup location data from metro station
 */
export function createMetroStationLocationData(
  station: any,
  location: TransportationSegmentLocation
): PickupLocationData {
  return {
    type: 'metro_station',
    location,
    reference: station.id,
  };
}

/**
 * Creates pickup location data from custom location
 */
export function createCustomLocationData(location: TransportationSegmentLocation): PickupLocationData {
  return {
    type: 'custom',
    location,
    reference: null,
  };
}

/**
 * Gets display label for pickup location type
 */
export function getPickupLocationTypeDisplayLabel(type: PickupLocationType): string {
  const labels: Record<PickupLocationType, string> = {
    office: 'From Office',
    previous_appointment: 'From Previous Appointment',
    metro_station: 'From Metro Station',
    custom: 'From Custom Location',
  };
  return labels[type];
}

/**
 * Gets description for pickup location type
 */
export function getPickupLocationTypeDescription(type: PickupLocationType): string {
  const descriptions: Record<PickupLocationType, string> = {
    office: 'Pick up from the main office location',
    previous_appointment: 'Pick up from a previous patient appointment location',
    metro_station: 'Pick up from a metro/subway station',
    custom: 'Pick up from a custom address or location',
  };
  return descriptions[type];
}

/**
 * Checks if pickup location type requires a reference
 */
export function requiresPickupLocationReference(type: PickupLocationType): boolean {
  return type === 'previous_appointment' || type === 'metro_station';
}

/**
 * Gets the reference display text for a pickup location
 */
export function getPickupLocationReferenceDisplay(
  type: PickupLocationType,
  reference: string | null
): string {
  if (!reference) return 'No reference';

  switch (type) {
    case 'office':
      return 'Office Location';
    case 'previous_appointment':
      return `Appointment ${reference}`;
    case 'metro_station':
      return `Metro Station ${reference}`;
    case 'custom':
      return 'Custom Location';
    default:
      return reference;
  }
}

/**
 * Creates a summary of pickup location data for display
 */
export function createPickupLocationSummary(data: PickupLocationData): {
  type: string;
  location: string;
  reference: string;
  coordinates: string;
} {
  return {
    type: getPickupLocationTypeDisplayLabel(data.type),
    location: data.location?.formatted_address || data.location?.address || 'No location',
    reference: getPickupLocationReferenceDisplay(data.type, data.reference),
    coordinates: data.location
      ? `${data.location.lat.toFixed(6)}, ${data.location.lng.toFixed(6)}`
      : 'No coordinates',
  };
}

/**
 * Checks if pickup location data is complete and valid
 */
export function isPickupLocationDataComplete(data: PickupLocationData): boolean {
  const validation = validatePickupLocationData(data);
  return validation.isValid;
}

/**
 * Gets pickup location type from reference string
 */
export function getPickupLocationTypeFromReference(reference: string | null): PickupLocationType | null {
  if (!reference) return null;

  if (reference === 'office_location') return 'office';
  if (reference.startsWith('appointment_')) return 'previous_appointment';
  if (reference.startsWith('metro_')) return 'metro_station';

  return 'custom';
}

/**
 * Creates pickup location data from existing segment data
 */
export function createPickupLocationDataFromSegment(
  pickupLocationType: PickupLocationType,
  pickupLocation: TransportationSegmentLocation | null,
  pickupLocationReference: string | null
): PickupLocationData {
  return {
    type: pickupLocationType,
    location: pickupLocation,
    reference: pickupLocationReference,
  };
}

/**
 * Resets pickup location data to default state
 */
export function resetPickupLocationData(): PickupLocationData {
  return {
    type: 'office',
    location: null,
    reference: null,
  };
}
