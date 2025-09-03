import { patientService } from '@/services/patientService';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the services
jest.mock('@/services/patientService');

const mockPatientService = patientService as jest.Mocked<typeof patientService>;

describe('Patient Search API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/patients/search', () => {
    it('should return search results with query parameter', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: '123',
          building_street: 'Main St',
          area: 'Dubai Marina',
          city: 'Dubai',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'John Smith',
          phone: '+971501234568',
          flat_villa_no: '456',
          building_street: 'Second St',
          area: 'Jumeirah',
          city: 'Dubai',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPatientService.searchPatients.mockResolvedValue(mockPatients);

      const request = new NextRequest('http://localhost:3000/api/patients/search?q=John');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPatients);
      expect(mockPatientService.searchPatients).toHaveBeenCalledWith('John');
    });

    it('should return empty results when no query provided', async () => {
      mockPatientService.getPatients.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/patients/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(mockPatientService.getPatients).toHaveBeenCalledWith({});
    });

    it('should handle search with special characters', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'Ahmed Al-Rashid',
          phone: '+971501234567',
          flat_villa_no: '123',
          building_street: 'Main St',
          area: 'Dubai Marina',
          city: 'Dubai',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPatientService.searchPatients.mockResolvedValue(mockPatients);

      const request = new NextRequest('http://localhost:3000/api/patients/search?q=Ahmed%20Al-Rashid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPatients);
      expect(mockPatientService.searchPatients).toHaveBeenCalledWith('Ahmed Al-Rashid');
    });

    it('should handle service errors', async () => {
      mockPatientService.searchPatients.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/patients/search?q=John');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle empty search results', async () => {
      mockPatientService.searchPatients.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/patients/search?q=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.count).toBe(0);
    });

    it('should handle very long search queries', async () => {
      const longQuery = 'a'.repeat(1000);
      mockPatientService.searchPatients.mockResolvedValue([]);

      const request = new NextRequest(`http://localhost:3000/api/patients/search?q=${encodeURIComponent(longQuery)}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPatientService.searchPatients).toHaveBeenCalledWith(longQuery);
    });

    it('should handle search with phone number format', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: '123',
          building_street: 'Main St',
          area: 'Dubai Marina',
          city: 'Dubai',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPatientService.searchPatients.mockResolvedValue(mockPatients);

      const request = new NextRequest('http://localhost:3000/api/patients/search?q=%2B971501234567');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPatients);
      expect(mockPatientService.searchPatients).toHaveBeenCalledWith('+971501234567');
    });
  });
});
