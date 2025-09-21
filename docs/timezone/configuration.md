# Timezone Configuration Guide

This guide summarizes how organization and location timezones are configured after completing Task 1.0 of the timezone PRD.

## Data Model Recap

- `organization_settings`
  - Single row (`id = 'primary'`) holding the default IANA timezone for the organization plus descriptive metadata.
  - Writes are restricted to the Supabase service role via row-level security.
  - Updates automatically log into `timezone_change_audit` through triggers.
- `locations`
  - One row per physical clinic/location with required `timezone` column.
  - `timezone_source` is maintained automatically (`inherited` when matching the organization default, otherwise `override`).
  - Updates also flow into `timezone_change_audit`.
- `timezone_change_audit`
  - Append-only history capturing previous/new timezone values, actor, and timestamp for organization and location changes.

## Seeding & Backfill

- Fresh environments receive defaults from `supabase/seed.sql`.
  - Inserts `'Best DOC Organization'` with `Asia/Dubai` as the starting timezone.
  - Creates a `'primary-location'` entry using the legacy Dubai office metadata.
- Existing environments migrate via the following migrations (run in order):
  1. `20250921000100_timezone_hierarchy.sql`
  2. `20250921000200_timezone_backfill.sql`
  3. `20250921000300_timezone_rls_audit.sql`
- The backfill script copies rows from the legacy `office_settings` table (if present). It is safe to run multiple times due to `ON CONFLICT` upserts.

## Operational Notes

- Updating a timezone through the API/UI should supply the authenticated user context so `auth.uid()` is available for audit trails. When unavailable, the triggers fall back to the `updated_by` field.
- The service role must continue to be used for writes from Next.js API routes; anonymous clients have read-only access to both settings tables and the audit log.
- Legacy consumers of `office_settings` remain functional during the transition. Plan follow-up work to surface the new tables in `src/app/api/settings/office/route.ts` before deprecating the JSON blob.

## Verification Checklist

- [ ] Run `supabase db reset` locally and confirm the seed script populates both tables with Dubai defaults.
- [ ] Update a location's timezone and verify a row is appended to `timezone_change_audit`.
- [ ] Ensure Playwright/Jest fixtures reference `organization_settings`/`locations` for timezone metadata instead of hard-coded `Asia/Dubai` strings.
