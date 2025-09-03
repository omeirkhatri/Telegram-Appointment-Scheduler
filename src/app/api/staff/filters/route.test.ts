import { staffService } from '@/services/staffService';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the services
jest.mock('@/services/staffService');

const mockStaffService = staffService as jest.Mocked<typeof staffService>;

describe('Staff Filters API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/staff/filters', () => {
    it('should return all filter options when no type specified', async () => {
      const mockFilterOptions = {
        staff_types: ['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician'],
        statuses: ['active', 'inactive'],
      };

      mockStaffService.getStaffTypes.mockResolvedValue(['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician']);

      const request = new NextRequest('http://localhost:3000/api/staff/filters');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockFilterOptions);
      expect(mockStaffService.getStaffTypes).toHaveBeenCalledWith();
    });

    it('should return staff types when type is staff_types', async () => {
      const mockStaffTypes = ['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician'];

      mockStaffService.getStaffTypes.mockResolvedValue(mockStaffTypes);

      const request = new NextRequest('http://localhost:3000/api/staff/filters?type=staff_types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStaffTypes);
      expect(mockStaffService.getStaffTypes).toHaveBeenCalledWith();
    });

    it('should return statuses when type is statuses', async () => {
      const mockStaffTypes = ['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician'];
      const mockStatuses = ['active', 'inactive'];
      const expectedData = {
        staff_types: mockStaffTypes,
        statuses: mockStatuses,
      };

      mockStaffService.getStaffTypes.mockResolvedValue(mockStaffTypes);

      const request = new NextRequest('http://localhost:3000/api/staff/filters?type=statuses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expectedData);
    });

    it('should handle invalid filter type gracefully', async () => {
      const mockStaffTypes = ['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician'];
      const mockStatuses = ['active', 'inactive'];
      const expectedData = {
        staff_types: mockStaffTypes,
        statuses: mockStatuses,
      };

      mockStaffService.getStaffTypes.mockResolvedValue(mockStaffTypes);

      const request = new NextRequest('http://localhost:3000/api/staff/filters?type=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(expectedData);
    });

    it('should handle service errors', async () => {
      mockStaffService.getStaffTypes.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/staff/filters');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should return empty arrays when no data available', async () => {
      mockStaffService.getStaffTypes.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/staff/filters?type=staff_types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });
  });
});
