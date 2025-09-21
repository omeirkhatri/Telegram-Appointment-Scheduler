-- Create office_settings table
CREATE TABLE IF NOT EXISTS office_settings (
  id TEXT PRIMARY KEY DEFAULT 'office_location',
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE office_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to read and write office settings
CREATE POLICY "Admins can manage office settings" ON office_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow caregivers to read office settings (for map display)
CREATE POLICY "Caregivers can read office settings" ON office_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'caregiver')
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_office_settings_id ON office_settings(id);

-- Insert default office settings
INSERT INTO office_settings (id, settings) VALUES (
  'office_location',
  '{
    "name": "Best DOC Office",
    "coordinates": {
      "lat": 25.2048,
      "lng": 55.2708
    },
    "address": "Office Address, Dubai, UAE",
    "phone": "+971 XX XXX XXXX",
    "email": "office@bestdoc.ae",
    "icon": "🏢",
    "color": "#2563eb"
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;
