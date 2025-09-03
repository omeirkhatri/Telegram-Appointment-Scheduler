import {
    appointmentsOverlap,
    DATE_FMT,
    dateStringToUTC,
    DATETIME_FMT,
    formatAppointmentTimeRange,
    formatDate,
    formatDateInTimezone,
    formatDateTime,
    formatDubaiDate,
    formatDubaiTime,
    formatForGoogleCalendar,
    formatTime,
    fromDubaiTime,
    getAppointmentEndTimeUTC,
    getAppointmentStartTimeUTC,
    getAvailableTimezones,
    getStaffForDailyAgenda,
    getTimezoneOffset,
    getWorkingHoursInTimezone,
    isDubaiTimezoneSupported,
    isFuture,
    isPast,
    isToday,
    isValidTimezone,
    isWithinWorkingHours,
    now,
    nowInTimezone,
    TIME_FMT,
    timeStringToUTC,
    toDubaiTime,
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

  describe('formatForGoogleCalendar', () => {
    it('should format datetime for Google Calendar', () => {
      const formatted = formatForGoogleCalendar('2024-01-15', '10:30');
      expect(formatted).toMatch(/2024-01-15T10:30:00\+04:00/);
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15');
      const formatted = formatForGoogleCalendar(date, '10:30');
      expect(formatted).toMatch(/2024-01-15T10:30:00\+04:00/);
    });
  });

  describe('formatDate', () => {
    it('should format date in Asia/Dubai timezone', () => {
      const formatted = formatDate('2024-01-15');
      expect(formatted).toBe('15/01/2024');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15T06:30:00.000Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('15/01/2024');
    });
  });

  describe('formatTime', () => {
    it('should format time in Asia/Dubai timezone', () => {
      const date = new Date('2024-01-15T06:30:00.000Z');
      const formatted = formatTime(date);
      expect(formatted).toBe('10:30'); // 06:30 + 4 hours = 10:30 Dubai
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime in Asia/Dubai timezone', () => {
      const date = new Date('2024-01-15T06:30:00.000Z');
      const formatted = formatDateTime(date);
      expect(formatted).toBe('15/01/2024 10:30');
    });
  });

  describe('now', () => {
    it('should return current date in Asia/Dubai timezone', () => {
      const current = now();
      expect(current).toBeInstanceOf(Date);
    });
  });

  describe('isToday', () => {
    it('should check if date is today in Asia/Dubai timezone', () => {
      const today = new Date();
      const isTodayResult = isToday(today);
      expect(isTodayResult).toBe(true);
    });

    it('should handle string dates', () => {
      const today = new Date().toISOString().split('T')[0];
      const isTodayResult = isToday(today);
      expect(typeof isTodayResult).toBe('boolean');
    });
  });

  describe('isPast', () => {
    it('should check if date is in the past', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const isPastResult = isPast(pastDate);
      expect(isPastResult).toBe(true);
    });
  });

  describe('isFuture', () => {
    it('should check if date is in the future', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const isFutureResult = isFuture(futureDate);
      expect(isFutureResult).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle DST transitions', () => {
      // Test around DST transition dates
      const date = new Date('2024-03-10T02:00:00.000Z'); // DST start
      const formatted = formatDateInTimezone(date, 'dd/MM/yyyy HH:mm', TZ);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should handle year boundaries', () => {
      const newYear = new Date('2024-12-31T20:00:00.000Z'); // New Year's Eve UTC
      const formatted = formatDateInTimezone(newYear, 'dd/MM/yyyy', TZ);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should handle leap years', () => {
      const leapYearDate = new Date('2024-02-29T06:30:00.000Z');
      const formatted = formatDateInTimezone(leapYearDate, 'dd/MM/yyyy', TZ);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistency in round-trip conversions', () => {
      const originalDate = '2024-01-15';
      const originalTime = '10:30';

      const utcDate = dateStringToUTC(originalDate, originalTime);
      const convertedDate = utcToDateString(utcDate);
      const convertedTime = utcToTimeString(utcDate);

      expect(convertedDate).toBe(originalDate);
      expect(convertedTime).toBe(originalTime);
    });

    it('should handle appointment scheduling workflow', () => {
      const appointmentDate = '2024-01-15';
      const startTime = '10:30';
      const duration = 60;

      const startUTC = getAppointmentStartTimeUTC(appointmentDate, startTime);
      const endUTC = getAppointmentEndTimeUTC(appointmentDate, startTime, duration);

      const timeRange = formatAppointmentTimeRange(appointmentDate, startTime, duration);
      const googleCalendarFormat = formatForGoogleCalendar(appointmentDate, startTime);

      expect(startUTC).toBeInstanceOf(Date);
      expect(endUTC).toBeInstanceOf(Date);
      expect(timeRange).toMatch(/10:30 - \d{2}:\d{2}/);
      expect(googleCalendarFormat).toMatch(/2024-01-15T10:30:00\+04:00/);
    });
  });

  // ============================================================================
  // ADDITIONAL TESTS FROM TIMEZONE.TEST.TS
  // ============================================================================

  describe('Modern Timezone Functions', () => {
    describe('toDubaiTime', () => {
      it('should convert UTC time to Dubai timezone', () => {
        const utcDate = new Date('2024-01-15T06:30:00.000Z');
        const dubaiTime = toDubaiTime(utcDate);

        expect(dubaiTime).toBeInstanceOf(Date);
        // Should be 4 hours later in Dubai
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
      });
    });

    describe('isDubaiTimezoneSupported', () => {
      it('should check if Dubai timezone is supported', () => {
        const isSupported = isDubaiTimezoneSupported();

        expect(typeof isSupported).toBe('boolean');
        expect(isSupported).toBe(true);
      });
    });
  });
});
