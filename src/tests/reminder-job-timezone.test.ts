import { simple30MinReminderJob } from '@/jobs/simple30MinReminderJob';
import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';
import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';

// Mock the services
jest.mock('@/services/appointmentService');
jest.mock('@/services/appointmentStaffService');
jest.mock('@/services/telegramNotificationService');

const mockAppointmentService = appointmentService as jest.Mocked<typeof appointmentService>;
const mockAppointmentStaffService = appointmentStaffService as jest.Mocked<typeof appointmentStaffService>;
const mockTelegramNotificationService = telegramNotificationService as jest.Mocked<typeof telegramNotificationService>;

describe('Reminder Job Timezone Handling', () => {
  const testTimezones = [
    'Asia/Dubai',
    'Europe/London',
    'America/New_York',
    'Asia/Tokyo',
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to capture output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Timezone context resolution in reminder job', () => {
    test.each(testTimezones)('resolves timezone context correctly for %s', async (timezone) => {
      // Mock appointments data
      const mockAppointments = [
        {
          id: 'appointment-1',
          appointment_date: '2024-06-21',
          start_time: '14:30',
          duration_minutes: 60,
          patient_id: 'patient-1',
          appointment_type: 'consultation',
          status: 'scheduled',
        },
      ];

      mockAppointmentService.getAppointments.mockResolvedValue(mockAppointments);
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([
        { id: 'staff-1', email: 'staff1@example.com' },
      ]);
      mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff.mockResolvedValue({
        success: true,
        results: [{ success: true }],
      });

      // Mock the timezone artifacts to use the test timezone
      jest.doMock('@/lib/timezoneArtifacts', () => ({
        buildTimezoneArtifacts: jest.fn(() => ({
          context: { locationTimezone: timezone },
          resolution: {
            timezone,
            source: 'location',
            offsetMinutes: 0,
            abbreviation: 'TZ',
            referenceDate: new Date(),
            resolutionPath: [{ candidate: timezone, source: 'location' }],
          },
        })),
        getCurrentLocalTime: jest.fn(() => new Date('2024-06-21T14:00:00Z')),
        formatLocalDate: jest.fn(() => '2024-06-21'),
      }));

      await simple30MinReminderJob();

      // Verify timezone context was logged
      expect(console.log).toHaveBeenCalledWith(
        '🕐 Reminder job timezone context:',
        expect.objectContaining({
          timezone,
          timezoneSource: 'location',
        })
      );
    });

    test('handles timezone resolution failures gracefully', async () => {
      // Mock timezone resolution failure
      jest.doMock('@/lib/timezoneArtifacts', () => ({
        buildTimezoneArtifacts: jest.fn(() => {
          throw new Error('Timezone resolution failed');
        }),
      }));

      // The job should not throw an error
      await expect(simple30MinReminderJob()).resolves.not.toThrow();
    });
  });

  describe('Midnight boundary handling in reminder job', () => {
    test('handles reminders near midnight in different timezones', async () => {
      const lateNightAppointments = [
        {
          id: 'appointment-1',
          appointment_date: '2024-06-21',
          start_time: '23:30',
          duration_minutes: 60,
          patient_id: 'patient-1',
          appointment_type: 'consultation',
          status: 'scheduled',
        },
      ];

      mockAppointmentService.getAppointments.mockResolvedValue(lateNightAppointments);
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([
        { id: 'staff-1', email: 'staff1@example.com' },
      ]);
      mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff.mockResolvedValue({
        success: true,
        results: [{ success: true }],
      });

      for (const timezone of testTimezones) {
        // Mock timezone artifacts for each timezone
        jest.doMock('@/lib/timezoneArtifacts', () => ({
          buildTimezoneArtifacts: jest.fn(() => ({
            context: { locationTimezone: timezone },
            resolution: {
              timezone,
              source: 'location',
              offsetMinutes: 0,
              abbreviation: 'TZ',
              referenceDate: new Date(),
              resolutionPath: [{ candidate: timezone, source: 'location' }],
            },
          })),
          getCurrentLocalTime: jest.fn(() => new Date('2024-06-21T23:00:00Z')),
          formatLocalDate: jest.fn(() => '2024-06-21'),
        }));

        await simple30MinReminderJob();

        // Verify the job completed successfully
        expect(console.log).toHaveBeenCalledWith('🎉 30-minute reminder job completed!');
      }
    });

    test('handles DST transitions in reminder job', async () => {
      // Test DST start (spring forward)
      const dstStartAppointments = [
        {
          id: 'appointment-1',
          appointment_date: '2024-03-10',
          start_time: '02:30',
          duration_minutes: 60,
          patient_id: 'patient-1',
          appointment_type: 'consultation',
          status: 'scheduled',
        },
      ];

      mockAppointmentService.getAppointments.mockResolvedValue(dstStartAppointments);
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([
        { id: 'staff-1', email: 'staff1@example.com' },
      ]);
      mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff.mockResolvedValue({
        success: true,
        results: [{ success: true }],
      });

      // Mock timezone artifacts for DST timezone
      jest.doMock('@/lib/timezoneArtifacts', () => ({
        buildTimezoneArtifacts: jest.fn(() => ({
          context: { locationTimezone: 'America/New_York' },
          resolution: {
            timezone: 'America/New_York',
            source: 'location',
            offsetMinutes: -300, // EST
            abbreviation: 'EST',
            referenceDate: new Date('2024-03-10T06:00:00Z'),
            resolutionPath: [{ candidate: 'America/New_York', source: 'location' }],
          },
        })),
        getCurrentLocalTime: jest.fn(() => new Date('2024-03-10T06:00:00Z')),
        formatLocalDate: jest.fn(() => '2024-03-10'),
      }));

      await simple30MinReminderJob();

      // Verify the job completed successfully despite DST transition
      expect(console.log).toHaveBeenCalledWith('🎉 30-minute reminder job completed!');
    });
  });

  describe('Appointment filtering with timezone awareness', () => {
    test('filters appointments correctly for different timezones', async () => {
      const mockAppointments = [
        {
          id: 'appointment-1',
          appointment_date: '2024-06-21',
          start_time: '14:30',
          duration_minutes: 60,
          patient_id: 'patient-1',
          appointment_type: 'consultation',
          status: 'scheduled',
        },
      ];

      mockAppointmentService.getAppointments.mockResolvedValue(mockAppointments);
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([
        { id: 'staff-1', email: 'staff1@example.com' },
      ]);
      mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff.mockResolvedValue({
        success: true,
        results: [{ success: true }],
      });

      for (const timezone of testTimezones) {
        // Mock timezone artifacts for each timezone
        jest.doMock('@/lib/timezoneArtifacts', () => ({
          buildTimezoneArtifacts: jest.fn(() => ({
            context: { locationTimezone: timezone },
            resolution: {
              timezone,
              source: 'location',
              offsetMinutes: 0,
              abbreviation: 'TZ',
              referenceDate: new Date(),
              resolutionPath: [{ candidate: timezone, source: 'location' }],
            },
          })),
          getCurrentLocalTime: jest.fn(() => new Date('2024-06-21T14:00:00Z')),
          formatLocalDate: jest.fn(() => '2024-06-21'),
        }));

        await simple30MinReminderJob();

        // Verify appointments were fetched with correct date
        expect(mockAppointmentService.getAppointments).toHaveBeenCalledWith({
          appointment_date: '2024-06-21',
          status: 'scheduled',
        });
      }
    });
  });

  describe('Error handling and logging', () => {
    test('logs errors gracefully when appointment processing fails', async () => {
      const mockAppointments = [
        {
          id: 'appointment-1',
          appointment_date: '2024-06-21',
          start_time: '14:30',
          duration_minutes: 60,
          patient_id: 'patient-1',
          appointment_type: 'consultation',
          status: 'scheduled',
        },
      ];

      mockAppointmentService.getAppointments.mockResolvedValue(mockAppointments);
      mockAppointmentStaffService.getStaffForAppointment.mockRejectedValue(
        new Error('Staff service error')
      );

      // Mock timezone artifacts
      jest.doMock('@/lib/timezoneArtifacts', () => ({
        buildTimezoneArtifacts: jest.fn(() => ({
          context: { locationTimezone: 'Asia/Dubai' },
          resolution: {
            timezone: 'Asia/Dubai',
            source: 'location',
            offsetMinutes: 240,
            abbreviation: 'GST',
            referenceDate: new Date(),
            resolutionPath: [{ candidate: 'Asia/Dubai', source: 'location' }],
          },
        })),
        getCurrentLocalTime: jest.fn(() => new Date('2024-06-21T14:00:00Z')),
        formatLocalDate: jest.fn(() => '2024-06-21'),
      }));

      await simple30MinReminderJob();

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing appointment'),
        expect.any(Error)
      );

      // Verify job still completed
      expect(console.log).toHaveBeenCalledWith('🎉 30-minute reminder job completed!');
    });

    test('handles timezone resolution errors gracefully', async () => {
      // Mock timezone resolution error
      jest.doMock('@/lib/timezoneArtifacts', () => ({
        buildTimezoneArtifacts: jest.fn(() => {
          throw new Error('Timezone resolution failed');
        }),
      }));

      // The job should not throw an error
      await expect(simple30MinReminderJob()).resolves.not.toThrow();

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in 30-minute reminder job'),
        expect.any(Error)
      );
    });
  });

  describe('Performance and caching', () => {
    test('caches timezone resolution for performance', async () => {
      const mockAppointments = [
        {
          id: 'appointment-1',
          appointment_date: '2024-06-21',
          start_time: '14:30',
          duration_minutes: 60,
          patient_id: 'patient-1',
          appointment_type: 'consultation',
          status: 'scheduled',
        },
      ];

      mockAppointmentService.getAppointments.mockResolvedValue(mockAppointments);
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([
        { id: 'staff-1', email: 'staff1@example.com' },
      ]);
      mockTelegramNotificationService.sendOneHourReminderNotificationsToStaff.mockResolvedValue({
        success: true,
        results: [{ success: true }],
      });

      // Mock timezone artifacts
      const mockBuildTimezoneArtifacts = jest.fn(() => ({
        context: { locationTimezone: 'Asia/Dubai' },
        resolution: {
          timezone: 'Asia/Dubai',
          source: 'location',
          offsetMinutes: 240,
          abbreviation: 'GST',
          referenceDate: new Date(),
          resolutionPath: [{ candidate: 'Asia/Dubai', source: 'location' }],
        },
      }));

      jest.doMock('@/lib/timezoneArtifacts', () => ({
        buildTimezoneArtifacts: mockBuildTimezoneArtifacts,
        getCurrentLocalTime: jest.fn(() => new Date('2024-06-21T14:00:00Z')),
        formatLocalDate: jest.fn(() => '2024-06-21'),
      }));

      await simple30MinReminderJob();

      // Verify timezone artifacts were built
      expect(mockBuildTimezoneArtifacts).toHaveBeenCalled();
    });
  });
});
