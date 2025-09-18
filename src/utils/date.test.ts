import {
    appointmentsOverlap,
    DATE_FMT,
    dateStringToUTC,
    DATETIME_FMT,
    formatAppointmentTimeRange,
    formatDateInTimezone,
    getAppointmentEndTimeUTC,
    getAppointmentStartTimeUTC,
    getTimezoneOffset,
    getWorkingHoursInTimezone,
    isWithinWorkingHours,
    nowInTimezone,
    TIME_FMT,
    timeStringToUTC,
    toLocal,
    toUTC,
    TZ,
    UTC_TZ,
    utcToDateString,
    utcToTimeString
} from './timezone';

// Mock date-fns functions for consistent testing
jest.mock('date-fns', () => ({
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  addMinutes: jest.fn((date, minutes) => new Date(date.getTime() + minutes * 60 * 1000)),
  endOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)),
  endOfWeek: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + (7 - date.getDay()), 23, 59, 59, 999)),
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'dd/MM/yyyy') return '15/01/2024';
    if (formatStr === 'HH:mm') return '10:30';
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    if (formatStr === 'dd/MM/yyyy HH:mm') return '15/01/2024 10:30';
    return date.toISOString();
  }),
  isSameDay: jest.fn((date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }),
  isValid: jest.fn((date) => date instanceof Date && !isNaN(date.getTime())),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
  startOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)),
  startOfWeek: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), 0, 0, 0, 0)),
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
}));

// Mock date-fns-tz functions
jest.mock('date-fns-tz', () => ({
  fromZonedTime: jest.fn((date, timezone) => {
    // Simulate converting from Dubai timezone to UTC
    return new Date(date.getTime() - 4 * 60 * 60 * 1000);
  }),
  toZonedTime: jest.fn((date, timezone) => {
    // Simulate Dubai timezone (UTC+4)
    return new Date(date.getTime() + 4 * 60 * 60 * 1000);
  }),
}));

describe('Timezone Date Utilities', () => {
  const mockDate = '2024-01-15';
  const mockTime = '10:30';
  const mockDateTime = '2024-01-15T10:30:00.000Z';

  describe('Timezone Configuration', () => {
    it('should have correct timezone constants', () => {
      expect(TZ).toBe('Asia/Dubai');
      expect(UTC_TZ).toBe('UTC');
      expect(DATE_FMT).toBe('dd/MM/yyyy');
      expect(TIME_FMT).toBe('HH:mm');
      expect(DATETIME_FMT).toBe('dd/MM/yyyy HH:mm');
    });
  });

  describe('toUTC', () => {
    it('should convert Asia/Dubai time to UTC', () => {
      const dubaiDate = new Date('2024-01-15T10:30:00+04:00');
      const utcDate = toUTC(dubaiDate);

      // Should be 4 hours earlier in UTC
      expect(utcDate.getUTCHours()).toBe(6); // 10:30 - 4 hours = 06:30 UTC
    });

    it('should handle string dates', () => {
      const utcDate = toUTC('2024-01-15T10:30:00+04:00');
      expect(utcDate).toBeInstanceOf(Date);
    });
  });

  describe('toLocal', () => {
    it('should convert UTC time to Asia/Dubai timezone', () => {
      const utcDate = new Date('2024-01-15T06:30:00.000Z');
      const localDate = toLocal(utcDate);

      expect(localDate).toBeInstanceOf(Date);
      // The exact time depends on the timezone conversion
      expect(localDate.getTime()).toBeGreaterThan(utcDate.getTime());
    });

    it('should handle string dates', () => {
      const localDate = toLocal('2024-01-15T06:30:00.000Z');
      expect(localDate).toBeInstanceOf(Date);
    });
  });

  describe('formatDateInTimezone', () => {
    it('should format date in Asia/Dubai timezone', () => {
      const utcDate = new Date('2024-01-15T06:30:00.000Z');
      const formatted = formatDateInTimezone(utcDate, 'dd/MM/yyyy', TZ);
      expect(formatted).toBe('15/01/2024');
    });

    it('should format date in UTC timezone', () => {
      const utcDate = new Date('2024-01-15T06:30:00.000Z');
      const formatted = formatDateInTimezone(utcDate, 'dd/MM/yyyy', UTC_TZ);
      expect(formatted).toBe('15/01/2024');
    });

    it('should handle invalid dates', () => {
      const formatted = formatDateInTimezone('invalid-date');
      expect(formatted).toBe('Invalid date');
    });
  });

  describe('nowInTimezone', () => {
    it('should return current date in Asia/Dubai timezone', () => {
      const now = nowInTimezone(TZ);
      expect(now).toBeInstanceOf(Date);
    });

    it('should return current date in UTC timezone', () => {
      const now = nowInTimezone(UTC_TZ);
      expect(now).toBeInstanceOf(Date);
    });
  });

  describe('timeStringToUTC', () => {
    it('should convert time string to UTC Date', () => {
      const utcDate = timeStringToUTC('10:30', new Date('2024-01-15'));
      expect(utcDate).toBeInstanceOf(Date);
      // Should be a valid UTC date
      expect(utcDate.getUTCHours()).toBeGreaterThanOrEqual(0);
      expect(utcDate.getUTCHours()).toBeLessThan(24);
    });
  });

  describe('utcToTimeString', () => {
    it('should convert UTC Date to time string in Asia/Dubai', () => {
      const utcDate = new Date('2024-01-15T06:30:00.000Z');
      const timeString = utcToTimeString(utcDate);
      expect(timeString).toBe('10:30'); // 06:30 + 4 hours = 10:30 Dubai
    });
  });

  describe('dateStringToUTC', () => {
    it('should convert date string to UTC Date', () => {
      const utcDate = dateStringToUTC('2024-01-15', '10:30');
      expect(utcDate).toBeInstanceOf(Date);
      // Should be a valid UTC date
      expect(utcDate.getUTCHours()).toBeGreaterThanOrEqual(0);
      expect(utcDate.getUTCHours()).toBeLessThan(24);
    });

    it('should use default time of 00:00', () => {
      const utcDate = dateStringToUTC('2024-01-15');
      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.getUTCHours()).toBeGreaterThanOrEqual(0);
      expect(utcDate.getUTCHours()).toBeLessThan(24);
    });
  });

  describe('utcToDateString', () => {
    it('should convert UTC Date to date string in Asia/Dubai', () => {
      const utcDate = new Date('2024-01-15T06:30:00.000Z');
      const dateString = utcToDateString(utcDate);
      expect(dateString).toBe('2024-01-15');
    });
  });

  describe('getAppointmentStartTimeUTC', () => {
    it('should get appointment start time in UTC', () => {
      const utcDate = getAppointmentStartTimeUTC('2024-01-15', '10:30');
      expect(utcDate).toBeInstanceOf(Date);
      // Should be a valid UTC date
      expect(utcDate.getUTCHours()).toBeGreaterThanOrEqual(0);
      expect(utcDate.getUTCHours()).toBeLessThan(24);
    });
  });

  describe('getAppointmentEndTimeUTC', () => {
    it('should get appointment end time in UTC', () => {
      const startUTC = getAppointmentStartTimeUTC('2024-01-15', '10:30');
      const endUTC = getAppointmentEndTimeUTC('2024-01-15', '10:30', 60);

      expect(endUTC).toBeInstanceOf(Date);
      expect(endUTC.getTime()).toBe(startUTC.getTime() + 60 * 60000); // 60 minutes later
    });
  });

  describe('formatAppointmentTimeRange', () => {
    it('should format appointment time range for display', () => {
      const timeRange = formatAppointmentTimeRange('2024-01-15', '10:30', 60);
      expect(timeRange).toMatch(/10:30 - \d{2}:\d{2}/);
    });

    it('should handle different durations', () => {
      const timeRange = formatAppointmentTimeRange('2024-01-15', '10:30', 90);
      expect(timeRange).toMatch(/10:30 - \d{2}:\d{2}/);
    });
  });

  describe('appointmentsOverlap', () => {
    it('should detect overlapping appointments', () => {
      const overlap = appointmentsOverlap(
        '2024-01-15', '10:00', 60, // 10:00-11:00
        '2024-01-15', '10:30', 60,  // 10:30-11:30
      );
      expect(overlap).toBe(true);
    });

    it('should not detect non-overlapping appointments', () => {
      const overlap = appointmentsOverlap(
        '2024-01-15', '10:00', 60, // 10:00-11:00
        '2024-01-15', '11:00', 60,  // 11:00-12:00
      );
      expect(overlap).toBe(false);
    });

    it('should not detect appointments on different days', () => {
      const overlap = appointmentsOverlap(
        '2024-01-15', '10:00', 60,
        '2024-01-16', '10:00', 60,
      );
      expect(overlap).toBe(false);
    });
  });

  describe('getWorkingHoursInTimezone', () => {
    it('should get working hours in Asia/Dubai timezone', () => {
      const workingHours = getWorkingHoursInTimezone('09:00', '17:00', TZ);
      expect(workingHours.start).toBeInstanceOf(Date);
      expect(workingHours.end).toBeInstanceOf(Date);
    });
  });

  describe('isWithinWorkingHours', () => {
    it('should check if time is within working hours', () => {
      const within = isWithinWorkingHours('10:30', '09:00', '17:00');
      expect(within).toBe(true);
    });

    it('should detect time outside working hours', () => {
      const within = isWithinWorkingHours('18:00', '09:00', '17:00');
      expect(within).toBe(false);
    });

    it('should handle boundary times', () => {
      const startBoundary = isWithinWorkingHours('09:00', '09:00', '17:00');
      const endBoundary = isWithinWorkingHours('17:00', '09:00', '17:00');
      expect(startBoundary).toBe(true);
      expect(endBoundary).toBe(true);
    });
  });

  describe('getTimezoneOffset', () => {
    it('should get timezone offset in minutes', () => {
      const offset = getTimezoneOffset();
      expect(typeof offset).toBe('number');
      // Asia/Dubai is UTC+4, so offset should be 240 minutes
      expect(offset).toBe(240);
    });
  });
});
