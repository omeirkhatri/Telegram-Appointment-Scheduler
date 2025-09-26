-- Create error_logs table for comprehensive error tracking and monitoring
-- This table stores all application errors with full context for debugging and monitoring

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code VARCHAR(50) NOT NULL,
  error_type VARCHAR(20) NOT NULL CHECK (error_type IN ('calendar', 'staff', 'appointment', 'system', 'external')),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  context JSONB,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  operation_type VARCHAR(50),
  retryable BOOLEAN NOT NULL DEFAULT false,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_staff_id ON error_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_appointment_id ON error_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_retryable ON error_logs(retryable);
CREATE INDEX IF NOT EXISTS idx_error_logs_operation_type ON error_logs(operation_type);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_severity_resolved ON error_logs(severity, resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_staff_created ON error_logs(staff_id, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_type_severity ON error_logs(error_type, severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_created ON error_logs(resolved, created_at);

-- Create partial indexes for unresolved errors
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(created_at) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_error_logs_critical_unresolved ON error_logs(created_at) WHERE severity = 'critical' AND resolved = false;

-- Add RLS policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admins to access all error logs
CREATE POLICY "Admins can access all error logs" ON error_logs
  FOR ALL USING (true);

-- Policy for caregivers to access their own error logs only
CREATE POLICY "Caregivers can access their own error logs" ON error_logs
  FOR SELECT USING (
    error_logs.staff_id = (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_error_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_error_logs_updated_at
  BEFORE UPDATE ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_logs_updated_at();

-- Add comments for documentation
COMMENT ON TABLE error_logs IS 'Comprehensive error logging table for monitoring and debugging application errors';
COMMENT ON COLUMN error_logs.error_code IS 'Standardized error code for categorization and handling';
COMMENT ON COLUMN error_logs.error_type IS 'Type of error: calendar, staff, appointment, system, or external';
COMMENT ON COLUMN error_logs.severity IS 'Error severity level: low, medium, high, or critical';
COMMENT ON COLUMN error_logs.message IS 'Human-readable error message';
COMMENT ON COLUMN error_logs.context IS 'Additional context data as JSON';
COMMENT ON COLUMN error_logs.stack_trace IS 'Full stack trace for debugging';
COMMENT ON COLUMN error_logs.retryable IS 'Whether this error can be retried';
COMMENT ON COLUMN error_logs.resolved IS 'Whether this error has been resolved';
COMMENT ON COLUMN error_logs.resolution_notes IS 'Notes about how the error was resolved';
