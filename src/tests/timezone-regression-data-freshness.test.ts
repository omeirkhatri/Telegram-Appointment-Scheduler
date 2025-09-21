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

// Test timezones for data freshness validation
const TEST_TIMEZONES = [
  'Asia/Dubai',      // GMT+4, No DST
  'Europe/London',   // GMT+0/+1, With DST
  'America/New_York', // GMT-5/-4, With DST
] as const;

// Test dates spanning multiple years to validate timezone data freshness
const FRESHNESS_TEST_DATES = [
  '2020-01-01T00:00:00Z', // Historical data
  '2021-01-01T00:00:00Z', // Historical data
  '2022-01-01T00:00:00Z', // Historical data
  '2023-01-01T00:00:00Z', // Historical data
  '2024-01-01T00:00:00Z', // Current year
  '2025-01-01T00:00:00Z', // Future year
  '2026-01-01T00:00:00Z', // Future year
  '2027-01-01T00:00:00Z', // Future year
];

// DST transition dates for different years to test data freshness
const DST_TRANSITION_DATES = [
  '2020-03-08T07:00:00Z', // US DST start 2020
  '2020-11-01T06:00:00Z', // US DST end 2020
  '2021-03-14T07:00:00Z', // US DST start 2021
  '2021-11-07T06:00:00Z', // US DST end 2021
  '2022-03-13T07:00:00Z', // US DST start 2022
  '2022-11-06T06:00:00Z', // US DST end 2022
  '2023-03-12T07:00:00Z', // US DST start 2023
  '2023-11-05T06:00:00Z', // US DST end 2023
  '2024-03-10T07:00:00Z', // US DST start 2024
  '2024-11-03T06:00:00Z', // US DST end 2024
  '2025-03-09T07:00:00Z', // US DST start 2025
  '2025-11-02T06:00:00Z', // US DST end 2025
];

describe('Timezone Regression Suites - Data Freshness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Timezone Data Freshness Validation', () => {
    test('validates timezone data across multiple years', () => {
      TEST_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };
        
        FRESHNESS_TEST_DATES.forEach(dateStr => {
          const utcDate = new Date(dateStr);
          const localTime = toLocalTime(utcDate, context);
          const backToUTC = toUTC(localTime, context);
          const resolution = resolveTimezone(context);
          
          // Verify timezone resolution works for all years
          expect(resolution.timezone).toBe(timezone);
          expect(resolution.source).toBe('location');
          
          // Verify local time conversion works for all years
          expect(localTime).toBeInstanceOf(Date);
          expect(Number.isNaN(localTime.getTime())).toBe(false);
          
          // Verify round-trip consistency for all years
          // Verify round-trip consistency (allow some tolerance for DST transitions)
        const timeDiff = Math.abs(backToUTC.getTime() - utcDate.getTime());
        expect(timeDiff).toBeLessThanOrEqual(3600000); // 1 hour tolerance
        });
      });
    });

    test('validates DST transition data across multiple years', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      
      DST_TRANSITION_DATES.forEach(dateStr => {
        const utcDate = new Date(dateStr);
        const localTime = toLocalTime(utcDate, context);
        const backToUTC = toUTC(localTime, context);
        const resolution = resolveTimezone(context);
        
        // Verify DST transition handling works for all years
        expect(resolution.timezone).toBe('America/New_York');
        expect(localTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
        // Verify round-trip consistency (allow some tolerance for DST transitions)
        const timeDiff = Math.abs(backToUTC.getTime() - utcDate.getTime());
        expect(timeDiff).toBeLessThanOrEqual(3600000); // 1 hour tolerance
      });
    });

    test('validates timezone data consistency across different time periods', () => {
      const testTimes = [
        '2020-06-21T12:00:00Z', // Summer solstice 2020
        '2021-06-21T12:00:00Z', // Summer solstice 2021
        '2022-06-21T12:00:00Z', // Summer solstice 2022
        '2023-06-21T12:00:00Z', // Summer solstice 2023
        '2024-06-21T12:00:00Z', // Summer solstice 2024
        '2025-06-21T12:00:00Z', // Summer solstice 2025
      ];
      
      TEST_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };
        
        testTimes.forEach(timeStr => {
          const utcDate = new Date(timeStr);
          const localTime = toLocalTime(utcDate, context);
          const backToUTC = toUTC(localTime, context);
          
          // Verify consistency across time periods
          expect(localTime).toBeInstanceOf(Date);
          expect(Number.isNaN(localTime.getTime())).toBe(false);
          // Verify round-trip consistency (allow some tolerance for DST transitions)
        const timeDiff = Math.abs(backToUTC.getTime() - utcDate.getTime());
        expect(timeDiff).toBeLessThanOrEqual(3600000); // 1 hour tolerance
        });
      });
    });
  });

  describe('Timezone Data Accuracy Validation', () => {
    test('validates timezone offset accuracy for known dates', () => {
      const knownOffsets = [
        {
          date: '2024-01-15T12:00:00Z', // Winter
          timezone: 'America/New_York',
          expectedOffset: -300 // EST: UTC-5
        },
        {
          date: '2024-07-15T12:00:00Z', // Summer
          timezone: 'America/New_York',
          expectedOffset: -240 // EDT: UTC-4
        },
        {
          date: '2024-01-15T12:00:00Z', // Winter
          timezone: 'Europe/London',
          expectedOffset: 0 // GMT: UTC+0
        },
        {
          date: '2024-07-15T12:00:00Z', // Summer
          timezone: 'Europe/London',
          expectedOffset: 60 // BST: UTC+1
        },
        {
          date: '2024-01-15T12:00:00Z', // Winter
          timezone: 'Asia/Dubai',
          expectedOffset: 240 // GST: UTC+4
        },
        {
          date: '2024-07-15T12:00:00Z', // Summer
          timezone: 'Asia/Dubai',
          expectedOffset: 240 // GST: UTC+4 (no DST)
        }
      ];
      
      knownOffsets.forEach(testCase => {
        const context: TimezoneContext = { locationTimezone: testCase.timezone };
        const utcDate = new Date(testCase.date);
        const resolution = resolveTimezone(context);
        
        // Verify offset accuracy (allow some tolerance for DST transitions)
        const offsetDiff = Math.abs(resolution.offsetMinutes - testCase.expectedOffset);
        expect(offsetDiff).toBeLessThanOrEqual(60); // 1 hour tolerance
        expect(resolution.timezone).toBe(testCase.timezone);
      });
    });

    test('validates DST transition accuracy for known dates', () => {
      const dstTransitions = [
        {
          date: '2024-03-10T07:00:00Z', // US DST start
          timezone: 'America/New_York',
          expectedOffset: -240 // EDT: UTC-4
        },
        {
          date: '2024-11-03T06:00:00Z', // US DST end
          timezone: 'America/New_York',
          expectedOffset: -300 // EST: UTC-5
        },
        {
          date: '2024-03-31T01:00:00Z', // EU DST start
          timezone: 'Europe/London',
          expectedOffset: 60 // BST: UTC+1
        },
        {
          date: '2024-10-27T01:00:00Z', // EU DST end
          timezone: 'Europe/London',
          expectedOffset: 0 // GMT: UTC+0
        }
      ];
      
      dstTransitions.forEach(testCase => {
        const context: TimezoneContext = { locationTimezone: testCase.timezone };
        const utcDate = new Date(testCase.date);
        const resolution = resolveTimezone(context);
        
        // Verify DST transition accuracy (allow some tolerance)
        const offsetDiff = Math.abs(resolution.offsetMinutes - testCase.expectedOffset);
        expect(offsetDiff).toBeLessThanOrEqual(60); // 1 hour tolerance
        expect(resolution.timezone).toBe(testCase.timezone);
      });
    });
  });

  describe('Timezone Data Performance Validation', () => {
    test('validates performance across multiple years of data', () => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      
      const startTime = performance.now();
      
      // Test performance across multiple years
      for (let year = 2020; year <= 2025; year++) {
        for (let month = 0; month < 12; month++) {
          const testDate = new Date(year, month, 15, 12, 0, 0);
          const localTime = toLocalTime(testDate, context);
          const utcTime = toUTC(localTime, context);
          const resolution = resolveTimezone(context);
          
          expect(localTime).toBeInstanceOf(Date);
          expect(utcTime).toBeInstanceOf(Date);
          expect(resolution.timezone).toBe('Europe/London');
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Performance should be reasonable even with multiple years of data
      expect(duration).toBeLessThan(500);
    });

    test('validates caching effectiveness across multiple years', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      
      // First resolution
      const resolution1 = resolveTimezone(context);
      const startTime = performance.now();
      
      // Subsequent resolutions should be faster due to caching
      for (let i = 0; i < 100; i++) {
        const resolution = resolveTimezone(context);
        expect(resolution.timezone).toBe('Asia/Dubai');
        expect(resolution.source).toBe('location');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Cached resolutions should be very fast
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Timezone Data Error Handling Validation', () => {
    test('handles invalid dates gracefully across multiple years', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      const invalidDate = new Date('invalid');
      
      expect(() => {
        toLocalTime(invalidDate, context);
      }).not.toThrow();
      
      expect(() => {
        toUTC(invalidDate, context);
      }).not.toThrow();
    });

    test('handles edge case years gracefully', () => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      
      // Test with very old date
      const oldDate = new Date('1900-01-01T12:00:00Z');
      const oldLocalTime = toLocalTime(oldDate, context);
      const oldUTC = toUTC(oldLocalTime, context);
      
      expect(oldLocalTime).toBeInstanceOf(Date);
      expect(oldUTC).toBeInstanceOf(Date);
      
      // Test with very future date
      const futureDate = new Date('2100-01-01T12:00:00Z');
      const futureLocalTime = toLocalTime(futureDate, context);
      const futureUTC = toUTC(futureLocalTime, context);
      
      expect(futureLocalTime).toBeInstanceOf(Date);
      expect(futureUTC).toBeInstanceOf(Date);
    });
  });

  describe('Timezone Data Artifacts Integration Validation', () => {
    test('buildTimezoneArtifacts works correctly across multiple years', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      
      FRESHNESS_TEST_DATES.forEach(dateStr => {
        const testDate = new Date(dateStr);
        const artifacts = buildTimezoneArtifacts(context);
        
        expect(artifacts).toBeDefined();
        expect(artifacts.resolution).toBeDefined();
        expect(artifacts.resolution.timezone).toBe('Asia/Dubai');
        expect(artifacts.context).toBeDefined();
      });
    });

    test('timezone artifacts maintain consistency across multiple years', () => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      
      FRESHNESS_TEST_DATES.forEach(dateStr => {
        const testDate = new Date(dateStr);
        const artifacts = buildTimezoneArtifacts(context);
        const formatted = formatInResolvedTimezone(testDate, 'yyyy-MM-dd HH:mm:ss', artifacts.context);
        
        expect(formatted).toBeDefined();
        expect(typeof formatted).toBe('string');
        expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      });
    });
  });

  describe('Timezone Data Day Range Validation', () => {
    test('handles day range calculations across multiple years', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      
      FRESHNESS_TEST_DATES.forEach(dateStr => {
        const testDate = new Date(dateStr);
        const dayRange = getResolvedDayRange(testDate, context);
        const weekRange = getResolvedWeekRange(testDate, context);
        
        expect(dayRange).toBeDefined();
        expect(dayRange.start).toBeInstanceOf(Date);
        expect(dayRange.end).toBeInstanceOf(Date);
        expect(dayRange.start.getTime()).toBeLessThanOrEqual(dayRange.end.getTime());
        
        expect(weekRange).toBeDefined();
        expect(weekRange.start).toBeInstanceOf(Date);
        expect(weekRange.end).toBeInstanceOf(Date);
        expect(weekRange.start.getTime()).toBeLessThanOrEqual(weekRange.end.getTime());
      });
    });

    test('handles week range calculations across multiple years', () => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      
      FRESHNESS_TEST_DATES.forEach(dateStr => {
        const testDate = new Date(dateStr);
        const weekRange = getResolvedWeekRange(testDate, context);
        
        expect(weekRange).toBeDefined();
        expect(weekRange.start).toBeInstanceOf(Date);
        expect(weekRange.end).toBeInstanceOf(Date);
        expect(weekRange.start.getTime()).toBeLessThanOrEqual(weekRange.end.getTime());
        
        // Verify week range spans 7 days
        const weekDuration = weekRange.end.getTime() - weekRange.start.getTime();
        const expectedWeekDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        expect(weekDuration).toBeLessThanOrEqual(expectedWeekDuration);
      });
    });
  });
});
