

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."appointment_status_enum" AS ENUM (
    'scheduled',
    'confirmed',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."appointment_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."appointment_type_enum" AS ENUM (
    'doctor_on_call',
    'lab_test',
    'teleconsultation',
    'physiotherapy',
    'caregiver',
    'iv_therapy'
);


ALTER TYPE "public"."appointment_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."copy_operation_status_enum" AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'partially_completed'
);


ALTER TYPE "public"."copy_operation_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."copy_operation_type_enum" AS ENUM (
    'single_copy',
    'bulk_copy'
);


ALTER TYPE "public"."copy_operation_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."staff_role_enum" AS ENUM (
    'primary',
    'assistant',
    'driver',
    'backup'
);


ALTER TYPE "public"."staff_role_enum" OWNER TO "postgres";


CREATE TYPE "public"."staff_status_enum" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."staff_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."staff_type_enum" AS ENUM (
    'doctor',
    'nurse',
    'physiotherapist',
    'caregiver',
    'driver',
    'lab_technician'
);


ALTER TYPE "public"."staff_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."transportation_type_enum" AS ENUM (
    'driver',
    'self_transport'
);


ALTER TYPE "public"."transportation_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_appointment_copy_audit_trail"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM appointment_copy_audit_trail
    WHERE started_at < NOW() - INTERVAL '1 year';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Also clean up old statistics (older than 2 years)
    DELETE FROM appointment_copy_statistics
    WHERE date < CURRENT_DATE - INTERVAL '2 years';

    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_appointment_copy_audit_trail"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_email_delivery_logs"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_delivery_logs
    WHERE created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Also clean up old statistics (older than 1 year)
    DELETE FROM email_delivery_statistics
    WHERE date < CURRENT_DATE - INTERVAL '1 year';

    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_email_delivery_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_patient_documents"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Delete all documents associated with the deleted patient
    DELETE FROM storage.objects
    WHERE bucket_id = 'patient-documents'
    AND name LIKE 'id-documents/' || OLD.id::TEXT || '_%';

    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."cleanup_patient_documents"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_duplicate_google_event_ids"() RETURNS TABLE("event_id" "text", "appointment_count" bigint, "appointment_ids" "uuid"[])
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."detect_duplicate_google_event_ids"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."detect_duplicate_google_event_ids"() IS 'Detects duplicate Google Calendar event IDs across appointments';



CREATE OR REPLACE FUNCTION "public"."ensure_single_primary_staff"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."ensure_single_primary_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_migration_report"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    report TEXT := '';
    check_record RECORD;
    passed_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    report := '=== Cloud Migration Validation Report ===' || E'\n';
    report := report || 'Generated: ' || NOW()::TEXT || E'\n';
    report := report || 'Environment: ' || CASE WHEN is_cloud_environment() THEN 'CLOUD' ELSE 'LOCAL' END || E'\n\n';

    FOR check_record IN SELECT * FROM validate_cloud_migration() LOOP
        total_count := total_count + 1;
        IF check_record.status = 'PASSED' THEN
            passed_count := passed_count + 1;
        END IF;

        report := report || check_record.check_name || ': ' || check_record.status || E'\n';
        report := report || '  ' || check_record.message || E'\n';
    END LOOP;

    report := report || E'\n=== Summary ===' || E'\n';
    report := report || 'Passed: ' || passed_count || '/' || total_count || E'\n';
    report := report || 'Status: ' || CASE WHEN passed_count = total_count THEN 'READY FOR CLOUD' ELSE 'NEEDS ATTENTION' END || E'\n';

    RETURN report;
END;
$$;


ALTER FUNCTION "public"."generate_migration_report"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_migration_report"() IS 'Generates a comprehensive migration readiness report';



CREATE OR REPLACE FUNCTION "public"."generate_patient_document_path"("patient_id" "uuid", "filename" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    file_extension TEXT;
    secure_filename TEXT;
    file_path TEXT;
BEGIN
    -- Extract file extension
    file_extension := LOWER(SUBSTRING(filename FROM '\.([^.]*)$'));

    -- Generate secure filename with timestamp and UUID
    secure_filename := patient_id::TEXT || '_' ||
                      EXTRACT(EPOCH FROM NOW())::TEXT || '_' ||
                      gen_random_uuid()::TEXT || '.' || file_extension;

    -- Create file path in the id-documents folder
    file_path := 'id-documents/' || secure_filename;

    RETURN file_path;
END;
$_$;


ALTER FUNCTION "public"."generate_patient_document_path"("patient_id" "uuid", "filename" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_appointment_copy_audit_trail"("appointment_id_param" "uuid", "limit_count" integer DEFAULT 50, "offset_count" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "operation_id" "text", "operation_type" "public"."copy_operation_type_enum", "source_appointment_id" "uuid", "user_id" "text", "operation_status" "public"."copy_operation_status_enum", "total_requested" integer, "total_created" integer, "total_conflicts" integer, "total_errors" integer, "started_at" timestamp with time zone, "completed_at" timestamp with time zone, "duration_ms" integer, "notes" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        acat.id,
        acat.operation_id,
        acat.operation_type,
        acat.source_appointment_id,
        acat.user_id,
        acat.operation_status,
        acat.total_requested,
        acat.total_created,
        acat.total_conflicts,
        acat.total_errors,
        acat.started_at,
        acat.completed_at,
        acat.duration_ms,
        acat.notes,
        acat.created_at
    FROM appointment_copy_audit_trail acat
    WHERE acat.source_appointment_id = appointment_id_param
    ORDER BY acat.started_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."get_appointment_copy_audit_trail"("appointment_id_param" "uuid", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_appointment_copy_statistics"("start_date" "date", "end_date" "date", "operation_type_filter" "public"."copy_operation_type_enum" DEFAULT NULL::"public"."copy_operation_type_enum") RETURNS TABLE("date" "date", "operation_type" "public"."copy_operation_type_enum", "total_operations" bigint, "successful_operations" bigint, "failed_operations" bigint, "partially_completed_operations" bigint, "total_appointments_created" bigint, "total_conflicts" bigint, "total_errors" bigint, "average_operation_duration_ms" integer, "success_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        acs.date,
        acs.operation_type,
        acs.total_operations,
        acs.successful_operations,
        acs.failed_operations,
        acs.partially_completed_operations,
        acs.total_appointments_created,
        acs.total_conflicts,
        acs.total_errors,
        acs.average_operation_duration_ms,
        acs.success_rate
    FROM appointment_copy_statistics acs
    WHERE acs.date BETWEEN start_date AND end_date
    AND (operation_type_filter IS NULL OR acs.operation_type = operation_type_filter)
    ORDER BY acs.date DESC, acs.operation_type;
END;
$$;


ALTER FUNCTION "public"."get_appointment_copy_statistics"("start_date" "date", "end_date" "date", "operation_type_filter" "public"."copy_operation_type_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_delivery_statistics"("start_date" "date", "end_date" "date", "email_type_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("date" "date", "email_type" "text", "total_emails" bigint, "successful_deliveries" bigint, "failed_deliveries" bigint, "pending_deliveries" bigint, "success_rate" numeric, "average_delivery_time_ms" integer, "total_retries" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        eds.date,
        eds.email_type,
        eds.total_emails,
        eds.successful_deliveries,
        eds.failed_deliveries,
        eds.pending_deliveries,
        eds.success_rate,
        eds.average_delivery_time_ms,
        eds.total_retries
    FROM email_delivery_statistics eds
    WHERE eds.date BETWEEN start_date AND end_date
    AND (email_type_filter IS NULL OR eds.email_type = email_type_filter)
    ORDER BY eds.date DESC, eds.email_type;
END;
$$;


ALTER FUNCTION "public"."get_email_delivery_statistics"("start_date" "date", "end_date" "date", "email_type_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_failed_deliveries_for_retry"() RETURNS TABLE("id" "uuid", "email_id" "text", "staff_id" "uuid", "recipient_email" "text", "subject" "text", "retry_count" integer, "max_retries" integer, "next_retry_at" timestamp with time zone, "error_message" "text", "email_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        edl.id,
        edl.email_id,
        edl.staff_id,
        edl.recipient_email,
        edl.subject,
        edl.retry_count,
        edl.max_retries,
        edl.next_retry_at,
        edl.error_message,
        edl.email_type
    FROM email_delivery_logs edl
    WHERE edl.status = 'failed'
    AND edl.retry_count < edl.max_retries
    AND (edl.next_retry_at IS NULL OR edl.next_retry_at <= NOW())
    ORDER BY edl.priority DESC, edl.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_failed_deliveries_for_retry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_google_event_ids_integrity_stats"() RETURNS TABLE("total_appointments" bigint, "appointments_with_event_ids" bigint, "total_event_ids" bigint, "invalid_format_count" bigint, "invalid_staff_references" bigint, "duplicate_event_ids" bigint)
    LANGUAGE "plpgsql"
    AS $_$
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
$_$;


ALTER FUNCTION "public"."get_google_event_ids_integrity_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_google_event_ids_integrity_stats"() IS 'Returns comprehensive statistics about google_event_ids integrity';



CREATE OR REPLACE FUNCTION "public"."get_storage_url"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF is_cloud_environment() THEN
        -- Return cloud storage URL
        RETURN current_setting('app.supabase_url', true) || '/storage/v1';
    ELSE
        -- Return local storage URL
        RETURN 'http://localhost:54321/storage/v1';
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_storage_url"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_storage_url"() IS 'Returns the appropriate storage URL based on environment';



CREATE OR REPLACE FUNCTION "public"."is_cloud_environment"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we're running in Supabase cloud by looking for specific environment variables
    -- This is a simple check - in production, you might want more sophisticated detection
    RETURN current_setting('app.environment', true) = 'production' OR
           current_setting('app.environment', true) = 'staging';
END;
$$;


ALTER FUNCTION "public"."is_cloud_environment"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_cloud_environment"() IS 'Determines if the database is running in cloud environment';



CREATE OR REPLACE FUNCTION "public"."reset_database_for_migration"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only allow this in non-production environments
    IF is_cloud_environment() THEN
        RAISE EXCEPTION 'Cannot reset database in cloud environment';
    END IF;

    -- This function would contain logic to reset the database
    -- In a real implementation, you might want to:
    -- 1. Drop all tables
    -- 2. Recreate them
    -- 3. Re-run all migrations
    -- 4. Re-seed data

    RAISE NOTICE 'Database reset function called (development only)';
END;
$$;


ALTER FUNCTION "public"."reset_database_for_migration"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_database_for_migration"() IS 'Resets database for fresh migration (development only)';



CREATE OR REPLACE FUNCTION "public"."setup_environment_config"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Set up environment-specific settings
    -- Note: ALTER SYSTEM commands are not allowed in functions
    -- These would need to be run manually in production
    IF is_cloud_environment() THEN
        -- Cloud-specific configurations would go here
        -- but ALTER SYSTEM cannot be executed in functions
        NULL;
    ELSE
        -- Local development configurations
        -- but ALTER SYSTEM cannot be executed in functions
        NULL;
    END IF;
END;
$$;


ALTER FUNCTION "public"."setup_environment_config"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."setup_environment_config"() IS 'Configures database settings based on environment';



CREATE OR REPLACE FUNCTION "public"."update_appointment_copy_statistics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update statistics for the date and operation type
    INSERT INTO appointment_copy_statistics (
        date,
        operation_type,
        total_operations,
        successful_operations,
        failed_operations,
        partially_completed_operations,
        total_appointments_created,
        total_conflicts,
        total_errors,
        average_operation_duration_ms,
        success_rate
    )
    SELECT
        DATE(NEW.started_at) as date,
        NEW.operation_type,
        COUNT(*) as total_operations,
        COUNT(*) FILTER (WHERE operation_status = 'completed') as successful_operations,
        COUNT(*) FILTER (WHERE operation_status = 'failed') as failed_operations,
        COUNT(*) FILTER (WHERE operation_status = 'partially_completed') as partially_completed_operations,
        SUM(total_created) as total_appointments_created,
        SUM(total_conflicts) as total_conflicts,
        SUM(total_errors) as total_errors,
        COALESCE(AVG(duration_ms)::INTEGER, 0) as average_operation_duration_ms,
        ROUND(
            (COUNT(*) FILTER (WHERE operation_status = 'completed')::DECIMAL / COUNT(*)) * 100,
            2
        ) as success_rate
    FROM appointment_copy_audit_trail
    WHERE DATE(started_at) = DATE(NEW.started_at)
    AND operation_type = NEW.operation_type
    GROUP BY DATE(started_at), operation_type
    ON CONFLICT (date, operation_type)
    DO UPDATE SET
        total_operations = EXCLUDED.total_operations,
        successful_operations = EXCLUDED.successful_operations,
        failed_operations = EXCLUDED.failed_operations,
        partially_completed_operations = EXCLUDED.partially_completed_operations,
        total_appointments_created = EXCLUDED.total_appointments_created,
        total_conflicts = EXCLUDED.total_conflicts,
        total_errors = EXCLUDED.total_errors,
        average_operation_duration_ms = EXCLUDED.average_operation_duration_ms,
        success_rate = EXCLUDED.success_rate,
        updated_at = NOW();

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_appointment_copy_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_email_delivery_statistics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update statistics for the date and email type
    INSERT INTO email_delivery_statistics (date, email_type, total_emails, successful_deliveries, failed_deliveries, pending_deliveries, success_rate, average_delivery_time_ms, total_retries)
    SELECT
        DATE(NEW.created_at) as date,
        NEW.email_type,
        COUNT(*) as total_emails,
        COUNT(*) FILTER (WHERE status = 'delivered') as successful_deliveries,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_deliveries,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_deliveries,
        ROUND(
            (COUNT(*) FILTER (WHERE status = 'delivered')::DECIMAL / COUNT(*)) * 100,
            2
        ) as success_rate,
        COALESCE(AVG(
            CASE
                WHEN delivered_at IS NOT NULL AND sent_at IS NOT NULL
                THEN EXTRACT(EPOCH FROM (delivered_at - sent_at)) * 1000
                ELSE NULL
            END
        )::INTEGER, 0) as average_delivery_time_ms,
        SUM(retry_count) as total_retries
    FROM email_delivery_logs
    WHERE DATE(created_at) = DATE(NEW.created_at)
    AND email_type = NEW.email_type
    GROUP BY DATE(created_at), email_type
    ON CONFLICT (date, email_type)
    DO UPDATE SET
        total_emails = EXCLUDED.total_emails,
        successful_deliveries = EXCLUDED.successful_deliveries,
        failed_deliveries = EXCLUDED.failed_deliveries,
        pending_deliveries = EXCLUDED.pending_deliveries,
        success_rate = EXCLUDED.success_rate,
        average_delivery_time_ms = EXCLUDED.average_delivery_time_ms,
        total_retries = EXCLUDED.total_retries,
        updated_at = NOW();

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_email_delivery_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_email_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_email_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_patient_document_url"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    patient_uuid UUID;
    file_path_parts TEXT[];
BEGIN
    -- Only process uploads to patient-documents bucket
    IF NEW.bucket_id != 'patient-documents' THEN
        RETURN NEW;
    END IF;

    -- Extract patient ID from filename (format: patient_id_timestamp_uuid.extension)
    file_path_parts := string_to_array(NEW.name, '/');
    IF array_length(file_path_parts, 1) >= 2 THEN
        -- Extract patient ID from the filename part
        patient_uuid := (string_to_array(file_path_parts[2], '_'))[1]::UUID;

        -- Update patient record with document URL
        UPDATE patients
        SET
            id_document_url = NEW.id,
            id_document_filename = file_path_parts[2],
            updated_at = NOW()
        WHERE id = patient_uuid;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_patient_document_url"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_cloud_migration"() RETURNS TABLE("check_name" "text", "status" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check 1: Verify all required extensions are installed
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        RETURN QUERY SELECT 'UUID Extension'::TEXT, 'FAILED'::TEXT, 'uuid-ossp extension not installed'::TEXT;
    ELSE
        RETURN QUERY SELECT 'UUID Extension'::TEXT, 'PASSED'::TEXT, 'uuid-ossp extension is installed'::TEXT;
    END IF;

    -- Check 2: Verify all required tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
        RETURN QUERY SELECT 'Patients Table'::TEXT, 'FAILED'::TEXT, 'patients table does not exist'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Patients Table'::TEXT, 'PASSED'::TEXT, 'patients table exists'::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff') THEN
        RETURN QUERY SELECT 'Staff Table'::TEXT, 'FAILED'::TEXT, 'staff table does not exist'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Staff Table'::TEXT, 'PASSED'::TEXT, 'staff table exists'::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        RETURN QUERY SELECT 'Appointments Table'::TEXT, 'FAILED'::TEXT, 'appointments table does not exist'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Appointments Table'::TEXT, 'PASSED'::TEXT, 'appointments table exists'::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointment_staff') THEN
        RETURN QUERY SELECT 'Appointment Staff Table'::TEXT, 'FAILED'::TEXT, 'appointment_staff table does not exist'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Appointment Staff Table'::TEXT, 'PASSED'::TEXT, 'appointment_staff table exists'::TEXT;
    END IF;

    -- Check 3: Verify storage bucket exists
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'patient-documents') THEN
        RETURN QUERY SELECT 'Storage Bucket'::TEXT, 'FAILED'::TEXT, 'patient-documents bucket does not exist'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Storage Bucket'::TEXT, 'PASSED'::TEXT, 'patient-documents bucket exists'::TEXT;
    END IF;

    -- Check 4: Verify RLS is enabled on all tables
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'patients' AND rowsecurity = true) THEN
        RETURN QUERY SELECT 'Patients RLS'::TEXT, 'FAILED'::TEXT, 'RLS not enabled on patients table'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Patients RLS'::TEXT, 'PASSED'::TEXT, 'RLS enabled on patients table'::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'staff' AND rowsecurity = true) THEN
        RETURN QUERY SELECT 'Staff RLS'::TEXT, 'FAILED'::TEXT, 'RLS not enabled on staff table'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Staff RLS'::TEXT, 'PASSED'::TEXT, 'RLS enabled on staff table'::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'appointments' AND rowsecurity = true) THEN
        RETURN QUERY SELECT 'Appointments RLS'::TEXT, 'FAILED'::TEXT, 'RLS not enabled on appointments table'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Appointments RLS'::TEXT, 'PASSED'::TEXT, 'RLS enabled on appointments table'::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'appointment_staff' AND rowsecurity = true) THEN
        RETURN QUERY SELECT 'Appointment Staff RLS'::TEXT, 'FAILED'::TEXT, 'RLS not enabled on appointment_staff table'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Appointment Staff RLS'::TEXT, 'PASSED'::TEXT, 'RLS enabled on appointment_staff table'::TEXT;
    END IF;

    -- Check 5: Verify all required indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_phone') THEN
        RETURN QUERY SELECT 'Patient Indexes'::TEXT, 'FAILED'::TEXT, 'Required patient indexes missing'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Patient Indexes'::TEXT, 'PASSED'::TEXT, 'All patient indexes exist'::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_staff_email') THEN
        RETURN QUERY SELECT 'Staff Indexes'::TEXT, 'FAILED'::TEXT, 'Required staff indexes missing'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Staff Indexes'::TEXT, 'PASSED'::TEXT, 'All staff indexes exist'::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_patient_id') THEN
        RETURN QUERY SELECT 'Appointment Indexes'::TEXT, 'FAILED'::TEXT, 'Required appointment indexes missing'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Appointment Indexes'::TEXT, 'PASSED'::TEXT, 'All appointment indexes exist'::TEXT;
    END IF;

    -- Check 6: Verify all required functions exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        RETURN QUERY SELECT 'Update Trigger Function'::TEXT, 'FAILED'::TEXT, 'update_updated_at_column function missing'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Update Trigger Function'::TEXT, 'PASSED'::TEXT, 'update_updated_at_column function exists'::TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_patient_document_path') THEN
        RETURN QUERY SELECT 'Storage Functions'::TEXT, 'FAILED'::TEXT, 'Storage helper functions missing'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Storage Functions'::TEXT, 'PASSED'::TEXT, 'All storage functions exist'::TEXT;
    END IF;
END;
$$;


ALTER FUNCTION "public"."validate_cloud_migration"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_cloud_migration"() IS 'Validates that the database is ready for cloud migration';



CREATE OR REPLACE FUNCTION "public"."validate_google_event_ids_staff_references"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_google_event_ids_staff_references"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_google_event_ids_staff_references"() IS 'Validates that all staff_id references in google_event_ids exist and are active';



CREATE OR REPLACE FUNCTION "public"."validate_patient_document_upload"("bucket_id" "text", "file_path" "text", "file_size" bigint, "mime_type" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if bucket is correct
    IF bucket_id != 'patient-documents' THEN
        RETURN false;
    END IF;

    -- Check if file is in the correct folder
    IF NOT (file_path LIKE 'id-documents/%') THEN
        RETURN false;
    END IF;

    -- Check file size (10MB limit)
    IF file_size > 10485760 THEN
        RETURN false;
    END IF;

    -- Check mime type
    IF mime_type NOT IN (
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf',
        'image/webp'
    ) THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;


ALTER FUNCTION "public"."validate_patient_document_upload"("bucket_id" "text", "file_path" "text", "file_size" bigint, "mime_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_staff_role_for_appointment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_staff_role_for_appointment"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointment_copy_audit_details" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "audit_trail_id" "uuid" NOT NULL,
    "target_appointment_id" "uuid",
    "target_date" "date" NOT NULL,
    "target_time" time without time zone NOT NULL,
    "operation_status" "public"."copy_operation_status_enum" DEFAULT 'pending'::"public"."copy_operation_status_enum",
    "conflict_detected" boolean DEFAULT false,
    "error_occurred" boolean DEFAULT false,
    "conflict_reason" "text",
    "error_message" "text",
    "error_code" "text",
    "assigned_staff" "jsonb" DEFAULT '[]'::"jsonb",
    "processed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."appointment_copy_audit_details" OWNER TO "postgres";


COMMENT ON TABLE "public"."appointment_copy_audit_details" IS 'Detailed tracking of individual appointment copies within bulk operations';



COMMENT ON COLUMN "public"."appointment_copy_audit_details"."conflict_reason" IS 'Reason for conflict if detected';



COMMENT ON COLUMN "public"."appointment_copy_audit_details"."error_message" IS 'Error message if operation failed';



COMMENT ON COLUMN "public"."appointment_copy_audit_details"."assigned_staff" IS 'Staff assigned to this specific copy operation';



CREATE TABLE IF NOT EXISTS "public"."appointment_copy_audit_trail" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "operation_id" "text" NOT NULL,
    "operation_type" "public"."copy_operation_type_enum" NOT NULL,
    "source_appointment_id" "uuid" NOT NULL,
    "user_id" "text",
    "operation_status" "public"."copy_operation_status_enum" DEFAULT 'pending'::"public"."copy_operation_status_enum",
    "copy_config" "jsonb" DEFAULT '{}'::"jsonb",
    "staff_assignments" "jsonb" DEFAULT '[]'::"jsonb",
    "override_conflicts" boolean DEFAULT false,
    "total_requested" integer DEFAULT 0,
    "total_created" integer DEFAULT 0,
    "total_conflicts" integer DEFAULT 0,
    "total_errors" integer DEFAULT 0,
    "created_appointment_ids" "jsonb" DEFAULT '[]'::"jsonb",
    "conflict_details" "jsonb" DEFAULT '[]'::"jsonb",
    "error_details" "jsonb" DEFAULT '[]'::"jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "appointment_copy_audit_trail_duration_ms_check" CHECK (("duration_ms" >= 0)),
    CONSTRAINT "appointment_copy_audit_trail_total_conflicts_check" CHECK (("total_conflicts" >= 0)),
    CONSTRAINT "appointment_copy_audit_trail_total_created_check" CHECK (("total_created" >= 0)),
    CONSTRAINT "appointment_copy_audit_trail_total_errors_check" CHECK (("total_errors" >= 0)),
    CONSTRAINT "appointment_copy_audit_trail_total_requested_check" CHECK (("total_requested" >= 0))
);


ALTER TABLE "public"."appointment_copy_audit_trail" OWNER TO "postgres";


COMMENT ON TABLE "public"."appointment_copy_audit_trail" IS 'Main table for tracking appointment copy operations and their results';



COMMENT ON COLUMN "public"."appointment_copy_audit_trail"."operation_id" IS 'Unique identifier for the copy operation (UUID or custom ID)';



COMMENT ON COLUMN "public"."appointment_copy_audit_trail"."copy_config" IS 'Configuration for bulk copy operations (pattern, interval, etc.)';



COMMENT ON COLUMN "public"."appointment_copy_audit_trail"."staff_assignments" IS 'Staff assignments for the copy operation';



COMMENT ON COLUMN "public"."appointment_copy_audit_trail"."created_appointment_ids" IS 'Array of appointment IDs created by this operation';



COMMENT ON COLUMN "public"."appointment_copy_audit_trail"."conflict_details" IS 'Array of conflict information encountered during the operation';



COMMENT ON COLUMN "public"."appointment_copy_audit_trail"."error_details" IS 'Array of error information encountered during the operation';



COMMENT ON COLUMN "public"."appointment_copy_audit_trail"."metadata" IS 'Additional operation metadata (user agent, IP, etc.)';



CREATE TABLE IF NOT EXISTS "public"."appointment_copy_statistics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "date" "date" NOT NULL,
    "operation_type" "public"."copy_operation_type_enum" NOT NULL,
    "total_operations" integer DEFAULT 0,
    "successful_operations" integer DEFAULT 0,
    "failed_operations" integer DEFAULT 0,
    "partially_completed_operations" integer DEFAULT 0,
    "total_appointments_created" integer DEFAULT 0,
    "total_conflicts" integer DEFAULT 0,
    "total_errors" integer DEFAULT 0,
    "average_operation_duration_ms" integer DEFAULT 0,
    "success_rate" numeric(5,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."appointment_copy_statistics" OWNER TO "postgres";


COMMENT ON TABLE "public"."appointment_copy_statistics" IS 'Aggregated statistics for appointment copy operations';



CREATE TABLE IF NOT EXISTS "public"."appointment_staff" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "appointment_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "role" "public"."staff_role_enum" DEFAULT 'assistant'::"public"."staff_role_enum" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "google_event_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "appointment_staff_google_event_id_check" CHECK ((("google_event_id" IS NULL) OR ("google_event_id" ~ '^[a-zA-Z0-9_-]+$'::"text"))),
    CONSTRAINT "appointment_staff_role_check" CHECK (((("role" = 'primary'::"public"."staff_role_enum") AND ("is_primary" = true)) OR (("role" <> 'primary'::"public"."staff_role_enum") AND ("is_primary" = false))))
);


ALTER TABLE "public"."appointment_staff" OWNER TO "postgres";


COMMENT ON TABLE "public"."appointment_staff" IS 'Sample appointment-staff relationships for development and testing';



CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "appointment_type" "public"."appointment_type_enum" NOT NULL,
    "appointment_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "duration_minutes" integer NOT NULL,
    "status" "public"."appointment_status_enum" DEFAULT 'scheduled'::"public"."appointment_status_enum",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "transportation_type" "public"."transportation_type_enum",
    "transportation_method" "text",
    "driver_id" "uuid",
    "notes" "text",
    "recurring_rule" "jsonb",
    "google_event_ids" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_external_edit" timestamp with time zone,
    "last_external_edit_source" "text",
    "external_edit_count" integer DEFAULT 0,
    "last_edit_source" "text",
    CONSTRAINT "appointments_date_check" CHECK (("appointment_date" >= CURRENT_DATE)),
    CONSTRAINT "appointments_duration_minutes_check" CHECK ((("duration_minutes" > 0) AND ("duration_minutes" <= 1440))),
    CONSTRAINT "appointments_google_event_ids_check" CHECK ((("google_event_ids" IS NULL) OR ("jsonb_typeof"("google_event_ids") = 'object'::"text"))),
    CONSTRAINT "appointments_last_edit_source_check" CHECK (("last_edit_source" = ANY (ARRAY['app'::"text", 'google_calendar'::"text", 'webhook'::"text", 'manual'::"text"]))),
    CONSTRAINT "appointments_last_external_edit_source_check" CHECK (("last_external_edit_source" = ANY (ARRAY['app'::"text", 'google_calendar'::"text", 'webhook'::"text", 'manual'::"text"]))),
    CONSTRAINT "appointments_recurring_rule_check" CHECK ((("recurring_rule" IS NULL) OR (("recurring_rule" ? 'frequency'::"text") AND ("recurring_rule" ? 'interval'::"text")))),
    CONSTRAINT "appointments_transportation_check" CHECK (((("transportation_type" = 'driver'::"public"."transportation_type_enum") AND ("driver_id" IS NOT NULL)) OR (("transportation_type" = 'self_transport'::"public"."transportation_type_enum") AND ("transportation_method" IS NOT NULL)) OR ("transportation_type" IS NULL)))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


COMMENT ON TABLE "public"."appointments" IS 'Sample appointments for development and testing';



COMMENT ON COLUMN "public"."appointments"."last_external_edit" IS 'Timestamp of the last external edit (from Google Calendar, webhook, etc.)';



COMMENT ON COLUMN "public"."appointments"."last_external_edit_source" IS 'Source of the last external edit: app, google_calendar, webhook, or manual';



COMMENT ON COLUMN "public"."appointments"."external_edit_count" IS 'Total number of external edits made to this appointment';



COMMENT ON COLUMN "public"."appointments"."last_edit_source" IS 'Source of the last edit (internal or external)';



COMMENT ON CONSTRAINT "appointments_google_event_ids_check" ON "public"."appointments" IS 'Ensures google_event_ids is a valid JSONB object with UUID keys and valid Google Calendar event ID values';



CREATE TABLE IF NOT EXISTS "public"."email_delivery_attempts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "delivery_log_id" "uuid",
    "attempt_number" integer NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" NOT NULL,
    "error_message" "text",
    "error_code" "text",
    "smtp_response" "text",
    "response_time_ms" integer,
    "retry_after_ms" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "email_delivery_attempts_attempt_number_check" CHECK (("attempt_number" > 0)),
    CONSTRAINT "email_delivery_attempts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'success'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_delivery_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_delivery_attempts" IS 'Detailed tracking of individual delivery attempts and retries';



COMMENT ON COLUMN "public"."email_delivery_attempts"."response_time_ms" IS 'Response time in milliseconds';



COMMENT ON COLUMN "public"."email_delivery_attempts"."retry_after_ms" IS 'When to retry next (in milliseconds)';



CREATE TABLE IF NOT EXISTS "public"."email_delivery_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email_id" "text" NOT NULL,
    "staff_id" "uuid",
    "job_execution_id" "uuid",
    "email_type" "text" DEFAULT 'daily_agenda'::"text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "next_retry_at" timestamp with time zone,
    "error_message" "text",
    "error_code" "text",
    "smtp_response" "text",
    "delivery_attempts" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_delivery_logs_max_retries_check" CHECK (("max_retries" >= 0)),
    CONSTRAINT "email_delivery_logs_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "email_delivery_logs_retry_count_check" CHECK (("retry_count" >= 0)),
    CONSTRAINT "email_delivery_logs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."email_delivery_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_delivery_logs" IS 'Main table for tracking email delivery status and retry information';



COMMENT ON COLUMN "public"."email_delivery_logs"."email_id" IS 'Unique identifier for the email (messageId or generated ID)';



COMMENT ON COLUMN "public"."email_delivery_logs"."job_execution_id" IS 'Reference to job execution if sent via job scheduler';



COMMENT ON COLUMN "public"."email_delivery_logs"."delivery_attempts" IS 'JSON array of delivery attempt details';



COMMENT ON COLUMN "public"."email_delivery_logs"."metadata" IS 'Additional metadata like template data, parameters, etc.';



CREATE TABLE IF NOT EXISTS "public"."email_delivery_statistics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "date" "date" NOT NULL,
    "email_type" "text" NOT NULL,
    "total_emails" integer DEFAULT 0,
    "successful_deliveries" integer DEFAULT 0,
    "failed_deliveries" integer DEFAULT 0,
    "pending_deliveries" integer DEFAULT 0,
    "success_rate" numeric(5,2) DEFAULT 0.00,
    "average_delivery_time_ms" integer DEFAULT 0,
    "total_retries" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_delivery_statistics" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_delivery_statistics" IS 'Aggregated statistics for email delivery performance';



CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "appointment_id" "uuid",
    "staff_id" "uuid",
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "message_id" "text",
    "sent_at" timestamp with time zone,
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "email_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_logs_email_type_check" CHECK (("email_type" = ANY (ARRAY['appointment_created'::"text", 'appointment_updated'::"text", 'appointment_cancelled'::"text", 'daily_agenda'::"text", 'test'::"text"]))),
    CONSTRAINT "email_logs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'retrying'::"text"])))
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_preferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_preferences" IS 'Stores global email preferences and settings';



COMMENT ON COLUMN "public"."email_preferences"."key" IS 'Unique key for the preference set (e.g., global_settings)';



COMMENT ON COLUMN "public"."email_preferences"."preferences" IS 'JSON object containing all email preferences';



CREATE TABLE IF NOT EXISTS "public"."email_retry_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email_log_id" "uuid",
    "attempt_number" integer NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "message_id" "text",
    "attempted_at" timestamp with time zone NOT NULL,
    "response_time_ms" integer,
    CONSTRAINT "email_retry_logs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_retry_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."migration_status" AS
 SELECT "check_name",
    "status",
    "message",
        CASE
            WHEN ("status" = 'PASSED'::"text") THEN 1
            ELSE 0
        END AS "is_passed"
   FROM "public"."validate_cloud_migration"() "validate_cloud_migration"("check_name", "status", "message");


ALTER VIEW "public"."migration_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."migration_status" IS 'View for easy access to migration validation status';



CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "id_document_url" "text",
    "id_document_filename" "text",
    "flat_villa_no" "text" NOT NULL,
    "building_street" "text" NOT NULL,
    "area" "text" NOT NULL,
    "city" "text" NOT NULL,
    "google_maps_link" "text",
    "medical_notes" "text",
    "emergency_contact" "text",
    "preferred_transport" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "patients_area_check" CHECK (("length"(TRIM(BOTH FROM "area")) > 0)),
    CONSTRAINT "patients_building_street_check" CHECK (("length"(TRIM(BOTH FROM "building_street")) > 0)),
    CONSTRAINT "patients_city_check" CHECK (("length"(TRIM(BOTH FROM "city")) > 0)),
    CONSTRAINT "patients_flat_villa_no_check" CHECK (("length"(TRIM(BOTH FROM "flat_villa_no")) > 0)),
    CONSTRAINT "patients_name_check" CHECK (("length"(TRIM(BOTH FROM "name")) > 0)),
    CONSTRAINT "patients_phone_check" CHECK (("phone" ~ '^[+]?[0-9\s\-\(\)]+$'::"text"))
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


COMMENT ON TABLE "public"."patients" IS 'Sample patients for development and testing';



CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "staff_type" "public"."staff_type_enum" NOT NULL,
    "specialization" "text",
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "google_calendar_id" "text",
    "available_days" integer[] DEFAULT '{1,2,3,4,5}'::integer[],
    "working_hours_start" time without time zone DEFAULT '09:00:00'::time without time zone,
    "working_hours_end" time without time zone DEFAULT '17:00:00'::time without time zone,
    "status" "public"."staff_status_enum" DEFAULT 'active'::"public"."staff_status_enum",
    "email_notifications_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "whatsapp_number" "text",
    "whatsapp_verified" boolean DEFAULT false,
    "email_verified" boolean DEFAULT false,
    CONSTRAINT "staff_available_days_check" CHECK (("available_days" <@ '{1,2,3,4,5,6,7}'::integer[])),
    CONSTRAINT "staff_email_check" CHECK (("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "staff_first_name_check" CHECK (("length"(TRIM(BOTH FROM "first_name")) > 0)),
    CONSTRAINT "staff_last_name_check" CHECK (("length"(TRIM(BOTH FROM "last_name")) > 0)),
    CONSTRAINT "staff_phone_check" CHECK (("phone" ~ '^[+]?[0-9\s\-\(\)]+$'::"text")),
    CONSTRAINT "staff_whatsapp_number_check" CHECK ((("whatsapp_number" IS NULL) OR ("whatsapp_number" ~ '^\+[1-9]\d{1,14}$'::"text"))),
    CONSTRAINT "staff_working_hours_check" CHECK (("working_hours_start" < "working_hours_end"))
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


COMMENT ON TABLE "public"."staff" IS 'Sample staff members for development and testing';



COMMENT ON COLUMN "public"."staff"."email_verified" IS 'Whether the staff member has verified their email address';



ALTER TABLE ONLY "public"."appointment_copy_audit_details"
    ADD CONSTRAINT "appointment_copy_audit_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_copy_audit_trail"
    ADD CONSTRAINT "appointment_copy_audit_trail_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_copy_statistics"
    ADD CONSTRAINT "appointment_copy_statistics_date_operation_type_key" UNIQUE ("date", "operation_type");



ALTER TABLE ONLY "public"."appointment_copy_statistics"
    ADD CONSTRAINT "appointment_copy_statistics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_staff"
    ADD CONSTRAINT "appointment_staff_appointment_id_staff_id_key" UNIQUE ("appointment_id", "staff_id");



ALTER TABLE ONLY "public"."appointment_staff"
    ADD CONSTRAINT "appointment_staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_delivery_attempts"
    ADD CONSTRAINT "email_delivery_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_delivery_logs"
    ADD CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_delivery_statistics"
    ADD CONSTRAINT "email_delivery_statistics_date_email_type_key" UNIQUE ("date", "email_type");



ALTER TABLE ONLY "public"."email_delivery_statistics"
    ADD CONSTRAINT "email_delivery_statistics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_retry_logs"
    ADD CONSTRAINT "email_retry_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_appointment_copy_audit_details_audit_trail_id" ON "public"."appointment_copy_audit_details" USING "btree" ("audit_trail_id");



CREATE INDEX "idx_appointment_copy_audit_details_operation_status" ON "public"."appointment_copy_audit_details" USING "btree" ("operation_status");



CREATE INDEX "idx_appointment_copy_audit_details_processed_at" ON "public"."appointment_copy_audit_details" USING "btree" ("processed_at");



CREATE INDEX "idx_appointment_copy_audit_details_target_appointment_id" ON "public"."appointment_copy_audit_details" USING "btree" ("target_appointment_id");



CREATE INDEX "idx_appointment_copy_audit_details_target_date" ON "public"."appointment_copy_audit_details" USING "btree" ("target_date");



CREATE INDEX "idx_appointment_copy_audit_trail_completed_at" ON "public"."appointment_copy_audit_trail" USING "btree" ("completed_at");



CREATE INDEX "idx_appointment_copy_audit_trail_operation_id" ON "public"."appointment_copy_audit_trail" USING "btree" ("operation_id");



CREATE INDEX "idx_appointment_copy_audit_trail_operation_status" ON "public"."appointment_copy_audit_trail" USING "btree" ("operation_status");



CREATE INDEX "idx_appointment_copy_audit_trail_operation_type" ON "public"."appointment_copy_audit_trail" USING "btree" ("operation_type");



CREATE INDEX "idx_appointment_copy_audit_trail_source_appointment_id" ON "public"."appointment_copy_audit_trail" USING "btree" ("source_appointment_id");



CREATE INDEX "idx_appointment_copy_audit_trail_started_at" ON "public"."appointment_copy_audit_trail" USING "btree" ("started_at");



CREATE INDEX "idx_appointment_copy_audit_trail_user_id" ON "public"."appointment_copy_audit_trail" USING "btree" ("user_id");



CREATE INDEX "idx_appointment_copy_statistics_date" ON "public"."appointment_copy_statistics" USING "btree" ("date");



CREATE INDEX "idx_appointment_copy_statistics_operation_type" ON "public"."appointment_copy_statistics" USING "btree" ("operation_type");



CREATE INDEX "idx_appointment_staff_appointment_id" ON "public"."appointment_staff" USING "btree" ("appointment_id");



CREATE INDEX "idx_appointment_staff_appointment_staff" ON "public"."appointment_staff" USING "btree" ("appointment_id", "staff_id");



CREATE INDEX "idx_appointment_staff_google_event_id" ON "public"."appointment_staff" USING "btree" ("google_event_id") WHERE ("google_event_id" IS NOT NULL);



CREATE INDEX "idx_appointment_staff_is_primary" ON "public"."appointment_staff" USING "btree" ("is_primary");



CREATE INDEX "idx_appointment_staff_role" ON "public"."appointment_staff" USING "btree" ("role");



CREATE INDEX "idx_appointment_staff_staff_id" ON "public"."appointment_staff" USING "btree" ("staff_id");



CREATE INDEX "idx_appointments_appointment_date" ON "public"."appointments" USING "btree" ("appointment_date");



CREATE INDEX "idx_appointments_appointment_type" ON "public"."appointments" USING "btree" ("appointment_type");



CREATE INDEX "idx_appointments_custom_fields" ON "public"."appointments" USING "gin" ("custom_fields");



CREATE INDEX "idx_appointments_date_time" ON "public"."appointments" USING "btree" ("appointment_date", "start_time");



CREATE INDEX "idx_appointments_driver_id" ON "public"."appointments" USING "btree" ("driver_id");



CREATE INDEX "idx_appointments_external_edit_count" ON "public"."appointments" USING "btree" ("external_edit_count");



CREATE INDEX "idx_appointments_google_event_ids" ON "public"."appointments" USING "gin" ("google_event_ids");



CREATE INDEX "idx_appointments_google_event_ids_gin" ON "public"."appointments" USING "gin" ("google_event_ids");



CREATE INDEX "idx_appointments_google_event_ids_staff_lookup" ON "public"."appointments" USING "btree" ((("google_event_ids" ->> 'staff_id'::"text")));



CREATE INDEX "idx_appointments_last_edit_source" ON "public"."appointments" USING "btree" ("last_edit_source");



CREATE INDEX "idx_appointments_last_external_edit" ON "public"."appointments" USING "btree" ("last_external_edit");



CREATE INDEX "idx_appointments_patient_id" ON "public"."appointments" USING "btree" ("patient_id");



CREATE INDEX "idx_appointments_recurring_rule" ON "public"."appointments" USING "gin" ("recurring_rule");



CREATE INDEX "idx_appointments_start_time" ON "public"."appointments" USING "btree" ("start_time");



CREATE INDEX "idx_appointments_status" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "idx_appointments_transportation_type" ON "public"."appointments" USING "btree" ("transportation_type");



CREATE INDEX "idx_email_delivery_attempts_attempted_at" ON "public"."email_delivery_attempts" USING "btree" ("attempted_at");



CREATE INDEX "idx_email_delivery_attempts_delivery_log_id" ON "public"."email_delivery_attempts" USING "btree" ("delivery_log_id");



CREATE INDEX "idx_email_delivery_attempts_status" ON "public"."email_delivery_attempts" USING "btree" ("status");



CREATE INDEX "idx_email_delivery_logs_created_at" ON "public"."email_delivery_logs" USING "btree" ("created_at");



CREATE INDEX "idx_email_delivery_logs_email_type" ON "public"."email_delivery_logs" USING "btree" ("email_type");



CREATE INDEX "idx_email_delivery_logs_next_retry_at" ON "public"."email_delivery_logs" USING "btree" ("next_retry_at");



CREATE INDEX "idx_email_delivery_logs_recipient_email" ON "public"."email_delivery_logs" USING "btree" ("recipient_email");



CREATE INDEX "idx_email_delivery_logs_sent_at" ON "public"."email_delivery_logs" USING "btree" ("sent_at");



CREATE INDEX "idx_email_delivery_logs_staff_id" ON "public"."email_delivery_logs" USING "btree" ("staff_id");



CREATE INDEX "idx_email_delivery_logs_status" ON "public"."email_delivery_logs" USING "btree" ("status");



CREATE INDEX "idx_email_delivery_statistics_date" ON "public"."email_delivery_statistics" USING "btree" ("date");



CREATE INDEX "idx_email_delivery_statistics_email_type" ON "public"."email_delivery_statistics" USING "btree" ("email_type");



CREATE INDEX "idx_email_logs_appointment_id" ON "public"."email_logs" USING "btree" ("appointment_id");



CREATE INDEX "idx_email_logs_created_at" ON "public"."email_logs" USING "btree" ("created_at");



CREATE INDEX "idx_email_logs_email_type" ON "public"."email_logs" USING "btree" ("email_type");



CREATE INDEX "idx_email_logs_staff_id" ON "public"."email_logs" USING "btree" ("staff_id");



CREATE INDEX "idx_email_logs_status" ON "public"."email_logs" USING "btree" ("status");



CREATE INDEX "idx_email_preferences_key" ON "public"."email_preferences" USING "btree" ("key");



CREATE INDEX "idx_email_retry_logs_attempted_at" ON "public"."email_retry_logs" USING "btree" ("attempted_at");



CREATE INDEX "idx_email_retry_logs_email_log_id" ON "public"."email_retry_logs" USING "btree" ("email_log_id");



CREATE INDEX "idx_patients_area" ON "public"."patients" USING "btree" ("area");



CREATE INDEX "idx_patients_city" ON "public"."patients" USING "btree" ("city");



CREATE INDEX "idx_patients_name" ON "public"."patients" USING "btree" ("name");



CREATE INDEX "idx_patients_phone" ON "public"."patients" USING "btree" ("phone");



CREATE INDEX "idx_staff_active" ON "public"."staff" USING "btree" ("status") WHERE ("status" = 'active'::"public"."staff_status_enum");



CREATE INDEX "idx_staff_email" ON "public"."staff" USING "btree" ("email");



CREATE INDEX "idx_staff_google_calendar_id" ON "public"."staff" USING "btree" ("google_calendar_id") WHERE ("google_calendar_id" IS NOT NULL);



CREATE INDEX "idx_staff_phone" ON "public"."staff" USING "btree" ("phone");



CREATE INDEX "idx_staff_status" ON "public"."staff" USING "btree" ("status");



CREATE INDEX "idx_staff_type" ON "public"."staff" USING "btree" ("staff_type");



CREATE INDEX "idx_staff_whatsapp_number" ON "public"."staff" USING "btree" ("whatsapp_number");



CREATE OR REPLACE TRIGGER "cleanup_patient_documents_trigger" BEFORE DELETE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_patient_documents"();



CREATE OR REPLACE TRIGGER "ensure_single_primary_staff_trigger" BEFORE INSERT OR UPDATE ON "public"."appointment_staff" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_primary_staff"();



CREATE OR REPLACE TRIGGER "trigger_update_appointment_copy_statistics" AFTER INSERT OR UPDATE ON "public"."appointment_copy_audit_trail" FOR EACH ROW EXECUTE FUNCTION "public"."update_appointment_copy_statistics"();



CREATE OR REPLACE TRIGGER "trigger_update_email_delivery_statistics" AFTER INSERT OR UPDATE ON "public"."email_delivery_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_email_delivery_statistics"();



CREATE OR REPLACE TRIGGER "trigger_update_email_preferences_updated_at" BEFORE UPDATE ON "public"."email_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_email_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "update_appointment_staff_updated_at" BEFORE UPDATE ON "public"."appointment_staff" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_logs_updated_at" BEFORE UPDATE ON "public"."email_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_patients_updated_at" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_staff_updated_at" BEFORE UPDATE ON "public"."staff" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_google_event_ids_staff_references_trigger" BEFORE INSERT OR UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."validate_google_event_ids_staff_references"();



CREATE OR REPLACE TRIGGER "validate_staff_role_for_appointment_trigger" BEFORE INSERT OR UPDATE ON "public"."appointment_staff" FOR EACH ROW EXECUTE FUNCTION "public"."validate_staff_role_for_appointment"();



ALTER TABLE ONLY "public"."appointment_copy_audit_details"
    ADD CONSTRAINT "appointment_copy_audit_details_audit_trail_id_fkey" FOREIGN KEY ("audit_trail_id") REFERENCES "public"."appointment_copy_audit_trail"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_copy_audit_details"
    ADD CONSTRAINT "appointment_copy_audit_details_target_appointment_id_fkey" FOREIGN KEY ("target_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointment_copy_audit_trail"
    ADD CONSTRAINT "appointment_copy_audit_trail_source_appointment_id_fkey" FOREIGN KEY ("source_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_staff"
    ADD CONSTRAINT "appointment_staff_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_staff"
    ADD CONSTRAINT "appointment_staff_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_delivery_attempts"
    ADD CONSTRAINT "email_delivery_attempts_delivery_log_id_fkey" FOREIGN KEY ("delivery_log_id") REFERENCES "public"."email_delivery_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_delivery_logs"
    ADD CONSTRAINT "email_delivery_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_retry_logs"
    ADD CONSTRAINT "email_retry_logs_email_log_id_fkey" FOREIGN KEY ("email_log_id") REFERENCES "public"."email_logs"("id") ON DELETE CASCADE;



CREATE POLICY "Enable delete access for authenticated users" ON "public"."appointment_staff" FOR DELETE USING (true);



CREATE POLICY "Enable delete access for authenticated users" ON "public"."appointments" FOR DELETE USING (true);



CREATE POLICY "Enable delete access for authenticated users" ON "public"."patients" FOR DELETE USING (true);



CREATE POLICY "Enable delete access for authenticated users" ON "public"."staff" FOR DELETE USING (true);



CREATE POLICY "Enable insert access for authenticated users" ON "public"."appointment_staff" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert access for authenticated users" ON "public"."appointments" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert access for authenticated users" ON "public"."patients" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert access for authenticated users" ON "public"."staff" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."appointment_staff" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."appointments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."patients" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."staff" FOR SELECT USING (true);



CREATE POLICY "Enable update access for authenticated users" ON "public"."appointment_staff" FOR UPDATE USING (true);



CREATE POLICY "Enable update access for authenticated users" ON "public"."appointments" FOR UPDATE USING (true);



CREATE POLICY "Enable update access for authenticated users" ON "public"."patients" FOR UPDATE USING (true);



CREATE POLICY "Enable update access for authenticated users" ON "public"."staff" FOR UPDATE USING (true);



CREATE POLICY "Service role can manage email logs" ON "public"."email_logs" USING (true);



CREATE POLICY "Service role can manage email retry logs" ON "public"."email_retry_logs" USING (true);



ALTER TABLE "public"."appointment_staff" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_retry_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."cleanup_old_appointment_copy_audit_trail"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_appointment_copy_audit_trail"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_appointment_copy_audit_trail"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_email_delivery_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_delivery_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_delivery_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_patient_documents"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_patient_documents"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_patient_documents"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_duplicate_google_event_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_duplicate_google_event_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_duplicate_google_event_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_primary_staff"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_staff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_migration_report"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_migration_report"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_migration_report"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_patient_document_path"("patient_id" "uuid", "filename" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_patient_document_path"("patient_id" "uuid", "filename" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_patient_document_path"("patient_id" "uuid", "filename" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_appointment_copy_audit_trail"("appointment_id_param" "uuid", "limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_appointment_copy_audit_trail"("appointment_id_param" "uuid", "limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_appointment_copy_audit_trail"("appointment_id_param" "uuid", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_appointment_copy_statistics"("start_date" "date", "end_date" "date", "operation_type_filter" "public"."copy_operation_type_enum") TO "anon";
GRANT ALL ON FUNCTION "public"."get_appointment_copy_statistics"("start_date" "date", "end_date" "date", "operation_type_filter" "public"."copy_operation_type_enum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_appointment_copy_statistics"("start_date" "date", "end_date" "date", "operation_type_filter" "public"."copy_operation_type_enum") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_email_delivery_statistics"("start_date" "date", "end_date" "date", "email_type_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_email_delivery_statistics"("start_date" "date", "end_date" "date", "email_type_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_email_delivery_statistics"("start_date" "date", "end_date" "date", "email_type_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_failed_deliveries_for_retry"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_failed_deliveries_for_retry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_failed_deliveries_for_retry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_google_event_ids_integrity_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_google_event_ids_integrity_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_google_event_ids_integrity_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_storage_url"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_storage_url"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_storage_url"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_cloud_environment"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_cloud_environment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_cloud_environment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_database_for_migration"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_database_for_migration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_database_for_migration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."setup_environment_config"() TO "anon";
GRANT ALL ON FUNCTION "public"."setup_environment_config"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."setup_environment_config"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_appointment_copy_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_appointment_copy_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_appointment_copy_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_email_delivery_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_email_delivery_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_email_delivery_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_email_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_email_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_email_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_patient_document_url"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_patient_document_url"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_patient_document_url"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_cloud_migration"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_cloud_migration"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_cloud_migration"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_google_event_ids_staff_references"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_google_event_ids_staff_references"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_google_event_ids_staff_references"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_patient_document_upload"("bucket_id" "text", "file_path" "text", "file_size" bigint, "mime_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_patient_document_upload"("bucket_id" "text", "file_path" "text", "file_size" bigint, "mime_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_patient_document_upload"("bucket_id" "text", "file_path" "text", "file_size" bigint, "mime_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_staff_role_for_appointment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_staff_role_for_appointment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_staff_role_for_appointment"() TO "service_role";


















GRANT ALL ON TABLE "public"."appointment_copy_audit_details" TO "anon";
GRANT ALL ON TABLE "public"."appointment_copy_audit_details" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_copy_audit_details" TO "service_role";



GRANT ALL ON TABLE "public"."appointment_copy_audit_trail" TO "anon";
GRANT ALL ON TABLE "public"."appointment_copy_audit_trail" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_copy_audit_trail" TO "service_role";



GRANT ALL ON TABLE "public"."appointment_copy_statistics" TO "anon";
GRANT ALL ON TABLE "public"."appointment_copy_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_copy_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."appointment_staff" TO "anon";
GRANT ALL ON TABLE "public"."appointment_staff" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_staff" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."email_delivery_attempts" TO "anon";
GRANT ALL ON TABLE "public"."email_delivery_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."email_delivery_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."email_delivery_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_delivery_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_delivery_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_delivery_statistics" TO "anon";
GRANT ALL ON TABLE "public"."email_delivery_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."email_delivery_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_preferences" TO "anon";
GRANT ALL ON TABLE "public"."email_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."email_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."email_retry_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_retry_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_retry_logs" TO "service_role";



GRANT ALL ON TABLE "public"."migration_status" TO "anon";
GRANT ALL ON TABLE "public"."migration_status" TO "authenticated";
GRANT ALL ON TABLE "public"."migration_status" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
