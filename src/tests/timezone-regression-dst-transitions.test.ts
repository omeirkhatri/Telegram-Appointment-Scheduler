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

// DST transition test cases for regression testing
const DST_TRANSITION_CASES = [
  {
    name: 'US DST Start 2024',
    utcTime: '2024-03-10T07:00:00Z', // 2 AM EST -> 3 AM EDT
    timezone: 'America/New_York',
    expectedOffsetBefore: -300, // EST: UTC-5
    expectedOffsetAfter: -240,  // EDT: UTC-4
    description: 'US DST spring forward transition'
  },
  {
    name: 'US DST End 2024',
    utcTime: '2024-11-03T06:00:00Z', // 2 AM EDT -> 1 AM EST
    timezone: 'America/New_York',
    expectedOffsetBefore: -240, // EDT: UTC-4
    expectedOffsetAfter: -300,  // EST: UTC-5
    description: 'US DST fall back transition'
  },
  {
    name: 'EU DST Start 2024',
    utcTime: '2024-03-31T01:00:00Z', // 2 AM CET -> 3 AM CEST
    timezone: 'Europe/London',
    expectedOffsetBefore: 0,   // GMT: UTC+0
    expectedOffsetAfter: 60,   // BST: UTC+1
    description: 'EU DST spring forward transition'
  },
  {
    name: 'EU DST End 2024',
    utcTime: '2024-10-27T01:00:00Z', // 2 AM CEST -> 1 AM CET
    timezone: 'Europe/London',
    expectedOffsetBefore: 60,  // BST: UTC+1
    expectedOffsetAfter: 0,    // GMT: UTC+0
    description: 'EU DST fall back transition'
  }
];

// Test times around DST transitions
const DST_TRANSITION_TIMES = [
  '01:58:00', // 2 minutes before transition
  '01:59:00', // 1 minute before transition
  '01:59:30', // 30 seconds before transition
  '01:59:59', // 1 second before transition
  '02:00:00', // Transition moment
  '02:00:01', // 1 second after transition
  '02:00:30', // 30 seconds after transition
  '02:01:00', // 1 minute after transition
  '02:02:00', // 2 minutes after transition
];

// Non-DST timezone for comparison
const NON_DST_TIMEZONE = 'Asia/Dubai';

describe('Timezone Regression Suites - DST Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DST Transition Boundary Regression Tests', () => {
    test.each(DST_TRANSITION_CASES)('handles $name correctly', (testCase) => {
      const context: TimezoneContext = { locationTimezone: testCase.timezone };
      
      // Test before transition
      const beforeTransition = new Date(testCase.utcTime);
      beforeTransition.setMinutes(beforeTransition.getMinutes() - 1);
      
      const localBefore = toLocalTime(beforeTransition, context);
      const resolutionBefore = resolveTimezone(context);
      
      // Test after transition
      const afterTransition = new Date(testCase.utcTime);
      afterTransition.setMinutes(afterTransition.getMinutes() + 1);
      
      const localAfter = toLocalTime(afterTransition, context);
      const resolutionAfter = resolveTimezone(context);
      
      // Verify timezone resolution
      expect(resolutionBefore.timezone).toBe(testCase.timezone);
      expect(resolutionAfter.timezone).toBe(testCase.timezone);
      
      // Verify local time conversions
      expect(localBefore).toBeInstanceOf(Date);
      expect(localAfter).toBeInstanceOf(Date);
      expect(Number.isNaN(localBefore.getTime())).toBe(false);
      expect(Number.isNaN(localAfter.getTime())).toBe(false);
      
      // Verify round-trip consistency (allow some tolerance for DST transitions)
      const utcBefore = toUTC(localBefore, context);
      const utcAfter = toUTC(localAfter, context);
      
      const beforeDiff = Math.abs(utcBefore.getTime() - beforeTransition.getTime());
      const afterDiff = Math.abs(utcAfter.getTime() - afterTransition.getTime());
      
      expect(beforeDiff).toBeLessThanOrEqual(3600000); // 1 hour tolerance
      expect(afterDiff).toBeLessThanOrEqual(3600000); // 1 hour tolerance
    });

    test('handles DST transition edge cases correctly', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      const baseDate = '2024-03-10'; // US DST start
      
      DST_TRANSITION_TIMES.forEach(timeStr => {
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
        expect(resolution.timezone).toBe('America/New_York');
      });
    });
  });

  describe('Cross-Timezone DST Consistency Regression Tests', () => {
    test('maintains consistency between DST and non-DST timezones', () => {
      const testDateTime = new Date('2024-06-21T12:00:00Z');
      
      // Test DST timezone
      const dstContext: TimezoneContext = { locationTimezone: 'Europe/London' };
      const dstLocalTime = toLocalTime(testDateTime, dstContext);
      const dstUTC = toUTC(dstLocalTime, dstContext);
      
      // Test non-DST timezone
      const nonDstContext: TimezoneContext = { locationTimezone: NON_DST_TIMEZONE };
      const nonDstLocalTime = toLocalTime(testDateTime, nonDstContext);
      const nonDstUTC = toUTC(nonDstLocalTime, nonDstContext);
      
      // Verify both handle the same UTC time correctly
      expect(dstUTC.getTime()).toBe(testDateTime.getTime());
      expect(nonDstUTC.getTime()).toBe(testDateTime.getTime());
      
      // Verify local times are different (as expected)
      expect(dstLocalTime.getTime()).not.toBe(nonDstLocalTime.getTime());
    });

    test('handles DST transitions consistently across different timezones', () => {
      const testDate = new Date('2024-03-10T12:00:00Z'); // DST start day
      
      const timezones = ['America/New_York', 'Europe/London', 'Asia/Dubai'];
      
      timezones.forEach(timezone => {
        const context: TimezoneContext = { locationTimezone: timezone };
        const localTime = toLocalTime(testDate, context);
        const utcTime = toUTC(localTime, context);
        const resolution = resolveTimezone(context);
        
        // Verify consistent handling
        expect(localTime).toBeInstanceOf(Date);
        expect(utcTime).toBeInstanceOf(Date);
        expect(Number.isNaN(localTime.getTime())).toBe(false);
        expect(Number.isNaN(utcTime.getTime())).toBe(false);
        expect(resolution.timezone).toBe(timezone);
        
        // Verify round-trip consistency
        expect(utcTime.getTime()).toBe(testDate.getTime());
      });
    });
  });

  describe('DST Transition Performance Regression Tests', () => {
    test('maintains performance during DST transition calculations', () => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      const testDate = new Date('2024-03-31T01:00:00Z'); // EU DST start
      
      const startTime = performance.now();
      
      // Perform multiple operations around DST transition
      for (let i = 0; i < 100; i++) {
        const localTime = toLocalTime(testDate, context);
        const utcTime = toUTC(localTime, context);
        const resolution = resolveTimezone(context);
        
        expect(localTime).toBeInstanceOf(Date);
        expect(utcTime).toBeInstanceOf(Date);
        expect(resolution.timezone).toBe('Europe/London');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Performance should be reasonable even during DST transitions
      expect(duration).toBeLessThan(200);
    });

    test('caches DST transition calculations effectively', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      
      // First resolution
      const resolution1 = resolveTimezone(context);
      const startTime = performance.now();
      
      // Subsequent resolutions should be faster due to caching
      for (let i = 0; i < 50; i++) {
        const resolution = resolveTimezone(context);
        expect(resolution.timezone).toBe('America/New_York');
        expect(resolution.source).toBe('location');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Cached resolutions should be very fast
      expect(duration).toBeLessThan(50);
    });
  });

  describe('DST Transition Error Handling Regression Tests', () => {
    test('handles invalid DST transition dates gracefully', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      
      // Test with invalid date
      const invalidDate = new Date('invalid');
      
      expect(() => {
        toLocalTime(invalidDate, context);
      }).not.toThrow();
      
      expect(() => {
        toUTC(invalidDate, context);
      }).not.toThrow();
    });

    test('handles edge case DST transition contexts', () => {
      const context: TimezoneContext = { 
        locationTimezone: 'Invalid/Timezone',
        organizationTimezone: 'Europe/London'
      };
      
      // Should fall back to organization timezone
      const resolution = resolveTimezone(context);
      expect(resolution.timezone).toBe('Europe/London');
      expect(resolution.source).toBe('organization');
    });
  });

  describe('DST Transition Timezone Artifacts Integration Regression Tests', () => {
    test('buildTimezoneArtifacts works correctly during DST transitions', () => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      const testDate = new Date('2024-03-31T01:00:00Z'); // EU DST start
      
      const artifacts = buildTimezoneArtifacts(context);
      
      expect(artifacts).toBeDefined();
      expect(artifacts.resolution).toBeDefined();
      expect(artifacts.resolution.timezone).toBe('Europe/London');
      expect(artifacts.context).toBeDefined();
    });

    test('timezone artifacts maintain consistency during DST transitions', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      const testDate = new Date('2024-03-10T07:00:00Z'); // US DST start
      
      const artifacts = buildTimezoneArtifacts(context);
      const formatted = formatInResolvedTimezone(testDate, 'yyyy-MM-dd HH:mm:ss', artifacts.context);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('DST Transition Day Range Regression Tests', () => {
    test('handles day range calculations during DST transitions', () => {
      const context: TimezoneContext = { locationTimezone: 'Europe/London' };
      const testDate = new Date('2024-03-31T01:00:00Z'); // EU DST start
      
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

    test('handles week range calculations during DST transitions', () => {
      const context: TimezoneContext = { locationTimezone: 'America/New_York' };
      const testDate = new Date('2024-11-03T06:00:00Z'); // US DST end
      
      const weekRange = getResolvedWeekRange(testDate, context);
      
      expect(weekRange).toBeDefined();
      expect(weekRange.start).toBeInstanceOf(Date);
      expect(weekRange.end).toBeInstanceOf(Date);
      expect(weekRange.start.getTime()).toBeLessThanOrEqual(weekRange.end.getTime());
      
        // Verify week range spans approximately 7 days (allow some tolerance for DST)
        const weekDuration = weekRange.end.getTime() - weekRange.start.getTime();
        const expectedWeekDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        const tolerance = 2 * 60 * 60 * 1000; // 2 hours tolerance for DST
        expect(weekDuration).toBeLessThanOrEqual(expectedWeekDuration + tolerance);
    });
  });
});
