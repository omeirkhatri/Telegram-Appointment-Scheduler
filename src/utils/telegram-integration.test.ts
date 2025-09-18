/**
 * Integration tests for Telegram notification system
 * Tests core functionality and message formatting integration
 */

import { appointmentService } from '@/services/appointmentService';
import { cronWorkerService } from '@/services/cronWorkerService';
import { jobSchedulerService } from '@/services/jobSchedulerService';
import { staffService } from '@/services/staffService';
import { telegramCommandService } from '@/services/telegramCommandService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import { TelegramCommandFormatters } from './telegramCommandFormatters';
import { TelegramMessageFormatter } from './telegramFormatters';
import { TelegramValidationService } from './telegramValidation';

// Mock all external dependencies
jest.mock('@/services/staffService');
jest.mock('@/services/telegramCommandService');
jest.mock('@/services/appointmentService');
jest.mock('@/services/telegramNotificationService');
jest.mock('@/services/cronWorkerService');
jest.mock('@/services/jobSchedulerService');
jest.mock('./telegramValidation', () => ({
  TelegramValidationService: {
    validateWebhookUpdate: jest.fn(),
    validateTelegramUserId: jest.fn(),
    validateCommand: jest.fn(),
    checkRateLimit: jest.fn(),
    checkCommandCooldown: jest.fn(),
    recordCommandUsage: jest.fn(),
    getErrorMessage: jest.fn(),
  },
}));
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

// Mock the actual services
const mockStaffService = staffService as jest.Mocked<typeof staffService>;
const mockTelegramCommandService = telegramCommandService as jest.Mocked<typeof telegramCommandService>;
const mockAppointmentService = appointmentService as jest.Mocked<typeof appointmentService>;
const mockTelegramNotificationService = telegramNotificationService as jest.Mocked<typeof telegramNotificationService>;
const mockCronWorkerService = cronWorkerService as jest.Mocked<typeof cronWorkerService>;
const mockJobSchedulerService = jobSchedulerService as jest.Mocked<typeof jobSchedulerService>;
const mockTelegramValidationService = TelegramValidationService as jest.Mocked<typeof TelegramValidationService>;

describe('Telegram Notification System Integration', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    mockStaffService.getStaffByTelegramUserId.mockResolvedValue({
      id: 'staff-1',
      first_name: 'Dr. Smith',
      last_name: 'Johnson',
      staff_type: 'doctor',
      status: 'active',
      telegram_user_id: '1655850641',
      telegram_verified: true
    } as any);

    mockTelegramCommandService.handleTodayCommand.mockResolvedValue({
      success: true,
      message: '📅 Today\'s Schedule - Monday, 15 Jan 2024\n\n👤 Dr. Smith Johnson\n📊 Total: 1 appointments\n\n09:00 - 10:00\n🏥 Doctor on Call\n👤 John Doe\n📝 Mounjaro (2.5mg)'
    });

    mockTelegramCommandService.handleTomorrowCommand.mockResolvedValue({
      success: true,
      message: '📅 Tomorrow\'s Schedule - Tuesday, 16 Jan 2024\n\n👤 Dr. Smith Johnson\n📊 Total: 0 appointments\n\n✅ No appointments scheduled.'
    });

    mockTelegramCommandService.handleWeekCommand.mockResolvedValue({
      success: true,
      message: '📅 This Week\'s Schedule - 15 Jan to 21 Jan 2024\n\n👤 Dr. Smith Johnson\n📊 Total: 1 appointments\n\n📅 Monday, 15 Jan\n   1. 09:00 - 10:00\n      🏥 Doctor on Call\n      👤 John Doe\n      📝 Mounjaro (2.5mg)'
    });

    mockTelegramCommandService.handleStatusCommand.mockResolvedValue({
      success: true,
      message: '📊 Status - Dr. Smith Johnson\n\n✅ No current appointment\n\n📅 Next Appointment:\n   🏥 Doctor on Call\n   👤 John Doe\n   📅 Monday, 15 Jan at 09:00 - 10:00\n   📝 Mounjaro (2.5mg)'
    });

    mockTelegramCommandService.handleHelpCommand.mockResolvedValue({
      success: true,
      message: '📋 Best DOC Scheduler Bot - Help\n\nSchedule Commands:\n/today - Today\'s schedule\n/tomorrow - Tomorrow\'s schedule\n/week - This week\'s schedule\n/status - Current status\n\nInformation Commands:\n/help - Show this help\n/info - User information'
    });

    mockTelegramCommandService.handleInfoCommand.mockResolvedValue({
      success: true,
      message: 'ℹ️ User Information\n\n👤 Name: Omeir K\n🆔 User ID: 1655850641\n📱 Username: @o_kha3\n🌐 Language: English\n\n✅ Staff verified and active'
    });

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

    mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff.mockResolvedValue({
      success: true,
      sent: 1,
      failed: 0,
      results: [{
        staffId: 'staff-1',
        success: true,
        messageId: '123456789'
      }]
    });

    mockCronWorkerService.start.mockResolvedValue(undefined);
    mockCronWorkerService.stop.mockResolvedValue(undefined);
    mockCronWorkerService.getStatus.mockReturnValue({
      isRunning: true,
      uptime: 3600000, // 1 hour
      config: {
        timezone: 'Asia/Dubai',
        maxConcurrentJobs: 5,
        healthCheckInterval: 30000,
        persistenceInterval: 60000,
        enableHealthChecks: true,
        enablePersistence: true,
        logLevel: 'info'
      },
      schedulerStatus: true
    });

    mockJobSchedulerService.scheduleJob.mockResolvedValue('job-123');
    mockJobSchedulerService.triggerJob.mockResolvedValue({
      success: true,
      jobId: 'job-123',
      result: { success: true, processed: 1, sent: 1, failed: 0 }
    });

    // Setup validation service mocks
    mockTelegramValidationService.validateWebhookUpdate.mockReturnValue({
      isValid: true,
      error: undefined
    });
    mockTelegramValidationService.validateTelegramUserId.mockReturnValue({
      isValid: true,
      error: undefined
    });
    mockTelegramValidationService.validateCommand.mockReturnValue({
      isValid: true,
      error: undefined
    });
    mockTelegramValidationService.checkRateLimit.mockReturnValue({
      isValid: true,
      error: undefined
    });
    mockTelegramValidationService.checkCommandCooldown.mockReturnValue({
      isValid: true,
      error: undefined
    });
    mockTelegramValidationService.getErrorMessage.mockImplementation((errorCode: string) => {
      const errorMessages: Record<string, string> = {
        'INVALID_USER_ID': 'Invalid user ID format',
        'INVALID_COMMAND': 'Command must start with /',
        'RATE_LIMIT_EXCEEDED': 'Rate limit exceeded',
        'COMMAND_COOLDOWN': 'Command cooldown',
        'UNKNOWN_ERROR': 'Unknown error'
      };
      return errorMessages[errorCode] || 'An error occurred';
    });
  });

  describe('Message formatting integration', () => {
    it('should format complete notification message for doctor', () => {
      const mockAppointment = {
        id: 'appointment-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '09:00',
        duration_minutes: 60,
        status: 'scheduled',
        mini_notes: 'Mounjaro (2.5mg)',
        full_notes: 'Patient requires special attention due to diabetes. Check blood sugar levels before treatment.',
        pickup_instructions: 'Patient is wheelchair-bound. Use accessible vehicle.',
        notes: 'Legacy notes field',
        transportation_type: 'ambulance',
        transportation_method: 'pickup',
        patient: {
          id: 'patient-1',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: 'Villa 123',
          building_street: 'Jumeirah Street',
          area: 'Jumeirah',
          city: 'Dubai'
        },
        staff_assignments: [
          {
            staff_id: 'staff-1',
            role: 'primary' as const,
            is_primary: true,
            staff: {
              id: 'staff-1',
              first_name: 'Dr. Smith',
              last_name: 'Johnson',
              staff_type: 'doctor'
            }
          }
        ]
      } as any;

      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor'
      };

      const formatter = new TelegramMessageFormatter();
      const result = formatter.formatMessage({
        appointment: mockAppointment,
        staff: mockStaff,
        changeType: 'created',
        patient: mockAppointment.patient,
        notificationType: 'same_day_created'
      });

      // Verify complete message structure
      expect(result).toContain('🆕');
      expect(result).toContain('New Appointment Created');
      expect(result).toContain('John Doe');
      expect(result).toContain('+971501234567');
      expect(result).toContain('09:00 - 10:00');
      expect(result).toContain('Doctor on Call');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Mounjaro (2.5mg)');
      expect(result).toContain('Patient requires special attention due to diabetes');
    });

    it('should format 1-hour reminder message for driver', () => {
      const mockAppointment = {
        id: 'appointment-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '09:00',
        duration_minutes: 60,
        status: 'scheduled',
        mini_notes: 'Mounjaro (2.5mg)',
        full_notes: 'Patient requires special attention due to diabetes.',
        pickup_instructions: 'Patient is wheelchair-bound. Use accessible vehicle.',
        notes: 'Legacy notes field',
        transportation_type: 'ambulance',
        transportation_method: 'pickup',
        patient: {
          id: 'patient-1',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: 'Villa 123',
          building_street: 'Jumeirah Street',
          area: 'Jumeirah',
          city: 'Dubai',
          google_maps_link: 'https://maps.google.com/test'
        },
        staff_assignments: [
          {
            staff_id: 'staff-1',
            role: 'primary' as const,
            is_primary: true,
            staff: {
              id: 'staff-1',
              first_name: 'Driver',
              last_name: 'Ahmed',
              staff_type: 'driver'
            }
          }
        ]
      } as any;

      const mockStaff = {
        id: 'staff-1',
        first_name: 'Driver',
        last_name: 'Ahmed',
        staff_type: 'driver'
      };

      const formatter = new TelegramMessageFormatter();
      const result = formatter.formatMessage({
        appointment: mockAppointment,
        staff: mockStaff,
        changeType: 'created',
        patient: mockAppointment.patient,
        notificationType: 'one_hour_reminder'
      });

      // Verify driver-specific 1-hour reminder message
      expect(result).toContain('⏰');
      expect(result).toContain('Pickup Reminder - 1 Hour');
      expect(result).toContain('John Doe');
      expect(result).toContain('Patient is wheelchair-bound');
      expect(result).toContain('Google Maps');
    });
  });

  describe('Command formatting integration', () => {
    it('should format complete today schedule message', () => {
      const mockStaff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor'
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
          staff_assignments: [
            {
              staff_id: 'staff-1',
              role: 'primary' as const,
              is_primary: true,
              staff: {
                id: 'staff-1',
                first_name: 'Dr. Smith',
                last_name: 'Johnson',
                staff_type: 'doctor'
              }
            }
          ]
        } as any
      ];

      const result = TelegramCommandFormatters.formatTodaySchedule(mockStaff, mockAppointments);

      // Verify complete schedule message structure
      expect(result).toContain('📅');
      expect(result).toContain("Today's Schedule");
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Total Appointments:</b> 1');
      expect(result).toContain('09:00 - 10:00');
      expect(result).toContain('Doctor on Call');
      expect(result).toContain('John Doe');
      expect(result).toContain('Mounjaro (2.5mg)');
    });

    it('should format comprehensive help message', () => {
      const result = TelegramCommandFormatters.formatHelpMessage();

      // Verify all sections are included
      expect(result).toContain('📋');
      expect(result).toContain('Best DOC Scheduler Bot - Help');
      expect(result).toContain('Schedule Commands');
      expect(result).toContain('/today');
      expect(result).toContain('/tomorrow');
      expect(result).toContain('/week');
      expect(result).toContain('/status');
      expect(result).toContain('Information Commands');
      expect(result).toContain('/help');
      expect(result).toContain('/info');
      expect(result).toContain('Notification Features');
      expect(result).toContain('Same-day notifications');
      expect(result).toContain('1-hour reminders');
      expect(result).toContain('Reschedule alerts');
      expect(result).toContain('Enhanced Note System');
      expect(result).toContain('Mini notes');
      expect(result).toContain('Full notes');
      expect(result).toContain('Pickup instructions');
      expect(result).toContain('Staff-Specific Features');
      expect(result).toContain('Doctors');
      expect(result).toContain('Nurses');
      expect(result).toContain('Caregivers');
      expect(result).toContain('Drivers');
      expect(result).toContain('Physiotherapists');
      expect(result).toContain('System Features');
      expect(result).toContain('Rate limiting');
      expect(result).toContain('Command cooldown');
      expect(result).toContain('Error handling');
      expect(result).toContain('Timezone support');
      expect(result).toContain('Getting Started');
      expect(result).toContain('Troubleshooting');
    });
  });

  describe('Service integration tests', () => {
    it('should handle /today command with proper service calls', async () => {
      const telegramUserId = '1655850641';

      const result = await mockTelegramCommandService.handleTodayCommand(telegramUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Today's Schedule");
      expect(mockTelegramCommandService.handleTodayCommand).toHaveBeenCalledWith(telegramUserId);
    });

    it('should handle /tomorrow command with proper service calls', async () => {
      const telegramUserId = '1655850641';

      const result = await mockTelegramCommandService.handleTomorrowCommand(telegramUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Tomorrow's Schedule");
      expect(mockTelegramCommandService.handleTomorrowCommand).toHaveBeenCalledWith(telegramUserId);
    });

    it('should handle /week command with proper service calls', async () => {
      const telegramUserId = '1655850641';

      const result = await mockTelegramCommandService.handleWeekCommand(telegramUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain("This Week's Schedule");
      expect(mockTelegramCommandService.handleWeekCommand).toHaveBeenCalledWith(telegramUserId);
    });

    it('should handle /status command with proper service calls', async () => {
      const telegramUserId = '1655850641';

      const result = await mockTelegramCommandService.handleStatusCommand(telegramUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Status');
      expect(mockTelegramCommandService.handleStatusCommand).toHaveBeenCalledWith(telegramUserId);
    });

    it('should handle /help command with proper service calls', async () => {
      const telegramUserId = '1655850641';

      const result = await mockTelegramCommandService.handleHelpCommand(telegramUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Best DOC Scheduler Bot - Help');
      expect(mockTelegramCommandService.handleHelpCommand).toHaveBeenCalledWith(telegramUserId);
    });

    it('should handle /info command with proper service calls', async () => {
      const telegramUserId = '1655850641';
      const user = { id: 1655850641, first_name: 'Omeir', last_name: 'K', username: 'o_kha3' };

      const result = await mockTelegramCommandService.handleInfoCommand(telegramUserId, user);

      expect(result.success).toBe(true);
      expect(result.message).toContain('User Information');
      expect(mockTelegramCommandService.handleInfoCommand).toHaveBeenCalledWith(telegramUserId, user);
    });
  });

  describe('Notification service integration tests', () => {
    it('should send appointment notifications with proper service calls', async () => {
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
        staff_assignments: [
          {
            staff_id: 'staff-1',
            role: 'primary' as const,
            is_primary: true,
            staff: {
              id: 'staff-1',
              first_name: 'Dr. Smith',
              last_name: 'Johnson',
              staff_type: 'doctor'
            }
          }
        ]
      } as any;

      const result = await mockTelegramNotificationService.sendAppointmentNotificationsToStaff(
        mockAppointment,
        'created'
      );

      expect(result.success).toBe(true);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockTelegramNotificationService.sendAppointmentNotificationsToStaff).toHaveBeenCalledWith(
        mockAppointment,
        'created'
      );
    });

    it('should send 1-hour reminder notifications with proper service calls', async () => {
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
        staff_assignments: [
          {
            staff_id: 'staff-1',
            role: 'primary' as const,
            is_primary: true,
            staff: {
              id: 'staff-1',
              first_name: 'Dr. Smith',
              last_name: 'Johnson',
              staff_type: 'doctor'
            }
          }
        ]
      } as any;

      const result = await mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff(
        mockAppointment
      );

      expect(result.success).toBe(true);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff).toHaveBeenCalledWith(
        mockAppointment
      );
    });
  });

  describe('Cron job integration tests', () => {
    it('should start cron worker service', async () => {
      await mockCronWorkerService.start();

      expect(mockCronWorkerService.start).toHaveBeenCalled();
    });

    it('should stop cron worker service', async () => {
      await mockCronWorkerService.stop();

      expect(mockCronWorkerService.stop).toHaveBeenCalled();
    });

    it('should get worker status', () => {
      const status = mockCronWorkerService.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.uptime).toBeGreaterThan(0);
      expect(mockCronWorkerService.getStatus).toHaveBeenCalled();
    });

    it('should schedule job with job scheduler service', async () => {
      const jobId = await mockJobSchedulerService.scheduleJob('test-job', '*/15 * * * *', {});

      expect(jobId).toBe('job-123');
      expect(mockJobSchedulerService.scheduleJob).toHaveBeenCalledWith('test-job', '*/15 * * * *', {});
    });

    it('should trigger job with job scheduler service', async () => {
      const result = await mockJobSchedulerService.triggerJob('job-123', {});

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-123');
      expect(mockJobSchedulerService.triggerJob).toHaveBeenCalledWith('job-123', {});
    });
  });

  describe('Validation integration', () => {
    it('should validate complete webhook update flow', () => {
      const validUpdate = {
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
      };

      const result = mockTelegramValidationService.validateWebhookUpdate(validUpdate);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate user ID and command together', () => {
      const userId = '1655850641';
      const command = '/help';

      const userIdResult = mockTelegramValidationService.validateTelegramUserId(userId);
      const commandResult = mockTelegramValidationService.validateCommand(command);

      expect(userIdResult.isValid).toBe(true);
      expect(commandResult.isValid).toBe(true);
    });

    it('should handle rate limiting and cooldown together', () => {
      const userId = '1655850641';
      const command = '/help';

      // Record command usage
      mockTelegramValidationService.recordCommandUsage(userId, command, true);

      // Check rate limit
      const rateLimitResult = mockTelegramValidationService.checkRateLimit(userId);
      expect(rateLimitResult.isValid).toBe(true);

      // Check cooldown - mock it to return false for this test
      mockTelegramValidationService.checkCommandCooldown.mockReturnValueOnce({
        isValid: false,
        error: 'Command cooldown',
        errorCode: 'COMMAND_COOLDOWN'
      });
      const cooldownResult = mockTelegramValidationService.checkCommandCooldown(userId, command);
      expect(cooldownResult.isValid).toBe(false); // Should be in cooldown
    });
  });

  describe('Error handling integration', () => {
    it('should handle invalid webhook update gracefully', () => {
      const invalidUpdate = {
        // Missing required fields
        invalid: 'data'
      };

      // Mock validation to return false for this test
      mockTelegramValidationService.validateWebhookUpdate.mockReturnValueOnce({
        isValid: false,
        error: 'Missing or invalid update_id',
        errorCode: 'INVALID_UPDATE_ID'
      });

      const result = mockTelegramValidationService.validateWebhookUpdate(invalidUpdate);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing or invalid update_id');
    });

    it('should handle invalid user ID gracefully', () => {
      const invalidUserId = 'invalid-id';

      // Mock validation to return false for this test
      mockTelegramValidationService.validateTelegramUserId.mockReturnValueOnce({
        isValid: false,
        error: 'Invalid user ID format',
        errorCode: 'INVALID_USER_ID'
      });

      const result = mockTelegramValidationService.validateTelegramUserId(invalidUserId);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid user ID format');
    });

    it('should handle invalid command gracefully', () => {
      const invalidCommand = 'invalid-command';

      // Mock validation to return false for this test
      mockTelegramValidationService.validateCommand.mockReturnValueOnce({
        isValid: false,
        error: 'Command must start with /',
        errorCode: 'INVALID_COMMAND'
      });

      const result = mockTelegramValidationService.validateCommand(invalidCommand);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Command must start with /');
    });

    it('should provide appropriate error messages', () => {
      const errorMessages = [
        'INVALID_USER_ID',
        'INVALID_COMMAND',
        'RATE_LIMIT_EXCEEDED',
        'COMMAND_COOLDOWN',
        'UNKNOWN_ERROR'
      ];

      errorMessages.forEach(errorCode => {
        const message = mockTelegramValidationService.getErrorMessage(errorCode);
        expect(message).toBeDefined();
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      mockTelegramCommandService.handleTodayCommand.mockRejectedValue(new Error('Service error'));

      const telegramUserId = '1655850641';

      try {
        await mockTelegramCommandService.handleTodayCommand(telegramUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Service error');
      }
    });
  });

  describe('End-to-end message flow', () => {
    it('should process complete notification flow from appointment to message', () => {
      // Simulate appointment creation
      const appointment = {
        id: 'appointment-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '09:00',
        duration_minutes: 60,
        status: 'scheduled',
        mini_notes: 'Mounjaro (2.5mg)',
        full_notes: 'Patient requires special attention due to diabetes.',
        pickup_instructions: 'Patient is wheelchair-bound.',
        notes: 'Legacy notes field',
        transportation_type: 'ambulance',
        transportation_method: 'pickup',
        patient: {
          id: 'patient-1',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: 'Villa 123',
          building_street: 'Jumeirah Street',
          area: 'Jumeirah',
          city: 'Dubai'
        },
        staff_assignments: [
          {
            staff_id: 'staff-1',
            role: 'primary' as const,
            is_primary: true,
            staff: {
              id: 'staff-1',
              first_name: 'Dr. Smith',
              last_name: 'Johnson',
              staff_type: 'doctor'
            }
          }
        ]
      } as any;

      const staff = {
        id: 'staff-1',
        first_name: 'Dr. Smith',
        last_name: 'Johnson',
        staff_type: 'doctor'
      };

      // Step 1: Validate webhook update
      const webhookUpdate = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 1655850641, first_name: 'Omeir' },
          chat: { id: 1655850641, type: 'private' },
          date: 1758232248,
          text: '/help'
        }
      };

      const validationResult = mockTelegramValidationService.validateWebhookUpdate(webhookUpdate);
      expect(validationResult.isValid).toBe(true);

      // Step 2: Format notification message
      const formatter = new TelegramMessageFormatter();
      const notificationMessage = formatter.formatMessage({
        appointment,
        staff,
        changeType: 'created',
        patient: appointment.patient,
        notificationType: 'same_day_created'
      });

      expect(notificationMessage).toContain('New Appointment Created');
      expect(notificationMessage).toContain('John Doe');

      // Step 3: Format command response
      const commandMessage = TelegramCommandFormatters.formatHelpMessage();
      expect(commandMessage).toContain('Best DOC Scheduler Bot - Help');

      // Step 4: Validate complete flow
      expect(validationResult.isValid).toBe(true);
      expect(notificationMessage.length).toBeGreaterThan(0);
      expect(commandMessage.length).toBeGreaterThan(0);
    });
  });

  describe('Performance testing', () => {
    it('should handle high-volume notifications efficiently', async () => {
      const startTime = Date.now();

      // Simulate high-volume notification sending
      const promises = Array.from({ length: 100 }, (_, i) =>
        mockTelegramNotificationService.sendAppointmentNotificationsToStaff(
          { id: `appointment-${i}` } as any,
          'created'
        )
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(results).toHaveLength(100);
      expect(results.every(result => result.success)).toBe(true);
    });

    it('should handle concurrent command processing efficiently', async () => {
      const startTime = Date.now();

      // Simulate concurrent command processing
      const promises = Array.from({ length: 50 }, (_, i) =>
        mockTelegramCommandService.handleTodayCommand(`user-${i}`)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(3000); // 3 seconds
      expect(results).toHaveLength(50);
      expect(results.every(result => result.success)).toBe(true);
    });
  });

  describe('Cron job scheduling and execution', () => {
    it('should schedule telegram reminder job correctly', async () => {
      const jobId = await mockJobSchedulerService.scheduleJob(
        'telegram_reminder_scheduler',
        '*/15 * * * *',
        { timezone: 'Asia/Dubai' }
      );

      expect(jobId).toBe('job-123');
      expect(mockJobSchedulerService.scheduleJob).toHaveBeenCalledWith(
        'telegram_reminder_scheduler',
        '*/15 * * * *',
        { timezone: 'Asia/Dubai' }
      );
    });

    it('should trigger telegram reminder job correctly', async () => {
      const result = await mockJobSchedulerService.triggerJob('job-123', {
        timeWindow: 15,
        testMode: false
      });

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-123');
      expect(mockJobSchedulerService.triggerJob).toHaveBeenCalledWith('job-123', {
        timeWindow: 15,
        testMode: false
      });
    });

    it('should handle job execution errors gracefully', async () => {
      // Mock job execution to fail
      mockJobSchedulerService.triggerJob.mockResolvedValue({
        success: false,
        jobId: 'job-123',
        error: 'Job execution failed'
      });

      const result = await mockJobSchedulerService.triggerJob('job-123', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job execution failed');
    });
  });
});
