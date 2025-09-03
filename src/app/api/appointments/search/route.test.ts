import { appointmentService } from '@/services/appointmentService';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the services
jest.mock('@/services/appointmentService');

const mockAppointmentService = appointmentService as jest.Mocked<typeof appointmentService>;

describe('Appointment Search API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/appointments/search', () => {
    it('should return search results with patient_id parameter', async () => {
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
        {
          id: '2',
          patient_id: 'patient-1',
          appointment_type: 'lab_test' as const,
          appointment_date: '2024-01-16',
          start_time: '14:00',
          duration_minutes: 30,
          status: 'scheduled' as const,
          custom_fields: {},
          transportation_type: 'self_transport' as const,
          transportation_method: 'Taxi',
          notes: 'Blood test',
          recurring_rule: null,
          google_event_ids: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockAppointmentService.getAppointmentsByPatient.mockResolvedValue(mockAppointments);

      const request = new NextRequest('http://localhost:3000/api/appointments/search?patient_id=patient-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAppointments);
      expect(mockAppointmentService.getAppointmentsByPatient).toHaveBeenCalledWith('patient-1');
    });

    it('should return empty results when no query provided', async () => {
      mockAppointmentService.getAppointments.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/appointments/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(mockAppointmentService.getAppointments).toHaveBeenCalledWith({});
    });

    it('should handle search by appointment type', async () => {
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

      mockAppointmentService.getAppointmentsByType.mockResolvedValue(mockAppointments);

      const request = new NextRequest('http://localhost:3000/api/appointments/search?appointment_type=doctor_on_call');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAppointments);
      expect(mockAppointmentService.getAppointmentsByType).toHaveBeenCalledWith('doctor_on_call');
    });

    it('should handle search by status', async () => {
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

      mockAppointmentService.getAppointmentsByStatus.mockResolvedValue(mockAppointments);

      const request = new NextRequest('http://localhost:3000/api/appointments/search?status=scheduled');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAppointments);
      expect(mockAppointmentService.getAppointmentsByStatus).toHaveBeenCalledWith('scheduled');
    });

    it('should handle search by date range', async () => {
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

      mockAppointmentService.getAppointmentsByDateRange.mockResolvedValue(mockAppointments);

      const request = new NextRequest('http://localhost:3000/api/appointments/search?date_from=2024-01-01&date_to=2024-01-31');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAppointments);
      expect(mockAppointmentService.getAppointmentsByDateRange).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
    });

    it('should handle service errors', async () => {
      mockAppointmentService.getAppointments.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/appointments/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle empty search results', async () => {
      mockAppointmentService.getAppointments.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/appointments/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should handle search by driver', async () => {
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

      mockAppointmentService.getAppointmentsByDriver.mockResolvedValue(mockAppointments);

      const request = new NextRequest('http://localhost:3000/api/appointments/search?driver_id=driver-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAppointments);
      expect(mockAppointmentService.getAppointmentsByDriver).toHaveBeenCalledWith('driver-1');
    });

    it('should handle search for recurring appointments', async () => {
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
          recurring_rule: { frequency: 'weekly', interval: 1 },
          google_event_ids: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockAppointmentService.getRecurringAppointments.mockResolvedValue(mockAppointments);

      const request = new NextRequest('http://localhost:3000/api/appointments/search?has_recurring_rule=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAppointments);
      expect(mockAppointmentService.getRecurringAppointments).toHaveBeenCalledWith();
    });
  });
});
