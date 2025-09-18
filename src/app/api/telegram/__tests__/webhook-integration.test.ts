/**
 * Integration tests for Telegram webhook and command processing
 * Tests complete webhook flow from request to response
 */

import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/services/staffService');
jest.mock('@/services/appointmentService');
jest.mock('@/services/telegramService');
jest.mock('@/utils/telegramValidation');

describe('Telegram Webhook Integration', () => {
  let mockStaffService: any;
  let mockAppointmentService: any;
  let mockTelegramService: any;
  let mockTelegramValidation: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Get mocked services
    mockStaffService = require('@/services/staffService');
    mockAppointmentService = require('@/services/appointmentService');
    mockTelegramService = require('@/services/telegramService');
    mockTelegramValidation = require('@/utils/telegramValidation');
  });

  describe('Webhook validation and processing', () => {
    it('should process valid webhook request successfully', async () => {
      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      // Mock service responses
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: true
      });
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
          'x-telegram-bot-api-secret-token': 'test-secret'
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
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
      expect(result.success).toBe(true);

      // Verify validation was called
      expect(mockTelegramValidation.validateWebhookUpdate).toHaveBeenCalled();

      // Verify staff lookup was called
      expect(mockStaffService.getStaffByTelegramUserId).toHaveBeenCalledWith('1655850641');

      // Verify help message was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining('Best DOC Scheduler Bot - Help')
        })
      );
    });

    it('should reject invalid webhook requests', async () => {
      // Mock validation failure
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: false,
        error: 'Invalid update structure'
      });

      // Webhook request with invalid structure
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-secret'
        },
        body: JSON.stringify({
          // Missing required fields
          invalid: 'data'
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook was rejected
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid update structure');

      // Verify validation was called
      expect(mockTelegramValidation.validateWebhookUpdate).toHaveBeenCalled();

      // Verify no further processing occurred
      expect(mockStaffService.getStaffByTelegramUserId).not.toHaveBeenCalled();
      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle missing secret token', async () => {
      // Webhook request without secret token
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: { id: 1655850641, first_name: 'Omeir' },
            chat: { id: 1655850641, type: 'private' },
            date: 1758232248,
            text: '/help'
          }
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook was rejected
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid secret token');
    });
  });

  describe('Command processing flows', () => {
    it('should process /today command and return schedule', async () => {
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
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: true
      });
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
          'x-telegram-bot-api-secret-token': 'test-secret'
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
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
      expect(result.success).toBe(true);

      // Verify appointments were queried
      expect(mockAppointmentService.getAppointmentsForStaff).toHaveBeenCalledWith(
        'staff-1',
        expect.any(String), // today's date
        expect.any(String)  // today's date
      );

      // Verify today's schedule was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining("Today's Schedule")
        })
      );
    });

    it('should process /tomorrow command and return schedule', async () => {
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
          appointment_date: '2024-01-16',
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
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: true
      });
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockAppointmentService.getAppointmentsForStaff = jest.fn().mockResolvedValue(mockAppointments);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 125
      });

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-secret'
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
            text: '/tomorrow'
          }
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
      expect(result.success).toBe(true);

      // Verify tomorrow's schedule was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining("Tomorrow's Schedule")
        })
      );
    });

    it('should process /week command and return weekly schedule', async () => {
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
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: true
      });
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockAppointmentService.getAppointmentsForStaff = jest.fn().mockResolvedValue(mockAppointments);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 126
      });

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-secret'
        },
        body: JSON.stringify({
          update_id: 123456792,
          message: {
            message_id: 4,
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
            text: '/week'
          }
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
      expect(result.success).toBe(true);

      // Verify week's schedule was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining("This Week's Schedule")
        })
      );
    });

    it('should process /status command and return status information', async () => {
      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      const mockCurrentAppointment = {
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
      };

      const mockNextAppointment = {
        id: 'appointment-2',
        appointment_type: 'lab_test',
        appointment_date: '2024-01-15',
        start_time: '14:00',
        duration_minutes: 30,
        status: 'scheduled',
        mini_notes: 'Blood work - fasting required',
        patient: {
          id: 'patient-2',
          name: 'Maryam Hassan',
          phone: '+971507654321',
          flat_villa_no: 'Apartment 456',
          building_street: 'Marina Walk',
          area: 'Marina',
          city: 'Dubai'
        }
      };

      // Mock service responses
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: true
      });
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockAppointmentService.getCurrentAppointmentForStaff = jest.fn().mockResolvedValue(mockCurrentAppointment);
      mockAppointmentService.getNextAppointmentForStaff = jest.fn().mockResolvedValue(mockNextAppointment);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 127
      });

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-secret'
        },
        body: JSON.stringify({
          update_id: 123456793,
          message: {
            message_id: 5,
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
            text: '/status'
          }
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
      expect(result.success).toBe(true);

      // Verify status information was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining('Current Status')
        })
      );
    });

    it('should process /info command and return user information', async () => {
      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor',
        telegram_user_id: '1655850641',
        telegram_verified: true
      };

      // Mock service responses
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: true
      });
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 128
      });

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-secret'
        },
        body: JSON.stringify({
          update_id: 123456794,
          message: {
            message_id: 6,
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
            text: '/info'
          }
        })
      });

      // Import and call the webhook handler
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
      expect(result.success).toBe(true);

      // Verify user information was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: '1655850641',
          text: expect.stringContaining('Your Telegram Information')
        })
      );
    });
  });

  describe('Error handling flows', () => {
    it('should handle staff not found error', async () => {
      // Mock service responses
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: true
      });
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(null);
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 129
      });

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-secret'
        },
        body: JSON.stringify({
          update_id: 123456795,
          message: {
            message_id: 7,
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
      const { POST } = await import('../webhook/route');
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
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: true
      });
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockAppointmentService.getAppointmentsForStaff = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );
      mockTelegramService.sendMessage = jest.fn().mockResolvedValue({
        success: true,
        message_id: 130
      });

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-secret'
        },
        body: JSON.stringify({
          update_id: 123456796,
          message: {
            message_id: 8,
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
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully
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
      mockTelegramValidation.validateWebhookUpdate = jest.fn().mockReturnValue({
        isValid: true
      });
      mockStaffService.getStaffByTelegramUserId = jest.fn().mockResolvedValue(mockStaff);
      mockTelegramService.sendMessage = jest.fn().mockRejectedValue(
        new Error('Telegram API error: Bot was blocked by the user')
      );

      // Webhook request
      const request = new NextRequest('http://localhost:3000/api/telegram/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'test-secret'
        },
        body: JSON.stringify({
          update_id: 123456797,
          message: {
            message_id: 9,
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
      const { POST } = await import('../webhook/route');
      const response = await POST(request);
      const result = await response.json();

      // Verify webhook processed successfully despite Telegram error
      expect(result.success).toBe(true);

      // Verify error was logged but webhook still succeeded
      expect(mockTelegramService.sendMessage).toHaveBeenCalled();
    });
  });
});
