# API Consumer Migration Guide: Timezone Standardization

Date: 2025-09-24
Updated by: Codex (AI assistant)

## Overview

Best DOC scheduling APIs now expose timezone-aware payloads through a versioned contract. Existing consumers continue to receive the legacy format (API v1.0) by default, while partners that opt-in to API v1.1 can request rich timezone metadata. This guide explains how to adopt the enhanced contract safely, what data changes to expect, and how to validate integrations.

## Compatibility Snapshot

| Behaviour | Legacy (v1.0) – default | Enhanced (v1.1 + metadata opt-in) |
|-----------|-------------------------|-----------------------------------|
| Response envelope | `success`, `data`, `metadata.apiVersion`, `generatedAt` | Same fields plus `metadata.timezone` when requested |
| Appointment payload | Unchanged – UTC timestamps only | Adds `local_time` object with timezone, offset, and computed end time |
| CSV exports | Original columns | Adds `Timezone` + `Timezone Abbreviation` columns |
| Headers | No version header returned | `X-API-Version`, `X-Features`, and optional timezone headers |

Legacy integrations therefore require **no immediate changes**. Opt-in adopters must send both:

- `X-API-Version: 1.1` (or `version=1.1` query parameter)
- `X-Include-Timezone-Metadata: true` (or `include_timezone_metadata=true` query parameter)

If either flag is missing, the response falls back to v1.0 to preserve backwards compatibility.

## Opt-in Checklist

1. **Negotiate version** – send `X-API-Version: 1.1` with every request.
2. **Request metadata** – set `X-Include-Timezone-Metadata: true` or `include_timezone_metadata=true`.
3. **Provide context (optional)** – include `X-Timezone`, `X-Location-ID`, or `X-Organization-ID` to override the resolver.
4. **Handle headers** – read `X-API-Version`, `X-Features`, and timezone headers from responses for observability.
5. **Parse metadata** – update response parsing to read the new structures shown below.

## Response Examples

### Appointments – Legacy (default v1.0)
```json
{
  "success": true,
  "data": [
    {
      "id": "appointment-123",
      "appointment_date": "2025-09-24",
      "start_time": "09:00",
      "duration_minutes": 60,
      "status": "scheduled"
    }
  ],
  "metadata": {
    "apiVersion": "1.0",
    "generatedAt": "2025-09-24T05:00:00.000Z"
  }
}
```

### Appointments – Enhanced (v1.1 + timezone metadata)
```json
{
  "success": true,
  "data": [
    {
      "id": "appointment-123",
      "appointment_date": "2025-09-24",
      "start_time": "09:00",
      "duration_minutes": 60,
      "status": "scheduled",
      "local_time": {
        "appointment_date": "2025-09-24",
        "start_time": "13:00",
        "end_time": "14:00",
        "timezone": "Europe/London",
        "timezone_abbreviation": "BST",
        "offset_minutes": 60
      }
    }
  ],
  "metadata": {
    "apiVersion": "1.1",
    "generatedAt": "2025-09-24T05:00:00.000Z",
    "timezone": {
      "timezone": "Europe/London",
      "abbreviation": "BST",
      "offsetMinutes": 60,
      "source": "location",
      "resolutionPath": [
        { "candidate": "Europe/London", "source": "location" },
        { "candidate": "Asia/Dubai", "source": "legacy-fallback" }
      ]
    }
  }
}
```

### CSV Export – Enhanced Columns
```
ID,Date,Start Time,Duration (min),Type,Status,Timezone,Timezone Abbreviation
appointment-123,2025-09-24,09:00,60,doctor_on_call,scheduled,Europe/London,BST
```

## Timezone Metadata Schema

- `metadata.timezone` (only when metadata is requested)
  - `timezone`: Resolved IANA name (e.g. `Europe/London`)
  - `abbreviation`: Short display code (e.g. `BST`)
  - `offsetMinutes`: Numeric offset from UTC in minutes
  - `source`: Primary source (`explicit`, `location`, `organization`, `legacy-fallback`)
  - `resolutionPath`: Ordered list showing every candidate considered
- `data[].local_time`
  - `appointment_date`, `start_time`, `end_time`: Values converted into the resolved timezone
  - `timezone`, `timezone_abbreviation`, `offset_minutes`: Mirrors metadata for per-record clarity

## Behaviour Notes

- If a consumer requests timezone metadata but passes `X-API-Version: 1.0`, the API deliberately omits `metadata.timezone` and `local_time` to preserve schema compatibility.
- Unsupported versions (e.g. `2.0`) return `400` with a descriptive error and `supportedVersions` list.
- The resolver prefers explicit context from headers, then active location, then organization defaults, and finally the legacy Dubai fallback.

## Migration Workflow

1. **Audit** existing integrations to find code that assumes `Asia/Dubai`.
2. **Feature flag** new parsing logic so you can dual-run legacy and enhanced paths.
3. **Update clients** to read `metadata.timezone` and `data[].local_time`.
4. **Validate** using staging data across `Asia/Dubai`, `Europe/London`, and `America/New_York`.
5. **Roll out gradually**, monitoring `X-Features` headers and API logs for errors.
6. **Remove legacy assumptions** once all consumers rely on resolver metadata.

## Testing Recommendations

- **Unit tests**: ensure appointment parsing gracefully handles responses with and without `local_time`.
- **Integration tests**: call APIs twice – once with v1.0 defaults, once with v1.1 metadata – and snapshot both payloads.
- **Regression tests**: validate midnight crossings and DST transitions using resolver-aware fixtures.

## Rollback Plan

1. Stop sending `X-API-Version` and `X-Include-Timezone-Metadata` headers to revert to v1.0 payloads.
2. Remove parsing logic for `metadata.timezone` and `local_time` if emergency rollback is required.
3. Monitor downstream services for mismatched timezone displays during rollback.

## Support

- Implementation details: [Timezone Resolver Guide](./resolver-guide.md)
- Endpoint specifics: [API Endpoint Changes](./api-endpoint-changes.md)
- Questions: reach out to the platform team via #scheduler-integrations

## Changelog

- **2025-09-24**: Updated for API v1.1 rollout with opt-in timezone metadata.
- **2025-09-20**: Initial draft covering planned timezone standardization.
