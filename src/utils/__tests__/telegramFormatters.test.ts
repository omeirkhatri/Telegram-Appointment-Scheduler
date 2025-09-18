/**
 * Unit tests for TelegramMessageFormatter
 * Tests staff-specific message formatting for all notification types
 */

import { TelegramMessageFormatter } from '../telegramFormatters';

describe('TelegramMessageFormatter', () => {
  const mockAppointment = {
    id: 'test-appointment-1',
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

  describe('formatMessage', () => {
    it('should format same-day created message for doctor', () => {
      const formatter = new TelegramMessageFormatter();
      const result = formatter.formatMessage({
        appointment: mockAppointment,
        staff: mockStaff,
        changeType: 'created',
        patient: mockAppointment.patient,
        notificationType: 'same_day_created'
      });

      expect(result).toContain('🆕');
      expect(result).toContain('New Appointment Created');
      expect(result).toContain('John Doe');
      expect(result).toContain('+971501234567');
      expect(result).toContain('Villa 123, Jumeirah Street, Jumeirah, Dubai');
      expect(result).toContain('09:00 - 10:00');
      expect(result).toContain('Doctor on Call');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Mounjaro (2.5mg)');
    });

    it('should format 1-hour reminder message for doctor', () => {
      const formatter = new TelegramMessageFormatter();
      const result = formatter.formatMessage({
        appointment: mockAppointment,
        staff: mockStaff,
        changeType: 'created',
        patient: mockAppointment.patient,
        notificationType: 'one_hour_reminder'
      });

      expect(result).toContain('⏰');
      expect(result).toContain('Appointment Reminder - 1 Hour');
      expect(result).toContain('Patient requires special attention due to diabetes');
    });

    it('should format reschedule message for doctor', () => {
      const formatter = new TelegramMessageFormatter();
      const result = formatter.formatMessage({
        appointment: mockAppointment,
        staff: mockStaff,
        changeType: 'updated',
        patient: mockAppointment.patient,
        notificationType: 'rescheduled'
      });

      expect(result).toContain('🔄');
      expect(result).toContain('Appointment Rescheduled');
    });

    it('should format cancellation message for doctor', () => {
      const formatter = new TelegramMessageFormatter();
      const result = formatter.formatMessage({
        appointment: mockAppointment,
        staff: mockStaff,
        changeType: 'cancelled',
        patient: mockAppointment.patient,
        notificationType: 'cancelled'
      });

      expect(result).toContain('❌');
      expect(result).toContain('Appointment Cancelled');
    });
  });

  describe('getNotificationEmoji', () => {
    it('should return correct emoji for one_hour_reminder', () => {
      const formatter = new TelegramMessageFormatter();
      const emoji = (formatter as any).getNotificationEmoji('created', 'one_hour_reminder');
      expect(emoji).toBe('⏰');
    });

    it('should return correct emoji for rescheduled', () => {
      const formatter = new TelegramMessageFormatter();
      const emoji = (formatter as any).getNotificationEmoji('updated', 'rescheduled');
      expect(emoji).toBe('🔄');
    });

    it('should return correct emoji for cancelled', () => {
      const formatter = new TelegramMessageFormatter();
      const emoji = (formatter as any).getNotificationEmoji('cancelled', 'cancelled');
      expect(emoji).toBe('❌');
    });
  });

  describe('getNotificationAction', () => {
    it('should return correct action for one_hour_reminder', () => {
      const formatter = new TelegramMessageFormatter();
      const action = (formatter as any).getNotificationAction('created', 'one_hour_reminder');
      expect(action).toBe('Appointment Reminder - 1 Hour');
    });

    it('should return correct action for rescheduled', () => {
      const formatter = new TelegramMessageFormatter();
      const action = (formatter as any).getNotificationAction('updated', 'rescheduled');
      expect(action).toBe('Appointment Rescheduled');
    });

    it('should return correct action for cancelled', () => {
      const formatter = new TelegramMessageFormatter();
      const action = (formatter as any).getNotificationAction('cancelled', 'cancelled');
      expect(action).toBe('Appointment Cancelled');
    });
  });
});
