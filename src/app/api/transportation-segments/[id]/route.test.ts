import { transportationSegmentService } from '@/services/transportationSegmentService';
import type { UpdateTransportationSegment } from '@/types/transportationSegment';
import { NextRequest } from 'next/server';
import { DELETE, GET, PUT } from './route';

// Mock the transportation segment service
jest.mock('@/services/transportationSegmentService', () => ({
  transportationSegmentService: {
    getTransportationSegment: jest.fn(),
    updateTransportationSegment: jest.fn(),
    deleteTransportationSegment: jest.fn(),
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

describe('/api/transportation-segments/[id]', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should fetch single transportation segment', async () => {
      (transportationSegmentService.getTransportationSegment as jest.Mock).mockResolvedValue(mockSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSegment);
      expect(transportationSegmentService.getTransportationSegment).toHaveBeenCalledWith('segment-1');
    });

    it('should return 404 when segment not found', async () => {
      (transportationSegmentService.getTransportationSegment as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Transportation segment not found');
    });

    it('should handle service errors', async () => {
      (transportationSegmentService.getTransportationSegment as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('PUT', () => {
    const updateData: UpdateTransportationSegment = {
      id: 'segment-1',
      title: 'Updated Segment',
      status: 'completed',
    };

    const updatedSegment = {
      ...mockSegment,
      ...updateData,
      updated_at: '2024-01-01T10:00:00Z',
    };

    it('should update transportation segment successfully', async () => {
      (transportationSegmentService.updateTransportationSegment as jest.Mock).mockResolvedValue(updatedSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(updatedSegment);
      expect(data.message).toBe('Transportation segment updated successfully');
      expect(transportationSegmentService.updateTransportationSegment).toHaveBeenCalledWith(updateData);
    });

    it('should handle legacy field warnings', async () => {
      const { hasLegacyFields, logLegacyFieldWarning } = require('@/utils/transportationSegmentsBackwardCompatibility');
      hasLegacyFields.mockReturnValue(true);
      logLegacyFieldWarning.mockImplementation(() => {});

      const legacyUpdateData = {
        ...updateData,
        origin: { address: '123 Old St' },
        destination: { address: '456 New St' },
      };

      (transportationSegmentService.updateTransportationSegment as jest.Mock).mockResolvedValue(updatedSegment);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'PUT',
        body: JSON.stringify(legacyUpdateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(hasLegacyFields).toHaveBeenCalledWith(legacyUpdateData);
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

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toEqual(validationErrors);
    });

    it('should handle service update errors', async () => {
      (transportationSegmentService.updateTransportationSegment as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Update failed');
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'PUT',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON');
    });
  });

  describe('DELETE', () => {
    it('should delete transportation segment successfully', async () => {
      (transportationSegmentService.deleteTransportationSegment as jest.Mock).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Transportation segment deleted successfully');
      expect(transportationSegmentService.deleteTransportationSegment).toHaveBeenCalledWith('segment-1');
    });

    it('should handle deletion errors', async () => {
      (transportationSegmentService.deleteTransportationSegment as jest.Mock).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to delete transportation segment');
    });

    it('should handle service deletion errors', async () => {
      (transportationSegmentService.deleteTransportationSegment as jest.Mock).mockRejectedValue(
        new Error('Deletion failed')
      );

      const request = new NextRequest('http://localhost:3000/api/transportation-segments/segment-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'segment-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Deletion failed');
    });
  });
});

