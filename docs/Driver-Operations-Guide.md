## Driver Operations Guide

This guide explains how driver-related operations work across the system for different audiences: board directors (outcomes and controls), project designers (architecture and UX flows), and employees/dispatchers (day-to-day usage). It covers appointment creation, transportation segments, driver assignment, the drivers board, notifications, and calendar sync behaviors with practical scenarios and SOPs.

### Who should read this
- **Board/Leadership**: Understand operational visibility, safety controls, and the KPI impact of the drivers board.
- **Project/UX Designers**: See how concepts map to real workflows; know where to extend safely.
- **Dispatchers/Operations**: Learn the exact steps to add appointments, segment transportation, assign/reassign drivers, and resolve conflicts.

---

## Core Concepts

- **Appointment**: A scheduled service for a patient. Stored in `appointments`. Created via `/api/appointments` and the UI `AppointmentForm`.
- **Staff**: Includes drivers and clinical staff. Stored in `staff`. Filter drivers via `staff_type = 'driver'`.
- **Transportation Segment**: A leg of travel tied to an appointment (pickup, dropoff, stay-with-staff, metro assist, custom). Multiple segments can exist per appointment. Managed by `TransportationSegmentService`.
- **Drivers Board**: A per-driver timeline view showing all assigned transportation segments for a selected date, with quick actions for reassignment and status updates.
- **Calendars & Notifications**: Appointments and staff assignments are synced to Google Calendar when enabled; Telegram notifications are sent for creations, updates, and reschedules.

---

## High-level Outcomes (for Board Directors)

- **Operational visibility**: Drivers board surfaces real-time segment assignments and conflicts, reducing missed handoffs and double-bookings.
- **Safety and reliability**: Conflict warnings and explicit handoff segments make responsibility clear at every moment.
- **Scalable dispatching**: Structured segments allow more complex, multi-driver workflows without relying on ad-hoc notes.
- **Measurable performance**: Clear segmentation enables utilization analytics per driver and per segment type.

---

## System Architecture (for Project Designers)

- **UI**
  - Drivers board page: `src/app/driver-board/page.tsx`
  - Board component: `src/components/features/appointments/calendar/DriverSegmentsBoard.tsx`
  - Reassignment modal: `src/components/features/appointments/calendar/DriverReassignmentModal.tsx`
  - Appointment form/modal: `src/components/features/appointments/AppointmentForm.tsx`, `src/components/features/appointments/AppointmentModal.tsx`

- **APIs**
  - Create appointment: `src/app/api/appointments/route.ts` (POST)
  - Update appointment: `src/app/api/appointments/[id]/route.ts` (PUT)
  - Segments CRUD: `src/app/api/transportation-segments` (by convention; service is authoritative)
  - Staff CRUD/queries: `src/app/api/staff`

- **Services**
  - Appointment operations: `src/services/appointmentService.ts`
  - Staff linkage: `src/services/appointmentStaffService.ts`
  - Transportation segments: `src/services/transportationSegmentService.ts`
  - Calendar sync: `src/services/unifiedCalendarSyncService.ts` and `src/services/compatibleUnifiedCalendarSyncService.ts`

- **Types & Validation**
  - Appointment types: `src/types/appointment.ts`
  - Transportation segments types: `src/types/transportationSegment.ts`
  - Appointment form validation: `src/lib/validations/appointment.ts`

- **Feature Flags**
  - `TRANSPORTATION_SEGMENTS_ENABLED` gates segment creation/usage during rollouts.
  - `GOOGLE_CALENDAR_ENABLED` gates calendar sync.

---

## Day-to-day Flow (for Dispatchers/Employees)

### 1) Create an Appointment
1. Open the appointment creation UI (Modal/Form).
2. Fill: patient, type, date, start time, duration, status, notes.
3. If transportation is needed, set `transportation_type = driver` and optionally add `transportation_method`.
4. Save.

Under the hood:
- POST `/api/appointments` validates and creates the record (`AppointmentService.createAppointment`).
- If calendar sync is enabled, a calendar entry is created for assigned staff/drivers (if any are attached at creation time).
- Telegram notifications may be sent for same-day creations.

### 2) Add Transportation Segments (optional but recommended)
Why: Segments make complex logistics explicit and assignable per leg.

- Segment types include pickup, dropoff, stay-with-staff, metro assist, and custom.
- Segments can be created at appointment creation (behind flag) or after creation.
- Each segment may specify time window, origin/destination, and driver.

Under the hood:
- Segment validation and CRUD is handled by `TransportationSegmentService`.
- When a segment’s driver is assigned, the service can sync the driver into `appointment_staff` for consistent notifications and calendar behavior.

### 3) Assign or Reassign Drivers
You can assign at two levels:
- Appointment-level: Set `driver_id` (legacy/simple). Good for single-driver, single-leg cases.
- Segment-level: Assign driver per segment (preferred). Good for multi-leg or handoff scenarios.

From the drivers board:
- Click a segment, choose Reassign, pick a new driver.
- Quick actions allow status updates (e.g., en route, completed) and calling the driver.

Under the hood:
- PUT segment updates trigger `TransportationSegmentService` which may sync into `appointment_staff` to keep calendars/notifications in sync.
- Appointment PUT with `staff_assignments` replaces existing staff links with the provided ones, then triggers reschedule notifications.

### 4) Monitor and Operate from the Drivers Board
- Access via the header navigation (car icon) or map control shortcut.
- Choose a date to see per-driver timelines of all segments.
- Use search and filters for drivers or segments.
- Conflict warnings surface overlapping commits for a driver.
- Act inline: update status, reassign, call, or open edit.

---

## Drivers Board Details

What you see:
- **Per-driver lanes**: Each driver has a vertical lane with timeline cards for their segments.
- **Segment cards**: Show type (pickup/dropoff/etc.), time window, locations, and status.
- **Warnings**: Overlaps and travel feasibility flags (if configured) indicate risk.
- **Actions**: Reassign, update status, call driver, open full edit.

Data flow:
- The board fetches segments (`/api/transportation-segments`) and driver list (`/api/staff?staff_type=driver`).
- User actions call segment update endpoints (status, driver reassignment), then refresh the view.

Benefits:
- Clear ownership per leg
- Fast changes without opening full appointment editors
- Better prevention of double-assignments

---

## Calendar & Notification Behavior

- **Calendar Sync**
  - When enabled, staff assignments (including synced driver roles) are pushed to Google Calendar.
  - Legacy `driver_id` is respected when `appointment_staff` is absent.
  - Updates propagate on appointment or staff changes (create/update flows in Unified services).

- **Telegram Notifications**
  - New appointments and reschedules trigger driver/staff notifications with relevant fields.
  - Segment-aware messaging may be included when available.

---

## Real-world Scenarios

### Scenario A: Simple One-leg Ride (single driver)
- Create appointment with `transportation_type = driver`.
- Either assign `driver_id` at the appointment level or create one pickup segment and assign that driver.
- Board shows one segment under that driver; calendar and notifications go to the driver.

Edge cases:
- Driver unavailable: Reassign from the board; the calendar is updated and the driver is notified.

### Scenario B: Two-leg Ride (different drivers for pickup and dropoff)
- Create appointment; add two segments: pickup and dropoff.
- Assign Driver X to pickup, Driver Y to dropoff.
- Board shows each segment in the respective driver’s lane; no confusion over handoff.

Edge cases:
- Pickup delayed: Update the pickup segment status to reflect delay and adjust dropoff segment start if necessary.
- Dropoff driver changes mid-day: Reassign dropoff segment from the board; notifications and calendars update only for that leg.

### Scenario C: Stay-with-Staff Segment
- Create appointment; add pickup, stay-with-staff (long block), and dropoff.
- Assign the same driver to all segments, or split pickup and dropoff to different drivers while one driver stays on site.
- Board visually blocks the timeline so dispatch sees the long engagement.

Edge cases:
- Mid-stay break: Split the stay segment into two if needed; assign relief driver for the gap.

### Scenario D: Metro Assist + Taxi Handoff
- Create appointment; add metro assist segment from home to station, then taxi assist from station to hospital.
- Assign Driver A to metro assist, Driver B to taxi assist.
- Board clearly shows two different drivers across the route.

Edge cases:
- Metro assist runs overtime: Reassign taxi assist segment to another driver with availability.

### Scenario E: No-show / Cancellation
- Update segment status to cancelled and, if needed, appointment status to cancelled.
- Calendar entries are removed or updated per sync policy; Telegram notifies relevant staff.

### Scenario F: Overlapping Assignments Warning
- Assigning a driver to segments that overlap will surface a warning on the board.
- Dispatcher may proceed (manual override) or reassign to resolve the conflict.

---

## SOPs (Standard Operating Procedures)

- **Adding Appointments**
  - Always verify date/time and patient before saving.
  - Use segments if any leg differs in driver, timing, or modality.

- **Assigning Drivers**
  - Prefer segment-level assignment when there are multiple legs.
  - For simple single-leg visits, appointment-level `driver_id` is acceptable.
  - Resolve conflicts on the board promptly; reassign with the modal.

- **During the Day**
  - Keep segment statuses current (en route, arrived, complete) for accurate visibility.
  - Use the call action for rapid contact from the board.

- **Cancellations & Reschedules**
  - Update segment and appointment statuses; the system handles calendar/notification updates.

---

## Extensibility Notes (for Designers/Developers)

- **Availability & Travel Time**: If you add travel-time heuristics, surface them as advisories, not blockers.
- **Bulk Operations**: Consider batch reassignment tools for surge days (ensure idempotent updates and clear audit logs).
- **Role Sync**: `TransportationSegmentService` syncs driver roles into `appointment_staff` to unify calendar/notification logic—preserve this pattern.
- **Feature Flags**: Keep `TRANSPORTATION_SEGMENTS_ENABLED` during staged rollouts and migrations.

---

## Troubleshooting

- Drivers not appearing on the board: Ensure `staff.staff_type = 'driver'` and the staff record is active.
- Segment updates not visible: Use refresh; verify segment API succeeded and that you’re viewing the correct date.
- Calendar not updating: Check `GOOGLE_CALENDAR_ENABLED` and the staff’s `google_calendar_id`.
- Duplicate notifications: Ensure you’re not mixing legacy `driver_id` and `appointment_staff` duplicates for the same person.

---

## Glossary

- **Segment**: A single leg of transportation related to an appointment.
- **Handoff**: Transition of responsibility from one driver to another.
- **Board**: The visual timeline of segments per driver.
- **Sync**: Pushing events/updates to external calendars and sending Telegram notices.

---

## Appendix: Key Files

- UI
  - `src/app/driver-board/page.tsx`
  - `src/components/features/appointments/calendar/DriverSegmentsBoard.tsx`
  - `src/components/features/appointments/calendar/DriverReassignmentModal.tsx`
  - `src/components/features/appointments/AppointmentForm.tsx`

- APIs & Services
  - `src/app/api/appointments/route.ts`
  - `src/app/api/appointments/[id]/route.ts`
  - `src/services/appointmentService.ts`
  - `src/services/appointmentStaffService.ts`
  - `src/services/transportationSegmentService.ts`
  - `src/services/unifiedCalendarSyncService.ts`
  - `src/services/compatibleUnifiedCalendarSyncService.ts`

- Types & Validation
  - `src/types/appointment.ts`
  - `src/types/transportationSegment.ts`
  - `src/lib/validations/appointment.ts`

