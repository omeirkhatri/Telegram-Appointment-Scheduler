-- Task 1.3: Seed organization/location timezone data using legacy office_settings

DO $$
DECLARE
  has_office_table BOOLEAN := to_regclass('public.office_settings') IS NOT NULL;
  org_display_name TEXT := 'Best DOC Organization';
  org_metadata JSONB := jsonb_build_object('seed_source', 'task_1_3_default');
  office_record RECORD;
  slug_value TEXT;
  display_name_value TEXT;
  address_value TEXT;
  coordinates_value JSONB;
  phone_value TEXT;
  email_value TEXT;
  icon_value TEXT;
  color_value TEXT;
BEGIN
  IF has_office_table THEN
    BEGIN
      EXECUTE 'SELECT settings->>''name'' AS name FROM office_settings ORDER BY updated_at DESC NULLS LAST LIMIT 1'
      INTO org_display_name;
    EXCEPTION WHEN undefined_table THEN
      -- Table was dropped between to_regclass check and select; fall back to default
      has_office_table := FALSE;
    END;

    IF org_display_name IS NULL OR org_display_name = '' THEN
      org_display_name := 'Best DOC Organization';
    END IF;

    org_metadata := jsonb_build_object('seed_source', 'task_1_3_office_settings');
  END IF;

  INSERT INTO organization_settings (id, display_name, default_timezone, metadata)
  VALUES (
    'primary',
    org_display_name,
    'Asia/Dubai',
    org_metadata
  )
  ON CONFLICT (id) DO UPDATE
  SET
    display_name = EXCLUDED.display_name,
    default_timezone = EXCLUDED.default_timezone,
    metadata = organization_settings.metadata || EXCLUDED.metadata;

  IF has_office_table THEN
    FOR office_record IN EXECUTE 'SELECT id, settings FROM office_settings' LOOP
      slug_value := COALESCE(NULLIF(office_record.id, ''), 'primary-location');
      display_name_value := COALESCE(office_record.settings->>'name', org_display_name);
      address_value := office_record.settings->>'address';
      coordinates_value := office_record.settings->'coordinates';
      phone_value := office_record.settings->>'phone';
      email_value := office_record.settings->>'email';
      icon_value := office_record.settings->>'icon';
      color_value := office_record.settings->>'color';

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
        slug_value,
        display_name_value,
        'Asia/Dubai',
        'inherited',
        address_value,
        coordinates_value,
        phone_value,
        email_value,
        icon_value,
        color_value,
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
    END LOOP;
  ELSE
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
      org_display_name,
      'Asia/Dubai',
      'override',
      NULL,
      NULL,
      NULL,
      NULL,
      'office',
      '#2563eb',
      TRUE
    )
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END;
$$;
