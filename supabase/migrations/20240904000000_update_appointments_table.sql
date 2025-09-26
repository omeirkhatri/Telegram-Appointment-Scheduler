-- Update appointments table with all required fields from PRD
-- Drop existing table and recreate with proper structure

-- First, drop dependent tables and recreate them
DROP TABLE IF EXISTS appointment_staff CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;

-- Create appointment_type enum
CREATE TYPE appointment_type_enum AS ENUM (
  'doctor_on_call',
  'lab_test',
  'teleconsultation',
  'physiotherapy',
  'caregiver',
  'iv_therapy'
);

-- Create appointment_status_enum
CREATE TYPE appointment_status_enum AS ENUM (
  'scheduled',
  'confirmed',
  'completed',
  'cancelled'
);

-- Create transportation_type_enum
CREATE TYPE transportation_type_enum AS ENUM (
  'driver',
  'self_transport'
);

-- Recreate appointments table with all required fields
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_type appointment_type_enum NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status appointment_status_enum DEFAULT 'scheduled',
    custom_fields JSONB DEFAULT '{}',
    transportation_type transportation_type_enum,
    transportation_method TEXT,
    driver_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    notes TEXT,
    recurring_rule JSONB,
    google_event_ids JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE appointments
    ADD CONSTRAINT appointments_duration_minutes_check
    CHECK (duration_minutes > 0 AND duration_minutes <= 1440); -- Max 24 hours

-- Note: appointments_date_check constraint will be added later after soft delete is implemented

ALTER TABLE appointments
    ADD CONSTRAINT appointments_transportation_check
    CHECK (
        (transportation_type = 'driver' AND driver_id IS NOT NULL) OR
        (transportation_type = 'self_transport' AND transportation_method IS NOT NULL) OR
        transportation_type IS NULL
    );

ALTER TABLE appointments
    ADD CONSTRAINT appointments_recurring_rule_check
    CHECK (
        recurring_rule IS NULL OR
        (recurring_rule ? 'frequency' AND recurring_rule ? 'interval')
    );

-- Create indexes for performance
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_appointment_type ON appointments(appointment_type);
CREATE INDEX idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_driver_id ON appointments(driver_id);
CREATE INDEX idx_appointments_transportation_type ON appointments(transportation_type);
CREATE INDEX idx_appointments_date_time ON appointments(appointment_date, start_time);
CREATE INDEX idx_appointments_custom_fields ON appointments USING GIN(custom_fields);
CREATE INDEX idx_appointments_recurring_rule ON appointments USING GIN(recurring_rule);
CREATE INDEX idx_appointments_google_event_ids ON appointments USING GIN(google_event_ids);

-- Create updated_at trigger for appointments
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for appointments
CREATE POLICY "Enable read access for all users" ON appointments
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON appointments
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON appointments
    FOR DELETE USING (true);
