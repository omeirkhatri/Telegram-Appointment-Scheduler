import { transportationSegmentService } from '@/services/transportationSegmentService';
import type { CreateTransportationSegment } from '@/types/transportationSegment';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock the transportation segment service
jest.mock('@/services/transportationSegmentService', () => ({
  transportationSegmentService: {
    getTransportationSegments: jest.fn(),
    createTransportationSegment: jest.fn(),
  },
}));

// Mock the backward compatibility utilities
jest.mock('@/utils/transportationSegmentsBackwardCompatibility', () => ({
  hasLegacyFields: jest.fn(),
  logLegacyFieldWarning: jest.fn(),
}));

// Mock the validation functions
jest.mock('@/types/transportationSegment', () => ({
  ...jest.requireActual('@/types/transportationSegment'),
  isValidPickupLocationType: jest.fn(),
  requiresPickupLocationReference: jest.fn(),
}));

describe('/api/transportation-segments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should fetch transportation segments with no filters', async () => {
      const mockSegments = [
        {
          id: 'segment-1',
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: 'Test Segment',
          pickup_location_type: 'office',
          status: 'scheduled',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
      ];

      (transportationSegmentService.getTransportationSegments as jest.Mock).mockResolvedValue(mockSegments);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSegments);
      expect(data.count).toBe(1);
      expect(transportationSegmentService.getTransportationSegments).toHaveBeenCalledWith({});
    });

    it('should fetch transportation segments with filters', async () => {
      const mockSegments = [
        {
          id: 'segment-1',
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: 'Test Segment',
          pickup_location_type: 'office',
          status: 'scheduled',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
      ];

      (transportationSegmentService.getTransportationSegments as jest.Mock).mockResolvedValue(mockSegments);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments?appointment_id=appointment-1&driver_id=driver-1&segment_type=pickup&status=scheduled&requires_follow_up=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSegments);
      expect(transportationSegmentService.getTransportationSegments).toHaveBeenCalledWith({
        appointment_id: 'appointment-1',
        driver_id: 'driver-1',
        segment_type: 'pickup',
        status: 'scheduled',
        requires_follow_up: true,
      });
    });

    it('should handle service errors', async () => {
      (transportationSegmentService.getTransportationSegments as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/transportation-segments');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle unknown errors', async () => {
      (transportationSegmentService.getTransportationSegments as jest.Mock).mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/transportation-segments');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch transportation segments');
    });
  });

  describe('POST', () => {
    const mockSegmentData: CreateTransportationSegment = {
      appointment_id: 'appointment-1',
      segment_type: 'pickup',
      title: 'Test Segment',
      pickup_location_type: 'office',
      status: 'draft',
    };

    const mockCreatedSegment = {
      id: 'segment-1',
      ...mockSegmentData,
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T09:00:00Z',
    };

    it('should create transportation segment successfully', async () => {
      (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(mockCreatedSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(mockSegmentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCreatedSegment);
      expect(data.message).toBe('Transportation segment created successfully');
      expect(transportationSegmentService.createTransportationSegment).toHaveBeenCalledWith(mockSegmentData);
    });

    it('should handle legacy field warnings', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyData = {
        ...mockSegmentData,
        origin: { address: '123 Old St' },
        destination: { address: '456 New St' },
      };

      (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(mockCreatedSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(legacyData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(hasLegacyFields).toHaveBeenCalledWith(legacyData);
      expect(logLegacyFieldWarning).toHaveBeenCalledWith(['origin', 'destination']);
    });

    it('should handle validation errors', async () => {
      const { validateSegmentData } = require('./route');
      const validationErrors = ['Invalid pickup location type', 'Missing required field'];

      // Mock the validation function
      jest.doMock('./route', () => ({
        ...jest.requireActual('./route'),
        validateSegmentData: jest.fn().mockReturnValue(validationErrors),
      }));

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(mockSegmentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toEqual(validationErrors);
    });

    it('should handle service creation errors', async () => {
      (transportationSegmentService.createTransportationSegment as jest.Mock).mockRejectedValue(
        new Error('Creation failed')
      );

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(mockSegmentData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Creation failed');
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON');
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        segment_type: 'pickup',
        pickup_location_type: 'office',
      };

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    it('should support backward compatibility with old field names', async () => {
      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Test Segment',
        pickup_location_type: 'custom',
        origin: { address: '123 Old St', lat: 40.7128, lng: -74.0060 },
        destination: { address: '456 New St', lat: 40.7589, lng: -73.9851 },
      };

      const expectedData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Test Segment',
        pickup_location_type: 'custom',
        pickup_location: { address: '123 Old St', lat: 40.7128, lng: -74.0060 },
        patient_location: { address: '456 New St', lat: 40.7589, lng: -73.9851 },
      };

      (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(mockCreatedSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(legacyData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(transportationSegmentService.createTransportationSegment).toHaveBeenCalledWith(
        expect.objectContaining(expectedData)
      );
    });
  });
});

