import { DELETE, GET as GET_BY_ID, PUT } from '@/app/api/transportation-segments/[id]/route';
import { POST as CALCULATE_ROUTE } from '@/app/api/transportation-segments/calculate-route/route';
import { GET, POST } from '@/app/api/transportation-segments/route';
import { transportationSegmentService } from '@/services/transportationSegmentService';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { performance } from 'perf_hooks';

// Mock the transportation segment service
jest.mock('@/services/transportationSegmentService', () => ({
  transportationSegmentService: {
    getTransportationSegments: jest.fn(),
    getTransportationSegment: jest.fn(),
    createTransportationSegment: jest.fn(),
    updateTransportationSegment: jest.fn(),
    deleteTransportationSegment: jest.fn(),
  },
}));

// Mock the backward compatibility utilities
jest.mock('@/utils/transportationSegmentsBackwardCompatibility', () => ({
  hasLegacyFields: jest.fn(() => false),
  logLegacyFieldWarning: jest.fn(),
}));

// Mock the validation functions
jest.mock('@/types/transportationSegment', () => ({
  ...jest.requireActual('@/types/transportationSegment'),
  isValidPickupLocationType: jest.fn(() => true),
  requiresPickupLocationReference: jest.fn(() => false),
}));

// Mock Google Maps API
const mockGoogleMaps = {
  maps: {
    DirectionsService: jest.fn(),
    DirectionsStatus: {
      OK: 'OK',
      NOT_FOUND: 'NOT_FOUND',
      ZERO_RESULTS: 'ZERO_RESULTS',
    },
    TravelMode: {
      DRIVING: 'DRIVING',
      WALKING: 'WALKING',
      TRANSIT: 'TRANSIT',
    },
  },
};

global.google = mockGoogleMaps as any;

describe('Transportation Segments API Performance Tests', () => {
  let startTime: number;
  let endTime: number;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET API Performance Tests', () => {
    it('should execute GET /api/transportation-segments within performance threshold', async () => {
      const mockSegments = Array.from({ length: 1000 }, (_, index) => ({
        id: `segment-${index}`,
        appointment_id: `appointment-${index}`,
        segment_type: 'pickup',
        title: `Test Segment ${index}`,
        pickup_location_type: 'office',
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      }));

      (transportationSegmentService.getTransportationSegments as jest.Mock).mockResolvedValue(mockSegments);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments');

      startTime = performance.now();
      const response = await GET(request);
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1000);
    });

    it('should execute GET /api/transportation-segments with filters within performance threshold', async () => {
      const mockSegments = Array.from({ length: 100 }, (_, index) => ({
        id: `segment-${index}`,
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: `Test Segment ${index}`,
        pickup_location_type: 'office',
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      }));

      (transportationSegmentService.getTransportationSegments as jest.Mock).mockResolvedValue(mockSegments);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments?appointment_id=appointment-1&segment_type=pickup&status=scheduled');

      startTime = performance.now();
      const response = await GET(request);
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(500); // Should complete within 500ms
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(100);
    });

    it('should execute GET /api/transportation-segments/[id] within performance threshold', async () => {
      const mockSegment = {
        id: 'segment-1',
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Test Segment',
        pickup_location_type: 'office',
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      (transportationSegmentService.getTransportationSegment as jest.Mock).mockResolvedValue(mockSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1');

      startTime = performance.now();
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(200); // Should complete within 200ms
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSegment);
    });
  });

  describe('POST API Performance Tests', () => {
    it('should execute POST /api/transportation-segments within performance threshold', async () => {
      const createData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Test Segment',
        pickup_location_type: 'office',
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-1',
        ...createData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(createdSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(createData),
        headers: { 'Content-Type': 'application/json' },
      });

      startTime = performance.now();
      const response = await POST(request);
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(300); // Should complete within 300ms
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(createdSegment);
    });

    it('should execute POST /api/transportation-segments with complex data within performance threshold', async () => {
      const complexData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Complex Test Segment',
        pickup_location_type: 'office',
        pickup_location: {
          address: '123 Office St',
          lat: 40.7128,
          lng: -74.0060,
          building_name: 'Office Building',
        },
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
          building_name: 'Patient Building',
        },
        estimated_travel_minutes: 30,
        estimated_distance_km: 5.2,
        buffer_minutes: 20,
        instructions: 'Test instructions',
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-1',
        ...complexData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(createdSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(complexData),
        headers: { 'Content-Type': 'application/json' },
      });

      startTime = performance.now();
      const response = await POST(request);
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(400); // Should complete within 400ms
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(createdSegment);
    });
  });

  describe('PUT API Performance Tests', () => {
    it('should execute PUT /api/transportation-segments/[id] within performance threshold', async () => {
      const updateData = {
        id: 'segment-1',
        title: 'Updated Segment',
        status: 'completed',
      };

      const updatedSegment = {
        id: 'segment-1',
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Updated Segment',
        pickup_location_type: 'office',
        status: 'completed',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      (transportationSegmentService.updateTransportationSegment as jest.Mock).mockResolvedValue(updatedSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      startTime = performance.now();
      const response = await PUT(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(300); // Should complete within 300ms
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedSegment);
    });
  });

  describe('DELETE API Performance Tests', () => {
    it('should execute DELETE /api/transportation-segments/[id] within performance threshold', async () => {
      (transportationSegmentService.deleteTransportationSegment as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'DELETE',
      });

      startTime = performance.now();
      const response = await DELETE(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(200); // Should complete within 200ms
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Transportation segment deleted successfully');
    });
  });

  describe('Route Calculation API Performance Tests', () => {
    it('should execute POST /api/transportation-segments/calculate-route within performance threshold', async () => {
      const mockDirectionsService = {
        route: jest.fn((request, callback) => {
          callback({
            status: 'OK',
            routes: [{
              legs: [{
                duration: { text: '30 mins', value: 1800 },
                distance: { text: '5.2 km', value: 5200 },
              }],
            }],
          }, 'OK');
        }),
      };

      mockGoogleMaps.maps.DirectionsService.mockImplementation(() => mockDirectionsService);

      const routeData = {
        pickup_location: '123 Main St, New York, NY',
        patient_location: '456 Oak Ave, New York, NY',
        travel_mode: 'DRIVING',
      };

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/calculate-route', {
        method: 'POST',
        body: JSON.stringify(routeData),
        headers: { 'Content-Type': 'application/json' },
      });

      startTime = performance.now();
      const response = await CALCULATE_ROUTE(request);
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.duration).toBe(30);
      expect(data.distance).toBe(5.2);
    });
  });

  describe('Concurrent API Performance Tests', () => {
    it('should handle concurrent GET requests efficiently', async () => {
      const mockSegments = Array.from({ length: 100 }, (_, index) => ({
        id: `segment-${index}`,
        appointment_id: `appointment-${index}`,
        segment_type: 'pickup',
        title: `Test Segment ${index}`,
        pickup_location_type: 'office',
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      }));

      (transportationSegmentService.getTransportationSegments as jest.Mock).mockResolvedValue(mockSegments);

      startTime = performance.now();

      // Execute 10 concurrent GET requests
      const promises = Array.from({ length: 10 }, () => {
        const request = new NextRequest('http://localhost:3000/api/transportation-segments');
        return GET(request);
      });

      const responses = await Promise.all(promises);
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle concurrent POST requests efficiently', async () => {
      const createData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Test Segment',
        pickup_location_type: 'office',
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-1',
        ...createData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(createdSegment);

      startTime = performance.now();

      // Execute 5 concurrent POST requests
      const promises = Array.from({ length: 5 }, (_, index) => {
        const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
          method: 'POST',
          body: JSON.stringify({
            ...createData,
            appointment_id: `appointment-${index}`,
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        return POST(request);
      });

      const responses = await Promise.all(promises);
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1500); // Should complete within 1.5 seconds
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });

  describe('Error Handling Performance Tests', () => {
    it('should handle service errors efficiently', async () => {
      (transportationSegmentService.getTransportationSegments as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/transportation-segments');

      startTime = performance.now();
      const response = await GET(request);
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(500); // Should fail within 500ms
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });

    it('should handle validation errors efficiently', async () => {
      const invalidData = {
        segment_type: 'pickup',
        pickup_location_type: 'invalid_type',
      };

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      startTime = performance.now();
      const response = await POST(request);
      const data = await response.json();
      endTime = performance.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(200); // Should fail within 200ms
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('Memory Usage Performance Tests', () => {
    it('should handle memory usage efficiently for large API responses', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const mockSegments = Array.from({ length: 5000 }, (_, index) => ({
        id: `segment-${index}`,
        appointment_id: `appointment-${index}`,
        segment_type: 'pickup',
        title: `Test Segment ${index}`,
        pickup_location_type: 'office',
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      }));

      (transportationSegmentService.getTransportationSegments as jest.Mock).mockResolvedValue(mockSegments);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments');
      const response = await GET(request);
      const data = await response.json();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Should use less than 50MB
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(5000);
    });
  });
});

