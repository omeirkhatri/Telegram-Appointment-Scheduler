import { staffService } from '@/services/staffService';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the services
jest.mock('@/services/staffService');

const mockStaffService = staffService as jest.Mocked<typeof staffService>;

describe('Staff Search API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/staff/search', () => {
    it('should return search results with query parameter', async () => {
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
        {
          id: '2',
          first_name: 'John',
          last_name: 'Smith',
          staff_type: 'nurse' as const,
          specialization: 'General',
          phone: '+971501234568',
          email: 'john.smith@example.com',
          available_days: [1, 2, 3, 4, 5, 6],
          working_hours_start: '08:00',
          working_hours_end: '16:00',
          status: 'active' as const,
          email_notifications_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockStaffService.searchStaff.mockResolvedValue(mockStaff);

      const request = new NextRequest('http://localhost:3000/api/staff/search?q=John');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaff);
      expect(mockStaffService.searchStaff).toHaveBeenCalledWith('John');
    });

    it('should return empty results when no query provided', async () => {
      mockStaffService.getStaff.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/staff/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(mockStaffService.getStaff).toHaveBeenCalledWith({});
    });

    it('should handle search by staff type', async () => {
      const mockStaff = [
        {
          id: '1',
          first_name: 'Dr. Ahmed',
          last_name: 'Hassan',
          staff_type: 'doctor' as const,
          specialization: 'Cardiology',
          phone: '+971501234567',
          email: 'ahmed@example.com',
          available_days: [1, 2, 3, 4, 5],
          working_hours_start: '09:00',
          working_hours_end: '17:00',
          status: 'active' as const,
          email_notifications_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockStaffService.searchStaff.mockResolvedValue(mockStaff);

      const request = new NextRequest('http://localhost:3000/api/staff/search?q=doctor');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaff);
      expect(mockStaffService.searchStaff).toHaveBeenCalledWith('doctor');
    });

    it('should handle search by specialization', async () => {
      const mockStaff = [
        {
          id: '1',
          first_name: 'Dr. Sarah',
          last_name: 'Wilson',
          staff_type: 'doctor' as const,
          specialization: 'Pediatrics',
          phone: '+971501234567',
          email: 'sarah@example.com',
          available_days: [1, 2, 3, 4, 5],
          working_hours_start: '09:00',
          working_hours_end: '17:00',
          status: 'active' as const,
          email_notifications_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockStaffService.searchStaff.mockResolvedValue(mockStaff);

      const request = new NextRequest('http://localhost:3000/api/staff/search?q=Pediatrics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaff);
      expect(mockStaffService.searchStaff).toHaveBeenCalledWith('Pediatrics');
    });

    it('should handle service errors', async () => {
      mockStaffService.searchStaff.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/staff/search?q=John');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle empty search results', async () => {
      mockStaffService.searchStaff.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/staff/search?q=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should handle search with email format', async () => {
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

      mockStaffService.searchStaff.mockResolvedValue(mockStaff);

      const request = new NextRequest('http://localhost:3000/api/staff/search?q=john.doe%40example.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaff);
      expect(mockStaffService.searchStaff).toHaveBeenCalledWith('john.doe@example.com');
    });

    it('should handle search with phone number format', async () => {
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

      mockStaffService.searchStaff.mockResolvedValue(mockStaff);

      const request = new NextRequest('http://localhost:3000/api/staff/search?q=%2B971501234567');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaff);
      expect(mockStaffService.searchStaff).toHaveBeenCalledWith('+971501234567');
    });
  });
});
