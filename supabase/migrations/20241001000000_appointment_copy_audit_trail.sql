-- Appointment Copy Audit Trail
-- This migration creates tables for tracking appointment copy operations, including single and bulk copies

-- Create copy_operation_type enum
CREATE TYPE copy_operation_type_enum AS ENUM (
  'single_copy',
  'bulk_copy'
);

-- Create copy_operation_status enum
CREATE TYPE copy_operation_status_enum AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'failed',
  'partially_completed'
);

-- Create appointment_copy_audit_trail table for tracking copy operations
CREATE TABLE appointment_copy_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id TEXT NOT NULL, -- Unique identifier for the copy operation
    operation_type copy_operation_type_enum NOT NULL,
    source_appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    user_id TEXT, -- User who performed the operation (admin identifier)
    operation_status copy_operation_status_enum DEFAULT 'pending',

    -- Operation configuration
    copy_config JSONB DEFAULT '{}', -- For bulk copy: pattern, interval, occurrences, etc.
    staff_assignments JSONB DEFAULT '[]', -- Staff assignments for the copy operation
    override_conflicts BOOLEAN DEFAULT FALSE,

    -- Results tracking
    total_requested INTEGER DEFAULT 0,
    total_created INTEGER DEFAULT 0,
    total_conflicts INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,

    -- Target appointments created
    created_appointment_ids JSONB DEFAULT '[]', -- Array of created appointment IDs

    -- Conflict and error details
    conflict_details JSONB DEFAULT '[]', -- Array of conflict information
    error_details JSONB DEFAULT '[]', -- Array of error information

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER, -- Operation duration in milliseconds

    -- Additional metadata
    metadata JSONB DEFAULT '{}', -- Additional operation metadata
    notes TEXT, -- User notes or system notes about the operation

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create appointment_copy_audit_details table for detailed tracking of individual copies
CREATE TABLE appointment_copy_audit_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_trail_id UUID NOT NULL REFERENCES appointment_copy_audit_trail(id) ON DELETE CASCADE,
    target_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    target_date DATE NOT NULL,
    target_time TIME NOT NULL,

    -- Copy operation details
    operation_status copy_operation_status_enum DEFAULT 'pending',
    conflict_detected BOOLEAN DEFAULT FALSE,
    error_occurred BOOLEAN DEFAULT FALSE,

    -- Details
    conflict_reason TEXT,
    error_message TEXT,
    error_code TEXT,

    -- Staff assignment details
    assigned_staff JSONB DEFAULT '[]', -- Staff assigned to this specific copy

    -- Timestamps
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create appointment_copy_statistics table for aggregated statistics
CREATE TABLE appointment_copy_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    operation_type copy_operation_type_enum NOT NULL,
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0,
    partially_completed_operations INTEGER DEFAULT 0,
    total_appointments_created INTEGER DEFAULT 0,
    total_conflicts INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    average_operation_duration_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage with 2 decimal places
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, operation_type)
);

-- Create indexes for performance
CREATE INDEX idx_appointment_copy_audit_trail_source_appointment_id ON appointment_copy_audit_trail(source_appointment_id);
CREATE INDEX idx_appointment_copy_audit_trail_operation_type ON appointment_copy_audit_trail(operation_type);
CREATE INDEX idx_appointment_copy_audit_trail_operation_status ON appointment_copy_audit_trail(operation_status);
CREATE INDEX idx_appointment_copy_audit_trail_started_at ON appointment_copy_audit_trail(started_at);
CREATE INDEX idx_appointment_copy_audit_trail_completed_at ON appointment_copy_audit_trail(completed_at);
CREATE INDEX idx_appointment_copy_audit_trail_user_id ON appointment_copy_audit_trail(user_id);
CREATE INDEX idx_appointment_copy_audit_trail_operation_id ON appointment_copy_audit_trail(operation_id);

CREATE INDEX idx_appointment_copy_audit_details_audit_trail_id ON appointment_copy_audit_details(audit_trail_id);
CREATE INDEX idx_appointment_copy_audit_details_target_appointment_id ON appointment_copy_audit_details(target_appointment_id);
CREATE INDEX idx_appointment_copy_audit_details_target_date ON appointment_copy_audit_details(target_date);
CREATE INDEX idx_appointment_copy_audit_details_operation_status ON appointment_copy_audit_details(operation_status);
CREATE INDEX idx_appointment_copy_audit_details_processed_at ON appointment_copy_audit_details(processed_at);

CREATE INDEX idx_appointment_copy_statistics_date ON appointment_copy_statistics(date);
CREATE INDEX idx_appointment_copy_statistics_operation_type ON appointment_copy_statistics(operation_type);

-- Add constraints
ALTER TABLE appointment_copy_audit_trail
    ADD CONSTRAINT appointment_copy_audit_trail_total_requested_check
    CHECK (total_requested >= 0);

ALTER TABLE appointment_copy_audit_trail
    ADD CONSTRAINT appointment_copy_audit_trail_total_created_check
    CHECK (total_created >= 0);

ALTER TABLE appointment_copy_audit_trail
    ADD CONSTRAINT appointment_copy_audit_trail_total_conflicts_check
    CHECK (total_conflicts >= 0);

ALTER TABLE appointment_copy_audit_trail
    ADD CONSTRAINT appointment_copy_audit_trail_total_errors_check
    CHECK (total_errors >= 0);

ALTER TABLE appointment_copy_audit_trail
    ADD CONSTRAINT appointment_copy_audit_trail_duration_ms_check
    CHECK (duration_ms >= 0);

-- Create function to update copy statistics
CREATE OR REPLACE FUNCTION update_appointment_copy_statistics()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update statistics
CREATE TRIGGER trigger_update_appointment_copy_statistics
    AFTER INSERT OR UPDATE ON appointment_copy_audit_trail
    FOR EACH ROW
    EXECUTE FUNCTION update_appointment_copy_statistics();

-- Create function to clean up old audit trail data (older than 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_appointment_copy_audit_trail()
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to get copy audit trail for an appointment
CREATE OR REPLACE FUNCTION get_appointment_copy_audit_trail(
    appointment_id_param UUID,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    operation_id TEXT,
    operation_type copy_operation_type_enum,
    source_appointment_id UUID,
    user_id TEXT,
    operation_status copy_operation_status_enum,
    total_requested INTEGER,
    total_created INTEGER,
    total_conflicts INTEGER,
    total_errors INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to get copy statistics for a date range
CREATE OR REPLACE FUNCTION get_appointment_copy_statistics(
    start_date DATE,
    end_date DATE,
    operation_type_filter copy_operation_type_enum DEFAULT NULL
)
RETURNS TABLE (
    date DATE,
    operation_type copy_operation_type_enum,
    total_operations BIGINT,
    successful_operations BIGINT,
    failed_operations BIGINT,
    partially_completed_operations BIGINT,
    total_appointments_created BIGINT,
    total_conflicts BIGINT,
    total_errors BIGINT,
    average_operation_duration_ms INTEGER,
    success_rate DECIMAL(5,2)
) AS $$
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
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE appointment_copy_audit_trail IS 'Main table for tracking appointment copy operations and their results';
COMMENT ON TABLE appointment_copy_audit_details IS 'Detailed tracking of individual appointment copies within bulk operations';
COMMENT ON TABLE appointment_copy_statistics IS 'Aggregated statistics for appointment copy operations';

COMMENT ON COLUMN appointment_copy_audit_trail.operation_id IS 'Unique identifier for the copy operation (UUID or custom ID)';
COMMENT ON COLUMN appointment_copy_audit_trail.copy_config IS 'Configuration for bulk copy operations (pattern, interval, etc.)';
COMMENT ON COLUMN appointment_copy_audit_trail.staff_assignments IS 'Staff assignments for the copy operation';
COMMENT ON COLUMN appointment_copy_audit_trail.created_appointment_ids IS 'Array of appointment IDs created by this operation';
COMMENT ON COLUMN appointment_copy_audit_trail.conflict_details IS 'Array of conflict information encountered during the operation';
COMMENT ON COLUMN appointment_copy_audit_trail.error_details IS 'Array of error information encountered during the operation';
COMMENT ON COLUMN appointment_copy_audit_trail.metadata IS 'Additional operation metadata (user agent, IP, etc.)';

COMMENT ON COLUMN appointment_copy_audit_details.assigned_staff IS 'Staff assigned to this specific copy operation';
COMMENT ON COLUMN appointment_copy_audit_details.conflict_reason IS 'Reason for conflict if detected';
COMMENT ON COLUMN appointment_copy_audit_details.error_message IS 'Error message if operation failed';
