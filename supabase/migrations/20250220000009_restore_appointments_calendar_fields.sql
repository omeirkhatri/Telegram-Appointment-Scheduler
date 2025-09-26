-- Restore Google Calendar fields to appointments table
-- This migration re-adds the google_event_ids column that was removed in 20250101000000
-- but is needed for calendar integration

-- Add google_event_ids column back to appointments table
ALTER TABLE appointments
ADD COLUMN google_event_ids JSONB DEFAULT '{}';

-- Add comment explaining the field
COMMENT ON COLUMN appointments.google_event_ids IS 'JSONB object mapping staff_id to Google Calendar event_id for each staff member assigned to this appointment';

-- Create index for google_event_ids queries
CREATE INDEX idx_appointments_google_event_ids ON appointments USING GIN(google_event_ids);

-- Create index for staff lookup in google_event_ids (using btree for text values)
CREATE INDEX idx_appointments_google_event_ids_staff_lookup ON appointments USING btree((google_event_ids ->> 'staff_id'));

-- Update the comment on appointments table
COMMENT ON TABLE appointments IS 'Appointments with Google Calendar integration for staff calendars';
