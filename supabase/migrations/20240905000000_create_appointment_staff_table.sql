-- Create appointment_staff junction table with proper relationships
-- This table manages the many-to-many relationship between appointments and staff

-- Create staff_role enum
CREATE TYPE staff_role_enum AS ENUM (
  'primary',
  'assistant',
  'driver',
  'backup'
);

-- Create appointment_staff junction table
CREATE TABLE appointment_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    role staff_role_enum NOT NULL DEFAULT 'assistant',
    is_primary BOOLEAN DEFAULT false,
    google_event_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique combination of appointment and staff
    UNIQUE(appointment_id, staff_id)
);

-- Add constraints
ALTER TABLE appointment_staff 
    ADD CONSTRAINT appointment_staff_role_check 
    CHECK (
        (role = 'primary' AND is_primary = true) OR
        (role != 'primary' AND is_primary = false)
    );

ALTER TABLE appointment_staff 
    ADD CONSTRAINT appointment_staff_google_event_id_check 
    CHECK (
        google_event_id IS NULL OR 
        google_event_id ~ '^[a-zA-Z0-9_-]+$'
    );

-- Create indexes for performance
CREATE INDEX idx_appointment_staff_appointment_id ON appointment_staff(appointment_id);
CREATE INDEX idx_appointment_staff_staff_id ON appointment_staff(staff_id);
CREATE INDEX idx_appointment_staff_role ON appointment_staff(role);
CREATE INDEX idx_appointment_staff_is_primary ON appointment_staff(is_primary);
CREATE INDEX idx_appointment_staff_google_event_id ON appointment_staff(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX idx_appointment_staff_appointment_staff ON appointment_staff(appointment_id, staff_id);

-- Create updated_at trigger for appointment_staff
CREATE TRIGGER update_appointment_staff_updated_at 
    BEFORE UPDATE ON appointment_staff 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE appointment_staff ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for appointment_staff
CREATE POLICY "Enable read access for all users" ON appointment_staff 
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON appointment_staff 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON appointment_staff 
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON appointment_staff 
    FOR DELETE USING (true);

-- Create function to ensure only one primary staff per appointment
CREATE OR REPLACE FUNCTION ensure_single_primary_staff()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a primary staff assignment
    IF NEW.is_primary = true THEN
        -- Update all other staff for this appointment to not be primary
        UPDATE appointment_staff 
        SET is_primary = false 
        WHERE appointment_id = NEW.appointment_id 
        AND staff_id != NEW.staff_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one primary staff per appointment
CREATE TRIGGER ensure_single_primary_staff_trigger
    BEFORE INSERT OR UPDATE ON appointment_staff
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_staff();

-- Create function to validate staff role based on appointment type
CREATE OR REPLACE FUNCTION validate_staff_role_for_appointment()
RETURNS TRIGGER AS $$
DECLARE
    appointment_type appointment_type_enum;
    staff_type staff_type_enum;
BEGIN
    -- Get appointment type
    SELECT a.appointment_type INTO appointment_type
    FROM appointments a
    WHERE a.id = NEW.appointment_id;
    
    -- Get staff type
    SELECT s.staff_type INTO staff_type
    FROM staff s
    WHERE s.id = NEW.staff_id;
    
    -- Validate role based on appointment type and staff type
    CASE appointment_type
        WHEN 'doctor_on_call' THEN
            IF NEW.role = 'primary' AND staff_type != 'doctor' THEN
                RAISE EXCEPTION 'Primary role for doctor_on_call must be assigned to a doctor';
            END IF;
            IF NEW.role = 'assistant' AND staff_type != 'nurse' THEN
                RAISE EXCEPTION 'Assistant role for doctor_on_call must be assigned to a nurse';
            END IF;
            
        WHEN 'lab_test' THEN
            IF NEW.role = 'primary' AND staff_type != 'nurse' THEN
                RAISE EXCEPTION 'Primary role for lab_test must be assigned to a nurse';
            END IF;
            
        WHEN 'teleconsultation' THEN
            IF NEW.role = 'primary' AND staff_type != 'doctor' THEN
                RAISE EXCEPTION 'Primary role for teleconsultation must be assigned to a doctor';
            END IF;
            
        WHEN 'physiotherapy' THEN
            IF NEW.role = 'primary' AND staff_type != 'physiotherapist' THEN
                RAISE EXCEPTION 'Primary role for physiotherapy must be assigned to a physiotherapist';
            END IF;
            
        WHEN 'caregiver' THEN
            IF NEW.role = 'primary' AND staff_type != 'caregiver' THEN
                RAISE EXCEPTION 'Primary role for caregiver must be assigned to a caregiver';
            END IF;
            IF NEW.role = 'backup' AND staff_type != 'caregiver' THEN
                RAISE EXCEPTION 'Backup role for caregiver must be assigned to a caregiver';
            END IF;
            
        WHEN 'iv_therapy' THEN
            IF NEW.role = 'primary' AND staff_type != 'nurse' THEN
                RAISE EXCEPTION 'Primary role for iv_therapy must be assigned to a nurse';
            END IF;
            IF NEW.role = 'assistant' AND staff_type != 'doctor' THEN
                RAISE EXCEPTION 'Assistant role for iv_therapy must be assigned to a doctor';
            END IF;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate staff role based on appointment type
CREATE TRIGGER validate_staff_role_for_appointment_trigger
    BEFORE INSERT OR UPDATE ON appointment_staff
    FOR EACH ROW
    EXECUTE FUNCTION validate_staff_role_for_appointment();
