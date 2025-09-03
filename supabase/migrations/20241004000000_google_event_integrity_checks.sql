-- Add integrity checks and constraints for google_event_ids
-- This migration adds database-level validation and constraints

-- Add check constraint for google_event_ids structure
ALTER TABLE appointments
ADD CONSTRAINT appointments_google_event_ids_check
CHECK (
  google_event_ids IS NULL OR
  (
    jsonb_typeof(google_event_ids) = 'object' AND
    -- Ensure all keys are valid UUIDs
    (
      SELECT bool_and(
        key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
      FROM jsonb_each_text(google_event_ids)
    ) AND
    -- Ensure all values are valid Google Calendar event IDs
    (
      SELECT bool_and(
        value ~ '^[a-zA-Z0-9_-]+$'
      )
      FROM jsonb_each_text(google_event_ids)
    )
  )
);

-- Create function to validate staff_id references in google_event_ids
CREATE OR REPLACE FUNCTION validate_google_event_ids_staff_references()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if google_event_ids exists and has entries
  IF NEW.google_event_ids IS NOT NULL AND jsonb_typeof(NEW.google_event_ids) = 'object' THEN
    -- Validate that all staff_id keys exist in the staff table
    IF EXISTS (
      SELECT 1
      FROM jsonb_each_text(NEW.google_event_ids) AS event_data
      WHERE NOT EXISTS (
        SELECT 1
        FROM staff
        WHERE id::text = event_data.key
        AND status = 'active'
      )
    ) THEN
      RAISE EXCEPTION 'Invalid staff_id reference in google_event_ids: staff member does not exist or is inactive';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate staff references
CREATE TRIGGER validate_google_event_ids_staff_references_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_google_event_ids_staff_references();

-- Create function to detect duplicate event IDs
CREATE OR REPLACE FUNCTION detect_duplicate_google_event_ids()
RETURNS TABLE (
  event_id TEXT,
  appointment_count BIGINT,
  appointment_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  WITH event_counts AS (
    SELECT
      event_value AS event_id,
      COUNT(*) AS appointment_count,
      ARRAY_AGG(appointment_id) AS appointment_ids
    FROM (
      SELECT
        a.id AS appointment_id,
        jsonb_each_text(a.google_event_ids) AS event_data
      FROM appointments a
      WHERE a.google_event_ids IS NOT NULL
        AND jsonb_typeof(a.google_event_ids) = 'object'
    ) AS events
    CROSS JOIN LATERAL (
      SELECT event_data.value AS event_value
    ) AS event_values
    GROUP BY event_value
    HAVING COUNT(*) > 1
  )
  SELECT
    ec.event_id,
    ec.appointment_count,
    ec.appointment_ids
  FROM event_counts ec;
END;
$$ LANGUAGE plpgsql;

-- Create function to get integrity check statistics
CREATE OR REPLACE FUNCTION get_google_event_ids_integrity_stats()
RETURNS TABLE (
  total_appointments BIGINT,
  appointments_with_event_ids BIGINT,
  total_event_ids BIGINT,
  invalid_format_count BIGINT,
  invalid_staff_references BIGINT,
  duplicate_event_ids BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) AS total_appointments,
      COUNT(CASE WHEN google_event_ids IS NOT NULL
                 AND jsonb_typeof(google_event_ids) = 'object'
                 AND jsonb_array_length(jsonb_object_keys(google_event_ids)) > 0
            THEN 1 END) AS appointments_with_event_ids,
      COALESCE(
        SUM(
          CASE WHEN google_event_ids IS NOT NULL
               AND jsonb_typeof(google_event_ids) = 'object'
          THEN jsonb_array_length(jsonb_object_keys(google_event_ids))
          ELSE 0 END
        ), 0
      ) AS total_event_ids
    FROM appointments
  ),
  invalid_format AS (
    SELECT COUNT(*) AS invalid_format_count
    FROM appointments
    WHERE google_event_ids IS NOT NULL
      AND (
        jsonb_typeof(google_event_ids) != 'object' OR
        EXISTS (
          SELECT 1
          FROM jsonb_each_text(google_event_ids) AS event_data
          WHERE event_data.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             OR event_data.value !~ '^[a-zA-Z0-9_-]+$'
        )
      )
  ),
  invalid_staff AS (
    SELECT COUNT(*) AS invalid_staff_references
    FROM appointments
    WHERE google_event_ids IS NOT NULL
      AND jsonb_typeof(google_event_ids) = 'object'
      AND EXISTS (
        SELECT 1
        FROM jsonb_each_text(google_event_ids) AS event_data
        WHERE NOT EXISTS (
          SELECT 1
          FROM staff
          WHERE id::text = event_data.key
          AND status = 'active'
        )
      )
  ),
  duplicates AS (
    SELECT COUNT(*) AS duplicate_event_ids
    FROM detect_duplicate_google_event_ids()
  )
  SELECT
    s.total_appointments,
    s.appointments_with_event_ids,
    s.total_event_ids,
    COALESCE(if.invalid_format_count, 0),
    COALESCE(ist.invalid_staff_references, 0),
    COALESCE(d.duplicate_event_ids, 0)
  FROM stats s
  CROSS JOIN invalid_format if
  CROSS JOIN invalid_staff ist
  CROSS JOIN duplicates d;
END;
$$ LANGUAGE plpgsql;

-- Create index for efficient google_event_ids queries
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_ids_gin
ON appointments USING GIN(google_event_ids);

-- Create index for staff_id lookups in google_event_ids
CREATE INDEX IF NOT EXISTS idx_appointments_google_event_ids_staff_lookup
ON appointments USING GIN((google_event_ids ->> 'staff_id'));

-- Add comment explaining the integrity checks
COMMENT ON CONSTRAINT appointments_google_event_ids_check ON appointments IS
'Ensures google_event_ids is a valid JSONB object with UUID keys and valid Google Calendar event ID values';

COMMENT ON FUNCTION validate_google_event_ids_staff_references() IS
'Validates that all staff_id references in google_event_ids exist and are active';

COMMENT ON FUNCTION detect_duplicate_google_event_ids() IS
'Detects duplicate Google Calendar event IDs across appointments';

COMMENT ON FUNCTION get_google_event_ids_integrity_stats() IS
'Returns comprehensive statistics about google_event_ids integrity';
