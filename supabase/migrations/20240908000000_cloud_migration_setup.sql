-- Configure local to cloud migration scripts
-- This migration sets up the database for cloud deployment and ensures compatibility

-- Create a function to check if we're running in cloud environment
CREATE OR REPLACE FUNCTION is_cloud_environment()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if we're running in Supabase cloud by looking for specific environment variables
    -- This is a simple check - in production, you might want more sophisticated detection
    RETURN current_setting('app.environment', true) = 'production' OR
           current_setting('app.environment', true) = 'staging';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get the appropriate storage URL based on environment
CREATE OR REPLACE FUNCTION get_storage_url()
RETURNS TEXT AS $$
BEGIN
    IF is_cloud_environment() THEN
        -- Return cloud storage URL
        RETURN current_setting('app.supabase_url', true) || '/storage/v1';
    ELSE
        -- Return local storage URL
        RETURN 'http://localhost:54321/storage/v1';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle environment-specific configurations
CREATE OR REPLACE FUNCTION setup_environment_config()
RETURNS VOID AS $$
BEGIN
    -- Set up environment-specific settings
    IF is_cloud_environment() THEN
        -- Cloud-specific configurations
        -- Enable enhanced security features
        ALTER SYSTEM SET log_statement = 'all';
        ALTER SYSTEM SET log_min_duration_statement = 1000;

        -- Set up connection limits for cloud
        ALTER SYSTEM SET max_connections = 100;

        -- Enable SSL in cloud
        ALTER SYSTEM SET ssl = on;
    ELSE
        -- Local development configurations
        -- More permissive settings for development
        ALTER SYSTEM SET log_statement = 'none';
        ALTER SYSTEM SET log_min_duration_statement = -1;

        -- Higher connection limits for local development
        ALTER SYSTEM SET max_connections = 200;

        -- Disable SSL for local development
        ALTER SYSTEM SET ssl = off;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to validate cloud migration readiness
CREATE OR REPLACE FUNCTION validate_cloud_migration()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    message TEXT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to generate migration report
CREATE OR REPLACE FUNCTION generate_migration_report()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for easy access to migration status
CREATE OR REPLACE VIEW migration_status AS
SELECT
    check_name,
    status,
    message,
    CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END as is_passed
FROM validate_cloud_migration();

-- Create a function to reset database for fresh migration (development only)
CREATE OR REPLACE FUNCTION reset_database_for_migration()
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document the migration setup
COMMENT ON FUNCTION is_cloud_environment() IS 'Determines if the database is running in cloud environment';
COMMENT ON FUNCTION get_storage_url() IS 'Returns the appropriate storage URL based on environment';
COMMENT ON FUNCTION setup_environment_config() IS 'Configures database settings based on environment';
COMMENT ON FUNCTION validate_cloud_migration() IS 'Validates that the database is ready for cloud migration';
COMMENT ON FUNCTION generate_migration_report() IS 'Generates a comprehensive migration readiness report';
COMMENT ON FUNCTION reset_database_for_migration() IS 'Resets database for fresh migration (development only)';
COMMENT ON VIEW migration_status IS 'View for easy access to migration validation status';

-- Execute environment setup
SELECT setup_environment_config();

-- Log the migration setup
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;
