/**
 * Centralized error code definitions and descriptions for the application
 * 
 * This file provides a comprehensive set of error codes for different parts of the system,
 * with detailed descriptions and suggested actions for each error type.
 */

// =============================================================================
// GOOGLE CALENDAR ERROR CODES
// =============================================================================

export enum GoogleCalendarErrorCode {
  // Authentication & Authorization Errors
  AUTHENTICATION_FAILED = 'GC_AUTH_001',
  INVALID_SERVICE_ACCOUNT = 'GC_AUTH_002',
  INSUFFICIENT_PERMISSIONS = 'GC_AUTH_003',
  TOKEN_EXPIRED = 'GC_AUTH_004',
  QUOTA_EXCEEDED = 'GC_AUTH_005',

  // Calendar Operation Errors
  CALENDAR_NOT_FOUND = 'GC_CAL_001',
  CALENDAR_CREATION_FAILED = 'GC_CAL_002',
  CALENDAR_UPDATE_FAILED = 'GC_CAL_003',
  CALENDAR_DELETE_FAILED = 'GC_CAL_004',
  CALENDAR_SHARE_FAILED = 'GC_CAL_005',
  CALENDAR_ALREADY_EXISTS = 'GC_CAL_006',

  // Event Operation Errors
  EVENT_CREATION_FAILED = 'GC_EVT_001',
  EVENT_UPDATE_FAILED = 'GC_EVT_002',
  EVENT_DELETE_FAILED = 'GC_EVT_003',
  EVENT_NOT_FOUND = 'GC_EVT_004',
  INVALID_EVENT_DATA = 'GC_EVT_005',
  EVENT_CONFLICT = 'GC_EVT_006',

  // Verification Errors
  VERIFICATION_FAILED = 'GC_VER_001',
  VERIFICATION_TIMEOUT = 'GC_VER_002',
  VERIFICATION_EMAIL_FAILED = 'GC_VER_003',
  VERIFICATION_EVENT_CREATION_FAILED = 'GC_VER_004',
  VERIFICATION_RSVP_FAILED = 'GC_VER_005',

  // Network & API Errors
  NETWORK_ERROR = 'GC_NET_001',
  API_TIMEOUT = 'GC_NET_002',
  API_RATE_LIMIT = 'GC_NET_003',
  API_SERVER_ERROR = 'GC_NET_004',
  API_CLIENT_ERROR = 'GC_NET_005',

  // Configuration Errors
  INVALID_CONFIGURATION = 'GC_CFG_001',
  MISSING_REQUIRED_FIELD = 'GC_CFG_002',
  INVALID_TIMEZONE = 'GC_CFG_003',
  INVALID_EMAIL_FORMAT = 'GC_CFG_004',
  INVALID_DATE_FORMAT = 'GC_CFG_005',

  // System Errors
  INTERNAL_ERROR = 'GC_SYS_001',
  DATABASE_ERROR = 'GC_SYS_002',
  FILE_SYSTEM_ERROR = 'GC_SYS_003',
  MEMORY_ERROR = 'GC_SYS_004',
  UNKNOWN_ERROR = 'GC_SYS_005',
}

// =============================================================================
// STAFF CALENDAR ERROR CODES
// =============================================================================

export enum StaffCalendarErrorCode {
  // Staff Calendar Management Errors
  STAFF_NOT_FOUND = 'SC_STAFF_001',
  STAFF_EMAIL_REQUIRED = 'SC_STAFF_002',
  STAFF_EMAIL_INVALID = 'SC_STAFF_003',
  STAFF_CALENDAR_EXISTS = 'SC_STAFF_004',
  STAFF_CALENDAR_NOT_FOUND = 'SC_STAFF_005',
  STAFF_CALENDAR_CREATION_FAILED = 'SC_STAFF_006',
  STAFF_CALENDAR_UPDATE_FAILED = 'SC_STAFF_007',
  STAFF_CALENDAR_DELETE_FAILED = 'SC_STAFF_008',

  // Calendar Verification Errors
  VERIFICATION_NOT_STARTED = 'SC_VER_001',
  VERIFICATION_IN_PROGRESS = 'SC_VER_002',
  VERIFICATION_EXPIRED = 'SC_VER_003',
  VERIFICATION_ALREADY_COMPLETED = 'SC_VER_004',
  VERIFICATION_TEST_FAILED = 'SC_VER_005',

  // Appointment Sync Errors
  APPOINTMENT_SYNC_FAILED = 'SC_APT_001',
  APPOINTMENT_NOT_FOUND = 'SC_APT_002',
  APPOINTMENT_CONFLICT = 'SC_APT_003',
  APPOINTMENT_UPDATE_FAILED = 'SC_APT_004',
  APPOINTMENT_DELETE_FAILED = 'SC_APT_005',
}

// =============================================================================
// GENERAL APPLICATION ERROR CODES
// =============================================================================

export enum ApplicationErrorCode {
  // Validation Errors
  VALIDATION_ERROR = 'APP_VAL_001',
  REQUIRED_FIELD_MISSING = 'APP_VAL_002',
  INVALID_INPUT_FORMAT = 'APP_VAL_003',
  INVALID_DATE_RANGE = 'APP_VAL_004',
  INVALID_TIME_FORMAT = 'APP_VAL_005',

  // Database Errors
  DATABASE_CONNECTION_FAILED = 'APP_DB_001',
  DATABASE_QUERY_FAILED = 'APP_DB_002',
  DATABASE_TRANSACTION_FAILED = 'APP_DB_003',
  RECORD_NOT_FOUND = 'APP_DB_004',
  RECORD_ALREADY_EXISTS = 'APP_DB_005',
  CONSTRAINT_VIOLATION = 'APP_DB_006',

  // Authentication & Authorization Errors
  UNAUTHORIZED_ACCESS = 'APP_AUTH_001',
  INVALID_CREDENTIALS = 'APP_AUTH_002',
  SESSION_EXPIRED = 'APP_AUTH_003',
  INSUFFICIENT_PERMISSIONS = 'APP_AUTH_004',
  ACCOUNT_LOCKED = 'APP_AUTH_005',

  // External Service Errors
  EXTERNAL_SERVICE_UNAVAILABLE = 'APP_EXT_001',
  EXTERNAL_SERVICE_TIMEOUT = 'APP_EXT_002',
  EXTERNAL_SERVICE_ERROR = 'APP_EXT_003',
  EXTERNAL_API_QUOTA_EXCEEDED = 'APP_EXT_004',

  // System Errors
  INTERNAL_SERVER_ERROR = 'APP_SYS_001',
  SERVICE_UNAVAILABLE = 'APP_SYS_002',
  MAINTENANCE_MODE = 'APP_SYS_003',
  CONFIGURATION_ERROR = 'APP_SYS_004',
  UNKNOWN_ERROR = 'APP_SYS_005',
}

// =============================================================================
// ERROR CODE DESCRIPTIONS AND ACTIONS
// =============================================================================

export interface ErrorDescription {
  code: string;
  title: string;
  description: string;
  suggestedActions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  category: string;
}

export const ERROR_DESCRIPTIONS: Record<string, ErrorDescription> = {
  // Google Calendar Authentication Errors
  [GoogleCalendarErrorCode.AUTHENTICATION_FAILED]: {
    code: GoogleCalendarErrorCode.AUTHENTICATION_FAILED,
    title: 'Google Calendar Authentication Failed',
    description: 'Failed to authenticate with Google Calendar API using service account credentials.',
    suggestedActions: [
      'Verify the service account key is correctly configured',
      'Check that the service account has proper permissions',
      'Ensure the service account key is not expired',
      'Verify the Google Calendar API is enabled in Google Cloud Console'
    ],
    severity: 'critical',
    retryable: true,
    category: 'authentication'
  },

  [GoogleCalendarErrorCode.INVALID_SERVICE_ACCOUNT]: {
    code: GoogleCalendarErrorCode.INVALID_SERVICE_ACCOUNT,
    title: 'Invalid Service Account Configuration',
    description: 'The provided service account credentials are invalid or malformed.',
    suggestedActions: [
      'Verify the service account key is properly base64 encoded',
      'Check that the JSON key file is valid',
      'Ensure all required fields are present in the service account key',
      'Regenerate the service account key if necessary'
    ],
    severity: 'critical',
    retryable: false,
    category: 'configuration'
  },

  [GoogleCalendarErrorCode.INSUFFICIENT_PERMISSIONS]: {
    code: GoogleCalendarErrorCode.INSUFFICIENT_PERMISSIONS,
    title: 'Insufficient Google Calendar Permissions',
    description: 'The service account does not have sufficient permissions to perform the requested operation.',
    suggestedActions: [
      'Grant the service account appropriate Google Calendar permissions',
      'Check the service account role assignments in Google Cloud Console',
      'Ensure the service account has access to the target calendar',
      'Verify the calendar sharing settings'
    ],
    severity: 'high',
    retryable: false,
    category: 'permissions'
  },

  [GoogleCalendarErrorCode.QUOTA_EXCEEDED]: {
    code: GoogleCalendarErrorCode.QUOTA_EXCEEDED,
    title: 'Google Calendar API Quota Exceeded',
    description: 'The application has exceeded the Google Calendar API quota limits.',
    suggestedActions: [
      'Wait for the quota to reset (usually 24 hours)',
      'Implement rate limiting to prevent quota exhaustion',
      'Consider upgrading the Google Cloud project quota limits',
      'Optimize API calls to reduce usage'
    ],
    severity: 'high',
    retryable: true,
    category: 'quota'
  },

  // Calendar Operation Errors
  [GoogleCalendarErrorCode.CALENDAR_CREATION_FAILED]: {
    code: GoogleCalendarErrorCode.CALENDAR_CREATION_FAILED,
    title: 'Calendar Creation Failed',
    description: 'Failed to create a new calendar for the staff member.',
    suggestedActions: [
      'Check the calendar name format and ensure it follows the required pattern',
      'Verify the service account has calendar creation permissions',
      'Ensure the organization name is valid',
      'Check for any naming conflicts with existing calendars'
    ],
    severity: 'high',
    retryable: true,
    category: 'calendar_operation'
  },

  [GoogleCalendarErrorCode.CALENDAR_SHARE_FAILED]: {
    code: GoogleCalendarErrorCode.CALENDAR_SHARE_FAILED,
    title: 'Calendar Sharing Failed',
    description: 'Failed to share the calendar with the staff member.',
    suggestedActions: [
      'Verify the staff member\'s email address is valid',
      'Check that the email address is associated with a Google account',
      'Ensure the service account has calendar sharing permissions',
      'Verify the calendar exists and is accessible'
    ],
    severity: 'medium',
    retryable: true,
    category: 'calendar_operation'
  },

  // Event Operation Errors
  [GoogleCalendarErrorCode.EVENT_CREATION_FAILED]: {
    code: GoogleCalendarErrorCode.EVENT_CREATION_FAILED,
    title: 'Event Creation Failed',
    description: 'Failed to create an appointment event in the staff calendar.',
    suggestedActions: [
      'Verify the appointment data is valid and complete',
      'Check that the target calendar exists and is accessible',
      'Ensure the event time is valid and not in the past',
      'Verify the calendar has write permissions'
    ],
    severity: 'medium',
    retryable: true,
    category: 'event_operation'
  },

  [GoogleCalendarErrorCode.EVENT_CONFLICT]: {
    code: GoogleCalendarErrorCode.EVENT_CONFLICT,
    title: 'Event Time Conflict',
    description: 'The appointment time conflicts with an existing event in the calendar.',
    suggestedActions: [
      'Choose a different time slot for the appointment',
      'Check the existing events in the calendar',
      'Consider updating the conflicting event if appropriate',
      'Verify the timezone settings are correct'
    ],
    severity: 'low',
    retryable: false,
    category: 'event_operation'
  },

  // Verification Errors
  [GoogleCalendarErrorCode.VERIFICATION_FAILED]: {
    code: GoogleCalendarErrorCode.VERIFICATION_FAILED,
    title: 'Calendar Verification Failed',
    description: 'The calendar verification process failed to complete successfully.',
    suggestedActions: [
      'Check that the verification test event was created successfully',
      'Verify the staff member can access the calendar',
      'Ensure the email notification was sent correctly',
      'Check the calendar sharing permissions'
    ],
    severity: 'medium',
    retryable: true,
    category: 'verification'
  },

  [GoogleCalendarErrorCode.VERIFICATION_TIMEOUT]: {
    code: GoogleCalendarErrorCode.VERIFICATION_TIMEOUT,
    title: 'Calendar Verification Timeout',
    description: 'The calendar verification process timed out waiting for a response.',
    suggestedActions: [
      'Retry the verification process',
      'Check that the staff member received the verification email',
      'Verify the calendar is accessible and properly shared',
      'Increase the verification timeout if needed'
    ],
    severity: 'medium',
    retryable: true,
    category: 'verification'
  },

  // Network & API Errors
  [GoogleCalendarErrorCode.NETWORK_ERROR]: {
    code: GoogleCalendarErrorCode.NETWORK_ERROR,
    title: 'Network Connection Error',
    description: 'Failed to connect to the Google Calendar API due to network issues.',
    suggestedActions: [
      'Check the internet connection',
      'Verify the Google Calendar API is accessible',
      'Check for any firewall or proxy restrictions',
      'Retry the operation after a brief delay'
    ],
    severity: 'medium',
    retryable: true,
    category: 'network'
  },

  [GoogleCalendarErrorCode.API_TIMEOUT]: {
    code: GoogleCalendarErrorCode.API_TIMEOUT,
    title: 'API Request Timeout',
    description: 'The Google Calendar API request timed out.',
    suggestedActions: [
      'Retry the operation with a longer timeout',
      'Check the API response times and server load',
      'Optimize the request payload if it\'s too large',
      'Consider implementing request queuing'
    ],
    severity: 'medium',
    retryable: true,
    category: 'network'
  },

  [GoogleCalendarErrorCode.API_RATE_LIMIT]: {
    code: GoogleCalendarErrorCode.API_RATE_LIMIT,
    title: 'API Rate Limit Exceeded',
    description: 'The application is making requests too quickly and has hit the API rate limit.',
    suggestedActions: [
      'Implement exponential backoff for retries',
      'Reduce the frequency of API calls',
      'Batch multiple operations into single requests where possible',
      'Monitor and optimize API usage patterns'
    ],
    severity: 'medium',
    retryable: true,
    category: 'quota'
  },

  // Configuration Errors
  [GoogleCalendarErrorCode.INVALID_CONFIGURATION]: {
    code: GoogleCalendarErrorCode.INVALID_CONFIGURATION,
    title: 'Invalid Configuration',
    description: 'The Google Calendar configuration is invalid or incomplete.',
    suggestedActions: [
      'Check all required environment variables are set',
      'Verify the configuration values are valid',
      'Review the configuration documentation',
      'Test the configuration with a simple API call'
    ],
    severity: 'high',
    retryable: false,
    category: 'configuration'
  },

  [GoogleCalendarErrorCode.MISSING_REQUIRED_FIELD]: {
    code: GoogleCalendarErrorCode.MISSING_REQUIRED_FIELD,
    title: 'Missing Required Field',
    description: 'A required field is missing from the request or configuration.',
    suggestedActions: [
      'Check that all required fields are provided',
      'Verify the field names and formats are correct',
      'Review the API documentation for required fields',
      'Validate the input data before making the request'
    ],
    severity: 'medium',
    retryable: false,
    category: 'validation'
  },

  [GoogleCalendarErrorCode.INVALID_TIMEZONE]: {
    code: GoogleCalendarErrorCode.INVALID_TIMEZONE,
    title: 'Invalid Timezone',
    description: 'The provided timezone is not valid or recognized.',
    suggestedActions: [
      'Use a valid IANA timezone identifier (e.g., Asia/Dubai)',
      'Check the timezone against the list of supported timezones',
      'Verify the timezone format is correct',
      'Use the default timezone if the provided one is invalid'
    ],
    severity: 'low',
    retryable: false,
    category: 'validation'
  },

  [GoogleCalendarErrorCode.INVALID_EMAIL_FORMAT]: {
    code: GoogleCalendarErrorCode.INVALID_EMAIL_FORMAT,
    title: 'Invalid Email Format',
    description: 'The provided email address format is invalid.',
    suggestedActions: [
      'Verify the email address format is correct',
      'Check for typos in the email address',
      'Ensure the email address contains @ and a valid domain',
      'Use a valid email address format'
    ],
    severity: 'low',
    retryable: false,
    category: 'validation'
  },

  // Staff Calendar Errors
  [StaffCalendarErrorCode.STAFF_NOT_FOUND]: {
    code: StaffCalendarErrorCode.STAFF_NOT_FOUND,
    title: 'Staff Member Not Found',
    description: 'The specified staff member could not be found in the database.',
    suggestedActions: [
      'Verify the staff member ID is correct',
      'Check that the staff member exists in the system',
      'Ensure the staff member has not been deleted',
      'Refresh the staff list and try again'
    ],
    severity: 'medium',
    retryable: false,
    category: 'staff_management'
  },

  [StaffCalendarErrorCode.STAFF_EMAIL_REQUIRED]: {
    code: StaffCalendarErrorCode.STAFF_EMAIL_REQUIRED,
    title: 'Staff Email Required',
    description: 'A valid email address is required to create a calendar for the staff member.',
    suggestedActions: [
      'Add an email address to the staff member\'s profile',
      'Verify the email address is valid and accessible',
      'Ensure the email address is associated with a Google account',
      'Update the staff member\'s contact information'
    ],
    severity: 'medium',
    retryable: false,
    category: 'staff_management'
  },

  [StaffCalendarErrorCode.STAFF_CALENDAR_EXISTS]: {
    code: StaffCalendarErrorCode.STAFF_CALENDAR_EXISTS,
    title: 'Staff Calendar Already Exists',
    description: 'A calendar already exists for this staff member.',
    suggestedActions: [
      'Check if the calendar is already created and accessible',
      'Verify the calendar status in the staff member\'s profile',
      'Consider updating the existing calendar instead of creating a new one',
      'Check for any duplicate calendar creation attempts'
    ],
    severity: 'low',
    retryable: false,
    category: 'staff_management'
  },

  // Appointment Sync Errors
  [StaffCalendarErrorCode.APPOINTMENT_SYNC_FAILED]: {
    code: StaffCalendarErrorCode.APPOINTMENT_SYNC_FAILED,
    title: 'Appointment Sync Failed',
    description: 'Failed to sync the appointment to the staff member\'s calendar.',
    suggestedActions: [
      'Check that the staff member\'s calendar is properly configured',
      'Verify the appointment data is valid and complete',
      'Ensure the calendar has write permissions',
      'Retry the sync operation'
    ],
    severity: 'medium',
    retryable: true,
    category: 'appointment_sync'
  },

  [StaffCalendarErrorCode.APPOINTMENT_CONFLICT]: {
    code: StaffCalendarErrorCode.APPOINTMENT_CONFLICT,
    title: 'Appointment Time Conflict',
    description: 'The appointment time conflicts with an existing event in the staff member\'s calendar.',
    suggestedActions: [
      'Choose a different time slot for the appointment',
      'Check the staff member\'s calendar for existing events',
      'Consider rescheduling the conflicting appointment',
      'Verify the timezone settings are correct'
    ],
    severity: 'low',
    retryable: false,
    category: 'appointment_sync'
  },

  // System Errors
  [GoogleCalendarErrorCode.INTERNAL_ERROR]: {
    code: GoogleCalendarErrorCode.INTERNAL_ERROR,
    title: 'Internal System Error',
    description: 'An unexpected internal error occurred while processing the request.',
    suggestedActions: [
      'Check the application logs for more details',
      'Verify the system is running normally',
      'Restart the application if necessary',
      'Contact system administrator if the error persists'
    ],
    severity: 'critical',
    retryable: true,
    category: 'system'
  },

  [GoogleCalendarErrorCode.UNKNOWN_ERROR]: {
    code: GoogleCalendarErrorCode.UNKNOWN_ERROR,
    title: 'Unknown Error',
    description: 'An unknown error occurred that could not be categorized.',
    suggestedActions: [
      'Check the application logs for more details',
      'Verify all system components are functioning',
      'Try the operation again after a brief delay',
      'Contact support if the error persists'
    ],
    severity: 'high',
    retryable: true,
    category: 'system'
  },
};

// =============================================================================
// ERROR CODE UTILITIES
// =============================================================================

/**
 * Get error description by error code
 */
export function getErrorDescription(code: string): ErrorDescription | undefined {
  return ERROR_DESCRIPTIONS[code];
}

/**
 * Check if an error code is retryable
 */
export function isRetryableError(code: string): boolean {
  const description = getErrorDescription(code);
  return description?.retryable ?? false;
}

/**
 * Get error severity level
 */
export function getErrorSeverity(code: string): 'low' | 'medium' | 'high' | 'critical' {
  const description = getErrorDescription(code);
  return description?.severity ?? 'medium';
}

/**
 * Get all error codes by category
 */
export function getErrorCodesByCategory(category: string): string[] {
  return Object.values(ERROR_DESCRIPTIONS)
    .filter(desc => desc.category === category)
    .map(desc => desc.code);
}

/**
 * Get all Google Calendar error codes
 */
export function getGoogleCalendarErrorCodes(): string[] {
  return Object.values(GoogleCalendarErrorCode);
}

/**
 * Get all Staff Calendar error codes
 */
export function getStaffCalendarErrorCodes(): string[] {
  return Object.values(StaffCalendarErrorCode);
}

/**
 * Get all Application error codes
 */
export function getApplicationErrorCodes(): string[] {
  return Object.values(ApplicationErrorCode);
}

/**
 * Check if an error code belongs to Google Calendar
 */
export function isGoogleCalendarError(code: string): boolean {
  return code.startsWith('GC_');
}

/**
 * Check if an error code belongs to Staff Calendar
 */
export function isStaffCalendarError(code: string): boolean {
  return code.startsWith('SC_');
}

/**
 * Check if an error code belongs to Application
 */
export function isApplicationError(code: string): boolean {
  return code.startsWith('APP_');
}

/**
 * Format error code for display
 */
export function formatErrorCode(code: string): string {
  return code.replace(/_/g, '-');
}

/**
 * Parse error code from formatted string
 */
export function parseErrorCode(formattedCode: string): string {
  return formattedCode.replace(/-/g, '_');
}
