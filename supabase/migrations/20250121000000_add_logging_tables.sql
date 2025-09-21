-- Add logging and observability tables
-- This migration adds the missing tables that the logging service expects

-- Create application_logs table
CREATE TABLE IF NOT EXISTS application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  error JSONB,
  performance JSONB,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create error_tracking table
CREATE TABLE IF NOT EXISTS error_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id VARCHAR(255) NOT NULL,
  error_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  user_id UUID,
  session_id VARCHAR(255),
  request_id VARCHAR(255),
  component VARCHAR(100),
  severity VARCHAR(20) NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL NOT NULL,
  metric_unit VARCHAR(20),
  context JSONB,
  tags TEXT[],
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create health_checks table
CREATE TABLE IF NOT EXISTS health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_status VARCHAR(20) NOT NULL,
  checks JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uptime BIGINT NOT NULL,
  version VARCHAR(50) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_logs_timestamp ON application_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_created_at ON application_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_error_tracking_error_id ON error_tracking(error_id);
CREATE INDEX IF NOT EXISTS idx_error_tracking_error_type ON error_tracking(error_type);
CREATE INDEX IF NOT EXISTS idx_error_tracking_severity ON error_tracking(severity);
CREATE INDEX IF NOT EXISTS idx_error_tracking_resolved ON error_tracking(resolved);
CREATE INDEX IF NOT EXISTS idx_error_tracking_created_at ON error_tracking(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(overall_status);

-- Enable Row Level Security (RLS)
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for logging tables
-- Allow service role to insert logs (for the logging service)
CREATE POLICY "Enable insert for service role" ON application_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for service role" ON error_tracking
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for service role" ON performance_metrics
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read logs (for admin monitoring)
CREATE POLICY "Enable read access for authenticated users" ON application_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON error_tracking
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON performance_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON health_checks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" ON health_checks
  FOR SELECT USING (auth.role() = 'authenticated');
