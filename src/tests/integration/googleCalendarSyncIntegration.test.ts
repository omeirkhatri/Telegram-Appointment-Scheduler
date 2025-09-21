import { GoogleCalendarTestUtils } from '../utils/googleCalendarTestUtils';
import { googleCalendarFixtures } from '../fixtures/googleCalendarFixtures';
import { GoogleCalendarSyncService } from '@/services/googleCalendarSyncService';
import { GoogleCalendarAppointmentSyncService } from '@/services/googleCalendarAppointmentSyncService';
import { googleCalendarFailureTracker } from '@/services/googleCalendarFailureTracker';
import { loggingService } from '@/services/loggingService';

// Mock the dependencies
jest.mock('@/lib/supabase', () => ({
  getServiceRoleClient: jest.fn(),
}));

jest.mock('@/services/loggingService', () => ({
  loggingService: GoogleCalendarTestUtils.createMockLoggingService(),
}));

jest.mock('@/services/googleCalendarFailureTracker', () => ({
  googleCalendarFailureTracker: GoogleCalendarTestUtils.createMockFailureTracker(),
}));

describe('Google Calendar Sync Integration Tests', () => {
  let mockSupabaseClient: any;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let syncService: GoogleCalendarSyncService;
  let appointmentSyncService: GoogleCalendarAppointmentSyncService;

  beforeEach(() => {
    // Reset all mocks
    GoogleCalendarTestUtils.resetAllMocks();
    
    // Create mock Supabase client
    mockSupabaseClient = GoogleCalendarTestUtils.createMockSupabaseClient({
      single: googleCalendarFixtures.staff.connected,
      maybeSingle: googleCalendarFixtures.appointments.withSync,
      list: [googleCalendarFixtures.appointments.withSync],
      insert: { id: 'new-appointment-id' },
      update: { id: 'updated-appointment-id' },
    });

    // Mock getServiceRoleClient
    const { getServiceRoleClient } = require('@/lib/supabase');
    getServiceRoleClient.mockReturnValue(mockSupabaseClient);

    // Create mock fetch
    mockFetch = GoogleCalendarTestUtils.createMockFetch();
    global.fetch = mockFetch;

    // Create services
    const mockTokenManager = GoogleCalendarTestUtils.createMockTokenManager(
      googleCalendarFixtures.tokens.valid
    );
    
    syncService = new GoogleCalendarSyncService({
      tokenManager: mockTokenManager,
      fetchImpl: mockFetch,
    });

    appointmentSyncService = new GoogleCalendarAppointmentSyncService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful Sync Operations', () => {
    it('should create Google Calendar event for new appointment', async () => {
      const appointment = {
        ...googleCalendarFixtures.appointments.withoutSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.connected,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      const result = await appointmentSyncService.handleAppointmentCreated(appointment.id);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/v3/calendars/john.connected@example.com/events'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock_access_token_12345',
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result).toBeDefined();
    });

    it('should update Google Calendar event for modified appointment', async () => {
      const appointment = {
        ...googleCalendarFixtures.appointments.withSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.connected,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      const result = await appointmentSyncService.handleAppointmentUpdated(appointment.id);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/v3/calendars/john.connected@example.com/events/google_event_12345'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );

      expect(result).toBeDefined();
    });

    it('should delete Google Calendar event for cancelled appointment', async () => {
      const appointment = {
        ...googleCalendarFixtures.appointments.withSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.connected,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      const result = await appointmentSyncService.handleAppointmentCancelled(appointment.id);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/v3/calendars/john.connected@example.com/events/google_event_12345'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle token expiration and refresh', async () => {
      // Mock expired token response
      const expiredTokenManager = GoogleCalendarTestUtils.createMockTokenManager(
        googleCalendarFixtures.tokens.expired
      );

      const expiredSyncService = new GoogleCalendarSyncService({
        tokenManager: expiredTokenManager,
        fetchImpl: mockFetch,
      });

      const context = {
        staffId: 'staff-connected-123',
        calendarId: 'john.connected@example.com',
        appointmentId: 'appointment-123',
      };

      const payload = {
        summary: 'Test Appointment',
        start: { dateTime: '2024-02-15T09:00:00+04:00', timeZone: 'Asia/Dubai' },
        end: { dateTime: '2024-02-15T10:00:00+04:00', timeZone: 'Asia/Dubai' },
      };

      const result = await expiredSyncService.createEvent(context, payload);

      // Should attempt token refresh
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result).toBeDefined();
    });

    it('should handle rate limiting with retry', async () => {
      const rateLimitFetch = GoogleCalendarTestUtils.createRateLimitFetch();
      global.fetch = rateLimitFetch;

      const context = {
        staffId: 'staff-connected-123',
        calendarId: 'john.connected@example.com',
        appointmentId: 'appointment-123',
      };

      const payload = {
        summary: 'Test Appointment',
        start: { dateTime: '2024-02-15T09:00:00+04:00', timeZone: 'Asia/Dubai' },
        end: { dateTime: '2024-02-15T10:00:00+04:00', timeZone: 'Asia/Dubai' },
      };

      const result = await syncService.createEvent(context, payload);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('rate_limited');
      expect(result.retryable).toBe(true);
    });

    it('should handle network errors', async () => {
      const networkErrorFetch = GoogleCalendarTestUtils.createNetworkErrorFetch();
      global.fetch = networkErrorFetch;

      const context = {
        staffId: 'staff-connected-123',
        calendarId: 'john.connected@example.com',
        appointmentId: 'appointment-123',
      };

      const payload = {
        summary: 'Test Appointment',
        start: { dateTime: '2024-02-15T09:00:00+04:00', timeZone: 'Asia/Dubai' },
        end: { dateTime: '2024-02-15T10:00:00+04:00', timeZone: 'Asia/Dubai' },
      };

      const result = await syncService.createEvent(context, payload);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('network_error');
      expect(result.retryable).toBe(true);
    });
  });

  describe('Failure Tracking', () => {
    it('should track failures and increment count', async () => {
      const authErrorFetch = GoogleCalendarTestUtils.createAuthErrorFetch();
      global.fetch = authErrorFetch;

      const appointment = {
        ...googleCalendarFixtures.appointments.withoutSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.connected,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      await appointmentSyncService.handleAppointmentCreated(appointment.id);

      expect(googleCalendarFailureTracker.recordFailure).toHaveBeenCalledWith(
        'staff-connected-123',
        'create',
        expect.any(Error),
        expect.objectContaining({
          appointmentId: appointment.id,
          calendarId: 'john.connected@example.com',
          errorCode: 'unauthorized',
          retryable: false,
        })
      );
    });

    it('should reset failure count on successful sync', async () => {
      const appointment = {
        ...googleCalendarFixtures.appointments.withoutSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.connected,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      await appointmentSyncService.handleAppointmentCreated(appointment.id);

      expect(googleCalendarFailureTracker.resetFailureCount).toHaveBeenCalledWith(
        'staff-connected-123'
      );
    });
  });

  describe('Logging', () => {
    it('should log successful operations', async () => {
      const appointment = {
        ...googleCalendarFixtures.appointments.withoutSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.connected,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      await appointmentSyncService.handleAppointmentCreated(appointment.id);

      expect(loggingService.calendarSyncOperation).toHaveBeenCalledWith(
        'create',
        'staff-connected-123',
        appointment.id,
        true,
        expect.any(Number),
        expect.any(Object),
        undefined,
        expect.objectContaining({
          calendarId: 'john.connected@example.com',
          eventId: expect.any(String),
          syncStatus: 'synced',
        })
      );
    });

    it('should log failures with escalation', async () => {
      const authErrorFetch = GoogleCalendarTestUtils.createAuthErrorFetch();
      global.fetch = authErrorFetch;

      const appointment = {
        ...googleCalendarFixtures.appointments.withoutSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.connected,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      await appointmentSyncService.handleAppointmentCreated(appointment.id);

      expect(loggingService.calendarSyncFailure).toHaveBeenCalledWith(
        'staff-connected-123',
        'create',
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({
          appointmentId: appointment.id,
          calendarId: 'john.connected@example.com',
          errorCode: 'unauthorized',
          retryable: false,
        })
      );
    });
  });

  describe('Manual Re-sync', () => {
    it('should trigger manual re-sync for appointment', async () => {
      const appointment = {
        ...googleCalendarFixtures.appointments.withFailedSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.failed,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      const results = await appointmentSyncService.triggerManualResync(appointment.id);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Staff Assignment Changes', () => {
    it('should sync when staff is assigned to appointment', async () => {
      const appointment = {
        ...googleCalendarFixtures.appointments.withoutSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.connected,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      await appointmentSyncService.handleStaffAssigned(appointment.id, 'staff-connected-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/v3/calendars/john.connected@example.com/events'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should sync when staff is removed from appointment', async () => {
      const appointment = {
        ...googleCalendarFixtures.appointments.withSync,
        appointment_staff: [
          {
            ...googleCalendarFixtures.appointmentStaff.connected,
            staff: googleCalendarFixtures.staff.connected,
          },
        ],
      };

      await appointmentSyncService.handleStaffRemoved(appointment.id, 'staff-connected-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/v3/calendars/john.connected@example.com/events/google_event_12345'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
