-- Task 1.1 & 1.2: introduce transportation segment enums, table, and security

-- Create segment type enum
CREATE TYPE transportation_segment_type_enum AS ENUM (
  'pickup',
  'dropoff',
  'stay_with_staff',
  'metro_assist',
  'custom'
);

-- Create segment status enum
CREATE TYPE transportation_segment_status_enum AS ENUM (
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

-- Create transportation_segments table
CREATE TABLE transportation_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    segment_type transportation_segment_type_enum NOT NULL,
    title TEXT,
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    driver_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    travel_mode TEXT,
    origin JSONB,
    destination JSONB,
    estimated_travel_minutes INTEGER,
    estimated_distance_km NUMERIC(6, 2),
    buffer_minutes INTEGER DEFAULT 0,
    instructions TEXT,
    requires_follow_up BOOLEAN DEFAULT false,
    status transportation_segment_status_enum NOT NULL DEFAULT 'draft',
    manual_override BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT transportation_segments_time_check CHECK (
        planned_start IS NULL
        OR planned_end IS NULL
        OR planned_end >= planned_start
    ),
    CONSTRAINT transportation_segments_travel_minutes_check CHECK (
        estimated_travel_minutes IS NULL OR estimated_travel_minutes >= 0
    ),
    CONSTRAINT transportation_segments_distance_check CHECK (
        estimated_distance_km IS NULL OR estimated_distance_km >= 0
    ),
    CONSTRAINT transportation_segments_buffer_check CHECK (
        buffer_minutes >= 0
    )
);

-- Indexes for common lookups
CREATE INDEX idx_transportation_segments_appointment_id ON transportation_segments(appointment_id);
CREATE INDEX idx_transportation_segments_driver_id ON transportation_segments(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_transportation_segments_planned_start ON transportation_segments(planned_start) WHERE planned_start IS NOT NULL;
CREATE INDEX idx_transportation_segments_planned_end ON transportation_segments(planned_end) WHERE planned_end IS NOT NULL;
CREATE INDEX idx_transportation_segments_status ON transportation_segments(status);

-- Maintain updated_at column
CREATE TRIGGER update_transportation_segments_updated_at
    BEFORE UPDATE ON transportation_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security mirroring appointments
ALTER TABLE transportation_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON transportation_segments
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON transportation_segments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON transportation_segments
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON transportation_segments
    FOR DELETE USING (true);

-- Down Migration
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON transportation_segments;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON transportation_segments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON transportation_segments;
DROP POLICY IF EXISTS "Enable read access for all users" ON transportation_segments;
DROP TRIGGER IF EXISTS update_transportation_segments_updated_at ON transportation_segments;
DROP TABLE IF EXISTS transportation_segments;
DROP TYPE IF EXISTS transportation_segment_status_enum;
DROP TYPE IF EXISTS transportation_segment_type_enum;
