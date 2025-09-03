import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { googleCalendarService } from '@/services/googleCalendarService';
import { staffService } from '@/services/staffService';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock the services
jest.mock('@/services/appointmentService');
jest.mock('@/services/appointmentStaffService');
jest.mock('@/services/staffService');
jest.mock('@/services/googleCalendarService');

const mockAppointmentService = appointmentService as jest.Mocked<typeof appointmentService>;
const mockAppointmentStaffService = appointmentStaffService as jest.Mocked<typeof appointmentStaffService>;
const mockStaffService = staffService as jest.Mocked<typeof staffService>;
const mockGoogleCalendarService = googleCalendarService as jest.Mocked<typeof googleCalendarService>;

describe('Appointment API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/appointments', () => {
    it('should return all appointments without filters', async () => {
      const mockAppointments = [
        {
          id: '1',
          patient_id: 'patient-1',
          appointment_type: 'doctor_on_call' as const,
          appointment_date: '2024-01-15',
          start_time: '10:00',
          duration_minutes: 60,
          status: 'scheduled' as const,
          custom_fields: {},
          transportation_type: 'driver' as const,
          driver_id: 'driver-1',
          notes: 'Regular checkup',
          recurring_rule: null,
          google_event_ids: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockAppointmentService.getAppointments.mockResolvedValue(mockAppointments);

      const request = new NextRequest('http://localhost:3000/api/appointments');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAppointments);
      expect(mockAppointmentService.getAppointments).toHaveBeenCalledWith({});
    });

    it('should return filtered appointments', async () => {
      const mockAppointments = [
        {
          id: '1',
          patient_id: 'patient-1',
          appointment_type: 'doctor_on_call' as const,
          appointment_date: '2024-01-15',
          start_time: '10:00',
          duration_minutes: 60,
          status: 'scheduled' as const,
          custom_fields: {},
          transportation_type: 'driver' as const,
          driver_id: 'driver-1',
          notes: 'Regular checkup',
          recurring_rule: null,
          google_event_ids: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockAppointmentService.getAppointments.mockResolvedValue(mockAppointments);

      const request = new NextRequest(
        'http://localhost:3000/api/appointments?patient_id=patient-1&appointment_type=doctor_on_call&status=scheduled&date_from=2024-01-01&date_to=2024-01-31',
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAppointments);
      expect(mockAppointmentService.getAppointments).toHaveBeenCalledWith({
        patient_id: 'patient-1',
        appointment_type: 'doctor_on_call',
        status: 'scheduled',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      });
    });

    it('should handle errors', async () => {
      mockAppointmentService.getAppointments.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/appointments');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/appointments', () => {
    it('should create an appointment without staff assignments', async () => {
      const mockAppointment = {
        id: '1',
        patient_id: 'patient-1',
        appointment_type: 'doctor_on_call' as const,
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 60,
        status: 'scheduled' as const,
        custom_fields: {},
        transportation_type: 'driver' as const,
        driver_id: 'driver-1',
        notes: 'Regular checkup',
        recurring_rule: null,
        google_event_ids: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAppointmentService.createAppointment.mockResolvedValue(mockAppointment);
      mockAppointmentService.getAppointment.mockResolvedValue(mockAppointment);
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: 'patient-1',
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '10:00',
          duration_minutes: 60,
          transportation_type: 'driver',
          driver_id: 'driver-1',
          notes: 'Regular checkup',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.appointment).toEqual(mockAppointment);
      expect(data.data.staff_assignments).toEqual([]);
    });

    it('should create an appointment with staff assignments', async () => {
      const mockAppointment = {
        id: '1',
        patient_id: 'patient-1',
        appointment_type: 'doctor_on_call' as const,
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 60,
        status: 'scheduled' as const,
        custom_fields: {},
        transportation_type: 'driver' as const,
        driver_id: 'driver-1',
        notes: 'Regular checkup',
        recurring_rule: null,
        google_event_ids: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockStaff = {
        id: 'staff-1',
        first_name: 'John',
        last_name: 'Doe',
        staff_type: 'doctor' as const,
        specialization: 'Cardiology',
        phone: '+971501234567',
        email: 'john.doe@example.com',
        available_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        status: 'active' as const,
        email_notifications_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockStaffAssignment = {
        id: 'assignment-1',
        appointment_id: '1',
        staff_id: 'staff-1',
        role: 'primary' as const,
        is_primary: true,
        google_event_id: 'event-1',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockAppointmentService.createAppointment.mockResolvedValue(mockAppointment);
      mockAppointmentService.getAppointment.mockResolvedValue(mockAppointment);
      mockStaffService.getStaffMember.mockResolvedValue(mockStaff);
      mockGoogleCalendarService.checkStaffAvailability.mockResolvedValue(true);
      mockAppointmentStaffService.assignStaffToAppointment.mockResolvedValue([mockStaffAssignment]);
      mockAppointmentStaffService.getStaffForAppointment.mockResolvedValue([mockStaffAssignment]);

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: 'patient-1',
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '10:00',
          duration_minutes: 60,
          transportation_type: 'driver',
          driver_id: 'driver-1',
          notes: 'Regular checkup',
          staff_assignments: [
            {
              staff_id: 'staff-1',
              role: 'primary',
              is_primary: true,
            },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.appointment).toEqual(mockAppointment);
      expect(data.data.staff_assignments).toEqual([mockStaffAssignment]);
    });

    it('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: '', // Invalid: empty patient ID
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '10:00',
          duration_minutes: 60,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Patient ID is required');
    });

    it('should handle staff assignment validation errors', async () => {
      const mockAppointment = {
        id: '1',
        patient_id: 'patient-1',
        appointment_type: 'doctor_on_call' as const,
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 60,
        status: 'scheduled' as const,
        custom_fields: {},
        transportation_type: 'driver' as const,
        driver_id: 'driver-1',
        notes: 'Regular checkup',
        recurring_rule: null,
        google_event_ids: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockAppointmentService.createAppointment.mockResolvedValue(mockAppointment);
      mockStaffService.getStaffMember.mockResolvedValue(null); // Staff not found

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: 'patient-1',
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '10:00',
          duration_minutes: 60,
          staff_assignments: [
            {
              staff_id: 'invalid-staff-id',
              role: 'primary',
              is_primary: true,
            },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Staff assignment validation failed');
      expect(data.details).toContain('Staff member with ID invalid-staff-id not found');
    });

    it('should handle service errors', async () => {
      mockAppointmentService.createAppointment.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: 'patient-1',
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '10:00',
          duration_minutes: 60,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });
});
