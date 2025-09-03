# MediCare Scheduler - Updated Task List

## 1.0 Project Setup and Infrastructure
- [x] 1.1 Initialize Next.js 14 project with TypeScript strict mode and App Router
- [x] 1.2 Configure Tailwind CSS with custom theme for healthcare UI
- [x] 1.3 Set up Supabase local development environment with Docker
- [x] 1.4 Configure environment variables and TypeScript paths
- [x] 1.5 Set up Jest and React Testing Library for testing
- [x] 1.6 Create global error boundary and loading components
- [x] 1.7 Configure ESLint and Prettier with project-specific rules
- [x] 1.8 Set up folder structure following clean code conventions

## 2.0 Database Schema and Migrations
- [x] 2.1 Create patients table with all required fields and constraints
- [x] 2.2 Create staff table with enum types and Google Calendar integration
- [x] 2.3 Create appointments table with JSONB custom_fields and recurring rules
- [x] 2.4 Create appointment_staff junction table with proper relationships
- [x] 2.5 Set up Supabase Storage for patient ID document uploads
- [x] 2.6 Create database indexes for performance optimization
- [x] 2.7 Set up seed data for testing and development
- [x] 2.8 Configure local to cloud migration scripts

## 3.0 Core Data Management (Patients, Staff, Appointments)
- [x] 3.1 Supabase client hardening
- [x] 3.2 Patient model gaps (address, Google Maps link, medical notes, emergency contact, transport, ID upload)
- [x] 3.3 Staff model gaps (staff_type, specialization, google_calendar_id, available_days, email notifications)
- [x] 3.4 Appointment type enums & templates (Doctor on Call, Lab Test, Teleconsultation, Physiotherapy, Caregiver, IV Therapy)
- [x] 3.5 Recurring appointments (recurring_rule JSONB support)

## 4.0 Google Calendar Integration
- [x] 4.1 Set up Google Calendar API v3 authentication and configuration
- [x] 4.2 Implement event creation with proper title and description formatting
- [x] 4.3 Create driver vs medical staff event description builders
- [x] 4.4 Implement bidirectional sync with webhook handling
- [x] 4.5 Add timezone handling (UTC storage, Asia/Dubai display)
- [x] 4.6 Implement conflict resolution and retry logic
- [x] 4.7 Create calendar event update and deletion handlers
- [x] 4.8 Add proper error handling and logging for calendar operations

## 5.0 Calendar UI and Appointment Management
- [x] 5.1 FullCalendar setup (day/week/month/agenda views, 15-min grid)
- [x] 5.2 Drag-and-drop rescheduling (✅ Connected handlers to appointments page with API calls, toast notifications, and error handling)
- [x] 5.3 Duration resize (with min/max by type) (✅ Added appointment type-specific duration constraints with validation)
- [x] 5.4 Color coding by appointment type (✅ Centralized color system with consistent mapping across components)
- [x] 5.5 Filters: staff, type, date range, status (✅ Comprehensive filter system with collapsible UI, staff selection, appointment type checkboxes, status filters, and date range picker)
- [x] 5.6 Context menu on events (Edit, Copy, Cancel, Open in GCal) (✅ Right-click context menu with appointment info header and action buttons)y6.2 HTML agenda template (responsive)
- [x] 6.3 Aggregation by staff (Asia/Dubai, 06:00)
- [x] 6.4 Job scheduler (cron)
- [x] 6.5 Delivery logging + retries
- [x] 6.6 "Send test agenda" button
- [x] 6.7 Staff preference management
- [x] 6.8 Automated generation + sending

## 7.0 Copy Appointment Feature
- [x] 7.1 Copy modal with prefilled fields
- [x] 7.2 Deep clone with new UUIDs
- [x] 7.3 Conflict check with override option
- [x] 7.4 Staff reassignment selector
- [x] 7.5 Bulk copy (patterns: daily/weekly/custom)
- [x] 7.6 Copy audit trail

## 8.0 Testing and Quality Assurance
- [x] 8.1 Unit tests for utils
- [x] 8.2 Component tests for forms
- [x] 8.3 Integration tests for APIs
- [x] 8.4 Supabase query mocking
- [x] 8.5 Google Calendar API mocking
- [x] 8.6 End-to-end tests for critical flows
- [x] 8.7 Performance testing
- [x] 8.8 Accessibility compliance

## 9.0 Admin UX & Additional UI
- [x] 9.1 Appointment details drawer
- [x] 9.2 Reports dashboard (KPIs, CSV export)
- [x] 9.3 Google Calendar linking UI + sync status
- [x] 9.4 Recurrence rule builder (basic patterns)
- [x] 9.5 Email preferences in Settings
- [x] 9.6 Backup & export (CSV dumps)
- [ ] 9.7 Unified toasts & error system

## 10.0 Google Calendar Integration (Enhancements)
- [ ] 10.1 Event builders by role (driver vs medical)
- [ ] 10.2 Webhook dedupe/retries/backoff
- [ ] 10.3 External edits surface in UI
- [ ] 10.4 google_event_ids integrity checks

## 11.0 Deployment, Ops & Migration
- [ ] 11.1 .env.example with keys & guards
- [ ] 11.2 Docker Compose for local
- [ ] 11.3 Supabase Cloud migration scripts
- [ ] 11.4 Cron/worker for daily emails
- [ ] 11.5 Error logging & observability

## 12.0 Performance & UX Polish
- [ ] 12.1 Data virtualization for tables
- [ ] 12.2 Debounced search, cached filters, skeleton loaders
- [ ] 12.3 Timezone utilities (UTC store, Dubai display)
- [ ] 12.4 Keyboard shortcuts
- [ ] 12.5 Print-friendly agenda & appointment sheets
