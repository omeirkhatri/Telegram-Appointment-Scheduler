-- Email delivery logging and retry system
-- This migration creates tables for tracking email delivery status, retries, and audit trails

-- Create email_delivery_logs table for tracking email delivery status
CREATE TABLE email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id TEXT NOT NULL, -- Unique identifier for the email (messageId or generated ID)
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    job_execution_id UUID, -- Reference to job execution if sent via job scheduler
    email_type TEXT NOT NULL DEFAULT 'daily_agenda', -- Type of email (daily_agenda, test, etc.)
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed, cancelled
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    error_message TEXT,
    error_code TEXT,
    smtp_response TEXT,
    delivery_attempts JSONB DEFAULT '[]'::jsonb, -- Array of delivery attempt details
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional metadata (template data, parameters, etc.)
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_delivery_attempts table for detailed retry tracking
CREATE TABLE email_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_log_id UUID REFERENCES email_delivery_logs(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL, -- pending, success, failed
    error_message TEXT,
    error_code TEXT,
    smtp_response TEXT,
    response_time_ms INTEGER, -- Response time in milliseconds
    retry_after_ms INTEGER, -- When to retry next (in milliseconds)
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create email_delivery_statistics table for aggregated statistics
CREATE TABLE email_delivery_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    email_type TEXT NOT NULL,
    total_emails INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    pending_deliveries INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage with 2 decimal places
    average_delivery_time_ms INTEGER DEFAULT 0,
    total_retries INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, email_type)
);

-- Create indexes for performance
CREATE INDEX idx_email_delivery_logs_staff_id ON email_delivery_logs(staff_id);
CREATE INDEX idx_email_delivery_logs_status ON email_delivery_logs(status);
CREATE INDEX idx_email_delivery_logs_created_at ON email_delivery_logs(created_at);
CREATE INDEX idx_email_delivery_logs_sent_at ON email_delivery_logs(sent_at);
CREATE INDEX idx_email_delivery_logs_next_retry_at ON email_delivery_logs(next_retry_at);
CREATE INDEX idx_email_delivery_logs_email_type ON email_delivery_logs(email_type);
CREATE INDEX idx_email_delivery_logs_recipient_email ON email_delivery_logs(recipient_email);

CREATE INDEX idx_email_delivery_attempts_delivery_log_id ON email_delivery_attempts(delivery_log_id);
CREATE INDEX idx_email_delivery_attempts_attempted_at ON email_delivery_attempts(attempted_at);
CREATE INDEX idx_email_delivery_attempts_status ON email_delivery_attempts(status);

CREATE INDEX idx_email_delivery_statistics_date ON email_delivery_statistics(date);
CREATE INDEX idx_email_delivery_statistics_email_type ON email_delivery_statistics(email_type);

-- Add constraints
ALTER TABLE email_delivery_logs
    ADD CONSTRAINT email_delivery_logs_status_check
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled'));

ALTER TABLE email_delivery_logs
    ADD CONSTRAINT email_delivery_logs_priority_check
    CHECK (priority IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE email_delivery_logs
    ADD CONSTRAINT email_delivery_logs_retry_count_check
    CHECK (retry_count >= 0);

ALTER TABLE email_delivery_logs
    ADD CONSTRAINT email_delivery_logs_max_retries_check
    CHECK (max_retries >= 0);

ALTER TABLE email_delivery_attempts
    ADD CONSTRAINT email_delivery_attempts_status_check
    CHECK (status IN ('pending', 'success', 'failed'));

ALTER TABLE email_delivery_attempts
    ADD CONSTRAINT email_delivery_attempts_attempt_number_check
    CHECK (attempt_number > 0);

-- Create function to update delivery statistics
CREATE OR REPLACE FUNCTION update_email_delivery_statistics()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update statistics
CREATE TRIGGER trigger_update_email_delivery_statistics
    AFTER INSERT OR UPDATE ON email_delivery_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_email_delivery_statistics();

-- Create function to clean up old delivery logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_email_delivery_logs()
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to get delivery statistics for a date range
CREATE OR REPLACE FUNCTION get_email_delivery_statistics(
    start_date DATE,
    end_date DATE,
    email_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    date DATE,
    email_type TEXT,
    total_emails BIGINT,
    successful_deliveries BIGINT,
    failed_deliveries BIGINT,
    pending_deliveries BIGINT,
    success_rate DECIMAL(5,2),
    average_delivery_time_ms INTEGER,
    total_retries BIGINT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Create function to get failed deliveries that need retry
CREATE OR REPLACE FUNCTION get_failed_deliveries_for_retry()
RETURNS TABLE (
    id UUID,
    email_id TEXT,
    staff_id UUID,
    recipient_email TEXT,
    subject TEXT,
    retry_count INTEGER,
    max_retries INTEGER,
    next_retry_at TIMESTAMPTZ,
    error_message TEXT,
    email_type TEXT
) AS $$
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
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO email_delivery_logs (email_id, staff_id, email_type, recipient_email, subject, status, priority, retry_count, max_retries)
VALUES
    ('sample-1', (SELECT id FROM staff LIMIT 1), 'daily_agenda', 'test@example.com', 'Daily Agenda - Test', 'delivered', 'high', 0, 3),
    ('sample-2', (SELECT id FROM staff LIMIT 1), 'daily_agenda', 'test2@example.com', 'Daily Agenda - Test 2', 'failed', 'high', 1, 3);

-- Add comments for documentation
COMMENT ON TABLE email_delivery_logs IS 'Main table for tracking email delivery status and retry information';
COMMENT ON TABLE email_delivery_attempts IS 'Detailed tracking of individual delivery attempts and retries';
COMMENT ON TABLE email_delivery_statistics IS 'Aggregated statistics for email delivery performance';

COMMENT ON COLUMN email_delivery_logs.email_id IS 'Unique identifier for the email (messageId or generated ID)';
COMMENT ON COLUMN email_delivery_logs.job_execution_id IS 'Reference to job execution if sent via job scheduler';
COMMENT ON COLUMN email_delivery_logs.delivery_attempts IS 'JSON array of delivery attempt details';
COMMENT ON COLUMN email_delivery_logs.metadata IS 'Additional metadata like template data, parameters, etc.';

COMMENT ON COLUMN email_delivery_attempts.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN email_delivery_attempts.retry_after_ms IS 'When to retry next (in milliseconds)';
