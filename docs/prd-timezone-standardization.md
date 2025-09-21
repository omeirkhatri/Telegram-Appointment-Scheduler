# Product Requirements Document: Timezone Standardization & Location Overrides

## 1. Overview

### 1.1 Purpose
Define the product, engineering, and rollout requirements for centralizing timezone management across Best DOC. The initiative introduces an organization-wide timezone setting, mandatory per-location overrides, and consistent conversion tooling so every date- and time-sensitive experience reflects a single source of truth.

### 1.2 Problem Statement
Today the platform mixes browser-detected locales, hard-coded offsets (for example, `+4` for Dubai), and UTC timestamps. Near-midnight appointments appear on different dates across calendar, list, and map views, and downstream analytics and reminders inherit the same inconsistencies. As the business operates in multiple regions, the lack of authoritative timezone control blocks accurate scheduling, reporting, and compliance.

### 1.3 Objectives
- Eliminate manual offset handling by storing timestamps in UTC and rendering them via a shared timezone resolver.
- Allow administrators to configure a default organization timezone and override it per location without relying on a user’s device.
- Ensure every UI, report, notification, and integration respects the configured timezone hierarchy.
- Provide tooling and documentation to migrate legacy integrations and data safely.

### 1.4 Success Metrics
- Appointment counts match across calendar, list, and map views in 100% of QA spot checks.
- Timezone-related support tickets decrease by ≥80% within one month of launch.
- Automated midnight-boundary regression suite passes in three representative timezones (e.g., `Asia/Dubai`, `Europe/London`, `America/New_York`).
- Reminder and notification delivery windows stay within ±1 minute of the intended local time.

## Progress Notes

- 2025-09-21: Wrapped Tasks 1.1–1.5. Delivered schema design and migrations (`docs/timezone/timezone-schema-design.md`, `supabase/migrations/20250921000100_timezone_hierarchy.sql`, `20250921000200_timezone_backfill.sql`, `20250921000300_timezone_rls_audit.sql`) plus seed/docs updates (`supabase/seed.sql`, `docs/timezone/configuration.md`). Tests were deferred because the work was DDL/doc only; no blockers raised.
- 2025-09-22 (Task 2.1): Refactored `src/utils/timezone.ts` into the shared resolver, added memoization cache controls, and rewrote unit coverage (`src/utils/date.test.ts`). Tests: `npm test -- src/utils/date.test.ts` (pass). No regressions observed.
- 2025-09-22 (Task 2.2): Extended validation utilities, surfaced shared types (`src/types/timezone.ts`), and wired environmental fallbacks through `src/lib/env.ts`. Tests: reran `npm test -- src/utils/date.test.ts` to confirm context handling. No issues.
- 2025-09-22 (Task 2.3): Added ESLint rule `timezone/no-legacy-timezone` (`eslint.config.mjs`, `eslint-rules/no-legacy-timezone.js`) to block new Dubai literals and offsets. Validation: `npx eslint src/utils/timezone.ts` (pass). Attempting `npm run lint` surfaced numerous legacy violations unrelated to this change—left untouched for future cleanup.
- 2025-09-22 (Task 2.4): Authored `docs/timezone/resolver-guide.md` covering backend/frontend adoption patterns and environment helpers. No automated tests required (documentation update only).

- 2025-09-24 (Task 6.1): Implemented Supabase-backed timezone context resolution for API requests via `src/services/timezoneContextService.ts` and `src/lib/apiUtils.ts`; scheduling (`src/app/api/appointments/route.ts`), reporting (`src/app/api/reports/export/route.ts`, `src/app/api/reports/statistics/route.ts`), and Telegram (`src/app/api/telegram/webhook/route.ts`) endpoints now emit local-time metadata on demand. Tests: `npm test -- src/utils/date.test.ts`. Caveat: falls back to legacy/environment timezone when service-role credentials are missing.
- 2025-09-24 (Task 6.2): Added strict API version validation and negotiated headers across the same endpoints, using `formatResponseForVersion` + `addVersionHeaders` to return legacy-safe CSV/JSON payloads with consistent metadata. Updated exports to honor `include_timezone_metadata` and ensured headers advertise enabled features. Tests: `npm test -- src/utils/date.test.ts`.

## 2. Scope

### 2.1 In Scope
- Organization-level timezone selector using the canonical IANA database.
- Required per-location timezone overrides with inheritance from the organization value when unset.
- New conversion utilities available to backend and frontend services.
- Updates to scheduling surfaces, map view, reports, reminders, and public/internal APIs.
- Migration tooling for legacy offsets and coordination with third-party integrations.

### 2.2 Out of Scope
- Per-user timezone preferences or overrides.
- Historical timezone snapshots per appointment or audit records.
- Mobile application redesigns or changes unrelated to timezone handling.
- Backfilling past exports or external systems beyond recalculation from stored UTC timestamps.

## 3. Personas
- **Clinic Administrator**: Configures organization defaults, manages location overrides, and expects consistent reporting.
- **Location Manager / Dispatcher**: Schedules daily appointments for a specific site, needs midnight handling to be reliable.
- **Caregiver / Field Staff**: Consumes reminders and map routes; relies on accurate local times for punctuality.
- **Integration Partner**: Consumes APIs and must align on timezone semantics when ingesting or sending appointment data.
- **Support & Engineering**: Diagnoses discrepancies, monitors scheduled jobs, and maintains tzdata health.

## 4. Current State & Pain Points
- Mixed reliance on browser locale, server default timezone, and manual offsets yields inconsistent displays.
- Some modules convert UTC to local time, others perform arithmetic on hour fields, creating drift after midnight.
- Map view markers, calendar counts, and list summaries disagree for late-night appointments.
- Legacy integrations send local times without offsets, forcing brittle handling on ingestion.
- Debug tooling and logs lack clarity about the effective timezone, complicating support escalations.

## 5. User Stories

### 5.1 Primary Stories
- **As an Administrator**, I can set the organization timezone and know every surface uses it unless a location override exists.
- **As a Location Manager**, I can select my clinic’s timezone and immediately see calendars, maps, and reminders adjust.
- **As a Scheduler**, I can book an appointment at 02:30 for a Dubai location and see it listed under the correct date everywhere.
- **As Field Staff**, I receive reminder notifications that match the local time I expect, even when my device is in another zone.

### 5.2 Secondary Stories
- **As Support**, I can view audit logs detailing who changed timezone settings and when.
- **As Engineering**, I can rely on a shared conversion utility rather than replicating timezone calculations in each service.
- **As an Integration Partner**, I can request timezone metadata through the API and align payloads accordingly.

## 6. Functional Requirements

### 6.1 Settings & Configuration
- **FR-1**: Provide an organization settings screen component with searchable IANA timezone list (friendly labels such as `Asia/Dubai (UTC+4)`).
- **FR-2**: Restrict organization-level timezone edits to Administrator role; audit log entries capture actor, previous value, new value, and timestamp (UTC).
- **FR-3**: Add a per-location timezone selector. If unset, the location inherits the organization timezone and displays an explicit "Using organization timezone" badge.
- **FR-4**: Persist timezone selections on the organization and location records; API returns both the descriptor (`Asia/Dubai`) and current UTC offset.
- **FR-5**: Display contextual helper text explaining daylight-saving behavior for the selected zone (e.g., "No daylight saving time").

### 6.2 Data & Platform
- **FR-6**: All persisted timestamps remain in UTC. No new columns store local-time derivatives.
- **FR-7**: Introduce a shared timezone resolver utility accessible to backend services, scheduled jobs, and frontend clients. The util must: accept organization id, optional location id, and a UTC timestamp; return moment objects for the effective timezone; cache repeated lookups.
- **FR-8**: Remove all manual `±` hour adjustments from code; lint or static checks should flag new usages.
- **FR-9**: Health check endpoints verify the runtime tz database contains configured zones, failing noisily when missing.

### 6.3 User Interfaces
- **FR-10**: Calendar (Month/Week/Day), Map, and List views reference the effective timezone for header dates, "Today" indicators, appointment blocks, and counts.
- **FR-11**: Appointment forms surface the resolved timezone and show both local and UTC timestamps for debugging (collapsible panel).
- **FR-12**: Map view debug panel and marker tooltips append the offset label (e.g., `02:30 (UTC+4)`).
- **FR-13**: Filters by date range or "Today" re-evaluate server queries based on the effective local-day boundaries.
- **FR-14**: Any UI referencing current time (dashboards, upcoming widgets) uses the organization timezone when detached from a specific location.

### 6.4 Notifications & Automation
- **FR-15**: Reminder scheduler accepts appointment UTC timestamp and location id; conversions to send windows use the shared resolver.
- **FR-16**: Batch jobs (daily summaries, overnight syncs) accept timezone context and execute according to local midnight boundaries.
- **FR-17**: Notification payloads include both local send time and UTC timestamp for auditing.

### 6.5 APIs & Integrations
- **FR-18**: All public/internal APIs expose timestamps in ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`).
- **FR-19**: Introduce metadata endpoint `/timezones` (name TBD) returning organization timezone, per-location overrides, and effective offsets.
- **FR-20**: Update appointment creation/update endpoints to accept optional `local_time` with explicit offset; service converts to UTC. Reject payloads lacking offset when `local_time` is present.
- **FR-21**: Version and document API changes; deprecate legacy behaviors where offsets were inferred.
- **FR-22**: Provide migration guides to partners and enforce the new contract by a communicated deadline.

### 6.6 Permissions & Audit
- **FR-23**: Restrict timezone edits to users with `manage_settings` or location-admin equivalent.
- **FR-24**: Log timezone changes, including old/new values, actor, IP, and reason (optional notes).
- **FR-25**: Surface recent changes in an Admin dashboard widget for quick discovery.

## 7. Non-Functional Requirements
- Conversion utility must handle at least 10,000 conversions per minute without performance degradation.
- Frontend bundles must tree-shake timezone libraries; incremental increase ≤30 KB gzip.
- Changes must be backwards-compatible during rollout; feature flag gating required.
- Accessibility: new UI labels follow WCAG AA contrast, and timezone controls support keyboard navigation.

## 8. Technical Considerations
- Prefer `Luxon` or `date-fns-tz` for frontend; `Temporal` polyfills optional if stable.
- Ensure Node runtime ships with `full-icu`; container images need explicit tzdata updates as part of CI/CD.
- Provide TypeScript typings for timezone resolver to enforce usage patterns.
- Create ESLint rule or custom codemod to disallow direct arithmetic on `Date.getHours()` etc. for appointment logic.

## 9. Migration & Rollout Plan

### 9.1 Discovery & Planning
- Inventory existing modules using manual offsets or browser locales (calendar services, exports, map debug panels, analytics jobs).
- Identify all integrations relying on local timestamps; engage stakeholders with timeline and testing plan.
- Produce migration playbook outlining expected downtime (none) and fallbacks.

### 9.2 Data Preparation
- Build script to map each location to the most likely IANA timezone using stored metadata; default to organization selection when uncertain.
- Validate script output with administrators; provide CSV for manual confirmation.
- Backfill caches, denormalized tables, and analytics shards by recalculating local dates using the resolver.

### 9.3 Implementation Phases
1. Ship timezone resolver library and static analysis guardrails (dark launch).
2. Integrate resolver into backend scheduling APIs and reminders behind feature flag.
3. Update frontend surfaces sequentially (calendar → map → list → analytics dashboards).
4. Enable metadata endpoint and updated API contracts; allow partners to opt-in via versioned headers.

### 9.4 Validation & Rollout
- Run regression suite covering midnight crossings for at least three location overrides.
- QA to verify new settings UI, audit logs, and fallback inheritance.
- Pilot with one multi-location organization; monitor metrics and logging for 48 hours.
- GA rollout once anomaly rate remains <1% (appointments requiring manual correction) during pilot.

### 9.5 Post-Launch
- Monitor support dashboards for timezone-related tickets.
- Provide in-app announcement summarizing changes and linking to documentation.
- Schedule retrospective to capture learnings and prepare backlog for optional per-user overrides.

## 10. Dependencies & Assumptions
- Runtime environments maintain up-to-date tzdata packages.
- Appointment records currently store precise UTC timestamps (no missing offsets).
- Notification infrastructure can accept timezone context without manual cron adjustments.
- Integration partners will comply with new API requirements within the communicated window.

## 11. Risks & Mitigations
- **Incorrect Location Mapping**: Validate script output with admins; provide dry-run reports before applying.
- **Client Cache Staleness**: Force version bump and clear service worker caches when timezone settings change.
- **Performance Regression**: Memoize resolver outputs and batch conversions for high-volume jobs.
- **Partner Non-Compliance**: Offer sandbox environment and clear deprecation timeline; monitor API usage to enforce cutoff.
- **tzdata Drift**: Add automated checks in CI to compare container tzdata versions against canonical releases.

## 12. Analytics & Monitoring
- Dashboards tracking timezone changes (frequency, actors).
- KPI panels comparing reminder send vs. scheduled times.
- Alerting when resolver throws errors or fallback timezone applied.
- Synthetic tests hitting calendar endpoints around midnight for key locations.

## 13. Acceptance Criteria & Validation
- End-to-end tests demonstrate that an appointment at 02:30 `Asia/Dubai` appears on the correct local date in all views and reminder schedules.
- API contract tests confirm responses remain in UTC and include timezone metadata payloads.
- Manual QA checklist signed off for: settings edit flow, inheritance, audit logs, reports, exports, and notification previews.
- Documentation published and linked from settings UI.

## 14. Documentation & Training
- Admin guide detailing how to configure organization and location timezones, with callouts on inheritance rules.
- Integration migration guide, including sample payloads and testing checklist.
- Internal runbook for Support covering tracing tools, audit logs, and troubleshooting steps.
- Release notes for product marketing and customer newsletters.

## 15. Future Considerations
- Evaluate per-user timezone preferences once organization/location hierarchy stabilizes.
- Explore calendar heatmaps or analytics that visualize appointments across multiple timezones simultaneously.
- Assess need for automated tzdata update notifications to administrators.
