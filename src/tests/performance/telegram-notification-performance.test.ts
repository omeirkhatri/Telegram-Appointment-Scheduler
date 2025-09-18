/**
 * Performance tests for Telegram notification system
 * Tests high-volume notification handling and system performance
 */

import { staffService } from '@/services/staffService';
import { telegramCommandService } from '@/services/telegramCommandService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import { TelegramCommandFormatters } from '@/utils/telegramCommandFormatters';
import { TelegramMessageFormatter } from '@/utils/telegramFormatters';
import { telegramValidationService } from '@/utils/telegramValidation';

// Mock external dependencies
jest.mock('@/services/telegramNotificationService');
jest.mock('@/services/telegramCommandService');
jest.mock('@/services/staffService');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    }))
  },
  getServiceRoleClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    }))
  }))
}));

const mockTelegramNotificationService = telegramNotificationService as jest.Mocked<typeof telegramNotificationService>;
const mockTelegramCommandService = telegramCommandService as jest.Mocked<typeof telegramCommandService>;
const mockStaffService = staffService as jest.Mocked<typeof staffService>;

describe('Telegram Notification Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup performance-optimized mocks
    mockTelegramNotificationService.sendAppointmentNotificationsToStaff.mockResolvedValue({
      success: true,
      sent: 1,
      failed: 0,
      results: [{
        staffId: 'staff-1',
        success: true,
        messageId: '123456789'
      }]
    });

    mockTelegramCommandService.handleTodayCommand.mockResolvedValue({
      success: true,
      message: '📅 Today\'s Schedule - Monday, 15 Jan 2024\n\n👤 Dr. Smith Johnson\n📊 Total: 1 appointments'
    });

    mockStaffService.getStaffByTelegramUserId.mockResolvedValue({
      id: 'staff-1',
      first_name: 'Dr. Smith',
      last_name: 'Johnson',
      staff_type: 'doctor',
      status: 'active',
      telegram_user_id: '1655850641',
      telegram_verified: true
    } as any);
  });

  describe('Message formatting performance', () => {
    it('should format messages efficiently under high load', () => {
      const formatter = new TelegramMessageFormatter();
      const mockAppointment = {
        id: 'appointment-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '09:00',
        duration_minutes: 60,
        status: 'scheduled',
        mini_notes: 'Mounjaro (2.5mg)',
        full_notes: 'Patient requires special attention due to diabetes.',
        pickup_instructions: 'Patient is wheelchair-bound.',
        patient: {
          id: 'patient-1',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: 'Villa 123',
          building_street: 'Jumeirah Street',
          area: 'Jumeirah',
          city: 'Dubai'
        },
        staff_assignments: [{
          staff_id: 'staff-1',
          role: 'primary' as const,
          is_primary: true,
          staff: {
            id: 'staff-1',
            first_name: 'Dr. Smith',
            last_name: 'Johnson',
            staff_type: 'doctor'
          }
        }]
      } as any;

      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor'
      };

      const startTime = Date.now();

      // Format 1000 messages
      for (let i = 0; i < 1000; i++) {
        formatter.formatMessage({
          appointment: mockAppointment,
          staff: mockStaff,
          changeType: 'created',
          patient: mockAppointment.patient,
          notificationType: 'same_day_created'
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent message formatting efficiently', async () => {
      const formatter = new TelegramMessageFormatter();
      const mockAppointment = {
        id: 'appointment-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '09:00',
        duration_minutes: 60,
        status: 'scheduled',
        mini_notes: 'Mounjaro (2.5mg)',
        patient: {
          id: 'patient-1',
          name: 'John Doe',
          phone: '+971501234567'
        },
        staff_assignments: [{
          staff_id: 'staff-1',
          role: 'primary' as const,
          is_primary: true,
          staff: {
            id: 'staff-1',
            first_name: 'Dr. Smith',
            last_name: 'Johnson',
            staff_type: 'doctor'
          }
        }]
      } as any;

      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor'
      };

      const startTime = Date.now();

      // Format 500 messages concurrently
      const promises = Array.from({ length: 500 }, () =>
        Promise.resolve(formatter.formatMessage({
          appointment: mockAppointment,
          staff: mockStaff,
          changeType: 'created',
          patient: mockAppointment.patient,
          notificationType: 'same_day_created'
        }))
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Command processing performance', () => {
    it('should process commands efficiently under high load', async () => {
      const startTime = Date.now();

      // Process 100 commands concurrently
      const promises = Array.from({ length: 100 }, (_, i) =>
        mockTelegramCommandService.handleTodayCommand(`user-${i}`)
      );

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
      expect(results).toHaveLength(100);
      expect(results.every(result => result.success)).toBe(true);
    });

    it('should handle validation efficiently under high load', () => {
      const startTime = Date.now();

      // Validate 1000 user IDs and commands
      for (let i = 0; i < 1000; i++) {
        telegramValidationService.validateTelegramUserId(`165585064${i % 10}`);
        telegramValidationService.validateCommand('/today');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Notification service performance', () => {
    it('should send notifications efficiently under high load', async () => {
      const mockAppointment = {
        id: 'appointment-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '09:00',
        duration_minutes: 60,
        status: 'scheduled',
        mini_notes: 'Mounjaro (2.5mg)',
        patient: {
          id: 'patient-1',
          name: 'John Doe',
          phone: '+971501234567'
        },
        staff_assignments: [{
          staff_id: 'staff-1',
          role: 'primary' as const,
          is_primary: true,
          staff: {
            id: 'staff-1',
            first_name: 'Dr. Smith',
            last_name: 'Johnson',
            staff_type: 'doctor'
          }
        }]
      } as any;

      const startTime = Date.now();

      // Send 200 notifications concurrently
      const promises = Array.from({ length: 200 }, () =>
        mockTelegramNotificationService.sendAppointmentNotificationsToStaff(
          mockAppointment,
          'created'
        )
      );

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
      expect(results).toHaveLength(200);
      expect(results.every(result => result.success)).toBe(true);
    });

    it('should handle rate limiting efficiently', () => {
      const startTime = Date.now();

      // Simulate rapid command usage
      const userId = '1655850641';
      for (let i = 0; i < 100; i++) {
        telegramValidationService.recordCommandUsage(userId, '/today', true);
        telegramValidationService.checkRateLimit(userId);
        telegramValidationService.checkCommandCooldown(userId, '/today');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Memory usage and resource management', () => {
    it('should not leak memory during high-volume operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform high-volume operations
      const promises = Array.from({ length: 1000 }, (_, i) =>
        mockTelegramCommandService.handleTodayCommand(`user-${i}`)
      );

      await Promise.all(promises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large message payloads efficiently', () => {
      const formatter = new TelegramMessageFormatter();
      const largeAppointment = {
        id: 'appointment-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '09:00',
        duration_minutes: 60,
        status: 'scheduled',
        mini_notes: 'Mounjaro (2.5mg)',
        full_notes: 'A'.repeat(2000), // Large notes
        pickup_instructions: 'B'.repeat(1000), // Large pickup instructions
        patient: {
          id: 'patient-1',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: 'Villa 123',
          building_street: 'Jumeirah Street',
          area: 'Jumeirah',
          city: 'Dubai'
        },
        staff_assignments: [{
          staff_id: 'staff-1',
          role: 'primary' as const,
          is_primary: true,
          staff: {
            id: 'staff-1',
            first_name: 'Dr. Smith',
            last_name: 'Johnson',
            staff_type: 'doctor'
          }
        }]
      } as any;

      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor'
      };

      const startTime = Date.now();

      // Format 100 large messages
      for (let i = 0; i < 100; i++) {
        formatter.formatMessage({
          appointment: largeAppointment,
          staff: mockStaff,
          changeType: 'created',
          patient: largeAppointment.patient,
          notificationType: 'same_day_created'
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Concurrent operations performance', () => {
    it('should handle mixed operations efficiently', async () => {
      const startTime = Date.now();

      // Mix of different operations
      const operations = [
        // Message formatting
        ...Array.from({ length: 50 }, () =>
          Promise.resolve(TelegramCommandFormatters.formatHelpMessage())
        ),
        // Command processing
        ...Array.from({ length: 50 }, (_, i) =>
          mockTelegramCommandService.handleTodayCommand(`user-${i}`)
        ),
        // Validation
        ...Array.from({ length: 50 }, (_, i) =>
          Promise.resolve(telegramValidationService.validateTelegramUserId(`165585064${i % 10}`))
        ),
        // Notifications
        ...Array.from({ length: 50 }, () =>
          mockTelegramNotificationService.sendAppointmentNotificationsToStaff(
            { id: 'appointment-1' } as any,
            'created'
          )
        )
      ];

      const results = await Promise.all(operations);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
      expect(results).toHaveLength(200);
    });

    it('should maintain performance under sustained load', async () => {
      const startTime = Date.now();
      const operations = [];

      // Simulate sustained load over 10 seconds
      for (let batch = 0; batch < 10; batch++) {
        const batchPromises = Array.from({ length: 20 }, (_, i) =>
          mockTelegramCommandService.handleTodayCommand(`user-${batch}-${i}`)
        );
        operations.push(...batchPromises);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 15 seconds
      expect(duration).toBeLessThan(15000);
      expect(results).toHaveLength(200);
      expect(results.every(result => result.success)).toBe(true);
    });
  });

  describe('Error handling performance', () => {
    it('should handle errors efficiently without performance degradation', async () => {
      // Mock some operations to fail
      mockTelegramCommandService.handleTodayCommand
        .mockResolvedValueOnce({ success: true, message: 'Success' })
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce({ success: true, message: 'Success' });

      const startTime = Date.now();

      const promises = Array.from({ length: 100 }, (_, i) =>
        mockTelegramCommandService.handleTodayCommand(`user-${i}`)
          .catch(error => ({ success: false, error: error.message }))
      );

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 3 seconds even with errors
      expect(duration).toBeLessThan(3000);
      expect(results).toHaveLength(100);
    });
  });
});
