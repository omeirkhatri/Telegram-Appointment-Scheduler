# API Endpoint Changes: Timezone Standardization

Date: 2025-09-24
Updated by: Codex (AI assistant)

## Overview

All scheduling surfaces now share a resolver-driven timezone contract. Endpoint behaviour is version-aware: v1.0 payloads remain unchanged, while v1.1 responses include timezone metadata when explicitly requested. This document summarises what changed, how to opt in, and which payload elements were added.

## Quick Reference

| Endpoint | Methods | v1.0 (default) | v1.1 + `include_timezone_metadata=true` |
|----------|---------|----------------|-----------------------------------------|
| `/api/appointments` | GET, POST | Legacy schema | Adds `data[].local_time` and `metadata.timezone`; headers advertise features |
| `/api/reports/export` | POST | Original CSV columns | Adds `Timezone`, `Timezone Abbreviation`, resolver metadata in JSON |
| `/api/reports/statistics` | GET | Legacy counters | Adds timezone-aware aggregates & `metadata.timezone` |
| `/api/telegram/webhook` | POST | Legacy payloads | Includes timezone header hints and resolver context in responses |
| `/api/timezone` | GET | Returns resolved timezone | Adds version headers + resolver diagnostics |

All endpoints accept either headers or query parameters to negotiate versioning:

- Headers: `X-API-Version`, `X-Include-Timezone-Metadata`, `X-Timezone`, `X-Location-ID`, `X-Organization-ID`
- Query parameters: `version`, `include_timezone_metadata`, `timezone`, `location_id`, `organization_id`

If `X-API-Version` is omitted, the service defaults to `1.0`.

## Detailed Changes

### `/api/appointments`

**Enhanced response payload (v1.1 opt-in):**
```typescript
interface AppointmentResponse {
  // legacy fields ...
  local_time?: {
    appointment_date: string;
    start_time: string;
    end_time: string;
    timezone: string;
    timezone_abbreviation: string;
    offset_minutes: number;
  };
}
```

**Metadata envelope:**
```json
{
  "metadata": {
    "apiVersion": "1.1",
    "generatedAt": "2025-09-24T05:00:00.000Z",
    "timezone": {
      "timezone": "America/New_York",
      "abbreviation": "EDT",
      "offsetMinutes": -240,
      "source": "location",
      "resolutionPath": [
        { "candidate": "America/New_York", "source": "location" },
        { "candidate": "Asia/Dubai", "source": "legacy-fallback" }
      ]
    }
  }
}
```

**Headers:**
```
X-API-Version: 1.1
X-Features: timezone-metadata,versioned-responses,backward-compatibility
X-Timezone: America/New_York
X-Timezone-Offset: -240
X-Timezone-Abbreviation: EDT
```

**Validation:** Requests specifying unsupported versions (e.g. `2.0`) receive `400` with `supportedVersions` in the error payload.

### `/api/reports/export`

- CSV exports include `Timezone` and `Timezone Abbreviation` columns when metadata is requested.
- JSON exports attach `metadata.timezone`, mirroring the structure above.
- The endpoint honours explicit timezone overrides to rehydrate historical reports in alternate zones.

### `/api/reports/statistics`

- Summary cards now reflect the resolved timezone when metadata is requested.
- Response envelope includes `metadata.timezone` for auditing.
- Legacy consumers continue to receive the original counters without additional fields.

### `/api/telegram/webhook`

- Responses advertise version headers and resolver-derived timezone metadata when partners opt in.
- Telegram payloads incorporate timezone strings in agenda text to keep partner bots aligned.

### `/api/timezone`

- Returns resolver diagnostics (`resolutionPath`, `source`, offsets) under API v1.1.
- Provides version headers to callers so they can confirm the negotiated version.

## Request Samples

### Opting into v1.1 Metadata
```http
GET /api/appointments?include_timezone_metadata=true HTTP/1.1
Host: scheduler.bestdoc.test
X-API-Version: 1.1
X-Include-Timezone-Metadata: true
X-Location-ID: clinic-dubai
```

### Legacy Behaviour
```http
GET /api/appointments HTTP/1.1
Host: scheduler.bestdoc.test
# No version headers – response defaults to v1.0
```

## Migration Notes

- Local time blocks (`local_time`) are omitted whenever clients stay on v1.0 or decline metadata.
- CSV pipelines should detect the new timezone columns but remain resilient if they are absent.
- Logging and monitoring dashboards should track `X-API-Version` and `X-Features` to confirm partner adoption.

## Testing Guidance

1. Write regression tests that snapshot both the legacy and enhanced payloads.
2. Assert that enhanced responses contain `metadata.timezone`, `local_time`, and negotiated headers.
3. Confirm that setting `X-API-Version: 1.0` suppresses timezone metadata even if the query parameter is present.

## Changelog

- **2025-09-24**: Updated with version-negotiated behaviour and metadata schema.
- **2025-09-20**: Initial draft describing planned endpoint updates.
