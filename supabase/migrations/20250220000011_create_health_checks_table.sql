-- Create health_checks table for storing health check results
-- This table stores health check results for monitoring system status

CREATE TABLE IF NOT EXISTS health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('healthy', 'unhealthy', 'degraded')),
  checks JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uptime BIGINT NOT NULL,
  version VARCHAR(50) NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp);
CREATE INDEX IF NOT EXISTS idx_health_checks_overall_status ON health_checks(overall_status);

-- Add RLS policies
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

-- Policy for admins to access all health checks
CREATE POLICY "Admins can access all health checks" ON health_checks
  FOR ALL USING (true);

-- Add comments for documentation
COMMENT ON TABLE health_checks IS 'Health check results for system monitoring';
COMMENT ON COLUMN health_checks.overall_status IS 'Overall system health status';
COMMENT ON COLUMN health_checks.checks IS 'Detailed health check results as JSON';
COMMENT ON COLUMN health_checks.uptime IS 'System uptime in milliseconds';
COMMENT ON COLUMN health_checks.version IS 'Application version';
