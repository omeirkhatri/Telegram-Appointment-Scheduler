# MediCare Scheduler - Fresh Rebuild Plan (Core Scheduling Only)

## Scope (v1)
- Dashboard
- Patients (CRUD + details)
- Staff (CRUD + details)
- Appointments:
  - CRUD
  - Views: Month, Week, Day (FullCalendar), Table (TanStack), Map (Google Maps)
  - Staff assignment (many-to-many)

## Explicit Non-Goals (v1)
- Driver assignment
- Transportation workflows
- Dispatching / route optimization
- Driver-specific calendar descriptions

## Key Architecture Decisions
- App Router + TypeScript
- Single admin (internal tool): skip Auth + RLS initially; add later only if needed
- `timestamptz starts_at/ends_at` in DB (avoid date+time split)
- One appointment editor component reused across all views
- One source of truth for domain types (no duplicate shapes)

## Phase Plan

### Phase 0: Foundation
- Create fresh Next.js project, Tailwind, UI primitives
- App shell + navigation
- Env config (`SUPABASE_*`, `GOOGLE_MAPS_*`, `APP_TIMEZONE`)

### Phase 1: Database
- Minimal schema: `patients`, `staff_members`, `appointments`, `appointment_assignees`
- Indexes on `appointments.starts_at` and `appointment_assignees.staff_id`
- `updated_at` triggers

### Phase 2: Data Layer
- Typed Supabase clients (`browser`/`server`)
- Repos per domain table with consistent error handling
- Zod schemas for input validation (forms + API routes)

### Phase 3: Patients
- `/patients` list (search, create/edit dialog)
- `/patients/[id]` detail (patient info + appointments)

### Phase 4: Staff
- `/staff` list (filters, create/edit dialog)
- `/staff/[id]` detail (assigned appointments)

### Phase 5: Appointments (CRUD + Table)
- `/appointments` workspace with view toggle (URL-driven)
- `AppointmentDialog` shared editor
- API routes for range querying + mutations

### Phase 6: Calendar Views (Month/Week/Day)
- FullCalendar integration (drag/drop + resize)
- Colors from primary assignee staff color
- Filter panel (staff/type/status/search)

### Phase 7: Map View
- Google Maps day view (markers + clustering)
- Side list synced to markers
- Click marker opens `AppointmentDialog`

### Phase 8: Dashboard
- KPIs for today (counts + status breakdown)
- Upcoming list
- Quick actions

### Phase 9: Polish
- Loading/empty/error states
- Toast notifications
- Basic smoke tests (manual; Playwright optional)

## Acceptance Criteria (Must Pass)
- Patients CRUD works end-to-end
- Staff CRUD works end-to-end
- Appointment CRUD works end-to-end with staff assignment
- Switching Month/Week/Day/Table/Map preserves date range + filters
- Drag/drop + resize updates DB (and reverts on failure)
- Map view shows correct appointments for selected day
- No driver/transportation fields in schema or UI
