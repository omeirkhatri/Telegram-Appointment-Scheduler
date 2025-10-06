import { DELETE, GET as GET_BY_ID, PUT } from '@/app/api/transportation-segments/[id]/route';
import { POST as CALCULATE_ROUTE } from '@/app/api/transportation-segments/calculate-route/route';
import { GET, POST } from '@/app/api/transportation-segments/route';
import { transportationSegmentService } from '@/services/transportationSegmentService';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

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

describe('Transportation Segments API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete API Workflow', () => {
    it('should handle complete CRUD operations via API', async () => {
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

      const mockSegment = mockSegments[0];

      // 1. GET all segments
      (transportationSegmentService.getTransportationSegments as jest.Mock).mockResolvedValue(mockSegments);
      const getRequest = new NextRequest('http://localhost:3000/api/transportation-segments');
      const getResponse = await GET(getRequest);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getData.success).toBe(true);
      expect(getData.data).toEqual(mockSegments);
      expect(getData.count).toBe(1);

      // 2. GET single segment
      (transportationSegmentService.getTransportationSegment as jest.Mock).mockResolvedValue(mockSegment);
      const getByIdRequest = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1');
      const getByIdResponse = await GET_BY_ID(getByIdRequest, { params: Promise.resolve({ id: 'segment-1' }) });
      const getByIdData = await getByIdResponse.json();

      expect(getByIdResponse.status).toBe(200);
      expect(getByIdData.success).toBe(true);
      expect(getByIdData.data).toEqual(mockSegment);

      // 3. POST create segment
      const createData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'New Segment',
        pickup_location_type: 'office',
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-2',
        ...createData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(createdSegment);
      const postRequest = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(createData),
        headers: { 'Content-Type': 'application/json' },
      });
      const postResponse = await POST(postRequest);
      const postData = await postResponse.json();

      expect(postResponse.status).toBe(201);
      expect(postData.success).toBe(true);
      expect(postData.data).toEqual(createdSegment);

      // 4. PUT update segment
      const updateData = {
        id: 'segment-1',
        title: 'Updated Segment',
        status: 'completed',
      };

      const updatedSegment = {
        ...mockSegment,
        ...updateData,
        updated_at: '2024-01-01T10:00:00Z',
      };

      (transportationSegmentService.updateTransportationSegment as jest.Mock).mockResolvedValue(updatedSegment);
      const putRequest = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });
      const putResponse = await PUT(putRequest, { params: Promise.resolve({ id: 'segment-1' }) });
      const putData = await putResponse.json();

      expect(putResponse.status).toBe(200);
      expect(putData.success).toBe(true);
      expect(putData.data).toEqual(updatedSegment);

      // 5. DELETE segment
      (transportationSegmentService.deleteTransportationSegment as jest.Mock).mockResolvedValue(true);
      const deleteRequest = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'DELETE',
      });
      const deleteResponse = await DELETE(deleteRequest, { params: Promise.resolve({ id: 'segment-1' }) });
      const deleteData = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteData.success).toBe(true);
      expect(deleteData.message).toBe('Transportation segment deleted successfully');
    });

    it('should handle pickup location type workflow via API', async () => {
      const pickupTypes = ['office', 'previous_appointment', 'metro_station', 'custom'];

      for (const pickupType of pickupTypes) {
        const segmentData = {
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: `Test ${pickupType} pickup`,
          pickup_location_type: pickupType,
          pickup_location: {
            address: `123 ${pickupType} St`,
            lat: 40.7128,
            lng: -74.0060,
          },
          patient_location: {
            address: '456 Patient St',
            lat: 40.7589,
            lng: -73.9851,
          },
          status: 'draft',
        };

        const createdSegment = {
          id: `segment-${pickupType}`,
          ...segmentData,
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        };

        (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(createdSegment);

        const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
          method: 'POST',
          body: JSON.stringify(segmentData),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.pickup_location_type).toBe(pickupType);
      }
    });

    it('should handle filtering workflow via API', async () => {
      const mockSegments = [
        {
          id: 'segment-1',
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: 'Pickup 1',
          pickup_location_type: 'office',
          status: 'scheduled',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
        },
      ];

      (transportationSegmentService.getTransportationSegments as jest.Mock).mockResolvedValue(mockSegments);

      const filters = [
        'appointment_id=appointment-1',
        'driver_id=driver-1',
        'segment_type=pickup',
        'status=scheduled',
        'requires_follow_up=true',
      ];

      for (const filter of filters) {
        const request = new NextRequest(`http://localhost:3000/api/transportation-segments?${filter}`);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toEqual(mockSegments);
      }
    });

    it('should handle route calculation workflow via API', async () => {
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

      const response = await CALCULATE_ROUTE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.duration).toBe(30);
      expect(data.distance).toBe(5.2);
      expect(data.durationText).toBe('30 mins');
      expect(data.distanceText).toBe('5.2 km');
    });

    it('should handle error scenarios via API', async () => {
      // Test service errors
      (transportationSegmentService.getTransportationSegments as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const getRequest = new NextRequest('http://localhost:3000/api/transportation-segments');
      const getResponse = await GET(getRequest);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(500);
      expect(getData.success).toBe(false);
      expect(getData.error).toBe('Database connection failed');

      // Test not found
      (transportationSegmentService.getTransportationSegment as jest.Mock).mockResolvedValue(null);

      const getByIdRequest = new NextRequest('http://localhost:3000/api/transportation-segments/nonexistent');
      const getByIdResponse = await GET_BY_ID(getByIdRequest, { params: Promise.resolve({ id: 'nonexistent' }) });
      const getByIdData = await getByIdResponse.json();

      expect(getByIdResponse.status).toBe(404);
      expect(getByIdData.success).toBe(false);
      expect(getByIdData.error).toBe('Transportation segment not found');

      // Test creation errors
      (transportationSegmentService.createTransportationSegment as jest.Mock).mockRejectedValue(
        new Error('Creation failed')
      );

      const postRequest = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          pickup_location_type: 'office',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const postResponse = await POST(postRequest);
      const postData = await postResponse.json();

      expect(postResponse.status).toBe(500);
      expect(postData.success).toBe(false);
      expect(postData.error).toBe('Creation failed');
    });

    it('should handle backward compatibility via API', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Legacy Segment',
        pickup_location_type: 'custom',
        origin: { address: '123 Old St', lat: 40.7128, lng: -74.0060 },
        destination: { address: '456 New St', lat: 40.7589, lng: -73.9851 },
      };

      const createdSegment = {
        id: 'segment-legacy',
        ...legacyData,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(createdSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(legacyData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(hasLegacyFields).toHaveBeenCalledWith(legacyData);
      expect(logLegacyFieldWarning).toHaveBeenCalledWith(['origin', 'destination']);
    });

    it('should handle validation errors via API', async () => {
      const invalidData = {
        segment_type: 'pickup',
        pickup_location_type: 'invalid_type',
      };

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    it('should handle invalid JSON via API', async () => {
      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON');
    });
  });
});

