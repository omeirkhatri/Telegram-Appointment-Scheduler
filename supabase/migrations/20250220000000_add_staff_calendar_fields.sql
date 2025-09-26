-- Add calendar-related fields to staff table for Google Calendar integration
-- This migration adds fields needed for calendar verification, error tracking, and status management

-- Create calendar_verification_status enum
CREATE TYPE calendar_verification_status_enum AS ENUM (
  'pending',
  'verified',
  'failed',
  'not_required'
);

-- Add new calendar-related columns to staff table
ALTER TABLE staff
ADD COLUMN google_calendar_id TEXT,
ADD COLUMN calendar_verification_status calendar_verification_status_enum DEFAULT 'not_required',
ADD COLUMN calendar_verification_date TIMESTAMPTZ,
ADD COLUMN calendar_error_code TEXT;

-- Add constraints for new fields
ALTER TABLE staff
ADD CONSTRAINT staff_calendar_verification_status_check
CHECK (
  (calendar_verification_status = 'not_required' AND calendar_verification_date IS NULL) OR
  (calendar_verification_status != 'not_required')
);

-- Add comment explaining the calendar fields
COMMENT ON COLUMN staff.google_calendar_id IS 'Google Calendar ID for this staff member, created automatically when email is provided';
COMMENT ON COLUMN staff.calendar_verification_status IS 'Status of calendar verification process: pending, verified, failed, or not_required';
COMMENT ON COLUMN staff.calendar_verification_date IS 'Timestamp when calendar verification was completed (success or failure)';
COMMENT ON COLUMN staff.calendar_error_code IS 'Error code from last calendar operation failure, if any';
