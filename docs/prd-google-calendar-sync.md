# PRD: Google Calendar Sync for Staff Scheduling

## 1. Overview

Introduce one-way Google Calendar synchronisation for staff members so that appointments created in
Best DOC Scheduler automatically appear on the staff member’s Google Calendar. The web
application remains the source of truth: all appointment lifecycle changes originate here and are
mirrored to Google Calendar when (and only when) a staff member opts in.

## 2. Objectives & Success Metrics

- **Accurate mirroring:** 100% of create/update/cancel flows for connected staff result in the
  corresponding Google Calendar event being updated within 60 seconds.
- **Opt-in adoption:** At least 60% of active staff connect their calendars within the first month of
  rollout.
- **Operational visibility:** Support agents can see sync status per staff member and per
  appointment, with clear remediation actions when something breaks.
- **Resilience:** Repeated transient failures auto-retry; revocation or expired tokens revert the
  staff member to a "Not connected" state without crashing primary flows.

## 3. In-Scope

- Add data model fields and migrations to track Google OAuth token metadata and event references.
- Build OAuth initiation and callback endpoints (server side) that handle token exchange securely.
- Extend appointment lifecycle logic (create/update/delete) to invoke Google Calendar sync for all
  connected staff assignments.
- Update Telegram bot messaging to promote the connect flow and confirm success.
- Extend admin/staff UI to surface connection status, connection date, last sync timestamp, and
  offer manual re-sync / disconnect actions.
- Add logging, telemetry, and alerting to observe sync behaviour.

## 4. Out of Scope / Future Work

- Two-way sync (changes originating from Google) — only prepare extension points.
- Shared calendars, room resources, or multi-calendar fan-out beyond the staff member’s selected
  calendar.
- Bulk historical backfill of past appointments (manual script can be considered later).
- Mobile push notifications or non-Telegram communication updates related to calendar status.

## 5. Stakeholders

- **Product:** Scheduling PM (primary sponsor), Operations PM (reviewer).
- **Engineering:** Core web team, Integrations team, DevOps/Infra for secret management.
- **Support:** Customer success coaches, support engineers using admin console.
- **Security:** Data protection officer validating token storage + scopes.

## 6. Current State Analysis

### 6.1 Architecture & Key Services

- `src/services/appointmentService.ts` handles CRUD for appointments; `createAppointment` is used
  by `POST /api/appointments` and recurring copy flows; `updateAppointment` and
  `deleteAppointment` are used by `PUT/DELETE /api/appointments/[id]`.
- API handlers in `src/app/api/appointments/` orchestrate staff assignments, Telegram notifications,
  and currently assume web DB writes are synchronous.
- The Telegram bot is implemented via `src/services/telegramNotificationService.ts` and
  `src/app/api/telegram/webhook/route.ts`. Staff records store `telegram_user_id` and
  `telegram_verified`.
- Background jobs live under `src/jobs/` (e.g., `simple30MinReminderJob.ts`) and rely on the same
  services.

### 6.2 Database Snapshot (Supabase/Postgres)

- `public.staff` — contains staff identity, status, working hours, `telegram_user_id`, and
  `telegram_verified`. No Google-related fields currently; email may be null.
- `public.appointments` — stores appointment date/time, transportation data, recurring metadata,
  notes (`mini_notes`, `full_notes`, `pickup_instructions`). No Google linkage fields after the
  cleanup migration (`20250101000000_remove_outdated_communication_methods.sql`).
- `public.appointment_staff` — join table with `role`, `is_primary`, and a legacy
  `google_event_id` column that is now unused; expect to supersede with new sync metadata.

### 6.3 Configuration & Secrets

- Environment variables are validated in `src/lib/env.ts`. No Google credentials exist today.
- Supabase extensions include `uuid-ossp` and `pgcrypto`, enabling PGP-style encryption at rest.
- No shared encryption utility is present in `src/lib/` yet; secret handling will likely require a new
  helper or direct use of Postgres `pgp_sym_encrypt`/`pgp_sym_decrypt` via SQL functions.

### 6.4 Observability

- Logging is via `console.log` / `console.error`, with structured emoji cues.
- No existing alerting pipeline for integration failures; we must extend logging service or create a
  specialised monitor.

## 7. Functional Requirements

### 7.1 Data Model Extensions

Add schema changes via Supabase migrations (one new migration preferred):

`staff`
- `gc_is_connected` BOOLEAN NOT NULL DEFAULT FALSE.
- `gc_oauth_access_token` BYTEA (encrypted) — store encrypted token blob.
- `gc_oauth_refresh_token` BYTEA (encrypted).
- `gc_oauth_expires_at` TIMESTAMPTZ NULLABLE — expiry of access token.
- `gc_calendar_id` TEXT NULLABLE — explicit calendar selection; default to primary if null.
- `gc_connected_at` TIMESTAMPTZ NULLABLE — audit timestamp of successful connection.

`appointments`
- `gc_event_id` TEXT NULLABLE — the Google event identifier.
- `gc_last_synced_at` TIMESTAMPTZ NULLABLE — timestamp of last successful sync.

Additional considerations:
- Do NOT drop existing columns (backwards compatibility).
- Ensure encrypted columns use project conventions: implement Postgres functions or stored
  procedures to enforce encryption/decryption, or create triggers using `pgp_sym_encrypt` and a new
  `GOOGLE_OAUTH_ENCRYPTION_KEY` secret.
- Add supporting indexes where beneficial (e.g., partial index on `appointments(gc_event_id)` for
  quick lookup, `staff(gc_is_connected)` if used frequently).
- Update Supabase row-level security policies if necessary to reference new columns (read access is
  acceptable; writes restricted to service role client).

### 7.2 OAuth Connect Flow

Create REST endpoints in Next.js (location: `src/app/api/google-calendar/`):

1. **POST /api/google-calendar/initiate**
   - Input: staff ID (authenticated via session or token used by internal admin channel).
   - Generate a short-lived, signed state token that encodes staff ID and expiry (e.g., 10 minutes).
   - Construct Google OAuth URL with scopes limited to `https://www.googleapis.com/auth/calendar.events`.
   - Return the redirect URL; also used to construct Telegram deep-link.

2. **GET /api/google-calendar/callback**
   - Validate `state` (decode, verify expiry, ensure staff still exists and is active).
   - Exchange `code` for access + refresh token via Google OAuth endpoints. Use a server-side fetch
     with client credentials stored in env (`GOOGLE_OAUTH_CLIENT_ID`, `..._SECRET`,
     `GOOGLE_OAUTH_REDIRECT_URI`).
   - Encrypt and store tokens + expiry, set `gc_is_connected = true`, `gc_connected_at = now()`, and
     default `gc_calendar_id` based on Google response (primary calendar) unless user selects a
     specific one later.
   - Respond with a lightweight success page (e.g., “You can close this window”); optionally render
     staff name for reassurance.

3. **Optional GET /api/google-calendar/calendars** (future) — list user calendars if we need manual
   selection. For MVP, assume primary calendar; keep placeholder comments for future extension.

Token storage rules:
- Encrypt before persisting; never log raw tokens.
- Store expires_in -> compute expiry timestamp; add small safety buffer (e.g., minus 60 seconds).
- On failure, mark attempt as failed and include reason in telemetry.

### 7.3 Telegram Bot Integration

- When `telegramNotificationService.sendAppointmentNotificationsToStaff` prepares a notification for
  a staff member with `gc_is_connected = false`, include an inline button linking to the
  redirection URL from `/api/google-calendar/initiate?staffId=...`.
- Provide a manual `/connect_calendar` Telegram command that re-sends the link.
- After callback success, send “✅ Google Calendar connected” message via `telegramService`.
- If tokens become invalid and we disable the connection, trigger bot message: “⚠️ Google Calendar
  disconnected. Tap to reconnect.”

### 7.4 Calendar Sync Engine

Implement a new service module `src/services/googleCalendarSyncService.ts` with responsibilities:

- **createEvent(appointment, staff)** — create Google Calendar event; return event ID.
- **updateEvent(eventId, appointment, staff)** — update existing event.
- **deleteEvent(eventId, staff)** — delete Google event.
- **refreshAccessToken(staff)** — called when Google API returns 401/invalid_token (one retry).
- Use `retryWithBackoff` from `src/lib/retryUtils.ts` for transient errors; cap attempts (e.g., 3).
- Compose requests using `fetch` to Google Calendar API with JSON payloads.
- Inject metadata into description: patient name, phone, address, notes, internal appointment ID,
  service type. Avoid exposing PHI beyond what’s necessary; follow current Telegram content levels.
- Set event start/end in RFC3339 with timezone derived from appointment context (likely Dubai).
- Respect user reminders: do not send `reminders` in payload unless future requirement dictates.

### 7.5 Appointment Lifecycle Hooks

Extend existing flows without breaking Telegram notifications:

- `appointmentService.createAppointment`
  - After DB insert and before returning, enqueue or trigger calendar sync for each assigned staff
    with `gc_is_connected = true`. If staff assignments happen after creation (current API), ensure
    the API handler performs sync post-assignment.
  - Save returned `gc_event_id` and `gc_last_synced_at` on appointment record.

- `appointmentService.updateAppointment`
  - If `gc_event_id` exists, call `updateEvent`; if missing but staff connected, call `createEvent`.
  - Persist updated sync metadata.

- `appointmentService.deleteAppointment`
  - If `gc_event_id` exists, delete Google event, clear event ID, set `gc_last_synced_at`.

- `appointmentStaffService.assignStaffToAppointment`
  - After assigning a connected staff to an appointment, ensure sync runs for that staff (event may
    need to be created if none exists yet).

- All operations must be idempotent: guard against duplicate retries by checking stored event ID and
  staff connection state.

### 7.6 Execution Model

- Prefer asynchronous background job if queue infrastructure exists. Today, no queue; implement a
  lightweight job runner using existing `operationQueue` utilities (see `src/lib/operationQueue.*`).
- Fallback to synchronous execution with clear logging and 5-second HTTP timeout per API call.
- Introduce jittered retry for Google API rate limits (HTTP 429). After max retries, log failure and
  set staff to “Needs Attention”.

### 7.7 Admin & UI Enhancements

- **Staff detail view (`/staff` modal & list):**
  - Display connection chip (Connected / Not connected / Needs Attention).
  - Show `gc_connected_at` (formatted) when available.
  - Provide “Disconnect Google Calendar” button with confirmation modal; on confirm, remove tokens,
    set `gc_is_connected = false`, clear `gc_calendar_id`, and optionally call Google token revoke
    endpoint if refresh token still valid.

- **Appointment detail drawer:**
  - Show latest sync status: `Synced ✅ (HH:MM)` or `Sync pending ⚠️`.
  - Add “Re-sync now” button (admin only) to invoke create/update logic manually; disable while
    operation in flight.

- **Settings / Admin panel:** optionally add a list of staff flagged as “Needs Attention” due to
  repeated sync failures.

### 7.8 Logging, Monitoring & Alerts

- Create structured logs via `loggingService` with context: appointment ID, staff ID, action
  (`create`, `update`, `delete`), outcome, error type (transient vs fatal).
- Track consecutive failures per staff in DB (new field `gc_failure_count`?) or ephemeral store.
  - If >3 failures in 24h, set status to “Needs Attention”, notify internal channel (email, Slack, or
    existing Telegram monitoring endpoint if available).
- Add basic metrics counters (even console-level) summarising success/failure totals.

### 7.9 Error Handling & Recovery

- Token expiration: on 401/invalid_grant, attempt silent refresh. If refresh fails, disconnect staff
  and notify via Telegram.
- Network or Google API errors: retry with backoff; log details without exposing tokens.
- Database errors when saving metadata: treat as critical; surface to Sentry if configured.
- Manual re-sync should recover from missing event by re-creating it.

### 7.10 Security & Compliance

- Minimal OAuth scope (`calendar.events`).
- Store encryption key in env (`GOOGLE_OAUTH_ENCRYPTION_KEY`) and rotate via ops runbook.
- Never log tokens or raw patient data; mask phone numbers in logs if necessary.
- Ensure CSRF protection on callback (validate `state` and optional anti-replay store).
- Document manual revoke steps if automated revoke is not available.

### 7.11 Future Extension Hooks

- Add TODO references in sync service for handling Google push notifications (webhooks) or polling.
- Document how to map inbound event updates to appointments using `gc_event_id`.
- Outline conflict resolution rule (“Web app wins”).

## 8. Non-Functional Requirements

- Endpoints must respond within 2 seconds (excluding OAuth redirect round-trips).
- Background job should process within 60 seconds of appointment change.
- System should handle at least 50 appointments per minute without rate-limit exhaustion.
- Unit/integration tests must cover token refresh logic and failure states.

## 9. Acceptance Criteria

1. Staff receives Telegram link to connect Google Calendar when first notified; after completing
   OAuth, their staff profile shows Connected status and `gc_connected_at` is populated.
2. Creating a new appointment for connected staff creates Google event; `gc_event_id` and
   `gc_last_synced_at` populate in DB.
3. Updating appointment time updates Google event (same event ID).
4. Cancelling appointment deletes Google event, clears `gc_event_id`, updates
   `gc_last_synced_at`.
5. Re-sync button regenerates event if missing or updates existing event.
6. Expired access token refreshes automatically once; on failure, staff toggles to Not connected and
   receives Telegram reconnect prompt.
7. Disconnect action clears tokens, disables sync, and prevents future calendar calls until
   reconnected.
8. Logging shows success/failure with IDs; repeated failures flag staff as Needs Attention.

## 10. Testing Strategy

- **Unit tests:**
  - Sync service (create/update/delete payload formatting, retry behaviour, token refresh).
  - OAuth state token utilities (sign/verify expiry).
  - Staff/appointment service hooks (ensure correct branching when `gc_is_connected` false/true).
- **Integration tests:**
  - API initiation and callback flows with mocked Google endpoints.
  - Telegram bot command injecting connect link.
  - Appointment API end-to-end tests verifying DB fields updated.
- **Manual QA:**
  - Full connect flow via Telegram message -> OAuth -> confirm -> create/update/cancel appointment.
  - Simulated token expiry (manually short expiry), verifying silent refresh.
  - Force Google API failure (mock 500) to confirm retries and Need Attention flagging.

## 11. Deployment & Migration Plan

1. **Prepare secrets:** Add Google OAuth client ID/secret, redirect URI, encryption key to env
   templates (`config/env.production.template`) and infrastructure secrets store.
2. **Run migrations:** Deploy new Supabase migration adding fields + encryption helpers.
3. **Deploy code:** Feature gated via environment flag (`ENABLE_GOOGLE_CAL_SYNC`?) to allow staged
   rollout.
4. **Backfill:** Optional script to mark existing staff as Not connected explicitly (ensuring default
   false) and clear any legacy `appointment_staff.google_event_id` references.
5. **Rollout:** Start with pilot group (internal staff). Monitor logs; once stable, announce to all.

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Misconfigured OAuth redirect | Users cannot connect | Add health-check endpoint that tests configuration; include alarms. |
| Token leakage | Severe | Enforce encryption, secret scanning, minimal logging. |
| Google API rate limits | Sync delays | Implement backoff + batching, consider per-staff throttle. |
| Appointment assignment changes out of order | Duplicate events | Guard with idempotency checks and store per-staff event IDs once global model supports it. |
| Telegram link misuse | Unauthorized connections | Signed state token includes staff ID + expiry + HMAC. |

## 13. Open Questions

1. Do we need to support per-staff calendar selection at connect time, or is primary calendar
   sufficient? (MVP assumes primary.)
2. Should we extend `appointment_staff` to store per-staff `gc_event_id` if multiple staff share an
   appointment? Current requirement stores event ID at appointment level; confirm if single event per
   appointment is enough.
3. Where should encryption helpers live — SQL functions in migration or application-level helper in
   `src/lib/crypto.ts`? Alignment with security team required.
4. Should disconnect action call Google’s token revocation endpoint automatically? Need confirmation
   from compliance.
5. What is the fallback UI if Google API is down? Consider warning banner near staff status.

## 14. Appendix A — Sequence Overview (text)

```
Staff receives Telegram notification -> bot detects gc_is_connected = false -> message includes
"Connect Google Calendar" link -> staff taps link -> browser opens
/api/google-calendar/initiate?staffId=... -> server generates state & redirects to Google consent ->
user authorises -> Google redirects to /api/google-calendar/callback?code=...&state=... -> server
validates state, exchanges code for tokens -> encrypted tokens stored in staff record ->
appointmentService hooks run -> googleCalendarSyncService.createEvent called -> event ID stored ->
Telegram bot sends confirmation message.
```

```
Appointment updated -> appointmentService.updateAppointment writes DB -> sync service checks
existing gc_event_id -> updateEvent -> success logs -> gc_last_synced_at refreshed.
```

```
Appointment cancelled -> appointmentService.deleteAppointment -> sync service deleteEvent ->
appointment.gc_event_id cleared -> Telegram cancellation message -> staff record unaffected.
```

## 15. Glossary

- **GC:** Google Calendar
- **OAuth:** Open Authorization protocol for delegated access
- **State token:** Signed payload used to prevent CSRF/replay in OAuth flows
- **Needs Attention:** Internal flag meaning manual intervention required for a staff connection
