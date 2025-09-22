-- Create calendar_operations_log table to track all calendar operations and errors
-- This table provides comprehensive logging for debugging and monitoring calendar operations

-- Create operation_type enum
CREATE TYPE calendar_operation_type_enum AS ENUM (
  'create_calendar',
  'share_calendar', 
  'create_event',
  'update_event',
  'delete_event',
  'verify_calendar',
  'send_invite',
  'cleanup_calendar'
);

-- Create operation_status enum
CREATE TYPE calendar_operation_status_enum AS ENUM (
  'pending',
  'success',
  'failed',
  'retrying'
);

-- Create calendar_operations_log table
CREATE TABLE calendar_operations_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    operation_type calendar_operation_type_enum NOT NULL,
    operation_status calendar_operation_status_enum NOT NULL DEFAULT 'pending',
    google_calendar_id TEXT,
    google_event_id TEXT,
    error_code TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    operation_data JSONB DEFAULT '{}',
    response_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Add constraints
ALTER TABLE calendar_operations_log
ADD CONSTRAINT calendar_operations_log_retry_count_check
CHECK (retry_count >= 0 AND retry_count <= max_retries);

ALTER TABLE calendar_operations_log
ADD CONSTRAINT calendar_operations_log_google_calendar_id_check
CHECK (
  google_calendar_id IS NULL OR
  google_calendar_id ~ '^[a-zA-Z0-9._-]+@group\.calendar\.google\.com$'
);

ALTER TABLE calendar_operations_log
ADD CONSTRAINT calendar_operations_log_google_event_id_check
CHECK (
  google_event_id IS NULL OR
  google_event_id ~ '^[a-zA-Z0-9_-]+$'
);

-- Add constraint for completed_at
ALTER TABLE calendar_operations_log
ADD CONSTRAINT calendar_operations_log_completed_at_check
CHECK (
  (operation_status IN ('success', 'failed') AND completed_at IS NOT NULL) OR
  (operation_status NOT IN ('success', 'failed') AND completed_at IS NULL)
);

-- Create indexes for performance
CREATE INDEX idx_calendar_operations_log_staff_id ON calendar_operations_log(staff_id);
CREATE INDEX idx_calendar_operations_log_operation_type ON calendar_operations_log(operation_type);
CREATE INDEX idx_calendar_operations_log_operation_status ON calendar_operations_log(operation_status);
CREATE INDEX idx_calendar_operations_log_created_at ON calendar_operations_log(created_at);
CREATE INDEX idx_calendar_operations_log_google_calendar_id ON calendar_operations_log(google_calendar_id) WHERE google_calendar_id IS NOT NULL;
CREATE INDEX idx_calendar_operations_log_google_event_id ON calendar_operations_log(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX idx_calendar_operations_log_error_code ON calendar_operations_log(error_code) WHERE error_code IS NOT NULL;
CREATE INDEX idx_calendar_operations_log_retry_count ON calendar_operations_log(retry_count) WHERE retry_count > 0;

-- Create updated_at trigger
CREATE TRIGGER update_calendar_operations_log_updated_at
    BEFORE UPDATE ON calendar_operations_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE calendar_operations_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calendar_operations_log
CREATE POLICY "Enable read access for all users" ON calendar_operations_log
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON calendar_operations_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON calendar_operations_log
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON calendar_operations_log
    FOR DELETE USING (true);

-- Add table comment
COMMENT ON TABLE calendar_operations_log IS 'Comprehensive log of all calendar operations including creation, sharing, event management, and verification';
COMMENT ON COLUMN calendar_operations_log.operation_data IS 'JSON data containing operation-specific parameters and context';
COMMENT ON COLUMN calendar_operations_log.response_data IS 'JSON data containing response from Google Calendar API';
COMMENT ON COLUMN calendar_operations_log.retry_count IS 'Number of retry attempts made for this operation';
COMMENT ON COLUMN calendar_operations_log.max_retries IS 'Maximum number of retry attempts allowed for this operation type';
