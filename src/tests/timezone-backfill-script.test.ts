const {
  resolveTimezoneContext,
  buildTimezoneMetadata,
  computeEndTime,
  isValidTimezone,
} = require('../../scripts/timezone-backfill');

describe('timezone-backfill utilities', () => {
  const referenceDate = new Date('2025-09-24T08:00:00.000Z');

  it('prefers explicit timezone when valid', () => {
    const resolution = resolveTimezoneContext({
      explicitTimezone: 'Europe/London',
      locationTimezone: 'Asia/Dubai',
      organizationTimezone: 'America/New_York',
      environmentFallbacks: ['Asia/Dubai'],
      referenceDate,
    });

    expect(resolution.timezone).toBe('Europe/London');
    expect(resolution.source).toBe('explicit');
    expect(resolution.resolutionPath[0]).toEqual({ candidate: 'Europe/London', source: 'explicit' });
  });

  it('falls back to organization then legacy when explicit and location are missing', () => {
    const resolution = resolveTimezoneContext({
      locationTimezone: null,
      organizationTimezone: 'America/New_York',
      environmentFallbacks: [],
      referenceDate,
    });

    expect(resolution.timezone).toBe('America/New_York');
    expect(resolution.source).toBe('organization');
  });

  it('produces metadata with derived end time', () => {
    const resolution = resolveTimezoneContext({
      explicitTimezone: 'Europe/London',
      environmentFallbacks: ['Asia/Dubai'],
      referenceDate,
    });

    const metadata = buildTimezoneMetadata({
      id: 'apt-1',
      appointment_date: '2025-09-24',
      start_time: '09:15',
      duration_minutes: 45,
    } as any, resolution);

    expect(metadata.local_time).toEqual({
      appointment_date: '2025-09-24',
      start_time: '09:15',
      end_time: '10:00',
    });
    expect(metadata.resolution.timezone).toBe('Europe/London');
  });

  it('wraps end time across midnight', () => {
    expect(computeEndTime('23:30', 90)).toBe('01:00');
  });

  it('validates timezone identifiers', () => {
    expect(isValidTimezone('Asia/Dubai')).toBe(true);
    expect(isValidTimezone('Invalid/Timezone')).toBe(false);
  });
});
