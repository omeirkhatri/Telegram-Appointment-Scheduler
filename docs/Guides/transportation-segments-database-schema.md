# Transportation Segments Database Schema

## Overview

This document describes the database schema for the Transportation Segments feature, including the updated field names and new pickup location type system.

## Table: transportation_segments

### Schema Definition

```sql
CREATE TABLE transportation_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  segment_type VARCHAR(20) NOT NULL CHECK (segment_type IN ('pickup', 'dropoff', 'stay_with_staff', 'metro_assist', 'custom')),
  title VARCHAR(255),
  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,
  driver_id UUID REFERENCES staff(id),
  travel_mode VARCHAR(20) DEFAULT 'driving' CHECK (travel_mode IN ('driving', 'walking', 'transit', 'bicycling')),

  -- Updated field names (previously origin/destination)
  pickup_location JSONB NOT NULL,
  patient_location JSONB NOT NULL,

  -- New pickup location type system
  pickup_location_type VARCHAR(20) NOT NULL CHECK (pickup_location_type IN ('office', 'previous_appointment', 'metro_station', 'custom')),
  pickup_location_reference UUID,

  -- Travel information
  estimated_travel_minutes INTEGER CHECK (estimated_travel_minutes >= 0 AND estimated_travel_minutes <= 1440),
  estimated_distance_km DECIMAL(10,2) CHECK (estimated_distance_km >= 0 AND estimated_distance_km <= 10000),
  buffer_minutes INTEGER DEFAULT 20 CHECK (buffer_minutes >= 0 AND buffer_minutes <= 360),

  -- Additional fields
  instructions TEXT,
  requires_follow_up BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  manual_override BOOLEAN DEFAULT false,
  google_event_id VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Field Descriptions

#### Core Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUID | Primary key | Auto-generated |
| `appointment_id` | UUID | Reference to appointment | Required, foreign key |
| `segment_type` | VARCHAR(20) | Type of transportation segment | Required, enum values |
| `title` | VARCHAR(255) | Human-readable title | Optional |
| `planned_start` | TIMESTAMPTZ | Planned start time | Optional |
| `planned_end` | TIMESTAMPTZ | Planned end time | Optional |
| `driver_id` | UUID | Assigned driver | Optional, foreign key |

#### Location Fields (Updated)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `pickup_location` | JSONB | Location where driver picks up patient | Required, valid coordinates |
| `patient_location` | JSONB | Location where patient is going | Required, valid coordinates |

#### Pickup Location Type System (New)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `pickup_location_type` | VARCHAR(20) | Type of pickup location | Required, enum values |
| `pickup_location_reference` | UUID | Reference ID for specific pickup types | Conditional |

#### Travel Information

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `estimated_travel_minutes` | INTEGER | Estimated travel time in minutes | 0-1440 (0-24 hours) |
| `estimated_distance_km` | DECIMAL(10,2) | Estimated distance in kilometers | 0-10000 km |
| `buffer_minutes` | INTEGER | Buffer time in minutes | 0-360 (0-6 hours) |

#### Additional Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `instructions` | TEXT | Special instructions | Optional |
| `requires_follow_up` | BOOLEAN | Whether follow-up is required | Default false |
| `status` | VARCHAR(20) | Current status | Default 'draft' |
| `manual_override` | BOOLEAN | Whether manually overridden | Default false |
| `google_event_id` | VARCHAR(255) | Google Calendar event ID | Optional |

### Location Object Structure

#### pickup_location and patient_location JSONB Structure

```json
{
  "lat": 40.7128,
  "lng": -74.0060,
  "address": "123 Main St, New York, NY",
  "landmark": "Central Park",
  "place_id": "ChIJ...",
  "formatted_address": "123 Main St, New York, NY 10001, USA",
  "city": "New York",
  "area": "Manhattan",
  "building_name": "Empire State Building"
}
```

**Required Fields**:
- `lat`: Latitude coordinate (-90 to 90)
- `lng`: Longitude coordinate (-180 to 180)
- `address`: Human-readable address

**Optional Fields**:
- `landmark`: Nearby landmark for reference
- `place_id`: Google Places API place ID
- `formatted_address`: Fully formatted address
- `city`: City name
- `area`: Area or district name
- `building_name`: Specific building name

### Pickup Location Types

#### 1. Office (`office`)
- **Description**: Pickup from main office location
- **pickup_location_reference**: NULL
- **pickup_location**: Uses configured office address
- **Validation**: Office address must be configured in system settings

#### 2. Previous Appointment (`previous_appointment`)
- **Description**: Pickup from previous appointment's patient location
- **pickup_location_reference**: UUID of previous appointment
- **pickup_location**: Copied from previous appointment's patient_location
- **Validation**: Previous appointment must exist and have a patient_location

#### 3. Metro Station (`metro_station`)
- **Description**: Pickup from designated metro station
- **pickup_location_reference**: UUID of metro station
- **pickup_location**: Uses metro station address
- **Validation**: Metro station must exist and be active

#### 4. Custom Location (`custom`)
- **Description**: Pickup from any custom address
- **pickup_location_reference**: NULL
- **pickup_location**: User-provided address
- **Validation**: Address must be geocodable

## Indexes

### Performance Indexes

```sql
-- Primary lookup indexes
CREATE INDEX idx_transportation_segments_appointment_id ON transportation_segments(appointment_id);
CREATE INDEX idx_transportation_segments_driver_id ON transportation_segments(driver_id);
CREATE INDEX idx_transportation_segments_status ON transportation_segments(status);

-- Time-based indexes
CREATE INDEX idx_transportation_segments_planned_start ON transportation_segments(planned_start);
CREATE INDEX idx_transportation_segments_planned_end ON transportation_segments(planned_end);

-- Pickup location type index
CREATE INDEX idx_transportation_segments_pickup_location_type ON transportation_segments(pickup_location_type);

-- Composite indexes for common queries
CREATE INDEX idx_transportation_segments_driver_status ON transportation_segments(driver_id, status);
CREATE INDEX idx_transportation_segments_appointment_status ON transportation_segments(appointment_id, status);
CREATE INDEX idx_transportation_segments_pickup_type_reference ON transportation_segments(pickup_location_type, pickup_location_reference);
```

### Geospatial Indexes

```sql
-- Geospatial indexes for location queries
CREATE INDEX idx_transportation_segments_pickup_location_gist ON transportation_segments USING GIST (
  ST_Point(
    (pickup_location->>'lng')::float,
    (pickup_location->>'lat')::float
  )
);

CREATE INDEX idx_transportation_segments_patient_location_gist ON transportation_segments USING GIST (
  ST_Point(
    (patient_location->>'lng')::float,
    (patient_location->>'lat')::float
  )
);
```

## Constraints and Validation

### Check Constraints

```sql
-- Segment type validation
ALTER TABLE transportation_segments ADD CONSTRAINT chk_segment_type
CHECK (segment_type IN ('pickup', 'dropoff', 'stay_with_staff', 'metro_assist', 'custom'));

-- Pickup location type validation
ALTER TABLE transportation_segments ADD CONSTRAINT chk_pickup_location_type
CHECK (pickup_location_type IN ('office', 'previous_appointment', 'metro_station', 'custom'));

-- Travel mode validation
ALTER TABLE transportation_segments ADD CONSTRAINT chk_travel_mode
CHECK (travel_mode IN ('driving', 'walking', 'transit', 'bicycling'));

-- Status validation
ALTER TABLE transportation_segments ADD CONSTRAINT chk_status
CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled'));

-- Time validation
ALTER TABLE transportation_segments ADD CONSTRAINT chk_planned_times
CHECK (planned_end IS NULL OR planned_start IS NULL OR planned_end > planned_start);

-- Travel time validation
ALTER TABLE transportation_segments ADD CONSTRAINT chk_travel_time
CHECK (estimated_travel_minutes IS NULL OR (estimated_travel_minutes >= 0 AND estimated_travel_minutes <= 1440));

-- Distance validation
ALTER TABLE transportation_segments ADD CONSTRAINT chk_distance
CHECK (estimated_distance_km IS NULL OR (estimated_distance_km >= 0 AND estimated_distance_km <= 10000));

-- Buffer time validation
ALTER TABLE transportation_segments ADD CONSTRAINT chk_buffer_time
CHECK (buffer_minutes IS NULL OR (buffer_minutes >= 0 AND buffer_minutes <= 360));
```

### Foreign Key Constraints

```sql
-- Appointment reference
ALTER TABLE transportation_segments ADD CONSTRAINT fk_transportation_segments_appointment
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

-- Driver reference
ALTER TABLE transportation_segments ADD CONSTRAINT fk_transportation_segments_driver
FOREIGN KEY (driver_id) REFERENCES staff(id) ON DELETE SET NULL;

-- Previous appointment reference (for pickup_location_type = 'previous_appointment')
ALTER TABLE transportation_segments ADD CONSTRAINT fk_transportation_segments_previous_appointment
FOREIGN KEY (pickup_location_reference) REFERENCES appointments(id) ON DELETE SET NULL;

-- Metro station reference (for pickup_location_type = 'metro_station')
ALTER TABLE transportation_segments ADD CONSTRAINT fk_transportation_segments_metro_station
FOREIGN KEY (pickup_location_reference) REFERENCES metro_stations(id) ON DELETE SET NULL;
```

## Related Tables

### metro_stations

```sql
CREATE TABLE metro_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### staff

```sql
-- Reference table for drivers
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  staff_type VARCHAR(50) NOT NULL,
  specialization VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Migration Scripts

### Rename Columns

```sql
-- Rename origin to pickup_location
ALTER TABLE transportation_segments RENAME COLUMN origin TO pickup_location;

-- Rename destination to patient_location
ALTER TABLE transportation_segments RENAME COLUMN destination TO patient_location;
```

### Add New Columns

```sql
-- Add pickup location type column
ALTER TABLE transportation_segments ADD COLUMN pickup_location_type VARCHAR(20);

-- Add pickup location reference column
ALTER TABLE transportation_segments ADD COLUMN pickup_location_reference UUID;

-- Add constraints
ALTER TABLE transportation_segments ADD CONSTRAINT chk_pickup_location_type
CHECK (pickup_location_type IN ('office', 'previous_appointment', 'metro_station', 'custom'));
```

### Data Migration

```sql
-- Set default pickup location type for existing records
UPDATE transportation_segments
SET pickup_location_type = 'custom'
WHERE pickup_location_type IS NULL;

-- Make pickup location type required
ALTER TABLE transportation_segments ALTER COLUMN pickup_location_type SET NOT NULL;
```

## Performance Considerations

### Query Optimization

1. **Use indexes for common queries**:
   - Filter by appointment_id
   - Filter by driver_id
   - Filter by status
   - Filter by pickup_location_type

2. **Avoid full table scans**:
   - Always include WHERE clauses
   - Use LIMIT for large result sets
   - Consider pagination for large datasets

3. **Optimize JSONB queries**:
   - Use GIN indexes for JSONB fields
   - Use specific JSONB operators
   - Consider denormalization for frequently accessed fields

### Maintenance

1. **Regular VACUUM and ANALYZE**:
   ```sql
   VACUUM ANALYZE transportation_segments;
   ```

2. **Monitor index usage**:
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE tablename = 'transportation_segments';
   ```

3. **Check for unused indexes**:
   ```sql
   SELECT schemaname, tablename, indexname
   FROM pg_stat_user_indexes
   WHERE tablename = 'transportation_segments' AND idx_scan = 0;
   ```

## Security Considerations

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE transportation_segments ENABLE ROW LEVEL SECURITY;

-- Policy for staff access
CREATE POLICY transportation_segments_staff_policy ON transportation_segments
  FOR ALL TO staff_role
  USING (true);

-- Policy for driver access (only their own segments)
CREATE POLICY transportation_segments_driver_policy ON transportation_segments
  FOR ALL TO driver_role
  USING (driver_id = current_user_id());
```

### Data Encryption

```sql
-- Encrypt sensitive location data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example of encrypted location storage
UPDATE transportation_segments
SET pickup_location = pgp_sym_encrypt(pickup_location::text, 'encryption_key')::jsonb
WHERE id = 'segment_id';
```

## Backup and Recovery

### Backup Strategy

```sql
-- Full table backup
pg_dump -t transportation_segments your_database > transportation_segments_backup.sql

-- Incremental backup (changes since last backup)
SELECT * FROM transportation_segments
WHERE updated_at > '2024-01-01 00:00:00';
```

### Recovery Procedures

```sql
-- Restore from backup
psql your_database < transportation_segments_backup.sql

-- Verify data integrity
SELECT COUNT(*) FROM transportation_segments;
SELECT COUNT(*) FROM transportation_segments WHERE pickup_location_type IS NULL;
```

---

*Last updated: [Current Date]*
*Version: 1.0*

