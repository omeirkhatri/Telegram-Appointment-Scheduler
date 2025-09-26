/**
 * Integration Tests for Staff Creation with Calendar Setup
 *
 * Tests the complete workflow of creating staff members and automatically
 * setting up their Google Calendar with verification and email notifications.
 */

import { logCalendarOperation } from '@/lib/calendarOperations';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import { getCalendarVerificationService } from '@/services/calendarVerificationService';
import { getEmailService } from '@/services/emailService';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
import { StaffService } from '@/services/staffService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/services/googleCalendarService');
jest.mock('@/services/emailService');
jest.mock('@/services/calendarVerificationService');
jest.mock('@/lib/calendarOperations');
jest.mock('@/lib/featureFlags');

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
};

(supabase as any) = mockSupabase;

// Mock services
const mockGoogleCalendarService = {
  createCalendar: jest.fn(),
  shareCalendar: jest.fn(),
  calendarExists: jest.fn(),
  deleteEvent: jest.fn(),
};

const mockEmailService = {
  sendCalendarInvite: jest.fn(),
  sendVerificationEmail: jest.fn(),
};

const mockVerificationService = {
  startVerification: jest.fn(),
  checkVerificationStatus: jest.fn(),
  cancelVerification: jest.fn(),
};

(getGoogleCalendarService as any) = jest.fn(() => mockGoogleCalendarService);
(getEmailService as any) = jest.fn(() => mockEmailService);
(getCalendarVerificationService as any) = jest.fn(() => mockVerificationService);
(logCalendarOperation as any) = jest.fn();
(isFeatureEnabled as any) = jest.fn();

describe('Staff Calendar Integration', () => {
  let staffService: StaffService;

  beforeEach(() => {
    jest.clearAllMocks();
    staffService = new StaffService();

    // Setup default mocks
    (isFeatureEnabled as any).mockReturnValue(true);
    (logCalendarOperation as any).mockResolvedValue(undefined);
  });

  describe('Staff Creation with Calendar Setup', () => {
    it('should create staff and set up calendar successfully', async () => {
      const staffData = {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '+971501234567',
        staff_type: 'Doctor',
        status: 'active',
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        available_days: [1, 2, 3, 4, 5], // Monday to Friday
        telegram_user_id: '123456789',
        telegram_verified: false,
      };

      const createdStaff = {
        id: 'staff-123',
        ...staffData,
        google_calendar_id: null,
        calendar_verification_status: null,
        calendar_verification_date: null,
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const calendarResult = {
        success: true,
        calendarId: 'test-calendar-id@group.calendar.google.com',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
      };

      const shareResult = {
        success: true,
      };

      const verificationResult = {
        success: true,
        verificationStatus: 'pending',
        verificationEventId: 'verification-event-123',
      };

      const emailResult = {
        success: true,
        messageId: 'email-123',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdStaff,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      // Mock service responses
      mockGoogleCalendarService.createCalendar.mockResolvedValue(calendarResult);
      mockGoogleCalendarService.shareCalendar.mockResolvedValue(shareResult);
      mockEmailService.sendCalendarInvite.mockResolvedValue(emailResult);
      mockVerificationService.startVerification.mockResolvedValue(verificationResult);

      // Create staff
      const result = await staffService.createStaff(staffData);

      // Verify staff creation
      expect(result).toEqual(createdStaff);
      expect(mockSupabase.from).toHaveBeenCalledWith('staff');

      // Verify calendar creation
      expect(mockGoogleCalendarService.createCalendar).toHaveBeenCalledWith({
        staff_id: createdStaff.id,
        staff_name: 'John Smith',
        staff_type: 'Doctor',
        staff_email: 'john.smith@example.com',
      });

      // Verify calendar sharing
      expect(mockGoogleCalendarService.shareCalendar).toHaveBeenCalledWith({
        staff_id: createdStaff.id,
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
        permission_level: 'reader',
      });

      // Verify email invitation
      expect(mockEmailService.sendCalendarInvite).toHaveBeenCalledWith({
        to: 'john.smith@example.com',
        staffName: 'John Smith',
        staffType: 'Doctor',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
        calendarName: 'John Smith - Doctor - BestDOC',
        organizationName: 'BestDOC',
      });

      // Verify verification process
      expect(mockVerificationService.startVerification).toHaveBeenCalledWith({
        staff_id: createdStaff.id,
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      });

      // Verify calendar operation logging
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: createdStaff.id,
        operationType: 'create_calendar',
        operationStatus: 'pending',
      });

      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: createdStaff.id,
        operationType: 'create_calendar',
        operationStatus: 'success',
        googleCalendarId: 'test-calendar-id@group.calendar.google.com',
      });
    });

    it('should handle calendar creation failure gracefully', async () => {
      const staffData = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+971501234568',
        staff_type: 'Nurse',
        status: 'active',
        working_hours_start: '08:00',
        working_hours_end: '16:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '987654321',
        telegram_verified: false,
      };

      const createdStaff = {
        id: 'staff-456',
        ...staffData,
        google_calendar_id: null,
        calendar_verification_status: null,
        calendar_verification_date: null,
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdStaff,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      // Mock calendar creation failure
      mockGoogleCalendarService.createCalendar.mockResolvedValue({
        success: false,
        errorCode: 'GOOGLE_API_UNAVAILABLE',
        errorMessage: 'Google Calendar API is temporarily unavailable',
      });

      // Create staff - should succeed even if calendar creation fails
      const result = await staffService.createStaff(staffData);

      // Verify staff creation succeeded
      expect(result).toEqual(createdStaff);

      // Verify calendar creation was attempted
      expect(mockGoogleCalendarService.createCalendar).toHaveBeenCalled();

      // Verify error logging
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: createdStaff.id,
        operationType: 'create_calendar',
        operationStatus: 'failed',
        errorCode: 'CALENDAR_CREATION_FAILED',
        errorMessage: 'Google Calendar API is temporarily unavailable',
      });

      // Verify staff record was updated with error
      expect(mockSupabase.from).toHaveBeenCalledWith('staff');
    });

    it('should skip calendar creation when feature is disabled', async () => {
      (isFeatureEnabled as any).mockReturnValue(false);

      const staffData = {
        first_name: 'Bob',
        last_name: 'Wilson',
        email: 'bob.wilson@example.com',
        phone: '+971501234569',
        staff_type: 'Caregiver',
        status: 'active',
        working_hours_start: '10:00',
        working_hours_end: '18:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '555666777',
        telegram_verified: false,
      };

      const createdStaff = {
        id: 'staff-789',
        ...staffData,
        google_calendar_id: null,
        calendar_verification_status: null,
        calendar_verification_date: null,
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdStaff,
              error: null,
            }),
          })),
        })),
      });

      // Create staff
      const result = await staffService.createStaff(staffData);

      // Verify staff creation succeeded
      expect(result).toEqual(createdStaff);

      // Verify calendar services were not called
      expect(mockGoogleCalendarService.createCalendar).not.toHaveBeenCalled();
      expect(mockEmailService.sendCalendarInvite).not.toHaveBeenCalled();
      expect(mockVerificationService.startVerification).not.toHaveBeenCalled();
    });

    it('should skip calendar creation for staff without email', async () => {
      const staffData = {
        first_name: 'Alice',
        last_name: 'Brown',
        email: 'no-email@bestdoc.com', // Special no-email address
        phone: '+971501234570',
        staff_type: 'Driver',
        status: 'active',
        working_hours_start: '07:00',
        working_hours_end: '15:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '111222333',
        telegram_verified: false,
      };

      const createdStaff = {
        id: 'staff-101',
        ...staffData,
        google_calendar_id: null,
        calendar_verification_status: null,
        calendar_verification_date: null,
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdStaff,
              error: null,
            }),
          })),
        })),
      });

      // Create staff
      const result = await staffService.createStaff(staffData);

      // Verify staff creation succeeded
      expect(result).toEqual(createdStaff);

      // Verify calendar services were not called
      expect(mockGoogleCalendarService.createCalendar).not.toHaveBeenCalled();
      expect(mockEmailService.sendCalendarInvite).not.toHaveBeenCalled();
      expect(mockVerificationService.startVerification).not.toHaveBeenCalled();
    });

    it('should handle partial calendar setup failures', async () => {
      const staffData = {
        first_name: 'Charlie',
        last_name: 'Davis',
        email: 'charlie.davis@example.com',
        phone: '+971501234571',
        staff_type: 'Physiotherapist',
        status: 'active',
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '444555666',
        telegram_verified: false,
      };

      const createdStaff = {
        id: 'staff-202',
        ...staffData,
        google_calendar_id: null,
        calendar_verification_status: null,
        calendar_verification_date: null,
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdStaff,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      // Mock calendar creation success but sharing failure
      mockGoogleCalendarService.createCalendar.mockResolvedValue({
        success: true,
        calendarId: 'test-calendar-id@group.calendar.google.com',
        calendarUrl: 'https://calendar.google.com/calendar/embed?src=test-calendar-id',
      });

      mockGoogleCalendarService.shareCalendar.mockResolvedValue({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        errorMessage: 'Failed to share calendar',
      });

      mockEmailService.sendCalendarInvite.mockResolvedValue({
        success: false,
        errorCode: 'INVITE_SEND_FAILED',
        errorMessage: 'Email service unavailable',
      });

      mockVerificationService.startVerification.mockResolvedValue({
        success: false,
        verificationStatus: 'failed',
        errorCode: 'VERIFICATION_EVENT_CREATION_FAILED',
        errorMessage: 'Failed to create verification event',
      });

      // Create staff
      const result = await staffService.createStaff(staffData);

      // Verify staff creation succeeded
      expect(result).toEqual(createdStaff);

      // Verify calendar creation was attempted
      expect(mockGoogleCalendarService.createCalendar).toHaveBeenCalled();
      expect(mockGoogleCalendarService.shareCalendar).toHaveBeenCalled();
      expect(mockEmailService.sendCalendarInvite).toHaveBeenCalled();
      expect(mockVerificationService.startVerification).toHaveBeenCalled();

      // Verify error logging for failed operations
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: createdStaff.id,
        operationType: 'create_calendar',
        operationStatus: 'success',
        googleCalendarId: 'test-calendar-id@group.calendar.google.com',
      });
    });
  });

  describe('Staff Update with Calendar Operations', () => {
    it('should update calendar sharing when email changes', async () => {
      const staffId = 'staff-303';
      const existingStaff = {
        id: staffId,
        first_name: 'David',
        last_name: 'Miller',
        email: 'david.miller@example.com',
        phone: '+971501234572',
        staff_type: 'Lab Technician',
        status: 'active',
        working_hours_start: '08:00',
        working_hours_end: '16:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '777888999',
        telegram_verified: false,
        google_calendar_id: 'existing-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'verified',
        calendar_verification_date: '2024-01-01T10:00:00Z',
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const updates = {
        email: 'david.miller.new@example.com',
      };

      const updatedStaff = {
        ...existingStaff,
        email: 'david.miller.new@example.com',
        updated_at: '2024-01-01T11:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingStaff,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({
            data: updatedStaff,
            error: null,
          }),
        })),
      });

      // Mock calendar sharing
      mockGoogleCalendarService.shareCalendar.mockResolvedValue({
        success: true,
      });

      // Update staff
      const result = await staffService.updateStaff(staffId, updates);

      // Verify staff update succeeded
      expect(result).toEqual(updatedStaff);

      // Verify calendar sharing was attempted with new email
      expect(mockGoogleCalendarService.shareCalendar).toHaveBeenCalledWith({
        staff_id: staffId,
        google_calendar_id: 'existing-calendar-id@group.calendar.google.com',
        staff_email: 'david.miller.new@example.com',
        permission_level: 'reader',
      });

      // Verify calendar operation logging
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId,
        operationType: 'share_calendar',
        operationStatus: 'success',
        googleCalendarId: 'existing-calendar-id@group.calendar.google.com',
      });
    });

    it('should skip calendar operations when no calendar exists', async () => {
      const staffId = 'staff-404';
      const existingStaff = {
        id: staffId,
        first_name: 'Eve',
        last_name: 'Johnson',
        email: 'eve.johnson@example.com',
        phone: '+971501234573',
        staff_type: 'Caregiver',
        status: 'active',
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '000111222',
        telegram_verified: false,
        google_calendar_id: null, // No calendar
        calendar_verification_status: null,
        calendar_verification_date: null,
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const updates = {
        email: 'eve.johnson.new@example.com',
      };

      const updatedStaff = {
        ...existingStaff,
        email: 'eve.johnson.new@example.com',
        updated_at: '2024-01-01T11:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingStaff,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({
            data: updatedStaff,
            error: null,
          }),
        })),
      });

      // Update staff
      const result = await staffService.updateStaff(staffId, updates);

      // Verify staff update succeeded
      expect(result).toEqual(updatedStaff);

      // Verify calendar services were not called
      expect(mockGoogleCalendarService.shareCalendar).not.toHaveBeenCalled();
    });
  });

  describe('Staff Deletion with Calendar Cleanup', () => {
    it('should clean up calendar when staff is deleted', async () => {
      const staffId = 'staff-505';
      const existingStaff = {
        id: staffId,
        first_name: 'Frank',
        last_name: 'Garcia',
        email: 'frank.garcia@example.com',
        phone: '+971501234574',
        staff_type: 'Driver',
        status: 'active',
        working_hours_start: '07:00',
        working_hours_end: '15:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '333444555',
        telegram_verified: false,
        google_calendar_id: 'staff-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'verified',
        calendar_verification_date: '2024-01-01T10:00:00Z',
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingStaff,
              error: null,
            }),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      // Mock calendar cleanup
      mockGoogleCalendarService.deleteEvent.mockResolvedValue({
        success: true,
      });

      mockVerificationService.cancelVerification.mockResolvedValue({
        success: true,
      });

      // Delete staff
      await staffService.deleteStaff(staffId);

      // Verify staff deletion
      expect(mockSupabase.from).toHaveBeenCalledWith('staff');

      // Verify calendar cleanup was attempted
      expect(mockVerificationService.cancelVerification).toHaveBeenCalledWith(staffId);
    });

    it('should handle calendar cleanup failure gracefully', async () => {
      const staffId = 'staff-606';
      const existingStaff = {
        id: staffId,
        first_name: 'Grace',
        last_name: 'Lee',
        email: 'grace.lee@example.com',
        phone: '+971501234575',
        staff_type: 'Nurse',
        status: 'active',
        working_hours_start: '08:00',
        working_hours_end: '16:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '666777888',
        telegram_verified: false,
        google_calendar_id: 'staff-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'verified',
        calendar_verification_date: '2024-01-01T10:00:00Z',
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingStaff,
              error: null,
            }),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      // Mock calendar cleanup failure
      mockVerificationService.cancelVerification.mockRejectedValue(
        new Error('Verification service unavailable')
      );

      // Delete staff - should succeed even if calendar cleanup fails
      await staffService.deleteStaff(staffId);

      // Verify staff deletion succeeded
      expect(mockSupabase.from).toHaveBeenCalledWith('staff');

      // Verify calendar cleanup was attempted
      expect(mockVerificationService.cancelVerification).toHaveBeenCalledWith(staffId);
    });

    it('should skip calendar cleanup when no calendar exists', async () => {
      const staffId = 'staff-707';
      const existingStaff = {
        id: staffId,
        first_name: 'Henry',
        last_name: 'Wilson',
        email: 'henry.wilson@example.com',
        phone: '+971501234576',
        staff_type: 'Caregiver',
        status: 'active',
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '999000111',
        telegram_verified: false,
        google_calendar_id: null, // No calendar
        calendar_verification_status: null,
        calendar_verification_date: null,
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingStaff,
              error: null,
            }),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      // Delete staff
      await staffService.deleteStaff(staffId);

      // Verify staff deletion
      expect(mockSupabase.from).toHaveBeenCalledWith('staff');

      // Verify calendar services were not called
      expect(mockVerificationService.cancelVerification).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors during staff creation', async () => {
      const staffData = {
        first_name: 'Ivy',
        last_name: 'Chen',
        email: 'ivy.chen@example.com',
        phone: '+971501234577',
        staff_type: 'Physiotherapist',
        status: 'active',
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '222333444',
        telegram_verified: false,
      };

      // Mock database error
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          })),
        })),
      });

      // Create staff should fail
      await expect(staffService.createStaff(staffData)).rejects.toThrow(
        'Failed to create staff member: Database connection failed'
      );
    });

    it('should handle service initialization errors', async () => {
      const staffData = {
        first_name: 'Jack',
        last_name: 'Taylor',
        email: 'jack.taylor@example.com',
        phone: '+971501234578',
        staff_type: 'Lab Technician',
        status: 'active',
        working_hours_start: '08:00',
        working_hours_end: '16:00',
        available_days: [1, 2, 3, 4, 5],
        telegram_user_id: '555666777',
        telegram_verified: false,
      };

      const createdStaff = {
        id: 'staff-808',
        ...staffData,
        google_calendar_id: null,
        calendar_verification_status: null,
        calendar_verification_date: null,
        calendar_error_code: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdStaff,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      // Mock service initialization error
      (getGoogleCalendarService as any).mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      // Create staff - should succeed even if calendar service fails
      const result = await staffService.createStaff(staffData);

      // Verify staff creation succeeded
      expect(result).toEqual(createdStaff);

      // Verify error logging
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: createdStaff.id,
        operationType: 'create_calendar',
        operationStatus: 'failed',
        errorCode: 'CALENDAR_CREATION_FAILED',
        errorMessage: 'Service initialization failed',
      });
    });
  });
});
