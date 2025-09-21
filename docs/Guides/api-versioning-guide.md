# API Versioning and Timezone Support Guide

## Overview

The Best DOC Appointment Scheduler API now supports versioned responses with timezone metadata. This guide explains how to use the new features while maintaining backward compatibility.

## API Versions

### Supported Versions
- **v1.0** (Legacy): Original API format without timezone metadata
- **v1.1** (Current): Enhanced API with timezone support and metadata

### Version Detection
The API automatically detects the requested version through:
1. **Headers** (preferred): `X-API-Version` or `API-Version`
2. **Query Parameters**: `version` or `api_version`

## Timezone Support

### Timezone Context
The resolver evaluates timezone candidates in the following order:
1. **Explicit timezone** supplied via headers or query parameters (`X-Timezone`, `timezone`).
2. **Location timezone** loaded from the active clinic/location identifier.
3. **Organization timezone** derived from organization settings.
4. **Legacy fallback** to `Asia/Dubai` when no other context is available.

### Timezone Metadata
Timezone metadata is only included when the client:
- Negotiates **API v1.1** (`X-API-Version: 1.1` or `version=1.1`).
- Requests metadata via **`X-Include-Timezone-Metadata: true`** (or `include_timezone_metadata=true`).

When these flags are present, responses include:
- Resolved timezone information under `metadata.timezone`.
- Local time projections for appointments under `data[].local_time`.
- Timezone offset, abbreviation, and full resolution path for auditing.

## Request Headers

### Version Headers
```
X-API-Version: 1.1
API-Version: 1.1
```

### Timezone Headers
```
X-Timezone: Asia/Dubai
X-Location-ID: location-123
X-Organization-ID: org-456
X-Include-Timezone-Metadata: true
```

## Query Parameters

### Version Parameters
```
?version=1.1
?api_version=1.1
```

### Timezone Parameters
```
?timezone=Asia/Dubai
?location_id=location-123
?organization_id=org-456
?include_timezone_metadata=true
```

## Opt-in Flow

1. Send `X-API-Version: 1.1` (or `version=1.1`).
2. Request metadata with `X-Include-Timezone-Metadata: true` (or `include_timezone_metadata=true`).
3. Optionally provide resolver hints via `X-Timezone`, `X-Location-ID`, or `X-Organization-ID`.
4. Inspect `X-API-Version`, `X-Features`, and timezone headers to confirm negotiation.

If either the version header or metadata flag is missing, the API returns the legacy v1.0 shape without timezone metadata.

## Response Format

### Version 1.0 (Legacy)
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "apiVersion": "1.0",
    "generatedAt": "2025-01-21T10:30:00.000Z"
  }
}
```

### Version 1.1 (Enhanced)
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "timezone": {
      "timezone": "Asia/Dubai",
      "source": "legacy",
      "offsetMinutes": 240,
      "abbreviation": "GST",
      "referenceDate": "2025-01-21T10:30:00.000Z",
      "resolutionPath": [
        { "candidate": "Asia/Dubai", "source": "legacy" }
      ]
    },
    "apiVersion": "1.1",
    "generatedAt": "2025-01-21T10:30:00.000Z"
  }
}
```

## Enhanced Appointment Format

### Timezone-Aware Appointments
When `include_timezone_metadata=true` is set, appointments include local time information:

```json
{
  "id": "appointment-123",
  "appointment_date": "2025-01-21",
  "start_time": "14:30",
  "duration_minutes": 60,
  "local_time": {
    "appointment_date": "2025-01-21",
    "start_time": "14:30",
    "end_time": "15:30",
    "timezone": "Asia/Dubai",
    "timezone_abbreviation": "GST",
    "offset_minutes": 240
  }
}
```

## Response Headers

### Version Headers
```
X-API-Version: 1.1
X-Features: timezone-metadata,versioned-responses,backward-compatibility
```

### Timezone Headers (when requested)
```
X-Timezone: Asia/Dubai
X-Timezone-Offset: 240
X-Timezone-Abbreviation: GST
```

## API Endpoints

### Version Information
- `GET /api/version` - Get API version and capabilities
- `POST /api/version/check` - Check if a specific version is supported

### Timezone Information
- `GET /api/timezone` - Get timezone information and resolution
- `POST /api/timezone/resolve` - Resolve timezone from context

### Enhanced Endpoints
All existing endpoints now support versioning and timezone metadata:
- `GET /api/appointments` - List appointments with timezone support
- `POST /api/appointments` - Create appointments with timezone context
- `GET /api/reports/statistics` - Statistics with timezone metadata
- `POST /api/reports/export` - Export reports with timezone information

## Migration Guide

### For API Consumers

#### Option 1: Continue with Legacy Format
No changes required. Continue using the API as before.

#### Option 2: Adopt Enhanced Format
1. Add version header: `X-API-Version: 1.1`
2. Add timezone metadata header: `X-Include-Timezone-Metadata: true`
3. Update response parsing to handle new metadata fields

### Example Migration

#### Before (v1.0)
```javascript
const response = await fetch('/api/appointments');
const data = await response.json();
// data.data contains appointments
```

#### After (v1.1)
```javascript
const response = await fetch('/api/appointments', {
  headers: {
    'X-API-Version': '1.1',
    'X-Include-Timezone-Metadata': 'true'
  }
});
const data = await response.json();
// data.data contains appointments with local_time fields
// data.metadata.timezone contains timezone information
```

## Error Handling

### Version Errors
```json
{
  "success": false,
  "error": "Unsupported API version: 2.0. Supported versions: 1.0, 1.1",
  "details": {
    "supportedVersions": ["1.0", "1.1"]
  },
  "metadata": {
    "apiVersion": "1.0",
    "generatedAt": "2025-01-21T10:30:00.000Z"
  }
}
```

### Timezone Errors
```json
{
  "success": false,
  "error": "Invalid timezone: Invalid/Timezone",
  "details": {
    "availableTimezones": ["Asia/Dubai", "Europe/London", ...]
  },
  "metadata": {
    "apiVersion": "1.1",
    "generatedAt": "2025-01-21T10:30:00.000Z"
  }
}
```

## Best Practices

1. **Always specify API version** in headers for consistency
2. **Use timezone metadata** when building time-sensitive applications
3. **Handle both legacy and enhanced formats** during transition periods
4. **Validate timezone strings** before sending requests
5. **Cache timezone resolution** results when possible

## Future Enhancements

- Per-user timezone preferences for staff and patients
- Automated partner capability discovery (self-describing version endpoints)
- Advanced timezone suggestion/auto-correction services
- SLA monitoring dashboards using resolver telemetry
