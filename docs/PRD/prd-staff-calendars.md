# PRD: Staff Calendars for Medicare Scheduler App

## 1. Problem Statement

The clinic needs a reliable way to manage staff schedules. Each staff member (doctor, nurse, caregiver, physiotherapist, driver, lab_technician) must have their own calendar that automatically receives appointments created in the scheduler app.

Staff should not need to install or log in to the app. They should simply see their schedule on their existing mobile calendar app (Google Calendar on iOS/Android).

## 2. Goals

- Each staff member has their own calendar
- Calendars are created automatically when staff are added with valid email addresses
- Appointments created in the scheduler app appear in the correct staff calendar
- Staff do not log in to the app or manage OAuth
- Clinic retains full ownership and control of all calendars
- Staff setup should be minimal (ideally just accepting a calendar invite)
- Verification ensures we know staff are receiving their schedules

## 3. Users

### Clinic Admin
- Adds staff in the scheduler app
- Creates appointments for staff
- Needs confidence that appointments show up in the right calendar

### Staff Member (All Types)
- Receives a calendar invite by email when added
- Sees appointments in their Google Calendar app (iOS/Android)
- Does not need to log in to the scheduler app

## 4. User Stories

- As a clinic admin, when I add a new staff member with an email, a new calendar should be created for them automatically so I don't manage calendars manually
- As a clinic admin, I want to assign appointments to a staff member and know they instantly appear on that staff's calendar
- As a staff member, I want to simply open my Google Calendar app and see my assigned appointments, without extra steps
- As a clinic admin, I want to verify that staff have received their calendar so I don't worry about missed appointments
- As a clinic admin, I want to retain full ownership of calendars so staff cannot remove the clinic's control

## 5. Functional Requirements

### 5.1 Calendar Creation
- A new calendar is created automatically for each staff member when added with a valid email address
- Calendar name format: "Staff Name - Staff Type - BestDOC" (e.g., "Dr. John Smith - Doctor - BestDOC")
- The system stores the calendar ID mapped to the staff record
- Only one calendar per staff member

### 5.2 Calendar Sharing
- Each new calendar is shared with the staff member's email
- Permission levels: View-only (reader) - staff should not edit clinic-created events
- An email invite is sent to the staff with a direct link to open the calendar
- Staff should only see their own calendar

### 5.3 Appointment Creation
- When an appointment is created in the scheduler app for a staff member, the event is added to that staff's specific calendar
- Event fields include:
  - Title (e.g., "Home Visit – Medication X")
  - Patient name
  - Date/time
  - Location
  - Notes
- Events should appear in the staff's calendar within 60 seconds

### 5.4 Verification
- Create a test event with the staff as an attendee
- When they RSVP "Yes," mark them as verified
- Verification status should be visible in the admin panel
- Failed verification attempts should be logged with error codes

### 5.5 Ongoing Use
- Clinic account owns all calendars
- Admin can reassign or rename calendars if staff change roles
- Offboarding: remove staff by deleting or unsharing their calendar

## 6. Non-Functional Requirements

- **Ease of use**: Staff setup must take <1 minute, mobile only
- **Reliability**: Appointments must sync to calendars within 60 seconds
- **Security**: Clinic owns all calendars; staff only have read permissions
- **Scalability**: Must handle dozens or hundreds of staff without manual work
- **Error handling**: Comprehensive error codes for all failure scenarios

## 7. Success Criteria

- Adding a new staff member with email creates a calendar and sends an invite automatically
- Admin can create appointments and they always appear in the staff's mobile Google Calendar
- Staff see only their own events
- Verification ensures the system knows when staff are ready
- Clinic retains ownership of calendars
- All error scenarios are properly logged with specific error codes

## 8. Error Handling Requirements

### 8.1 Error Codes
The system must provide specific error codes for:

- **CALENDAR_CREATION_FAILED**: Failed to create calendar in Google Calendar
- **EMAIL_INVALID**: Staff email address is invalid or malformed
- **EMAIL_BOUNCE**: Email invite bounced or was rejected
- **GOOGLE_API_UNAVAILABLE**: Google Calendar API is temporarily unavailable
- **INVITE_SEND_FAILED**: Failed to send calendar invite email
- **VERIFICATION_TIMEOUT**: Staff did not verify calendar access within timeout period
- **PERMISSION_DENIED**: Insufficient permissions to create/manage calendar
- **QUOTA_EXCEEDED**: Google Calendar API quota exceeded
- **CALENDAR_NOT_FOUND**: Calendar was deleted or not accessible
- **STAFF_EMAIL_MISSING**: Staff record exists but has no email address

### 8.2 Fallback Behavior
- Invalid emails: Mark staff as "calendar_pending" and show error in admin panel
- API unavailable: Queue calendar operations for retry
- Verification timeout: Send reminder emails and show status in admin panel
- Permission issues: Alert admin and provide remediation steps

## 9. Technical Constraints

- **Single Google Account**: All calendars created under clinic's Google account
- **No Staff OAuth**: Staff never authenticate in the app
- **Replace Existing**: This replaces the current individual OAuth-based Google Calendar sync
- **Keep Existing**: Maintain all other existing features (Telegram notifications, appointment management, etc.)

## 10. Integration Points

- **Staff Creation**: Trigger calendar creation when staff is added with email
- **Appointment Assignment**: Sync events to staff calendars when appointments are created/updated
- **Staff Management**: Handle calendar operations during staff updates/deletions
- **Admin Dashboard**: Show calendar status and verification state for each staff member

## 11. Data Model Changes

### 11.1 Staff Table Updates
- Add `google_calendar_id` field to store calendar ID
- Add `calendar_verification_status` enum: 'pending', 'verified', 'failed'
- Add `calendar_verification_date` timestamp
- Add `calendar_error_code` for storing last error

### 11.2 New Tables
- `calendar_operations_log`: Track all calendar operations and errors
- `calendar_verification_events`: Track verification test events

## 12. API Requirements

### 12.1 Google Calendar API
- Calendar creation and management
- Event creation, updating, and deletion
- Calendar sharing and permissions
- Event attendee management for verification

### 12.2 Email Service
- Calendar invite sending
- Verification reminder emails
- Error notification emails to admins

## 13. Security Considerations

- All Google API credentials stored securely
- Staff email addresses validated before calendar creation
- Calendar permissions restricted to read-only for staff
- Audit logging for all calendar operations
- Error information sanitized before logging

## 14. Monitoring and Alerting

- Track calendar creation success rates
- Monitor verification completion rates
- Alert on repeated API failures
- Dashboard showing calendar status for all staff
- Error rate monitoring and alerting

## 15. Migration Strategy

- Phase 1: Implement new calendar system alongside existing OAuth system
- Phase 2: Migrate existing staff to new system (if they have valid emails)
- Phase 3: Remove old OAuth-based calendar sync
- Phase 4: Clean up deprecated code and database fields
