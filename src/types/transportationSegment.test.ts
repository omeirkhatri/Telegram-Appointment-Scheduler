import {
    CreateTransportationSegment,
    PickupLocationType,
    TransportationSegment,
    TransportationSegmentFilters,
    TransportationSegmentLocation,
    TransportationSegmentStatus,
    TransportationSegmentType,
    UpdateTransportationSegment,
    isValidPickupLocationType,
    requiresPickupLocationReference,
} from './transportationSegment';

describe('TransportationSegment Types', () => {
  describe('TransportationSegmentType', () => {
    it('should have all required segment types', () => {
      const validTypes: TransportationSegmentType[] = [
        'pickup',
        'dropoff',
        'stay_with_staff',
        'metro_assist',
        'custom',
      ];

      validTypes.forEach(type => {
        expect(type).toBeDefined();
      });
    });
  });

  describe('TransportationSegmentStatus', () => {
    it('should have all required status values', () => {
      const validStatuses: TransportationSegmentStatus[] = [
        'draft',
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
      ];

      validStatuses.forEach(status => {
        expect(status).toBeDefined();
      });
    });
  });

  describe('PickupLocationType', () => {
    it('should have all required pickup location types', () => {
      const validTypes: PickupLocationType[] = [
        'office',
        'previous_appointment',
        'metro_station',
        'custom',
      ];

      validTypes.forEach(type => {
        expect(type).toBeDefined();
      });
    });
  });

  describe('TransportationSegmentLocation', () => {
    it('should create valid location object', () => {
      const location: TransportationSegmentLocation = {
        address: '123 Main St',
        lat: 40.7128,
        lng: -74.0060,
        building_name: 'Test Building',
      };

      expect(location.address).toBe('123 Main St');
      expect(location.lat).toBe(40.7128);
      expect(location.lng).toBe(-74.0060);
      expect(location.building_name).toBe('Test Building');
    });

    it('should handle location without building name', () => {
      const location: TransportationSegmentLocation = {
        address: '123 Main St',
        lat: 40.7128,
        lng: -74.0060,
      };

      expect(location.address).toBe('123 Main St');
      expect(location.lat).toBe(40.7128);
      expect(location.lng).toBe(-74.0060);
      expect(location.building_name).toBeUndefined();
    });
  });

  describe('TransportationSegment', () => {
    it('should create valid transportation segment', () => {
      const segment: TransportationSegment = {
        id: 'test-id',
        appointment_id: 'appointment-123',
        segment_type: 'pickup',
        title: 'Test Segment',
        planned_start: '2024-01-01T10:00:00Z',
        planned_end: '2024-01-01T11:00:00Z',
        driver_id: 'driver-123',
        travel_mode: 'driving',
        pickup_location: {
          address: '123 Main St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: {
          address: '456 Oak Ave',
          lat: 40.7589,
          lng: -73.9851,
        },
        pickup_location_type: 'office',
        pickup_location_reference: null,
        estimated_travel_minutes: 30,
        estimated_distance_km: 5.2,
        buffer_minutes: 20,
        instructions: 'Test instructions',
        requires_follow_up: false,
        status: 'scheduled',
        manual_override: false,
        google_event_id: null,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      expect(segment.id).toBe('test-id');
      expect(segment.appointment_id).toBe('appointment-123');
      expect(segment.segment_type).toBe('pickup');
      expect(segment.pickup_location_type).toBe('office');
      expect(segment.status).toBe('scheduled');
    });

    it('should handle segment with minimal required fields', () => {
      const segment: TransportationSegment = {
        id: 'test-id',
        appointment_id: 'appointment-123',
        segment_type: 'pickup',
        title: 'Test Segment',
        pickup_location_type: 'custom',
        status: 'draft',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      expect(segment.id).toBe('test-id');
      expect(segment.appointment_id).toBe('appointment-123');
      expect(segment.segment_type).toBe('pickup');
      expect(segment.pickup_location_type).toBe('custom');
      expect(segment.status).toBe('draft');
    });
  });

  describe('CreateTransportationSegment', () => {
    it('should create valid create segment request', () => {
      const createSegment: CreateTransportationSegment = {
        appointment_id: 'appointment-123',
        segment_type: 'pickup',
        title: 'Test Segment',
        pickup_location_type: 'office',
        status: 'draft',
      };

      expect(createSegment.appointment_id).toBe('appointment-123');
      expect(createSegment.segment_type).toBe('pickup');
      expect(createSegment.pickup_location_type).toBe('office');
      expect(createSegment.status).toBe('draft');
    });

    it('should handle create segment with all optional fields', () => {
      const createSegment: CreateTransportationSegment = {
        appointment_id: 'appointment-123',
        segment_type: 'pickup',
        title: 'Test Segment',
        planned_start: '2024-01-01T10:00:00Z',
        planned_end: '2024-01-01T11:00:00Z',
        driver_id: 'driver-123',
        travel_mode: 'driving',
        pickup_location: {
          address: '123 Main St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: {
          address: '456 Oak Ave',
          lat: 40.7589,
          lng: -73.9851,
        },
        pickup_location_type: 'office',
        pickup_location_reference: null,
        estimated_travel_minutes: 30,
        estimated_distance_km: 5.2,
        buffer_minutes: 20,
        instructions: 'Test instructions',
        requires_follow_up: false,
        status: 'scheduled',
        manual_override: false,
      };

      expect(createSegment.appointment_id).toBe('appointment-123');
      expect(createSegment.segment_type).toBe('pickup');
      expect(createSegment.pickup_location_type).toBe('office');
      expect(createSegment.estimated_travel_minutes).toBe(30);
    });
  });

  describe('UpdateTransportationSegment', () => {
    it('should create valid update segment request', () => {
      const updateSegment: UpdateTransportationSegment = {
        id: 'test-id',
        title: 'Updated Segment',
        status: 'completed',
      };

      expect(updateSegment.id).toBe('test-id');
      expect(updateSegment.title).toBe('Updated Segment');
      expect(updateSegment.status).toBe('completed');
    });

    it('should handle update segment with all fields', () => {
      const updateSegment: UpdateTransportationSegment = {
        id: 'test-id',
        segment_type: 'dropoff',
        title: 'Updated Segment',
        planned_start: '2024-01-01T10:00:00Z',
        planned_end: '2024-01-01T11:00:00Z',
        driver_id: 'driver-456',
        travel_mode: 'walking',
        pickup_location: {
          address: '789 Pine St',
          lat: 40.7505,
          lng: -73.9934,
        },
        patient_location: {
          address: '321 Elm St',
          lat: 40.7614,
          lng: -73.9776,
        },
        pickup_location_type: 'custom',
        pickup_location_reference: 'ref-123',
        estimated_travel_minutes: 45,
        estimated_distance_km: 7.8,
        buffer_minutes: 15,
        instructions: 'Updated instructions',
        requires_follow_up: true,
        status: 'in_progress',
      };

      expect(updateSegment.id).toBe('test-id');
      expect(updateSegment.segment_type).toBe('dropoff');
      expect(updateSegment.pickup_location_type).toBe('custom');
      expect(updateSegment.estimated_travel_minutes).toBe(45);
    });
  });

  describe('TransportationSegmentFilters', () => {
    it('should create valid filters object', () => {
      const filters: TransportationSegmentFilters = {
        appointment_id: 'appointment-123',
        driver_id: 'driver-123',
        segment_type: 'pickup',
        status: 'scheduled',
        requires_follow_up: true,
      };

      expect(filters.appointment_id).toBe('appointment-123');
      expect(filters.driver_id).toBe('driver-123');
      expect(filters.segment_type).toBe('pickup');
      expect(filters.status).toBe('scheduled');
      expect(filters.requires_follow_up).toBe(true);
    });

    it('should handle empty filters object', () => {
      const filters: TransportationSegmentFilters = {};

      expect(filters.appointment_id).toBeUndefined();
      expect(filters.driver_id).toBeUndefined();
      expect(filters.segment_type).toBeUndefined();
      expect(filters.status).toBeUndefined();
      expect(filters.requires_follow_up).toBeUndefined();
    });
  });

  describe('isValidPickupLocationType', () => {
    it('should validate valid pickup location types', () => {
      expect(isValidPickupLocationType('office')).toBe(true);
      expect(isValidPickupLocationType('previous_appointment')).toBe(true);
      expect(isValidPickupLocationType('metro_station')).toBe(true);
      expect(isValidPickupLocationType('custom')).toBe(true);
    });

    it('should reject invalid pickup location types', () => {
      expect(isValidPickupLocationType('invalid')).toBe(false);
      expect(isValidPickupLocationType('')).toBe(false);
      expect(isValidPickupLocationType(null as any)).toBe(false);
      expect(isValidPickupLocationType(undefined as any)).toBe(false);
    });
  });

  describe('requiresPickupLocationReference', () => {
    it('should require reference for previous_appointment type', () => {
      expect(requiresPickupLocationReference('previous_appointment')).toBe(true);
    });

    it('should require reference for metro_station type', () => {
      expect(requiresPickupLocationReference('metro_station')).toBe(true);
    });

    it('should not require reference for office type', () => {
      expect(requiresPickupLocationReference('office')).toBe(false);
    });

    it('should not require reference for custom type', () => {
      expect(requiresPickupLocationReference('custom')).toBe(false);
    });
  });
});

