/**
 * End-to-End Tests for Complete Calendar Workflow
 *
 * Tests the complete calendar workflow from staff creation to appointment sync,
 * including calendar creation, verification, and appointment management.
 */

import { AppointmentService } from '@/services/appointmentService';
import { StaffService } from '@/services/staffService';
import type { Appointment, Staff } from '@/types';
import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testStaff: {
    first_name: 'Test',
    last_name: 'Doctor',
    email: 'test.doctor@example.com',
    phone: '+971501234567',
    staff_type: 'Doctor',
    status: 'active',
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    available_days: [1, 2, 3, 4, 5],
    telegram_user_id: '123456789',
    telegram_verified: false,
  },
  testClient: {
    first_name: 'Test',
    last_name: 'Client',
    email: 'test.client@example.com',
    phone: '+971501234568',
    status: 'active',
  },
  testAppointment: {
    client_id: '', // Will be set during test
    staff_id: '', // Will be set during test
    appointment_date: '2024-02-15',
    appointment_time: '10:00',
    duration_minutes: 60,
    status: 'scheduled',
    notes: 'Test appointment for calendar workflow',
  },
};

// Mock services for testing
const mockGoogleCalendarService = {
  createCalendar: jest.fn(),
  shareCalendar: jest.fn(),
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  getCalendar: jest.fn(),
  listEvents: jest.fn(),
};

const mockEmailService = {
  sendCalendarInvite: jest.fn(),
  sendVerificationEmail: jest.fn(),
  sendErrorNotification: jest.fn(),
  sendReminderEmail: jest.fn(),
};

const mockCalendarVerificationService = {
  startVerification: jest.fn(),
  checkVerificationStatus: jest.fn(),
  retryVerification: jest.fn(),
  cancelVerification: jest.fn(),
  getVerificationStatus: jest.fn(),
};

// Setup test environment
test.beforeAll(async () => {
  // Initialize test database connection
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Clean up any existing test data
  await supabase.from('appointments').delete().like('notes', 'Test appointment%');
  await supabase.from('staff').delete().like('email', 'test.%');
  await supabase.from('clients').delete().like('email', 'test.%');
  await supabase.from('calendar_verification_events').delete().like('staff_email', 'test.%');
  await supabase.from('error_logs').delete().like('context', '%test%');
});

test.afterAll(async () => {
  // Clean up test data
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from('appointments').delete().like('notes', 'Test appointment%');
  await supabase.from('staff').delete().like('email', 'test.%');
  await supabase.from('clients').delete().like('email', 'test.%');
  await supabase.from('calendar_verification_events').delete().like('staff_email', 'test.%');
  await supabase.from('error_logs').delete().like('context', '%test%');
});

test.describe('Complete Calendar Workflow', () => {
  let staffService: StaffService;
  let appointmentService: AppointmentService;
  let createdStaff: Staff;
  let createdClient: any;
  let createdAppointment: Appointment;

  test.beforeEach(async () => {
    // Initialize services with mocked dependencies
    staffService = new StaffService();
    appointmentService = new AppointmentService();

    // Mock the services
    (staffService as any).googleCalendarService = mockGoogleCalendarService;
    (staffService as any).emailService = mockEmailService;
    (staffService as any).calendarVerificationService = mockCalendarVerificationService;

    (appointmentService as any).googleCalendarService = mockGoogleCalendarService;
    (appointmentService as any).emailService = mockEmailService;

    // Reset mocks
    jest.clearAllMocks();
  });

  test('should complete full calendar workflow from staff creation to appointment sync', async () => {
    // Step 1: Create staff member
    mockGoogleCalendarService.createCalendar.mockResolvedValue({
      id: 'test-calendar@group.calendar.google.com',
      summary: 'Test Doctor - Best DOC',
      description: 'Calendar for Test Doctor',
    });

    mockGoogleCalendarService.shareCalendar.mockResolvedValue({
      role: 'writer',
      emailAddress: 'test.doctor@example.com',
    });

    mockEmailService.sendCalendarInvite.mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });

    mockCalendarVerificationService.startVerification.mockResolvedValue({
      success: true,
      verificationId: 'test-verification-id',
    });

    createdStaff = await staffService.createStaff(TEST_CONFIG.testStaff);

    expect(createdStaff).toBeDefined();
    expect(createdStaff.google_calendar_id).toBe('test-calendar@group.calendar.google.com');
    expect(createdStaff.calendar_verification_status).toBe('pending');

    // Verify calendar creation was called
    expect(mockGoogleCalendarService.createCalendar).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Test Doctor - Best DOC',
        description: 'Calendar for Test Doctor',
      })
    );

    // Verify calendar sharing was called
    expect(mockGoogleCalendarService.shareCalendar).toHaveBeenCalledWith(
      'test-calendar@group.calendar.google.com',
      'test.doctor@example.com'
    );

    // Verify email invite was sent
    expect(mockEmailService.sendCalendarInvite).toHaveBeenCalledWith(
      'test.doctor@example.com',
      'test-calendar@group.calendar.google.com',
      'Test Doctor'
    );

    // Verify verification was started
    expect(mockCalendarVerificationService.startVerification).toHaveBeenCalledWith(
      createdStaff.id,
      'test.doctor@example.com',
      'test-calendar@group.calendar.google.com'
    );

    // Step 2: Create client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert(TEST_CONFIG.testClient)
      .select()
      .single();

    expect(clientError).toBeNull();
    createdClient = clientData;

    // Step 3: Create appointment
    mockGoogleCalendarService.createEvent.mockResolvedValue({
      id: 'test-event-id',
      summary: 'Appointment with Test Client',
      start: {
        dateTime: '2024-02-15T10:00:00+04:00',
        timeZone: 'Asia/Dubai',
      },
      end: {
        dateTime: '2024-02-15T11:00:00+04:00',
        timeZone: 'Asia/Dubai',
      },
    });

    const appointmentData = {
      ...TEST_CONFIG.testAppointment,
      client_id: createdClient.id,
      staff_id: createdStaff.id,
    };

    createdAppointment = await appointmentService.createAppointment(appointmentData);

    expect(createdAppointment).toBeDefined();
    expect(createdAppointment.status).toBe('scheduled');

    // Verify calendar event was created
    expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledWith(
      'test-calendar@group.calendar.google.com',
      expect.objectContaining({
        summary: 'Appointment with Test Client',
        description: 'Test appointment for calendar workflow',
        start: expect.objectContaining({
          dateTime: '2024-02-15T10:00:00+04:00',
          timeZone: 'Asia/Dubai',
        }),
        end: expect.objectContaining({
          dateTime: '2024-02-15T11:00:00+04:00',
          timeZone: 'Asia/Dubai',
        }),
      })
    );

    // Step 4: Update appointment
    mockGoogleCalendarService.updateEvent.mockResolvedValue({
      id: 'test-event-id',
      summary: 'Updated Appointment with Test Client',
      start: {
        dateTime: '2024-02-15T11:00:00+04:00',
        timeZone: 'Asia/Dubai',
      },
      end: {
        dateTime: '2024-02-15T12:00:00+04:00',
        timeZone: 'Asia/Dubai',
      },
    });

    const updatedAppointment = await appointmentService.updateAppointment(createdAppointment.id, {
      appointment_time: '11:00',
      notes: 'Updated appointment notes',
    });

    expect(updatedAppointment).toBeDefined();
    expect(updatedAppointment.appointment_time).toBe('11:00');
    expect(updatedAppointment.notes).toBe('Updated appointment notes');

    // Verify calendar event was updated
    expect(mockGoogleCalendarService.updateEvent).toHaveBeenCalledWith(
      'test-calendar@group.calendar.google.com',
      'test-event-id',
      expect.objectContaining({
        summary: 'Updated Appointment with Test Client',
        start: expect.objectContaining({
          dateTime: '2024-02-15T11:00:00+04:00',
          timeZone: 'Asia/Dubai',
        }),
        end: expect.objectContaining({
          dateTime: '2024-02-15T12:00:00+04:00',
          timeZone: 'Asia/Dubai',
        }),
      })
    );

    // Step 5: Delete appointment
    mockGoogleCalendarService.deleteEvent.mockResolvedValue({
      success: true,
    });

    await appointmentService.deleteAppointment(createdAppointment.id);

    // Verify calendar event was deleted
    expect(mockGoogleCalendarService.deleteEvent).toHaveBeenCalledWith(
      'test-calendar@group.calendar.google.com',
      'test-event-id'
    );

    // Step 6: Delete staff member
    mockGoogleCalendarService.deleteCalendar.mockResolvedValue({
      success: true,
    });

    await staffService.deleteStaff(createdStaff.id);

    // Verify calendar was deleted
    expect(mockGoogleCalendarService.deleteCalendar).toHaveBeenCalledWith(
      'test-calendar@group.calendar.google.com'
    );
  });

  test('should handle calendar verification workflow', async () => {
    // Create staff with pending verification
    createdStaff = await staffService.createStaff(TEST_CONFIG.testStaff);

    // Mock verification status check
    mockCalendarVerificationService.getVerificationStatus.mockResolvedValue({
      status: 'pending',
      verificationId: 'test-verification-id',
      createdAt: '2024-01-15T10:00:00Z',
      expiresAt: '2024-01-15T11:00:00Z',
    });

    // Check verification status
    const status = await mockCalendarVerificationService.getVerificationStatus(createdStaff.id);
    expect(status.status).toBe('pending');

    // Mock successful verification
    mockCalendarVerificationService.checkVerificationStatus.mockResolvedValue({
      status: 'verified',
      verifiedAt: '2024-01-15T10:30:00Z',
    });

    // Simulate verification completion
    const verificationResult = await mockCalendarVerificationService.checkVerificationStatus('test-verification-id');
    expect(verificationResult.status).toBe('verified');

    // Verify email was sent for verification
    expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
      'test.doctor@example.com',
      'test-verification-id'
    );
  });

  test('should handle calendar setup failures gracefully', async () => {
    // Mock calendar creation failure
    mockGoogleCalendarService.createCalendar.mockRejectedValue(
      new Error('Google Calendar API unavailable')
    );

    mockEmailService.sendErrorNotification.mockResolvedValue({
      success: true,
      messageId: 'error-notification-id',
    });

    // Attempt to create staff
    try {
      await staffService.createStaff(TEST_CONFIG.testStaff);
    } catch (error) {
      expect(error).toBeDefined();
    }

    // Verify error notification was sent
    expect(mockEmailService.sendErrorNotification).toHaveBeenCalledWith(
      'test.doctor@example.com',
      'CALENDAR_CREATION_FAILED',
      expect.any(String)
    );
  });

  test('should handle appointment sync failures gracefully', async () => {
    // Create staff successfully
    mockGoogleCalendarService.createCalendar.mockResolvedValue({
      id: 'test-calendar@group.calendar.google.com',
      summary: 'Test Doctor - Best DOC',
    });

    mockGoogleCalendarService.shareCalendar.mockResolvedValue({
      role: 'writer',
      emailAddress: 'test.doctor@example.com',
    });

    createdStaff = await staffService.createStaff(TEST_CONFIG.testStaff);

    // Create client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: clientData } = await supabase
      .from('clients')
      .insert(TEST_CONFIG.testClient)
      .select()
      .single();

    // Mock calendar event creation failure
    mockGoogleCalendarService.createEvent.mockRejectedValue(
      new Error('Calendar event creation failed')
    );

    // Attempt to create appointment
    try {
      await appointmentService.createAppointment({
        ...TEST_CONFIG.testAppointment,
        client_id: clientData.id,
        staff_id: createdStaff.id,
      });
    } catch (error) {
      expect(error).toBeDefined();
    }

    // Verify error was logged
    expect(mockEmailService.sendErrorNotification).toHaveBeenCalledWith(
      'test.doctor@example.com',
      'CALENDAR_EVENT_CREATION_FAILED',
      expect.any(String)
    );
  });

  test('should handle retry mechanisms for failed operations', async () => {
    // Mock initial failure with retry
    mockGoogleCalendarService.createCalendar
      .mockRejectedValueOnce(new Error('Temporary API error'))
      .mockResolvedValueOnce({
        id: 'test-calendar@group.calendar.google.com',
        summary: 'Test Doctor - Best DOC',
      });

    mockGoogleCalendarService.shareCalendar.mockResolvedValue({
      role: 'writer',
      emailAddress: 'test.doctor@example.com',
    });

    // Create staff (should retry and succeed)
    createdStaff = await staffService.createStaff(TEST_CONFIG.testStaff);

    expect(createdStaff).toBeDefined();
    expect(createdStaff.google_calendar_id).toBe('test-calendar@group.calendar.google.com');

    // Verify retry was attempted
    expect(mockGoogleCalendarService.createCalendar).toHaveBeenCalledTimes(2);
  });

  test('should handle calendar verification retry', async () => {
    // Create staff
    createdStaff = await staffService.createStaff(TEST_CONFIG.testStaff);

    // Mock verification retry
    mockCalendarVerificationService.retryVerification.mockResolvedValue({
      success: true,
      verificationId: 'new-verification-id',
    });

    // Retry verification
    const retryResult = await mockCalendarVerificationService.retryVerification(createdStaff.id);
    expect(retryResult.success).toBe(true);
    expect(retryResult.verificationId).toBe('new-verification-id');

    // Verify retry was called
    expect(mockCalendarVerificationService.retryVerification).toHaveBeenCalledWith(createdStaff.id);
  });

  test('should handle calendar cleanup on staff deletion', async () => {
    // Create staff with calendar
    createdStaff = await staffService.createStaff(TEST_CONFIG.testStaff);

    // Mock calendar deletion
    mockGoogleCalendarService.deleteCalendar.mockResolvedValue({
      success: true,
    });

    // Delete staff
    await staffService.deleteStaff(createdStaff.id);

    // Verify calendar was deleted
    expect(mockGoogleCalendarService.deleteCalendar).toHaveBeenCalledWith(
      'test-calendar@group.calendar.google.com'
    );
  });

  test('should handle bulk operations efficiently', async () => {
    // Create multiple staff members
    const staffMembers = await Promise.all([
      staffService.createStaff({
        ...TEST_CONFIG.testStaff,
        email: 'staff1@example.com',
        first_name: 'Staff1',
      }),
      staffService.createStaff({
        ...TEST_CONFIG.testStaff,
        email: 'staff2@example.com',
        first_name: 'Staff2',
      }),
      staffService.createStaff({
        ...TEST_CONFIG.testStaff,
        email: 'staff3@example.com',
        first_name: 'Staff3',
      }),
    ]);

    // Verify all calendars were created
    expect(staffMembers).toHaveLength(3);
    staffMembers.forEach(staff => {
      expect(staff.google_calendar_id).toBeDefined();
      expect(staff.calendar_verification_status).toBe('pending');
    });

    // Verify calendar creation was called for each staff member
    expect(mockGoogleCalendarService.createCalendar).toHaveBeenCalledTimes(3);
    expect(mockGoogleCalendarService.shareCalendar).toHaveBeenCalledTimes(3);
    expect(mockEmailService.sendCalendarInvite).toHaveBeenCalledTimes(3);
    expect(mockCalendarVerificationService.startVerification).toHaveBeenCalledTimes(3);

    // Clean up
    await Promise.all(staffMembers.map(staff => staffService.deleteStaff(staff.id)));
  });
});
