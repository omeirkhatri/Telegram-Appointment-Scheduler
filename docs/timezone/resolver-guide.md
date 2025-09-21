# Timezone Resolver Integration Guide

This guide explains how to adopt the shared timezone resolver introduced for the Timezone Standardization PRD.

- `src/utils/timezone.ts` exports the resolver utility and legacy wrappers.
- `src/types/timezone.ts` re-exports the main interfaces for consumption across backend and frontend modules.

## Core Concepts

### Context

```ts
import type { TimezoneContext } from '@/types/timezone';

const context: TimezoneContext = {
  locationTimezone: location.timezone,   // optional string from DB
  organizationTimezone: org.timezone,    // optional string from DB
  fallbackTimezone: undefined,           // optional override
  preferLegacyFallback: false,           // optional flag (defaults to true)
};
```

Provide whatever metadata you have available. The resolver evaluates candidates in this order: explicit override → location → organization → `fallbackTimezone` → environment fallbacks (`NEXT_PUBLIC_ORGANIZATION_TIMEZONE`, `NEXT_PUBLIC_DEFAULT_TIMEZONE`, `NEXT_PUBLIC_TZ`, `TZ`) → legacy Dubai fallback (unless disabled) → `UTC`.

### Resolution

```ts
import {
  resolveTimezone,
  formatInResolvedTimezone,
  toUTC,
  toLocalTime,
} from '@/utils/timezone';

const resolution = resolveTimezone(context);
// resolution => { timezone, source, offsetMinutes, abbreviation, referenceDate }
```

The `source` field clarifies which tier supplied the effective timezone (location, organization, environment, legacy, default).

### Conversion Helpers

- `toUTC(localDateLike, context)` converts a wall-clock date/time into a UTC `Date`.
- `toLocalTime(utcDate, context)` returns a `Date` representing the same instant, adjusted for the resolved timezone.
- `formatInResolvedTimezone(dateLike, formatString, context)` formats directly in the resolved timezone using `date-fns` format tokens.
- `getResolvedDayRange(dateLike, context)` / `getResolvedWeekRange(dateLike, context)` deliver UTC ranges for the local day/week, useful for querying.
- `getResolvedAgendaAnchor(context)` returns the next agenda send time (default cut-off `21:00`).
- `formatAppointmentWindow(appointmentDate, startTime, duration, context)` yields display strings plus resolution metadata for UI payloads.

### Memoization

The resolver caches results keyed by the provided context + options. Use `clearTimezoneResolutionCache()` in tests when you need clean state.

## Backend Usage

```ts
import { resolveTimezone, toUTC } from '@/utils/timezone';

const context = config.timezone.buildResolverContext({
  locationTimezone: dbLocation?.timezone,
  organizationTimezone: dbOrg?.timezone,
});

const utcStart = toUTC(`${payload.date}T${payload.startTime}:00`, context);
await db.upsertAppointment({
  starts_at: utcStart,
  timezone: resolveTimezone(context).timezone,
});
```

## Frontend Usage

```ts
import { formatInResolvedTimezone } from '@/utils/timezone';
import type { TimezoneContext } from '@/types/timezone';

const context: TimezoneContext = {
  locationTimezone: appointment.locationTimezone,
  organizationTimezone: appointment.organizationTimezone,
};

const startLabel = formatInResolvedTimezone(appointment.startsAtUtc, 'HH:mm', context);
```

## Environment Helpers

`config.timezone` (see `src/lib/env.ts`) now exposes:

- `environmentFallbacks`: sanitized list of configured fallback identifiers.
- `buildResolverContext(partialContext)` to seed a `TimezoneContext` with the validated fallback chain.
- `validateEnvironmentFallbacks()` invoked during runtime checks.

## Legacy Helpers

Legacy Dubai functions are still exported for incremental migration but delegate to the resolver.

- `buildLegacyTimezoneContext()` returns the shared legacy context.
- `formatDubaiDate`, `formatDubaiTime`, `getDubaiDayRange`, etc. are wrappers for backward compatibility.

## Static Analysis Guardrail

A custom ESLint rule (`timezone/no-legacy-timezone`) blocks new hard-coded `Asia/Dubai` or manual offset literals. Use the resolver APIs instead of embedding strings or offsets directly. Existing legacy modules are temporarily allow-listed until their migrations land.

## Testing Utilities

- `npm test -- src/utils/date.test.ts` exercises resolver scenarios (location/organization fallback, round-trips, agenda anchor).
- `npx eslint src/utils/timezone.ts` validates static analysis expectations for the resolver code path.

Reset caches between tests with `clearTimezoneResolutionCache()` to avoid cross-test leakage.
