import type { TimezoneResolutionTelemetry } from '@/utils/timezone';
import { loggingService } from './loggingService';
import { performanceMonitoringService } from './performanceMonitoringService';

export interface TimezoneResolverErrorContext {
  stage?: string;
  candidates?: Array<{ candidate: string | null; source: string }>;
  strict?: boolean;
  requestId?: string;
}

export interface TimezoneChangeEvent {
  id: string;
  entityType: 'organization' | 'location';
  entityId: string;
  previousTimezone: string | null;
  newTimezone: string;
  changedAt: string;
  changedBy?: string | null;
  metadata?: Record<string, any> | null;
}

export interface TimezoneBackfillSummary {
  processed: number;
  updated: number;
  skipped: number;
  fallbackUsed: number;
  legacyUsed: number;
  durationMs: number;
  dryRun: boolean;
  generatedAt: string;
}

interface ResolutionCounters {
  total: number;
  fallback: number;
  legacy: number;
  errors: number;
  lastEventAt?: string;
}

class TimezoneMonitoringService {
  private counters: ResolutionCounters = {
    total: 0,
    fallback: 0,
    legacy: 0,
    errors: 0,
  };

  recordResolution(telemetry: TimezoneResolutionTelemetry): void {
    this.counters.total += 1;
    this.counters.lastEventAt = telemetry.timestamp;

    const fallbackUsed = telemetry.performance?.fallbackUsed
      ?? (telemetry.resolution.source !== 'explicit' && telemetry.resolution.source !== 'location');
    if (fallbackUsed) {
      this.counters.fallback += 1;
    }

    if (telemetry.resolution.source === 'legacy') {
      this.counters.legacy += 1;
    }

    // Write structured log for dashboards
    loggingService.debug('Timezone resolution telemetry captured', {
        component: 'timezone-resolver',
        metadata: {
          timezone: telemetry.resolution.timezone,
          source: telemetry.resolution.source,
          offsetMinutes: telemetry.resolution.offsetMinutes,
          fallbackUsed,
          cacheHit: telemetry.cacheHit,
          resolutionPathLength: telemetry.resolution.resolutionPath.length,
        },
    });

    // Emit metrics for monitoring pipelines
    performanceMonitoringService.recordMetric(
      'timezone_resolution_offset_minutes',
      Math.abs(telemetry.resolution.offsetMinutes),
      'minutes',
      {
          component: 'timezone-resolver',
          metadata: {
            timezone: telemetry.resolution.timezone,
            source: telemetry.resolution.source,
            fallbackUsed,
            cacheHit: telemetry.cacheHit,
          },
      },
      [
        `timezone:${telemetry.resolution.timezone}`,
        `source:${telemetry.resolution.source}`,
        `fallback:${fallbackUsed}`,
      ],
    );

    if (fallbackUsed) {
      performanceMonitoringService.recordMetric(
        'timezone_fallback_resolutions',
        1,
        'count',
        {
          component: 'timezone-resolver',
          metadata: {
            timezone: telemetry.resolution.timezone,
            resolutionPath: telemetry.resolution.resolutionPath,
          },
        },
        [`timezone:${telemetry.resolution.timezone}`],
      );
    }

    if (telemetry.resolution.source === 'legacy') {
      performanceMonitoringService.recordMetric(
        'timezone_legacy_resolutions',
        1,
        'count',
        {
          component: 'timezone-resolver',
          metadata: {
            resolutionPath: telemetry.resolution.resolutionPath,
          },
        },
        ['legacy:true'],
      );
    }
  }

  recordResolverError(error: unknown, context: TimezoneResolverErrorContext = {}): void {
    this.counters.errors += 1;

    const err = error instanceof Error ? error : new Error(String(error));

    loggingService.error('Timezone resolver error', err, {
      component: 'timezone-resolver',
      metadata: {
        stage: context.stage || 'resolveTimezone',
        candidates: context.candidates,
        strict: context.strict,
        requestId: context.requestId,
      },
    });

    performanceMonitoringService.recordMetric(
      'timezone_resolver_errors',
      1,
      'count',
      {
        component: 'timezone-resolver',
        metadata: {
          stage: context.stage || 'resolveTimezone',
          strict: context.strict,
        },
      },
      ['error:true'],
    );
  }

  recordTimezoneChange(event: TimezoneChangeEvent): void {
    loggingService.info('Timezone change captured', {
      component: 'timezone-change',
      metadata: {
        entityType: event.entityType,
        entityId: event.entityId,
        previousTimezone: event.previousTimezone,
        newTimezone: event.newTimezone,
        changedAt: event.changedAt,
        changedBy: event.changedBy,
      },
    });

    performanceMonitoringService.recordMetric(
      'timezone_change_events',
      1,
      'count',
      {
        component: 'timezone-change',
        metadata: {
          entityType: event.entityType,
          entityId: event.entityId,
          previousTimezone: event.previousTimezone,
          newTimezone: event.newTimezone,
        },
      },
      [`entity:${event.entityType}`],
    );
  }

  recordBackfillSummary(summary: TimezoneBackfillSummary): void {
    loggingService.info('Timezone backfill run', {
      component: 'timezone-backfill',
      metadata: summary,
    });

    performanceMonitoringService.recordMetric(
      'timezone_backfill_processed',
      summary.processed,
      'count',
      {
        component: 'timezone-backfill',
        metadata: {
          updated: summary.updated,
          skipped: summary.skipped,
          fallbackUsed: summary.fallbackUsed,
          legacyUsed: summary.legacyUsed,
          dryRun: summary.dryRun,
          durationMs: summary.durationMs,
        },
      },
      [`dryRun:${summary.dryRun}`],
    );
  }

  getCounters(): ResolutionCounters {
    return { ...this.counters };
  }

  resetCounters(): void {
    this.counters = {
      total: 0,
      fallback: 0,
      legacy: 0,
      errors: 0,
    };
  }
}

export const timezoneMonitoringService = new TimezoneMonitoringService();
