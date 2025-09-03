import {
    detectDuplicateEventIds,
    detectOrphanedEventIds,
    generateCleanupOperations,
    validateGoogleEventIdsStructure
} from '@/lib/validations/googleEventIntegrity';
import { GoogleEventIntegrityService } from './googleEventIntegrityService';

// Mock the entire module
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        not: jest.fn(() => Promise.resolve({ data: [], error: null })),
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}));

jest.mock('./googleCalendarService', () => ({
  GoogleCalendarService: jest.fn().mockImplementation(() => ({
    getEvent: jest.fn(() => Promise.resolve(null))
  }))
}));

describe('GoogleEventIntegrityService', () => {
  let service: GoogleEventIntegrityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleEventIntegrityService();
  });

  describe('Validation Functions', () => {
    describe('validateGoogleEventIdsStructure', () => {
      it('should validate correct structure', () => {
        const validEventIds = {
          '550e8400-e29b-41d4-a716-446655440000': 'event123',
          '550e8400-e29b-41d4-a716-446655440001': 'event456'
        };

        const errors = validateGoogleEventIdsStructure(validEventIds);
        expect(errors).toHaveLength(0);
      });

      it('should detect invalid staff ID format', () => {
        const invalidEventIds = {
          'invalid-uuid': 'event123',
          '550e8400-e29b-41d4-a716-446655440001': 'event456'
        };

        const errors = validateGoogleEventIdsStructure(invalidEventIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.type === 'invalid_format')).toBe(true);
      });

      it('should detect invalid event ID format', () => {
        const invalidEventIds = {
          '550e8400-e29b-41d4-a716-446655440000': 'invalid@event#id',
          '550e8400-e29b-41d4-a716-446655440001': 'event456'
        };

        const errors = validateGoogleEventIdsStructure(invalidEventIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.type === 'invalid_format')).toBe(true);
      });
    });

    describe('detectDuplicateEventIds', () => {
      it('should detect duplicate event IDs', () => {
        const appointments = [
          {
            id: 'appointment-1',
            google_event_ids: {
              '550e8400-e29b-41d4-a716-446655440000': 'event123'
            }
          },
          {
            id: 'appointment-2',
            google_event_ids: {
              '550e8400-e29b-41d4-a716-446655440001': 'event123' // Duplicate
            }
          }
        ];

        const errors = detectDuplicateEventIds(appointments);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.type === 'duplicate_event')).toBe(true);
      });

      it('should not detect duplicates when event IDs are unique', () => {
        const appointments = [
          {
            id: 'appointment-1',
            google_event_ids: {
              '550e8400-e29b-41d4-a716-446655440000': 'event123'
            }
          },
          {
            id: 'appointment-2',
            google_event_ids: {
              '550e8400-e29b-41d4-a716-446655440001': 'event456'
            }
          }
        ];

        const errors = detectDuplicateEventIds(appointments);
        expect(errors).toHaveLength(0);
      });
    });

    describe('detectOrphanedEventIds', () => {
      it('should detect orphaned event IDs', () => {
        const appointments = [
          {
            id: 'appointment-1',
            google_event_ids: {
              '550e8400-e29b-41d4-a716-446655440000': 'orphaned-event-123'
            }
          }
        ];

        const validEventIds = new Set(['valid-event-456']);

        const errors = detectOrphanedEventIds(appointments, validEventIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.type === 'orphaned_event')).toBe(true);
      });

      it('should not detect orphaned event IDs when they exist', () => {
        const appointments = [
          {
            id: 'appointment-1',
            google_event_ids: {
              '550e8400-e29b-41d4-a716-446655440000': 'valid-event-123'
            }
          }
        ];

        const validEventIds = new Set(['valid-event-123']);

        const errors = detectOrphanedEventIds(appointments, validEventIds);
        expect(errors).toHaveLength(0);
      });
    });

    describe('generateCleanupOperations', () => {
      it('should generate cleanup operations for errors', () => {
        const errors = [
          {
            type: 'orphaned_event' as const,
            message: 'Event does not exist',
            appointmentId: 'appointment-1',
            staffId: '550e8400-e29b-41d4-a716-446655440000',
            eventId: 'orphaned-event-123',
            severity: 'error' as const
          },
          {
            type: 'invalid_format' as const,
            message: 'Invalid format',
            appointmentId: 'appointment-2',
            staffId: '550e8400-e29b-41d4-a716-446655440001',
            eventId: 'invalid-event',
            severity: 'error' as const
          }
        ];

        const operations = generateCleanupOperations(errors);
        expect(operations).toHaveLength(2);
        expect(operations[0].type).toBe('remove_orphaned');
        expect(operations[1].type).toBe('remove_invalid_format');
      });

      it('should not generate operations for warnings', () => {
        const errors = [
          {
            type: 'orphaned_event' as const,
            message: 'Event does not exist',
            appointmentId: 'appointment-1',
            staffId: '550e8400-e29b-41d4-a716-446655440000',
            eventId: 'orphaned-event-123',
            severity: 'warning' as const
          }
        ];

        const operations = generateCleanupOperations(errors);
        expect(operations).toHaveLength(0);
      });
    });
  });

  describe('Service Methods', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(GoogleEventIntegrityService);
    });

    it('should have required methods', () => {
      expect(typeof service.performIntegrityCheck).toBe('function');
      expect(typeof service.checkAppointmentIntegrity).toBe('function');
      expect(typeof service.cleanupInvalidEventIds).toBe('function');
      expect(typeof service.autoCleanup).toBe('function');
      expect(typeof service.validateAndFixAppointment).toBe('function');
    });
  });
});
