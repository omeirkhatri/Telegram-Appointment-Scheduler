-- Add new fields for Telegram notification enhancements
-- Based on PRD: Enhanced Telegram Notification System

-- Add new fields to appointments table
ALTER TABLE appointments
ADD COLUMN mini_notes TEXT,
ADD COLUMN full_notes TEXT,
ADD COLUMN pickup_instructions TEXT;

-- Add comments for documentation
COMMENT ON COLUMN appointments.mini_notes IS 'Brief appointment summary for schedule views and quick reference';
COMMENT ON COLUMN appointments.full_notes IS 'Detailed notes for 1-hour reminders and comprehensive information';
COMMENT ON COLUMN appointments.pickup_instructions IS 'Driver-specific pickup details and special instructions';

-- Create indexes for the new fields for better query performance
CREATE INDEX idx_appointments_mini_notes ON appointments USING GIN(to_tsvector('english', mini_notes)) WHERE mini_notes IS NOT NULL;
CREATE INDEX idx_appointments_full_notes ON appointments USING GIN(to_tsvector('english', full_notes)) WHERE full_notes IS NOT NULL;
CREATE INDEX idx_appointments_pickup_instructions ON appointments USING GIN(to_tsvector('english', pickup_instructions)) WHERE pickup_instructions IS NOT NULL;

-- Update the updated_at trigger to ensure it fires when these fields change
-- (The existing trigger already handles this, but we're documenting it here)
