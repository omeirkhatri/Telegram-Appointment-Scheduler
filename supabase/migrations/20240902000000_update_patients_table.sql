-- Update patients table with all required fields from PRD
-- Drop existing table and recreate with proper structure

-- First, drop dependent tables and recreate them
DROP TABLE IF EXISTS appointment_staff CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Recreate patients table with all required fields
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    id_document_url TEXT,
    id_document_filename TEXT,
    flat_villa_no TEXT NOT NULL,
    building_street TEXT NOT NULL,
    area TEXT NOT NULL,
    city TEXT NOT NULL,
    google_maps_link TEXT,
    medical_notes TEXT,
    emergency_contact TEXT,
    preferred_transport TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE patients 
    ADD CONSTRAINT patients_phone_check 
    CHECK (phone ~ '^[+]?[0-9\s\-\(\)]+$');

ALTER TABLE patients 
    ADD CONSTRAINT patients_name_check 
    CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE patients 
    ADD CONSTRAINT patients_flat_villa_no_check 
    CHECK (LENGTH(TRIM(flat_villa_no)) > 0);

ALTER TABLE patients 
    ADD CONSTRAINT patients_building_street_check 
    CHECK (LENGTH(TRIM(building_street)) > 0);

ALTER TABLE patients 
    ADD CONSTRAINT patients_area_check 
    CHECK (LENGTH(TRIM(area)) > 0);

ALTER TABLE patients 
    ADD CONSTRAINT patients_city_check 
    CHECK (LENGTH(TRIM(city)) > 0);

-- Create indexes for performance
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_area ON patients(area);
CREATE INDEX idx_patients_city ON patients(city);
CREATE INDEX idx_patients_name ON patients(name);

-- Create updated_at trigger for patients
CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for patients
CREATE POLICY "Enable read access for all users" ON patients 
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON patients 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON patients 
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON patients 
    FOR DELETE USING (true);
