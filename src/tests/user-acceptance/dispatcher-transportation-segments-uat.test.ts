import { transportationSegmentService } from '@/services/transportationSegmentService';
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

describe('Dispatcher Transportation Segments User Acceptance Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = require('@/lib/supabase').supabase;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('UAT Scenario 1: Creating Transportation Segment with Office Pickup', () => {
    it('should allow dispatcher to create transportation segment with office pickup location', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const segmentData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Office to Patient Pickup',
        pickup_location_type: 'office',
        pickup_location: {
          address: '123 Main Office St, New York, NY 10001',
          lat: 40.7128,
          lng: -74.0060,
          building_name: 'MediCare Headquarters',
        },
        patient_location: {
          address: '456 Patient St, New York, NY 10002',
          lat: 40.7589,
          lng: -73.9851,
          building_name: 'Patient Building',
        },
        estimated_travel_minutes: 25,
        estimated_distance_km: 4.2,
        buffer_minutes: 20,
        instructions: 'Call patient 10 minutes before arrival',
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-1',
        ...segmentData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: createdSegment,
        error: null,
      });

      // UAT: Dispatcher creates transportation segment
      const result = await transportationSegmentService.createTransportationSegment(segmentData);

      // UAT: Verify segment was created successfully
      expect(result).toEqual(createdSegment);
      expect(result?.pickup_location_type).toBe('office');
      expect(result?.pickup_location?.building_name).toBe('MediCare Headquarters');
      expect(result?.patient_location?.address).toBe('456 Patient St, New York, NY 10002');
      expect(result?.estimated_travel_minutes).toBe(25);
      expect(result?.buffer_minutes).toBe(20);
      expect(result?.instructions).toBe('Call patient 10 minutes before arrival');
    });
  });

  describe('UAT Scenario 2: Creating Transportation Segment with Previous Appointment Pickup', () => {
    it('should allow dispatcher to create transportation segment with previous appointment pickup', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const segmentData = {
        appointment_id: 'appointment-2',
        segment_type: 'pickup',
        title: 'Previous Appointment to New Patient',
        pickup_location_type: 'previous_appointment',
        pickup_location_reference: 'appointment-1',
        pickup_location: {
          address: '789 Previous Patient St, New York, NY 10003',
          lat: 40.7505,
          lng: -73.9934,
          building_name: 'Previous Patient Building',
        },
        patient_location: {
          address: '321 New Patient St, New York, NY 10004',
          lat: 40.7614,
          lng: -73.9776,
          building_name: 'New Patient Building',
        },
        estimated_travel_minutes: 15,
        estimated_distance_km: 2.8,
        buffer_minutes: 10,
        instructions: 'Continue from previous appointment location',
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-2',
        ...segmentData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: createdSegment,
        error: null,
      });

      // UAT: Dispatcher creates transportation segment with previous appointment pickup
      const result = await transportationSegmentService.createTransportationSegment(segmentData);

      // UAT: Verify segment was created successfully
      expect(result).toEqual(createdSegment);
      expect(result?.pickup_location_type).toBe('previous_appointment');
      expect(result?.pickup_location_reference).toBe('appointment-1');
      expect(result?.pickup_location?.address).toBe('789 Previous Patient St, New York, NY 10003');
      expect(result?.patient_location?.address).toBe('321 New Patient St, New York, NY 10004');
      expect(result?.estimated_travel_minutes).toBe(15);
      expect(result?.buffer_minutes).toBe(10);
    });
  });

  describe('UAT Scenario 3: Creating Transportation Segment with Metro Station Pickup', () => {
    it('should allow dispatcher to create transportation segment with metro station pickup', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const segmentData = {
        appointment_id: 'appointment-3',
        segment_type: 'pickup',
        title: 'Metro Station to Patient',
        pickup_location_type: 'metro_station',
        pickup_location_reference: 'station-1',
        pickup_location: {
          address: '123 Central Station, New York, NY 10001',
          lat: 40.7505,
          lng: -73.9934,
          building_name: 'Central Station',
        },
        patient_location: {
          address: '456 Metro Patient St, New York, NY 10005',
          lat: 40.7614,
          lng: -73.9776,
          building_name: 'Metro Patient Building',
        },
        estimated_travel_minutes: 20,
        estimated_distance_km: 3.5,
        buffer_minutes: 15,
        instructions: 'Pick up from metro station entrance',
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-3',
        ...segmentData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: createdSegment,
        error: null,
      });

      // UAT: Dispatcher creates transportation segment with metro station pickup
      const result = await transportationSegmentService.createTransportationSegment(segmentData);

      // UAT: Verify segment was created successfully
      expect(result).toEqual(createdSegment);
      expect(result?.pickup_location_type).toBe('metro_station');
      expect(result?.pickup_location_reference).toBe('station-1');
      expect(result?.pickup_location?.building_name).toBe('Central Station');
      expect(result?.patient_location?.address).toBe('456 Metro Patient St, New York, NY 10005');
      expect(result?.estimated_travel_minutes).toBe(20);
      expect(result?.buffer_minutes).toBe(15);
    });
  });

  describe('UAT Scenario 4: Creating Transportation Segment with Custom Location Pickup', () => {
    it('should allow dispatcher to create transportation segment with custom location pickup', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const segmentData = {
        appointment_id: 'appointment-4',
        segment_type: 'pickup',
        title: 'Custom Location to Patient',
        pickup_location_type: 'custom',
        pickup_location: {
          address: '789 Custom Pickup St, New York, NY 10006',
          lat: 40.7505,
          lng: -73.9934,
          building_name: 'Custom Pickup Building',
        },
        patient_location: {
          address: '321 Custom Patient St, New York, NY 10007',
          lat: 40.7614,
          lng: -73.9776,
          building_name: 'Custom Patient Building',
        },
        estimated_travel_minutes: 30,
        estimated_distance_km: 5.8,
        buffer_minutes: 25,
        instructions: 'Custom pickup location - call for exact address',
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-4',
        ...segmentData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: createdSegment,
        error: null,
      });

      // UAT: Dispatcher creates transportation segment with custom location pickup
      const result = await transportationSegmentService.createTransportationSegment(segmentData);

      // UAT: Verify segment was created successfully
      expect(result).toEqual(createdSegment);
      expect(result?.pickup_location_type).toBe('custom');
      expect(result?.pickup_location_reference).toBeNull();
      expect(result?.pickup_location?.address).toBe('789 Custom Pickup St, New York, NY 10006');
      expect(result?.patient_location?.address).toBe('321 Custom Patient St, New York, NY 10007');
      expect(result?.estimated_travel_minutes).toBe(30);
      expect(result?.buffer_minutes).toBe(25);
    });
  });

  describe('UAT Scenario 5: Updating Transportation Segment', () => {
    it('should allow dispatcher to update transportation segment', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const updateData = {
        id: 'segment-1',
        title: 'Updated Transportation Segment',
        status: 'scheduled',
        estimated_travel_minutes: 35,
        buffer_minutes: 25,
        instructions: 'Updated instructions for driver',
      };

      const updatedSegment = {
        id: 'segment-1',
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Updated Transportation Segment',
        pickup_location_type: 'office',
        pickup_location: {
          address: '123 Main Office St, New York, NY 10001',
          lat: 40.7128,
          lng: -74.0060,
          building_name: 'MediCare Headquarters',
        },
        patient_location: {
          address: '456 Patient St, New York, NY 10002',
          lat: 40.7589,
          lng: -73.9851,
          building_name: 'Patient Building',
        },
        estimated_travel_minutes: 35,
        estimated_distance_km: 4.2,
        buffer_minutes: 25,
        instructions: 'Updated instructions for driver',
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: updatedSegment,
        error: null,
      });

      // UAT: Dispatcher updates transportation segment
      const result = await transportationSegmentService.updateTransportationSegment(updateData);

      // UAT: Verify segment was updated successfully
      expect(result).toEqual(updatedSegment);
      expect(result?.title).toBe('Updated Transportation Segment');
      expect(result?.status).toBe('scheduled');
      expect(result?.estimated_travel_minutes).toBe(35);
      expect(result?.buffer_minutes).toBe(25);
      expect(result?.instructions).toBe('Updated instructions for driver');
    });
  });

  describe('UAT Scenario 6: Viewing Transportation Segments', () => {
    it('should allow dispatcher to view all transportation segments', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const mockSegments = [
        {
          id: 'segment-1',
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: 'Office to Patient Pickup',
          pickup_location_type: 'office',
          status: 'scheduled',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
        {
          id: 'segment-2',
          appointment_id: 'appointment-2',
          segment_type: 'pickup',
          title: 'Previous Appointment to New Patient',
          pickup_location_type: 'previous_appointment',
          status: 'draft',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
        {
          id: 'segment-3',
          appointment_id: 'appointment-3',
          segment_type: 'pickup',
          title: 'Metro Station to Patient',
          pickup_location_type: 'metro_station',
          status: 'completed',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
      ];

      mockQuery.select.mockResolvedValue({
        data: mockSegments,
        error: null,
      });

      // UAT: Dispatcher views all transportation segments
      const result = await transportationSegmentService.getTransportationSegments();

      // UAT: Verify segments are displayed correctly
      expect(result).toEqual(mockSegments);
      expect(result).toHaveLength(3);
      expect(result[0].pickup_location_type).toBe('office');
      expect(result[1].pickup_location_type).toBe('previous_appointment');
      expect(result[2].pickup_location_type).toBe('metro_station');
    });

    it('should allow dispatcher to filter transportation segments', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const mockSegments = [
        {
          id: 'segment-1',
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: 'Office to Patient Pickup',
          pickup_location_type: 'office',
          status: 'scheduled',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
      ];

      mockQuery.select.mockResolvedValue({
        data: mockSegments,
        error: null,
      });

      // UAT: Dispatcher filters transportation segments by appointment
      const result = await transportationSegmentService.getTransportationSegments({
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        status: 'scheduled',
      });

      // UAT: Verify filtered segments are displayed correctly
      expect(result).toEqual(mockSegments);
      expect(result).toHaveLength(1);
      expect(result[0].appointment_id).toBe('appointment-1');
      expect(result[0].segment_type).toBe('pickup');
      expect(result[0].status).toBe('scheduled');
    });
  });

  describe('UAT Scenario 7: Deleting Transportation Segment', () => {
    it('should allow dispatcher to delete transportation segment', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      mockQuery.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      // UAT: Dispatcher deletes transportation segment
      const result = await transportationSegmentService.deleteTransportationSegment('segment-1');

      // UAT: Verify segment was deleted successfully
      expect(result).toBe(true);
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'segment-1');
    });
  });

  describe('UAT Scenario 8: Handling Transportation Segment Conflicts', () => {
    it('should allow dispatcher to handle transportation segment conflicts', async () => {
      const { auditTrailService } = require('@/services/auditTrailService');
      auditTrailService.logTransportationSegmentOperation.mockResolvedValue({
        success: true,
      });

      // UAT: Dispatcher handles transportation segment conflict
      const result = await transportationSegmentService.recordManualOverride(
        'segment-1',
        'appointment-1',
        'dispatcher-1',
        'John Dispatcher',
        'transportation_segment_override',
        'driver_conflict',
        'driver-1',
        'driver-2',
        undefined,
        undefined,
        undefined,
        undefined,
        {
          driver_conflicts: ['Driver 1 is not available'],
          timing_conflicts: [],
          travel_buffer_issues: [],
          warnings_acknowledged: ['Driver conflict'],
        },
        'Driver 1 is not available, assigning Driver 2',
        false
      );

      // UAT: Verify conflict override was recorded successfully
      expect(result.success).toBe(true);
      expect(auditTrailService.logTransportationSegmentOperation).toHaveBeenCalled();
    });
  });

  describe('UAT Scenario 9: Viewing Transportation Segment Overrides', () => {
    it('should allow dispatcher to view transportation segment overrides', async () => {
      const { auditTrailService } = require('@/services/auditTrailService');
      auditTrailService.getTransportationSegmentOverrides.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'override-1',
            segment_id: 'segment-1',
            operation_type: 'transportation_segment_override',
            override_reason: 'driver_conflict',
            created_at: '2024-01-01T09:00:00Z',
          },
        ],
      });

      // UAT: Dispatcher views transportation segment overrides
      const result = await transportationSegmentService.getSegmentOverridesForAppointment('appointment-1');

      // UAT: Verify overrides are displayed correctly
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].segment_id).toBe('segment-1');
      expect(result.data[0].operation_type).toBe('transportation_segment_override');
      expect(result.data[0].override_reason).toBe('driver_conflict');
    });
  });

  describe('UAT Scenario 10: Error Handling', () => {
    it('should handle errors gracefully when creating transportation segment', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const segmentData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location_type: 'office',
      };

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      // UAT: Dispatcher handles error when creating transportation segment
      await expect(transportationSegmentService.createTransportationSegment(segmentData)).rejects.toThrow(
        'Failed to create transportation segment: Database connection failed'
      );
    });

    it('should handle errors gracefully when updating transportation segment', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const updateData = {
        id: 'segment-1',
        title: 'Updated Segment',
      };

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      // UAT: Dispatcher handles error when updating transportation segment
      await expect(transportationSegmentService.updateTransportationSegment(updateData)).rejects.toThrow(
        'Failed to update transportation segment: Update failed'
      );
    });

    it('should handle errors gracefully when deleting transportation segment', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      mockQuery.eq.mockResolvedValue({
        data: null,
        error: { message: 'Deletion failed' },
      });

      // UAT: Dispatcher handles error when deleting transportation segment
      const result = await transportationSegmentService.deleteTransportationSegment('segment-1');

      // UAT: Verify error is handled gracefully
      expect(result).toBe(false);
    });
  });
});

