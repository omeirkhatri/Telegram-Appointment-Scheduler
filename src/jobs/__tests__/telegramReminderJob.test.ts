/**
 * Unit tests for TelegramReminderJob
 * Tests 1-hour reminder job logic and functionality
 */

import { JobExecutionContext, TelegramReminderJobParameters } from '@/types/job';
import { telegramReminderJobHandler } from '../telegramReminderJob';

// Mock dependencies
jest.mock('@/services/appointmentService');
jest.mock('@/services/appointmentStaffService');
jest.mock('@/services/telegramNotificationService');
jest.mock('@/utils/timezone');

describe('TelegramReminderJob', () => {
  let mockContext: JobExecutionContext;
  let mockParameters: TelegramReminderJobParameters;

  beforeEach(() => {
    mockParameters = {
      timeWindow: 15,
      testMode: false,
      forceSend: false
    };

    mockContext = {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      parameters: mockParameters
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('telegramReminderJobHandler', () => {
    it('should execute successfully with no appointments', async () => {
      // Mock appointment service to return empty array
      const { appointmentService } = require('@/services/appointmentService');
      appointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);

      const result = await telegramReminderJobHandler(mockContext);

      expect(result.success).toBe(true);
      expect(result.appointmentsProcessed).toBe(0);
      expect(result.totalNotificationsSent).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'No appointments found for 1-hour reminders'
      );
    });

    it('should process appointments and send notifications', async () => {
      const mockAppointments = [
        {
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
          }
        }
      ];

      const mockStaffAssignments = [
        {
          staff_id: 'staff-1',
          role: 'primary' as const,
          staff: {
            id: 'staff-1',
            first_name: 'Dr. Smith',
            last_name: 'Johnson',
            staff_type: 'doctor',
            telegram_user_id: '1655850641',
            telegram_verified: true
          }
        }
      ];

      // Mock services
      const { appointmentService } = require('@/services/appointmentService');
      const { appointmentStaffService } = require('@/services/appointmentStaffService');
      const { telegramNotificationService } = require('@/services/telegramNotificationService');

      appointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue(mockAppointments);
      appointmentStaffService.getStaffAssignmentsForAppointment = jest.fn().mockResolvedValue(mockStaffAssignments);
      telegramNotificationService.sendOneHourReminderNotificationsToStaff = jest.fn().mockResolvedValue({
        success: true,
        notificationsSent: 1,
        errors: []
      });

      const result = await telegramReminderJobHandler(mockContext);

      expect(result.success).toBe(true);
      expect(result.appointmentsProcessed).toBe(1);
      expect(result.totalNotificationsSent).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(appointmentService.getAppointmentsStartingInTimeWindow).toHaveBeenCalledWith(15);
      expect(appointmentStaffService.getStaffAssignmentsForAppointment).toHaveBeenCalledWith('appointment-1');
      expect(telegramNotificationService.sendOneHourReminderNotificationsToStaff).toHaveBeenCalledWith(
        mockAppointments[0],
        mockStaffAssignments
      );
    });

    it('should handle errors gracefully and continue processing', async () => {
      const mockAppointments = [
        {
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
          }
        },
        {
          id: 'appointment-2',
          appointment_type: 'lab_test',
          appointment_date: '2024-01-15',
          start_time: '14:00',
          duration_minutes: 30,
          status: 'scheduled',
          mini_notes: 'Blood work - fasting required',
          full_notes: 'Complete blood count and lipid profile.',
          pickup_instructions: '',
          patient: {
            id: 'patient-2',
            name: 'Maryam Hassan',
            phone: '+971507654321',
            flat_villa_no: 'Apartment 456',
            building_street: 'Marina Walk',
            area: 'Marina',
            city: 'Dubai'
          }
        }
      ];

      const mockStaffAssignments = [
        {
          staff_id: 'staff-1',
          role: 'primary' as const,
          staff: {
            id: 'staff-1',
            first_name: 'Dr. Smith',
            last_name: 'Johnson',
            staff_type: 'doctor',
            telegram_user_id: '1655850641',
            telegram_verified: true
          }
        }
      ];

      // Mock services
      const { appointmentService } = require('@/services/appointmentService');
      const { appointmentStaffService } = require('@/services/appointmentStaffService');
      const { telegramNotificationService } = require('@/services/telegramNotificationService');

      appointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue(mockAppointments);
      appointmentStaffService.getStaffAssignmentsForAppointment = jest.fn()
        .mockResolvedValueOnce(mockStaffAssignments) // First appointment succeeds
        .mockRejectedValueOnce(new Error('Database error')); // Second appointment fails
      telegramNotificationService.sendOneHourReminderNotificationsToStaff = jest.fn().mockResolvedValue({
        success: true,
        notificationsSent: 1,
        errors: []
      });

      const result = await telegramReminderJobHandler(mockContext);

      expect(result.success).toBe(true); // Job should still succeed
      expect(result.appointmentsProcessed).toBe(2);
      expect(result.totalNotificationsSent).toBe(1); // Only first appointment succeeded
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Database error');
    });

    it('should handle notification service errors', async () => {
      const mockAppointments = [
        {
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
          }
        }
      ];

      const mockStaffAssignments = [
        {
          staff_id: 'staff-1',
          role: 'primary' as const,
          staff: {
            id: 'staff-1',
            first_name: 'Dr. Smith',
            last_name: 'Johnson',
            staff_type: 'doctor',
            telegram_user_id: '1655850641',
            telegram_verified: true
          }
        }
      ];

      // Mock services
      const { appointmentService } = require('@/services/appointmentService');
      const { appointmentStaffService } = require('@/services/appointmentStaffService');
      const { telegramNotificationService } = require('@/services/telegramNotificationService');

      appointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue(mockAppointments);
      appointmentStaffService.getStaffAssignmentsForAppointment = jest.fn().mockResolvedValue(mockStaffAssignments);
      telegramNotificationService.sendOneHourReminderNotificationsToStaff = jest.fn().mockResolvedValue({
        success: false,
        notificationsSent: 0,
        errors: ['Telegram API error: Bot was blocked by the user']
      });

      const result = await telegramReminderJobHandler(mockContext);

      expect(result.success).toBe(true); // Job should still succeed
      expect(result.appointmentsProcessed).toBe(1);
      expect(result.totalNotificationsSent).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Telegram API error');
    });

    it('should handle test mode correctly', async () => {
      const testModeParameters = {
        ...mockParameters,
        testMode: true
      };

      const testModeContext = {
        ...mockContext,
        parameters: testModeParameters
      };

      const { appointmentService } = require('@/services/appointmentService');
      appointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);

      const result = await telegramReminderJobHandler(testModeContext);

      expect(result.success).toBe(true);
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'Running in test mode - no actual notifications will be sent'
      );
    });

    it('should handle force send mode correctly', async () => {
      const forceSendParameters = {
        ...mockParameters,
        forceSend: true
      };

      const forceSendContext = {
        ...mockContext,
        parameters: forceSendParameters
      };

      const { appointmentService } = require('@/services/appointmentService');
      appointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);

      const result = await telegramReminderJobHandler(forceSendContext);

      expect(result.success).toBe(true);
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'Force send mode enabled - sending reminders regardless of time window'
      );
    });

    it('should handle custom time window', async () => {
      const customTimeWindowParameters = {
        ...mockParameters,
        timeWindow: 30
      };

      const customTimeWindowContext = {
        ...mockContext,
        parameters: customTimeWindowParameters
      };

      const { appointmentService } = require('@/services/appointmentService');
      appointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);

      const result = await telegramReminderJobHandler(customTimeWindowContext);

      expect(result.success).toBe(true);
      expect(appointmentService.getAppointmentsStartingInTimeWindow).toHaveBeenCalledWith(30);
    });

    it('should handle appointments with no staff assignments', async () => {
      const mockAppointments = [
        {
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
          }
        }
      ];

      // Mock services
      const { appointmentService } = require('@/services/appointmentService');
      const { appointmentStaffService } = require('@/services/appointmentStaffService');

      appointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue(mockAppointments);
      appointmentStaffService.getStaffAssignmentsForAppointment = jest.fn().mockResolvedValue([]);

      const result = await telegramReminderJobHandler(mockContext);

      expect(result.success).toBe(true);
      expect(result.appointmentsProcessed).toBe(1);
      expect(result.totalNotificationsSent).toBe(0);
      expect(mockContext.logger.warn).toHaveBeenCalledWith(
        'No staff assignments found for appointment appointment-1'
      );
    });
  });
});
