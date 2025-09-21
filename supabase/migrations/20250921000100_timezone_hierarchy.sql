-- Task 1.2: Create organization and location timezone tables

-- Create organization_settings table
CREATE TABLE IF NOT EXISTS organization_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  display_name TEXT,
  default_timezone TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  timezone_source TEXT NOT NULL DEFAULT 'override' CHECK (
    timezone_source IN ('override', 'inherited')
  ),
  address TEXT,
  coordinates JSONB,
  phone TEXT,
  email TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);

-- Create timezone change audit table (used by Task 1.4 triggers)
CREATE TABLE IF NOT EXISTS timezone_change_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('organization', 'location')),
  entity_id TEXT NOT NULL,
  previous_timezone TEXT,
  new_timezone TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_timezone_change_audit_entity ON timezone_change_audit(entity_type, entity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_timezone_change_audit_changed_by ON timezone_change_audit(changed_by);

-- Attach updated_at trigger to new tables
CREATE TRIGGER update_organization_settings_updated_at
BEFORE UPDATE ON organization_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
