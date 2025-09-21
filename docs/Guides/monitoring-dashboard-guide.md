# Timezone Monitoring & Dashboard Guide

## Overview

Timezone adoption is now observable via structured logging and performance metrics. This guide explains the emitted signals and how to wire dashboards/alerts around them.

## Telemetry Sources

| Metric | Source | Description |
|--------|--------|-------------|
| `timezone_resolution_offset_minutes` | `timezoneMonitoringService.recordResolution` | Offset (absolute minutes) for each resolver invocation; tagged by timezone and source |
| `timezone_fallback_resolutions` | same | Counter incremented whenever resolver falls back beyond explicit/location context |
| `timezone_legacy_resolutions` | same | Counter when the legacy Dubai fallback is used |
| `timezone_resolver_errors` | `timezoneMonitoringService.recordResolverError` | Counter for resolver failures (strict mode, invalid context) |
| `timezone_change_events` | `timezoneMonitoringService.recordTimezoneChange` | Count of organization/location updates from `timezone_change_audit` |
| `timezone_backfill_processed` | `timezoneMonitoringService.recordBackfillSummary` | High-level stats emitted by backfill/migration jobs |

Structured log entries carry `component` tags (`timezone-resolver`, `timezone-change`, `timezone-backfill`) to simplify log-based dashboards.

## Resolver Telemetry

The resolver emits telemetry (via `logTimezoneResolution`) whenever timezone calculations run. In non-production environments the data is printed to the console; in production you can enable the same output by setting `ENABLE_TIMEZONE_TELEMETRY=true` and streaming logs to your aggregator.

Example payload:

```json
{
  "type": "timezone_resolution",
  "resolution": {
    "timezone": "Europe/London",
    "source": "location",
    "offsetMinutes": 60,
    "resolutionPath": [
      { "candidate": "Europe/London", "source": "location" },
      { "candidate": "Asia/Dubai", "source": "legacy" }
    ]
  },
  "performance": {
    "cacheHit": false,
    "fallbackUsed": false,
    "legacyUsed": false
  }
}
```

## Monitoring Job

Run the job to ingest audit trail events and assert dashboards remain current:

```bash
node -r ts-node/register src/jobs/timezoneMonitoringJob.ts
```

Options (via `runTimezoneMonitoringJob()`):

- `since`: ISO timestamp (default: 24 hours ago).
- `limit`: Maximum number of audit events to process.
- `dryRun`: Skip emitting aggregated metrics (useful for unit tests).

The job records each event through `timezoneMonitoringService.recordTimezoneChange` and pushes a backfill summary for visibility.

## Alerting Suggestions

- **Legacy fallback spike**: alert when `timezone_legacy_resolutions` exceeds a threshold over rolling 15 minutes.
- **Resolver errors**: alert on any non-zero `timezone_resolver_errors` in production.
- **Change volume**: chart `timezone_change_events` by entity type to spot large rollouts.
- **Backfill audit**: watch `timezone_backfill_processed` for end-to-end migration runs.

## Integrating with Dashboards

1. Export metrics from the performance monitoring service (Supabase table) to your BI tool or APM.
2. Filter by tag prefixes (`timezone:`, `source:`) to build breakdowns.
3. Combine structured logs (component `timezone-*`) for situational awareness.
4. Overlay audit events when shipping new timezone overrides.

## Next Steps

- Automate `runTimezoneMonitoringJob` on a schedule (cron worker) to keep dashboards fresh.
- Extend alerts with thresholding on `fallbackUsedPercentage = fallback / total`.
- Enrich dashboards with backfill report artefacts to trace historical rollouts.
