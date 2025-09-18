/**
 * Unit tests for TelegramCommandFormatters
 * Tests command response formatting for all schedule commands
 */

import { TelegramCommandFormatters } from '../telegramCommandFormatters';

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
          staff: {
            id: 'staff-1',
            first_name: 'Dr. Smith',
            last_name: 'Johnson',
            staff_type: 'doctor'
          }
        }
      ]
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
      },
      staff_assignments: [
        {
          staff_id: 'staff-2',
          role: 'primary' as const,
          staff: {
            id: 'staff-2',
            first_name: 'Nurse',
            last_name: 'Mary',
            staff_type: 'nurse'
          }
        }
      ]
    }
  ];

  describe('formatTodaySchedule', () => {
    it('should format today\'s schedule with proper structure', () => {
      const result = TelegramCommandFormatters.formatTodaySchedule(mockStaff, mockAppointments);

      expect(result).toContain('📅');
      expect(result).toContain('Today\'s Schedule');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Total: 2 appointments');
      expect(result).toContain('09:00 - 10:00');
      expect(result).toContain('Doctor on Call');
      expect(result).toContain('John Doe');
      expect(result).toContain('Mounjaro (2.5mg)');
      expect(result).toContain('14:00 - 15:00');
      expect(result).toContain('Lab Test');
      expect(result).toContain('Maryam Hassan');
      expect(result).toContain('Blood work - fasting required');
    });

    it('should handle empty appointments list', () => {
      const result = TelegramCommandFormatters.formatTodaySchedule(mockStaff, []);

      expect(result).toContain('📅');
      expect(result).toContain('Today\'s Schedule');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Total: 0 appointments');
      expect(result).toContain('No appointments scheduled today.');
    });
  });

  describe('formatTomorrowSchedule', () => {
    it('should format tomorrow\'s schedule with proper structure', () => {
      const result = TelegramCommandFormatters.formatTomorrowSchedule(mockStaff, mockAppointments);

      expect(result).toContain('📅');
      expect(result).toContain('Tomorrow\'s Schedule');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Total: 2 appointments');
    });
  });

  describe('formatWeekSchedule', () => {
    it('should format week schedule with proper structure', () => {
      const result = TelegramCommandFormatters.formatWeekSchedule(mockStaff, mockAppointments);

      expect(result).toContain('📅');
      expect(result).toContain('This Week\'s Schedule');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Total Appointments: 2');
    });

    it('should handle empty appointments list for week', () => {
      const result = TelegramCommandFormatters.formatWeekSchedule(mockStaff, []);

      expect(result).toContain('📅');
      expect(result).toContain('This Week\'s Schedule');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Total Appointments: 0');
      expect(result).toContain('No appointments scheduled this week.');
    });
  });

  describe('formatStatusMessage', () => {
    it('should format status message with current appointment', () => {
      const currentAppointment = mockAppointments[0];
      const nextAppointment = mockAppointments[1];

      const result = TelegramCommandFormatters.formatStatusMessage(
        mockStaff,
        currentAppointment,
        nextAppointment
      );

      expect(result).toContain('📊');
      expect(result).toContain('Current Status');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('Current Appointment');
      expect(result).toContain('John Doe');
      expect(result).toContain('Next Appointment');
      expect(result).toContain('Maryam Hassan');
    });

    it('should format status message without current appointment', () => {
      const nextAppointment = mockAppointments[0];

      const result = TelegramCommandFormatters.formatStatusMessage(
        mockStaff,
        null,
        nextAppointment
      );

      expect(result).toContain('📊');
      expect(result).toContain('Current Status');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('No current appointment');
      expect(result).toContain('Next Appointment');
      expect(result).toContain('John Doe');
    });

    it('should format status message with no appointments', () => {
      const result = TelegramCommandFormatters.formatStatusMessage(
        mockStaff,
        null,
        null
      );

      expect(result).toContain('📊');
      expect(result).toContain('Current Status');
      expect(result).toContain('Dr. Smith Johnson');
      expect(result).toContain('No current appointment');
      expect(result).toContain('No upcoming appointments');
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

  describe('formatInfoMessage', () => {
    it('should format info message with user details', () => {
      const user = {
        id: 1655850641,
        first_name: 'Omeir',
        last_name: 'K',
        username: 'o_kha3',
        language_code: 'en'
      };

      const result = TelegramCommandFormatters.formatInfoMessage(user);

      expect(result).toContain('ℹ️');
      expect(result).toContain('Your Telegram Information');
      expect(result).toContain('1655850641');
      expect(result).toContain('Omeir K');
      expect(result).toContain('@o_kha3');
      expect(result).toContain('en');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with code and details', () => {
      const result = TelegramCommandFormatters.formatErrorMessage(
        'RATE_LIMITED',
        'You have exceeded the rate limit. Please wait 1 minute before trying again.'
      );

      expect(result).toContain('❌');
      expect(result).toContain('Error');
      expect(result).toContain('RATE_LIMITED');
      expect(result).toContain('You have exceeded the rate limit');
    });
  });

  describe('formatRateLimitMessage', () => {
    it('should format rate limit message with remaining attempts', () => {
      const result = TelegramCommandFormatters.formatRateLimitMessage(3);

      expect(result).toContain('⏰');
      expect(result).toContain('Rate Limited');
      expect(result).toContain('3 commands remaining');
      expect(result).toContain('Wait 1 minute');
    });
  });

  describe('formatCooldownMessage', () => {
    it('should format cooldown message with remaining time', () => {
      const result = TelegramCommandFormatters.formatCooldownMessage(5);

      expect(result).toContain('⏳');
      expect(result).toContain('Command Cooldown');
      expect(result).toContain('5 seconds');
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

  describe('formatAddress', () => {
    it('should format patient address correctly', () => {
      const patient = {
        flat_villa_no: 'Villa 123',
        building_street: 'Jumeirah Street',
        area: 'Jumeirah',
        city: 'Dubai'
      };

      const result = (TelegramCommandFormatters as any).formatAddress(patient);
      expect(result).toBe('Villa 123, Jumeirah Street, Jumeirah, Dubai');
    });

    it('should handle missing address parts', () => {
      const patient = {
        flat_villa_no: 'Villa 123',
        city: 'Dubai'
      };

      const result = (TelegramCommandFormatters as any).formatAddress(patient);
      expect(result).toBe('Villa 123, Dubai');
    });
  });
});
