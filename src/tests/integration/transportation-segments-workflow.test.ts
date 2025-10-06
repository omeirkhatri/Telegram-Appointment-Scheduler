import { transportationSegmentService } from '@/services/transportationSegmentService';
import type {
    CreateTransportationSegment,
    TransportationSegment,
    TransportationSegmentFilters,
    UpdateTransportationSegment,
} from '@/types/transportationSegment';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock feature flags
jest.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: jest.fn(() => true),
}));

// Mock other services
jest.mock('@/services/appointmentStaffService', () => ({
  appointmentStaffService: {
    getAppointmentStaff: jest.fn(),
  },
}));

jest.mock('@/services/auditTrailService', () => ({
  auditTrailService: {
    logTransportationSegmentOperation: jest.fn(),
    getTransportationSegmentOverrides: jest.fn(),
  },
}));

jest.mock('@/services/googleCalendarService', () => ({
  getGoogleCalendarService: jest.fn(),
}));

jest.mock('@/services/telegramNotificationService', () => ({
  telegramNotificationService: {
    sendTransportationSegmentNotification: jest.fn(),
  },
}));

describe('Transportation Segments Integration Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = require('@/lib/supabase').supabase;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Transportation Segment Workflow', () => {
    it('should create, update, and delete transportation segments', async () => {
      // Mock database responses
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Test data
      const createData: CreateTransportationSegment = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Test Pickup',
        pickup_location_type: 'office',
        pickup_location: {
          address: '123 Office St',
          lat: 40.7128,
          lng: -74.0060,
          building_name: 'Office Building',
        },
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
        },
        estimated_travel_minutes: 30,
        estimated_distance_km: 5.2,
        buffer_minutes: 20,
        instructions: 'Test instructions',
        status: 'draft',
      };

      // Mock creation response
      const createdSegment: TransportationSegment = {
        id: 'segment-1',
        ...createData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValueOnce({
        data: createdSegment,
        error: null,
      });

      // 1. Create transportation segment
      const created = await transportationSegmentService.createTransportationSegment(createData);
      expect(created).toEqual(createdSegment);
      expect(mockQuery.insert).toHaveBeenCalledWith([createData]);

      // Mock update response
      const updateData: UpdateTransportationSegment = {
        id: 'segment-1',
        title: 'Updated Pickup',
        status: 'scheduled',
        estimated_travel_minutes: 35,
      };

      const updatedSegment: TransportationSegment = {
        ...createdSegment,
        ...updateData,
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockQuery.single.mockResolvedValueOnce({
        data: updatedSegment,
        error: null,
      });

      // 2. Update transportation segment
      const updated = await transportationSegmentService.updateTransportationSegment(updateData);
      expect(updated).toEqual(updatedSegment);
      expect(mockQuery.update).toHaveBeenCalledWith(updateData);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'segment-1');

      // Mock deletion response
      mockQuery.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // 3. Delete transportation segment
      const deleted = await transportationSegmentService.deleteTransportationSegment('segment-1');
      expect(deleted).toBe(true);
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'segment-1');
    });

    it('should handle pickup location type workflow', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Test different pickup location types
      const pickupTypes = ['office', 'previous_appointment', 'metro_station', 'custom'];

      for (const pickupType of pickupTypes) {
        const segmentData: CreateTransportationSegment = {
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: `Test ${pickupType} pickup`,
          pickup_location_type: pickupType as any,
          pickup_location: {
            address: `123 ${pickupType} St`,
            lat: 40.7128,
            lng: -74.0060,
          },
          patient_location: {
            address: '456 Patient St',
            lat: 40.7589,
            lng: -73.9851,
          },
          status: 'draft',
        };

        const createdSegment: TransportationSegment = {
          id: `segment-${pickupType}`,
          ...segmentData,
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        };

        mockQuery.single.mockResolvedValueOnce({
          data: createdSegment,
          error: null,
        });

        const created = await transportationSegmentService.createTransportationSegment(segmentData);
        expect(created).toEqual(createdSegment);
        expect(created?.pickup_location_type).toBe(pickupType);
      }
    });

    it('should handle filtering and querying segments', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const mockSegments: TransportationSegment[] = [
        {
          id: 'segment-1',
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: 'Pickup 1',
          pickup_location_type: 'office',
          status: 'scheduled',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
        {
          id: 'segment-2',
          appointment_id: 'appointment-1',
          segment_type: 'dropoff',
          title: 'Dropoff 1',
          pickup_location_type: 'custom',
          status: 'completed',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
      ];

      mockQuery.select.mockResolvedValue({
        data: mockSegments,
        error: null,
      });

      // Test different filters
      const filters: TransportationSegmentFilters[] = [
        { appointment_id: 'appointment-1' },
        { driver_id: 'driver-1' },
        { segment_type: 'pickup' },
        { status: 'scheduled' },
        { requires_follow_up: true },
      ];

      for (const filter of filters) {
        const segments = await transportationSegmentService.getTransportationSegments(filter);
        expect(segments).toEqual(mockSegments);
        expect(mockQuery.select).toHaveBeenCalled();
      }
    });

    it('should handle manual override workflow', async () => {
      const { auditTrailService } = require('@/services/auditTrailService');
      auditTrailService.logTransportationSegmentOperation.mockResolvedValue({
        success: true,
      });

      const result = await transportationSegmentService.recordManualOverride(
        'segment-1',
        'appointment-1',
        'user-1',
        'Test User',
        'transportation_segment_override',
        'manual_requirement',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        {
          driver_conflicts: [],
          timing_conflicts: [],
          travel_buffer_issues: [],
          warnings_acknowledged: [],
        },
        'Test justification',
        false
      );

      expect(result.success).toBe(true);
      expect(auditTrailService.logTransportationSegmentOperation).toHaveBeenCalled();
    });

    it('should handle segment overrides retrieval', async () => {
      const { auditTrailService } = require('@/services/auditTrailService');
      auditTrailService.getTransportationSegmentOverrides.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'override-1',
            segment_id: 'segment-1',
            operation_type: 'transportation_segment_override',
            override_reason: 'manual_requirement',
            created_at: '2024-01-01T09:00:00Z',
          },
        ],
      });

      const result = await transportationSegmentService.getSegmentOverridesForAppointment('appointment-1');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(auditTrailService.getTransportationSegmentOverrides).toHaveBeenCalledWith({
        appointment_id: 'appointment-1',
        limit: 50,
        offset: 0,
      });
    });

    it('should handle error scenarios gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Test database errors
      mockQuery.select.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(transportationSegmentService.getTransportationSegments()).rejects.toThrow(
        'Failed to fetch transportation segments: Database connection failed'
      );

      // Test creation errors
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' },
      });

      const createData: CreateTransportationSegment = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location_type: 'office',
      };

      await expect(transportationSegmentService.createTransportationSegment(createData)).rejects.toThrow(
        'Failed to create transportation segment: Creation failed'
      );
    });

    it('should handle feature flag disabled scenario', async () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(false);

      const segments = await transportationSegmentService.getTransportationSegments();
      expect(segments).toEqual([]);

      const segment = await transportationSegmentService.getTransportationSegment('segment-1');
      expect(segment).toBeNull();

      const created = await transportationSegmentService.createTransportationSegment({
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location_type: 'office',
      });
      expect(created).toBeNull();

      const deleted = await transportationSegmentService.deleteTransportationSegment('segment-1');
      expect(deleted).toBe(false);
    });

    it('should handle time calculation workflow', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Test segment with time calculations
      const segmentData: CreateTransportationSegment = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Time Calculated Pickup',
        pickup_location_type: 'office',
        pickup_location: {
          address: '123 Office St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
        },
        estimated_travel_minutes: 30,
        estimated_distance_km: 5.2,
        buffer_minutes: 20,
        planned_start: '2024-01-01T10:00:00Z',
        planned_end: '2024-01-01T10:30:00Z',
        status: 'scheduled',
      };

      const createdSegment: TransportationSegment = {
        id: 'segment-time-1',
        ...segmentData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: createdSegment,
        error: null,
      });

      const created = await transportationSegmentService.createTransportationSegment(segmentData);
      expect(created).toEqual(createdSegment);
      expect(created?.estimated_travel_minutes).toBe(30);
      expect(created?.estimated_distance_km).toBe(5.2);
      expect(created?.buffer_minutes).toBe(20);
    });
  });
});

