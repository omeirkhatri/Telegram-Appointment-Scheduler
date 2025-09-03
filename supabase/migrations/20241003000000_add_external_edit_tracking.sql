-- Add external edit tracking fields to appointments table
-- This migration adds fields to track when appointments are modified externally (e.g., from Google Calendar)

-- Add new columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS last_external_edit TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_external_edit_source TEXT CHECK (last_external_edit_source IN ('app', 'google_calendar', 'webhook', 'manual')),
ADD COLUMN IF NOT EXISTS external_edit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_edit_source TEXT CHECK (last_edit_source IN ('app', 'google_calendar', 'webhook', 'manual'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_last_external_edit ON appointments(last_external_edit);
CREATE INDEX IF NOT EXISTS idx_appointments_external_edit_count ON appointments(external_edit_count);
CREATE INDEX IF NOT EXISTS idx_appointments_last_edit_source ON appointments(last_edit_source);

-- Add comments for documentation
COMMENT ON COLUMN appointments.last_external_edit IS 'Timestamp of the last external edit (from Google Calendar, webhook, etc.)';
COMMENT ON COLUMN appointments.last_external_edit_source IS 'Source of the last external edit: app, google_calendar, webhook, or manual';
COMMENT ON COLUMN appointments.external_edit_count IS 'Total number of external edits made to this appointment';
COMMENT ON COLUMN appointments.last_edit_source IS 'Source of the last edit (internal or external)';

-- Update existing appointments to have default values
UPDATE appointments
SET
  external_edit_count = 0,
  last_edit_source = 'app'
WHERE
  external_edit_count IS NULL
  OR last_edit_source IS NULL;
