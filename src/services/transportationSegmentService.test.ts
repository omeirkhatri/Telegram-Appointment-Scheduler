import { isFeatureEnabled } from '@/lib/featureFlags';
import type { CreateTransportationSegment, TransportationSegment } from '@/types/transportationSegment';
import { appointmentStaffService } from './appointmentStaffService';
import { transportationSegmentService } from './transportationSegmentService';

// Mock dependencies
jest.mock('@/lib/featureFlags');
jest.mock('@/lib/supabase');
jest.mock('./appointmentStaffService');

const mockIsFeatureEnabled = isFeatureEnabled as jest.MockedFunction<typeof isFeatureEnabled>;
const mockAppointmentStaffService = appointmentStaffService as jest.Mocked<typeof appointmentStaffService>;

describe('TransportationSegmentService - Staff Sync', () => {
  const mockAppointmentId = 'appointment-123';
  const mockDriverId1 = 'driver-123';
  const mockDriverId2 = 'driver-456';

  const mockSegment: TransportationSegment = {
    id: 'segment-123',
    appointment_id: mockAppointmentId,
    segment_type: 'pickup',
    title: 'Test Pickup',
    planned_start: '2025-02-15T08:00:00Z',
    planned_end: '2025-02-15T08:30:00Z',
    driver_id: mockDriverId1,
    travel_mode: 'vehicle',
    origin: { lat: 25.2048, lng: 55.2708 },
    destination: { lat: 25.1972, lng: 55.2744 },
    estimated_travel_minutes: 30,
    estimated_distance_km: 15.5,
    buffer_minutes: 5,
    instructions: 'Test instructions',
    requires_follow_up: false,
    status: 'scheduled',
    manual_override: false,
    created_at: '2025-02-15T07:00:00Z',
    updated_at: '2025-02-15T07:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFeatureEnabled.mockReturnValue(true);
  });

  describe('Driver Assignment Sync Logic', () => {
    it('should identify drivers that need assignment when segments exist', async () => {
      // Mock segments with drivers
      const segments = [
        { ...mockSegment, id: 'segment-1', driver_id: mockDriverId1 },
        { ...mockSegment, id: 'segment-2', driver_id: mockDriverId2 },
      ];

      // Mock no existing assignments
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([]);

      // Mock the getSegmentsForAppointment method
      jest.spyOn(transportationSegmentService, 'getSegmentsForAppointment')
        .mockResolvedValue(segments);

      // Mock the syncDriverAssignment method
      const syncDriverAssignmentSpy = jest.spyOn(transportationSegmentService as any, 'syncDriverAssignment')
        .mockResolvedValue();

      await transportationSegmentService.syncAllDriverAssignmentsForAppointment(mockAppointmentId);

      // Should call syncDriverAssignment for both drivers
      expect(syncDriverAssignmentSpy).toHaveBeenCalledWith(mockAppointmentId, mockDriverId1, 'driver');
      expect(syncDriverAssignmentSpy).toHaveBeenCalledWith(mockAppointmentId, mockDriverId2, 'driver');
    });

    it('should identify drivers that need removal when no segments exist', async () => {
      // Mock existing driver assignments
      const existingAssignments = [
        {
          id: 'staff-assignment-1',
          appointment_id: mockAppointmentId,
          staff_id: mockDriverId1,
          role: 'driver',
          is_primary: false,
          google_event_id: null,
          created_at: '2025-02-15T06:00:00Z',
          updated_at: '2025-02-15T06:00:00Z',
        },
        {
          id: 'staff-assignment-2',
          appointment_id: mockAppointmentId,
          staff_id: mockDriverId2,
          role: 'driver',
          is_primary: false,
          google_event_id: null,
          created_at: '2025-02-15T06:00:00Z',
          updated_at: '2025-02-15T06:00:00Z',
        },
      ];

      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue(existingAssignments);

      // Mock no segments exist
      jest.spyOn(transportationSegmentService, 'getSegmentsForAppointment')
        .mockResolvedValue([]);

      // Mock the removeDriverAssignment method
      const removeDriverAssignmentSpy = jest.spyOn(transportationSegmentService as any, 'removeDriverAssignment')
        .mockResolvedValue();

      await transportationSegmentService.syncAllDriverAssignmentsForAppointment(mockAppointmentId);

      // Should call removeDriverAssignment for both drivers
      expect(removeDriverAssignmentSpy).toHaveBeenCalledWith(mockAppointmentId, mockDriverId1);
      expect(removeDriverAssignmentSpy).toHaveBeenCalledWith(mockAppointmentId, mockDriverId2);
    });

    it('should not create duplicate assignments when driver already assigned', async () => {
      // Mock existing driver assignment
      const existingAssignment = {
        id: 'existing-assignment-123',
        appointment_id: mockAppointmentId,
        staff_id: mockDriverId1,
        role: 'driver',
        is_primary: false,
        google_event_id: null,
        created_at: '2025-02-15T06:00:00Z',
        updated_at: '2025-02-15T06:00:00Z',
      };

      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([existingAssignment]);

      // Mock segments with the same driver
      const segments = [{ ...mockSegment, driver_id: mockDriverId1 }];
      jest.spyOn(transportationSegmentService, 'getSegmentsForAppointment')
        .mockResolvedValue(segments);

      // Mock the syncDriverAssignment method
      const syncDriverAssignmentSpy = jest.spyOn(transportationSegmentService as any, 'syncDriverAssignment')
        .mockResolvedValue();

      await transportationSegmentService.syncAllDriverAssignmentsForAppointment(mockAppointmentId);

      // Should not call syncDriverAssignment since driver already exists
      expect(syncDriverAssignmentSpy).not.toHaveBeenCalled();
    });
  });

  describe('Staff Sync Error Handling', () => {
    it('should handle staff sync errors gracefully', async () => {
      // Mock staff service to throw error
      mockAppointmentStaffService.getStaffForAppointment.mockRejectedValue(new Error('Database error'));

      // Mock segments
      jest.spyOn(transportationSegmentService, 'getSegmentsForAppointment')
        .mockResolvedValue([mockSegment]);

      // Should not throw error even if staff sync fails
      await expect(transportationSegmentService.syncAllDriverAssignmentsForAppointment(mockAppointmentId))
        .resolves.not.toThrow();
    });

    it('should handle missing segments gracefully', async () => {
      // Mock appointment staff service
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([]);

      // Mock segments query to throw error
      jest.spyOn(transportationSegmentService, 'getSegmentsForAppointment')
        .mockRejectedValue(new Error('Segments query failed'));

      // Should not throw error even if segments query fails
      await expect(transportationSegmentService.syncAllDriverAssignmentsForAppointment(mockAppointmentId))
        .resolves.not.toThrow();
    });
  });

  describe('Feature Flag Integration', () => {
    it('should skip staff sync when transportation segments feature is disabled', async () => {
      mockIsFeatureEnabled.mockReturnValue(false);

      await expect(transportationSegmentService.syncAllDriverAssignmentsForAppointment(mockAppointmentId))
        .resolves.not.toThrow();
      
      expect(mockAppointmentStaffService.getStaffForAppointment).not.toHaveBeenCalled();
      expect(mockAppointmentStaffService.createAppointmentStaff).not.toHaveBeenCalled();
    });
  });

  describe('Calendar Event Prevention', () => {
    it('should not trigger duplicate calendar events when driver assignment already exists', async () => {
      // Mock existing driver assignment
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([
        {
          id: 'existing-assignment-123',
          appointment_id: mockAppointmentId,
          staff_id: mockDriverId1,
          role: 'driver',
          is_primary: false,
          google_event_id: 'existing-event-123',
          created_at: '2025-02-15T06:00:00Z',
          updated_at: '2025-02-15T06:00:00Z',
        },
      ]);

      // Mock segments with the same driver
      jest.spyOn(transportationSegmentService, 'getSegmentsForAppointment')
        .mockResolvedValue([{ ...mockSegment, driver_id: mockDriverId1 }]);

      // Mock the syncDriverAssignment method
      const syncDriverAssignmentSpy = jest.spyOn(transportationSegmentService as any, 'syncDriverAssignment')
        .mockResolvedValue();

      await transportationSegmentService.syncAllDriverAssignmentsForAppointment(mockAppointmentId);

      // Should not call syncDriverAssignment since driver already exists
      expect(syncDriverAssignmentSpy).not.toHaveBeenCalled();
    });
  });
});