-- Fix appointments_date_check constraint to allow deletion of past appointments
-- This migration updates the constraint to allow soft deletion of appointments with past dates
-- This should run after the soft delete migration that adds the 'deleted' status

-- Drop the existing constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_date_check;

-- Add the updated constraint that allows deletion of past appointments
ALTER TABLE appointments
    ADD CONSTRAINT appointments_date_check
    CHECK (appointment_date >= CURRENT_DATE OR status = 'deleted');
