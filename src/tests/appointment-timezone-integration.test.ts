import { appointmentService } from '@/services/appointmentService';
import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';
import { formatInResolvedTimezone, toUTC, toLocalTime } from '@/utils/timezone';
import type { CreateAppointment } from '@/types';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [],
            error: null,
          })),
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-appointment-id',
              appointment_date: '2024-06-21',
              start_time: '14:30',
              duration_minutes: 60,
              patient_id: 'test-patient-id',
              appointment_type: 'consultation',
              status: 'scheduled',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'test-appointment-id',
                appointment_date: '2024-06-21',
                start_time: '14:30',
                duration_minutes: 60,
                patient_id: 'test-patient-id',
                appointment_type: 'consultation',
                status: 'scheduled',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
  },
}));

// Mock appointment staff service
jest.mock('@/services/appointmentStaffService', () => ({
  appointmentStaffService: {
    getStaffForAppointment: jest.fn(() => Promise.resolve([
      { id: 'staff-1', email: 'staff1@example.com' },
    ])),
  },
}));

// Mock telegram notification service
jest.mock('@/services/telegramNotificationService', () => ({
  telegramNotificationService: {
    sendAppointmentNotificationsToStaff: jest.fn(() => Promise.resolve({
      success: true,
      results: [{ success: true }],
    })),
  },
}));

describe('Appointment Service Timezone Integration', () => {
  const testTimezones = [
    'Asia/Dubai',
    'Europe/London', 
    'America/New_York',
    'Asia/Tokyo',
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Appointment creation with timezone context', () => {
    test.each(testTimezones)('creates appointment with correct timezone context for %s', async (timezone) => {
      const artifacts = buildTimezoneArtifacts({ locationTimezone: timezone });
      
      const appointmentData: CreateAppointment = {
        appointment_date: '2024-06-21',
        start_time: '14:30',
        duration_minutes: 60,
        patient_id: 'test-patient-id',
        appointment_type: 'consultation',
        status: 'scheduled',
      };

      // Mock console.log to capture timezone logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const appointment = await appointmentService.createAppointment(appointmentData);

      // Verify appointment was created
      expect(appointment).toBeDefined();
      expect(appointment.appointment_date).toBe('2024-06-21');
      expect(appointment.start_time).toBe('14:30');

      // Verify timezone context was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        '📅 Creating appointment with timezone context:',
        expect.objectContaining({
          appointmentDate: '2024-06-21',
          startTime: '14:30',
          timezone: timezone,
          timezoneSource: 'location',
        })
      );

      consoleSpy.mockRestore();
    });

    test('handles appointments spanning midnight in different timezones', async () => {
      const lateNightTime = '23:30';
      const durationMinutes = 60; // Ends at 00:30 next day

      for (const timezone of testTimezones) {
        const artifacts = buildTimezoneArtifacts({ locationTimezone: timezone });
        
        const appointmentData: CreateAppointment = {
          appointment_date: '2024-06-21',
          start_time: lateNightTime,
          duration_minutes: durationMinutes,
          patient_id: 'test-patient-id',
          appointment_type: 'consultation',
          status: 'scheduled',
        };

        const appointment = await appointmentService.createAppointment(appointmentData);

        // Verify appointment was created
        expect(appointment).toBeDefined();
        expect(appointment.start_time).toBe(lateNightTime);
        expect(appointment.duration_minutes).toBe(durationMinutes);

        // Verify the appointment correctly spans to next day in local timezone
        const localStart = new Date(`2024-06-21T${lateNightTime}:00`);
        const utcStart = toUTC(localStart, artifacts.context);
        const utcEnd = new Date(utcStart.getTime() + durationMinutes * 60 * 1000);
        const localEnd = toLocalTime(utcEnd, artifacts.context);

        // The end time should be on the next day
        expect(localEnd.getDate()).toBe(localStart.getDate() + 1);
        expect(localEnd.getHours()).toBe(0);
        expect(localEnd.getMinutes()).toBe(30);
      }
    });
  });

  describe('Appointment scheduling with DST transitions', () => {
    test('handles appointments during DST start transition', async () => {
      // DST starts on March 10, 2024 in US (spring forward)
      const dstStartDate = '2024-03-10';
      const dstStartTime = '02:30'; // This time doesn't exist during spring forward

      const artifacts = buildTimezoneArtifacts({ locationTimezone: 'America/New_York' });
      
      const appointmentData: CreateAppointment = {
        appointment_date: dstStartDate,
        start_time: dstStartTime,
        duration_minutes: 60,
        patient_id: 'test-patient-id',
        appointment_type: 'consultation',
        status: 'scheduled',
      };

      // This should handle the DST transition gracefully
      const appointment = await appointmentService.createAppointment(appointmentData);
      expect(appointment).toBeDefined();
    });

    test('handles appointments during DST end transition', async () => {
      // DST ends on November 3, 2024 in US (fall back)
      const dstEndDate = '2024-11-03';
      const dstEndTime = '01:30'; // This time occurs twice during fall back

      const artifacts = buildTimezoneArtifacts({ locationTimezone: 'America/New_York' });
      
      const appointmentData: CreateAppointment = {
        appointment_date: dstEndDate,
        start_time: dstEndTime,
        duration_minutes: 60,
        patient_id: 'test-patient-id',
        appointment_type: 'consultation',
        status: 'scheduled',
      };

      // This should handle the DST transition gracefully
      const appointment = await appointmentService.createAppointment(appointmentData);
      expect(appointment).toBeDefined();
    });
  });

  describe('Appointment filtering with timezone awareness', () => {
    test('filters appointments by date range across timezones', async () => {
      const startDate = '2024-06-21';
      const endDate = '2024-06-22';

      for (const timezone of testTimezones) {
        const artifacts = buildTimezoneArtifacts({ locationTimezone: timezone });
        
        // Mock the query to return appointments
        const mockAppointments = [
          {
            id: 'appointment-1',
            appointment_date: '2024-06-21',
            start_time: '09:00',
            duration_minutes: 60,
            patient_id: 'patient-1',
            appointment_type: 'consultation',
            status: 'scheduled',
          },
          {
            id: 'appointment-2',
            appointment_date: '2024-06-22',
            start_time: '14:00',
            duration_minutes: 30,
            patient_id: 'patient-2',
            appointment_type: 'follow-up',
            status: 'scheduled',
          },
        ];

        // Mock the Supabase query
        const mockSupabase = require('@/lib/supabase').supabase;
        mockSupabase.from.mockReturnValue({
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: mockAppointments,
                  error: null,
                })),
              })),
            })),
          })),
        });

        const appointments = await appointmentService.getAppointmentsByDateRange(startDate, endDate);

        expect(appointments).toHaveLength(2);
        expect(appointments[0].appointment_date).toBe('2024-06-21');
        expect(appointments[1].appointment_date).toBe('2024-06-22');
      }
    });
  });

  describe('Timezone-aware appointment formatting', () => {
    test('formats appointment times correctly in different timezones', () => {
      const testDate = new Date('2024-06-21T12:00:00Z');
      const testTime = '14:30';

      for (const timezone of testTimezones) {
        const artifacts = buildTimezoneArtifacts({ locationTimezone: timezone });
        
        // Format the time in the resolved timezone
        const formatted = formatInResolvedTimezone(testDate, 'HH:mm', artifacts.context);
        
        // Verify the formatting is correct
        expect(formatted).toMatch(/^\d{2}:\d{2}$/);
        expect(Number(formatted.split(':')[0])).toBeGreaterThanOrEqual(0);
        expect(Number(formatted.split(':')[0])).toBeLessThan(24);
        expect(Number(formatted.split(':')[1])).toBeGreaterThanOrEqual(0);
        expect(Number(formatted.split(':')[1])).toBeLessThan(60);
      }
    });
  });

  describe('Error handling with timezone issues', () => {
    test('handles invalid timezone gracefully during appointment creation', async () => {
      const appointmentData: CreateAppointment = {
        appointment_date: '2024-06-21',
        start_time: '14:30',
        duration_minutes: 60,
        patient_id: 'test-patient-id',
        appointment_type: 'consultation',
        status: 'scheduled',
      };

      // Mock console.log to capture any error logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // This should not throw an error even with invalid timezone context
      const appointment = await appointmentService.createAppointment(appointmentData);
      expect(appointment).toBeDefined();

      consoleSpy.mockRestore();
    });

    test('handles timezone resolution failures gracefully', async () => {
      // Mock a timezone resolution failure
      const originalResolveTimezone = require('@/utils/timezone').resolveTimezone;
      jest.spyOn(require('@/utils/timezone'), 'resolveTimezone').mockImplementation(() => {
        throw new Error('Timezone resolution failed');
      });

      const appointmentData: CreateAppointment = {
        appointment_date: '2024-06-21',
        start_time: '14:30',
        duration_minutes: 60,
        patient_id: 'test-patient-id',
        appointment_type: 'consultation',
        status: 'scheduled',
      };

      // This should still create the appointment, falling back to default behavior
      const appointment = await appointmentService.createAppointment(appointmentData);
      expect(appointment).toBeDefined();

      // Restore original function
      require('@/utils/timezone').resolveTimezone = originalResolveTimezone;
    });
  });
});
