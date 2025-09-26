-- Unified Calendar Sync Migration
-- This migration consolidates calendar sync to use a single source of truth
-- and adds sync state tracking for better reliability

-- Add sync state tracking fields to appointment_staff table
ALTER TABLE appointment_staff
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sync_attempted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_error TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_retry_count INTEGER DEFAULT 0;

-- Add constraint for sync_status
ALTER TABLE appointment_staff
ADD CONSTRAINT appointment_staff_sync_status_check
CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'error'));

-- Create index for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_appointment_staff_sync_status ON appointment_staff(sync_status);
CREATE INDEX IF NOT EXISTS idx_appointment_staff_sync_attempted_at ON appointment_staff(sync_attempted_at);
CREATE INDEX IF NOT EXISTS idx_appointment_staff_last_synced_at ON appointment_staff(last_synced_at);

-- Migrate existing google_event_ids from appointments table to appointment_staff
-- This consolidates the sync data to a single source of truth
DO $$
DECLARE
    appointment_record RECORD;
    staff_id_key TEXT;
    event_id TEXT;
BEGIN
    -- Loop through appointments that have google_event_ids
    FOR appointment_record IN
        SELECT id, google_event_ids
        FROM appointments
        WHERE google_event_ids IS NOT NULL
        AND google_event_ids != '{}'::jsonb
    LOOP
        -- Loop through each staff_id in the google_event_ids JSONB
        FOR staff_id_key, event_id IN
            SELECT * FROM jsonb_each_text(appointment_record.google_event_ids)
        LOOP
            -- Update the corresponding appointment_staff record
            UPDATE appointment_staff
            SET
                google_event_id = event_id,
                sync_status = 'synced',
                last_synced_at = NOW()
            WHERE appointment_id = appointment_record.id
            AND staff_id = staff_id_key::uuid
            AND google_event_id IS NULL; -- Only update if not already set
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Migrated google_event_ids from appointments to appointment_staff table';
END
$$;

-- Create function to update sync status
CREATE OR REPLACE FUNCTION update_sync_status(
    p_appointment_staff_id UUID,
    p_status VARCHAR(20),
    p_event_id TEXT DEFAULT NULL,
    p_error TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE appointment_staff
    SET
        sync_status = p_status,
        sync_attempted_at = NOW(),
        google_event_id = COALESCE(p_event_id, google_event_id),
        sync_error = p_error,
        last_synced_at = CASE WHEN p_status = 'synced' THEN NOW() ELSE last_synced_at END,
        sync_retry_count = CASE
            WHEN p_status = 'synced' THEN 0
            WHEN p_status IN ('failed', 'error') THEN sync_retry_count + 1
            ELSE sync_retry_count
        END,
        updated_at = NOW()
    WHERE id = p_appointment_staff_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get pending syncs
CREATE OR REPLACE FUNCTION get_pending_calendar_syncs(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    appointment_staff_id UUID,
    appointment_id UUID,
    staff_id UUID,
    sync_status VARCHAR(20),
    sync_retry_count INTEGER,
    google_event_id TEXT,
    appointment_date DATE,
    start_time TIME,
    appointment_type TEXT,
    staff_first_name TEXT,
    staff_last_name TEXT,
    staff_google_calendar_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        aps.id as appointment_staff_id,
        aps.appointment_id,
        aps.staff_id,
        aps.sync_status,
        aps.sync_retry_count,
        aps.google_event_id,
        a.appointment_date,
        a.start_time,
        a.appointment_type::text,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name,
        s.google_calendar_id as staff_google_calendar_id
    FROM appointment_staff aps
    JOIN appointments a ON aps.appointment_id = a.id
    JOIN staff s ON aps.staff_id = s.id
    WHERE aps.sync_status IN ('pending', 'failed', 'error')
    AND s.google_calendar_id IS NOT NULL
    AND a.status != 'deleted'
    AND aps.sync_retry_count < 5 -- Max 5 retries
    AND (aps.sync_attempted_at IS NULL OR aps.sync_attempted_at < NOW() - INTERVAL '5 minutes')
    ORDER BY
        aps.sync_status ASC, -- pending first
        aps.sync_retry_count ASC, -- fewer retries first
        aps.created_at ASC -- older first
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get orphaned calendar events
CREATE OR REPLACE FUNCTION get_orphaned_calendar_events()
RETURNS TABLE (
    appointment_staff_id UUID,
    google_event_id TEXT,
    staff_google_calendar_id TEXT,
    staff_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        aps.id as appointment_staff_id,
        aps.google_event_id,
        s.google_calendar_id as staff_google_calendar_id,
        CONCAT(s.first_name, ' ', s.last_name) as staff_name
    FROM appointment_staff aps
    JOIN staff s ON aps.staff_id = s.id
    LEFT JOIN appointments a ON aps.appointment_id = a.id
    WHERE aps.google_event_id IS NOT NULL
    AND s.google_calendar_id IS NOT NULL
    AND (a.id IS NULL OR a.status = 'deleted');
END;
$$ LANGUAGE plpgsql;

-- Create sync statistics function
CREATE OR REPLACE FUNCTION get_calendar_sync_statistics()
RETURNS TABLE (
    total_assignments INTEGER,
    pending_syncs INTEGER,
    synced_count INTEGER,
    failed_count INTEGER,
    error_count INTEGER,
    with_events INTEGER,
    without_events INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_assignments,
        COUNT(CASE WHEN sync_status = 'pending' THEN 1 END)::INTEGER as pending_syncs,
        COUNT(CASE WHEN sync_status = 'synced' THEN 1 END)::INTEGER as synced_count,
        COUNT(CASE WHEN sync_status = 'failed' THEN 1 END)::INTEGER as failed_count,
        COUNT(CASE WHEN sync_status = 'error' THEN 1 END)::INTEGER as error_count,
        COUNT(CASE WHEN google_event_id IS NOT NULL THEN 1 END)::INTEGER as with_events,
        COUNT(CASE WHEN google_event_id IS NULL THEN 1 END)::INTEGER as without_events
    FROM appointment_staff aps
    JOIN staff s ON aps.staff_id = s.id
    WHERE s.google_calendar_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the migration
COMMENT ON TABLE appointment_staff IS 'Junction table for appointments and staff with unified calendar sync tracking';
COMMENT ON COLUMN appointment_staff.sync_status IS 'Calendar sync status: pending, syncing, synced, failed, error';
COMMENT ON COLUMN appointment_staff.google_event_id IS 'Primary storage for Google Calendar event ID';
COMMENT ON COLUMN appointment_staff.sync_attempted_at IS 'Last time sync was attempted';
COMMENT ON COLUMN appointment_staff.sync_error IS 'Error message from last failed sync attempt';
COMMENT ON COLUMN appointment_staff.last_synced_at IS 'Last successful sync timestamp';
COMMENT ON COLUMN appointment_staff.sync_retry_count IS 'Number of sync retry attempts';




