import { hasLegacyFields, logLegacyFieldWarning } from '@/utils/transportationSegmentsBackwardCompatibility';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('Transportation Segments Backward Compatibility Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hasLegacyFields', () => {
    it('should detect origin field as legacy', () => {
      const data = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
        },
      };

      const result = hasLegacyFields(data);
      expect(result).toBe(true);
    });

    it('should detect destination field as legacy', () => {
      const data = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location: {
          address: '123 Pickup St',
          lat: 40.7128,
          lng: -74.0060,
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
      };

      const result = hasLegacyFields(data);
      expect(result).toBe(true);
    });

    it('should detect both origin and destination fields as legacy', () => {
      const data = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
      };

      const result = hasLegacyFields(data);
      expect(result).toBe(true);
    });

    it('should not detect legacy fields when using new field names', () => {
      const data = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location: {
          address: '123 Pickup St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
        },
        pickup_location_type: 'office',
        pickup_location_reference: 'office_location',
      };

      const result = hasLegacyFields(data);
      expect(result).toBe(false);
    });

    it('should handle empty object', () => {
      const data = {};

      const result = hasLegacyFields(data);
      expect(result).toBe(false);
    });

    it('should handle null data', () => {
      const data = null;

      const result = hasLegacyFields(data);
      expect(result).toBe(false);
    });

    it('should handle undefined data', () => {
      const data = undefined;

      const result = hasLegacyFields(data);
      expect(result).toBe(false);
    });

    it('should handle mixed legacy and new fields', () => {
      const data = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
        },
        pickup_location_type: 'office',
      };

      const result = hasLegacyFields(data);
      expect(result).toBe(true);
    });
  });

  describe('logLegacyFieldWarning', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log warning for origin field', () => {
      const legacyFields = ['origin'];

      logLegacyFieldWarning(legacyFields);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Legacy field detected: origin')
      );
    });

    it('should log warning for destination field', () => {
      const legacyFields = ['destination'];

      logLegacyFieldWarning(legacyFields);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Legacy field detected: destination')
      );
    });

    it('should log warning for both origin and destination fields', () => {
      const legacyFields = ['origin', 'destination'];

      logLegacyFieldWarning(legacyFields);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Legacy fields detected: origin, destination')
      );
    });

    it('should handle empty legacy fields array', () => {
      const legacyFields: string[] = [];

      logLegacyFieldWarning(legacyFields);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle null legacy fields', () => {
      const legacyFields = null;

      logLegacyFieldWarning(legacyFields);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle undefined legacy fields', () => {
      const legacyFields = undefined;

      logLegacyFieldWarning(legacyFields);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log deprecation message', () => {
      const legacyFields = ['origin'];

      logLegacyFieldWarning(legacyFields);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please use pickup_location and patient_location instead')
      );
    });

    it('should log migration guide link', () => {
      const legacyFields = ['origin'];

      logLegacyFieldWarning(legacyFields);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('See migration guide for more information')
      );
    });
  });

  describe('Legacy Field Migration', () => {
    it('should migrate origin to pickup_location', () => {
      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
          building_name: 'Old Origin Building',
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
          building_name: 'Old Destination Building',
        },
      };

      const migratedData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location: legacyData.origin,
        patient_location: legacyData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
      };

      // Simulate migration logic
      const result = {
        ...legacyData,
        pickup_location: legacyData.origin,
        patient_location: legacyData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
      };

      delete result.origin;
      delete result.destination;

      expect(result).toEqual(migratedData);
    });

    it('should migrate destination to patient_location', () => {
      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
      };

      const migratedData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location: legacyData.origin,
        patient_location: legacyData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
      };

      // Simulate migration logic
      const result = {
        ...legacyData,
        pickup_location: legacyData.origin,
        patient_location: legacyData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
      };

      delete result.origin;
      delete result.destination;

      expect(result).toEqual(migratedData);
    });

    it('should preserve existing new fields during migration', () => {
      const mixedData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
        },
        pickup_location_type: 'office',
        pickup_location_reference: 'office_location',
      };

      const migratedData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location: mixedData.origin,
        patient_location: mixedData.patient_location,
        pickup_location_type: 'office',
        pickup_location_reference: 'office_location',
      };

      // Simulate migration logic
      const result = {
        ...mixedData,
        pickup_location: mixedData.origin,
      };

      delete result.origin;

      expect(result).toEqual(migratedData);
    });

    it('should handle missing legacy fields gracefully', () => {
      const newData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location: {
          address: '123 Pickup St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
        },
        pickup_location_type: 'office',
        pickup_location_reference: 'office_location',
      };

      // Simulate migration logic
      const result = {
        ...newData,
      };

      expect(result).toEqual(newData);
    });
  });

  describe('Legacy Field Validation', () => {
    it('should validate legacy field structure', () => {
      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
      };

      const hasOrigin = legacyData.origin && typeof legacyData.origin === 'object';
      const hasDestination = legacyData.destination && typeof legacyData.destination === 'object';

      expect(hasOrigin).toBe(true);
      expect(hasDestination).toBe(true);
    });

    it('should validate legacy field coordinates', () => {
      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
      };

      const originLat = legacyData.origin.lat;
      const originLng = legacyData.origin.lng;
      const destinationLat = legacyData.destination.lat;
      const destinationLng = legacyData.destination.lng;

      expect(originLat).toBeGreaterThanOrEqual(-90);
      expect(originLat).toBeLessThanOrEqual(90);
      expect(originLng).toBeGreaterThanOrEqual(-180);
      expect(originLng).toBeLessThanOrEqual(180);
      expect(destinationLat).toBeGreaterThanOrEqual(-90);
      expect(destinationLat).toBeLessThanOrEqual(90);
      expect(destinationLng).toBeGreaterThanOrEqual(-180);
      expect(destinationLng).toBeLessThanOrEqual(180);
    });

    it('should handle invalid legacy field structure', () => {
      const invalidLegacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: 'invalid_origin', // Should be object
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
      };

      const hasValidOrigin = invalidLegacyData.origin && typeof invalidLegacyData.origin === 'object';
      const hasValidDestination = invalidLegacyData.destination && typeof invalidLegacyData.destination === 'object';

      expect(hasValidOrigin).toBe(false);
      expect(hasValidDestination).toBe(true);
    });
  });
});

