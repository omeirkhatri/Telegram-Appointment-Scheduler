-- Remove outdated communication methods (email, WhatsApp, Google Calendar)
-- This migration removes all columns and tables related to email, WhatsApp, and Google Calendar
-- as the application now only uses Telegram for communication

-- Drop email-related tables
DROP TABLE IF EXISTS email_delivery_attempts CASCADE;
DROP TABLE IF EXISTS email_delivery_logs CASCADE;
DROP TABLE IF EXISTS email_delivery_statistics CASCADE;
DROP TABLE IF EXISTS email_preferences CASCADE;

-- Remove email-related columns from staff table
ALTER TABLE staff DROP COLUMN IF EXISTS email_notifications_enabled;
ALTER TABLE staff DROP COLUMN IF EXISTS email_verified;

-- Remove WhatsApp-related columns from staff table
ALTER TABLE staff DROP COLUMN IF EXISTS whatsapp_number;
ALTER TABLE staff DROP COLUMN IF EXISTS whatsapp_verified;

-- Remove Google Calendar-related columns from staff table
ALTER TABLE staff DROP COLUMN IF EXISTS google_calendar_id;

-- Remove Google Calendar-related columns from appointments table
ALTER TABLE appointments DROP COLUMN IF EXISTS google_calendar_event_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS google_event_ids;
ALTER TABLE appointments DROP COLUMN IF EXISTS last_external_edit;
ALTER TABLE appointments DROP COLUMN IF EXISTS last_external_edit_source;
ALTER TABLE appointments DROP COLUMN IF EXISTS external_edit_count;
ALTER TABLE appointments DROP COLUMN IF EXISTS last_edit_source;

-- Drop related indexes
DROP INDEX IF EXISTS idx_staff_whatsapp_number;
DROP INDEX IF EXISTS idx_staff_google_calendar_id;
DROP INDEX IF EXISTS idx_appointments_google_event_ids_gin;
DROP INDEX IF EXISTS idx_appointments_google_event_ids_staff_lookup;
DROP INDEX IF EXISTS idx_appointments_last_external_edit;
DROP INDEX IF EXISTS idx_appointments_external_edit_count;
DROP INDEX IF EXISTS idx_appointments_last_edit_source;

-- Drop related functions
DROP FUNCTION IF EXISTS validate_google_event_ids_staff_references();
DROP FUNCTION IF EXISTS detect_duplicate_google_event_ids();
DROP FUNCTION IF EXISTS get_google_event_ids_integrity_stats();
DROP FUNCTION IF EXISTS update_email_delivery_statistics();
DROP FUNCTION IF EXISTS cleanup_old_email_delivery_logs();
DROP FUNCTION IF EXISTS get_email_delivery_statistics(DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS get_failed_deliveries_for_retry();
DROP FUNCTION IF EXISTS update_email_preferences_updated_at();

-- Drop related triggers (only if tables exist)
DO $$
BEGIN
    -- Only drop triggers if the tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        DROP TRIGGER IF EXISTS validate_google_event_ids_staff_references_trigger ON appointments;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_delivery_logs') THEN
        DROP TRIGGER IF EXISTS trigger_update_email_delivery_statistics ON email_delivery_logs;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_preferences') THEN
        DROP TRIGGER IF EXISTS trigger_update_email_preferences_updated_at ON email_preferences;
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE staff IS 'Staff members with Telegram integration only';
COMMENT ON TABLE appointments IS 'Appointments without external calendar integration';
