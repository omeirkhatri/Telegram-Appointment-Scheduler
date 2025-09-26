# PRD: Transportation Segments Upgrade for Driver Scheduling

## 1. Problem Statement
Dispatchers currently assign a single `driver_id` to each appointment. Real-world operations require different drivers for pickup and dropoff, cases where one leg is metro or taxi-assisted, and scenarios where a driver stays with staff for an extended duration. The existing workflow forces manual tracking through notes and phone calls, leading to confusion, double-bookings, and missed hand-offs.

## 2. Goals and Non-Goals
- **Goals**
  - Capture transportation needs as structured segments (pickup, dropoff, stay-with-staff, metro assist, custom) under each appointment.
  - Surface driver availability based on segment timing and travel time, assisting dispatchers without forcing automation.
  - Reuse existing calendar, Telegram notifications, and map features so drivers receive accurate, leg-specific information.
  - Provide management with a clear view of which drivers are engaged on which segments at any moment.
- **Non-Goals**
  - Fully automating driver assignment.
  - Building real-time GPS tracking or route optimization.
  - Replacing manual dispatcher contact with drivers.

## 3. Target Users
- **Dispatchers**: Create and adjust transportation segments while seeing availability, conflicts, and travel feasibility.
- **Drivers**: Receive accurate instructions per segment and visibility into their daily schedule.
- **Operations Managers**: Review utilization and detect patterns (e.g., drivers frequently doing only one leg).

## 4. Current State Summary
- Appointments store a single `transportation_type`, optional `transportation_method`, and one `driver_id`.
- `appointment_staff` allows a `driver` role but does not differentiate pickup vs. dropoff.
- Map, calendar, and Telegram experiences display at most one driver per appointment.
- Google Maps API is already integrated for map display; no distance calculations are performed during scheduling.

## 5. Proposed Solution Overview
Introduce a dedicated `transportation_segments` construct tied to appointments. Each segment captures leg type, planned timing, assigned driver (optional), pickup/dropoff locations, travel estimates, and dispatcher notes. UI screens and notifications become segment-aware, while manual override remains possible.

## 6. Detailed Requirements
### 6.1 Data Model & Backend
- Create `transportation_segment_type_enum`: `pickup`, `dropoff`, `stay_with_staff`, `metro_assist`, `custom`.
- Create `transportation_segment_status_enum`: `draft`, `scheduled`, `in_progress`, `completed`, `cancelled`.
- New table `transportation_segments` with columns:
  - `id UUID PK`.
  - `appointment_id UUID` → `appointments.id` (cascade delete).
  - `segment_type transportation_segment_type_enum`.
  - `title TEXT` (default generated from type, editable for clarity).
  - `planned_start TIMESTAMPTZ` / `planned_end TIMESTAMPTZ` (nullable for flexible segments).
  - `driver_id UUID NULL` → `staff.id` (must be staff_type `driver`).
  - `travel_mode TEXT` (e.g., `vehicle`, `metro`, `taxi`, `on_foot`).
  - `origin JSONB` / `destination JSONB` storing `lat`, `lng`, `address`, `landmark`.
  - `estimated_travel_minutes INTEGER` (from Google Maps API; optional).
  - `estimated_distance_km NUMERIC(6,2)`.
  - `buffer_minutes INTEGER` (dispatcher-added slack).
  - `instructions TEXT` (segment-specific notes).
  - `requires_follow_up BOOLEAN` (flag to remind dispatcher to confirm driver availability).
  - `status transportation_segment_status_enum` default `draft`.
  - `manual_override BOOLEAN` default `false` (set when dispatcher forces assignment despite conflicts).
  - `created_at` / `updated_at` TIMESTAMPTZ triggers.
- Indexes on `appointment_id`, `driver_id`, `planned_start`, `planned_end`, `status`.
- Row-level security mirroring appointments (authenticated users manage segments).
- Extend Supabase RPC or REST handlers:
  - Appointment read endpoints include nested `transportation_segments`.
  - CRUD endpoints for segments with validation (driver type, time ranges, etc.).
  - Validation ensures `planned_end` ≥ `planned_start` and warns if overlapping segments assigned to the same driver.
- Update `appointment_staff` service to optionally create `driver` entries when segments reference drivers, keeping calendars consistent.

### 6.2 Appointment Creation & Editing UI
- Transportation section splits into two modes:
  1. **Simple Mode** (default) to keep current workflow for quick appointments (single driver, self transport). Converting to segments is one click.
  2. **Segment Mode** presenting a timeline editor:
     - Preload default pickup/dropoff segments when dispatch selects `transportation_type = driver`.
     - Allow adding/removing segments, choosing segment type, editing times, locations (search via Google Places), driver selection, and notes.
     - Visual timeline highlighting overlaps, travel gaps, and segment sequence.
     - Show status badges (draft/scheduled) and icons for manual overrides.
- Driver dropdown shows availability indicators:
  - Green: free and travel feasible.
  - Amber: free but tight travel window or manual confirmation needed.
  - Red: conflict or missing prerequisites.
- Display travel estimate chip (`24 min drive • 16 km`) with timestamp of last calculation.
- Provide “Recalculate” button to refresh distance via Google Maps.
- Manual override confirmation dialog when dispatch overrides warnings; sets `manual_override` flag.

### 6.3 Driver Availability & Monitoring Views
- Add “Driver Segments Board” view:
  - Columns per driver (or list with timeline) showing ordered segments for the day.
  - Conflict badges when segments overlap or travel gaps sub-threshold.
  - Filters by date, driver, segment type, status.
  - Quick actions: call driver, mark in-progress/completed, reassign.
- Map view enhancements:
  - Segment markers for origin/destination; connecting polylines optional.
  - Hovering a marker reveals segment info, driver, instructions, travel estimate.
  - Optional toggles to show only pickup/dropoff segments.

### 6.4 Notifications & Calendars
- Google Calendar integration:
  - Generate separate calendar events per segment for the assigned driver when status moves to `scheduled`.
  - Event titles: `[Pickup] Patient Name – 08:30` etc.
  - Update or cancel events when segment changes or driver reassigns.
- Telegram notifications:
  - Include segment-specific cards (e.g., pickup reminder 1 hour before).
  - If driver handles multiple segments for same appointment, consolidate but keep leg detail.
- Daily agenda messages for drivers incorporate segments ordered by `planned_start`.

### 6.5 Distance & Travel-Time Assistance
- Use Google Maps Distance Matrix API:
  - Calculate travel time from previous segment destination (or driver base) to next segment origin.
  - Cache responses via `CoordinateCacheService` for one hour with key per origin/destination pair.
  - Provide API fallback messaging if quota exceeded.
- Configurable threshold defaults (e.g., minimum 20 minutes between segments). Allow dispatchers to adjust per segment using `buffer_minutes`.

### 6.6 Manual Override & Audit Trail
- Every override writes to audit log with reason and user ID.
- Expose override status in UI and reporting.
- Optional reminder job to prompt dispatchers to confirm manual overrides a set time before segment start.

### 6.7 Reporting & Analytics
- Dashboard widgets tracking:
  - Driver utilization by segment type.
  - Percentage of appointments with split drivers.
  - Count of manual overrides per driver.
  - Average travel buffer used vs. planned.
- Export CSV with segment data for external review.

## 7. Integrations & Dependencies
- **Supabase**: new table, enums, RLS policies, updated API routes.
- **Google Maps**: Distance Matrix/API key usage budgeting; Places Autocomplete for origin/destination.
- **Calendar Sync**: Ensure event deletions handled when segments removed.
- **Telegram Service**: Template updates for segment-centric notifications.
- **Feature Flags**: Introduce `TRANSPORTATION_SEGMENTS_ENABLED` for staged rollout.

## 8. Success Metrics
- 50% reduction in dispatcher-reported driver assignment errors within two weeks of rollout.
- 90% of appointments with transportation using structured segments rather than notes.
- Less than 5% of segments flagged with travel conflicts after dispatcher confirmation.
- Positive NPS (>+20) from dispatchers regarding scheduling clarity.

## 9. Risks & Mitigations
- **Complex UI overwhelms dispatchers** → keep Simple Mode, provide training tooltips, pilot with small group.
- **Distance Matrix quota limits** → implement caching, prefetch overnight for next-day segments, monitor usage.
- **Calendar event duplication** → align segment events with existing appointment event IDs and add regression tests.
- **Manual override overuse** → report on override frequency and review weekly.

## 10. Rollout Considerations
- Enable feature flag for pilot team; import historical appointments into segments where feasible.
- Provide documentation and short tutorial video.
- Run parallel tracking for one week before disabling legacy single-driver fields.
- After stabilization, migrate `appointments.driver_id` to be optional and eventually deprecate the field for driver logic (keep for backward compatibility until all integrations updated).

## 11. Plan Details
1. **Foundation**: Implement database schema (enums, table), service layer support, and API surfaces while keeping current UI untouched via feature flag.
2. **Dispatcher Experience**: Introduce Segment Mode editor, availability indicators, travel estimates, and override flow; ensure Simple Mode fallback.
3. **Driver Experience**: Update calendars, Telegram notifications, and new driver board to reflect segments; add manual status updates.
4. **Optimization & Insights**: Add reporting widgets, analytics, and quota safeguards; tune thresholds based on pilot feedback before widening rollout.

## 12. Open Questions
- Should segments support linking to external transport vendors (e.g., taxi companies) for billing?
- Do drivers require mobile acknowledgments per segment, or is calendar/Telegram sufficient?
- What is the minimum viable data required for metro-assisted legs (station list, timings)?
- How long should manual overrides remain flagged before triggering follow-up reminders?

## Progress Notes
- **Task 1.3 (seed fixtures)**
  - Completed: Added pilot-ready segment fixtures to `supabase/seed.sql` referencing sample appointments.
  - Tests: Not run; recommend `psql` smoke test when Supabase instance available.
  - Issues: None; relies on appointments seeded in migration `20240907000000`.

- **Task 1.2 (RLS & rollback)**
  - Completed: Added RLS policies and down-migration teardown inside `supabase/migrations/20250215090000_create_transportation_segments.sql`.
  - Tests: Not run (DDL review only).
  - Issues: None; policies mirror appointments defaults.

- **Task 1.1 (schema foundations)**
  - Completed: Added transportation segment enums/table via `supabase/migrations/20250215090000_create_transportation_segments.sql` (new file).
  - Tests: Not run (schema change only).
  - Issues: None observed; title defaults handled in later tasks.
