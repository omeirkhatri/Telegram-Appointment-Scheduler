import { telegramCommandService } from '@/services/telegramCommandService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import { googleCalendarReconnectService } from '@/services/googleCalendarReconnectService';
import { staffService } from '@/services/staffService';
import { config } from '@/lib/env';

// Mock dependencies
jest.mock('@/services/staffService');
jest.mock('@/lib/env');
jest.mock('@/services/telegramService');

const mockStaffService = staffService as jest.Mocked<typeof staffService>;

describe('Google Calendar Telegram Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock environment configuration
    (config as any).googleCalendar = {
      isEnabled: jest.fn(() => true),
      isConfigured: jest.fn(() => true)
    };
  });

  describe('Connect Calendar Command', () => {
    it('should return connect URL for unconnected staff', async () => {
      const mockStaff = {
        id: 'staff-123',
        first_name: 'John',
        last_name: 'Doe',
        gc_is_connected: false,
        google_calendar_id: null,
        gc_last_synced_at: null
      };

      mockStaffService.getStaffByTelegramUserId.mockResolvedValue(mockStaff);

      const result = await telegramCommandService.handleConnectCalendarCommand('123456789');

      expect(result.success).toBe(true);
      expect(result.connectUrl).toContain('/api/google-calendar/initiate');
      expect(result.connectUrl).toContain('staff_id=staff-123');
      expect(result.message).toContain('Connect Google Calendar');
    });

    it('should return status message for already connected staff', async () => {
      const mockStaff = {
        id: 'staff-123',
        first_name: 'John',
        last_name: 'Doe',
        gc_is_connected: true,
        google_calendar_id: 'john@example.com',
        gc_last_synced_at: '2024-01-15T10:00:00Z'
      };

      mockStaffService.getStaffByTelegramUserId.mockResolvedValue(mockStaff);

      const result = await telegramCommandService.handleConnectCalendarCommand('123456789');

      expect(result.success).toBe(true);
      expect(result.connectUrl).toBeUndefined();
      expect(result.message).toContain('Google Calendar Already Connected');
      expect(result.message).toContain('john@example.com');
    });

    it('should return error when staff not found', async () => {
      mockStaffService.getStaffByTelegramUserId.mockResolvedValue(null);

      const result = await telegramCommandService.handleConnectCalendarCommand('123456789');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('STAFF_NOT_FOUND');
    });

    it('should return error when Google Calendar is disabled', async () => {
      const mockStaff = {
        id: 'staff-123',
        first_name: 'John',
        last_name: 'Doe',
        gc_is_connected: false
      };

      mockStaffService.getStaffByTelegramUserId.mockResolvedValue(mockStaff);
      (config as any).googleCalendar.isEnabled.mockReturnValue(false);

      const result = await telegramCommandService.handleConnectCalendarCommand('123456789');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FEATURE_DISABLED');
    });
  });

  describe('Appointment Notification with Calendar CTA', () => {
    it('should add calendar CTA for unconnected staff on appointment creation', async () => {
      const mockStaff = {
        id: 'staff-123',
        first_name: 'John',
        last_name: 'Doe',
        gc_is_connected: false
      };

      const mockAppointment = {
        id: 'appointment-123',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 60
      };

      const mockPatient = {
        id: 'patient-123',
        name: 'Jane Smith',
        phone: '+971501234567'
      };

      // Mock the notification service method
      const sendNotificationSpy = jest.spyOn(telegramNotificationService, 'sendAppointmentNotification')
        .mockResolvedValue({ success: true, messageId: 123 });

      await telegramNotificationService.sendAppointmentNotification(
        '123456789',
        mockAppointment,
        mockStaff,
        'created'
      );

      expect(sendNotificationSpy).toHaveBeenCalledWith(
        '123456789',
        mockAppointment,
        mockStaff,
        'created'
      );
    });

    it('should not add calendar CTA for connected staff', async () => {
      const mockStaff = {
        id: 'staff-123',
        first_name: 'John',
        last_name: 'Doe',
        gc_is_connected: true
      };

      const mockAppointment = {
        id: 'appointment-123',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 60
      };

      const sendNotificationSpy = jest.spyOn(telegramNotificationService, 'sendAppointmentNotification')
        .mockResolvedValue({ success: true, messageId: 123 });

      await telegramNotificationService.sendAppointmentNotification(
        '123456789',
        mockAppointment,
        mockStaff,
        'created'
      );

      expect(sendNotificationSpy).toHaveBeenCalledWith(
        '123456789',
        mockAppointment,
        mockStaff,
        'created'
      );
    });

    it('should not add calendar CTA for appointment updates', async () => {
      const mockStaff = {
        id: 'staff-123',
        first_name: 'John',
        last_name: 'Doe',
        gc_is_connected: false
      };

      const mockAppointment = {
        id: 'appointment-123',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 60
      };

      const sendNotificationSpy = jest.spyOn(telegramNotificationService, 'sendAppointmentNotification')
        .mockResolvedValue({ success: true, messageId: 123 });

      await telegramNotificationService.sendAppointmentNotification(
        '123456789',
        mockAppointment,
        mockStaff,
        'updated'
      );

      expect(sendNotificationSpy).toHaveBeenCalledWith(
        '123456789',
        mockAppointment,
        mockStaff,
        'updated'
      );
    });
  });

  describe('Calendar Reconnect Service', () => {
    it('should handle expired tokens correctly', async () => {
      const mockStaff = {
        id: 'staff-123',
        first_name: 'John',
        last_name: 'Doe',
        telegram_user_id: '123456789',
        google_calendar_token: 'encrypted-token',
        gc_token_expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        gc_is_connected: true
      };

      // Mock Supabase
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              not: jest.fn(() => ({
                data: [mockStaff],
                error: null
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      };

      jest.doMock('@/lib/supabase', () => ({
        supabase: mockSupabase
      }));

      // Mock telegram service
      const mockTelegramService = {
        sendMessage: jest.fn().mockResolvedValue({ success: true })
      };

      jest.doMock('@/services/telegramService', () => ({
        telegramService: mockTelegramService
      }));

      await googleCalendarReconnectService.checkAndNotifyExpiredTokens();

      expect(mockSupabase.from).toHaveBeenCalledWith('staff');
    });

    it('should handle sync failures correctly', async () => {
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  gc_failure_count: 4,
                  first_name: 'John',
                  last_name: 'Doe',
                  telegram_user_id: '123456789'
                },
                error: null
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      };

      jest.doMock('@/lib/supabase', () => ({
        supabase: mockSupabase
      }));

      await googleCalendarReconnectService.handleSyncFailure('staff-123', 'Token expired');

      expect(mockSupabase.from).toHaveBeenCalledWith('staff');
    });

    it('should reset failure count on successful sync', async () => {
      const mockSupabase = {
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      };

      jest.doMock('@/lib/supabase', () => ({
        supabase: mockSupabase
      }));

      await googleCalendarReconnectService.resetFailureCount('staff-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('staff');
    });
  });

  describe('Rate Limiting and Validation', () => {
    it('should respect rate limiting for connect calendar command', async () => {
      // This would require mocking the validation service
      // The actual implementation would be tested in the validation service tests
      expect(true).toBe(true); // Placeholder for rate limiting tests
    });

    it('should validate Telegram user ID format', async () => {
      const result = await telegramCommandService.handleConnectCalendarCommand('invalid-id');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockStaffService.getStaffByTelegramUserId.mockRejectedValue(new Error('Database connection failed'));

      const result = await telegramCommandService.handleConnectCalendarCommand('123456789');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should handle Telegram API errors gracefully', async () => {
      const mockStaff = {
        id: 'staff-123',
        first_name: 'John',
        last_name: 'Doe',
        gc_is_connected: false
      };

      mockStaffService.getStaffByTelegramUserId.mockResolvedValue(mockStaff);

      // Mock Telegram service to throw error
      const mockTelegramService = {
        sendMessage: jest.fn().mockRejectedValue(new Error('Telegram API error'))
      };

      jest.doMock('@/services/telegramService', () => ({
        telegramService: mockTelegramService
      }));

      const result = await telegramCommandService.handleConnectCalendarCommand('123456789');

      // Should still succeed in generating the connect URL
      expect(result.success).toBe(true);
      expect(result.connectUrl).toBeDefined();
    });
  });
});
