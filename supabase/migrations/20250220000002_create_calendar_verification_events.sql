-- Create calendar_verification_events table to track verification test events
-- This table manages test events created for calendar verification and tracks RSVP responses

-- Create verification_event_status enum
CREATE TYPE verification_event_status_enum AS ENUM (
  'created',
  'sent',
  'accepted',
  'declined',
  'tentative',
  'expired',
  'failed'
);

-- Create calendar_verification_events table
CREATE TABLE calendar_verification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    google_calendar_id TEXT NOT NULL,
    google_event_id TEXT NOT NULL,
    event_title TEXT NOT NULL DEFAULT 'Calendar Verification Test',
    event_description TEXT,
    event_start_time TIMESTAMPTZ NOT NULL,
    event_end_time TIMESTAMPTZ NOT NULL,
    attendee_email TEXT NOT NULL,
    verification_status verification_event_status_enum NOT NULL DEFAULT 'created',
    rsvp_response TEXT,
    verification_attempts INTEGER DEFAULT 0,
    max_verification_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE calendar_verification_events
ADD CONSTRAINT calendar_verification_events_google_calendar_id_check
CHECK (google_calendar_id ~ '^[a-zA-Z0-9._-]+@group\.calendar\.google\.com$');

ALTER TABLE calendar_verification_events
ADD CONSTRAINT calendar_verification_events_google_event_id_check
CHECK (google_event_id ~ '^[a-zA-Z0-9_-]+$');

ALTER TABLE calendar_verification_events
ADD CONSTRAINT calendar_verification_events_attendee_email_check
CHECK (attendee_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE calendar_verification_events
ADD CONSTRAINT calendar_verification_events_time_check
CHECK (event_start_time < event_end_time);

ALTER TABLE calendar_verification_events
ADD CONSTRAINT calendar_verification_events_verification_attempts_check
CHECK (verification_attempts >= 0 AND verification_attempts <= max_verification_attempts);

ALTER TABLE calendar_verification_events
ADD CONSTRAINT calendar_verification_events_rsvp_response_check
CHECK (
  rsvp_response IS NULL OR
  rsvp_response IN ('accepted', 'declined', 'tentative', 'needsAction')
);

ALTER TABLE calendar_verification_events
ADD CONSTRAINT calendar_verification_events_verified_at_check
CHECK (
  (verification_status = 'accepted' AND verified_at IS NOT NULL) OR
  (verification_status != 'accepted' AND verified_at IS NULL)
);

-- Create indexes for performance
CREATE INDEX idx_calendar_verification_events_staff_id ON calendar_verification_events(staff_id);
CREATE INDEX idx_calendar_verification_events_google_calendar_id ON calendar_verification_events(google_calendar_id);
CREATE INDEX idx_calendar_verification_events_google_event_id ON calendar_verification_events(google_event_id);
CREATE INDEX idx_calendar_verification_events_verification_status ON calendar_verification_events(verification_status);
CREATE INDEX idx_calendar_verification_events_attendee_email ON calendar_verification_events(attendee_email);
CREATE INDEX idx_calendar_verification_events_expires_at ON calendar_verification_events(expires_at);
CREATE INDEX idx_calendar_verification_events_created_at ON calendar_verification_events(created_at);
CREATE INDEX idx_calendar_verification_events_staff_verification ON calendar_verification_events(staff_id, verification_status);

-- Create updated_at trigger
CREATE TRIGGER update_calendar_verification_events_updated_at
    BEFORE UPDATE ON calendar_verification_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE calendar_verification_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calendar_verification_events
CREATE POLICY "Enable read access for all users" ON calendar_verification_events
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON calendar_verification_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON calendar_verification_events
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON calendar_verification_events
    FOR DELETE USING (true);

-- Add table comment
COMMENT ON TABLE calendar_verification_events IS 'Tracks verification test events created to verify staff calendar access and RSVP responses';
COMMENT ON COLUMN calendar_verification_events.event_title IS 'Title of the verification test event';
COMMENT ON COLUMN calendar_verification_events.event_description IS 'Description explaining this is a verification test event';
COMMENT ON COLUMN calendar_verification_events.attendee_email IS 'Email address of the staff member being verified';
COMMENT ON COLUMN calendar_verification_events.verification_status IS 'Current status of the verification process';
COMMENT ON COLUMN calendar_verification_events.rsvp_response IS 'RSVP response from Google Calendar API';
COMMENT ON COLUMN calendar_verification_events.verification_attempts IS 'Number of verification attempts made';
COMMENT ON COLUMN calendar_verification_events.expires_at IS 'When this verification event expires and should be cleaned up';
COMMENT ON COLUMN calendar_verification_events.verified_at IS 'Timestamp when verification was successfully completed';
