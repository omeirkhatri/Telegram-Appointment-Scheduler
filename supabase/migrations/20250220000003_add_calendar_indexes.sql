-- Add indexes for performance on new calendar-related fields
-- This migration adds indexes to optimize queries on calendar verification status and error tracking

-- Add indexes for staff table calendar fields
CREATE INDEX idx_staff_calendar_verification_status ON staff(calendar_verification_status);
CREATE INDEX idx_staff_calendar_verification_date ON staff(calendar_verification_date) WHERE calendar_verification_date IS NOT NULL;
CREATE INDEX idx_staff_calendar_error_code ON staff(calendar_error_code) WHERE calendar_error_code IS NOT NULL;

-- Add composite indexes for common query patterns
CREATE INDEX idx_staff_calendar_status_email ON staff(calendar_verification_status, email) WHERE email IS NOT NULL;
CREATE INDEX idx_staff_calendar_status_type ON staff(calendar_verification_status, staff_type);
CREATE INDEX idx_staff_calendar_pending ON staff(calendar_verification_status) WHERE calendar_verification_status = 'pending';
CREATE INDEX idx_staff_calendar_failed ON staff(calendar_verification_status) WHERE calendar_verification_status = 'failed';

-- Add partial indexes for active staff with calendar issues
CREATE INDEX idx_staff_active_calendar_issues ON staff(status, calendar_verification_status, calendar_error_code) 
WHERE status = 'active' AND (calendar_verification_status = 'failed' OR calendar_error_code IS NOT NULL);

-- Add index for staff with Google Calendar IDs (for quick lookups)
CREATE INDEX idx_staff_has_calendar ON staff(google_calendar_id) WHERE google_calendar_id IS NOT NULL;

-- Add index for staff without calendars (for batch processing)
CREATE INDEX idx_staff_no_calendar ON staff(id) WHERE google_calendar_id IS NULL AND email IS NOT NULL;
