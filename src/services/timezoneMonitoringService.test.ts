import { timezoneMonitoringService } from './timezoneMonitoringService';
import { loggingService } from './loggingService';
import { performanceMonitoringService } from './performanceMonitoringService';

jest.mock('./loggingService', () => ({
  loggingService: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('./performanceMonitoringService', () => ({
  performanceMonitoringService: {
    recordMetric: jest.fn(),
  },
}));

describe('timezoneMonitoringService', () => {
  beforeEach(() => {
    timezoneMonitoringService.resetCounters();
    jest.clearAllMocks();
  });

  it('records resolution telemetry and updates counters', () => {
    const timestamp = new Date().toISOString();

    timezoneMonitoringService.recordResolution({
      context: {
        explicitTimezone: 'Europe/London',
        locationTimezone: null,
        organizationTimezone: null,
        fallbackTimezone: null,
        preferLegacyFallback: true,
      },
      options: {
        allowLegacy: true,
        referenceDate: new Date(),
        memoize: true,
        strict: false,
      },
      resolution: {
        timezone: 'Europe/London',
        source: 'explicit',
        offsetMinutes: 60,
        abbreviation: 'BST',
        referenceDate: new Date(),
        resolutionPath: [{ candidate: 'Europe/London', source: 'explicit' }],
      },
      cacheHit: false,
      timestamp,
    });

    const counters = timezoneMonitoringService.getCounters();
    expect(counters.total).toBe(1);
    expect(counters.fallback).toBe(0);
    expect(loggingService.debug).toHaveBeenCalled();
    expect(performanceMonitoringService.recordMetric).toHaveBeenCalled();
  });

  it('tracks fallback and legacy usage', () => {
    const timestamp = new Date().toISOString();

    timezoneMonitoringService.recordResolution({
      context: {
        explicitTimezone: null,
        locationTimezone: null,
        organizationTimezone: null,
        fallbackTimezone: LEGACY_TIMEZONE,
        preferLegacyFallback: true,
      },
      options: {
        allowLegacy: true,
        referenceDate: new Date(),
        memoize: true,
        strict: false,
      },
      resolution: {
        timezone: LEGACY_TIMEZONE,
        source: 'legacy',
        offsetMinutes: 240,
        abbreviation: 'GST',
        referenceDate: new Date(),
        resolutionPath: [{ candidate: LEGACY_TIMEZONE, source: 'legacy' }],
      },
      cacheHit: false,
      timestamp,
    });

    const counters = timezoneMonitoringService.getCounters();
    expect(counters.total).toBe(1);
    expect(counters.fallback).toBe(1);
    expect(counters.legacy).toBe(1);
  });

  it('records resolver errors', () => {
    timezoneMonitoringService.recordResolverError(new Error('test'), { stage: 'unit-test' });
    const counters = timezoneMonitoringService.getCounters();
    expect(counters.errors).toBe(1);
    expect(loggingService.error).toHaveBeenCalled();
    expect(performanceMonitoringService.recordMetric).toHaveBeenCalled();
  });

  it('records timezone change events', () => {
    timezoneMonitoringService.recordTimezoneChange({
      id: 'audit-1',
      entityType: 'location',
      entityId: 'loc-1',
      previousTimezone: 'Asia/Dubai',
      newTimezone: 'Europe/London',
      changedAt: new Date().toISOString(),
      changedBy: 'user-1',
    });

    expect(loggingService.info).toHaveBeenCalled();
    expect(performanceMonitoringService.recordMetric).toHaveBeenCalled();
  });
});

const LEGACY_TIMEZONE = 'Asia/Dubai';
