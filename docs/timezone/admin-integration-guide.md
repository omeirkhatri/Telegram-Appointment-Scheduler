# Timezone System Admin & Integration Guide

This comprehensive guide summarizes the new timezone system settings, inheritance rules, and rollout timeline for administrators and integration partners.

## Table of Contents

1. [System Overview](#system-overview)
2. [Timezone Hierarchy & Inheritance](#timezone-hierarchy--inheritance)
3. [Configuration Management](#configuration-management)
4. [API Integration Changes](#api-integration-changes)
5. [Rollout Timeline](#rollout-timeline)
6. [Migration Guide](#migration-guide)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
8. [Support Resources](#support-resources)

## System Overview

The timezone system has been completely redesigned to support:
- **Multi-location organizations** with per-location timezone overrides
- **Hierarchical timezone inheritance** from organization defaults
- **Comprehensive audit logging** for all timezone changes
- **Backward compatibility** with existing API consumers
- **Versioned API contracts** for gradual migration

### Key Components

- **Organization Settings**: Default timezone for the entire organization
- **Location Settings**: Per-location timezone overrides with inheritance tracking
- **Timezone Resolver**: Centralized logic for resolving effective timezones
- **Audit System**: Complete history of all timezone changes
- **API Versioning**: Backward-compatible endpoints with new timezone metadata

## Timezone Hierarchy & Inheritance

### 1. Organization Level (Default)

**Table**: `organization_settings`
- **Purpose**: Establishes the default timezone for the entire organization
- **Scope**: Applies to all locations unless overridden
- **Access**: Admin-only (service role required for writes)

```sql
-- Example organization setting
{
  "id": "primary",
  "display_name": "Best DOC Organization",
  "default_timezone": "Asia/Dubai",
  "metadata": {
    "country": "UAE",
    "region": "Dubai"
  }
}
```

### 2. Location Level (Override)

**Table**: `locations`
- **Purpose**: Per-location timezone overrides
- **Inheritance**: Falls back to organization default if not overridden
- **Tracking**: `timezone_source` field indicates inheritance status

```sql
-- Example location with override
{
  "id": "uuid-here",
  "slug": "dubai-main",
  "display_name": "Dubai Main Clinic",
  "timezone": "Asia/Dubai",
  "timezone_source": "inherited",  -- Matches org default
  "is_active": true
}

-- Example location with override
{
  "id": "uuid-here-2",
  "slug": "london-branch",
  "display_name": "London Branch",
  "timezone": "Europe/London",
  "timezone_source": "override",  -- Different from org default
  "is_active": true
}
```

### 3. Resolution Logic

The timezone resolver follows this hierarchy:

1. **Location Override**: If location has specific timezone, use it
2. **Organization Default**: If location inherits, use organization default
3. **System Fallback**: If both unavailable, fall back to environment default
4. **Legacy Fallback**: Final fallback to `Asia/Dubai` for backward compatibility

```typescript
// Resolution example
const timezone = resolveTimezone({
  organizationId: 'primary',
  locationId: 'london-branch'
});
// Returns: 'Europe/London' (location override)

const timezone2 = resolveTimezone({
  organizationId: 'primary',
  locationId: 'dubai-main'
});
// Returns: 'Asia/Dubai' (inherited from organization)
```

## Configuration Management

### Admin Interface

**Location**: `/settings` page
**Access**: Admin role required

#### Organization Settings
- **Default Timezone**: Set organization-wide default
- **Display Name**: Organization identifier
- **Metadata**: Additional organization information

#### Location Settings
- **Timezone Override**: Per-location timezone selection
- **Inheritance Status**: Visual indicator of inheritance
- **Location Details**: Address, coordinates, contact info

### API Configuration

**Endpoint**: `PUT /api/settings/organization`
**Endpoint**: `PUT /api/settings/locations/{id}`

```typescript
// Update organization timezone
const response = await fetch('/api/settings/organization', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    default_timezone: 'Europe/London',
    display_name: 'Best DOC Organization'
  })
});

// Update location timezone
const response = await fetch('/api/settings/locations/london-branch', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    timezone: 'Europe/London',
    display_name: 'London Branch'
  })
});
```

### Database Schema

#### Organization Settings
```sql
CREATE TABLE organization_settings (
  id text PRIMARY KEY DEFAULT 'primary',
  display_name text,
  default_timezone text NOT NULL CHECK (default_timezone = ANY (SELECT name FROM pg_timezone_names)),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
```

#### Locations
```sql
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text UNIQUE NOT NULL,
  display_name text NOT NULL,
  timezone text NOT NULL CHECK (timezone = ANY (SELECT name FROM pg_timezone_names)),
  timezone_source text NOT NULL CHECK (timezone_source IN ('inherited', 'override')),
  address text,
  coordinates jsonb,
  phone text,
  email text,
  icon text,
  color text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
```

#### Audit Logging
```sql
CREATE TABLE timezone_change_audit (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type text NOT NULL CHECK (entity_type IN ('organization', 'location')),
  entity_id text NOT NULL,
  previous_timezone text,
  new_timezone text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  change_reason text,
  metadata jsonb DEFAULT '{}'
);
```

## API Integration Changes

### Versioned Endpoints

All API endpoints now support version negotiation:

```http
GET /api/appointments
Accept: application/vnd.bestdoc.v1.1+json
X-API-Version: 1.1
```

### New Response Format

**Version 1.1** includes timezone metadata:

```json
{
  "appointments": [...],
  "timezone_metadata": {
    "organization_timezone": "Asia/Dubai",
    "location_timezone": "Europe/London",
    "effective_timezone": "Europe/London",
    "inheritance_status": "override",
    "resolution_source": "location"
  },
  "api_version": "1.1"
}
```

**Version 1.0** (legacy) maintains backward compatibility:

```json
{
  "appointments": [...]
}
```

### Updated Endpoints

#### Appointments API
- **GET /api/appointments**: Returns timezone metadata
- **POST /api/appointments**: Accepts timezone context
- **PUT /api/appointments/{id}**: Updates with timezone awareness

#### Reports API
- **GET /api/reports/export**: Includes timezone metadata in exports
- **GET /api/reports/statistics**: Timezone-aware statistics

#### Settings API
- **GET /api/settings/organization**: Organization timezone settings
- **PUT /api/settings/organization**: Update organization timezone
- **GET /api/settings/locations**: List all locations with timezone info
- **PUT /api/settings/locations/{id}**: Update location timezone

#### Telegram API
- **POST /api/telegram/webhook**: Timezone-aware responses

### Migration Headers

Use these headers to opt into new features:

```http
X-API-Version: 1.1
X-Include-Timezone-Metadata: true
X-Timezone-Context: {"organization_id": "primary", "location_id": "london-branch"}
```

## Rollout Timeline

### Phase 1: Internal Testing (Week 1)
- **Duration**: 1 week
- **Scope**: Internal team only
- **Features**: Full timezone system enabled
- **Success Criteria**: Error rate < 1%, no user complaints

### Phase 2: Limited External Rollout (Week 2)
- **Duration**: 1 week
- **Scope**: 10% of external users
- **Features**: Gradual feature flag rollout
- **Success Criteria**: Error rate < 2%, user satisfaction > 90%

### Phase 3: Gradual Rollout (Weeks 3-4)
- **Duration**: 2 weeks
- **Scope**: 50% of external users
- **Features**: Performance optimization
- **Success Criteria**: Error rate < 1.5%, user satisfaction > 95%

### Phase 4: Full Rollout (Week 5)
- **Duration**: 1 week
- **Scope**: 100% of users
- **Features**: Complete system activation
- **Success Criteria**: Error rate < 1%, user satisfaction > 95%

## Migration Guide

### For API Consumers

#### 1. Update API Calls
```typescript
// Before (v1.0)
const response = await fetch('/api/appointments');

// After (v1.1)
const response = await fetch('/api/appointments', {
  headers: {
    'Accept': 'application/vnd.bestdoc.v1.1+json',
    'X-API-Version': '1.1'
  }
});
```

#### 2. Handle Timezone Metadata
```typescript
// Parse timezone metadata
const data = await response.json();
const timezone = data.timezone_metadata?.effective_timezone || 'Asia/Dubai';

// Use for date formatting
const localDate = formatInTimezone(appointment.date, timezone);
```

#### 3. Update Date Parsing
```typescript
// Before: Hard-coded timezone
const date = new Date(appointment.date);
const localTime = date.toLocaleString('en-US', { timeZone: 'Asia/Dubai' });

// After: Dynamic timezone
const timezone = appointment.timezone_metadata?.effective_timezone || 'Asia/Dubai';
const localTime = date.toLocaleString('en-US', { timeZone: timezone });
```

### For Database Consumers

#### 1. Query New Tables
```sql
-- Get organization timezone
SELECT default_timezone FROM organization_settings WHERE id = 'primary';

-- Get location timezone
SELECT timezone, timezone_source FROM locations WHERE slug = 'london-branch';

-- Get timezone change history
SELECT * FROM timezone_change_audit 
WHERE entity_type = 'location' 
ORDER BY changed_at DESC;
```

#### 2. Update Application Logic
```typescript
// Before: Hard-coded timezone
const timezone = 'Asia/Dubai';

// After: Resolved timezone
const timezone = await resolveTimezone({
  organizationId: 'primary',
  locationId: locationId
});
```

## Monitoring & Troubleshooting

### Health Checks

#### 1. System Health
```bash
# Check timezone resolver health
curl -X GET /api/timezone/health

# Check monitoring dashboard
node scripts/timezone-monitoring-dashboard.js
```

#### 2. Data Integrity
```bash
# Validate timezone data
node scripts/comprehensive-timezone-backfill.js --mode validate

# Check audit logs
psql -c "SELECT COUNT(*) FROM timezone_change_audit WHERE changed_at > NOW() - INTERVAL '1 day';"
```

### Common Issues

#### 1. Timezone Resolution Failures
**Symptoms**: Appointments showing wrong times
**Causes**: Missing location data, invalid timezone strings
**Solutions**:
- Check location timezone configuration
- Verify IANA timezone names
- Review resolver logs

#### 2. API Version Mismatches
**Symptoms**: Missing timezone metadata
**Causes**: Using old API version
**Solutions**:
- Update API calls to v1.1
- Add version headers
- Check Accept headers

#### 3. Performance Issues
**Symptoms**: Slow response times
**Causes**: Resolver caching issues, database queries
**Solutions**:
- Clear resolver cache
- Optimize database queries
- Check monitoring dashboard

### Debugging Tools

#### 1. Resolver Debug Mode
```typescript
// Enable debug logging
process.env.TIMEZONE_DEBUG = 'true';

// Check resolver output
const artifacts = buildTimezoneArtifacts({
  organizationId: 'primary',
  locationId: 'london-branch'
});
console.log('Timezone artifacts:', artifacts);
```

#### 2. Database Queries
```sql
-- Check timezone inheritance
SELECT 
  l.slug,
  l.timezone as location_tz,
  l.timezone_source,
  o.default_timezone as org_tz
FROM locations l
CROSS JOIN organization_settings o
WHERE o.id = 'primary';

-- Check recent changes
SELECT 
  entity_type,
  entity_id,
  previous_timezone,
  new_timezone,
  changed_at,
  changed_by
FROM timezone_change_audit
ORDER BY changed_at DESC
LIMIT 10;
```

## Support Resources

### Documentation
- [Configuration Guide](configuration.md) - Detailed setup instructions
- [Resolver Guide](resolver-guide.md) - Developer integration guide
- [API Migration Guide](api-consumer-migration-guide.md) - API changes
- [Support Runbook](support-runbook.md) - Troubleshooting procedures

### Monitoring
- [Monitoring Dashboard](monitoring-dashboard-guide.md) - Real-time system health
- [Pilot Rollout Checklist](pilot-rollout-checklist.md) - Rollout procedures

### Tools
- **Backfill Script**: `scripts/comprehensive-timezone-backfill.js`
- **Monitoring Dashboard**: `scripts/timezone-monitoring-dashboard.js`
- **Health Checks**: `/api/timezone/health`

### Contact Information
- **Technical Support**: [Support Team Contact]
- **Emergency Escalation**: [Emergency Contact]
- **Documentation Issues**: [Documentation Team Contact]

---

**Last Updated**: 2025-01-24
**Version**: 1.0
**Next Review**: 2025-02-24
