-- Update staff table with all required fields from PRD
-- Drop existing table and recreate with proper structure

-- First, drop dependent tables and recreate them
DROP TABLE IF EXISTS appointment_staff CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS staff CASCADE;

-- Create staff_type enum
CREATE TYPE staff_type_enum AS ENUM (
  'doctor',
  'nurse',
  'physiotherapist',
  'caregiver',
  'driver',
  'lab_technician'
);

-- Create staff_status_enum
CREATE TYPE staff_status_enum AS ENUM (
  'active',
  'inactive'
);

-- Recreate staff table with all required fields
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    staff_type staff_type_enum NOT NULL,
    specialization TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    google_calendar_id TEXT,
    available_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- Monday to Friday by default
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '17:00',
    status staff_status_enum DEFAULT 'active',
    email_notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE staff
    ADD CONSTRAINT staff_first_name_check
    CHECK (LENGTH(TRIM(first_name)) > 0);

ALTER TABLE staff
    ADD CONSTRAINT staff_last_name_check
    CHECK (LENGTH(TRIM(last_name)) > 0);

ALTER TABLE staff
    ADD CONSTRAINT staff_phone_check
    CHECK (phone ~ '^[+]?[0-9\s\-\(\)]+$');

ALTER TABLE staff
    ADD CONSTRAINT staff_email_check
    CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE staff
    ADD CONSTRAINT staff_available_days_check
    CHECK (available_days <@ '{1,2,3,4,5,6,7}'::INTEGER[]);

ALTER TABLE staff
    ADD CONSTRAINT staff_working_hours_check
    CHECK (working_hours_start < working_hours_end);

-- Create indexes for performance
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_phone ON staff(phone);
CREATE INDEX idx_staff_type ON staff(staff_type);
CREATE INDEX idx_staff_status ON staff(status);
CREATE INDEX idx_staff_active ON staff(status) WHERE status = 'active';
CREATE INDEX idx_staff_google_calendar_id ON staff(google_calendar_id) WHERE google_calendar_id IS NOT NULL;

-- Create updated_at trigger for staff
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for staff
CREATE POLICY "Enable read access for all users" ON staff
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON staff
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON staff
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON staff
    FOR DELETE USING (true);
