import { GET as GET_BY_ID, PUT } from '@/app/api/transportation-segments/[id]/route';
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
  hasLegacyFields: jest.fn(),
  logLegacyFieldWarning: jest.fn(),
}));

describe('Transportation Segments API Backward Compatibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Legacy Field Support', () => {
    it('should support origin field in POST requests', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Legacy Segment',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
          building_name: 'Old Origin Building',
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
          building_name: 'Old Destination Building',
        },
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-legacy',
        ...legacyData,
        pickup_location: legacyData.origin,
        patient_location: legacyData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
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
      expect(transportationSegmentService.createTransportationSegment).toHaveBeenCalledWith(
        expect.objectContaining({
          pickup_location: legacyData.origin,
          patient_location: legacyData.destination,
        })
      );
    });

    it('should support destination field in POST requests', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Legacy Segment',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-legacy',
        ...legacyData,
        pickup_location: legacyData.origin,
        patient_location: legacyData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
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

    it('should support mixed legacy and new fields', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const mixedData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Mixed Legacy Segment',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: {
          address: '456 New Patient St',
          lat: 40.7589,
          lng: -73.9851,
        },
        pickup_location_type: 'office',
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-mixed',
        ...mixedData,
        pickup_location: mixedData.origin,
        pickup_location_reference: 'office_location',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      (transportationSegmentService.createTransportationSegment as jest.Mock).mockResolvedValue(createdSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(mixedData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(hasLegacyFields).toHaveBeenCalledWith(mixedData);
      expect(logLegacyFieldWarning).toHaveBeenCalledWith(['origin']);
    });
  });

  describe('Legacy Field Support in PUT Requests', () => {
    it('should support origin field in PUT requests', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyUpdateData = {
        id: 'segment-1',
        title: 'Updated Legacy Segment',
        origin: {
          address: '789 Updated Origin St',
          lat: 40.7505,
          lng: -73.9934,
        },
        status: 'scheduled',
      };

      const updatedSegment = {
        id: 'segment-1',
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Updated Legacy Segment',
        pickup_location: legacyUpdateData.origin,
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
        },
        pickup_location_type: 'custom',
        pickup_location_reference: null,
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      (transportationSegmentService.updateTransportationSegment as jest.Mock).mockResolvedValue(updatedSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'PUT',
        body: JSON.stringify(legacyUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(hasLegacyFields).toHaveBeenCalledWith(legacyUpdateData);
      expect(logLegacyFieldWarning).toHaveBeenCalledWith(['origin']);
    });

    it('should support destination field in PUT requests', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyUpdateData = {
        id: 'segment-1',
        title: 'Updated Legacy Segment',
        destination: {
          address: '321 Updated Destination St',
          lat: 40.7614,
          lng: -73.9776,
        },
        status: 'completed',
      };

      const updatedSegment = {
        id: 'segment-1',
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Updated Legacy Segment',
        pickup_location: {
          address: '123 Pickup St',
          lat: 40.7128,
          lng: -74.0060,
        },
        patient_location: legacyUpdateData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
        status: 'completed',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      (transportationSegmentService.updateTransportationSegment as jest.Mock).mockResolvedValue(updatedSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'PUT',
        body: JSON.stringify(legacyUpdateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(hasLegacyFields).toHaveBeenCalledWith(legacyUpdateData);
      expect(logLegacyFieldWarning).toHaveBeenCalledWith(['destination']);
    });
  });

  describe('Legacy Field Support in GET Responses', () => {
    it('should return data with new field names in GET responses', async () => {
      const mockSegments = [
        {
          id: 'segment-1',
          appointment_id: 'appointment-1',
          segment_type: 'pickup',
          title: 'Test Segment',
          pickup_location: {
            address: '123 Pickup St',
            lat: 40.7128,
            lng: -74.0060,
            building_name: 'Pickup Building',
          },
          patient_location: {
            address: '456 Patient St',
            lat: 40.7589,
            lng: -73.9851,
            building_name: 'Patient Building',
          },
          pickup_location_type: 'office',
          pickup_location_reference: 'office_location',
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
      expect(data.data[0].pickup_location).toBeDefined();
      expect(data.data[0].patient_location).toBeDefined();
      expect(data.data[0].pickup_location_type).toBeDefined();
      expect(data.data[0].origin).toBeUndefined();
      expect(data.data[0].destination).toBeUndefined();
    });

    it('should return single segment with new field names', async () => {
      const mockSegment = {
        id: 'segment-1',
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Test Segment',
        pickup_location: {
          address: '123 Pickup St',
          lat: 40.7128,
          lng: -74.0060,
          building_name: 'Pickup Building',
        },
        patient_location: {
          address: '456 Patient St',
          lat: 40.7589,
          lng: -73.9851,
          building_name: 'Patient Building',
        },
        pickup_location_type: 'office',
        pickup_location_reference: 'office_location',
        status: 'scheduled',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
      };

      (transportationSegmentService.getTransportationSegment as jest.Mock).mockResolvedValue(mockSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSegment);
      expect(data.data.pickup_location).toBeDefined();
      expect(data.data.patient_location).toBeDefined();
      expect(data.data.pickup_location_type).toBeDefined();
      expect(data.data.origin).toBeUndefined();
      expect(data.data.destination).toBeUndefined();
    });
  });

  describe('Legacy Field Validation', () => {
    it('should validate legacy fields correctly', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
      };

      const createdSegment = {
        id: 'segment-legacy',
        ...legacyData,
        pickup_location: legacyData.origin,
        patient_location: legacyData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
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

    it('should handle legacy field validation errors', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const invalidLegacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
        pickup_location_type: 'invalid_type', // Invalid type
      };

      const request = new NextRequest('http://localhost:3000/api/transportation-segments', {
        method: 'POST',
        body: JSON.stringify(invalidLegacyData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('Legacy Field Migration', () => {
    it('should migrate legacy fields to new fields', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Legacy Segment',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
          building_name: 'Old Origin Building',
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
          building_name: 'Old Destination Building',
        },
        status: 'draft',
      };

      const expectedMigratedData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        title: 'Legacy Segment',
        pickup_location: legacyData.origin,
        patient_location: legacyData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
        status: 'draft',
      };

      const createdSegment = {
        id: 'segment-legacy',
        ...expectedMigratedData,
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
      expect(transportationSegmentService.createTransportationSegment).toHaveBeenCalledWith(
        expect.objectContaining(expectedMigratedData)
      );
    });
  });

  describe('Legacy Field Deprecation', () => {
    it('should log deprecation warnings for legacy fields', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyData = {
        appointment_id: 'appointment-1',
        segment_type: 'pickup',
        origin: {
          address: '123 Old Origin St',
          lat: 40.7128,
          lng: -74.0060,
        },
        destination: {
          address: '456 Old Destination St',
          lat: 40.7589,
          lng: -73.9851,
        },
      };

      const createdSegment = {
        id: 'segment-legacy',
        ...legacyData,
        pickup_location: legacyData.origin,
        patient_location: legacyData.destination,
        pickup_location_type: 'custom',
        pickup_location_reference: null,
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
      expect(logLegacyFieldWarning).toHaveBeenCalledWith(['origin', 'destination']);
    });
  });
});

