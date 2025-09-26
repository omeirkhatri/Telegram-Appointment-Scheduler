// Test fixtures for Google Calendar integration
// This file contains mock data for testing calendar operations

export const mockGoogleCalendarEvents = [
  {
    id: 'test-event-1',
    summary: 'Test Appointment',
    description: 'Test appointment description',
    start: {
      dateTime: '2024-01-15T10:00:00+04:00',
      timeZone: 'Asia/Dubai',
    },
    end: {
      dateTime: '2024-01-15T11:00:00+04:00',
      timeZone: 'Asia/Dubai',
    },
    attendees: [
      {
        email: 'patient@example.com',
        displayName: 'Test Patient',
        responseStatus: 'accepted',
      },
    ],
    status: 'confirmed',
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'test-event-2',
    summary: 'Another Test Appointment',
    description: 'Another test appointment',
    start: {
      dateTime: '2024-01-16T14:00:00+04:00',
      timeZone: 'Asia/Dubai',
    },
    end: {
      dateTime: '2024-01-16T15:00:00+04:00',
      timeZone: 'Asia/Dubai',
    },
    attendees: [
      {
        email: 'patient2@example.com',
        displayName: 'Test Patient 2',
        responseStatus: 'tentative',
      },
    ],
    status: 'tentative',
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
  },
];

export const mockCalendarList = [
  {
    id: 'primary',
    summary: 'Primary Calendar',
    description: 'Primary calendar for testing',
    timeZone: 'Asia/Dubai',
    accessRole: 'owner',
    primary: true,
  },
  {
    id: 'test-calendar-1',
    summary: 'Test Calendar 1',
    description: 'Test calendar for appointments',
    timeZone: 'Asia/Dubai',
    accessRole: 'writer',
    primary: false,
  },
];

export const mockCalendarPermissions = [
  {
    id: 'user@example.com',
    role: 'reader',
    type: 'user',
  },
  {
    id: 'group@example.com',
    role: 'writer',
    type: 'group',
  },
];

export const mockCalendarSettings = {
  timeZone: 'Asia/Dubai',
  workingHours: {
    start: '09:00',
    end: '17:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  businessHours: {
    start: '09:00',
    end: '17:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
};

export const mockAppointmentData = {
  id: 'test-appointment-1',
  patientName: 'Test Patient',
  patientEmail: 'patient@example.com',
  patientPhone: '+971501234567',
  appointmentDate: '2024-01-15',
  appointmentTime: '10:00:00',
  duration: 60,
  staffId: 'test-staff-1',
  staffName: 'Dr. Test',
  staffEmail: 'dr.test@example.com',
  appointmentType: 'consultation',
  status: 'scheduled',
  notes: 'Test appointment notes',
  location: 'Test Clinic',
  timezone: 'Asia/Dubai',
};

export const mockStaffData = {
  id: 'test-staff-1',
  name: 'Dr. Test',
  email: 'dr.test@example.com',
  phone: '+971501234567',
  staffType: 'doctor',
  calendarId: 'test-calendar-1',
  workingHours: {
    start: '09:00',
    end: '17:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
  timezone: 'Asia/Dubai',
  isActive: true,
};

export const mockErrorResponses = {
  calendarNotFound: {
    error: {
      code: 404,
      message: 'Calendar not found',
      status: 'NOT_FOUND',
    },
  },
  permissionDenied: {
    error: {
      code: 403,
      message: 'Permission denied',
      status: 'FORBIDDEN',
    },
  },
  quotaExceeded: {
    error: {
      code: 429,
      message: 'Quota exceeded',
      status: 'RESOURCE_EXHAUSTED',
    },
  },
  invalidRequest: {
    error: {
      code: 400,
      message: 'Invalid request',
      status: 'INVALID_ARGUMENT',
    },
  },
};

export const mockSyncResults = {
  success: {
    status: 'success',
    eventsCreated: 5,
    eventsUpdated: 2,
    eventsDeleted: 1,
    errors: [],
    timestamp: '2024-01-15T10:00:00.000Z',
  },
  partialFailure: {
    status: 'partial_failure',
    eventsCreated: 3,
    eventsUpdated: 1,
    eventsDeleted: 0,
    errors: [
      {
        eventId: 'test-event-1',
        error: 'Permission denied',
        operation: 'create',
      },
    ],
    timestamp: '2024-01-15T10:00:00.000Z',
  },
  failure: {
    status: 'failure',
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
    errors: [
      {
        eventId: 'all',
        error: 'Calendar not found',
        operation: 'sync',
      },
    ],
    timestamp: '2024-01-15T10:00:00.000Z',
  },
};

// Mock notification data for testing
export const mockNotificationData = {
  slack: {
    webhookUrl: 'https://hooks.slack.com/services/FAKE/TEST/WEBHOOK_URL_FOR_TESTING_ONLY',
    channel: '#alerts',
  },
  email: {
    recipients: ['admin@example.com', 'support@example.com'],
    smtpConfig: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'noreply@example.com',
        pass: 'app_password',
      },
    },
  },
  telegram: {
    botToken: 'FAKE_BOT_TOKEN_FOR_TESTING',
    chatId: 'FAKE_CHAT_ID',
  },
};

export const mockCalendarOperations = {
  createEvent: {
    success: true,
    eventId: 'test-event-1',
    calendarId: 'test-calendar-1',
    operation: 'create',
    timestamp: '2024-01-15T10:00:00.000Z',
  },
  updateEvent: {
    success: true,
    eventId: 'test-event-1',
    calendarId: 'test-calendar-1',
    operation: 'update',
    timestamp: '2024-01-15T10:00:00.000Z',
  },
  deleteEvent: {
    success: true,
    eventId: 'test-event-1',
    calendarId: 'test-calendar-1',
    operation: 'delete',
    timestamp: '2024-01-15T10:00:00.000Z',
  },
};

export const mockCalendarSyncStatus = {
  isHealthy: true,
  lastSync: '2024-01-15T10:00:00.000Z',
  totalEvents: 25,
  syncedEvents: 25,
  failedEvents: 0,
  pendingEvents: 0,
  errors: [],
  warnings: [],
};

export const mockCalendarVerification = {
  isValid: true,
  hasPermission: true,
  isAccessible: true,
  errors: [],
  warnings: [],
  lastChecked: '2024-01-15T10:00:00.000Z',
};

export const mockCalendarMetrics = {
  totalEvents: 100,
  eventsThisMonth: 25,
  eventsThisWeek: 5,
  eventsToday: 1,
  averageEventDuration: 60,
  mostActiveDay: 'monday',
  mostActiveTime: '10:00',
  syncSuccessRate: 0.95,
  lastSyncDuration: 1500,
};

export const mockCalendarHealthCheck = {
  status: 'healthy',
  timestamp: '2024-01-15T10:00:00.000Z',
  checks: {
    apiAccess: true,
    calendarAccess: true,
    eventCreation: true,
    eventUpdate: true,
    eventDeletion: true,
    syncOperation: true,
  },
  metrics: {
    responseTime: 150,
    errorRate: 0.02,
    successRate: 0.98,
  },
};
