/**
 * Integration tests for Telegram notification services
 * Tests complete notification flows through service layers
 */

// Mock dependencies
jest.mock('@/services/appointmentService');
jest.mock('@/services/staffService');
jest.mock('@/services/telegramService');

describe('Telegram Notification Service Integration', () => {
  let mockAppointmentService: any;
  let mockStaffService: any;
  let mockTelegramService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get mocked services
    mockAppointmentService = require('@/services/appointmentService');
    mockStaffService = require('@/services/staffService');
    mockTelegramService = require('@/services/telegramService');
  });

  describe('Same-day appointment notification flow', () => {
    it('should send notifications when creating same-day appointment', async () => {
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
        patient_id: 'patient-1',
        created_at: new Date().toISOString()
      };

      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      const mockStaffAssignments = [
        {
          staff_id: 'staff-1',
          role: 'primary' as const,
          is_primary: true,
          staff: mockStaff
        }
      ];

      // Mock service responses
      mockAppointmentService.createAppointment = jest.fn().mockResolvedValue(mockAppointment);
      mockAppointmentService.getStaffAssignmentsForAppointment = jest.fn().mockResolvedValue(mockStaffAssignments);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 123
      });

      // Import the notification service
      const { telegramNotificationService } = await import('../telegramNotificationService');

      // Test the notification flow
      const result = await telegramNotificationService.sendAppointmentNotificationsToStaff(
        mockAppointment,
        mockStaffAssignments,
        'created'
      );

      // Verify notification was sent
      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify Telegram message was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining('New Appointment Created')
        })
      );
    });

    it('should handle notification failures gracefully', async () => {
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
        patient_id: 'patient-1',
        created_at: new Date().toISOString()
      };

      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      const mockStaffAssignments = [
        {
          staff_id: 'staff-1',
          role: 'primary' as const,
          is_primary: true,
          staff: mockStaff
        }
      ];

      // Mock service responses
      mockAppointmentService.createAppointment = jest.fn().mockResolvedValue(mockAppointment);
      mockAppointmentService.getStaffAssignmentsForAppointment = jest.fn().mockResolvedValue(mockStaffAssignments);
      mockTelegramService.sendMessage = jest.fn().mockRejectedValue(
        new Error('Telegram API error: Bot was blocked by the user')
      );

      // Import the notification service
      const { telegramNotificationService } = await import('../telegramNotificationService');

      // Test the notification flow
      const result = await telegramNotificationService.sendAppointmentNotificationsToStaff(
        mockAppointment,
        mockStaffAssignments,
        'created'
      );

      // Verify notification failed gracefully
      expect(result.success).toBe(false);
      expect(result.notificationsSent).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Telegram API error');
    });
  });

  describe('1-hour reminder notification flow', () => {
    it('should send 1-hour reminder notifications', async () => {
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
        patient_id: 'patient-1'
      };

      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      const mockStaffAssignments = [
        {
          staff_id: 'staff-1',
          role: 'primary' as const,
          is_primary: true,
          staff: mockStaff
        }
      ];

      // Mock service responses
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 124
      });

      // Import the notification service
      const { telegramNotificationService } = await import('../telegramNotificationService');

      // Test the 1-hour reminder flow
      const result = await telegramNotificationService.sendOneHourReminderNotificationsToStaff(
        mockAppointment,
        mockStaffAssignments
      );

      // Verify notification was sent
      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify 1-hour reminder message was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining('Appointment Reminder - 1 Hour')
        })
      );
    });

    it('should handle staff without Telegram ID', async () => {
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
        patient_id: 'patient-1'
      };

      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: null, // No Telegram ID
        telegram_verified: false
      };

      const mockStaffAssignments = [
        {
          staff_id: 'staff-1',
          role: 'primary' as const,
          is_primary: true,
          staff: mockStaff
        }
      ];

      // Import the notification service
      const { telegramNotificationService } = await import('../telegramNotificationService');

      // Test the 1-hour reminder flow
      const result = await telegramNotificationService.sendOneHourReminderNotificationsToStaff(
        mockAppointment,
        mockStaffAssignments
      );

      // Verify notification was skipped
      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('No Telegram user ID');

      // Verify no Telegram message was sent
      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Command processing flow', () => {
    it('should process help command and send response', async () => {
      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      // Mock service responses
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 125
      });

      // Import the command service
      const { telegramCommandService } = await import('../telegramCommandService');

      // Test the help command flow
      const result = await telegramCommandService.handleHelpCommand('1655850641');

      // Verify command was processed successfully
      expect(result.success).toBe(true);

      // Verify help message was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining('Best DOC Scheduler Bot - Help')
        })
      );
    });

    it('should process today command and send schedule', async () => {
      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      const mockAppointments = [
        {
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
            phone: '+971501234567',
            flat_villa_no: 'Villa 123',
            building_street: 'Jumeirah Street',
            area: 'Jumeirah',
            city: 'Dubai'
          }
        }
      ];

      // Mock service responses
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockAppointmentService.getAppointmentsForStaff = jest.fn().mockResolvedValue(mockAppointments);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 126
      });

      // Import the command service
      const { telegramCommandService } = await import('../telegramCommandService');

      // Test the today command flow
      const result = await telegramCommandService.handleTodayCommand('1655850641');

      // Verify command was processed successfully
      expect(result.success).toBe(true);

      // Verify today's schedule was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining("Today's Schedule")
        })
      );
    });

    it('should handle staff not found error in commands', async () => {
      // Mock service responses
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(null);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 127
      });

      // Import the command service
      const { telegramCommandService } = await import('../telegramCommandService');

      // Test the help command flow with unknown user
      const result = await telegramCommandService.handleHelpCommand('999999999');

      // Verify command was processed successfully
      expect(result.success).toBe(true);

      // Verify error message was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '999999999',
          text: expect.stringContaining('Staff member not found')
        })
      );
    });
  });

  describe('Error handling flows', () => {
    it('should handle database errors gracefully', async () => {
      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      // Mock service responses
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockAppointmentService.getAppointmentsForStaff = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 128
      });

      // Import the command service
      const { telegramCommandService } = await import('../telegramCommandService');

      // Test the today command flow with database error
      const result = await telegramCommandService.handleTodayCommand('1655850641');

      // Verify command was processed successfully
      expect(result.success).toBe(true);

      // Verify error message was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining('Error')
        })
      );
    });

    it('should handle Telegram API errors gracefully', async () => {
      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      // Mock service responses
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockTelegramService.sendMessage = jest.fn().mockRejectedValue(
        new Error('Telegram API error: Bot was blocked by the user')
      );

      // Import the command service
      const { telegramCommandService } = await import('../telegramCommandService');

      // Test the help command flow with Telegram error
      const result = await telegramCommandService.handleHelpCommand('1655850641');

      // Verify command was processed successfully despite Telegram error
      expect(result.success).toBe(true);

      // Verify error was logged but command still succeeded
      expect(mockTelegramService.sendMessage).toHaveBeenCalled();
    });
  });
});
