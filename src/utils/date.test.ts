import {
  LEGACY_TIMEZONE,
  UTC_TIMEZONE,
  TIME_FMT,
  buildLegacyTimezoneContext,
  clearTimezoneResolutionCache,
  formatAppointmentWindow,
  formatDubaiDate,
  formatInResolvedTimezone,
  resolveTimezone,
  toLocal,
  toLocalTime,
  toUTC,
  type TimezoneContext,
} from './timezone';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

describe('timezone resolver', () => {
  beforeEach(() => {
    clearTimezoneResolutionCache();
    resetEnv();
  });

  afterAll(() => {
    resetEnv();
  });

  it('prefers location timezone before organization fallback', () => {
    const resolution = resolveTimezone({
      locationTimezone: 'Europe/London',
      organizationTimezone: 'Asia/Kolkata',
    });

    expect(resolution.timezone).toBe('Europe/London');
    expect(resolution.source).toBe('location');
  });

  it('falls back to organization timezone when location is missing', () => {
    const resolution = resolveTimezone({
      organizationTimezone: 'America/New_York',
    });

    expect(resolution.timezone).toBe('America/New_York');
    expect(resolution.source).toBe('organization');
  });

  it('uses environment fallback when no context provided', () => {
    process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE = 'Europe/Paris';

    const resolution = resolveTimezone();

    expect(resolution.timezone).toBe('Europe/Paris');
    expect(resolution.source).toBe('environment');
  });

  it('falls back to UTC when legacy disabled and environment fallback cleared', () => {
    delete process.env.NEXT_PUBLIC_ORGANIZATION_TIMEZONE;
    delete process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE;
    delete process.env.NEXT_PUBLIC_TZ;
    delete process.env.TZ;

    const resolution = resolveTimezone({}, { allowLegacy: false });

    expect(resolution.timezone).toBe(UTC_TIMEZONE);
    expect(resolution.source).toBe('default');
  });

  it('formats instants consistently with Intl for a resolved timezone', () => {
    const context: TimezoneContext = { locationTimezone: 'America/New_York' };
    const utcInstant = new Date('2024-01-01T13:00:00Z');

    const formatted = formatInResolvedTimezone(utcInstant, 'HH:mm', context);
    const expected = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    }).format(utcInstant);

    expect(formatted).toBe(expected);

    expect(formatInResolvedTimezone(utcInstant, 'HH:mm', context)).toBe(expected);
  });

  it('round-trips local wall time through UTC conversion', () => {
    const context: TimezoneContext = { locationTimezone: 'America/New_York' };
    const baseLocal = '2024-01-01T08:15:00';

    const utcInstant = toUTC(baseLocal, context);
    const roundTrip = formatInResolvedTimezone(toLocalTime(utcInstant, context), 'HH:mm', context);
    const baseline = formatInResolvedTimezone(baseLocal, 'HH:mm', context);

    expect(roundTrip).toBe(baseline);
  });

  it('exposes helper for building legacy context', () => {
    const legacyContext = buildLegacyTimezoneContext();
    expect(legacyContext.fallbackTimezone).toBe(LEGACY_TIMEZONE);
    expect(legacyContext.preferLegacyFallback).toBe(true);
  });

  it('formatAppointmentWindow returns timezone-aware labels', () => {
    const context: TimezoneContext = { locationTimezone: 'Europe/Riga' };
    const window = formatAppointmentWindow('2024-06-01', '09:00', 60, context);
    const baselineStart = formatInResolvedTimezone('2024-06-01T09:00:00', TIME_FMT, context);
    const baselineEnd = formatInResolvedTimezone('2024-06-01T10:00:00', TIME_FMT, context);

    expect(window.startLocal).toBe(baselineStart);
    expect(window.endLocal).toBe(baselineEnd);
    expect(window.timezone.timezone).toBe('Europe/Riga');
  });

  it('legacy formatting remains stable for Dubai context', () => {
    const sampleDate = new Date('2024-05-01T12:30:00Z');
    expect(formatDubaiDate(sampleDate)).toBe('01/05/2024');
  });

  it('toLocal alias respects provided context', () => {
    const context: TimezoneContext = { locationTimezone: 'Europe/London' };
    const baseInstant = new Date('2024-07-01T12:00:00Z');
    const localDate = toLocal(baseInstant, context);

    expect(localDate).toBeInstanceOf(Date);
    expect(Number.isNaN(localDate.getTime())).toBe(false);
    expect(resolveTimezone(context).timezone).toBe('Europe/London');
  });
});
