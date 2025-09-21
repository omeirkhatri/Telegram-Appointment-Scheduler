-- Task 1.4: Add RLS and audit logging for timezone configuration tables

-- Helper to stamp updated_by based on auth context
CREATE OR REPLACE FUNCTION set_timezone_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_by IS NULL THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Helper to normalize timezone_source on locations
CREATE OR REPLACE FUNCTION set_location_timezone_source()
RETURNS TRIGGER AS $$
DECLARE
  org_timezone TEXT;
BEGIN
  SELECT default_timezone
  INTO org_timezone
  FROM organization_settings
  WHERE id = 'primary'
  LIMIT 1;

  IF org_timezone IS NULL THEN
    NEW.timezone_source := 'override';
  ELSIF NEW.timezone = org_timezone THEN
    NEW.timezone_source := 'inherited';
  ELSE
    NEW.timezone_source := 'override';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Audit helper for organization timezone changes
CREATE OR REPLACE FUNCTION audit_organization_timezone_change()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID;
  previous_timezone TEXT;
  next_timezone TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.default_timezone IS NOT DISTINCT FROM OLD.default_timezone THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    previous_timezone := NULL;
    next_timezone := NEW.default_timezone;
  ELSE
    previous_timezone := OLD.default_timezone;
    next_timezone := NEW.default_timezone;
  END IF;

  actor := COALESCE(auth.uid(), NEW.updated_by, OLD.updated_by);

  INSERT INTO timezone_change_audit (
    entity_type,
    entity_id,
    previous_timezone,
    new_timezone,
    changed_by,
    changed_at,
    metadata
  )
  VALUES (
    'organization',
    NEW.id,
    previous_timezone,
    next_timezone,
    actor,
    NOW(),
    jsonb_build_object('trigger', TG_NAME, 'operation', TG_OP)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Audit helper for location timezone changes
CREATE OR REPLACE FUNCTION audit_location_timezone_change()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID;
  previous_timezone TEXT;
  next_timezone TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.timezone IS NOT DISTINCT FROM OLD.timezone THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    previous_timezone := NULL;
    next_timezone := NEW.timezone;
  ELSE
    previous_timezone := OLD.timezone;
    next_timezone := NEW.timezone;
  END IF;

  actor := COALESCE(auth.uid(), NEW.updated_by, OLD.updated_by);

  INSERT INTO timezone_change_audit (
    entity_type,
    entity_id,
    previous_timezone,
    new_timezone,
    changed_by,
    changed_at,
    metadata
  )
  VALUES (
    'location',
    NEW.id::TEXT,
    previous_timezone,
    next_timezone,
    actor,
    NOW(),
    jsonb_build_object('trigger', TG_NAME, 'operation', TG_OP)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Attach BEFORE triggers for updated_by + timezone_source management
CREATE TRIGGER biu_organization_set_updated_by
BEFORE INSERT OR UPDATE ON organization_settings
FOR EACH ROW EXECUTE FUNCTION set_timezone_updated_by();

CREATE TRIGGER biu_location_set_updated_by
BEFORE INSERT OR UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION set_timezone_updated_by();

CREATE TRIGGER biu_location_set_timezone_source
BEFORE INSERT OR UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION set_location_timezone_source();

-- Attach AFTER triggers for audit logging
CREATE TRIGGER aiu_organization_timezone_audit
AFTER INSERT OR UPDATE ON organization_settings
FOR EACH ROW EXECUTE FUNCTION audit_organization_timezone_change();

CREATE TRIGGER aiu_location_timezone_audit
AFTER INSERT OR UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION audit_location_timezone_change();

-- Enable Row Level Security on new tables
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE timezone_change_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_settings
CREATE POLICY "organization_settings_select_authenticated" ON organization_settings
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "organization_settings_write_service" ON organization_settings
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS policies for locations
CREATE POLICY "locations_select_authenticated" ON locations
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "locations_write_service" ON locations
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS policies for timezone_change_audit
CREATE POLICY "timezone_change_audit_select_authenticated" ON timezone_change_audit
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "timezone_change_audit_insert_any" ON timezone_change_audit
  FOR INSERT WITH CHECK (true);
