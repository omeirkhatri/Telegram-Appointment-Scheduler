// Calendar-related types and enums for Google Calendar integration

// Calendar operation types
export type CalendarOperationType =
  | 'create_calendar'
  | 'share_calendar'
  | 'create_event'
  | 'update_event'
  | 'delete_event'
  | 'verify_calendar'
  | 'send_invite'
  | 'cleanup_calendar'
  | 'status_check'
  | 'bulk_status_check'
  | 'unknown';

// Calendar operation status
export type CalendarOperationStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'retrying'
  | 'unknown';

// Calendar verification status
export type CalendarVerificationStatus =
  | 'pending'
  | 'verified'
  | 'failed'
  | 'not_required';

// Verification event status
export type VerificationEventStatus =
  | 'created'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'tentative'
  | 'expired'
  | 'failed';

// Calendar error codes
export type CalendarErrorCode =
  | 'CALENDAR_CREATION_FAILED'
  | 'EMAIL_INVALID'
  | 'EMAIL_BOUNCE'
  | 'GOOGLE_API_UNAVAILABLE'
  | 'INVITE_SEND_FAILED'
  | 'VERIFICATION_TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'CALENDAR_NOT_FOUND'
  | 'STAFF_EMAIL_MISSING'
  | 'CALENDAR_SHARE_FAILED'
  | 'EVENT_CREATION_FAILED'
  | 'EVENT_UPDATE_FAILED'
  | 'EVENT_DELETE_FAILED'
  | 'VERIFICATION_EVENT_CREATION_FAILED'
  | 'RSVP_CHECK_FAILED'
  | 'CALENDAR_CLEANUP_FAILED'
  | 'CALENDAR_EVENT_CREATION_FAILED'
  | 'CALENDAR_DELETION_FAILED'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR';

// Calendar operations log interface
export interface CalendarOperationsLog {
  id: string;
  staff_id: string;
  operation_type: CalendarOperationType;
  operation_status: CalendarOperationStatus;
  google_calendar_id?: string;
  google_event_id?: string;
  error_code?: CalendarErrorCode;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  operation_data: Record<string, any>;
  response_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// Calendar verification events interface
export interface CalendarVerificationEvent {
  id: string;
  staff_id: string;
  google_calendar_id: string;
  google_event_id: string;
  event_title: string;
  event_description?: string;
  event_start_time: string;
  event_end_time: string;
  attendee_email: string;
  verification_status: VerificationEventStatus;
  rsvp_response?: string;
  verification_attempts: number;
  max_verification_attempts: number;
  expires_at: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

// Calendar creation request
export interface CreateCalendarRequest {
  staff_id: string;
  staff_name: string;
  staff_type: string;
  staff_email: string;
}

// Calendar sharing request
export interface ShareCalendarRequest {
  staff_id: string;
  google_calendar_id: string;
  staff_email: string;
  permission_level: 'reader' | 'writer' | 'owner';
}

// Calendar event creation request
export interface CreateCalendarEventRequest {
  staff_id: string;
  google_calendar_id: string;
  event_title: string;
  event_description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendees?: string[];
}

// Calendar verification request
export interface VerifyCalendarRequest {
  staff_id: string;
  google_calendar_id: string;
  staff_email: string;
}

// Calendar status response
export interface CalendarStatusResponse {
  staff_id: string;
  google_calendar_id?: string;
  verification_status: CalendarVerificationStatus;
  verification_date?: string;
  error_code?: CalendarErrorCode;
  error_message?: string;
  last_operation?: CalendarOperationType;
  last_operation_status?: CalendarOperationStatus;
  last_operation_date?: string;
}

// Calendar retry request
export interface RetryCalendarOperationRequest {
  operation_log_id: string;
  force_retry?: boolean;
}

// Calendar retry response
export interface RetryCalendarOperationResponse {
  operation_log_id: string;
  new_status: CalendarOperationStatus;
  retry_count: number;
  message: string;
}

// Calendar operation filters
export interface CalendarOperationFilters {
  staff_id?: string;
  operation_type?: CalendarOperationType;
  operation_status?: CalendarOperationStatus;
  error_code?: CalendarErrorCode;
  created_after?: string;
  created_before?: string;
}

// Calendar verification filters
export interface CalendarVerificationFilters {
  staff_id?: string;
  verification_status?: VerificationEventStatus;
  attendee_email?: string;
  expires_after?: string;
  expires_before?: string;
}

// Error code descriptions mapping
export const CALENDAR_ERROR_DESCRIPTIONS: Record<CalendarErrorCode, string> = {
  CALENDAR_CREATION_FAILED: 'Failed to create calendar in Google Calendar',
  EMAIL_INVALID: 'Staff email address is invalid or malformed',
  EMAIL_BOUNCE: 'Email invite bounced or was rejected',
  GOOGLE_API_UNAVAILABLE: 'Google Calendar API is temporarily unavailable',
  INVITE_SEND_FAILED: 'Failed to send calendar invite email',
  VERIFICATION_TIMEOUT: 'Staff did not verify calendar access within timeout period',
  PERMISSION_DENIED: 'Insufficient permissions to create/manage calendar',
  QUOTA_EXCEEDED: 'Google Calendar API quota exceeded',
  CALENDAR_NOT_FOUND: 'Calendar was deleted or not accessible',
  STAFF_EMAIL_MISSING: 'Staff record exists but has no email address',
  CALENDAR_SHARE_FAILED: 'Failed to share calendar with staff member',
  EVENT_CREATION_FAILED: 'Failed to create event in staff calendar',
  EVENT_UPDATE_FAILED: 'Failed to update event in staff calendar',
  EVENT_DELETE_FAILED: 'Failed to delete event from staff calendar',
  VERIFICATION_EVENT_CREATION_FAILED: 'Failed to create verification test event',
  RSVP_CHECK_FAILED: 'Failed to check RSVP response for verification',
  CALENDAR_CLEANUP_FAILED: 'Failed to clean up calendar during staff deletion',
  CALENDAR_EVENT_CREATION_FAILED: 'Failed to create calendar event',
  CALENDAR_DELETION_FAILED: 'Failed to delete calendar',
  INTERNAL_ERROR: 'An internal error occurred during calendar operation',
  UNKNOWN_ERROR: 'An unknown error occurred during calendar operation'
};

// Helper function to get error description
export function getCalendarErrorDescription(errorCode: CalendarErrorCode): string {
  return CALENDAR_ERROR_DESCRIPTIONS[errorCode] || 'Unknown error';
}

// Helper function to check if error is retryable
export function isRetryableError(errorCode: CalendarErrorCode): boolean {
  const retryableErrors: CalendarErrorCode[] = [
    'GOOGLE_API_UNAVAILABLE',
    'QUOTA_EXCEEDED',
    'EVENT_CREATION_FAILED',
    'EVENT_UPDATE_FAILED',
    'EVENT_DELETE_FAILED',
    'VERIFICATION_EVENT_CREATION_FAILED',
    'RSVP_CHECK_FAILED',
    'CALENDAR_SHARE_FAILED'
  ];

  return retryableErrors.includes(errorCode);
}

// Helper function to check if error requires admin intervention
export function requiresAdminIntervention(errorCode: CalendarErrorCode): boolean {
  const adminInterventionErrors: CalendarErrorCode[] = [
    'PERMISSION_DENIED',
    'CALENDAR_NOT_FOUND',
    'STAFF_EMAIL_MISSING',
    'EMAIL_INVALID',
    'EMAIL_BOUNCE'
  ];

  return adminInterventionErrors.includes(errorCode);
}

// Helper function to validate calendar ID format
export function isValidGoogleCalendarId(calendarId: string): boolean {
  return /^[a-zA-Z0-9._-]+@group\.calendar\.google\.com$/.test(calendarId);
}

// Helper function to validate Google event ID format
export function isValidGoogleEventId(eventId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(eventId);
}

// Helper function to get calendar name format
export function getCalendarName(staffName: string, staffType: string): string {
  return `${staffName} - ${staffType} - BestDOC`;
}

// Helper function to check if verification is expired
export function isVerificationExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

// Helper function to get verification timeout duration (in hours)
export function getVerificationTimeoutHours(): number {
  return 24; // 24 hours
}

// Helper function to get retry delay (in minutes) based on retry count
export function getRetryDelayMinutes(retryCount: number): number {
  // Exponential backoff: 5, 15, 45, 135 minutes
  return Math.min(5 * Math.pow(3, retryCount), 135);
}
