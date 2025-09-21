import { googleCalendarFixtures } from '../fixtures/googleCalendarFixtures';
import type { GoogleOAuthTokens } from '@/types/googleCalendar';

/**
 * Test utilities for Google Calendar sync testing
 */
export class GoogleCalendarTestUtils {
  /**
   * Create a mock fetch implementation for Google Calendar API
   */
  static createMockFetch(mockResponses: Record<string, any> = {}) {
    return jest.fn().mockImplementation((url: string, options?: RequestInit) => {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // Default responses
      const defaultResponses = {
        '/calendar/v3/calendars/primary/events': {
          ok: true,
          status: 200,
          json: async () => googleCalendarFixtures.googleCalendar.event,
        },
        '/calendar/v3/calendars/john.connected@example.com/events': {
          ok: true,
          status: 200,
          json: async () => googleCalendarFixtures.googleCalendar.event,
        },
        '/oauth2.googleapis.com/token': {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'new_access_token_12345',
            refresh_token: 'new_refresh_token_67890',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'https://www.googleapis.com/auth/calendar',
          }),
        },
      };

      const response = mockResponses[path] || defaultResponses[path];
      
      if (!response) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: { message: 'Not Found' } }),
        });
      }

      return Promise.resolve(response);
    });
  }

  /**
   * Create a mock fetch that simulates network errors
   */
  static createNetworkErrorFetch() {
    return jest.fn().mockRejectedValue(new Error('Network error'));
  }

  /**
   * Create a mock fetch that simulates rate limiting
   */
  static createRateLimitFetch() {
    return jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => googleCalendarFixtures.googleCalendar.rateLimitError,
    });
  }

  /**
   * Create a mock fetch that simulates authentication errors
   */
  static createAuthErrorFetch() {
    return jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => googleCalendarFixtures.googleCalendar.error,
    });
  }

  /**
   * Create mock Supabase client for testing
   */
  static createMockSupabaseClient(mockData: Record<string, any> = {}) {
    return {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockData.single || null,
              error: mockData.singleError || null,
            }),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockData.maybeSingle || null,
              error: mockData.maybeSingleError || null,
            }),
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockData.list || [],
                error: mockData.listError || null,
              }),
            }),
          }),
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockData.list || [],
              error: mockData.listError || null,
            }),
          }),
          gt: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockData.list || [],
              error: mockData.listError || null,
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockData.insert || null,
            error: mockData.insertError || null,
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockData.update || null,
            error: mockData.updateError || null,
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockData.delete || null,
            error: mockData.deleteError || null,
          }),
        }),
      }),
    };
  }

  /**
   * Create mock logging service for testing
   */
  static createMockLoggingService() {
    return {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
      calendarSyncOperation: jest.fn(),
      calendarSyncFailure: jest.fn(),
      calendarSyncPerformance: jest.fn(),
      calendarSyncHealth: jest.fn(),
    };
  }

  /**
   * Create mock failure tracker for testing
   */
  static createMockFailureTracker() {
    return {
      recordFailure: jest.fn().mockResolvedValue({
        staffId: 'test-staff-id',
        failureCount: 1,
        lastFailureAt: new Date().toISOString(),
        lastFailureReason: 'Test error',
        status: 'warning',
        needsAttention: true,
        syncEnabled: true,
      }),
      resetFailureCount: jest.fn().mockResolvedValue(undefined),
      getStaffFailureStatus: jest.fn().mockResolvedValue({
        staffId: 'test-staff-id',
        failureCount: 0,
        lastFailureAt: null,
        lastFailureReason: null,
        status: 'healthy',
        needsAttention: false,
        syncEnabled: true,
      }),
      getStaffNeedingAttention: jest.fn().mockResolvedValue([]),
      getFailureStatistics: jest.fn().mockResolvedValue({
        totalStaff: 10,
        healthyStaff: 8,
        warningStaff: 1,
        criticalStaff: 1,
        emergencyStaff: 0,
        disabledStaff: 0,
        totalFailures: 5,
        averageFailures: 0.5,
      }),
    };
  }

  /**
   * Create mock token manager for testing
   */
  static createMockTokenManager(tokens: GoogleOAuthTokens | null = null) {
    return {
      getTokens: jest.fn().mockResolvedValue(tokens),
      saveTokens: jest.fn().mockResolvedValue(undefined),
      handleTokenFailure: jest.fn().mockResolvedValue(undefined),
    };
  }

  /**
   * Create mock reconnect service for testing
   */
  static createMockReconnectService() {
    return {
      handleSyncFailure: jest.fn().mockResolvedValue(undefined),
      resetFailureCount: jest.fn().mockResolvedValue(undefined),
    };
  }

  /**
   * Create mock monitoring job for testing
   */
  static createMockMonitorJob() {
    return {
      start: jest.fn(),
      stop: jest.fn(),
      runCheck: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockReturnValue({
        isRunning: false,
        checkIntervalMinutes: 15,
      }),
    };
  }

  /**
   * Generate test appointment data
   */
  static generateTestAppointment(overrides: Partial<any> = {}) {
    return {
      id: `appointment-${Date.now()}`,
      patient_id: 'patient-123',
      appointment_type: 'doctor_on_call',
      appointment_date: '2024-02-15',
      start_time: '09:00',
      duration_minutes: 60,
      status: 'scheduled',
      notes: 'Test appointment',
      gc_event_id: null,
      gc_event_created_at: null,
      gc_event_updated_at: null,
      gc_last_synced_at: null,
      gc_sync_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Generate test staff data
   */
  static generateTestStaff(overrides: Partial<any> = {}) {
    return {
      id: `staff-${Date.now()}`,
      first_name: 'Test',
      last_name: 'Staff',
      email: `test.staff.${Date.now()}@example.com`,
      phone: '+971501234500',
      staff_type: 'doctor',
      gc_calendar_id: null,
      gc_is_connected: false,
      gc_connected_at: null,
      gc_last_synced_at: null,
      gc_sync_enabled: true,
      gc_failure_count: 0,
      gc_last_failure_at: null,
      gc_failure_reason: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Generate test patient data
   */
  static generateTestPatient(overrides: Partial<any> = {}) {
    return {
      id: `patient-${Date.now()}`,
      name: 'Test Patient',
      email: `test.patient.${Date.now()}@example.com`,
      phone: '+971501234500',
      area: 'Test Area',
      city: 'Dubai',
      building_street: '123 Test Street',
      flat_villa_no: 'Apt 101',
      google_maps_link: 'https://maps.google.com/?q=123+Test+Street+Dubai',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Wait for async operations to complete
   */
  static async waitForAsync(ms: number = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a mock environment configuration
   */
  static createMockEnvConfig() {
    return {
      googleCalendar: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/api/google-calendar/callback',
        encryptionKey: 'test-encryption-key-32-characters',
        isConfigured: () => true,
        isEnabled: () => true,
      },
      logLevel: 'debug',
    };
  }

  /**
   * Create mock notification channels
   */
  static createMockNotificationChannels() {
    return {
      slack: {
        webhookUrl: 'https://hooks.slack.com/services/TEST/BTEST/XTEST',
        channel: '#test-alerts',
      },
      email: {
        recipients: ['test@example.com'],
        smtpConfig: {
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          auth: {
            user: 'test@example.com',
            pass: 'test-password',
          },
        },
      },
      telegram: {
        botToken: '123456789:TEST_BOT_TOKEN',
        chatId: '-1001234567890',
      },
    };
  }

  /**
   * Reset all mocks
   */
  static resetAllMocks() {
    jest.clearAllMocks();
    jest.resetAllMocks();
  }

  /**
   * Create a mock date for consistent testing
   */
  static mockDate(date: string | Date) {
    const mockDate = new Date(date);
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    return mockDate;
  }

  /**
   * Restore real date
   */
  static restoreDate() {
    jest.useRealTimers();
  }
}
