import type {
    CreateTransportationSegment,
    TransportationSegmentFilters
} from '@/types/transportationSegment';
import { TransportationSegmentService } from './transportationSegmentService';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: jest.fn(),
}));

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

describe('TransportationSegmentService', () => {
  let service: TransportationSegmentService;
  let mockSupabase: any;

  beforeEach(() => {
    service = new TransportationSegmentService();
    mockSupabase = require('@/lib/supabase').supabase;
    jest.clearAllMocks();
  });

  describe('isFeatureEnabled', () => {
    it('should check if transportation segments feature is enabled', () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(true);

      const result = (service as any).isFeatureEnabled();
      expect(result).toBe(true);
      expect(isFeatureEnabled).toHaveBeenCalledWith('transportation_segments');
    });

    it('should return false when feature is disabled', () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(false);

      const result = (service as any).isFeatureEnabled();
      expect(result).toBe(false);
    });
  });

  describe('getTransportationSegments', () => {
    it('should return empty array when feature is disabled', async () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(false);

      const result = await service.getTransportationSegments();
      expect(result).toEqual([]);
    });

    it('should fetch transportation segments with no filters', async () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(true);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.select.mockResolvedValue({
        data: [
          {
            id: 'segment-1',
            appointment_id: 'appointment-1',
            segment_type: 'pickup',
            title: 'Test Segment',
            pickup_location_type: 'office',
            status: 'scheduled',
            created_at: '2024-01-01T09:00:00Z',
            updated_at: '2024-01-01T09:00:00Z',
          },
        ],
        error: null,
      });

      const result = await service.getTransportationSegments();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('segment-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('transportation_segments');
    });

    it('should apply filters correctly', async () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(true);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.select.mockResolvedValue({ data: [], error: null });

      const filters: TransportationSegmentFilters = {
        appointment_id: 'appointment-1',
        driver_id: 'driver-1',
        segment_type: 'pickup',
        status: 'scheduled',
        requires_follow_up: true,
      };

      await service.getTransportationSegments(filters);

      expect(mockQuery.eq).toHaveBeenCalledWith('appointment_id', 'appointment-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('driver_id', 'driver-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('segment_type', 'pickup');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'scheduled');
      expect(mockQuery.eq).toHaveBeenCalledWith('requires_follow_up', true);
    });

    it('should handle database errors', async () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(true);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(service.getTransportationSegments()).rejects.toThrow(
        'Failed to fetch transportation segments: Database error'
      );
    });
  });

  describe('createTransportationSegment', () => {
    it('should return null when feature is disabled', async () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(false);

      const segmentData: CreateTransportationSegment = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location_type: 'office',
      };

      const result = await service.createTransportationSegment(segmentData);
      expect(result).toBeNull();
    });

    it('should create transportation segment successfully', async () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(true);

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: {
          id: 'segment-1',
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: 'Test Segment',
          pickup_location_type: 'office',
          status: 'draft',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
        error: null,
      });

      const segmentData: CreateTransportationSegment = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Test Segment',
        pickup_location_type: 'office',
      };

      const result = await service.createTransportationSegment(segmentData);
      expect(result).toBeDefined();
      expect(result?.id).toBe('segment-1');
      expect(mockQuery.insert).toHaveBeenCalledWith([segmentData]);
    });

    it('should handle creation errors', async () => {
      const { isFeatureEnabled } = require('@/lib/featureFlags');
      isFeatureEnabled.mockReturnValue(true);

      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' },
      });

      const segmentData: CreateTransportationSegment = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        pickup_location_type: 'office',
      };

      await expect(service.createTransportationSegment(segmentData)).rejects.toThrow(
        'Failed to create transportation segment: Creation failed'
      );
    });
  });
});
