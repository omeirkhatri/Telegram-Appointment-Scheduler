-- Remove lab_technician from staff_type_enum
-- This migration removes the lab_technician option from the staff_type_enum

-- First, check if there are any existing staff members with lab_technician type
-- If there are, we need to handle them before removing the enum value
DO $$
DECLARE
    lab_tech_count INTEGER;
BEGIN
    -- Check if there are any staff members with lab_technician type
    SELECT COUNT(*) INTO lab_tech_count
    FROM staff
    WHERE staff_type = 'lab_technician';

    -- If there are lab technicians, we need to handle them
    IF lab_tech_count > 0 THEN
        RAISE NOTICE 'Found % staff members with lab_technician type. They will be converted to nurse type.', lab_tech_count;

        -- Convert existing lab technicians to nurses
        UPDATE staff
        SET staff_type = 'nurse',
            updated_at = NOW()
        WHERE staff_type = 'lab_technician';
    END IF;
END $$;

-- Create a new enum without lab_technician
CREATE TYPE staff_type_enum_new AS ENUM (
    'doctor',
    'nurse',
    'physiotherapist',
    'caregiver',
    'driver'
);

-- Update the staff table to use the new enum
ALTER TABLE staff
ALTER COLUMN staff_type TYPE staff_type_enum_new
USING staff_type::text::staff_type_enum_new;

-- Drop the old enum
DROP TYPE staff_type_enum;

-- Rename the new enum to the original name
ALTER TYPE staff_type_enum_new RENAME TO staff_type_enum;
