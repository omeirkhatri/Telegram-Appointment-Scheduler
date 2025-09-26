/**
 * Integration Tests for Appointment Creation with Calendar Sync
 *
 * Tests the complete workflow of creating, updating, and deleting appointments
 * and automatically syncing them to staff Google Calendars.
 */

import { logCalendarOperation } from '@/lib/calendarOperations';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
import { AppointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/services/googleCalendarService');
jest.mock('@/services/appointmentStaffService');
jest.mock('@/lib/calendarOperations');
jest.mock('@/lib/featureFlags');
jest.mock('@/services/telegramNotificationService');

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
        order: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
};

(supabase as any) = mockSupabase;

// Mock services
const mockGoogleCalendarService = {
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
};

const mockAppointmentStaffService = {
  getStaffForAppointment: jest.fn(),
  assignStaffToAppointment: jest.fn(),
  removeStaffFromAppointment: jest.fn(),
};

const mockTelegramNotificationService = {
  sendAppointmentNotificationsToStaff: jest.fn(),
};

(getGoogleCalendarService as any) = jest.fn(() => mockGoogleCalendarService);
(appointmentStaffService as any) = mockAppointmentStaffService;
(telegramNotificationService as any) = mockTelegramNotificationService;
(logCalendarOperation as any) = jest.fn();
(isFeatureEnabled as any) = jest.fn();

describe('Appointment Calendar Integration', () => {
  let appointmentService: AppointmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentService = new AppointmentService();

    // Setup default mocks
    (isFeatureEnabled as any).mockReturnValue(true);
    (logCalendarOperation as any).mockResolvedValue(undefined);
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  });

  describe('Appointment Creation with Calendar Sync', () => {
    it('should create appointment and sync to staff calendars successfully', async () => {
      const appointmentData = {
        id: 'appointment-123',
        patient_id: 'patient-123',
        appointment_type: 'home_visit',
        appointment_date: '2024-01-15',
        start_time: '10:00',
        end_time: '11:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Regular checkup',
        address: '123 Main St, Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        google_maps_link: 'https://maps.google.com/123',
        is_recurring: false,
        recurring_rule: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const createdAppointment = {
        ...appointmentData,
        patient: {
          id: 'patient-123',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: '123',
          building_street: 'Main Street',
          area: 'Downtown',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          google_maps_link: 'https://maps.google.com/123',
        },
        appointment_staff: [],
      };

      const staffAssignments = [
        {
          id: 'assignment-1',
          role: 'primary',
          is_primary: true,
          staff: {
            id: 'staff-1',
            first_name: 'Dr. Sarah',
            last_name: 'Johnson',
            staff_type: 'Doctor',
            specialization: 'General Medicine',
            phone: '+971501234568',
            email: 'sarah.johnson@example.com',
            google_calendar_id: 'doctor-calendar@group.calendar.google.com',
          },
        },
        {
          id: 'assignment-2',
          role: 'assistant',
          is_primary: false,
          staff: {
            id: 'staff-2',
            first_name: 'Nurse',
            last_name: 'Smith',
            staff_type: 'Nurse',
            specialization: 'General Care',
            phone: '+971501234569',
            email: 'nurse.smith@example.com',
            google_calendar_id: 'nurse-calendar@group.calendar.google.com',
          },
        },
      ];

      const calendarEventResult = {
        success: true,
        eventId: 'event-123',
        eventUrl: 'https://calendar.google.com/event?eid=event-123',
      };

      const notificationResult = {
        success: true,
        results: [
          { staff_id: 'staff-1', success: true },
          { staff_id: 'staff-2', success: true },
        ],
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdAppointment,
              error: null,
            }),
          })),
        })),
      });

      // Mock staff assignments
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue(staffAssignments);

      // Mock calendar service
      mockGoogleCalendarService.createEvent.mockResolvedValue(calendarEventResult);

      // Mock notification service
      mockTelegramNotificationService.sendAppointmentNotificationsToStaff.mockResolvedValue(notificationResult);

      // Create appointment
      const result = await appointmentService.createAppointment(appointmentData);

      // Verify appointment creation
      expect(result).toEqual(createdAppointment);

      // Verify staff assignments were retrieved
      expect(mockAppointmentStaffService.getStaffForAppointment).toHaveBeenCalledWith('appointment-123');

      // Verify calendar events were created for each staff member
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledTimes(2);

      // Verify calendar event for doctor
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledWith({
        staff_id: 'staff-1',
        google_calendar_id: 'doctor-calendar@group.calendar.google.com',
        event_title: expect.stringContaining('Home Visit - John Doe'),
        event_description: expect.stringContaining('Regular checkup'),
        start_time: expect.stringContaining('2024-01-15T10:00:00'),
        end_time: expect.stringContaining('2024-01-15T11:00:00'),
        location: '123 Main St, Dubai',
        attendees: ['sarah.johnson@example.com'],
      });

      // Verify calendar event for nurse
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledWith({
        staff_id: 'staff-2',
        google_calendar_id: 'nurse-calendar@group.calendar.google.com',
        event_title: expect.stringContaining('Home Visit - John Doe'),
        event_description: expect.stringContaining('Regular checkup'),
        start_time: expect.stringContaining('2024-01-15T10:00:00'),
        end_time: expect.stringContaining('2024-01-15T11:00:00'),
        location: '123 Main St, Dubai',
        attendees: ['nurse.smith@example.com'],
      });

      // Verify calendar operation logging
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: 'staff-1',
        operationType: 'create_event',
        operationStatus: 'pending',
        appointmentId: 'appointment-123',
      });

      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: 'staff-1',
        operationType: 'create_event',
        operationStatus: 'success',
        appointmentId: 'appointment-123',
        googleEventId: 'event-123',
      });

      // Verify notifications were sent
      expect(mockTelegramNotificationService.sendAppointmentNotificationsToStaff).toHaveBeenCalledWith(
        createdAppointment,
        staffAssignments,
        'created'
      );
    });

    it('should handle calendar sync failure gracefully', async () => {
      const appointmentData = {
        id: 'appointment-456',
        patient_id: 'patient-456',
        appointment_type: 'consultation',
        appointment_date: '2024-01-16',
        start_time: '14:00',
        end_time: '15:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Follow-up consultation',
        address: '456 Business Bay, Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        google_maps_link: 'https://maps.google.com/456',
        is_recurring: false,
        recurring_rule: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const createdAppointment = {
        ...appointmentData,
        patient: {
          id: 'patient-456',
          name: 'Jane Smith',
          phone: '+971501234570',
          flat_villa_no: '456',
          building_street: 'Business Bay',
          area: 'Business Bay',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          google_maps_link: 'https://maps.google.com/456',
        },
        appointment_staff: [],
      };

      const staffAssignments = [
        {
          id: 'assignment-3',
          role: 'primary',
          is_primary: true,
          staff: {
            id: 'staff-3',
            first_name: 'Dr. Michael',
            last_name: 'Brown',
            staff_type: 'Doctor',
            specialization: 'Cardiology',
            phone: '+971501234571',
            email: 'michael.brown@example.com',
            google_calendar_id: 'cardiology-calendar@group.calendar.google.com',
          },
        },
      ];

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdAppointment,
              error: null,
            }),
          })),
        })),
      });

      // Mock staff assignments
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue(staffAssignments);

      // Mock calendar service failure
      mockGoogleCalendarService.createEvent.mockResolvedValue({
        success: false,
        errorCode: 'GOOGLE_API_UNAVAILABLE',
        errorMessage: 'Google Calendar API is temporarily unavailable',
      });

      // Mock notification service
      mockTelegramNotificationService.sendAppointmentNotificationsToStaff.mockResolvedValue({
        success: true,
        results: [{ staff_id: 'staff-3', success: true }],
      });

      // Create appointment - should succeed even if calendar sync fails
      const result = await appointmentService.createAppointment(appointmentData);

      // Verify appointment creation succeeded
      expect(result).toEqual(createdAppointment);

      // Verify calendar event creation was attempted
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalled();

      // Verify error logging
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: 'staff-3',
        operationType: 'create_event',
        operationStatus: 'failed',
        appointmentId: 'appointment-456',
        errorCode: 'GOOGLE_API_UNAVAILABLE',
        errorMessage: 'Google Calendar API is temporarily unavailable',
      });

      // Verify notifications were still sent
      expect(mockTelegramNotificationService.sendAppointmentNotificationsToStaff).toHaveBeenCalled();
    });

    it('should skip calendar sync when feature is disabled', async () => {
      (isFeatureEnabled as any).mockReturnValue(false);

      const appointmentData = {
        id: 'appointment-789',
        patient_id: 'patient-789',
        appointment_type: 'home_visit',
        appointment_date: '2024-01-17',
        start_time: '09:00',
        end_time: '10:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Routine checkup',
        address: '789 Marina, Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        google_maps_link: 'https://maps.google.com/789',
        is_recurring: false,
        recurring_rule: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const createdAppointment = {
        ...appointmentData,
        patient: {
          id: 'patient-789',
          name: 'Bob Wilson',
          phone: '+971501234572',
          flat_villa_no: '789',
          building_street: 'Marina Walk',
          area: 'Marina',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          google_maps_link: 'https://maps.google.com/789',
        },
        appointment_staff: [],
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdAppointment,
              error: null,
            }),
          })),
        })),
      });

      // Create appointment
      const result = await appointmentService.createAppointment(appointmentData);

      // Verify appointment creation succeeded
      expect(result).toEqual(createdAppointment);

      // Verify calendar services were not called
      expect(mockGoogleCalendarService.createEvent).not.toHaveBeenCalled();
      expect(mockAppointmentStaffService.getStaffForAppointment).not.toHaveBeenCalled();
    });

    it('should skip calendar sync when no staff assignments exist', async () => {
      const appointmentData = {
        id: 'appointment-101',
        patient_id: 'patient-101',
        appointment_type: 'consultation',
        appointment_date: '2024-01-18',
        start_time: '11:00',
        end_time: '12:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Initial consultation',
        address: '101 JBR, Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        google_maps_link: 'https://maps.google.com/101',
        is_recurring: false,
        recurring_rule: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const createdAppointment = {
        ...appointmentData,
        patient: {
          id: 'patient-101',
          name: 'Alice Johnson',
          phone: '+971501234573',
          flat_villa_no: '101',
          building_street: 'JBR Walk',
          area: 'JBR',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          google_maps_link: 'https://maps.google.com/101',
        },
        appointment_staff: [],
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdAppointment,
              error: null,
            }),
          })),
        })),
      });

      // Mock no staff assignments
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([]);

      // Create appointment
      const result = await appointmentService.createAppointment(appointmentData);

      // Verify appointment creation succeeded
      expect(result).toEqual(createdAppointment);

      // Verify staff assignments were checked
      expect(mockAppointmentStaffService.getStaffForAppointment).toHaveBeenCalledWith('appointment-101');

      // Verify calendar services were not called
      expect(mockGoogleCalendarService.createEvent).not.toHaveBeenCalled();
    });

    it('should skip calendar sync for staff without calendar ID', async () => {
      const appointmentData = {
        id: 'appointment-202',
        patient_id: 'patient-202',
        appointment_type: 'home_visit',
        appointment_date: '2024-01-19',
        start_time: '15:00',
        end_time: '16:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Follow-up visit',
        address: '202 Palm Jumeirah, Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        google_maps_link: 'https://maps.google.com/202',
        is_recurring: false,
        recurring_rule: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const createdAppointment = {
        ...appointmentData,
        patient: {
          id: 'patient-202',
          name: 'Charlie Davis',
          phone: '+971501234574',
          flat_villa_no: '202',
          building_street: 'Palm Jumeirah',
          area: 'Palm Jumeirah',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          google_maps_link: 'https://maps.google.com/202',
        },
        appointment_staff: [],
      };

      const staffAssignments = [
        {
          id: 'assignment-4',
          role: 'primary',
          is_primary: true,
          staff: {
            id: 'staff-4',
            first_name: 'Dr. Emma',
            last_name: 'Wilson',
            staff_type: 'Doctor',
            specialization: 'Dermatology',
            phone: '+971501234575',
            email: 'emma.wilson@example.com',
            google_calendar_id: null, // No calendar ID
          },
        },
        {
          id: 'assignment-5',
          role: 'assistant',
          is_primary: false,
          staff: {
            id: 'staff-5',
            first_name: 'Nurse',
            last_name: 'Brown',
            staff_type: 'Nurse',
            specialization: 'General Care',
            phone: '+971501234576',
            email: 'nurse.brown@example.com',
            google_calendar_id: 'nurse-calendar-2@group.calendar.google.com',
          },
        },
      ];

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdAppointment,
              error: null,
            }),
          })),
        })),
      });

      // Mock staff assignments
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue(staffAssignments);

      // Mock calendar service
      mockGoogleCalendarService.createEvent.mockResolvedValue({
        success: true,
        eventId: 'event-456',
        eventUrl: 'https://calendar.google.com/event?eid=event-456',
      });

      // Mock notification service
      mockTelegramNotificationService.sendAppointmentNotificationsToStaff.mockResolvedValue({
        success: true,
        results: [
          { staff_id: 'staff-4', success: true },
          { staff_id: 'staff-5', success: true },
        ],
      });

      // Create appointment
      const result = await appointmentService.createAppointment(appointmentData);

      // Verify appointment creation succeeded
      expect(result).toEqual(createdAppointment);

      // Verify calendar event was only created for staff with calendar ID
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledTimes(1);
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledWith({
        staff_id: 'staff-5',
        google_calendar_id: 'nurse-calendar-2@group.calendar.google.com',
        event_title: expect.stringContaining('Home Visit - Charlie Davis'),
        event_description: expect.stringContaining('Follow-up visit'),
        start_time: expect.stringContaining('2024-01-19T15:00:00'),
        end_time: expect.stringContaining('2024-01-19T16:00:00'),
        location: '202 Palm Jumeirah, Dubai',
        attendees: ['nurse.brown@example.com'],
      });
    });
  });

  describe('Appointment Update with Calendar Sync', () => {
    it('should update appointment and sync calendar changes', async () => {
      const appointmentId = 'appointment-303';
      const existingAppointment = {
        id: appointmentId,
        patient_id: 'patient-303',
        appointment_type: 'home_visit',
        appointment_date: '2024-01-20',
        start_time: '10:00',
        end_time: '11:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Original notes',
        address: '303 Downtown, Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        google_maps_link: 'https://maps.google.com/303',
        is_recurring: false,
        recurring_rule: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const updates = {
        appointment_date: '2024-01-21',
        start_time: '14:00',
        end_time: '15:00',
        notes: 'Updated notes - rescheduled',
      };

      const updatedAppointment = {
        ...existingAppointment,
        ...updates,
        updated_at: '2024-01-01T11:00:00Z',
      };

      const staffAssignments = [
        {
          id: 'assignment-6',
          role: 'primary',
          is_primary: true,
          staff: {
            id: 'staff-6',
            first_name: 'Dr. James',
            last_name: 'Taylor',
            staff_type: 'Doctor',
            specialization: 'Orthopedics',
            phone: '+971501234577',
            email: 'james.taylor@example.com',
            google_calendar_id: 'orthopedics-calendar@group.calendar.google.com',
          },
        },
      ];

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingAppointment,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({
            data: updatedAppointment,
            error: null,
          }),
        })),
      });

      // Mock staff assignments
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue(staffAssignments);

      // Mock calendar service
      mockGoogleCalendarService.deleteEvent.mockResolvedValue({ success: true });
      mockGoogleCalendarService.createEvent.mockResolvedValue({
        success: true,
        eventId: 'event-789',
        eventUrl: 'https://calendar.google.com/event?eid=event-789',
      });

      // Update appointment
      const result = await appointmentService.updateAppointment(appointmentId, updates);

      // Verify appointment update succeeded
      expect(result).toEqual(updatedAppointment);

      // Verify calendar events were updated (delete and recreate)
      expect(mockGoogleCalendarService.deleteEvent).toHaveBeenCalled();
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledWith({
        staff_id: 'staff-6',
        google_calendar_id: 'orthopedics-calendar@group.calendar.google.com',
        event_title: expect.stringContaining('Home Visit'),
        event_description: expect.stringContaining('Updated notes - rescheduled'),
        start_time: expect.stringContaining('2024-01-21T14:00:00'),
        end_time: expect.stringContaining('2024-01-21T15:00:00'),
        location: '303 Downtown, Dubai',
        attendees: ['james.taylor@example.com'],
      });
    });
  });

  describe('Appointment Deletion with Calendar Cleanup', () => {
    it('should delete appointment and clean up calendar events', async () => {
      const appointmentId = 'appointment-404';
      const existingAppointment = {
        id: appointmentId,
        patient_id: 'patient-404',
        appointment_type: 'consultation',
        appointment_date: '2024-01-22',
        start_time: '16:00',
        end_time: '17:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Cancelled appointment',
        address: '404 Business Bay, Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        google_maps_link: 'https://maps.google.com/404',
        is_recurring: false,
        recurring_rule: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const staffAssignments = [
        {
          id: 'assignment-7',
          role: 'primary',
          is_primary: true,
          staff: {
            id: 'staff-7',
            first_name: 'Dr. Lisa',
            last_name: 'Anderson',
            staff_type: 'Doctor',
            specialization: 'Neurology',
            phone: '+971501234578',
            email: 'lisa.anderson@example.com',
            google_calendar_id: 'neurology-calendar@group.calendar.google.com',
          },
        },
      ];

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: existingAppointment,
              error: null,
            }),
          })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      // Mock staff assignments
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue(staffAssignments);

      // Mock calendar service
      mockGoogleCalendarService.deleteEvent.mockResolvedValue({ success: true });

      // Mock notification service
      mockTelegramNotificationService.sendAppointmentNotificationsToStaff.mockResolvedValue({
        success: true,
        results: [{ staff_id: 'staff-7', success: true }],
      });

      // Delete appointment
      await appointmentService.deleteAppointment(appointmentId);

      // Verify appointment deletion
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments');

      // Verify calendar events were cleaned up
      expect(mockGoogleCalendarService.deleteEvent).toHaveBeenCalled();

      // Verify notifications were sent
      expect(mockTelegramNotificationService.sendAppointmentNotificationsToStaff).toHaveBeenCalledWith(
        existingAppointment,
        staffAssignments,
        'cancelled'
      );

      // Verify calendar operation logging
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: 'staff-7',
        operationType: 'delete_event',
        operationStatus: 'success',
        appointmentId: appointmentId,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle staff assignment service errors', async () => {
      const appointmentData = {
        id: 'appointment-505',
        patient_id: 'patient-505',
        appointment_type: 'home_visit',
        appointment_date: '2024-01-23',
        start_time: '09:00',
        end_time: '10:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Test appointment',
        address: '505 JLT, Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        google_maps_link: 'https://maps.google.com/505',
        is_recurring: false,
        recurring_rule: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const createdAppointment = {
        ...appointmentData,
        patient: {
          id: 'patient-505',
          name: 'Test Patient',
          phone: '+971501234579',
          flat_villa_no: '505',
          building_street: 'JLT',
          area: 'JLT',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          google_maps_link: 'https://maps.google.com/505',
        },
        appointment_staff: [],
      };

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdAppointment,
              error: null,
            }),
          })),
        })),
      });

      // Mock staff assignment service error
      mockAppointmentStaffService.getStaffForAppointment.mockRejectedValue(
        new Error('Staff assignment service unavailable')
      );

      // Create appointment - should succeed even if staff assignment service fails
      const result = await appointmentService.createAppointment(appointmentData);

      // Verify appointment creation succeeded
      expect(result).toEqual(createdAppointment);

      // Verify calendar services were not called due to staff assignment error
      expect(mockGoogleCalendarService.createEvent).not.toHaveBeenCalled();
    });

    it('should handle mixed calendar sync success and failure', async () => {
      const appointmentData = {
        id: 'appointment-606',
        patient_id: 'patient-606',
        appointment_type: 'home_visit',
        appointment_date: '2024-01-24',
        start_time: '13:00',
        end_time: '14:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Mixed success test',
        address: '606 DIFC, Dubai',
        latitude: 25.2048,
        longitude: 55.2708,
        google_maps_link: 'https://maps.google.com/606',
        is_recurring: false,
        recurring_rule: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const createdAppointment = {
        ...appointmentData,
        patient: {
          id: 'patient-606',
          name: 'Mixed Test Patient',
          phone: '+971501234580',
          flat_villa_no: '606',
          building_street: 'DIFC',
          area: 'DIFC',
          city: 'Dubai',
          latitude: 25.2048,
          longitude: 55.2708,
          google_maps_link: 'https://maps.google.com/606',
        },
        appointment_staff: [],
      };

      const staffAssignments = [
        {
          id: 'assignment-8',
          role: 'primary',
          is_primary: true,
          staff: {
            id: 'staff-8',
            first_name: 'Dr. Success',
            last_name: 'Doctor',
            staff_type: 'Doctor',
            specialization: 'General Medicine',
            phone: '+971501234581',
            email: 'success.doctor@example.com',
            google_calendar_id: 'success-calendar@group.calendar.google.com',
          },
        },
        {
          id: 'assignment-9',
          role: 'assistant',
          is_primary: false,
          staff: {
            id: 'staff-9',
            first_name: 'Dr. Failure',
            last_name: 'Doctor',
            staff_type: 'Doctor',
            specialization: 'General Medicine',
            phone: '+971501234582',
            email: 'failure.doctor@example.com',
            google_calendar_id: 'failure-calendar@group.calendar.google.com',
          },
        },
      ];

      // Mock database operations
      mockSupabase.from.mockReturnValue({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: createdAppointment,
              error: null,
            }),
          })),
        })),
      });

      // Mock staff assignments
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue(staffAssignments);

      // Mock mixed calendar service responses
      mockGoogleCalendarService.createEvent
        .mockResolvedValueOnce({
          success: true,
          eventId: 'event-success',
          eventUrl: 'https://calendar.google.com/event?eid=event-success',
        })
        .mockResolvedValueOnce({
          success: false,
          errorCode: 'PERMISSION_DENIED',
          errorMessage: 'Failed to create event',
        });

      // Mock notification service
      mockTelegramNotificationService.sendAppointmentNotificationsToStaff.mockResolvedValue({
        success: true,
        results: [
          { staff_id: 'staff-8', success: true },
          { staff_id: 'staff-9', success: true },
        ],
      });

      // Create appointment
      const result = await appointmentService.createAppointment(appointmentData);

      // Verify appointment creation succeeded
      expect(result).toEqual(createdAppointment);

      // Verify both calendar events were attempted
      expect(mockGoogleCalendarService.createEvent).toHaveBeenCalledTimes(2);

      // Verify success logging
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: 'staff-8',
        operationType: 'create_event',
        operationStatus: 'success',
        appointmentId: 'appointment-606',
        googleEventId: 'event-success',
      });

      // Verify failure logging
      expect(logCalendarOperation).toHaveBeenCalledWith({
        staffId: 'staff-9',
        operationType: 'create_event',
        operationStatus: 'failed',
        appointmentId: 'appointment-606',
        errorCode: 'PERMISSION_DENIED',
        errorMessage: 'Failed to create event',
      });
    });
  });
});
