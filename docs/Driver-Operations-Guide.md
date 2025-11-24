## Driver Operations Guide - Driver Assignment Overhaul

This guide explains how driver-related operations work across the system with the new Driver Assignment Overhaul features for different audiences: board directors (outcomes and controls), project designers (architecture and UX flows), and employees/dispatchers (day-to-day usage). It covers appointment creation, transportation segments, driver assignment modes, capacity planning, assistive assignment engine, escalation management, and enhanced notifications with practical scenarios and SOPs.

### Who should read this
- **Board/Leadership**: Understand operational visibility, safety controls, and the KPI impact of the drivers board.
- **Project/UX Designers**: See how concepts map to real workflows; know where to extend safely.
- **Dispatchers/Operations**: Learn the exact steps to add appointments, segment transportation, assign/reassign drivers, and resolve conflicts.

---

## Core Concepts

- **Appointment**: A scheduled service for a patient. Stored in `appointments`. Created via `/api/appointments` and the UI `AppointmentForm`.
- **Staff**: Includes drivers and clinical staff. Stored in `staff`. Filter drivers via `staff_type = 'driver'`.
- **Transportation Segment**: A leg of travel tied to an appointment (pickup, dropoff, stay-with-staff, metro assist, custom). Multiple segments can exist per appointment. Managed by `TransportationSegmentService`.
- **Assignment Mode**: Determines when drivers are assigned - "Assign Now" (immediate) or "Assign Later" (deferred to unassigned queue).
- **Capacity Planner**: Dashboard for managing driver assignments, viewing unassigned segments, and monitoring system capacity.
- **Assistive Assignment Engine**: Intelligent driver recommendation system based on travel feasibility, availability, specialization, and preferences.
- **Unassigned Queue**: Segments waiting for driver assignment, organized by priority and escalation status.
- **Escalation Management**: Six-hour deadline system for unassigned segments with automatic alerts and duty manager notifications.
- **Drivers Board**: A per-driver timeline view showing all assigned transportation segments for a selected date, with quick actions for reassignment and status updates.
- **Calendars & Notifications**: Appointments and staff assignments are synced to Google Calendar when enabled; Telegram notifications are sent for creations, updates, and reschedules.

---

## High-level Outcomes (for Board Directors)

- **Operational visibility**: Capacity planner and drivers board surface real-time segment assignments, unassigned queue, and conflicts, reducing missed handoffs and double-bookings.
- **Safety and reliability**: Conflict warnings, escalation alerts, and explicit handoff segments make responsibility clear at every moment.
- **Scalable dispatching**: Assignment modes and structured segments allow more complex, multi-driver workflows without relying on ad-hoc notes.
- **Measurable performance**: Clear segmentation, analytics dashboard, and KPI tracking enable utilization analytics per driver and per segment type.
- **Intelligent assignment**: Assistive assignment engine provides data-driven driver recommendations, reducing manual decision-making and improving efficiency.
- **Proactive management**: Six-hour escalation system prevents last-minute assignment failures and ensures operational continuity.
- **Cost optimization**: Driver utilization tracking, public transport alternatives, and assignment optimization reduce operational costs.

---

## System Architecture (for Project Designers)

- **UI**
  - Drivers board page: `src/app/driver-board/page.tsx`
  - Capacity planner dashboard: `src/app/capacity-planner/page.tsx`
  - Metrics dashboard: `src/app/metrics/page.tsx`
  - Board component: `src/components/features/appointments/calendar/DriverSegmentsBoard.tsx`
  - Capacity planner: `src/components/features/appointments/calendar/CapacityPlannerDashboard.tsx`
  - Unassigned queue: `src/components/features/appointments/calendar/UnassignedQueue.tsx`
  - Insights panel: `src/components/features/appointments/calendar/InsightsPanel.tsx`
  - Reassignment modal: `src/components/features/appointments/calendar/DriverReassignmentModal.tsx`
  - Appointment form/modal: `src/components/features/appointments/AppointmentForm.tsx`, `src/components/features/appointments/AppointmentModal.tsx`
  - Segment editor: `src/components/features/appointments/SegmentEditor/`

- **APIs**
  - Create appointment: `src/app/api/appointments/route.ts` (POST)
  - Update appointment: `src/app/api/appointments/[id]/route.ts` (PUT)
  - Segments CRUD: `src/app/api/transportation-segments` (by convention; service is authoritative)
  - Driver capacity: `src/app/api/driver-capacity/route.ts`
  - Metrics: `src/app/api/metrics/route.ts`
  - Escalation monitoring: `src/app/api/escalation-monitoring/route.ts`
  - Staff CRUD/queries: `src/app/api/staff`

- **Services**
  - Appointment operations: `src/services/appointmentService.ts`
  - Staff linkage: `src/services/appointmentStaffService.ts`
  - Transportation segments: `src/services/transportationSegmentService.ts`
  - Driver scoring: `src/services/driverScoringService.ts`
  - Driver recommendations: `src/services/driverRecommendationService.ts`
  - Metrics collection: `src/services/metricsCollectionService.ts`
  - Escalation alerts: `src/services/escalationAlertService.ts`
  - Escalation monitoring: `src/services/escalationMonitoringService.ts`
  - Vendor notifications: `src/services/vendorNotificationService.ts`
  - Override analytics: `src/services/overrideAnalyticsService.ts`
  - Calendar sync: `src/services/unifiedCalendarSyncService.ts` and `src/services/compatibleUnifiedCalendarSyncService.ts`

- **Types & Validation**
  - Appointment types: `src/types/appointment.ts`
  - Transportation segments types: `src/types/transportationSegment.ts`
  - Appointment form validation: `src/lib/validations/appointment.ts`

- **Feature Flags**
  - `DRIVER_ASSIGNMENT_OVERHAUL` gates core assignment mode functionality
  - `DRIVER_ASSIGNMENT_OVERHAUL_UI` gates UI components
  - `DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER` gates capacity planner dashboard
  - `DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE` gates driver scoring and recommendations
  - `DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS` gates metrics and analytics
  - `DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION` gates escalation monitoring
  - `TRANSPORTATION_SEGMENTS_ENABLED` gates segment creation/usage during rollouts
  - `GOOGLE_CALENDAR_ENABLED` gates calendar sync

---

## Day-to-day Flow (for Dispatchers/Employees)

### 1) Create an Appointment with Assignment Mode
1. Open the appointment creation UI (Modal/Form).
2. Fill: patient, type, date, start time, duration, status, notes.
3. If transportation is needed, set `transportation_type = driver`.
4. **Choose Assignment Mode**:
   - **Assign Now**: Driver must be selected immediately (traditional workflow)
   - **Assign Later**: Driver can be assigned later, segment goes to unassigned queue
5. Save.

Under the hood:
- POST `/api/appointments` validates and creates the record (`AppointmentService.createAppointment`).
- System auto-creates pickup/dropoff segments based on transportation type and assignment mode.
- "Assign Now" segments require immediate driver selection and are created with "scheduled" status.
- "Assign Later" segments are created with "draft" status and appear in unassigned queue.
- If calendar sync is enabled, calendar entries are created for assigned staff/drivers.
- Telegram notifications are sent based on assignment mode and driver presence.

### 2) Use Capacity Planner for Assignment Management
**For Assign Later segments**: Use the capacity planner to manage unassigned segments and optimize driver assignments.

1. Access capacity planner via navigation menu or dashboard.
2. View three-pane layout:
   - **Driver Lanes** (left): Shows assigned segments per driver
   - **Unassigned Queue** (center): Shows segments waiting for assignment
   - **Insights Panel** (right): Shows metrics and analytics
3. **Assign Segments**:
   - Drag segments from unassigned queue to driver lanes
   - Use driver recommendations as starting point
   - Override recommendations when necessary with proper reasons
   - Monitor escalation alerts and prioritize urgent segments

Under the hood:
- Capacity planner fetches segments via `/api/transportation-segments` and driver data via `/api/staff`.
- Driver recommendations are provided by `DriverScoringService` and `DriverRecommendationService`.
- Assignment changes trigger notifications and calendar updates.
- Override reasons are logged for analytics via `OverrideAnalyticsService`.

### 3) Add Transportation Segments (optional but recommended)
Why: Segments make complex logistics explicit and assignable per leg.

- Segment types include pickup, dropoff, stay-with-staff, metro assist, and custom.
- Segments are auto-created for driver transportation or can be manually created.
- Each segment may specify time window, origin/destination, driver, and assignment mode.

Under the hood:
- Segment validation and CRUD is handled by `TransportationSegmentService`.
- When a segment's driver is assigned, the service syncs the driver into `appointment_staff` for consistent notifications and calendar behavior.
- Assignment mode determines segment status and queue placement.

### 4) Assign or Reassign Drivers
You can assign at multiple levels:
- **Appointment-level**: Set `driver_id` (legacy/simple). Good for single-driver, single-leg cases.
- **Segment-level**: Assign driver per segment (preferred). Good for multi-leg or handoff scenarios.
- **Capacity Planner**: Drag-and-drop assignment from unassigned queue to driver lanes.

**Assignment Methods**:
- **From appointment form**: Direct driver selection for "Assign Now" mode
- **From capacity planner**: Drag segments to driver lanes with recommendations
- **From drivers board**: Click segment, choose Reassign, pick a new driver
- **Quick actions**: Status updates (en route, completed) and calling the driver

Under the hood:
- PUT segment updates trigger `TransportationSegmentService` which syncs into `appointment_staff` to keep calendars/notifications in sync.
- Driver recommendations are provided by `DriverScoringService` with scoring based on travel feasibility, availability, specialization, and preferences.
- Override reasons are captured and logged for analytics when recommendations are not followed.
- Appointment PUT with `staff_assignments` replaces existing staff links with the provided ones, then triggers reschedule notifications.

### 5) Monitor and Operate from the Drivers Board and Capacity Planner
**Drivers Board**:
- Access via the header navigation (car icon) or map control shortcut.
- Choose a date to see per-driver timelines of all segments.
- Use search and filters for drivers or segments.
- Conflict warnings surface overlapping commits for a driver.
- Act inline: update status, reassign, call, or open edit.

**Capacity Planner**:
- Access via navigation menu for comprehensive assignment management.
- View unassigned queue with priority indicators and escalation alerts.
- Monitor driver utilization and travel gaps.
- Use insights panel for performance metrics and recommendations.
- Drag-and-drop segments between drivers for optimal assignment.

---

## Capacity Planner Details

**Three-Pane Layout**:
- **Driver Lanes** (Left): Each driver has a vertical timeline lane showing assigned segments with color coding, timing, and status indicators
- **Unassigned Queue** (Center): Segments waiting for assignment, organized by priority (Critical, High, Medium, Low) and time windows
- **Insights Panel** (Right): Real-time metrics including driver utilization, assignment backlog, override rates, and escalation alerts

**Key Features**:
- **Drag-and-Drop Assignment**: Drag segments from unassigned queue to driver lanes with visual feedback
- **Driver Recommendations**: Intelligent suggestions based on travel feasibility, availability, specialization, and preferences
- **Escalation Management**: Visual indicators for segments approaching 6-hour deadline with automatic alerts
- **Time Window Controls**: 12h, 24h, 48h, 72h, 7d, and custom date ranges
- **Priority Scoring**: Segments scored by urgency and escalation state for optimal assignment order
- **Conflict Detection**: Automatic warnings for scheduling conflicts and travel feasibility issues

**Data Flow**:
- Fetches segments via `/api/transportation-segments` with assignment mode and status filters
- Driver recommendations provided by `/api/driver-capacity` and scoring services
- Assignment changes trigger notifications and calendar updates
- Override reasons logged for analytics and system improvement

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

### Scenario G: Assign Later Workflow
- Create appointment with "Assign Later" mode for future appointment (24+ hours ahead).
- System creates segments in "draft" status and places them in unassigned queue.
- Dispatcher uses capacity planner to review unassigned segments and driver availability.
- Drag segments to driver lanes based on recommendations or manual selection.
- System sends notifications to assigned drivers and updates calendar events.

### Scenario H: Driver Recommendation Override
- System suggests Driver A with 85% score based on travel feasibility and availability.
- Patient specifically requests Driver B due to previous positive experience.
- Dispatcher selects Driver B and chooses "Patient preference" override reason.
- System logs override for analytics and proceeds with assignment.
- Driver B receives notification and calendar event is created.

### Scenario I: Escalation Alert Management
- Segment approaching 6-hour deadline without driver assignment.
- System highlights segment in red in unassigned queue and creates escalation alert.
- Dispatcher receives visual alert and must assign driver or escalate to duty manager.
- If no driver available, dispatcher escalates to duty manager via system.
- Duty manager receives Telegram notification and takes appropriate action.
- System tracks escalation response time for analytics.

### Scenario J: Capacity Planner Daily Workflow
- Dispatcher starts day by reviewing capacity planner dashboard.
- Checks unassigned queue for segments requiring assignment.
- Reviews driver utilization and travel gaps in driver lanes.
- Uses insights panel to monitor performance metrics and alerts.
- Assigns segments using drag-and-drop with driver recommendations.
- Monitors escalation alerts and responds to urgent segments.
- Exports daily metrics for leadership review.

---

## SOPs (Standard Operating Procedures)

- **Adding Appointments**
  - Always verify date/time and patient before saving.
  - Choose appropriate assignment mode based on timing and complexity.
  - Use "Assign Now" for same-day or urgent appointments.
  - Use "Assign Later" for future appointments (24+ hours ahead).
  - Use segments if any leg differs in driver, timing, or modality.

- **Assignment Mode Selection**
  - **Assign Now**: Use when driver availability is confirmed, same-day appointments, or patient requires immediate confirmation.
  - **Assign Later**: Use for future appointments, complex multi-driver scenarios, or when reviewing driver options.

- **Capacity Planner Usage**
  - Start each day by reviewing unassigned queue and escalation alerts.
  - Use driver recommendations as starting point for assignments.
  - Drag segments to driver lanes for visual confirmation.
  - Monitor driver utilization and travel gaps.
  - Override recommendations when necessary with proper reasons.

- **Assigning Drivers**
  - Prefer segment-level assignment when there are multiple legs.
  - For simple single-leg visits, appointment-level `driver_id` is acceptable.
  - Use capacity planner for optimal assignment of unassigned segments.
  - Resolve conflicts on the board promptly; reassign with the modal.

- **Driver Recommendations**
  - Follow high-scoring recommendations (80+ points) when possible.
  - Override recommendations for patient preferences, specializations, or operational requirements.
  - Always provide override reason and optional notes.
  - Monitor override patterns for system improvement.

- **Escalation Management**
  - Monitor unassigned queue regularly to prevent escalations.
  - Assign drivers well before 6-hour deadline.
  - Acknowledge escalation alerts immediately.
  - Escalate to duty manager if no driver available.
  - Document resolution and lessons learned.

- **During the Day**
  - Keep segment statuses current (en route, arrived, complete) for accurate visibility.
  - Use the call action for rapid contact from the board.
  - Monitor capacity planner for new assignments and escalations.
  - Review insights panel for performance metrics.

- **Cancellations & Reschedules**
  - Update segment and appointment statuses; the system handles calendar/notification updates.
  - Reassign unassigned segments to other drivers if possible.
  - Update capacity planner to reflect changes.

---

## Extensibility Notes (for Designers/Developers)

- **Availability & Travel Time**: If you add travel-time heuristics, surface them as advisories, not blockers.
- **Bulk Operations**: Consider batch reassignment tools for surge days (ensure idempotent updates and clear audit logs).
- **Role Sync**: `TransportationSegmentService` syncs driver roles into `appointment_staff` to unify calendar/notification logic—preserve this pattern.
- **Feature Flags**: Keep `DRIVER_ASSIGNMENT_OVERHAUL` and related flags during staged rollouts and migrations.
- **Driver Scoring**: `DriverScoringService` provides extensible scoring algorithm—add new factors by extending the scoring weights and factors.
- **Recommendation Engine**: `DriverRecommendationService` supports caching and metadata persistence—extend for new recommendation types.
- **Analytics Integration**: `MetricsCollectionService` provides structured data collection—extend for new KPIs and metrics.
- **Escalation System**: `EscalationAlertService` and `EscalationMonitoringService` provide extensible escalation workflows—customize thresholds and notification methods.
- **Vendor Integration**: `VendorNotificationService` supports multiple notification methods—extend for new vendor types and integration patterns.

---

## Troubleshooting

- **Drivers not appearing on the board**: Ensure `staff.staff_type = 'driver'` and the staff record is active.
- **Segment updates not visible**: Use refresh; verify segment API succeeded and that you're viewing the correct date.
- **Calendar not updating**: Check `GOOGLE_CALENDAR_ENABLED` and the staff's `google_calendar_id`.
- **Duplicate notifications**: Ensure you're not mixing legacy `driver_id` and `appointment_staff` duplicates for the same person.
- **Assignment mode not appearing**: Check `DRIVER_ASSIGNMENT_OVERHAUL_UI` feature flag is enabled.
- **Capacity planner not accessible**: Verify `DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER` feature flag is enabled.
- **Driver recommendations not showing**: Check `DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE` feature flag and driver scoring service.
- **Escalation alerts not working**: Verify `DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION` feature flag and escalation monitoring service.
- **Analytics dashboard empty**: Check `DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS` feature flag and metrics collection service.
- **Unassigned queue not updating**: Verify segment assignment mode and status filters are correct.

---

## Glossary

- **Segment**: A single leg of transportation related to an appointment.
- **Handoff**: Transition of responsibility from one driver to another.
- **Board**: The visual timeline of segments per driver.
- **Sync**: Pushing events/updates to external calendars and sending Telegram notices.
- **Assignment Mode**: Determines when drivers are assigned - "Assign Now" (immediate) or "Assign Later" (deferred).
- **Capacity Planner**: Dashboard for managing driver assignments and monitoring system capacity.
- **Unassigned Queue**: Segments waiting for driver assignment, organized by priority and escalation status.
- **Driver Scoring**: Algorithm that ranks drivers based on travel feasibility, availability, specialization, and preferences.
- **Escalation**: System that alerts when segments are unassigned 6 hours before planned start time.
- **Override**: Manual selection of non-recommended driver with reason capture for analytics.
- **Insights Panel**: Real-time metrics display showing driver utilization, assignment backlog, and performance indicators.

---

## Appendix: Key Files

- **UI Components**
  - `src/app/driver-board/page.tsx` - Drivers board page
  - `src/app/capacity-planner/page.tsx` - Capacity planner dashboard
  - `src/app/metrics/page.tsx` - Analytics dashboard
  - `src/components/features/appointments/calendar/DriverSegmentsBoard.tsx` - Enhanced drivers board
  - `src/components/features/appointments/calendar/CapacityPlannerDashboard.tsx` - Capacity planner component
  - `src/components/features/appointments/calendar/UnassignedQueue.tsx` - Unassigned queue component
  - `src/components/features/appointments/calendar/InsightsPanel.tsx` - Insights panel component
  - `src/components/features/appointments/calendar/DriverReassignmentModal.tsx` - Driver reassignment modal
  - `src/components/features/appointments/AppointmentForm.tsx` - Enhanced appointment form
  - `src/components/features/appointments/SegmentEditor/` - Segment editor components

- **API Endpoints**
  - `src/app/api/appointments/route.ts` - Appointment CRUD
  - `src/app/api/appointments/[id]/route.ts` - Appointment updates
  - `src/app/api/transportation-segments/route.ts` - Enhanced segments API
  - `src/app/api/driver-capacity/route.ts` - Driver capacity metrics
  - `src/app/api/metrics/route.ts` - Analytics and metrics
  - `src/app/api/escalation-monitoring/route.ts` - Escalation management

- **Core Services**
  - `src/services/appointmentService.ts` - Enhanced appointment operations
  - `src/services/appointmentStaffService.ts` - Staff linkage management
  - `src/services/transportationSegmentService.ts` - Enhanced segment management
  - `src/services/driverScoringService.ts` - Driver scoring algorithm
  - `src/services/driverRecommendationService.ts` - Driver recommendations
  - `src/services/metricsCollectionService.ts` - Metrics collection
  - `src/services/escalationAlertService.ts` - Escalation alert management
  - `src/services/escalationMonitoringService.ts` - Escalation monitoring
  - `src/services/vendorNotificationService.ts` - Vendor notifications
  - `src/services/overrideAnalyticsService.ts` - Override analytics
  - `src/services/unifiedCalendarSyncService.ts` - Calendar sync
  - `src/services/compatibleUnifiedCalendarSyncService.ts` - Compatible calendar sync

- **Types & Validation**
  - `src/types/appointment.ts` - Enhanced appointment types
  - `src/types/transportationSegment.ts` - Enhanced segment types
  - `src/lib/validations/appointment.ts` - Enhanced validation schemas
  - `src/lib/featureFlags.ts` - Feature flag definitions
