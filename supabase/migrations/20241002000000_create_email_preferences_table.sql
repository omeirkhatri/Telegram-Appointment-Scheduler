-- Create email_preferences table for storing global email settings
CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for key lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_key ON email_preferences(key);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_preferences_updated_at
    BEFORE UPDATE ON email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_email_preferences_updated_at();

-- Insert default global email preferences
INSERT INTO email_preferences (key, preferences) VALUES (
    'global_settings',
    '{
        "emailNotificationsEnabled": true,
        "smsNotificationsEnabled": false,
        "appointmentRemindersEnabled": true,
        "reminderTimeBeforeAppointment": 30,
        "dailyAgendaTime": "06:00",
        "timezone": "Asia/Dubai",
        "includeAppointmentDetails": true,
        "includePatientContactInfo": true,
        "includeGoogleMapsLink": true,
        "includeStaffContactInfo": true,
        "newAppointmentNotifications": true,
        "appointmentCancellationNotifications": true,
        "appointmentRescheduleNotifications": true,
        "dailyAgendaNotifications": true,
        "weeklySummaryNotifications": false,
        "retryFailedEmails": true,
        "maxRetryAttempts": 3,
        "retryDelayMinutes": 5,
        "fromEmail": "noreply@medicare-scheduler.com",
        "fromName": "MediCare Scheduler"
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Add comments
COMMENT ON TABLE email_preferences IS 'Stores global email preferences and settings';
COMMENT ON COLUMN email_preferences.key IS 'Unique key for the preference set (e.g., global_settings)';
COMMENT ON COLUMN email_preferences.preferences IS 'JSON object containing all email preferences';
