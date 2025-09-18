/**
 * Unit tests for TelegramCommandFormatters
 * Tests command response formatting for all schedule commands
 */

import { TelegramCommandFormatters } from './telegramCommandFormatters';

describe('TelegramCommandFormatters', () => {
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

  describe('formatTodaySchedule', () => {
    it('should format today\'s schedule with proper structure', () => {
      const result = TelegramCommandFormatters.formatTodaySchedule(mockStaff, mockAppointments);

      expect(result).toContain('📅');
      expect(result).toContain('Today\'s Schedule');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Total Appointments:</b> 1');
      expect(result).toContain('09:00 - 10:00');
      expect(result).toContain('Doctor on Call');
      expect(result).toContain('John Doe');
      expect(result).toContain('Mounjaro (2.5mg)');
    });

    it('should handle empty appointments list', () => {
      const result = TelegramCommandFormatters.formatTodaySchedule(mockStaff, []);

      expect(result).toContain('📅');
      expect(result).toContain('Today\'s Schedule');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Total Appointments:</b> 0');
      expect(result).toContain('No appointments scheduled.');
    });
  });

  describe('formatHelpMessage', () => {
    it('should format comprehensive help message', () => {
      const result = TelegramCommandFormatters.formatHelpMessage();

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
    });
  });

  describe('formatAppointmentType', () => {
    it('should format appointment type correctly', () => {
      expect(TelegramCommandFormatters.formatAppointmentType('doctor_on_call')).toBe('Doctor on Call');
      expect(TelegramCommandFormatters.formatAppointmentType('lab_test')).toBe('Lab Test');
      expect(TelegramCommandFormatters.formatAppointmentType('teleconsultation')).toBe('Teleconsultation');
      expect(TelegramCommandFormatters.formatAppointmentType('physiotherapy')).toBe('Physiotherapy');
      expect(TelegramCommandFormatters.formatAppointmentType('caregiver')).toBe('Caregiver');
      expect(TelegramCommandFormatters.formatAppointmentType('iv_therapy')).toBe('IV Therapy');
    });
  });

  describe('formatStaffType', () => {
    it('should format staff type correctly', () => {
      expect(TelegramCommandFormatters.formatStaffType('doctor')).toBe('Doctor');
      expect(TelegramCommandFormatters.formatStaffType('nurse')).toBe('Nurse');
      expect(TelegramCommandFormatters.formatStaffType('physiotherapist')).toBe('Physiotherapist');
      expect(TelegramCommandFormatters.formatStaffType('caregiver')).toBe('Caregiver');
      expect(TelegramCommandFormatters.formatStaffType('driver')).toBe('Driver');
      expect(TelegramCommandFormatters.formatStaffType('lab_technician')).toBe('Lab Technician');
    });
  });
});
