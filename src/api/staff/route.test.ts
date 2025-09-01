import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { staffService } from '@/services/staffService';
import { googleCalendarService } from '@/services/googleCalendarService';

// Mock the services
jest.mock('@/services/staffService');
jest.mock('@/services/googleCalendarService');

const mockStaffService = staffService as jest.Mocked<typeof staffService>;
const mockGoogleCalendarService = googleCalendarService as jest.Mocked<typeof googleCalendarService>;

describe('Staff API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/staff', () => {
    it('should return all staff without filters', async () => {
      const mockStaff = [
        {
          id: '1',
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
        },
      ];

      mockStaffService.getStaff.mockResolvedValue(mockStaff);

      const request = new NextRequest('http://localhost:3000/api/staff');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaff);
      expect(mockStaffService.getStaff).toHaveBeenCalledWith({});
    });

    it('should return filtered staff', async () => {
      const mockStaff = [
        {
          id: '1',
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
        },
      ];

      mockStaffService.getStaff.mockResolvedValue(mockStaff);

      const request = new NextRequest(
        'http://localhost:3000/api/staff?first_name=John&staff_type=doctor&status=active&has_google_calendar=true'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaff);
      expect(mockStaffService.getStaff).toHaveBeenCalledWith({
        first_name: 'John',
        staff_type: 'doctor',
        status: 'active',
        has_google_calendar: true,
      });
    });

    it('should handle errors', async () => {
      mockStaffService.getStaff.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/staff');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/staff', () => {
    it('should create a staff member without Google Calendar ID', async () => {
      const mockStaff = {
        id: '1',
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

      mockStaffService.createStaff.mockResolvedValue(mockStaff);

      const request = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: 'John',
          last_name: 'Doe',
          staff_type: 'doctor',
          specialization: 'Cardiology',
          phone: '+971501234567',
          email: 'john.doe@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaff);
      expect(mockStaffService.createStaff).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        staff_type: 'doctor',
        specialization: 'Cardiology',
        phone: '+971501234567',
        email: 'john.doe@example.com',
        available_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        status: 'active',
        email_notifications_enabled: true,
      });
    });

    it('should create a staff member with valid Google Calendar ID', async () => {
      const mockStaff = {
        id: '1',
        first_name: 'John',
        last_name: 'Doe',
        staff_type: 'doctor' as const,
        specialization: 'Cardiology',
        phone: '+971501234567',
        email: 'john.doe@example.com',
        google_calendar_id: 'john.doe@example.com',
        available_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        status: 'active' as const,
        email_notifications_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockStaffService.createStaff.mockResolvedValue(mockStaff);
      mockGoogleCalendarService.validateCalendarId.mockReturnValue(true);
      mockGoogleCalendarService.testCalendarConnection.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: 'John',
          last_name: 'Doe',
          staff_type: 'doctor',
          specialization: 'Cardiology',
          phone: '+971501234567',
          email: 'john.doe@example.com',
          google_calendar_id: 'john.doe@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaff);
      expect(mockGoogleCalendarService.validateCalendarId).toHaveBeenCalledWith('john.doe@example.com');
      expect(mockGoogleCalendarService.testCalendarConnection).toHaveBeenCalledWith('john.doe@example.com');
    });

    it('should reject invalid Google Calendar ID format', async () => {
      mockGoogleCalendarService.validateCalendarId.mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: 'John',
          last_name: 'Doe',
          staff_type: 'doctor',
          specialization: 'Cardiology',
          phone: '+971501234567',
          email: 'john.doe@example.com',
          google_calendar_id: 'invalid-calendar-id',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid Google Calendar ID format');
    });

    it('should reject Google Calendar ID that cannot be connected', async () => {
      mockGoogleCalendarService.validateCalendarId.mockReturnValue(true);
      mockGoogleCalendarService.testCalendarConnection.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: 'John',
          last_name: 'Doe',
          staff_type: 'doctor',
          specialization: 'Cardiology',
          phone: '+971501234567',
          email: 'john.doe@example.com',
          google_calendar_id: 'john.doe@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unable to connect to Google Calendar. Please check the calendar ID and permissions.');
    });

    it('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: '', // Invalid: empty name
          last_name: 'Doe',
          staff_type: 'doctor',
          phone: '+971501234567',
          email: 'invalid-email', // Invalid email
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('First name is required');
      expect(data.details).toContain('Invalid email format');
    });

    it('should handle service errors', async () => {
      mockStaffService.createStaff.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: 'John',
          last_name: 'Doe',
          staff_type: 'doctor',
          phone: '+971501234567',
          email: 'john.doe@example.com',
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
