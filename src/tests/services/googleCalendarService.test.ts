/**
 * Unit Tests for GoogleCalendarService
 *
 * Tests all calendar operations including creation, sharing, event management,
 * error handling, and service health checks.
 */

import { config } from '@/lib/env';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { GoogleCalendarService, resetGoogleCalendarService } from '@/services/googleCalendarService';
import { jest } from '@jest/globals';
import { google } from 'googleapis';

// Mock dependencies
jest.mock('@/lib/env');
jest.mock('@/lib/featureFlags');
jest.mock('googleapis');

// Mock Google Calendar API
const mockCalendarAPI = {
  calendars: {
    insert: jest.fn(),
    get: jest.fn(),
  },
  acl: {
    insert: jest.fn(),
  },
  events: {
    insert: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  calendarList: {
    list: jest.fn(),
  },
};

const mockAuth = {
  getClient: jest.fn(),
};

const mockGoogleAuth = jest.fn();

// Mock googleapis module
(google as any).auth = {
  GoogleAuth: mockGoogleAuth,
};

(google as any).calendar = jest.fn(() => mockCalendarAPI);

// Mock config
const mockConfig = {
  googleCalendar: {
    validateConfig: jest.fn(),
    getServiceAccountCredentials: jest.fn(),
    defaultTimezone: 'Asia/Dubai',
    emailFrom: 'test@bestdoc.com',
    emailFromName: 'BestDOC Team',
  },
};

(config as any) = mockConfig;

// Mock feature flags
(isFeatureEnabled as any) = jest.fn();

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    resetGoogleCalendarService();

    // Setup default mock implementations
    (isFeatureEnabled as any).mockReturnValue(true);
    mockConfig.googleCalendar.validateConfig.mockReturnValue(undefined);
    mockConfig.googleCalendar.getServiceAccountCredentials.mockReturnValue({
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'test-key-id',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
      client_email: 'test@test-project.iam.gserviceaccount.com',
      client_id: 'test-client-id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com',
    });

    mockGoogleAuth.mockImplementation(() => mockAuth);
    mockAuth.getClient.mockResolvedValue({});
    mockCalendarAPI.calendarList.list.mockResolvedValue({
      data: { items: [] },
    });

    // Create service instance
    service = new GoogleCalendarService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfig.googleCalendar.validateConfig).toHaveBeenCalled();
      expect(mockConfig.googleCalendar.getServiceAccountCredentials).toHaveBeenCalled();
      expect(mockGoogleAuth).toHaveBeenCalled();
      expect(mockAuth.getClient).toHaveBeenCalled();
      expect(mockCalendarAPI.calendarList.list).toHaveBeenCalled();
    });

    it('should throw error when feature is disabled', async () => {
      (isFeatureEnabled as any).mockReturnValue(false);

      await expect(async () => {
        new GoogleCalendarService();
        await new Promise(resolve => setTimeout(resolve, 100));
      }).rejects.toThrow('Google Calendar integration is disabled');
    });

    it('should throw error when configuration is invalid', async () => {
      mockConfig.googleCalendar.validateConfig.mockImplementation(() => {
        throw new Error('Invalid configuration');
      });

      await expect(async () => {
        new GoogleCalendarService();
        await new Promise(resolve => setTimeout(resolve, 100));
      }).rejects.toThrow('Google Calendar service initialization failed');
    });

    it('should throw error when authentication fails', async () => {
      mockCalendarAPI.calendarList.list.mockRejectedValue(new Error('Authentication failed'));

      await expect(async () => {
        new GoogleCalendarService();
        await new Promise(resolve => setTimeout(resolve, 100));
      }).rejects.toThrow('Google Calendar service initialization failed');
    });
  });

  describe('Calendar Creation', () => {
    beforeEach(async () => {
      // Wait for service initialization
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should create calendar successfully', async () => {
      const mockCalendarResponse = {
        id: 'test-calendar-id@group.calendar.google.com',
        summary: 'Dr. John Smith - Doctor - BestDOC',
        description: 'Calendar for Dr. John Smith (Doctor) at BestDOC',
        timeZone: 'Asia/Dubai',
      };

      mockCalendarAPI.calendars.insert.mockResolvedValue({
        data: mockCalendarResponse,
      });

      const request = {
        staff_id: 'staff-123',
        staff_name: 'Dr. John Smith',
        staff_type: 'Doctor',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.createCalendar(request);

      expect(result.success).toBe(true);
      expect(result.calendarId).toBe('test-calendar-id@group.calendar.google.com');
      expect(result.calendarUrl).toContain('test-calendar-id@group.calendar.google.com');
      expect(mockCalendarAPI.calendars.insert).toHaveBeenCalledWith({
        requestBody: {
          summary: 'Dr. John Smith - Doctor - BestDOC',
          description: 'Calendar for Dr. John Smith (Doctor) at BestDOC',
          timeZone: 'Asia/Dubai',
          accessRole: 'owner',
        },
      });
    });

    it('should handle calendar creation failure', async () => {
      mockCalendarAPI.calendars.insert.mockRejectedValue(new Error('Quota exceeded'));

      const request = {
        staff_id: 'staff-123',
        staff_name: 'Dr. John Smith',
        staff_type: 'Doctor',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.createCalendar(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('QUOTA_EXCEEDED');
      expect(result.errorMessage).toBe('Quota exceeded');
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        staff_id: '',
        staff_name: '',
        staff_type: '',
        staff_email: 'invalid-email',
      };

      const result = await service.createCalendar(invalidRequest as any);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CALENDAR_CREATION_FAILED');
    });

    it('should retry on retryable errors', async () => {
      let attemptCount = 0;
      mockCalendarAPI.calendars.insert.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout');
        }
        return Promise.resolve({
          data: {
            id: 'test-calendar-id@group.calendar.google.com',
            summary: 'Dr. John Smith - Doctor - BestDOC',
          },
        });
      });

      const request = {
        staff_id: 'staff-123',
        staff_name: 'Dr. John Smith',
        staff_type: 'Doctor',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.createCalendar(request, { maxRetries: 3 });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });
  });

  describe('Calendar Sharing', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should share calendar successfully', async () => {
      mockCalendarAPI.acl.insert.mockResolvedValue({});

      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
        permission_level: 'reader',
      };

      const result = await service.shareCalendar(request);

      expect(result.success).toBe(true);
      expect(mockCalendarAPI.acl.insert).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id@group.calendar.google.com',
        requestBody: {
          role: 'reader',
          scope: {
            type: 'user',
            value: 'john.smith@example.com',
          },
        },
      });
    });

    it('should handle sharing failure', async () => {
      mockCalendarAPI.acl.insert.mockRejectedValue(new Error('Permission denied'));

      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.shareCalendar(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PERMISSION_DENIED');
    });

    it('should validate sharing request', async () => {
      const invalidRequest = {
        staff_id: '',
        google_calendar_id: 'invalid-id',
        staff_email: 'invalid-email',
      };

      const result = await service.shareCalendar(invalidRequest as any);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PERMISSION_DENIED');
    });
  });

  describe('Event Management', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should create event successfully', async () => {
      const mockEventResponse = {
        id: 'test-event-id',
        htmlLink: 'https://calendar.google.com/event?eid=test-event-id',
        summary: 'Home Visit - Medication X',
        start: { dateTime: '2024-01-01T10:00:00+04:00' },
        end: { dateTime: '2024-01-01T11:00:00+04:00' },
      };

      mockCalendarAPI.events.insert.mockResolvedValue({
        data: mockEventResponse,
      });

      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        event_title: 'Home Visit - Medication X',
        event_description: 'Patient visit for medication administration',
        start_time: '2024-01-01T10:00:00+04:00',
        end_time: '2024-01-01T11:00:00+04:00',
        location: '123 Main St, Dubai',
        attendees: ['patient@example.com'],
      };

      const result = await service.createEvent(request);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('test-event-id');
      expect(result.eventUrl).toBe('https://calendar.google.com/event?eid=test-event-id');
      expect(mockCalendarAPI.events.insert).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id@group.calendar.google.com',
        requestBody: {
          summary: 'Home Visit - Medication X',
          description: 'Patient visit for medication administration',
          start: {
            dateTime: '2024-01-01T10:00:00+04:00',
            timeZone: 'Asia/Dubai',
          },
          end: {
            dateTime: '2024-01-01T11:00:00+04:00',
            timeZone: 'Asia/Dubai',
          },
          location: '123 Main St, Dubai',
          attendees: [{ email: 'patient@example.com' }],
        },
      });
    });

    it('should update event successfully', async () => {
      const existingEvent = {
        id: 'test-event-id',
        summary: 'Original Title',
        description: 'Original description',
        start: { dateTime: '2024-01-01T10:00:00+04:00' },
        end: { dateTime: '2024-01-01T11:00:00+04:00' },
        location: 'Original location',
        attendees: [],
      };

      const updatedEvent = {
        id: 'test-event-id',
        htmlLink: 'https://calendar.google.com/event?eid=test-event-id',
        summary: 'Updated Title',
        description: 'Updated description',
        start: { dateTime: '2024-01-01T14:00:00+04:00' },
        end: { dateTime: '2024-01-01T15:00:00+04:00' },
        location: 'Updated location',
        attendees: [{ email: 'patient@example.com' }],
      };

      mockCalendarAPI.events.get.mockResolvedValue({ data: existingEvent });
      mockCalendarAPI.events.update.mockResolvedValue({ data: updatedEvent });

      const updates = {
        event_title: 'Updated Title',
        event_description: 'Updated description',
        start_time: '2024-01-01T14:00:00+04:00',
        end_time: '2024-01-01T15:00:00+04:00',
        location: 'Updated location',
        attendees: ['patient@example.com'],
      };

      const result = await service.updateEvent(
        'test-calendar-id@group.calendar.google.com',
        'test-event-id',
        updates
      );

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('test-event-id');
      expect(mockCalendarAPI.events.get).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id@group.calendar.google.com',
        eventId: 'test-event-id',
      });
      expect(mockCalendarAPI.events.update).toHaveBeenCalled();
    });

    it('should delete event successfully', async () => {
      mockCalendarAPI.events.delete.mockResolvedValue({});

      const result = await service.deleteEvent(
        'test-calendar-id@group.calendar.google.com',
        'test-event-id'
      );

      expect(result.success).toBe(true);
      expect(mockCalendarAPI.events.delete).toHaveBeenCalledWith({
        calendarId: 'test-calendar-id@group.calendar.google.com',
        eventId: 'test-event-id',
      });
    });

    it('should handle event creation failure', async () => {
      mockCalendarAPI.events.insert.mockRejectedValue(new Error('Calendar not found'));

      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'invalid-calendar-id',
        event_title: 'Test Event',
        start_time: '2024-01-01T10:00:00+04:00',
        end_time: '2024-01-01T11:00:00+04:00',
      };

      const result = await service.createEvent(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CALENDAR_NOT_FOUND');
    });
  });

  describe('Calendar Status and Health', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should get calendar status successfully', async () => {
      const mockCalendar = {
        id: 'test-calendar-id@group.calendar.google.com',
        summary: 'Dr. John Smith - Doctor - BestDOC',
        description: 'Calendar for Dr. John Smith',
      };

      mockCalendarAPI.calendars.get.mockResolvedValue({
        data: mockCalendar,
      });

      const result = await service.getCalendarStatus('test-calendar-id@group.calendar.google.com');

      expect(result).toEqual({
        staff_id: '',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        verification_status: 'not_required',
        last_operation: 'create_calendar',
        last_operation_status: 'success',
        last_operation_date: expect.any(String),
      });
    });

    it('should return null for invalid calendar ID', async () => {
      mockCalendarAPI.calendars.get.mockRejectedValue(new Error('Calendar not found'));

      const result = await service.getCalendarStatus('invalid-calendar-id');

      expect(result).toBeNull();
    });

    it('should list calendars successfully', async () => {
      const mockCalendars = [
        {
          id: 'calendar1@group.calendar.google.com',
          summary: 'Dr. John Smith - Doctor - BestDOC',
          description: 'Calendar for Dr. John Smith',
        },
        {
          id: 'calendar2@group.calendar.google.com',
          summary: 'Nurse Jane - Nurse - BestDOC',
          description: 'Calendar for Nurse Jane',
        },
      ];

      mockCalendarAPI.calendarList.list.mockResolvedValue({
        data: { items: mockCalendars },
      });

      const result = await service.listCalendars();

      expect(result).toEqual([
        {
          id: 'calendar1@group.calendar.google.com',
          summary: 'Dr. John Smith - Doctor - BestDOC',
          description: 'Calendar for Dr. John Smith',
        },
        {
          id: 'calendar2@group.calendar.google.com',
          summary: 'Nurse Jane - Nurse - BestDOC',
          description: 'Calendar for Nurse Jane',
        },
      ]);
    });

    it('should check if calendar exists', async () => {
      mockCalendarAPI.calendars.get.mockResolvedValue({
        data: { id: 'test-calendar-id@group.calendar.google.com' },
      });

      const result = await service.calendarExists('test-calendar-id@group.calendar.google.com');

      expect(result).toBe(true);
    });

    it('should return false for non-existent calendar', async () => {
      mockCalendarAPI.calendars.get.mockRejectedValue(new Error('Calendar not found'));

      const result = await service.calendarExists('non-existent-calendar-id');

      expect(result).toBe(false);
    });

    it('should return healthy status when service is working', async () => {
      mockCalendarAPI.calendarList.list.mockResolvedValue({
        data: { items: [] },
      });

      const result = await service.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Google Calendar service is operational');
      expect(result.lastChecked).toBeDefined();
    });

    it('should return unhealthy status when service fails', async () => {
      mockCalendarAPI.calendarList.list.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.getHealthStatus();

      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Google Calendar service error');
      expect(result.lastChecked).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should map Google API errors to calendar error codes', async () => {
      const testCases = [
        { error: 'Quota exceeded', expectedCode: 'QUOTA_EXCEEDED' },
        { error: 'Rate limit exceeded', expectedCode: 'QUOTA_EXCEEDED' },
        { error: 'Permission denied', expectedCode: 'PERMISSION_DENIED' },
        { error: 'Forbidden access', expectedCode: 'PERMISSION_DENIED' },
        { error: 'Calendar not found', expectedCode: 'CALENDAR_NOT_FOUND' },
        { error: '404 error', expectedCode: 'CALENDAR_NOT_FOUND' },
        { error: 'Request timeout', expectedCode: 'GOOGLE_API_UNAVAILABLE' },
        { error: 'Network connection failed', expectedCode: 'GOOGLE_API_UNAVAILABLE' },
        { error: 'Invalid request format', expectedCode: 'CALENDAR_CREATION_FAILED' },
        { error: 'Bad request data', expectedCode: 'CALENDAR_CREATION_FAILED' },
        { error: 'Unknown error', expectedCode: 'UNKNOWN_ERROR' },
      ];

      for (const testCase of testCases) {
        mockCalendarAPI.calendars.insert.mockRejectedValue(new Error(testCase.error));

        const request = {
          staff_id: 'staff-123',
          staff_name: 'Dr. John Smith',
          staff_type: 'Doctor',
          staff_email: 'john.smith@example.com',
        };

        const result = await service.createCalendar(request);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(testCase.expectedCode);
      }
    });

    it('should handle service not initialized error', async () => {
      // Create a new service instance without waiting for initialization
      const uninitializedService = new GoogleCalendarService();

      const request = {
        staff_id: 'staff-123',
        staff_name: 'Dr. John Smith',
        staff_type: 'Doctor',
        staff_email: 'john.smith@example.com',
      };

      await expect(uninitializedService.createCalendar(request)).rejects.toThrow(
        'Google Calendar service not initialized'
      );
    });
  });

  describe('Input Validation', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should validate email format', async () => {
      const request = {
        staff_id: 'staff-123',
        staff_name: 'Dr. John Smith',
        staff_type: 'Doctor',
        staff_email: 'invalid-email-format',
      };

      const result = await service.createCalendar(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CALENDAR_CREATION_FAILED');
    });

    it('should validate datetime format', async () => {
      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        event_title: 'Test Event',
        start_time: 'invalid-datetime',
        end_time: '2024-01-01T11:00:00+04:00',
      };

      const result = await service.createEvent(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CALENDAR_CREATION_FAILED');
    });

    it('should validate Google Calendar ID format', async () => {
      const request = {
        staff_id: 'staff-123',
        google_calendar_id: 'invalid-calendar-id',
        staff_email: 'john.smith@example.com',
      };

      const result = await service.shareCalendar(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PERMISSION_DENIED');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const service1 = new GoogleCalendarService();
      const service2 = new GoogleCalendarService();

      expect(service1).toBe(service2);
    });

    it('should reset singleton instance', () => {
      const service1 = new GoogleCalendarService();
      resetGoogleCalendarService();
      const service2 = new GoogleCalendarService();

      expect(service1).not.toBe(service2);
    });
  });
});
