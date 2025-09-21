-- Seed script for local development
-- Task 1.5: ensure timezone hierarchy defaults exist after fresh setup

INSERT INTO organization_settings (id, display_name, default_timezone, metadata)
VALUES (
  'primary',
  'Best DOC Organization',
  'Asia/Dubai',
  jsonb_build_object('seed_source', 'supabase/seed.sql')
)
ON CONFLICT (id) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  default_timezone = EXCLUDED.default_timezone,
  metadata = organization_settings.metadata || EXCLUDED.metadata;

INSERT INTO locations (
  slug,
  display_name,
  timezone,
  timezone_source,
  address,
  coordinates,
  phone,
  email,
  icon,
  color,
  is_active
)
VALUES (
  'primary-location',
  'Primary Clinic',
  'Asia/Dubai',
  'inherited',
  'Office Address, Dubai, UAE',
  jsonb_build_object('lat', 25.1556, 'lng', 55.2485),
  '+971 XX XXX XXXX',
  'office@bestdoc.ae',
  'office',
  '#2563eb',
  TRUE
)
ON CONFLICT (slug) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  timezone = EXCLUDED.timezone,
  timezone_source = EXCLUDED.timezone_source,
  address = COALESCE(EXCLUDED.address, locations.address),
  coordinates = COALESCE(EXCLUDED.coordinates, locations.coordinates),
  phone = COALESCE(EXCLUDED.phone, locations.phone),
  email = COALESCE(EXCLUDED.email, locations.email),
  icon = COALESCE(EXCLUDED.icon, locations.icon),
  color = COALESCE(EXCLUDED.color, locations.color),
  is_active = TRUE;
