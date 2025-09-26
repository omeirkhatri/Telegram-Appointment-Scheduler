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

-- Seed transportation segments aligning with pilot rollout scenarios
WITH appointment_base AS (
    SELECT
        a.id,
        ((a.appointment_date + a.start_time) AT TIME ZONE 'Asia/Dubai') AS appointment_start,
        make_interval(mins => a.duration_minutes) AS appointment_duration
    FROM appointments a
    WHERE a.id = '770e8400-e29b-41d4-a716-446655440001'
)
INSERT INTO transportation_segments (
    id,
    appointment_id,
    segment_type,
    title,
    planned_start,
    planned_end,
    driver_id,
    travel_mode,
    pickup_location,
    patient_location,
    pickup_location_type,
    estimated_travel_minutes,
    estimated_distance_km,
    buffer_minutes,
    instructions,
    requires_follow_up,
    status,
    manual_override
)
SELECT
    '880e8400-e29b-41d4-a716-446655440001'::uuid,
    b.id,
    'pickup'::transportation_segment_type_enum,
    'Pickup – Ahmed',
    b.appointment_start - INTERVAL '45 minutes',
    b.appointment_start - INTERVAL '15 minutes',
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'vehicle',
    jsonb_build_object('lat', 25.1124, 'lng', 55.1390, 'address', 'Palm Jumeirah Villa 8', 'landmark', 'Gate A'),
    jsonb_build_object('lat', 25.2048, 'lng', 55.2708, 'address', 'BestDOC Downtown Clinic', 'landmark', 'Reception'),
    'custom'::pickup_location_type_enum,
    30,
    18.50,
    10,
    'Ensure oxygen tank loaded before departure.',
    false,
    'scheduled'::transportation_segment_status_enum,
    false
FROM appointment_base b
ON CONFLICT (id) DO UPDATE SET
    appointment_id = EXCLUDED.appointment_id,
    segment_type = EXCLUDED.segment_type,
    title = EXCLUDED.title,
    planned_start = EXCLUDED.planned_start,
    planned_end = EXCLUDED.planned_end,
    driver_id = EXCLUDED.driver_id,
    travel_mode = EXCLUDED.travel_mode,
    pickup_location = EXCLUDED.pickup_location,
    patient_location = EXCLUDED.patient_location,
    pickup_location_type = EXCLUDED.pickup_location_type,
    estimated_travel_minutes = EXCLUDED.estimated_travel_minutes,
    estimated_distance_km = EXCLUDED.estimated_distance_km,
    buffer_minutes = EXCLUDED.buffer_minutes,
    instructions = EXCLUDED.instructions,
    requires_follow_up = EXCLUDED.requires_follow_up,
    status = EXCLUDED.status,
    manual_override = EXCLUDED.manual_override;

WITH appointment_base AS (
    SELECT
        a.id,
        ((a.appointment_date + a.start_time) AT TIME ZONE 'Asia/Dubai') AS appointment_start,
        make_interval(mins => a.duration_minutes) AS appointment_duration
    FROM appointments a
    WHERE a.id = '770e8400-e29b-41d4-a716-446655440001'
)
INSERT INTO transportation_segments (
    id,
    appointment_id,
    segment_type,
    title,
    planned_start,
    planned_end,
    driver_id,
    travel_mode,
    pickup_location,
    patient_location,
    pickup_location_type,
    estimated_travel_minutes,
    estimated_distance_km,
    buffer_minutes,
    instructions,
    requires_follow_up,
    status,
    manual_override
)
SELECT
    '880e8400-e29b-41d4-a716-446655440002'::uuid,
    b.id,
    'dropoff'::transportation_segment_type_enum,
    'Dropoff – Ahmed',
    b.appointment_start + b.appointment_duration,
    b.appointment_start + b.appointment_duration + INTERVAL '45 minutes',
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'vehicle',
    jsonb_build_object('lat', 25.2048, 'lng', 55.2708, 'address', 'BestDOC Downtown Clinic', 'landmark', 'Dispatch Bay'),
    jsonb_build_object('lat', 25.0920, 'lng', 55.1381, 'address', 'Dubai Marina Residence', 'landmark', 'Tower 2 Lobby'),
    'custom'::pickup_location_type_enum,
    40,
    22.75,
    15,
    'Confirm patient wheelchair ready before departure; coordinate with family on arrival.',
    true,
    'scheduled'::transportation_segment_status_enum,
    false
FROM appointment_base b
ON CONFLICT (id) DO UPDATE SET
    appointment_id = EXCLUDED.appointment_id,
    segment_type = EXCLUDED.segment_type,
    title = EXCLUDED.title,
    planned_start = EXCLUDED.planned_start,
    planned_end = EXCLUDED.planned_end,
    driver_id = EXCLUDED.driver_id,
    travel_mode = EXCLUDED.travel_mode,
    pickup_location = EXCLUDED.pickup_location,
    patient_location = EXCLUDED.patient_location,
    pickup_location_type = EXCLUDED.pickup_location_type,
    estimated_travel_minutes = EXCLUDED.estimated_travel_minutes,
    estimated_distance_km = EXCLUDED.estimated_distance_km,
    buffer_minutes = EXCLUDED.buffer_minutes,
    instructions = EXCLUDED.instructions,
    requires_follow_up = EXCLUDED.requires_follow_up,
    status = EXCLUDED.status,
    manual_override = EXCLUDED.manual_override;

WITH appointment_base AS (
    SELECT
        a.id,
        ((a.appointment_date + a.start_time) AT TIME ZONE 'Asia/Dubai') AS appointment_start,
        make_interval(mins => a.duration_minutes) AS appointment_duration
    FROM appointments a
    WHERE a.id = '770e8400-e29b-41d4-a716-446655440003'
)
INSERT INTO transportation_segments (
    id,
    appointment_id,
    segment_type,
    title,
    planned_start,
    planned_end,
    driver_id,
    travel_mode,
    pickup_location,
    patient_location,
    pickup_location_type,
    estimated_travel_minutes,
    estimated_distance_km,
    buffer_minutes,
    instructions,
    requires_follow_up,
    status,
    manual_override
)
SELECT
    '880e8400-e29b-41d4-a716-446655440003'::uuid,
    b.id,
    'stay_with_staff'::transportation_segment_type_enum,
    'Stay with Staff – Mohammed',
    b.appointment_start - INTERVAL '10 minutes',
    b.appointment_start + b.appointment_duration + INTERVAL '30 minutes',
    '660e8400-e29b-41d4-a716-446655440005'::uuid,
    'on_site',
    jsonb_build_object('lat', 25.1556, 'lng', 55.2485, 'address', 'Primary Clinic Staging Area', 'landmark', 'Service Entrance'),
    jsonb_build_object('lat', 25.1556, 'lng', 55.2485, 'address', 'Primary Clinic Staging Area', 'landmark', 'Service Entrance'),
    'office'::pickup_location_type_enum,
    0,
    0,
    20,
    'Driver to remain on-site to assist physiotherapy transitions.',
    false,
    'draft'::transportation_segment_status_enum,
    false
FROM appointment_base b
ON CONFLICT (id) DO UPDATE SET
    appointment_id = EXCLUDED.appointment_id,
    segment_type = EXCLUDED.segment_type,
    title = EXCLUDED.title,
    planned_start = EXCLUDED.planned_start,
    planned_end = EXCLUDED.planned_end,
    driver_id = EXCLUDED.driver_id,
    travel_mode = EXCLUDED.travel_mode,
    pickup_location = EXCLUDED.pickup_location,
    patient_location = EXCLUDED.patient_location,
    pickup_location_type = EXCLUDED.pickup_location_type,
    estimated_travel_minutes = EXCLUDED.estimated_travel_minutes,
    estimated_distance_km = EXCLUDED.estimated_distance_km,
    buffer_minutes = EXCLUDED.buffer_minutes,
    instructions = EXCLUDED.instructions,
    requires_follow_up = EXCLUDED.requires_follow_up,
    status = EXCLUDED.status,
    manual_override = EXCLUDED.manual_override;
