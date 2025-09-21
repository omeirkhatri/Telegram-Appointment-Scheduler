import { getServiceRoleClient } from '@/lib/supabase';
import { timezoneMonitoringService } from '@/services/timezoneMonitoringService';

export interface TimezoneMonitoringJobOptions {
  /** ISO timestamp or Date to start scanning from (default: 24h ago) */
  since?: string | Date;
  /** Maximum number of audit events to process */
  limit?: number;
  /** When true, skip emitting performance metrics */
  dryRun?: boolean;
}

export interface TimezoneMonitoringSummary {
  totalEvents: number;
  byEntity: Record<string, number>;
  lastEventAt?: string;
}

function toIsoString(value?: string | Date): string {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value provided to timezone monitoring job: ${value}`);
  }

  return parsed.toISOString();
}

export async function runTimezoneMonitoringJob(
  options: TimezoneMonitoringJobOptions = {},
): Promise<TimezoneMonitoringSummary> {
  const client = getServiceRoleClient();
  const cutoff = options.since
    ? toIsoString(options.since)
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    let query = client
      .from('timezone_change_audit')
      .select('id, entity_type, entity_id, previous_timezone, new_timezone, changed_at, changed_by, metadata')
      .gte('changed_at', cutoff)
      .order('changed_at', { ascending: true });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        console.warn('[timezone-monitoring-job] timezone_change_audit table not found, skipping run');
        return { totalEvents: 0, byEntity: {} };
      }

      throw error;
    }

    const events = data ?? [];
    const summary: TimezoneMonitoringSummary = {
      totalEvents: events.length,
      byEntity: {},
      lastEventAt: events.length > 0 ? events[events.length - 1].changed_at : undefined,
    };

    for (const event of events) {
      const entityType = event.entity_type === 'organization' ? 'organization' : 'location';
      summary.byEntity[entityType] = (summary.byEntity[entityType] ?? 0) + 1;

      timezoneMonitoringService.recordTimezoneChange({
        id: event.id,
        entityType,
        entityId: event.entity_id,
        previousTimezone: event.previous_timezone,
        newTimezone: event.new_timezone,
        changedAt: event.changed_at,
        changedBy: event.changed_by,
        metadata: event.metadata,
      });
    }

    if (!options.dryRun) {
      timezoneMonitoringService.recordBackfillSummary({
        processed: events.length,
        updated: events.length,
        skipped: 0,
        fallbackUsed: 0,
        legacyUsed: 0,
        durationMs: 0,
        dryRun: false,
        generatedAt: new Date().toISOString(),
      });
    }

    return summary;
  } catch (error) {
    timezoneMonitoringService.recordResolverError(error, {
      stage: 'timezone-monitoring-job',
    });
    throw error;
  }
}
