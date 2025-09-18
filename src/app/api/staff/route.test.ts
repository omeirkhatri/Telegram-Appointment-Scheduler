import { staffService } from '@/services/staffService';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock the services
jest.mock('@/services/staffService');

const mockStaffService = staffService as jest.Mocked<typeof staffService>;

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
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockStaffService.getStaff.mockResolvedValue(mockStaff);

      const request = new NextRequest(
        'http://localhost:3000/api/staff?first_name=John&staff_type=doctor&status=active',
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
    it('should create a staff member', async () => {
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
    });

    it('should return validation errors when required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: '',
          last_name: '',
          staff_type: '',
          phone: '',
          email: 'invalid-email',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(Array.isArray(data.details)).toBe(true);
    });

    it('should handle errors when creating staff member', async () => {
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
          specialization: 'Cardiology',
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
