import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock the services
jest.mock('@/services/appointmentService');
jest.mock('@/services/appointmentStaffService');
jest.mock('@/services/googleCalendarService');
jest.mock('@/services/patientService');
jest.mock('@/services/staffService');
jest.mock('@/lib/retryUtils');

const mockAppointmentService = {
  getAppointmentsByStaff: jest.fn(),
  updateAppointment: jest.fn(),
  addGoogleCalendarEventId: jest.fn(),
  removeGoogleCalendarEventId: jest.fn(),
};

const mockAppointmentStaffService = {
  getStaffAssignment: jest.fn(),
  updateGoogleCalendarEventId: jest.fn(),
};

const mockGoogleCalendarService = {
  getCalendarEvents: jest.fn(),
};

const mockPatientService = {
  searchPatients: jest.fn(),
};

const mockStaffService = {
  getStaffByCalendarId: jest.fn(),
};

const mockRetryUtils = {
  retryWithBackoff: jest.fn(),
  RETRY_CONFIGS: {
    write: { maxRetries: 3, baseDelay: 1000 },
  },
};

// Mock the modules
jest.doMock('@/services/appointmentService', () => ({
  appointmentService: mockAppointmentService,
}));

jest.doMock('@/services/appointmentStaffService', () => ({
  appointmentStaffService: mockAppointmentStaffService,
}));

jest.doMock('@/services/googleCalendarService', () => ({
  googleCalendarService: mockGoogleCalendarService,
}));

jest.doMock('@/services/patientService', () => ({
  patientService: mockPatientService,
}));

jest.doMock('@/services/staffService', () => ({
  staffService: mockStaffService,
}));

jest.doMock('@/lib/retryUtils', () => mockRetryUtils);

describe('Calendar Webhook Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock responses
    mockStaffService.getStaffByCalendarId.mockResolvedValue({
      id: 'staff-1',
      first_name: 'John',
      last_name: 'Doe',
      google_calendar_id: 'test@example.com',
    });

    mockGoogleCalendarService.getCalendarEvents.mockResolvedValue([]);
    mockAppointmentService.getAppointmentsByStaff.mockResolvedValue([]);
    mockRetryUtils.retryWithBackoff.mockResolvedValue({ success: true });
  });

  describe('POST - Webhook Handler', () => {
    it('should handle calendar changes with event updates', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Appointment - Medical Checkup - John Smith',
        description: 'Patient appointment\nType: medical_checkup\nNotes: Regular checkup',
        start: { dateTime: '2024-01-15T10:00:00+04:00' },
        end: { dateTime: '2024-01-15T11:00:00+04:00' },
      };

      const mockAppointment = {
        id: 'appointment-1',
        patient_id: 'patient-1',
        appointment_type: 'medical_checkup',
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 60,
        notes: 'Regular checkup',
        google_event_ids: { 'staff-1': 'event-123' },
      };

      mockGoogleCalendarService.getCalendarEvents.mockResolvedValue([mockEvent]);
      mockAppointmentService.getAppointmentsByStaff.mockResolvedValue([mockAppointment]);
      mockAppointmentService.updateAppointment.mockResolvedValue(mockAppointment);

      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar', {
        method: 'POST',
        headers: {
          'x-goog-resource-state': 'exists',
          'x-goog-resource-id': 'resource-123',
          'x-goog-channel-id': 'webhook-123-test@example.com',
          'authorization': 'Bearer test-secret',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockAppointmentService.updateAppointment).toHaveBeenCalled();
    });

    it('should handle calendar changes with event deletions', async () => {
      const mockAppointment = {
        id: 'appointment-1',
        patient_id: 'patient-1',
        appointment_type: 'medical_checkup',
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 60,
        notes: 'Regular checkup',
        google_event_ids: { 'staff-1': 'deleted-event-123' },
      };

      // No events returned from Google Calendar (all deleted)
      mockGoogleCalendarService.getCalendarEvents.mockResolvedValue([]);
      mockAppointmentService.getAppointmentsByStaff.mockResolvedValue([mockAppointment]);
      mockAppointmentService.removeGoogleCalendarEventId.mockResolvedValue(mockAppointment);
      mockAppointmentStaffService.getStaffAssignment.mockResolvedValue({
        id: 'assignment-1',
        appointment_id: 'appointment-1',
        staff_id: 'staff-1',
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar', {
        method: 'POST',
        headers: {
          'x-goog-resource-state': 'exists',
          'x-goog-resource-id': 'resource-123',
          'x-goog-channel-id': 'webhook-123-test@example.com',
          'authorization': 'Bearer test-secret',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockAppointmentService.removeGoogleCalendarEventId).toHaveBeenCalledWith(
        'appointment-1',
        'staff-1',
      );
    });

    it('should handle invalid calendar events gracefully', async () => {
      const invalidEvent = {
        id: 'event-123',
        summary: 'Invalid Event',
        start: { dateTime: 'invalid-date' },
        end: { dateTime: 'invalid-date' },
      };

      mockGoogleCalendarService.getCalendarEvents.mockResolvedValue([invalidEvent]);

      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar', {
        method: 'POST',
        headers: {
          'x-goog-resource-state': 'exists',
          'x-goog-resource-id': 'resource-123',
          'x-goog-channel-id': 'webhook-123-test@example.com',
          'authorization': 'Bearer test-secret',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      // Invalid events should be skipped, not processed
      expect(mockAppointmentService.updateAppointment).not.toHaveBeenCalled();
    });

    it('should handle webhook verification', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar?challenge=test-challenge', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.text();

      expect(data).toBe('test-challenge');
    });

    it('should return webhook status for GET without challenge', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.message).toBe('Google Calendar Webhook Handler');
      expect(data.status).toBe('active');
    });

    it('should handle unauthorized webhook requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar', {
        method: 'POST',
        headers: {
          'x-goog-resource-state': 'exists',
          'x-goog-resource-id': 'resource-123',
          'x-goog-channel-id': 'webhook-123-test@example.com',
          // No authorization header
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle missing resource or channel IDs', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar', {
        method: 'POST',
        headers: {
          'x-goog-resource-state': 'exists',
          // Missing resource and channel IDs
          'authorization': 'Bearer test-secret',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should handle unknown webhook types', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar', {
        method: 'POST',
        headers: {
          'x-goog-resource-state': 'unknown',
          'x-goog-resource-id': 'resource-123',
          'x-goog-channel-id': 'webhook-123-test@example.com',
          'authorization': 'Bearer test-secret',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockStaffService.getStaffByCalendarId.mockRejectedValue(new Error('Service error'));

      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar', {
        method: 'POST',
        headers: {
          'x-goog-resource-state': 'exists',
          'x-goog-resource-id': 'resource-123',
          'x-goog-channel-id': 'webhook-123-test@example.com',
          'authorization': 'Bearer test-secret',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should handle calendar event processing errors', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Appointment - Medical Checkup - John Smith',
        description: 'Patient appointment\nType: medical_checkup\nNotes: Regular checkup',
        start: { dateTime: '2024-01-15T10:00:00+04:00' },
        end: { dateTime: '2024-01-15T11:00:00+04:00' },
      };

      mockGoogleCalendarService.getCalendarEvents.mockResolvedValue([mockEvent]);
      mockAppointmentService.getAppointmentsByStaff.mockResolvedValue([]);
      mockRetryUtils.retryWithBackoff.mockResolvedValue({
        success: false,
        error: new Error('Processing failed'),
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/calendar', {
        method: 'POST',
        headers: {
          'x-goog-resource-state': 'exists',
          'x-goog-resource-id': 'resource-123',
          'x-goog-channel-id': 'webhook-123-test@example.com',
          'authorization': 'Bearer test-secret',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });
});
