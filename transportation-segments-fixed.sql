-- Transportation Segments Migration (Fixed Syntax)
-- Run this in Supabase Studio SQL Editor

-- Create transportation segment type enum
DO $$ BEGIN
    CREATE TYPE transportation_segment_type_enum AS ENUM (
        'pickup',
        'dropoff',
        'stay_with_staff',
        'metro_assist',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create transportation segment status enum
DO $$ BEGIN
    CREATE TYPE transportation_segment_status_enum AS ENUM (
        'draft',
        'scheduled',
        'in_progress',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create transportation segments table
CREATE TABLE IF NOT EXISTS transportation_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    segment_type transportation_segment_type_enum NOT NULL,
    title TEXT,
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    driver_id UUID REFERENCES staff(id),
    travel_mode TEXT,
    origin JSONB,
    destination JSONB,
    estimated_travel_minutes INTEGER,
    estimated_distance_km NUMERIC(6,2),
    buffer_minutes INTEGER,
    instructions TEXT,
    requires_follow_up BOOLEAN DEFAULT false,
    status transportation_segment_status_enum DEFAULT 'draft',
    manual_override BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transportation_segments_appointment_id ON transportation_segments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transportation_segments_driver_id ON transportation_segments(driver_id);
CREATE INDEX IF NOT EXISTS idx_transportation_segments_planned_start ON transportation_segments(planned_start);
CREATE INDEX IF NOT EXISTS idx_transportation_segments_planned_end ON transportation_segments(planned_end);
CREATE INDEX IF NOT EXISTS idx_transportation_segments_status ON transportation_segments(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_transportation_segments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS transportation_segments_updated_at_trigger
    BEFORE UPDATE ON transportation_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_transportation_segments_updated_at();
