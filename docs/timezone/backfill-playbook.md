# Timezone Metadata Backfill Playbook

The timezone backfill tooling populates `custom_fields.timezone_metadata` for legacy appointments so downstream systems can rely on resolver-aware payloads. The script operates in dry-run mode by default and generates a JSON report with proposed changes.

## Prerequisites

- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be present in the environment.
- Node.js 18+ (matching the project runtime) and repository dependencies installed.
- Service-role access to the new `organization_settings`, `locations`, and `timezone_change_audit` tables.

## Running the Script

```bash
# Dry-run (default) – produces a report without mutating data
node scripts/timezone-backfill.js --limit 500

# Execute updates for all records
node scripts/timezone-backfill.js --execute

# Custom batch size, organization scope, and report location
node scripts/timezone-backfill.js --execute --batch-size 100 --organization primary --output ./reports/timezone/run.json
```

### CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--execute` | Apply updates instead of dry-run | false |
| `--batch-size` | Page size when reading appointments | 200 |
| `--limit` | Process only the first _n_ appointments (useful for smoke tests) | unlimited |
| `--organization` | Override organization identifier fallback | `primary` |
| `--output` | Write report to a specific path | `reports/timezone/timezone-backfill-report-<timestamp>.json` |

## What the Script Does

1. Loads appointments in batches; attempts to resolve timezone context using explicit overrides, location defaults, organization defaults, and environment fallbacks.
2. Builds `timezone_metadata` with effective timezone, offset, resolution path, and derived local-time window.
3. Skips records that already contain matching metadata.
4. In dry-run mode, outputs proposed updates; when `--execute` is set, updates `custom_fields.timezone_metadata` selectively.
5. Emits a JSON report summarizing counts (processed, updated, skipped, fallback usage, legacy usage) and per-record actions.

## Sample Report Snippet

```json
{
  "meta": {
    "generated_at": "2025-09-24T07:15:23.512Z",
    "dry_run": true,
    "summary": {
      "processed": 1250,
      "updated": 1250,
      "skipped": 0,
      "fallbackUsed": 317,
      "legacyUsed": 42,
      "missingLocation": 88,
      "missingOrganization": 0,
      "errors": [],
      "durationMs": 2150,
      "dryRun": true
    }
  },
  "entries": [
    {
      "appointment_id": "apt-123",
      "action": "would-update",
      "timezone": "Europe/London",
      "source": "location",
      "fallback_used": false,
      "legacy_used": false,
      "previous": null,
      "next": {
        "generated_at": "2025-09-24T07:15:23.512Z",
        "resolution": {
          "timezone": "Europe/London",
          "source": "location",
          "offset_minutes": 60,
          "abbreviation": "BST",
          "reference": "2025-09-24T00:00:00.000Z",
          "resolution_path": [
            { "candidate": "Europe/London", "source": "location" },
            { "candidate": "Asia/Dubai", "source": "environment" },
            { "candidate": "Asia/Dubai", "source": "legacy" }
          ]
        },
        "local_time": {
          "appointment_date": "2025-09-24",
          "start_time": "09:00",
          "end_time": "10:00"
        }
      }
    }
  ]
}
```

## Operational Recommendations

- Always run a dry-run first and review the generated report before applying changes.
- Use the `--limit` flag in staging to validate telemetry and Supabase quotas.
- Commit reports (or excerpts) as artefacts in rollout tickets for traceability.
- After execution, schedule the timezone monitoring job (see below) to ensure dashboards capture the backfill run.

## Follow-up Monitoring

Run the timezone monitoring job to surface change events and verify audit tables:

```bash
node -r ts-node/register src/jobs/timezoneMonitoringJob.ts
```

Alternatively, invoke `runTimezoneMonitoringJob()` from within integration tests or background workers to push metrics into the observability pipeline.
