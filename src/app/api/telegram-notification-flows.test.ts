/**
 * Integration tests for Telegram notification flows
 * Tests complete notification flows from API endpoints to Telegram delivery
 */

import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/services/appointmentService');
jest.mock('@/services/staffService');
jest.mock('@/services/telegramNotificationService');
jest.mock('@/services/telegramService');

describe('Telegram Notification Flows', () => {
  let mockAppointmentService: any;
  let mockStaffService: any;
  let mockTelegramNotificationService: any;
  let mockTelegramService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get mocked services
    mockAppointmentService = require('@/services/appointmentService');
    mockStaffService = require('@/services/staffService');
    mockTelegramNotificationService = require('@/services/telegramNotificationService');
    mockTelegramService = require('@/services/telegramService');
  });

  describe('Same-day appointment creation flow', () => {
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
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockTelegramNotificationService.sendAppointmentNotificationsToStaff = jest.fn().mockResolvedValue({
        success: true,
        notificationsSent: 1,
        errors: []
      });

      // Create appointment request
      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '09:00',
          duration_minutes: 60,
          status: 'scheduled',
          mini_notes: 'Mounjaro (2.5mg)',
          full_notes: 'Patient requires special attention due to diabetes.',
          pickup_instructions: 'Patient is wheelchair-bound.',
          patient_id: 'patient-1',
          staff_assignments: mockStaffAssignments
        })
      });

      // Import and call the API handler
      const { POST } = await import('./appointments/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify appointment was created
      expect(mockAppointmentService.createAppointment).toHaveBeenCalled();
      expect(result.success).toBe(true);

      // Verify notification was sent
      expect(mockTelegramNotificationService.sendAppointmentNotificationsToStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'appointment-1',
          appointment_type: 'doctor_on_call'
        }),
        mockStaffAssignments,
        'created'
      );
    });

    it('should not send notifications for future appointments', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const mockAppointment = {
        id: 'appointment-1',
        appointment_type: 'doctor_on_call',
        appointment_date: futureDateString,
        start_time: '09:00',
        duration_minutes: 60,
        status: 'scheduled',
        mini_notes: 'Mounjaro (2.5mg)',
        full_notes: 'Patient requires special attention due to diabetes.',
        pickup_instructions: 'Patient is wheelchair-bound.',
        patient_id: 'patient-1',
        created_at: new Date().toISOString()
      };

      // Mock service responses
      mockAppointmentService.createAppointment = jest.fn().mockResolvedValue(mockAppointment);
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);

      // Create appointment request
      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_type: 'doctor_on_call',
          appointment_date: futureDateString,
          start_time: '09:00',
          duration_minutes: 60,
          status: 'scheduled',
          mini_notes: 'Mounjaro (2.5mg)',
          full_notes: 'Patient requires special attention due to diabetes.',
          pickup_instructions: 'Patient is wheelchair-bound.',
          patient_id: 'patient-1'
        })
      });

      // Import and call the API handler
      const { POST } = await import('./appointments/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify appointment was created
      expect(mockAppointmentService.createAppointment).toHaveBeenCalled();
      expect(result.success).toBe(true);

      // Verify notification was NOT sent for future appointment
      expect(mockTelegramNotificationService.sendAppointmentNotificationsToStaff).not.toHaveBeenCalled();
    });
  });

  describe('Reschedule notification flow', () => {
    it('should send reschedule notifications when appointment is updated', async () => {
      const mockAppointment = {
        id: 'appointment-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '10:00', // Changed from 09:00
        duration_minutes: 60,
        status: 'scheduled',
        mini_notes: 'Mounjaro (2.5mg) - Updated',
        full_notes: 'Patient requires special attention due to diabetes.',
        pickup_instructions: 'Patient is wheelchair-bound.',
        patient_id: 'patient-1',
        updated_at: new Date().toISOString()
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
      mockAppointmentService.updateAppointment = jest.fn().mockResolvedValue(mockAppointment);
      mockAppointmentService.getStaffAssignmentsForAppointment = jest.fn().mockResolvedValue(mockStaffAssignments);
      mockTelegramNotificationService.sendAppointmentNotificationsToStaff = jest.fn().mockResolvedValue({
        success: true,
        notificationsSent: 1,
        errors: []
      });

      // Update appointment request
      const request = new NextRequest('http://localhost:3000/api/appointments/appointment-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_time: '10:00',
          mini_notes: 'Mounjaro (2.5mg) - Updated'
        })
      });

      // Import and call the API handler
      const { PUT } = await import('./appointments/[id]/route');
      const response = await PUT(request, { params: { id: 'appointment-1' } });
      const result = await response.json();

      // Verify appointment was updated
      expect(mockAppointmentService.updateAppointment).toHaveBeenCalled();
      expect(result.success).toBe(true);

      // Verify reschedule notification was sent
      expect(mockTelegramNotificationService.sendAppointmentNotificationsToStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'appointment-1',
          start_time: '10:00'
        }),
        mockStaffAssignments,
        'updated'
      );
    });

    it('should send cancellation notifications when appointment is deleted', async () => {
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
      mockAppointmentService.deleteAppointment = jest.fn().mockResolvedValue({ success: true });
      mockAppointmentService.getStaffAssignmentsForAppointment = jest.fn().mockResolvedValue(mockStaffAssignments);
      mockTelegramNotificationService.sendAppointmentNotificationsToStaff = jest.fn().mockResolvedValue({
        success: true,
        notificationsSent: 1,
        errors: []
      });

      // Delete appointment request
      const request = new NextRequest('http://localhost:3000/api/appointments/appointment-1', {
        method: 'DELETE'
      });

      // Import and call the API handler
      const { DELETE } = await import('./appointments/[id]/route');
      const response = await DELETE(request, { params: { id: 'appointment-1' } });
      const result = await response.json();

      // Verify appointment was deleted
      expect(mockAppointmentService.deleteAppointment).toHaveBeenCalled();
      expect(result.success).toBe(true);

      // Verify cancellation notification was sent
      expect(mockTelegramNotificationService.sendAppointmentNotificationsToStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'appointment-1'
        }),
        mockStaffAssignments,
        'cancelled'
      );
    });
  });

  describe('Command processing flow', () => {
    it('should process /help command and send response', async () => {
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
        message_id: 123
      });

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-webhook-secret'
        },
        body: JSON.stringify({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 1655850641,
              is_bot: false,
              first_name: 'Omeir',
              last_name: 'K',
              username: 'o_kha3',
              language_code: 'en'
            },
            chat: {
              id: 1655850641,
              first_name: 'Omeir',
              last_name: 'K',
              username: 'o_kha3',
              type: 'private'
            },
            date: 1758232248,
            text: '/help'
          }
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('./telegram/webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
      expect(result.success).toBe(true);

      // Verify help message was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining('Best DOC Scheduler Bot - Help')
        })
      );
    });

    it('should process /today command and send schedule', async () => {
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
        message_id: 124
      });

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-webhook-secret'
        },
        body: JSON.stringify({
          update_id: 123456790,
          message: {
            message_id: 2,
            from: {
              id: 1655850641,
              is_bot: false,
              first_name: 'Omeir',
              last_name: 'K',
              username: 'o_kha3',
              language_code: 'en'
            },
            chat: {
              id: 1655850641,
              first_name: 'Omeir',
              last_name: 'K',
              username: 'o_kha3',
              type: 'private'
            },
            date: 1758232248,
            text: '/today'
          }
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('./telegram/webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
      expect(result.success).toBe(true);

      // Verify today's schedule was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining("Today's Schedule")
        })
      );
    });

    it('should handle invalid commands gracefully', async () => {
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

      // Webhook request with invalid command
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-webhook-secret'
        },
        body: JSON.stringify({
          update_id: 123456791,
          message: {
            message_id: 3,
            from: {
              id: 1655850641,
              is_bot: false,
              first_name: 'Omeir',
              last_name: 'K',
              username: 'o_kha3',
              language_code: 'en'
            },
            chat: {
              id: 1655850641,
              first_name: 'Omeir',
              last_name: 'K',
              username: 'o_kha3',
              type: 'private'
            },
            date: 1758232248,
            text: '/invalidcommand'
          }
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('./telegram/webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
      expect(result.success).toBe(true);

      // Verify error message was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining('Unknown command')
        })
      );
    });
  });

  describe('Error handling flows', () => {
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
      mockAppointmentService.getAppointmentsStartingInTimeWindow = jest.fn().mockResolvedValue([]);
      mockTelegramNotificationService.sendAppointmentNotificationsToStaff = jest.fn().mockRejectedValue(
        new Error('Telegram API error: Bot was blocked by the user')
      );

      // Create appointment request
      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '09:00',
          duration_minutes: 60,
          status: 'scheduled',
          mini_notes: 'Mounjaro (2.5mg)',
          full_notes: 'Patient requires special attention due to diabetes.',
          pickup_instructions: 'Patient is wheelchair-bound.',
          patient_id: 'patient-1',
          staff_assignments: mockStaffAssignments
        })
      });

      // Import and call the API handler
      const { POST } = await import('./appointments/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify appointment was still created despite notification failure
      expect(mockAppointmentService.createAppointment).toHaveBeenCalled();
      expect(result.success).toBe(true);

      // Verify notification was attempted
      expect(mockTelegramNotificationService.sendAppointmentNotificationsToStaff).toHaveBeenCalled();
    });

    it('should handle staff not found error in commands', async () => {
      // Mock service responses
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(null);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 126
      });

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-webhook-secret'
        },
        body: JSON.stringify({
          update_id: 123456792,
          message: {
            message_id: 4,
            from: {
              id: 999999999, // Unknown user
              is_bot: false,
              first_name: 'Unknown',
              last_name: 'User',
              username: 'unknown',
              language_code: 'en'
            },
            chat: {
              id: 999999999,
              first_name: 'Unknown',
              last_name: 'User',
              username: 'unknown',
              type: 'private'
            },
            date: 1758232248,
            text: '/help'
          }
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('./telegram/webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
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
});
