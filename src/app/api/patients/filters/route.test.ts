import { patientService } from '@/services/patientService';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the services
jest.mock('@/services/patientService');

const mockPatientService = patientService as jest.Mocked<typeof patientService>;

describe('Patient Filters API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/patients/filters', () => {
    it('should return all filter options when no type specified', async () => {
      const mockAreas = ['Dubai Marina', 'Jumeirah', 'Downtown', 'Business Bay'];
      const mockCities = ['Dubai', 'Abu Dhabi', 'Sharjah'];
      const mockFilterOptions = {
        areas: mockAreas,
        cities: mockCities,
      };

      mockPatientService.getAreas.mockResolvedValue(mockAreas);
      mockPatientService.getCities.mockResolvedValue(mockCities);

      const request = new NextRequest('http://localhost:3000/api/patients/filters');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockFilterOptions);
      expect(mockPatientService.getAreas).toHaveBeenCalledWith();
      expect(mockPatientService.getCities).toHaveBeenCalledWith();
    });

    it('should return cities filter options when type is cities', async () => {
      const mockCities = ['Dubai', 'Abu Dhabi', 'Sharjah'];

      mockPatientService.getCities.mockResolvedValue(mockCities);

      const request = new NextRequest('http://localhost:3000/api/patients/filters?type=cities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCities);
      expect(mockPatientService.getCities).toHaveBeenCalledWith();
    });

    it('should return areas filter options when type is areas', async () => {
      const mockAreas = ['Dubai Marina', 'Jumeirah', 'Downtown', 'Business Bay'];

      mockPatientService.getAreas.mockResolvedValue(mockAreas);

      const request = new NextRequest('http://localhost:3000/api/patients/filters?type=areas');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAreas);
      expect(mockPatientService.getAreas).toHaveBeenCalledWith();
    });

    it('should handle invalid filter type gracefully', async () => {
      const mockAreas = ['Dubai Marina', 'Jumeirah', 'Downtown', 'Business Bay'];
      const mockCities = ['Dubai', 'Abu Dhabi', 'Sharjah'];
      const mockFilterOptions = {
        areas: mockAreas,
        cities: mockCities,
      };

      mockPatientService.getAreas.mockResolvedValue(mockAreas);
      mockPatientService.getCities.mockResolvedValue(mockCities);

      const request = new NextRequest('http://localhost:3000/api/patients/filters?type=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockFilterOptions);
    });

    it('should handle service errors', async () => {
      mockPatientService.getAreas.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/patients/filters');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should return empty arrays when no data available', async () => {
      mockPatientService.getCities.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/patients/filters?type=cities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });
  });
});
