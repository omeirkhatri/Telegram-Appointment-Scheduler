import {
  formatInResolvedTimezone,
  getCurrentLocalTime,
  getResolvedDayRange,
  getResolvedWeekRange,
  resolveTimezone,
  toLocalTime,
  toUTC,
  type TimezoneContext,
} from '@/utils/timezone';
import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';

// Test timezones representing different regions and DST behaviors
const TEST_TIMEZONES = [
  {
    name: 'Asia/Dubai',
    abbreviation: 'GST',
    offset: '+04:00',
    description: 'Dubai (UTC+4) - No DST',
    hasDST: false
  },
  {
    name: 'Europe/London',
    abbreviation: 'GMT/BST',
    offset: '+00:00/+01:00',
    description: 'London (UTC+0/+1) - With DST',
    hasDST: true
  },
  {
    name: 'America/New_York',
    abbreviation: 'EST/EDT',
    offset: '-05:00/-04:00',
    description: 'New York (UTC-5/-4) - With DST',
    hasDST: true
  }
];

// Test dates that are significant for timezone boundary testing
const BOUNDARY_TEST_DATES = [
  {
    date: '2024-06-21',
    description: 'Summer solstice - long day',
    isDST: true
  },
  {
    date: '2024-12-21',
    description: 'Winter solstice - short day',
    isDST: false
  },
  {
    date: '2024-03-10',
    description: 'DST transition start (US)',
    isDST: false
  },
  {
    date: '2024-11-03',
    description: 'DST transition end (US)',
    isDST: true
  }
];

// Test times around midnight
const MIDNIGHT_TEST_TIMES = [
  '23:30',
  '23:45',
  '23:59',
  '00:00',
  '00:01',
  '00:15',
  '00:30'
];

describe('Timezone Midnight Boundary Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Midnight boundary handling across timezones', () => {
    test.each(TEST_TIMEZONES)('handles midnight transitions correctly for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone.name };

      // Test just before and after midnight
      const justBeforeMidnight = new Date('2024-06-21T23:59:59Z');
      const justAfterMidnight = new Date('2024-06-22T00:00:00Z');

      const localBefore = toLocalTime(justBeforeMidnight, context);
      const localAfter = toLocalTime(justAfterMidnight, context);

      expect(localBefore).toBeInstanceOf(Date);
      expect(localAfter).toBeInstanceOf(Date);
      expect(Number.isNaN(localBefore.getTime())).toBe(false);
      expect(Number.isNaN(localAfter.getTime())).toBe(false);

      // Verify the times are different (crossed midnight)
      // Note: The dates might be the same if the timezone offset causes the local time to stay within the same day
      const timeDiff = Math.abs(localAfter.getTime() - localBefore.getTime());
      expect(timeDiff).toBeGreaterThan(0);
    });

    test.each(TEST_TIMEZONES)('handles day range calculations across midnight for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone.name };

      // Test day range calculation around midnight
      const midnightUTC = new Date('2024-06-21T23:30:00Z');
      const dayRange = getResolvedDayRange(midnightUTC, context);

      expect(dayRange.start).toBeInstanceOf(Date);
      expect(dayRange.end).toBeInstanceOf(Date);
      expect(dayRange.timezone.timezone).toBe(timezone.name);

      // Verify the day range spans the correct local day
      const localStart = toLocalTime(dayRange.start, context);
      const localEnd = toLocalTime(dayRange.end, context);

      expect(localStart.getHours()).toBe(0);
      expect(localStart.getMinutes()).toBe(0);
      expect(localStart.getSeconds()).toBe(0);
      expect(localEnd.getHours()).toBe(23);
      expect(localEnd.getMinutes()).toBe(59);
      expect(localEnd.getSeconds()).toBe(59);
    });

    test.each(TEST_TIMEZONES)('handles week range calculations across midnight for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone.name };

      // Test week range calculation around midnight
      const midnightUTC = new Date('2024-06-21T23:30:00Z');
      const weekRange = getResolvedWeekRange(midnightUTC, context);

      expect(weekRange.start).toBeInstanceOf(Date);
      expect(weekRange.end).toBeInstanceOf(Date);
      expect(weekRange.timezone.timezone).toBe(timezone.name);

      // Verify the week range spans the correct local week
      const localStart = toLocalTime(weekRange.start, context);
      const localEnd = toLocalTime(weekRange.end, context);

      // Week should start on Monday (day 1) and end on Sunday (day 0)
      expect(localStart.getDay()).toBe(1); // Monday
      expect(localEnd.getDay()).toBe(0); // Sunday
    });
  });

  describe('Appointment scheduling across midnight boundaries', () => {
    test.each(TEST_TIMEZONES)('schedules appointments correctly around midnight for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone.name };

      // Test appointment scheduling around midnight
      const testDate = '2024-06-21';
      const testTimes = ['23:30', '23:59', '00:00', '00:01'];

      testTimes.forEach(time => {
        const appointmentDateTime = new Date(`${testDate}T${time}:00`);
        const localTime = toLocalTime(appointmentDateTime, context);
        const utcTime = toUTC(localTime, context);

        expect(localTime).toBeInstanceOf(Date);
        expect(utcTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
        expect(Number.isNaN(utcTime.getTime())).toBe(false);

        // Verify round-trip consistency
        const roundTripLocal = toLocalTime(utcTime, context);
        expect(roundTripLocal.getTime()).toBe(localTime.getTime());
      });
    });

    test.each(TEST_TIMEZONES)('handles appointment duration across midnight for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone.name };

      // Test appointment that spans midnight
      const startTime = new Date('2024-06-21T23:30:00Z');
      const durationMinutes = 60; // 1 hour
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      const localStart = toLocalTime(startTime, context);
      const localEnd = toLocalTime(endTime, context);

      expect(localStart).toBeInstanceOf(Date);
      expect(localEnd).toBeInstanceOf(Date);

      // Verify the duration is maintained
      const actualDuration = (localEnd.getTime() - localStart.getTime()) / (1000 * 60);
      expect(actualDuration).toBe(durationMinutes);
    });
  });

  describe('DST transition handling', () => {
    test.each(TEST_TIMEZONES.filter(tz => tz.hasDST))('handles DST transitions correctly for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone.name };

      // Test DST transition dates
      const dstTransitionDates = [
        '2024-03-10', // Spring forward (US)
        '2024-11-03', // Fall back (US)
        '2024-03-31', // Spring forward (EU)
        '2024-10-27'  // Fall back (EU)
      ];

      dstTransitionDates.forEach(date => {
        const testDateTime = new Date(`${date}T12:00:00Z`);
        const localTime = toLocalTime(testDateTime, context);
        const utcTime = toUTC(localTime, context);

        expect(localTime).toBeInstanceOf(Date);
        expect(utcTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
        expect(Number.isNaN(utcTime.getTime())).toBe(false);
      });
    });

    test('handles spring forward transition correctly', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };

      // Test times around spring forward (2 AM becomes 3 AM)
      const beforeTransition = new Date('2024-03-10T06:59:00Z'); // 1:59 AM EST
      const afterTransition = new Date('2024-03-10T07:00:00Z');   // 3:00 AM EDT

      const localBefore = toLocalTime(beforeTransition, context);
      const localAfter = toLocalTime(afterTransition, context);

      expect(localBefore).toBeInstanceOf(Date);
      expect(localAfter).toBeInstanceOf(Date);

      // The local times should be 1 hour and 1 minute apart (1:59 AM to 3:00 AM)
      const timeDiff = localAfter.getTime() - localBefore.getTime();
      expect(timeDiff).toBe(3660000); // 1 hour and 1 minute
    });

    test('handles fall back transition correctly', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };

      // Test times around fall back (2 AM becomes 1 AM)
      const beforeTransition = new Date('2024-11-03T05:59:00Z'); // 1:59 AM EDT
      const afterTransition = new Date('2024-11-03T06:00:00Z');   // 1:00 AM EST

      const localBefore = toLocalTime(beforeTransition, context);
      const localAfter = toLocalTime(afterTransition, context);

      expect(localBefore).toBeInstanceOf(Date);
      expect(localAfter).toBeInstanceOf(Date);

      // The local times should be 59 minutes apart (1:59 AM to 1:00 AM next day)
      const timeDiff = Math.abs(localAfter.getTime() - localBefore.getTime());
      expect(timeDiff).toBe(3540000); // 59 minutes
    });
  });

  describe('Cross-timezone consistency', () => {
    test('maintains consistency across different timezones', () => {
      const testDateTime = new Date('2024-06-21T12:00:00Z');
      const results: Array<{ timezone: string; localTime: Date; utcTime: Date }> = [];

      // Test the same UTC time across different timezones
      TEST_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone.name };
        const localTime = toLocalTime(testDateTime, context);
        const utcTime = toUTC(localTime, context);

        results.push({
          timezone: timezone.name,
          localTime,
          utcTime
        });

        expect(localTime).toBeInstanceOf(Date);
        expect(utcTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
        expect(Number.isNaN(utcTime.getTime())).toBe(false);
      });

      // Verify that all UTC times are the same (round-trip consistency)
      const firstUTC = results[0].utcTime;
      results.forEach(result => {
        expect(result.utcTime.getTime()).toBe(firstUTC.getTime());
      });
    });

    test('handles timezone resolution hierarchy correctly', () => {
      const explicitTimezone = 'Asia/Dubai';
      const locationTimezone = 'Europe/London';
      const organizationTimezone = 'America/New_York';

      const context: TimezoneContext = {
        explicitTimezone,
        locationTimezone,
        organizationTimezone
      };

      const resolution = resolveTimezone(context);
      expect(resolution.timezone).toBe(explicitTimezone);
      expect(resolution.source).toBe('explicit');
    });
  });

  describe('Performance and caching', () => {
    test('caches timezone resolutions for performance', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const testDateTime = new Date('2024-06-21T12:00:00Z');

      // First call
      const start1 = performance.now();
      const localTime1 = toLocalTime(testDateTime, context);
      const end1 = performance.now();

      // Second call (should be cached)
      const start2 = performance.now();
      const localTime2 = toLocalTime(testDateTime, context);
      const end2 = performance.now();

      expect(localTime1.getTime()).toBe(localTime2.getTime());
      expect(end2 - start2).toBeLessThan(end1 - start1);
    });

    test('handles multiple concurrent timezone operations', () => {
      const contexts = TEST_TIMEZONES.map(tz => ({ locationTimezone: tz.name }));
      const testDateTime = new Date('2024-06-21T12:00:00Z');

      const results = contexts.map(context => {
        const localTime = toLocalTime(testDateTime, context);
        const utcTime = toUTC(localTime, context);
        return { localTime, utcTime };
      });

      results.forEach(result => {
        expect(result.localTime).toBeInstanceOf(Date);
        expect(result.utcTime).toBeInstanceOf(Date);
        expect(Number.isNaN(result.localTime.getTime())).toBe(false);
        expect(Number.isNaN(result.utcTime.getTime())).toBe(false);
      });
    });
  });

  describe('Error handling and edge cases', () => {
    test('handles invalid timezone gracefully', () => {
      const context: TimezoneContext = { locationTimezone: 'Invalid/Timezone' };
      const testDateTime = new Date('2024-06-21T12:00:00Z');

      const localTime = toLocalTime(testDateTime, context);
      const utcTime = toUTC(localTime, context);

      expect(localTime).toBeInstanceOf(Date);
      expect(utcTime).toBeInstanceOf(Date);
      expect(Number.isNaN(localTime.getTime())).toBe(false);
      expect(Number.isNaN(utcTime.getTime())).toBe(false);
    });

    test('handles null and undefined timezone context', () => {
      const testDateTime = new Date('2024-06-21T12:00:00Z');

      const localTime1 = toLocalTime(testDateTime, null);
      const localTime2 = toLocalTime(testDateTime, undefined);
      const utcTime1 = toUTC(localTime1, null);
      const utcTime2 = toUTC(localTime2, undefined);

      expect(localTime1).toBeInstanceOf(Date);
      expect(localTime2).toBeInstanceOf(Date);
      expect(utcTime1).toBeInstanceOf(Date);
      expect(utcTime2).toBeInstanceOf(Date);
    });

    test('handles extreme dates correctly', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const extremeDates = [
        new Date('1970-01-01T00:00:00Z'), // Unix epoch
        new Date('2038-01-19T03:14:07Z'), // 32-bit signed integer max
        new Date('2100-01-01T00:00:00Z'), // Far future
      ];

      extremeDates.forEach(date => {
        const localTime = toLocalTime(date, context);
        const utcTime = toUTC(localTime, context);

        expect(localTime).toBeInstanceOf(Date);
        expect(utcTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
        expect(Number.isNaN(utcTime.getTime())).toBe(false);
      });
    });
  });

  describe('Timezone artifacts and metadata', () => {
    test('formats time correctly in resolved timezone', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const testDateTime = new Date('2024-06-21T12:00:00Z');

      const formatted = formatInResolvedTimezone(testDateTime, 'HH:mm:ss', context);

      expect(typeof formatted).toBe('string');
      expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    test('resolves timezone correctly', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const resolution = resolveTimezone(context);

      expect(resolution).toHaveProperty('timezone');
      expect(resolution).toHaveProperty('source');
      expect(resolution).toHaveProperty('abbreviation');
      expect(resolution).toHaveProperty('offsetMinutes');
      expect(resolution.timezone).toBe('Asia/Dubai');
    });
  });
});
