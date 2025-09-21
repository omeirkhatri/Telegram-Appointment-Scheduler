import { runTimezoneMonitoringJob } from './timezoneMonitoringJob';
import { timezoneMonitoringService } from '@/services/timezoneMonitoringService';
import { getServiceRoleClient } from '@/lib/supabase';

jest.mock('@/services/timezoneMonitoringService', () => ({
  timezoneMonitoringService: {
    recordTimezoneChange: jest.fn(),
    recordBackfillSummary: jest.fn(),
    recordResolverError: jest.fn(),
  },
}));

type QueryResult = { data: any[]; error: any };

function createQuery(result: QueryResult) {
  const promise = Promise.resolve(result);
  return {
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn(() => Promise.resolve(result)),
    then: promise.then.bind(promise),
  };
}

const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getServiceRoleClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

describe('runTimezoneMonitoringJob', () => {
beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockReset();
});

  it('returns summary and records events', async () => {
    const events = [
      {
        id: 'evt-1',
        entity_type: 'location',
        entity_id: 'loc-1',
        previous_timezone: 'Asia/Dubai',
        new_timezone: 'Europe/London',
        changed_at: '2025-09-24T10:00:00.000Z',
        changed_by: 'user-1',
        metadata: { reason: 'pilot rollout' },
      },
    ];

    mockFrom.mockReturnValueOnce({
      select: jest.fn(() => createQuery({ data: events, error: null })),
    });

    const summary = await runTimezoneMonitoringJob({ since: '2025-09-23T00:00:00.000Z' });

    expect(summary.totalEvents).toBe(1);
    expect(summary.byEntity.location).toBe(1);
    expect(timezoneMonitoringService.recordTimezoneChange).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'location', entityId: 'loc-1' }),
    );
    expect(timezoneMonitoringService.recordBackfillSummary).toHaveBeenCalled();
    expect(getServiceRoleClient).toHaveBeenCalled();
  });

  it('handles missing audit table gracefully', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn(() => createQuery({ data: null, error: { code: '42P01', message: 'missing' } })),
    });

    const summary = await runTimezoneMonitoringJob();
    expect(summary.totalEvents).toBe(0);
    expect(timezoneMonitoringService.recordTimezoneChange).not.toHaveBeenCalled();
  });
});
