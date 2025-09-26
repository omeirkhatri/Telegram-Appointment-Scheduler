-- Add os_caregiver to staff_type_enum
-- This migration adds the os_caregiver option to the staff_type_enum

-- Create a new enum with os_caregiver added
CREATE TYPE staff_type_enum_new AS ENUM (
    'doctor',
    'nurse',
    'physiotherapist',
    'caregiver',
    'os_caregiver',
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
