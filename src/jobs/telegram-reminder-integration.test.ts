/**
 * Integration tests for Telegram reminder system
 * Tests complete 1-hour reminder flow from cron job to message delivery
 */

import { telegramReminderJobHandler } from '@/jobs/telegramReminderJob';
import { JobExecutionContext } from '@/types/job';

// Mock dependencies
jest.mock('@/services/appointmentService');
jest.mock('@/services/appointmentStaffService');
jest.mock('@/services/telegramNotificationService');

describe('Telegram Reminder Integration', () => {
  let mockAppointmentService: any;
  let mockAppointmentStaffService: any;
  let mockTelegramNotificationService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get mocked services
    mockAppointmentService = require('@/services/appointmentService');
    mockAppointmentStaffService = require('@/services/appointmentStaffService');
    mockTelegramNotificationService = require('@/services/telegramNotificationService');
  });

  describe('1-hour reminder flow', () => {
    it('should process appointments and send 1-hour reminders', async () => {
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

      const mockStaffAssignments1 = [
        {
          staff_id: 'staff-1',
          role: 'primary' as const,
          is_primary: true,
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

      const mockStaffAssignments2 = [
        {
          staff_id: 'staff-2',
          role: 'primary' as const,
          is_primary: true,
          staff: {
            id: 'staff-2',
            first_name: 'Nurse',
            last_name: 'Mary',
            staff_type: 'nurse',
            telegram_user_id: '1655850642',
            telegram_verified: true
          }
        }
      ];

      // Mock service responses
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue(mockAppointments);
      mockAppointmentStaffService.getStaffAssignmentsForAppointment = jest.fn()
        .mockResolvedValueOnce(mockStaffAssignments1)
        .mockResolvedValueOnce(mockStaffAssignments2);
      mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          notificationsSent: 1,
          errors: []
        })
        .mockResolvedValueOnce({
          success: true,
          notificationsSent: 1,
          errors: []
        });

      const mockContext: JobExecutionContext = {
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        parameters: {
          timeWindow: 15,
          testMode: false,
          forceSend: false
        }
      };

      // Execute the job
      const result = await telegramReminderJobHandler(mockContext);

      // Verify job executed successfully
      expect(result.success).toBe(true);
      expect(result.appointmentsProcessed).toBe(2);
      expect(result.totalNotificationsSent).toBe(2);
      expect(result.errors).toHaveLength(0);

      // Verify appointments were queried
      expect(mockAppointmentService.getAppointmentsStartingInTimeWindow).toHaveBeenCalledWith(15);

      // Verify staff assignments were retrieved for each appointment
      expect(mockAppointmentStaffService.getStaffAssignmentsForAppointment).toHaveBeenCalledWith('appointment-1');
      expect(mockAppointmentStaffService.getStaffAssignmentsForAppointment).toHaveBeenCalledWith('appointment-2');

      // Verify notifications were sent for each appointment
      expect(mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff).toHaveBeenCalledWith(
        mockAppointments[0],
        mockStaffAssignments1
      );
      expect(mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff).toHaveBeenCalledWith(
        mockAppointments[1],
        mockStaffAssignments2
      );
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

      // Mock service responses
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue(mockAppointments);
      mockAppointmentStaffService.getStaffAssignmentsForAppointment = jest.fn().mockResolvedValue([]);

      const mockContext: JobExecutionContext = {
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        parameters: {
          timeWindow: 15,
          testMode: false,
          forceSend: false
        }
      };

      // Execute the job
      const result = await telegramReminderJobHandler(mockContext);

      // Verify job executed successfully
      expect(result.success).toBe(true);
      expect(result.appointmentsProcessed).toBe(1);
      expect(result.totalNotificationsSent).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify warning was logged
      expect(mockContext.logger.warn).toHaveBeenCalledWith(
        'No staff assignments found for appointment appointment-1'
      );

      // Verify no notifications were sent
      expect(mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff).not.toHaveBeenCalled();
    });

    it('should handle notification failures gracefully', async () => {
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
          is_primary: true,
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

      // Mock service responses
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue(mockAppointments);
      mockAppointmentStaffService.getStaffAssignmentsForAppointment = jest.fn().mockResolvedValue(mockStaffAssignments);
      mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff = jest.fn().mockResolvedValue({
        success: false,
        notificationsSent: 0,
        errors: ['Telegram API error: Bot was blocked by the user']
      });

      const mockContext: JobExecutionContext = {
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        parameters: {
          timeWindow: 15,
          testMode: false,
          forceSend: false
        }
      };

      // Execute the job
      const result = await telegramReminderJobHandler(mockContext);

      // Verify job executed successfully despite notification failure
      expect(result.success).toBe(true);
      expect(result.appointmentsProcessed).toBe(1);
      expect(result.totalNotificationsSent).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Telegram API error');
    });

    it('should handle database errors gracefully', async () => {
      // Mock service responses
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const mockContext: JobExecutionContext = {
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        parameters: {
          timeWindow: 15,
          testMode: false,
          forceSend: false
        }
      };

      // Execute the job
      const result = await telegramReminderJobHandler(mockContext);

      // Verify job failed gracefully
      expect(result.success).toBe(false);
      expect(result.appointmentsProcessed).toBe(0);
      expect(result.totalNotificationsSent).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Database connection failed');
    });

    it('should work in test mode', async () => {
      // Mock service responses
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);

      const mockContext: JobExecutionContext = {
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        parameters: {
          timeWindow: 15,
          testMode: true,
          forceSend: false
        }
      };

      // Execute the job
      const result = await telegramReminderJobHandler(mockContext);

      // Verify job executed successfully
      expect(result.success).toBe(true);
      expect(result.appointmentsProcessed).toBe(0);
      expect(result.totalNotificationsSent).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify test mode was logged
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'Running in test mode - no actual notifications will be sent'
      );
    });

    it('should work with force send mode', async () => {
      // Mock service responses
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);

      const mockContext: JobExecutionContext = {
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        parameters: {
          timeWindow: 15,
          testMode: false,
          forceSend: true
        }
      };

      // Execute the job
      const result = await telegramReminderJobHandler(mockContext);

      // Verify job executed successfully
      expect(result.success).toBe(true);
      expect(result.appointmentsProcessed).toBe(0);
      expect(result.totalNotificationsSent).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify force send mode was logged
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        'Force send mode enabled - sending reminders regardless of time window'
      );
    });

    it('should handle custom time window', async () => {
      // Mock service responses
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);

      const mockContext: JobExecutionContext = {
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        },
        parameters: {
          timeWindow: 30,
          testMode: false,
          forceSend: false
        }
      };

      // Execute the job
      const result = await telegramReminderJobHandler(mockContext);

      // Verify job executed successfully
      expect(result.success).toBe(true);
      expect(result.appointmentsProcessed).toBe(0);
      expect(result.totalNotificationsSent).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify custom time window was used
      expect(mockAppointmentService.getAppointmentsStartingInTimeWindow).toHaveBeenCalledWith(30);
    });
  });
});
