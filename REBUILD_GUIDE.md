# MediCare Scheduler - Fresh Start Rebuild Guide (Cursor-First)

This is a Cursor-oriented, step-by-step rebuild guide to recreate the app cleanly (no redundant schema/code) with these modules working seamlessly:

- Dashboard
- Patients
- Staff
- Appointments with views: Month, Week, Day, Map, Table

Non-goals for this rebuild: driver assignment, transportation workflows, route planning, dispatching.

---

## How To Use This Guide In Cursor

For each step below:
1. Open the referenced files/folders (or create them).
2. Paste the “Cursor Prompt” into Cursor Chat.
3. Require Cursor to finish the “Definition of Done” before moving on.
4. Keep the app shippable at every milestone (no half-wired features).

---

## STEP 0: Decisions (Lock These First)

### 0.1 Stack
- Next.js (App Router) + TypeScript
- Tailwind + Radix UI (or shadcn/ui)
- Supabase Postgres
- FullCalendar for Month/Week/Day
- Google Maps JS API for Map view
- TanStack Table for Table view
- React Hook Form + Zod for forms

### 0.2 Timezone Rule
- Store all timestamps as `timestamptz` in UTC.
- Display and filter using one business timezone (e.g. `Asia/Dubai`).

### 0.3 Auth & RLS (choose 1)
- **Fastest (internal single-admin):** skip Auth + RLS in v1.
- **Multi-login:** add Supabase Auth + RLS after core UI is stable.

---

## STEP 1: Project Initialization

### 1.1 Create a fresh Next.js project
```bash
npx create-next-app@latest medicare-scheduler --typescript --tailwind --app --src-dir --import-alias="@/*"
cd medicare-scheduler
```

### 1.2 Install dependencies
```bash
npm i @supabase/supabase-js
npm i @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-tabs
npm i @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
npm i @googlemaps/js-api-loader @googlemaps/markerclusterer
npm i @tanstack/react-table
npm i date-fns date-fns-tz
npm i react-hook-form @hookform/resolvers zod
npm i lucide-react
npm i clsx tailwind-merge class-variance-authority
```

### 1.3 Environment variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # server-side only (optional if no RLS)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_APP_TIMEZONE=Asia/Dubai
```

### 1.4 Folder structure (recommended)
```
src/
  app/
    (app)/
      dashboard/
      patients/
      staff/
      appointments/
    api/
  components/
    layout/
    patients/
    staff/
    appointments/
    ui/
  lib/
    db/
    supabase/
    time/
  types/
  utils/
```

**Cursor Prompt**
“Initialize the Next.js app with the dependencies above. Set up a base layout with a left sidebar nav (Dashboard, Patients, Staff, Appointments) and a simple top header. Keep styling minimal but clean; Tailwind only.”

**Definition of Done**
- `npm run dev` starts
- You can navigate to `/dashboard`, `/patients`, `/staff`, `/appointments`

---

## STEP 2: Clean Database Schema (No Driver/Transportation)

### 2.1 Core tables
Create `supabase/migrations/001_core.sql`:

```sql
create extension if not exists "pgcrypto";

do $$ begin
  create type staff_type_enum as enum ('doctor','nurse','physiotherapist','caregiver','lab_technician');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_status_enum as enum ('active','inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_type_enum as enum ('doctor_on_call','lab_test','teleconsultation','physiotherapy','caregiver','iv_therapy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status_enum as enum ('scheduled','confirmed','completed','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  phone text,
  address_line1 text,
  address_line2 text,
  area text,
  city text,
  latitude double precision,
  longitude double precision,
  google_maps_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  staff_type staff_type_enum not null,
  phone text,
  email text,
  status staff_status_enum not null default 'active',
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  appointment_type appointment_type_enum not null,
  status appointment_status_enum not null default 'scheduled',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  location_label text,
  location_address text,
  location_latitude double precision,
  location_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_check check (starts_at < ends_at)
);

create table if not exists appointment_assignees (
  appointment_id uuid not null references appointments(id) on delete cascade,
  staff_id uuid not null references staff_members(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (appointment_id, staff_id)
);

create index if not exists appointments_starts_at_idx on appointments(starts_at);
create index if not exists appointments_patient_id_idx on appointments(patient_id);
create index if not exists appointment_assignees_staff_id_idx on appointment_assignees(staff_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists patients_set_updated_at on patients;
create trigger patients_set_updated_at before update on patients
for each row execute function set_updated_at();

drop trigger if exists staff_members_set_updated_at on staff_members;
create trigger staff_members_set_updated_at before update on staff_members
for each row execute function set_updated_at();

drop trigger if exists appointments_set_updated_at on appointments;
create trigger appointments_set_updated_at before update on appointments
for each row execute function set_updated_at();
```

**Cursor Prompt**
“Create a clean Supabase schema using `timestamptz starts_at/ends_at` for appointments. No driver fields. Add junction table for staff assignments. Add indexes. Keep it minimal and normalized.”

**Definition of Done**
- Migration applies cleanly
- You can insert/select patients, staff_members, appointments, appointment_assignees

---

## STEP 3: Types + Data Access (Zero Redundancy)

### 3.1 TypeScript domain types
Create:
- `src/types/patient.ts`
- `src/types/staff.ts`
- `src/types/appointment.ts`

Rules:
- One “source of truth” for types (no duplicate shapes across folders).
- Model API payloads separately from DB row types if needed.

### 3.2 Supabase clients
Create:
- `src/lib/supabase/browser.ts` (anon key)
- `src/lib/supabase/server.ts` (service role key; `server-only`)

### 3.3 Repositories (one per table)
Create:
- `src/lib/db/patientsRepo.ts`
- `src/lib/db/staffRepo.ts`
- `src/lib/db/appointmentsRepo.ts`

Each repo should expose:
- `list(...)`, `getById(id)`, `create(input)`, `update(id, input)`, `remove(id)`

**Cursor Prompt**
“Implement typed repositories for patients, staff_members, appointments, appointment_assignees. Use explicit `.select()` columns and consistent error handling. No duplicated DTOs.”

**Definition of Done**
- You can call repo functions from a server component without runtime errors

---

## STEP 4: Patients Module (List + Details + Form)

### 4.1 Routes
- `/patients` list (search by name/phone, quick add)
- `/patients/[id]` details (shows patient info + upcoming/past appointments)

### 4.2 UI requirements
- Table with fast search + “New Patient” dialog
- Patient form: name, phone, address, area, city, lat/lng (optional), notes
- Button “Open in Google Maps” if coordinates or `google_maps_url` exist

**Cursor Prompt**
“Build patients list + patient detail pages using the repos. Add a PatientDialog (create/edit) with RHF+Zod validation. Keep the UI consistent with the app shell.”

**Definition of Done**
- Create/edit/delete patient
- Patient detail shows appointment list (even if empty)

---

## STEP 5: Staff Module (List + Details + Form)

### 5.1 Routes
- `/staff` list (filter by staff_type, status)
- `/staff/[id]` details (shows assigned appointments by date range)

### 5.2 UI requirements
- Staff form: full name, type, phone, email, status, color (used in calendar)

**Cursor Prompt**
“Build staff list + staff detail pages. Add StaffDialog (create/edit). Ensure staff colors show in calendar events when assigned.”

**Definition of Done**
- Create/edit/deactivate staff member
- Staff detail shows upcoming appointments assigned

---

## STEP 6: Appointments CRUD (Foundation for All Views)

### 6.1 Single appointment editor (reused everywhere)
Create `AppointmentDialog` used by:
- Calendar click
- Table row edit
- Map marker edit

Fields:
- patient
- appointment_type
- status
- starts_at, ends_at (date + time)
- assigned staff (multi-select; mark primary)
- notes
- optional location override (label/address/lat/lng)

### 6.2 API shape (recommended)
Add route handlers:
- `GET /api/appointments?from=...&to=...&staffId=...&q=...`
- `POST /api/appointments`
- `PATCH /api/appointments/:id`
- `DELETE /api/appointments/:id`

**Cursor Prompt**
“Implement appointments CRUD end-to-end with one AppointmentDialog component. Add API routes to query by date range and filters. Ensure assignees are updated transactionally (delete+insert or upsert).”

**Definition of Done**
- Create/edit/delete appointment
- Staff assignments persist correctly

---

## STEP 7: Appointments Views (Month / Week / Day / Table)

### 7.1 Calendar (Month/Week/Day)
Use FullCalendar:
- Month: `dayGridMonth`
- Week/Day: `timeGridWeek`, `timeGridDay`
- Drag/drop and resize updates appointment time
- Event colors: primary staff color (fallback default)

### 7.2 Table view
Table supports:
- date range filter
- patient name
- type, status
- assigned staff (chips)
- quick edit/open details

**Cursor Prompt**
“Create `/appointments` as a workspace with a view toggle (Month/Week/Day/Table). Use URL query `?view=` so switching views is seamless and shareable. Implement drag/drop + resize with revert on failure.”

**Definition of Done**
- Switching views preserves date range + filters
- Drag/drop updates DB and the UI stays in sync

---

## STEP 8: Map View

### 8.1 Map behaviors
- Shows appointments for selected day (default: today)
- Markers at appointment location (override first, else patient lat/lng)
- Cluster markers at low zoom
- Clicking marker opens AppointmentDialog
- Side list of same appointments (click focuses marker)

**Cursor Prompt**
“Add Map view to the Appointments workspace. Load Google Maps JS API once, cluster markers, and keep map + side list in sync. No route optimization or driver logic.”

**Definition of Done**
- Map renders reliably
- Selecting a different day updates markers

---

## STEP 9: Dashboard

### 9.1 Dashboard content (minimal but useful)
- Today: total appointments + by status
- Next 10 upcoming appointments
- Staff: active count + who is assigned today
- Quick actions: New Patient, New Appointment

**Cursor Prompt**
“Build `/dashboard` with KPI cards and an upcoming appointments list. Use the same query helpers as other modules. Keep it fast: only query what’s needed.”

**Definition of Done**
- Dashboard loads quickly with seeded data

---

## STEP 10: Polish + Quality Gates

### 10.1 UX
- Skeleton loading for tables/calendar
- Toasts for success/error
- Empty states everywhere

### 10.2 Data integrity
- AppointmentDialog prevents `ends_at <= starts_at`
- Deleting a patient deletes appointments (FK cascade)

### 10.3 Smoke test (manual)
- Create patient → create appointment → assign staff → drag appointment → edit notes → view on map → view in table

**Cursor Prompt**
“Add loading/empty states and basic smoke checks (Playwright optional). Ensure no duplicated type definitions and no driver/transportation code exists.”
