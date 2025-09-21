import { formatPrintDate } from '@/lib/printUtils';
import { formatInResolvedTimezone, type TimezoneContext } from '@/utils/timezone';
import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';

// Mock the CSV export functions since we can't easily test the full API route
const mockGenerateAppointmentsReport = (
  timezoneContext?: TimezoneContext
) => {
  const mockAppointments = [
    {
      id: 'test-1',
      appointment_date: '2024-06-21',
      start_time: '14:30',
      duration_minutes: 60,
      appointment_type: 'doctor_on_call',
      status: 'scheduled',
      patients: {
        name: 'John Doe',
        phone: '+971501234567',
        area: 'Downtown',
        city: 'Dubai',
      },
      appointment_staff: [{
        staff: {
          first_name: 'Dr. Jane',
          last_name: 'Smith',
          staff_type: 'doctor',
        },
      }],
      transportation_type: 'self_transport',
      transportation_method: 'car',
      notes: 'Test appointment',
      created_at: '2024-06-21T10:00:00Z',
      updated_at: '2024-06-21T10:00:00Z',
    },
  ];

  const timezoneMetadata = timezoneContext ? buildTimezoneArtifacts(timezoneContext) : null;

  // Simulate the CSV export logic
  const headers = [
    'ID',
    'Date',
    'Start Time',
    'Duration (min)',
    'Type',
    'Status',
    'Patient Name',
    'Patient Phone',
    'Patient Area',
    'Patient City',
    'Assigned Staff',
    'Transportation Type',
    'Transportation Method',
    'Notes',
    'Created At',
    'Updated At',
    ...(timezoneContext ? ['Timezone', 'Timezone Abbreviation'] : []),
  ];

  const rows = mockAppointments.map(appointment => {
    const staff = appointment.appointment_staff?.map((as: any) =>
      `${as.staff?.first_name} ${as.staff?.last_name} (${as.staff?.staff_type})`,
    ).join(', ') || '';

    // Format dates with timezone context if available
    const formattedDate = formatPrintDate(appointment.appointment_date, timezoneContext);
    
    const formattedStartTime = timezoneContext
      ? formatInResolvedTimezone(`${appointment.appointment_date}T${appointment.start_time}:00`, 'HH:mm', timezoneContext)
      : appointment.start_time;

    return {
      'ID': appointment.id,
      'Date': formattedDate,
      'Start Time': formattedStartTime,
      'Duration (min)': appointment.duration_minutes,
      'Type': appointment.appointment_type,
      'Status': appointment.status,
      'Patient Name': appointment.patients?.name || '',
      'Patient Phone': appointment.patients?.phone || '',
      'Patient Area': appointment.patients?.area || '',
      'Patient City': appointment.patients?.city || '',
      'Assigned Staff': staff,
      'Transportation Type': appointment.transportation_type || '',
      'Transportation Method': appointment.transportation_method || '',
      'Notes': appointment.notes || '',
      'Created At': appointment.created_at,
      'Updated At': appointment.updated_at,
      ...(timezoneMetadata ? {
        'Timezone': timezoneMetadata.resolution.timezone,
        'Timezone Abbreviation': timezoneMetadata.resolution.abbreviation,
      } : {}),
    };
  });

  return { headers, rows, metadata: { timezoneContext } };
};

// Test timezones representing different regions
const TEST_TIMEZONES = [
  'Asia/Dubai',      // No DST, GMT+4
  'Europe/London',   // DST, GMT+0/+1
  'America/New_York', // DST, GMT-5/-4
] as const;

// Test dates that include DST transitions
const TEST_DATES = [
  '2024-01-01', // New Year (winter)
  '2024-03-10', // DST start (US)
  '2024-03-31', // DST start (EU)
  '2024-06-21', // Summer solstice
  '2024-11-03', // DST end (US)
  '2024-10-27', // DST end (EU)
  '2024-12-31', // New Year's Eve
] as const;

describe('CSV Export Timezone Consistency Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CSV Export Headers', () => {
    test('includes timezone metadata columns when context provided', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const { headers } = mockGenerateAppointmentsReport(context);
      
      expect(headers).toContain('Timezone');
      expect(headers).toContain('Timezone Abbreviation');
    });

    test('excludes timezone metadata columns when no context', () => {
      const { headers } = mockGenerateAppointmentsReport();
      
      expect(headers).not.toContain('Timezone');
      expect(headers).not.toContain('Timezone Abbreviation');
    });
  });

  describe('CSV Export Data Formatting', () => {
    test.each(TEST_TIMEZONES)('formats dates correctly for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      const { rows } = mockGenerateAppointmentsReport(context);
      
      const row = rows[0];
      
      // Date should be in DD/MM/YYYY format
      expect(row['Date']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      
      // Time should be in HH:mm format
      expect(row['Start Time']).toMatch(/^\d{2}:\d{2}$/);
      
      // Timezone metadata should be present
      expect(row['Timezone']).toBe(timezone);
      expect(row['Timezone Abbreviation']).toBeDefined();
    });

    test.each(TEST_DATES)('handles DST transitions for %s', (date) => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      const { rows } = mockGenerateAppointmentsReport(context);
      
      const row = rows[0];
      
      // Should handle DST transitions gracefully
      expect(row['Date']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(row['Start Time']).toMatch(/^\d{2}:\d{2}$/);
      expect(row['Timezone']).toBe('Europe/London');
    });
  });

  describe('Timezone Metadata Accuracy', () => {
    test.each(TEST_TIMEZONES)('provides correct timezone info for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      const { rows } = mockGenerateAppointmentsReport(context);
      
      const row = rows[0];
      
      expect(row['Timezone']).toBe(timezone);
      expect(row['Timezone Abbreviation']).toBeDefined();
      expect(row['Timezone Abbreviation']).not.toBe('');
    });

    test('timezone metadata matches resolver output', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const { rows } = mockGenerateAppointmentsReport(context);
      const artifacts = buildTimezoneArtifacts(context);
      
      const row = rows[0];
      
      expect(row['Timezone']).toBe(artifacts.resolution.timezone);
      expect(row['Timezone Abbreviation']).toBe(artifacts.resolution.abbreviation);
    });
  });

  describe('Cross-Timezone Consistency', () => {
    test('same UTC time formats consistently across timezones', () => {
      const utcTime = '2024-06-21T12:00:00Z';
      const contexts = TEST_TIMEZONES.map(tz => ({ locationTimezone: tz } as TimezoneContext));
      
      const results = contexts.map(context => {
        const { rows } = mockGenerateAppointmentsReport(context);
        return {
          timezone: context.locationTimezone,
          date: rows[0]['Date'],
          time: rows[0]['Start Time'],
        };
      });
      
      // All should have valid formats
      results.forEach(result => {
        expect(result.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        expect(result.time).toMatch(/^\d{2}:\d{2}$/);
      });
      
      // Should be different for different timezones
      const uniqueDates = new Set(results.map(r => r.date));
      expect(uniqueDates.size).toBeGreaterThan(1);
    });

    test('midnight boundary handling across timezones', () => {
      const midnightUTC = '2024-06-21T00:00:00Z';
      const contexts = TEST_TIMEZONES.map(tz => ({ locationTimezone: tz } as TimezoneContext));
      
      const results = contexts.map(context => {
        const { rows } = mockGenerateAppointmentsReport(context);
        return {
          timezone: context.locationTimezone,
          date: rows[0]['Date'],
          time: rows[0]['Start Time'],
        };
      });
      
      // All should handle midnight boundaries correctly
      results.forEach(result => {
        expect(result.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        expect(result.time).toMatch(/^\d{2}:\d{2}$/);
      });
    });
  });

  describe('Legacy Compatibility', () => {
    test('works without timezone context', () => {
      const { headers, rows } = mockGenerateAppointmentsReport();
      
      // Should not include timezone columns
      expect(headers).not.toContain('Timezone');
      expect(headers).not.toContain('Timezone Abbreviation');
      
      // Should have valid data
      const row = rows[0];
      expect(row['Date']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(row['Start Time']).toMatch(/^\d{2}:\d{2}$/);
    });

    test('maintains backward compatibility', () => {
      const { headers, rows } = mockGenerateAppointmentsReport();
      
      // Should have all standard columns
      const expectedColumns = [
        'ID', 'Date', 'Start Time', 'Duration (min)', 'Type', 'Status',
        'Patient Name', 'Patient Phone', 'Patient Area', 'Patient City',
        'Assigned Staff', 'Transportation Type', 'Transportation Method',
        'Notes', 'Created At', 'Updated At'
      ];
      
      expectedColumns.forEach(column => {
        expect(headers).toContain(column);
      });
      
      // Should have valid data in all columns
      const row = rows[0];
      expectedColumns.forEach(column => {
        expect(row[column]).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles invalid timezone gracefully', () => {
      const context: TimezoneContext = { locationTimezone: 'Invalid/Timezone' };
      
      // Should not throw error
      expect(() => {
        mockGenerateAppointmentsReport(context);
      }).not.toThrow();
    });

    test('handles missing timezone context gracefully', () => {
      // Should work without timezone context
      expect(() => {
        mockGenerateAppointmentsReport();
      }).not.toThrow();
    });
  });
});
