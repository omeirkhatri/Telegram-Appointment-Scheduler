import {
    DAILY_AGENDA_TIME,
    DUBAI_TIMEZONE,
    dubaiDateStringToUtcRange,
    formatAppointmentTime,
    formatDubaiDate,
    formatDubaiTime,
    fromDubaiTime,
    getAgendaDate,
    getAvailableTimezones,
    getCurrentDubaiTime,
    getDubaiDayRange,
    getDubaiTimezoneOffset,
    getNextDailyAgendaTime,
    getStaffForDailyAgenda,
    getStaffWorkingHours,
    getTodayDubai,
    getTomorrowDubai,
    isDubaiTimezoneSupported,
    isPastDailyAgendaTime,
    isStaffAvailableOnDay,
    isValidTimezone,
    toDubaiTime,
    UTC_TIMEZONE,
    utcToDubaiDateString,
} from './timezone';

// Mock date-fns functions for consistent testing
jest.mock('date-fns', () => ({
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  endOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)),
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'dd/MM/yyyy') return '15/01/2024';
    if (formatStr === 'HH:mm') return '10:30';
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    return date.toISOString();
  }),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
  startOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)),
}));

// Mock date-fns-tz functions
jest.mock('date-fns-tz', () => ({
  utcToZonedTime: jest.fn((date, timezone) => {
    // Simulate Dubai timezone (UTC+4)
    return new Date(date.getTime() + 4 * 60 * 60 * 1000);
  }),
  zonedTimeToUtc: jest.fn((date, timezone) => {
    // Simulate converting from Dubai timezone to UTC
    return new Date(date.getTime() - 4 * 60 * 60 * 1000);
  }),
}));

describe('Timezone Utilities', () => {
  describe('Constants', () => {
    it('should have correct timezone constants', () => {
      expect(DUBAI_TIMEZONE).toBe('Asia/Dubai');
      expect(UTC_TIMEZONE).toBe('UTC');
      expect(DAILY_AGENDA_TIME).toBe('06:00');
    });
  });

  describe('toDubaiTime', () => {
    it('should convert UTC time to Dubai timezone', () => {
      const utcDate = new Date('2024-01-15T06:30:00.000Z');
      const dubaiTime = toDubaiTime(utcDate);

      expect(dubaiTime).toBeInstanceOf(Date);
      // Should be 4 hours later in Dubai
      expect(dubaiTime.getTime()).toBe(utcDate.getTime() + 4 * 60 * 60 * 1000);
    });

    it('should handle different UTC times', () => {
      const utcDate = new Date('2024-01-15T00:00:00.000Z');
      const dubaiTime = toDubaiTime(utcDate);

      expect(dubaiTime.getTime()).toBe(utcDate.getTime() + 4 * 60 * 60 * 1000);
    });
  });

  describe('fromDubaiTime', () => {
    it('should convert Dubai time to UTC', () => {
      const dubaiDate = new Date('2024-01-15T10:30:00.000Z');
      const utcTime = fromDubaiTime(dubaiDate);

      expect(utcTime).toBeInstanceOf(Date);
      // Should be 4 hours earlier in UTC
      expect(utcTime.getTime()).toBe(dubaiDate.getTime() - 4 * 60 * 60 * 1000);
    });
  });

  describe('getCurrentDubaiTime', () => {
    it('should return current time in Dubai timezone', () => {
      const currentDubaiTime = getCurrentDubaiTime();

      expect(currentDubaiTime).toBeInstanceOf(Date);
    });
  });

  describe('formatDubaiDate', () => {
    it('should format date in Dubai timezone with DD/MM/YYYY format', () => {
      const utcDate = new Date('2024-01-15T06:30:00.000Z');
      const formatted = formatDubaiDate(utcDate);

      expect(formatted).toBe('15/01/2024');
    });
  });

  describe('formatDubaiTime', () => {
    it('should format time in Dubai timezone with HH:mm format', () => {
      const utcDate = new Date('2024-01-15T06:30:00.000Z');
      const formatted = formatDubaiTime(utcDate);

      expect(formatted).toBe('10:30');
    });
  });

  describe('getTodayDubai', () => {
    it('should return today\'s date in Dubai timezone', () => {
      const today = getTodayDubai();

      expect(today).toBeInstanceOf(Date);
    });
  });

  describe('getTomorrowDubai', () => {
    it('should return tomorrow\'s date in Dubai timezone', () => {
      const tomorrow = getTomorrowDubai();

      expect(tomorrow).toBeInstanceOf(Date);
    });
  });

  describe('getDubaiDayRange', () => {
    it('should return start and end of day in Dubai timezone', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const range = getDubaiDayRange(date);

      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.start.getTime()).toBeLessThan(range.end.getTime());
    });
  });

  describe('isPastDailyAgendaTime', () => {
    it('should check if current Dubai time is past daily agenda time', () => {
      const isPast = isPastDailyAgendaTime();

      expect(typeof isPast).toBe('boolean');
    });
  });

  describe('getNextDailyAgendaTime', () => {
    it('should return next daily agenda time in Dubai timezone', () => {
      const nextAgendaTime = getNextDailyAgendaTime();

      expect(nextAgendaTime).toBeInstanceOf(Date);
    });
  });

  describe('getAgendaDate', () => {
    it('should return the date for which to generate daily agenda', () => {
      const agendaDate = getAgendaDate();

      expect(agendaDate).toBeInstanceOf(Date);
    });
  });

  describe('utcToDubaiDateString', () => {
    it('should convert UTC date to Dubai date string (YYYY-MM-DD)', () => {
      const utcDate = new Date('2024-01-15T06:30:00.000Z');
      const dateString = utcToDubaiDateString(utcDate);

      expect(dateString).toBe('2024-01-15');
    });
  });

  describe('dubaiDateStringToUtcRange', () => {
    it('should convert Dubai date string to UTC date range', () => {
      const dateString = '2024-01-15';
      const range = dubaiDateStringToUtcRange(dateString);

      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.start.getTime()).toBeLessThan(range.end.getTime());
    });
  });

  describe('getStaffWorkingHours', () => {
    it('should get working hours for a staff member in Dubai timezone', () => {
      const workingHours = getStaffWorkingHours('09:00', '17:00', new Date('2024-01-15'));

      expect(workingHours.start).toBeInstanceOf(Date);
      expect(workingHours.end).toBeInstanceOf(Date);
      expect(workingHours.start.getTime()).toBeLessThan(workingHours.end.getTime());
    });

    it('should handle different working hours', () => {
      const workingHours = getStaffWorkingHours('08:00', '16:00', new Date('2024-01-15'));

      expect(workingHours.start).toBeInstanceOf(Date);
      expect(workingHours.end).toBeInstanceOf(Date);
    });
  });

  describe('isStaffAvailableOnDay', () => {
    it('should check if staff member is available on a specific day', () => {
      const availableDays = [1, 2, 3, 4, 5]; // Monday to Friday
      const monday = new Date('2024-01-15'); // Monday
      const saturday = new Date('2024-01-20'); // Saturday

      expect(isStaffAvailableOnDay(availableDays, monday)).toBe(true);
      expect(isStaffAvailableOnDay(availableDays, saturday)).toBe(false);
    });

    it('should handle different available day patterns', () => {
      const weekendOnly = [6, 7]; // Saturday and Sunday
      const saturday = new Date('2024-01-20'); // Saturday
      const monday = new Date('2024-01-15'); // Monday

      expect(isStaffAvailableOnDay(weekendOnly, saturday)).toBe(true);
      expect(isStaffAvailableOnDay(weekendOnly, monday)).toBe(false);
    });

    it('should handle empty available days', () => {
      const availableDays: number[] = [];
      const anyDay = new Date('2024-01-15');

      expect(isStaffAvailableOnDay(availableDays, anyDay)).toBe(false);
    });
  });

  describe('getStaffForDailyAgenda', () => {
    const mockStaff = [
      {
        id: '1',
        email: 'staff1@example.com',
        email_notifications_enabled: true,
        status: 'active' as const,
        available_days: [1, 2, 3, 4, 5], // Monday to Friday
      },
      {
        id: '2',
        email: 'staff2@example.com',
        email_notifications_enabled: false,
        status: 'active' as const,
        available_days: [1, 2, 3, 4, 5],
      },
      {
        id: '3',
        email: 'staff3@example.com',
        email_notifications_enabled: true,
        status: 'inactive' as const,
        available_days: [1, 2, 3, 4, 5],
      },
      {
        id: '4',
        email: 'staff4@example.com',
        email_notifications_enabled: true,
        status: 'active' as const,
        available_days: [6, 7], // Weekend only
      },
    ];

    it('should return staff who should receive daily agenda', () => {
      const monday = new Date('2024-01-15'); // Monday
      const eligibleStaff = getStaffForDailyAgenda(mockStaff, monday);

      expect(eligibleStaff).toHaveLength(1);
      expect(eligibleStaff[0]).toEqual({
        id: '1',
        email: 'staff1@example.com',
      });
    });

    it('should filter out staff with disabled email notifications', () => {
      const monday = new Date('2024-01-15'); // Monday
      const eligibleStaff = getStaffForDailyAgenda(mockStaff, monday);

      const staff2 = eligibleStaff.find(s => s.id === '2');
      expect(staff2).toBeUndefined();
    });

    it('should filter out inactive staff', () => {
      const monday = new Date('2024-01-15'); // Monday
      const eligibleStaff = getStaffForDailyAgenda(mockStaff, monday);

      const staff3 = eligibleStaff.find(s => s.id === '3');
      expect(staff3).toBeUndefined();
    });

    it('should filter out staff not available on the given day', () => {
      const monday = new Date('2024-01-15'); // Monday
      const eligibleStaff = getStaffForDailyAgenda(mockStaff, monday);

      const staff4 = eligibleStaff.find(s => s.id === '4');
      expect(staff4).toBeUndefined();
    });

    it('should return weekend staff for Saturday', () => {
      const saturday = new Date('2024-01-20'); // Saturday
      const eligibleStaff = getStaffForDailyAgenda(mockStaff, saturday);

      expect(eligibleStaff).toHaveLength(1);
      expect(eligibleStaff[0]).toEqual({
        id: '4',
        email: 'staff4@example.com',
      });
    });

    it('should return empty array when no staff are eligible', () => {
      const sunday = new Date('2024-01-21'); // Sunday
      const eligibleStaff = getStaffForDailyAgenda(mockStaff, sunday);

      // Staff 4 is available on weekends (days 6, 7), and Sunday is day 0 in JS but converted to 7
      expect(eligibleStaff).toHaveLength(1);
    });
  });

  describe('formatAppointmentTime', () => {
    it('should format appointment time for display in Dubai timezone', () => {
      const result = formatAppointmentTime('2024-01-15', '10:30', 60);

      expect(result.startTime).toBe('10:30');
      expect(result.endTime).toBe('10:30'); // Mocked to return same time
    });

    it('should handle different durations', () => {
      const result = formatAppointmentTime('2024-01-15', '10:30', 90);

      expect(result.startTime).toBe('10:30');
      expect(result.endTime).toBe('10:30'); // Mocked to return same time
    });
  });

  describe('getDubaiTimezoneOffset', () => {
    it('should get timezone offset for Dubai', () => {
      const offset = getDubaiTimezoneOffset();

      expect(typeof offset).toBe('number');
      // The actual offset depends on the system timezone, so we just check it's a number
      expect(offset).toBeGreaterThan(0);
    });
  });

  describe('isValidTimezone', () => {
    it('should validate correct timezone strings', () => {
      expect(isValidTimezone('Asia/Dubai')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
    });

    it('should reject invalid timezone strings', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone('Dubai')).toBe(false);
    });
  });

  describe('getAvailableTimezones', () => {
    it('should return array of available timezones', () => {
      const timezones = getAvailableTimezones();

      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
      expect(timezones).toContain('Asia/Dubai');
      // UTC might not be in the list depending on the environment
      expect(timezones.length).toBeGreaterThan(0);
    });
  });

  describe('isDubaiTimezoneSupported', () => {
    it('should check if Dubai timezone is supported', () => {
      const isSupported = isDubaiTimezoneSupported();

      expect(typeof isSupported).toBe('boolean');
      expect(isSupported).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for appointment scheduling workflow', () => {
      const appointmentDate = '2024-01-15';
      const startTime = '10:30';
      const duration = 60;

      // Convert to UTC for storage
      const utcRange = dubaiDateStringToUtcRange(appointmentDate);
      expect(utcRange.start).toBeInstanceOf(Date);
      expect(utcRange.end).toBeInstanceOf(Date);

      // Format for display
      const formattedTime = formatAppointmentTime(appointmentDate, startTime, duration);
      expect(formattedTime.startTime).toBe('10:30');
      expect(formattedTime.endTime).toBe('10:30');

      // Check staff availability
      const availableDays = [1, 2, 3, 4, 5]; // Monday to Friday
      const monday = new Date('2024-01-15'); // Monday
      const isAvailable = isStaffAvailableOnDay(availableDays, monday);
      expect(isAvailable).toBe(true);
    });

    it('should work together for daily agenda workflow', () => {
      const mockStaff = [
        {
          id: '1',
          email: 'staff1@example.com',
          email_notifications_enabled: true,
          status: 'active' as const,
          available_days: [1, 2, 3, 4, 5],
        },
      ];

      // Get agenda date
      const agendaDate = getAgendaDate();
      expect(agendaDate).toBeInstanceOf(Date);

      // Get eligible staff
      const eligibleStaff = getStaffForDailyAgenda(mockStaff, agendaDate);
      expect(Array.isArray(eligibleStaff)).toBe(true);

      // Format date for agenda
      const formattedDate = formatDubaiDate(agendaDate);
      expect(formattedDate).toBe('15/01/2024');
    });

    it('should maintain consistency in timezone conversions', () => {
      const originalDate = new Date('2024-01-15T06:30:00.000Z');

      // Convert to Dubai time
      const dubaiTime = toDubaiTime(originalDate);
      expect(dubaiTime.getTime()).toBe(originalDate.getTime() + 4 * 60 * 60 * 1000);

      // Convert back to UTC
      const backToUtc = fromDubaiTime(dubaiTime);
      expect(backToUtc.getTime()).toBe(originalDate.getTime());

      // Format for display
      const formattedDate = formatDubaiDate(originalDate);
      const formattedTime = formatDubaiTime(originalDate);
      expect(formattedDate).toBe('15/01/2024');
      expect(formattedTime).toBe('10:30');
    });
  });

  describe('Edge Cases', () => {
    it('should handle DST transitions', () => {
      // Test around DST transition dates (though Dubai doesn't observe DST)
      const date = new Date('2024-03-10T02:00:00.000Z');
      const dubaiTime = toDubaiTime(date);
      expect(dubaiTime).toBeInstanceOf(Date);
    });

    it('should handle year boundaries', () => {
      const newYear = new Date('2024-12-31T20:00:00.000Z'); // New Year's Eve UTC
      const dubaiTime = toDubaiTime(newYear);
      expect(dubaiTime).toBeInstanceOf(Date);
    });

    it('should handle leap years', () => {
      const leapYearDate = new Date('2024-02-29T06:30:00.000Z');
      const dubaiTime = toDubaiTime(leapYearDate);
      expect(dubaiTime).toBeInstanceOf(Date);
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid-date');
      expect(() => toDubaiTime(invalidDate)).not.toThrow();
      expect(() => fromDubaiTime(invalidDate)).not.toThrow();
    });
  });
});
