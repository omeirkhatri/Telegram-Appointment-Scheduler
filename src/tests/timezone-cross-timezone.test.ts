import {
  formatInResolvedTimezone,
  getResolvedDayRange,
  getResolvedWeekRange,
  resolveTimezone,
  toLocalTime,
  toUTC,
  type TimezoneContext,
} from '@/utils/timezone';

// Test timezones representing different regions and DST behaviors
const TEST_TIMEZONES = [
  'Asia/Dubai',      // No DST, GMT+4
  'Europe/London',   // DST, GMT+0/+1
  'America/New_York', // DST, GMT-5/-4
  'Asia/Tokyo',      // No DST, GMT+9
  'Australia/Sydney', // DST, GMT+10/+11
  'Pacific/Honolulu', // No DST, GMT-10
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

describe('Cross-timezone scheduling and midnight transitions', () => {
  beforeEach(() => {
    // Clear any cached resolutions
    jest.clearAllMocks();
  });

  describe('Timezone resolution across different regions', () => {
    test.each(TEST_TIMEZONES)('resolves timezone correctly for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      const resolution = resolveTimezone(context);

      expect(resolution.timezone).toBe(timezone);
      expect(resolution.source).toBe('location');
      expect(resolution.offsetMinutes).toBeDefined();
      expect(resolution.abbreviation).toBeDefined();
      expect(resolution.referenceDate).toBeInstanceOf(Date);
    });

    test('prefers location timezone over organization fallback', () => {
      const context: TimezoneContext = {
        locationTimezone: 'Europe/London',
        organizationTimezone: 'Asia/Dubai',
      };
      const resolution = resolveTimezone(context);

      expect(resolution.timezone).toBe('Europe/London');
      expect(resolution.source).toBe('location');
    });

    test('falls back to organization timezone when location is invalid', () => {
      const context: TimezoneContext = {
        locationTimezone: 'Invalid/Timezone',
        organizationTimezone: 'America/New_York',
      };
      const resolution = resolveTimezone(context);

      expect(resolution.timezone).toBe('America/New_York');
      expect(resolution.source).toBe('organization');
    });
  });

  describe('Midnight boundary handling', () => {
    test.each(TEST_TIMEZONES)('handles midnight transitions correctly for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };

      // Test midnight boundary (23:59:59 to 00:00:00)
      const justBeforeMidnight = new Date('2024-06-21T23:59:59Z');
      const justAfterMidnight = new Date('2024-06-22T00:00:00Z');

      const localBefore = toLocalTime(justBeforeMidnight, context);
      const localAfter = toLocalTime(justAfterMidnight, context);

      // Verify that local times are correctly calculated
      expect(localBefore).toBeInstanceOf(Date);
      expect(localAfter).toBeInstanceOf(Date);
      expect(Number.isNaN(localBefore.getTime())).toBe(false);
      expect(Number.isNaN(localAfter.getTime())).toBe(false);

      // Verify day range calculations work across midnight
      const dayRange = getResolvedDayRange(justAfterMidnight, context);
      expect(dayRange.start).toBeInstanceOf(Date);
      expect(dayRange.end).toBeInstanceOf(Date);
      expect(dayRange.timezone.timezone).toBe(timezone);
    });

    test('handles DST transitions at midnight boundaries', () => {
      // Test DST start (spring forward) - clocks go from 1:59 AM to 3:00 AM
      const dstStart = new Date('2024-03-10T06:00:00Z'); // 1:00 AM EST, 2:00 AM EDT
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      
      const localTime = toLocalTime(dstStart, context);
      const formatted = formatInResolvedTimezone(dstStart, 'HH:mm', context);
      
      expect(localTime).toBeInstanceOf(Date);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    test('handles DST end at midnight boundaries', () => {
      // Test DST end (fall back) - clocks go from 1:59 AM to 1:00 AM
      const dstEnd = new Date('2024-11-03T05:00:00Z'); // 1:00 AM EDT, 1:00 AM EST
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      
      const localTime = toLocalTime(dstEnd, context);
      const formatted = formatInResolvedTimezone(dstEnd, 'HH:mm', context);
      
      expect(localTime).toBeInstanceOf(Date);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('Cross-timezone appointment scheduling', () => {
    test('schedules appointments consistently across timezones', () => {
      const appointmentDate = '2024-06-21';
      const appointmentTime = '14:30';
      const durationMinutes = 60;

      TEST_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };

        // Create appointment in local timezone
        const localStart = new Date(`${appointmentDate}T${appointmentTime}:00`);
        const utcStart = toUTC(localStart, context);
        const utcEnd = new Date(utcStart.getTime() + durationMinutes * 60 * 1000);

        // Convert back to local time
        const localStartBack = toLocalTime(utcStart, context);
        const localEndBack = toLocalTime(utcEnd, context);

        // Verify round-trip consistency
        expect(localStartBack.getHours()).toBe(14);
        expect(localStartBack.getMinutes()).toBe(30);
        expect(localEndBack.getHours()).toBe(15);
        expect(localEndBack.getMinutes()).toBe(30);
      });
    });

    test('handles appointments spanning midnight in different timezones', () => {
      const lateNightTime = '23:30';
      const durationMinutes = 60; // Appointment ends at 00:30 next day

      TEST_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };

        // Create appointment that spans midnight
        const appointmentDate = '2024-06-21';
        const localStart = new Date(`${appointmentDate}T${lateNightTime}:00`);
        const utcStart = toUTC(localStart, context);
        const utcEnd = new Date(utcStart.getTime() + durationMinutes * 60 * 1000);

        // Verify the appointment correctly spans to next day
        const localEnd = toLocalTime(utcEnd, context);
        const startDay = localStart.getDate();
        const endDay = localEnd.getDate();

        // The end day should be the next day
        expect(endDay).toBe(startDay + 1);
        expect(localEnd.getHours()).toBe(0);
        expect(localEnd.getMinutes()).toBe(30);
      });
    });
  });

  describe('Week range calculations across timezones', () => {
    test('calculates week ranges correctly for different timezones', () => {
      const testDate = new Date('2024-06-21T12:00:00Z'); // Friday

      TEST_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };
        const weekRange = getResolvedWeekRange(testDate, context);

        expect(weekRange.start).toBeInstanceOf(Date);
        expect(weekRange.end).toBeInstanceOf(Date);
        expect(weekRange.timezone.timezone).toBe(timezone);
        expect(weekRange.start.getTime()).toBeLessThan(weekRange.end.getTime());
      });
    });

    test('handles week boundaries at midnight in different timezones', () => {
      // Test a date that might be in different weeks depending on timezone
      const testDate = new Date('2024-06-17T00:00:00Z'); // Monday 00:00 UTC

      TEST_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };
        const weekRange = getResolvedWeekRange(testDate, context);

        // Verify the week range is valid
        expect(weekRange.start).toBeInstanceOf(Date);
        expect(weekRange.end).toBeInstanceOf(Date);
        expect(weekRange.timezone.timezone).toBe(timezone);

        // Verify it's a Monday (week starts on Monday)
        const localStart = toLocalTime(weekRange.start, context);
        const localEnd = toLocalTime(weekRange.end, context);
        
        expect(localStart.getDay()).toBe(1); // Monday
        expect(localEnd.getDay()).toBe(0); // Sunday
      });
    });
  });

  describe('Timezone artifact consistency', () => {
    test('builds consistent timezone artifacts across different contexts', () => {
      const contexts: TimezoneContext[] = [
        { locationTimezone: 'Asia/Dubai' },
        { organizationTimezone: 'Europe/London' },
        { explicitTimezone: 'America/New_York' },
        { fallbackTimezone: 'Asia/Tokyo' },
      ];

      contexts.forEach(context => {
        const resolution = resolveTimezone(context);
        
        expect(resolution).toBeDefined();
        expect(resolution.timezone).toBeDefined();
        expect(resolution.source).toBeDefined();
        expect(resolution.offsetMinutes).toBeDefined();
        expect(resolution.abbreviation).toBeDefined();
      });
    });

    test('maintains consistency when resolving same context multiple times', () => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      
      const resolution1 = resolveTimezone(context);
      const resolution2 = resolveTimezone(context);
      
      expect(resolution1.timezone).toBe(resolution2.timezone);
      expect(resolution1.source).toBe(resolution2.source);
      expect(resolution1.offsetMinutes).toBe(resolution2.offsetMinutes);
      expect(resolution1.abbreviation).toBe(resolution2.abbreviation);
    });
  });

  describe('Edge cases and error handling', () => {
    test('handles invalid timezone gracefully', () => {
      const context: TimezoneContext = { locationTimezone: 'Invalid/Timezone' };
      const resolution = resolveTimezone(context, { strict: false });

      // Should fall back to environment or legacy timezone
      expect(resolution.timezone).toBeDefined();
      expect(['environment', 'legacy', 'default']).toContain(resolution.source);
    });

    test('falls back to UTC when no valid timezone found', () => {
      // Clear environment variables to ensure no fallbacks
      const originalEnv = { ...process.env };
      delete process.env.NEXT_PUBLIC_ORGANIZATION_TIMEZONE;
      delete process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE;
      delete process.env.NEXT_PUBLIC_TZ;
      delete process.env.TZ;
      
      const context: TimezoneContext = { 
        locationTimezone: 'Invalid/Timezone',
        organizationTimezone: 'Invalid/Timezone2',
        fallbackTimezone: 'Invalid/Timezone3',
        explicitTimezone: 'Invalid/Timezone4',
      };
      
      const resolution = resolveTimezone(context, { strict: false, allowLegacy: false });
      
      // Should fall back to UTC
      expect(resolution.timezone).toBe('UTC');
      expect(resolution.source).toBe('default');
      
      // Restore environment
      Object.assign(process.env, originalEnv);
    });

    test('handles null and undefined timezone values', () => {
      const contexts: TimezoneContext[] = [
        { locationTimezone: null },
        { locationTimezone: undefined },
        { organizationTimezone: '' },
        {},
      ];

      contexts.forEach(context => {
        expect(() => {
          resolveTimezone(context);
        }).not.toThrow();
      });
    });
  });

  describe('Performance and caching', () => {
    test('caches timezone resolutions for performance', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      
      // First call should compute
      const start1 = Date.now();
      const resolution1 = resolveTimezone(context);
      const time1 = Date.now() - start1;

      // Second call should use cache
      const start2 = Date.now();
      const resolution2 = resolveTimezone(context);
      const time2 = Date.now() - start2;

      expect(resolution1.timezone).toBe(resolution2.timezone);
      // Cached call should be faster (though this might be flaky in tests)
      expect(time2).toBeLessThanOrEqual(time1);
    });

    test('clears cache correctly', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      
      // First call
      const resolution1 = resolveTimezone(context);
      
      // Clear cache
      const { clearTimezoneResolutionCache } = require('@/utils/timezone');
      clearTimezoneResolutionCache();
      
      // Second call should recompute
      const resolution2 = resolveTimezone(context);
      
      expect(resolution1.timezone).toBe(resolution2.timezone);
      // Both should be valid resolutions
      expect(resolution1.timezone).toBe('Asia/Dubai');
      expect(resolution2.timezone).toBe('Asia/Dubai');
    });
  });
});
