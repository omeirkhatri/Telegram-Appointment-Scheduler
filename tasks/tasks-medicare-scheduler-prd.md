# MediCare Scheduler - Implementation Task List

## Relevant Files

- `app/layout.tsx` - Root layout with global providers and error boundary
- `app/page.tsx` - Dashboard landing page
- `app/patients/page.tsx` - Patient management interface
- `app/staff/page.tsx` - Staff management interface
- `app/appointments/page.tsx` - Appointment scheduling interface
- `app/appointments/[id]/page.tsx` - Individual appointment view/edit
- `components/calendar/Calendar.tsx` - FullCalendar component with drag-and-drop
- `components/forms/AppointmentForm.tsx` - Appointment creation/editing form
- `components/forms/PatientForm.tsx` - Patient creation/editing form
- `components/forms/StaffForm.tsx` - Staff creation/editing form
- `components/modals/CopyAppointmentModal.tsx` - Copy appointment functionality
- `lib/supabase.ts` - Supabase client configuration
- `lib/calendar.ts` - Google Calendar API integration
- `lib/email.ts` - Daily email generation and sending
- `types/index.ts` - Global TypeScript interfaces and enums
- `supabase/migrations/` - Database schema migrations
- `hooks/useAppointments.ts` - Appointment data management hook
- `hooks/usePatients.ts` - Patient data management hook
- `hooks/useStaff.ts` - Staff data management hook
- `api/webhooks/calendar/route.ts` - Google Calendar webhook handler
- `api/appointments/route.ts` - Appointment CRUD API routes
- `api/patients/route.ts` - Patient CRUD API routes
- `api/staff/route.ts` - Staff CRUD API routes

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g.,
  `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all
  tests found by the Jest configuration.

## Tasks

- [ ] 1.0 Project Setup and Infrastructure
  - [x] 1.1 Initialize Next.js 14 project with TypeScript strict mode and App Router
  - [x] 1.2 Configure Tailwind CSS with custom theme for healthcare UI
  - [x] 1.3 Set up Supabase local development environment with Docker
  - [x] 1.4 Configure environment variables and TypeScript paths
  - [x] 1.5 Set up Jest and React Testing Library for testing
  - [x] 1.6 Create global error boundary and loading components
  - [x] 1.7 Configure ESLint and Prettier with project-specific rules
  - [ ] 1.8 Set up folder structure following clean code conventions

- [ ] 2.0 Database Schema and Migrations Strictly View
      /Volumes/BestDOC/Scheduler/medicare_scheduler_prd.md for more information on this
  - [ ] 2.1 Create patients table with all required fields and constraints
  - [ ] 2.2 Create staff table with enum types and Google Calendar integration
  - [ ] 2.3 Create appointments table with JSONB custom_fields and recurring rules
  - [ ] 2.4 Create appointment_staff junction table with proper relationships
  - [ ] 2.5 Set up Supabase Storage for patient ID document uploads
  - [ ] 2.6 Create database indexes for performance optimization
  - [ ] 2.7 Set up seed data for testing and development
  - [ ] 2.8 Configure local to cloud migration scripts

- [ ] 3.0 Core Data Management (Patients, Staff, Appointments)
  - [ ] 3.1 Implement Supabase client configuration with proper error handling
  - [ ] 3.2 Create patient CRUD operations with file upload functionality
  - [ ] 3.3 Create staff CRUD operations with Google Calendar ID validation
  - [ ] 3.4 Create appointment CRUD operations with staff assignment logic
  - [ ] 3.5 Implement React Hook Form + Zod validation for all forms
  - [ ] 3.6 Create custom hooks for data management (usePatients, useStaff, useAppointments)
  - [ ] 3.7 Implement search and filtering functionality for all entities
  - [ ] 3.8 Add proper loading states and error handling for all operations

- [ ] 4.0 Google Calendar Integration
  - [ ] 4.1 Set up Google Calendar API v3 authentication and configuration
  - [ ] 4.2 Implement event creation with proper title and description formatting
  - [ ] 4.3 Create driver vs medical staff event description builders
  - [ ] 4.4 Implement bidirectional sync with webhook handling
  - [ ] 4.5 Add timezone handling (UTC storage, Asia/Dubai display)
  - [ ] 4.6 Implement conflict resolution and retry logic
  - [ ] 4.7 Create calendar event update and deletion handlers
  - [ ] 4.8 Add proper error handling and logging for calendar operations

- [ ] 5.0 Calendar UI and Appointment Management
  - [ ] 5.1 Set up FullCalendar with required plugins and configuration
  - [ ] 5.2 Implement drag-and-drop appointment rescheduling
  - [ ] 5.3 Add appointment duration resizing functionality
  - [ ] 5.4 Create color-coded appointment types with proper styling
  - [ ] 5.5 Implement day/week/month/agenda view switching
  - [ ] 5.6 Add appointment filtering by staff, type, and date range
  - [ ] 5.7 Create appointment creation modal with type-specific forms
  - [ ] 5.8 Implement appointment editing with real-time calendar sync

- [ ] 6.0 Daily Email System
  - [ ] 6.1 Set up SMTP configuration for email sending
  - [ ] 6.2 Create HTML email templates for daily agendas
  - [ ] 6.3 Implement appointment data aggregation by staff member
  - [ ] 6.4 Add timezone-aware email scheduling (06:00 Asia/Dubai)
  - [ ] 6.5 Create email content formatting with proper styling
  - [ ] 6.6 Implement email delivery tracking and error handling
  - [ ] 6.7 Add email preference management for staff members
  - [ ] 6.8 Set up automated email generation and sending system

- [ ] 7.0 Copy Appointment Feature
  - [ ] 7.1 Create copy appointment modal with pre-filled form
  - [ ] 7.2 Implement deep cloning logic with new UUIDs
  - [ ] 7.3 Add date selection validation and conflict checking
  - [ ] 7.4 Create new Google Calendar events for copied appointments
  - [ ] 7.5 Implement staff reassignment logic for copied appointments
  - [ ] 7.6 Add proper error handling for copy operations
  - [ ] 7.7 Create copy history tracking and audit trail
  - [ ] 7.8 Add bulk copy functionality for recurring patterns

- [ ] 8.0 Testing and Quality Assurance
  - [ ] 8.1 Write unit tests for all utility functions and hooks
  - [ ] 8.2 Create component tests with React Testing Library
  - [ ] 8.3 Implement integration tests for API routes
  - [ ] 8.4 Add Supabase query mocking for test isolation
  - [ ] 8.5 Create Google Calendar API mocking for tests
  - [ ] 8.6 Implement end-to-end tests for critical user flows
  - [ ] 8.7 Add performance testing for calendar rendering
  - [ ] 8.8 Create accessibility testing and compliance checks
