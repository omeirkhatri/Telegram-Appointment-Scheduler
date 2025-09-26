import type { Appointment } from '@/types';
import type { PickupLocationType, TransportationSegmentLocation } from '@/types/transportationSegment';

/**
 * Validation utilities for pickup location type-specific requirements
 */

export interface PickupLocationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates pickup location type selection
 */
export function validatePickupLocationType(type: PickupLocationType): PickupLocationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!type) {
    errors.push('Pickup location type is required');
    return { isValid: false, errors, warnings };
  }

  const validTypes: PickupLocationType[] = ['office', 'previous_appointment', 'metro_station', 'custom'];
  if (!validTypes.includes(type)) {
    errors.push('Invalid pickup location type');
    return { isValid: false, errors, warnings };
  }

  return { isValid: true, errors, warnings };
}

/**
 * Validates pickup location coordinates
 */
export function validatePickupLocationCoordinates(location: TransportationSegmentLocation | null): PickupLocationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!location) {
    errors.push('Pickup location is required');
    return { isValid: false, errors, warnings };
  }

  if (location.lat === undefined || location.lng === undefined) {
    errors.push('Pickup location must have valid coordinates');
    return { isValid: false, errors, warnings };
  }

  // Check if coordinates are within reasonable bounds (Dubai area)
  const isWithinDubai = location.lat >= 24.5 && location.lat <= 25.5 &&
                       location.lng >= 54.5 && location.lng <= 56.0;

  if (!isWithinDubai) {
    warnings.push('Pickup location appears to be outside Dubai area');
  }

  // Check for valid latitude range
  if (location.lat < -90 || location.lat > 90) {
    errors.push('Invalid latitude value');
  }

  // Check for valid longitude range
  if (location.lng < -180 || location.lng > 180) {
    errors.push('Invalid longitude value');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates pickup location reference based on type
 */
export function validatePickupLocationReference(
  type: PickupLocationType,
  reference: string | null,
  appointments?: Appointment[]
): PickupLocationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (type) {
    case 'office':
      if (reference !== 'office_location') {
        errors.push('Office location must have correct reference');
      }
      break;

    case 'previous_appointment':
      if (!reference) {
        errors.push('Previous appointment reference is required');
      } else if (appointments) {
        const appointmentExists = appointments.some(apt => apt.id === reference);
        if (!appointmentExists) {
          errors.push('Referenced appointment does not exist');
        } else {
          const appointment = appointments.find(apt => apt.id === reference);
          if (appointment && appointment.status === 'cancelled') {
            warnings.push('Referenced appointment is cancelled');
          }
        }
      }
      break;

    case 'metro_station':
      if (!reference) {
        errors.push('Metro station reference is required');
      } else if (!reference.startsWith('metro_')) {
        errors.push('Invalid metro station reference format');
      }
      break;

    case 'custom':
      // Custom locations don't require a reference
      break;

    default:
      errors.push('Invalid pickup location type');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validates complete pickup location data
 */
export function validatePickupLocationData(
  type: PickupLocationType,
  location: TransportationSegmentLocation | null,
  reference: string | null,
  appointments?: Appointment[]
): PickupLocationValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate type
  const typeValidation = validatePickupLocationType(type);
  allErrors.push(...typeValidation.errors);
  allWarnings.push(...typeValidation.warnings);

  // Validate coordinates
  const coordinatesValidation = validatePickupLocationCoordinates(location);
  allErrors.push(...coordinatesValidation.errors);
  allWarnings.push(...coordinatesValidation.warnings);

  // Validate reference
  const referenceValidation = validatePickupLocationReference(type, reference, appointments);
  allErrors.push(...referenceValidation.errors);
  allWarnings.push(...referenceValidation.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Validates pickup location for specific business rules
 */
export function validatePickupLocationBusinessRules(
  type: PickupLocationType,
  location: TransportationSegmentLocation | null,
  reference: string | null,
  appointments?: Appointment[]
): PickupLocationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if location has address information
  if (location && !location.address && !location.formatted_address) {
    warnings.push('Pickup location should have an address for better navigation');
  }

  // Check for previous appointment specific rules
  if (type === 'previous_appointment' && reference && appointments) {
    const appointment = appointments.find(apt => apt.id === reference);
    if (appointment) {
      // Check if appointment is too old (more than 30 days)
      const appointmentDate = new Date(appointment.appointment_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (appointmentDate < thirtyDaysAgo) {
        warnings.push('Referenced appointment is more than 30 days old');
      }

      // Check if appointment has pickup instructions
      if (!appointment.pickup_instructions) {
        warnings.push('Referenced appointment has no pickup instructions');
      }
    }
  }

  // Check for metro station specific rules
  if (type === 'metro_station' && location) {
    // Check if location is near a metro station (within 500m)
    const metroStations = [
      { name: 'Union', lat: 25.2555, lng: 55.3662 },
      { name: 'BurJuman', lat: 25.2561, lng: 55.3665 },
      { name: 'Dubai Healthcare City', lat: 25.2621, lng: 55.3695 },
    ];

    const isNearMetroStation = metroStations.some(station => {
      const distance = calculateDistance(
        location.lat, location.lng,
        station.lat, station.lng
      );
      return distance < 0.5; // 500 meters
    });

    if (!isNearMetroStation) {
      warnings.push('Location may not be near a metro station');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculates distance between two coordinates in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Gets validation summary for display
 */
export function getPickupLocationValidationSummary(validation: PickupLocationValidationResult): {
  status: 'valid' | 'warning' | 'error';
  message: string;
  details: string[];
} {
  if (!validation.isValid) {
    return {
      status: 'error',
      message: 'Pickup location has validation errors',
      details: validation.errors,
    };
  }

  if (validation.warnings.length > 0) {
    return {
      status: 'warning',
      message: 'Pickup location has warnings',
      details: validation.warnings,
    };
  }

  return {
    status: 'valid',
    message: 'Pickup location is valid',
    details: [],
  };
}
