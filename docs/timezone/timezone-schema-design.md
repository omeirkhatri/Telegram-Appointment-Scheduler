# Timezone Schema Design (Task 1.1)

## Current State Summary
- The only persisted location metadata lives in the single-row `office_settings` table (`supabase/migrations/20250120000002_office_settings.sql`).
- `office_settings.settings` stores name, address, map coordinates, and contact info as JSON, but there is no persisted timezone column anywhere in the schema.
- Location concepts inside the application treat "office" as a singleton, so downstream services rely on hard-coded `Asia/Dubai` offsets.

## Requirements Recap
- Persist a default organization timezone and expose room for future organization metadata.
- Support multiple physical locations, each with a mandatory timezone override while inheriting the organization default for other metadata.
- Provide an auditable record of timezone changes (actor, old value, new value, timestamp) to satisfy PRD logging requirements.
- Preserve compatibility for existing `office_settings` API consumers during the migration period.

## Proposed Tables & Columns

### 1. `organization_settings`
Single-row table that carries the authoritative organization defaults.

| Column | Type | Details |
| --- | --- | --- |
| `id` | `text` | Primary key, default `'primary'` to avoid future join churn. |
| `display_name` | `text` | Friendly label for admin UI (optional today, ready for growth). |
| `default_timezone` | `text` | Required IANA name. Add `CHECK (default_timezone = ANY (SELECT name FROM pg_timezone_names))` for validation. |
| `metadata` | `jsonb` | Placeholder for additional org-level settings to replace pieces of `office_settings.settings`. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Maintained by `update_updated_at_column()`. |
| `updated_by` | `uuid` | Nullable FK to `auth.users` (set by service role on writes) for audit triggers. |

Indexes: PK on `id`. No additional indexes required until we support multi-org.

### 2. `locations`
Normalized location rows that replace the JSON blob in `office_settings`.

| Column | Type | Details |
| --- | --- | --- |
| `id` | `uuid` | PK, default `uuid_generate_v4()`. |
| `slug` | `text` | Unique identifier for routing/API lookups (e.g. `dubai-main`). |
| `display_name` | `text` | Required human-readable name. |
| `timezone` | `text` | Required IANA timezone with same `CHECK` constraint as organization. |
| `timezone_source` | `text` | Enum-like constraint: `'override'` or `'inherited'` to signal whether `timezone` equals the org default. |
| `address` | `text` | Optional physical address pulled from existing settings. |
| `coordinates` | `jsonb` | `{ "lat": number, "lng": number }` copied from existing data. |
| `phone` | `text` | Optional contact phone. |
| `email` | `text` | Optional contact email. |
| `icon` | `text` | Optional emoji/icon. |
| `color` | `text` | Optional hex color. |
| `is_active` | `boolean` | Defaults to `true`; allows soft-hiding locations later. |
| `created_at` | `timestamptz` | Default `now()`. |
| `updated_at` | `timestamptz` | Maintained trigger. |
| `updated_by` | `uuid` | Nullable FK to `auth.users` for audit triggers. |

Indexes: unique index on `slug`, index on `is_active` for admin filters, future composite indexes as needed.

### 3. `timezone_change_audit`
Central audit table storing history for both organization and location timezone edits.

| Column | Type | Details |
| --- | --- | --- |
| `id` | `uuid` | PK, default `uuid_generate_v4()`. |
| `entity_type` | `text` | `CHECK (entity_type IN ('organization', 'location'))`. |
| `entity_id` | `text` | For organization, use `'primary'`; for locations, store `uuid::text`. |
| `previous_timezone` | `text` | Nullable; empty when seeding first value. |
| `new_timezone` | `text` | Not null; validated against `pg_timezone_names`. |
| `changed_by` | `uuid` | FK to `auth.users`. |
| `changed_at` | `timestamptz` | Default `now()`. |
| `change_reason` | `text` | Optional free-form (UI-supplied). |
| `metadata` | `jsonb` | Optional payload (e.g., request ID, feature flag). |

Indexes: btree on (`entity_type`, `entity_id`, `changed_at DESC`) for quick timelines; optionally on `changed_by` for compliance reports.

## Relationship to Existing `office_settings`
- During migration, keep `office_settings` in place to avoid breaking current API routes.
- Add a migration step that seeds `organization_settings` + `locations` from the current `office_settings.settings` JSON (Task 1.3).
- Update the API layer to read from the new tables once 1.2–1.3 complete; optionally create a Postgres view `office_settings_view` that projects the first active location joined with org defaults for interim compatibility.
- After full rollout, deprecate the `office_settings` table or repurpose it as a view backed by the normalized schema.

## Constraints & Validation Strategy
- Use `pg_timezone_names` lookups in CHECK constraints to guarantee valid IANA identifiers.
- Reuse the existing `update_updated_at_column` trigger on both `organization_settings` and `locations` for timestamp maintenance.
- Ensure NOT NULL constraints on timezone columns so the resolver never receives undefined data.
- `timezone_source` derives in triggers: set to `'override'` when `timezone != organization.default_timezone`, otherwise `'inherited'`.

## Next Steps (Feeds into Tasks 1.2–1.5)
1. Author migrations creating the three tables and associated triggers/checks.
2. Build backfill scripts to move JSON metadata into the normalized `locations` table and seed the organization default from legacy Dubai values.
3. Layer RLS policies granting read to caregivers and full write to admins/service role, plus AFTER UPDATE triggers to insert rows into `timezone_change_audit`.
4. Refresh fixtures/docs to reference `organization_settings` + `locations` instead of `office_settings` once the migrations land.
