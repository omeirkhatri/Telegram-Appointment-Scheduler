# Backend Timezone Resolver Adoption Audit (Task 3.1)

Date: 2025-09-23
Author: Codex (AI assistant)

## Scope

Task 3.1 requires auditing backend scheduling and notification surfaces to identify legacy Dubai-specific logic and determine the resolver integration plan. The review covered:

- Core scheduling service (`src/services/appointmentService.ts`)
- Staff aggregation + agenda pipeline (`src/services/staffAggregationService.ts`)
- Telegram command handlers + formatting utilities (`src/services/telegramCommandService.ts`, `src/utils/telegramCommandFormatters.ts`)
- Telegram notification formatting/delivery (`src/services/telegramService.ts`, `src/services/telegramNotificationService.ts`)
- Reminder job entry point (`src/jobs/simple30MinReminderJob.ts`)
- Shared formatting helpers used by the above flows (`src/utils/timezone.ts`, `src/utils/telegramFormatters.ts`)

## Findings

| Component | Legacy Timezone Usage | Resolver Adoption Requirements |
| --- | --- | --- |
| `appointmentService` | Persists `appointment_date`/`start_time` as naive strings, calculates recurring occurrences with `new Date()` (implicit server TZ). No linkage to organization/location timezone metadata. | Introduce resolver context derived from appointment location (once available) and organization defaults via `config.timezone.buildResolverContext`. Store canonical UTC timestamps (e.g. `starts_at_utc`, `ends_at_utc`) alongside resolved timezone metadata. Ensure recurrence calculations convert through resolver rather than local `Date` arithmetic. |
| `staffAggregationService` | Uses `getAgendaDate`, `toDubaiTime`, `getDubaiDayRange`, and `formatDubaiTime` wrappers. Daily agenda queries assume Dubai-local day boundaries. | Replace wrappers with resolver equivalents: `config.timezone.buildResolverContext`, `getResolvedDayRange`, `formatInResolvedTimezone`. Surface timezone metadata in agenda payloads. |
| `telegramCommandService` | Imports `getCurrentDubaiTime`, `formatDubaiDate`, `toDubaiTime`, `DUBAI_TIMEZONE`. All command windows (today/tomorrow/week), queries, and cursor math assume Dubai. | Swap to resolver context (per staff location when available). Use `resolveTimezone`, `formatInResolvedTimezone`, and UTC-aware query helpers. Ensure messages include timezone display metadata originating from resolver rather than hard-coded strings. |
| `telegramCommandFormatters` | Formats dates with `format(..., { timeZone: DUBAI_TIMEZONE })`, groups by naive date strings, references “Dubai (GMT+4)” in help copy. | Accept resolver resolution payloads from caller and format using `formatInResolvedTimezone`. Replace static copy with dynamic timezone name/abbreviation. |
| `telegramService` | `formatDailyAgendaMessage` calls `toLocaleDateString` with `timeZone: 'Asia/Dubai'`. | Accept pre-formatted labels or inject resolver context to display local time using utilities. |
| `telegramNotificationService` | Relies on `telegramService` formatter output; no direct timezone logic but subject to upstream changes. | Ensure downstream notifications receive resolver-enriched appointment payloads (local start/end strings + timezone label). |
| `simple30MinReminderJob` | Calls `getCurrentDubaiTime`, filters upcoming appointments using naive Date comparisons, assumes `appointment_date` is local Dubai string. | Resolve current time via resolver context (per appointment) and perform comparisons in UTC. Fetch appointments using UTC window derived from resolver to avoid drift when org moves to new timezone. |
| Shared telegram formatters (`src/utils/telegramFormatters.ts`) | Stores class-level `timezone = 'Asia/Dubai'` and uses legacy formatters. | Parameterize formatter with resolver resolution metadata and remove hard-coded timezone constant. |

## Data & Context Gaps

- Appointment/location linkage is not wired yet. Pending schema updates must expose `location_id` (or equivalent) for the resolver to honor per-location overrides.
- Reminder job currently loads same-day appointments without including location metadata; resolver integration will require joining or augmenting appointment DTOs with timezone context.
- Several helper utilities (`formatDubaiDate`, `getCurrentDubaiTime`) remain exported for legacy callers. We must plan staged replacements to avoid breaking feature-flagged flows.

## Recommended Next Steps

1. Introduce resolver-aware appointment DTOs exposing `timezone`, `timezoneSource`, `startsAtUtc`, and `localStartLabel` fields to downstream consumers.
2. Build thin helper in `src/services/appointmentService.ts` that returns UTC ranges for day/week queries using `getResolvedDayRange`/`getResolvedWeekRange`.
3. Update Telegram command + notification pipelines to request resolver context from appointment metadata; propagate timezone abbreviation in message headers.
4. Refactor reminder jobs to iterate over UTC-sourced appointment windows rather than Dubai-local strings.

Tracking: Tasks 3.2 and 3.3 will implement these changes.
