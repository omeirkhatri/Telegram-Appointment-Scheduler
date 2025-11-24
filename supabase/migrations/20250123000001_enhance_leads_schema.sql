-- Enhance leads table with new fields for improved lead management
-- Migration: 20250123000001_enhance_leads_schema.sql

-- Create priority enum
CREATE TYPE lead_priority_enum AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

-- Add new columns to leads table
ALTER TABLE leads
ADD COLUMN last_contacted_at TIMESTAMPTZ,
ADD COLUMN priority lead_priority_enum DEFAULT 'medium',
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN rejection_reason TEXT,
ADD COLUMN next_follow_up_at TIMESTAMPTZ,
ADD COLUMN response_time_minutes INTEGER,
ADD COLUMN conversion_probability INTEGER DEFAULT 50 CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
ADD COLUMN automation_metadata JSONB DEFAULT '{}';

-- Create indexes for new fields
CREATE INDEX idx_leads_last_contacted_at ON leads(last_contacted_at);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_next_follow_up_at ON leads(next_follow_up_at);
CREATE INDEX idx_leads_conversion_probability ON leads(conversion_probability);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);

-- Add constraints
ALTER TABLE leads
    ADD CONSTRAINT leads_conversion_probability_check
    CHECK (conversion_probability >= 0 AND conversion_probability <= 100);

-- Update existing leads to have default values
UPDATE leads
SET
    last_contacted_at = created_at,
    priority = CASE
        WHEN stage = 'new' THEN 'high'
        WHEN stage = 'contacted' THEN 'medium'
        WHEN stage = 'quoted' THEN 'high'
        WHEN stage = 'qualified' THEN 'urgent'
        WHEN stage = 'not_qualified' THEN 'low'
        WHEN stage = 'converted' THEN 'low'
        ELSE 'medium'
    END,
    conversion_probability = CASE
        WHEN stage = 'new' THEN 20
        WHEN stage = 'contacted' THEN 40
        WHEN stage = 'quoted' THEN 60
        WHEN stage = 'qualified' THEN 80
        WHEN stage = 'not_qualified' THEN 5
        WHEN stage = 'converted' THEN 100
        ELSE 50
    END
WHERE last_contacted_at IS NULL;

-- Create function to update last_contacted_at when lead is updated
CREATE OR REPLACE FUNCTION update_lead_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_contacted_at if stage changes to contacted or beyond
    IF NEW.stage != OLD.stage AND NEW.stage IN ('contacted', 'quoted', 'qualified', 'converted') THEN
        NEW.last_contacted_at = NOW();
    END IF;

    -- Update conversion probability based on stage
    NEW.conversion_probability = CASE
        WHEN NEW.stage = 'new' THEN 20
        WHEN NEW.stage = 'contacted' THEN 40
        WHEN NEW.stage = 'quoted' THEN 60
        WHEN NEW.stage = 'qualified' THEN 80
        WHEN NEW.stage = 'not_qualified' THEN 5
        WHEN NEW.stage = 'converted' THEN 100
        ELSE COALESCE(NEW.conversion_probability, 50)
    END;

    -- Update priority based on stage and age
    IF NEW.stage = 'qualified' THEN
        NEW.priority = 'urgent';
    ELSIF NEW.stage = 'new' OR NEW.stage = 'quoted' THEN
        NEW.priority = 'high';
    ELSIF NEW.stage = 'contacted' THEN
        NEW.priority = 'medium';
    ELSIF NEW.stage = 'not_qualified' THEN
        NEW.priority = 'low';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update fields
CREATE TRIGGER update_lead_enhanced_fields
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_last_contacted();

-- Create view for lead analytics
CREATE VIEW lead_analytics AS
SELECT
    stage,
    COUNT(*) as total_leads,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_days_in_stage,
    AVG(conversion_probability) as avg_conversion_probability,
    COUNT(*) FILTER (WHERE last_contacted_at < NOW() - INTERVAL '7 days') as stale_leads,
    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_leads,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_leads
FROM leads
WHERE status = 'active'
GROUP BY stage
ORDER BY
    CASE stage
        WHEN 'new' THEN 1
        WHEN 'contacted' THEN 2
        WHEN 'quoted' THEN 3
        WHEN 'qualified' THEN 4
        WHEN 'not_qualified' THEN 5
        WHEN 'converted' THEN 6
    END;

-- Create view for stale leads
CREATE VIEW stale_leads AS
SELECT
    l.*,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(l.last_contacted_at, l.created_at)))/86400 as days_since_last_contact
FROM leads l
WHERE l.status = 'active'
    AND l.stage NOT IN ('converted', 'not_qualified')
    AND COALESCE(l.last_contacted_at, l.created_at) < NOW() - INTERVAL '7 days'
ORDER BY days_since_last_contact DESC;
