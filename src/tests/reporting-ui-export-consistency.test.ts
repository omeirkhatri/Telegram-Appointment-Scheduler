import { formatInResolvedTimezone, type TimezoneContext } from '@/utils/timezone';
import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';
import { 
  formatPrintDate, 
  formatPrintTimeWithTimezone, 
  generateAppointmentPrintSummary,
  generateAgendaPrintData,
  generatePrintTimezoneMetadata 
} from '@/lib/printUtils';
import type { Appointment, Patient, Staff } from '@/types';

// Test timezones representing different regions
const TEST_TIMEZONES = [
  'Asia/Dubai',      // No DST, GMT+4
  'Europe/London',   // DST, GMT+0/+1
  'America/New_York', // DST, GMT-5/-4
] as const;

// Test dates that include DST transitions and midnight boundaries
const TEST_DATES = [
  '2024-01-01T00:00:00Z', // New Year (winter)
  '2024-03-10T06:00:00Z', // DST start (US)
  '2024-03-31T01:00:00Z', // DST start (EU)
  '2024-06-21T12:00:00Z', // Summer solstice
  '2024-11-03T06:00:00Z', // DST end (US)
  '2024-10-27T01:00:00Z', // DST end (EU)
  '2024-12-31T23:59:59Z', // New Year's Eve
] as const;

// Mock data for testing
const createMockAppointment = (date: string, time: string): Appointment => ({
  id: 'test-appointment-1',
  patient_id: 'test-patient-1',
  appointment_date: date,
  start_time: time,
  duration_minutes: 60,
  appointment_type: 'doctor_on_call',
  status: 'scheduled',
  transportation_type: 'self_transport',
  transportation_method: 'car',
  notes: 'Test appointment',
  custom_fields: { chiefComplaint: 'Test complaint' },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const createMockPatient = (): Patient => ({
  id: 'test-patient-1',
  name: 'John Doe',
  phone: '+971501234567',
  flat_villa_no: '123',
  building_street: 'Main Street',
  area: 'Downtown',
  city: 'Dubai',
  emergency_contact: '+971509876543',
  preferred_transport: 'car',
  medical_notes: 'No allergies',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const createMockStaff = (): Staff => ({
  id: 'test-staff-1',
  first_name: 'Dr. Jane',
  last_name: 'Smith',
  email: 'jane.smith@example.com',
  phone: '+971501234568',
  staff_type: 'doctor',
  status: 'active',
  available_days: [1, 2, 3, 4, 5],
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

describe('Reporting UI-Export Consistency Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Print Utilities Timezone Consistency', () => {
    test.each(TEST_TIMEZONES)('formatPrintDate produces consistent results for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      const testDate = '2024-06-21T12:00:00Z';
      
      // Test with timezone context
      const formattedWithContext = formatPrintDate(testDate, context);
      
      // Test without context (legacy behavior)
      const formattedLegacy = formatPrintDate(testDate);
      
      // Both should be valid date strings
      expect(formattedWithContext).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(formattedLegacy).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      
      // With context should use the specified timezone
      const artifacts = buildTimezoneArtifacts(context);
      const expectedFormat = formatInResolvedTimezone(testDate, 'dd/MM/yyyy', context);
      expect(formattedWithContext).toBe(expectedFormat);
    });

    test.each(TEST_TIMEZONES)('formatPrintTimeWithTimezone includes timezone info for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      const testTime = '14:30';
      
      const formattedWithTimezone = formatPrintTimeWithTimezone(testTime, context);
      const formattedWithoutTimezone = formatPrintTimeWithTimezone(testTime);
      
      // With timezone should include abbreviation
      expect(formattedWithTimezone).toContain('14:30');
      expect(formattedWithTimezone).toContain('(');
      expect(formattedWithTimezone).toContain(')');
      
      // Without timezone should be plain time
      expect(formattedWithoutTimezone).toBe('14:30');
    });

    test.each(TEST_TIMEZONES)('generatePrintTimezoneMetadata provides correct info for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      
      const metadata = generatePrintTimezoneMetadata(context);
      
      expect(metadata).toBeDefined();
      expect(metadata?.timezone).toBe(timezone);
      expect(metadata?.abbreviation).toBeDefined();
      expect(metadata?.source).toBe('location');
      expect(metadata?.offsetMinutes).toBeDefined();
    });
  });

  describe('Appointment Print Summary Consistency', () => {
    test.each(TEST_TIMEZONES)('appointment summary uses timezone context for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      const appointment = createMockAppointment('2024-06-21', '14:30');
      const patient = createMockPatient();
      const staff = [createMockStaff()];
      
      const summaryWithContext = generateAppointmentPrintSummary(appointment, patient, staff, undefined, context);
      const summaryLegacy = generateAppointmentPrintSummary(appointment, patient, staff);
      
      // Both should have valid structure
      expect(summaryWithContext.id).toBe(appointment.id);
      expect(summaryLegacy.id).toBe(appointment.id);
      
      // With context should use timezone-aware formatting
      expect(summaryWithContext.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(summaryWithContext.time).toContain('14:30');
      
      // Legacy should use Dubai formatting
      expect(summaryLegacy.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(summaryLegacy.time).toBe('14:30');
    });

    test.each(TEST_DATES)('appointment summary handles DST transitions for %s', (dateString) => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      const appointment = createMockAppointment(dateString.split('T')[0], '14:30');
      const patient = createMockPatient();
      const staff = [createMockStaff()];
      
      const summary = generateAppointmentPrintSummary(appointment, patient, staff, undefined, context);
      
      // Should handle DST transitions gracefully
      expect(summary.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(summary.time).toContain('14:30');
      expect(summary.duration).toBe('60 minutes');
    });
  });

  describe('Agenda Print Data Consistency', () => {
    test.each(TEST_TIMEZONES)('agenda data uses timezone context for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      const staff = createMockStaff();
      const appointment = createMockAppointment('2024-06-21', '14:30');
      const patient = createMockPatient();
      const appointments = [{ appointment, patient, staff: [staff] }];
      const date = new Date('2024-06-21T12:00:00Z');
      
      const agendaWithContext = generateAgendaPrintData(staff, appointments, date, context);
      const agendaLegacy = generateAgendaPrintData(staff, appointments, date);
      
      // Both should have valid structure
      expect(agendaWithContext.staff.name).toBe('Dr. Jane Smith');
      expect(agendaLegacy.staff.name).toBe('Dr. Jane Smith');
      
      // With context should use timezone-aware formatting
      expect(agendaWithContext.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(agendaWithContext.appointments).toHaveLength(1);
      
      // Legacy should use Dubai formatting
      expect(agendaLegacy.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(agendaLegacy.appointments).toHaveLength(1);
    });
  });

  describe('Cross-Timezone Date Consistency', () => {
    test('same UTC time displays consistently across timezones', () => {
      // Choose a time that crosses midnight in at least one timezone to guarantee unique local dates
      const utcTime = '2024-06-21T23:30:00Z';
      const contexts = TEST_TIMEZONES.map(tz => ({ locationTimezone: tz } as TimezoneContext));

      const formattedDates = contexts.map(context => formatPrintDate(utcTime, context));
      
      // All should be valid date strings
      formattedDates.forEach(date => {
        expect(date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      });
      
      // Should be different for different timezones (unless they happen to be the same local date)
      const uniqueDates = new Set(formattedDates);
      expect(uniqueDates.size).toBeGreaterThan(1);
    });

    test('midnight boundary handling across timezones', () => {
      const midnightUTC = '2024-06-21T00:00:00Z';
      const contexts = TEST_TIMEZONES.map(tz => ({ locationTimezone: tz } as TimezoneContext));
      
      const formattedDates = contexts.map(context => formatPrintDate(midnightUTC, context));
      
      // All should be valid date strings
      formattedDates.forEach(date => {
        expect(date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      });
      
      // Should handle midnight boundaries correctly
      expect(formattedDates).not.toContain('Invalid date');
    });
  });

  describe('Legacy Compatibility', () => {
    test('functions work without timezone context', () => {
      const appointment = createMockAppointment('2024-06-21', '14:30');
      const patient = createMockPatient();
      const staffMember = createMockStaff();
      const assignedStaff = [staffMember];

      // Should work without timezone context (legacy behavior)
      const summary = generateAppointmentPrintSummary(appointment, patient, assignedStaff);
      const agenda = generateAgendaPrintData(
        staffMember,
        [{ appointment, patient, staff: assignedStaff }],
        new Date('2024-06-21T12:00:00Z')
      );

      expect(summary.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(summary.time).toBe('14:30');
      expect(agenda.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    test('timezone metadata returns null without context', () => {
      const metadata = generatePrintTimezoneMetadata();
      expect(metadata).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('handles invalid timezone gracefully', () => {
      const context: TimezoneContext = { locationTimezone: 'Invalid/Timezone' };
      const appointment = createMockAppointment('2024-06-21', '14:30');
      const patient = createMockPatient();
      const staff = [createMockStaff()];
      
      // Should fall back to legacy behavior
      const summary = generateAppointmentPrintSummary(appointment, patient, staff, undefined, context);
      expect(summary.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    test('handles invalid dates gracefully', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const appointment = createMockAppointment('invalid-date', '14:30');
      const patient = createMockPatient();
      const staff = [createMockStaff()];
      
      // Should handle invalid dates without crashing
      expect(() => {
        generateAppointmentPrintSummary(appointment, patient, staff, undefined, context);
      }).not.toThrow();
    });
  });
});
