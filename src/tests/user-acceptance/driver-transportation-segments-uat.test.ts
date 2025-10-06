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

describe('Driver Transportation Segments User Acceptance Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = require('@/lib/supabase').supabase;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('UAT Scenario 1: Driver Viewing Daily Schedule', () => {
    it('should allow driver to view daily transportation segments schedule', async () => {
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
          status: 'scheduled',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
      ];

      mockQuery.select.mockResolvedValue({
        data: mockSegments,
        error: null,
      });

      // UAT: Driver views daily transportation segments schedule
      const result = await transportationSegmentService.getTransportationSegments({
        driver_id: 'driver-1',
        status: 'scheduled',
      });

      // UAT: Verify segments are displayed correctly with new terminology
      expect(result).toEqual(mockSegments);
      expect(result).toHaveLength(2);
      expect(result[0].pickup_location_type).toBe('office');
      expect(result[0].pickup_location?.building_name).toBe('MediCare Headquarters');
      expect(result[1].pickup_location_type).toBe('previous_appointment');
      expect(result[1].pickup_location_reference).toBe('appointment-1');
    });
  });

  describe('UAT Scenario 2: Driver Starting Transportation Segment', () => {
    it('should allow driver to start transportation segment', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const updateData = {
        id: 'segment-1',
        status: 'in_progress',
      };

      const updatedSegment = {
        id: 'segment-1',
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
        status: 'in_progress',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: updatedSegment,
        error: null,
      });

      // UAT: Driver starts transportation segment
      const result = await transportationSegmentService.updateTransportationSegment(updateData);

      // UAT: Verify segment status was updated to in_progress
      expect(result).toEqual(updatedSegment);
      expect(result?.status).toBe('in_progress');
      expect(result?.pickup_location_type).toBe('office');
      expect(result?.pickup_location?.building_name).toBe('MediCare Headquarters');
    });
  });

  describe('UAT Scenario 3: Driver Completing Transportation Segment', () => {
    it('should allow driver to complete transportation segment', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const updateData = {
        id: 'segment-1',
        status: 'completed',
        instructions: 'Successfully completed pickup and dropoff. Patient was on time.',
      };

      const updatedSegment = {
        id: 'segment-1',
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
        instructions: 'Successfully completed pickup and dropoff. Patient was on time.',
        status: 'completed',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: updatedSegment,
        error: null,
      });

      // UAT: Driver completes transportation segment
      const result = await transportationSegmentService.updateTransportationSegment(updateData);

      // UAT: Verify segment status was updated to completed
      expect(result).toEqual(updatedSegment);
      expect(result?.status).toBe('completed');
      expect(result?.instructions).toBe('Successfully completed pickup and dropoff. Patient was on time.');
    });
  });

  describe('UAT Scenario 4: Driver Handling Different Pickup Location Types', () => {
    it('should allow driver to handle office pickup location', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const mockSegment = {
        id: 'segment-1',
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
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: mockSegment,
        error: null,
      });

      // UAT: Driver views office pickup location details
      const result = await transportationSegmentService.getTransportationSegment('segment-1');

      // UAT: Verify office pickup location information is displayed correctly
      expect(result).toEqual(mockSegment);
      expect(result?.pickup_location_type).toBe('office');
      expect(result?.pickup_location?.building_name).toBe('MediCare Headquarters');
      expect(result?.pickup_location?.address).toBe('123 Main Office St, New York, NY 10001');
    });

    it('should allow driver to handle previous appointment pickup location', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const mockSegment = {
        id: 'segment-2',
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
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: mockSegment,
        error: null,
      });

      // UAT: Driver views previous appointment pickup location details
      const result = await transportationSegmentService.getTransportationSegment('segment-2');

      // UAT: Verify previous appointment pickup location information is displayed correctly
      expect(result).toEqual(mockSegment);
      expect(result?.pickup_location_type).toBe('previous_appointment');
      expect(result?.pickup_location_reference).toBe('appointment-1');
      expect(result?.pickup_location?.address).toBe('789 Previous Patient St, New York, NY 10003');
    });

    it('should allow driver to handle metro station pickup location', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const mockSegment = {
        id: 'segment-3',
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
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: mockSegment,
        error: null,
      });

      // UAT: Driver views metro station pickup location details
      const result = await transportationSegmentService.getTransportationSegment('segment-3');

      // UAT: Verify metro station pickup location information is displayed correctly
      expect(result).toEqual(mockSegment);
      expect(result?.pickup_location_type).toBe('metro_station');
      expect(result?.pickup_location_reference).toBe('station-1');
      expect(result?.pickup_location?.building_name).toBe('Central Station');
    });

    it('should allow driver to handle custom pickup location', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const mockSegment = {
        id: 'segment-4',
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
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: mockSegment,
        error: null,
      });

      // UAT: Driver views custom pickup location details
      const result = await transportationSegmentService.getTransportationSegment('segment-4');

      // UAT: Verify custom pickup location information is displayed correctly
      expect(result).toEqual(mockSegment);
      expect(result?.pickup_location_type).toBe('custom');
      expect(result?.pickup_location_reference).toBeNull();
      expect(result?.pickup_location?.address).toBe('789 Custom Pickup St, New York, NY 10006');
    });
  });

  describe('UAT Scenario 5: Driver Adding Notes to Transportation Segment', () => {
    it('should allow driver to add notes to transportation segment', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const updateData = {
        id: 'segment-1',
        instructions: 'Patient was ready on time. No issues with pickup location. Traffic was light.',
      };

      const updatedSegment = {
        id: 'segment-1',
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
        instructions: 'Patient was ready on time. No issues with pickup location. Traffic was light.',
        status: 'completed',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: updatedSegment,
        error: null,
      });

      // UAT: Driver adds notes to transportation segment
      const result = await transportationSegmentService.updateTransportationSegment(updateData);

      // UAT: Verify notes were added successfully
      expect(result).toEqual(updatedSegment);
      expect(result?.instructions).toBe('Patient was ready on time. No issues with pickup location. Traffic was light.');
    });
  });

  describe('UAT Scenario 6: Driver Canceling Transportation Segment', () => {
    it('should allow driver to cancel transportation segment', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const updateData = {
        id: 'segment-1',
        status: 'cancelled',
        instructions: 'Patient cancelled appointment. No pickup required.',
      };

      const updatedSegment = {
        id: 'segment-1',
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
        instructions: 'Patient cancelled appointment. No pickup required.',
        status: 'cancelled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:30:00Z',
      };

      mockQuery.single.mockResolvedValue({
        data: updatedSegment,
        error: null,
      });

      // UAT: Driver cancels transportation segment
      const result = await transportationSegmentService.updateTransportationSegment(updateData);

      // UAT: Verify segment status was updated to cancelled
      expect(result).toEqual(updatedSegment);
      expect(result?.status).toBe('cancelled');
      expect(result?.instructions).toBe('Patient cancelled appointment. No pickup required.');
    });
  });

  describe('UAT Scenario 7: Driver Handling Transportation Segment Conflicts', () => {
    it('should allow driver to view transportation segment conflicts', async () => {
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

      // UAT: Driver views transportation segment conflicts
      const result = await transportationSegmentService.getSegmentOverridesForAppointment('appointment-1');

      // UAT: Verify conflicts are displayed correctly
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].segment_id).toBe('segment-1');
      expect(result.data[0].operation_type).toBe('transportation_segment_override');
      expect(result.data[0].override_reason).toBe('driver_conflict');
    });
  });

  describe('UAT Scenario 8: Driver Error Handling', () => {
    it('should handle errors gracefully when viewing transportation segments', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      mockQuery.select.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      // UAT: Driver handles error when viewing transportation segments
      await expect(transportationSegmentService.getTransportationSegments()).rejects.toThrow(
        'Failed to fetch transportation segments: Database connection failed'
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
        status: 'in_progress',
      };

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      // UAT: Driver handles error when updating transportation segment
      await expect(transportationSegmentService.updateTransportationSegment(updateData)).rejects.toThrow(
        'Failed to update transportation segment: Update failed'
      );
    });
  });
});

