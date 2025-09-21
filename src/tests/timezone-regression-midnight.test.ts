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

// Regression test timezones as specified in Task 8.1
const REGRESSION_TIMEZONES = [
  'Asia/Dubai',      // GMT+4, No DST
  'Europe/London',   // GMT+0/+1, With DST
  'America/New_York', // GMT-5/-4, With DST
] as const;

// Critical midnight boundary test cases for regression testing
const MIDNIGHT_BOUNDARY_CASES = [
  {
    name: 'New Year Midnight',
    utcTime: '2024-01-01T00:00:00Z',
    description: 'New Year midnight UTC'
  },
  {
    name: 'Summer Solstice Midnight',
    utcTime: '2024-06-21T00:00:00Z',
    description: 'Summer solstice midnight UTC'
  },
  {
    name: 'Winter Solstice Midnight',
    utcTime: '2024-12-21T00:00:00Z',
    description: 'Winter solstice midnight UTC'
  },
  {
    name: 'DST Start Midnight (US)',
    utcTime: '2024-03-10T00:00:00Z',
    description: 'DST start midnight UTC (US)'
  },
  {
    name: 'DST End Midnight (US)',
    utcTime: '2024-11-03T00:00:00Z',
    description: 'DST end midnight UTC (US)'
  },
  {
    name: 'DST Start Midnight (EU)',
    utcTime: '2024-03-31T00:00:00Z',
    description: 'DST start midnight UTC (EU)'
  },
  {
    name: 'DST End Midnight (EU)',
    utcTime: '2024-10-27T00:00:00Z',
    description: 'DST end midnight UTC (EU)'
  }
];

// Edge case times around midnight for comprehensive testing
const MIDNIGHT_EDGE_TIMES = [
  '23:58:30', // 1.5 minutes before midnight
  '23:59:00', // 1 minute before midnight
  '23:59:30', // 30 seconds before midnight
  '23:59:59', // 1 second before midnight
  '00:00:00', // Exactly midnight
  '00:00:01', // 1 second after midnight
  '00:00:30', // 30 seconds after midnight
  '00:01:00', // 1 minute after midnight
  '00:01:30', // 1.5 minutes after midnight
];

describe('Timezone Regression Suites - Midnight Crossings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Critical Midnight Boundary Regression Tests', () => {
    test.each(REGRESSION_TIMEZONES)('handles midnight boundaries correctly for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      
      MIDNIGHT_BOUNDARY_CASES.forEach(testCase => {
        const utcDate = new Date(testCase.utcTime);
        const localTime = toLocalTime(utcDate, context);
        const backToUTC = toUTC(localTime, context);
        
        // Verify timezone resolution
        const resolution = resolveTimezone(context);
        expect(resolution.timezone).toBe(timezone);
        expect(resolution.source).toBe('location');
        
        // Verify local time conversion
        expect(localTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
        
        // Verify round-trip consistency (UTC -> Local -> UTC)
        expect(backToUTC.getTime()).toBe(utcDate.getTime());
        
        // Verify timezone-specific behavior
        if (timezone === 'Asia/Dubai') {
          // Dubai is always UTC+4, no DST
          expect(resolution.offsetMinutes).toBe(240); // +4 hours
        } else if (timezone === 'Europe/London') {
          // London has DST, check if it's in DST period
          const isDST = localTime.getMonth() >= 2 && localTime.getMonth() <= 9; // Rough DST check
          if (isDST) {
            expect(resolution.offsetMinutes).toBe(60); // +1 hour in DST
          } else {
            expect(resolution.offsetMinutes).toBe(0); // GMT in winter
          }
        } else if (timezone === 'America/New_York') {
          // New York has DST, check if it's in DST period
          const isDST = localTime.getMonth() >= 2 && localTime.getMonth() <= 9; // Rough DST check
          if (isDST) {
            expect(resolution.offsetMinutes).toBe(-240); // -4 hours in DST
          } else {
            expect(resolution.offsetMinutes).toBe(-300); // -5 hours in EST
          }
        }
      });
    });

    test('maintains consistency across timezone boundaries during DST transitions', () => {
      const testDate = new Date('2024-03-10T06:00:00Z'); // DST start in US
      
      REGRESSION_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };
        const localTime = toLocalTime(testDate, context);
        const backToUTC = toUTC(localTime, context);
        
        // Verify round-trip consistency during DST transition
        expect(backToUTC.getTime()).toBe(testDate.getTime());
        
        // Verify local time is valid
        expect(localTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
      });
    });
  });

  describe('Midnight Edge Case Regression Tests', () => {
    test.each(REGRESSION_TIMEZONES)('handles edge cases around midnight for %s', (timezone) => {
      const context: TimezoneContext = { locationTimezone: timezone };
      const baseDate = '2024-06-21'; // Summer solstice
      
      MIDNIGHT_EDGE_TIMES.forEach(timeStr => {
        const utcTime = `${baseDate}T${timeStr}Z`;
        const utcDate = new Date(utcTime);
        
        const localTime = toLocalTime(utcDate, context);
        const backToUTC = toUTC(localTime, context);
        
        // Verify edge case handling
        expect(localTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
        expect(backToUTC.getTime()).toBe(utcDate.getTime());
        
        // Verify timezone resolution is consistent
        const resolution = resolveTimezone(context);
        expect(resolution.timezone).toBe(timezone);
      });
    });

    test('handles day range calculations across midnight boundaries', () => {
      REGRESSION_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };
        
        // Test day range that crosses midnight
        const startDate = new Date('2024-06-21T23:30:00Z');
        const endDate = new Date('2024-06-22T00:30:00Z');
        
        const dayRange = getResolvedDayRange(startDate, context);
        const weekRange = getResolvedWeekRange(startDate, context);
        
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
  });

  describe('Cross-Timezone Midnight Consistency Regression Tests', () => {
    test('maintains consistent behavior across all regression timezones', () => {
      const testDateTime = new Date('2024-06-21T12:00:00Z');
      const results: Array<{
        timezone: string;
        localTime: Date;
        utcTime: Date;
        resolution: any;
      }> = [];
      
      REGRESSION_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };
        const localTime = toLocalTime(testDateTime, context);
        const utcTime = toUTC(localTime, context);
        const resolution = resolveTimezone(context);
        
        results.push({
          timezone,
          localTime,
          utcTime,
          resolution
        });
        
        // Verify individual timezone handling
        expect(localTime).toBeInstanceOf(Date);
        expect(utcTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
        expect(Number.isNaN(utcTime.getTime())).toBe(false);
        expect(resolution.timezone).toBe(timezone);
      });
      
      // Verify cross-timezone consistency
      const firstUTC = results[0].utcTime;
      results.forEach(result => {
        expect(result.utcTime.getTime()).toBe(firstUTC.getTime());
      });
    });

    test('handles timezone resolution hierarchy consistently', () => {
      const explicitTimezone = 'Asia/Dubai';
      const locationTimezone = 'Europe/London';
      const organizationTimezone = 'America/New_York';
      
      REGRESSION_TIMEZONES.forEach(timezone => {
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
  });

  describe('Performance and Caching Regression Tests', () => {
    test('maintains performance across midnight boundary calculations', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const testDate = new Date('2024-06-21T23:59:59Z');
      
      const startTime = performance.now();
      
      // Perform multiple operations to test caching
      for (let i = 0; i < 100; i++) {
        const localTime = toLocalTime(testDate, context);
        const utcTime = toUTC(localTime, context);
        const resolution = resolveTimezone(context);
        
        expect(localTime).toBeInstanceOf(Date);
        expect(utcTime).toBeInstanceOf(Date);
        expect(resolution.timezone).toBe('Asia/Dubai');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Performance should be reasonable (less than 200ms for 100 operations)
      expect(duration).toBeLessThan(200);
    });

    test('caches timezone resolutions effectively', () => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      
      // First resolution
      const resolution1 = resolveTimezone(context);
      const startTime = performance.now();
      
      // Subsequent resolutions should be faster due to caching
      for (let i = 0; i < 50; i++) {
        const resolution = resolveTimezone(context);
        expect(resolution.timezone).toBe('Europe/London');
        expect(resolution.source).toBe('location');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Cached resolutions should be very fast
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Error Handling Regression Tests', () => {
    test('handles invalid timezone gracefully', () => {
      const context: TimezoneContext = { 
        locationTimezone: 'Invalid/Timezone',
        organizationTimezone: 'Asia/Dubai'
      };
      
      const resolution = resolveTimezone(context);
      expect(resolution.timezone).toBe('Asia/Dubai');
      expect(resolution.source).toBe('organization');
    });

    test('handles invalid dates gracefully', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const invalidDate = new Date('invalid');
      
      expect(() => {
        toLocalTime(invalidDate, context);
      }).not.toThrow();
      
      expect(() => {
        toUTC(invalidDate, context);
      }).not.toThrow();
    });

    test('handles edge case timezone contexts', () => {
      const context: TimezoneContext = {};
      
      // Should fall back to default behavior
      const resolution = resolveTimezone(context);
      expect(resolution).toBeDefined();
      expect(resolution.timezone).toBeDefined();
    });
  });

  describe('Timezone Artifacts Integration Regression Tests', () => {
    test('buildTimezoneArtifacts works correctly with regression timezones', () => {
      REGRESSION_TIMEZONES.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };
        const artifacts = buildTimezoneArtifacts(context);
        
        expect(artifacts).toBeDefined();
        expect(artifacts.resolution).toBeDefined();
        expect(artifacts.resolution.timezone).toBe(timezone);
        expect(artifacts.context).toBeDefined();
      });
    });

    test('timezone artifacts maintain consistency across midnight boundaries', () => {
      const context: TimezoneContext = { locationTimezone: 'Asia/Dubai' };
      const testDate = new Date('2024-06-21T23:59:59Z');
      
      const artifacts = buildTimezoneArtifacts(context);
      const formatted = formatInResolvedTimezone(testDate, 'yyyy-MM-dd HH:mm:ss', artifacts.context);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });
});
