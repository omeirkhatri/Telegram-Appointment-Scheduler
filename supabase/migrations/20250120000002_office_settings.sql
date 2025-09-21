-- Create office_settings table
CREATE TABLE IF NOT EXISTS office_settings (
  id TEXT PRIMARY KEY DEFAULT 'office_location',
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default office settings
INSERT INTO office_settings (id, settings) VALUES (
  'office_location',
  '{
    "name": "Best DOC Office",
    "coordinates": {
      "lat": 25.1556,
      "lng": 55.2485
    },
    "address": "Office Address, Dubai, UAE",
    "phone": "+971 XX XXX XXXX",
    "email": "office@bestdoc.ae",
    "icon": "🏢",
    "color": "#2563eb"
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;