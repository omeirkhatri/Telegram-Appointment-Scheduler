import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from './route';
import { googleEventIntegrityService } from '@/services/googleEventIntegrityService';

// Mock the integrity service
jest.mock('@/services/googleEventIntegrityService');
const mockIntegrityService = googleEventIntegrityService as jest.Mocked<typeof googleEventIntegrityService>;

describe('/api/integrity/google-events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should perform integrity check for all appointments', async () => {
      const mockResult = {
        isValid: true,
        errors: [],
        warnings: [],
        stats: {
          totalAppointments: 10,
          appointmentsWithEventIds: 8,
          totalEventIds: 15,
          validEventIds: 15,
          invalidEventIds: 0,
          orphanedEventIds: 0,
          duplicateEventIds: 0
        }
      };

      mockIntegrityService.performIntegrityCheck.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/integrity/google-events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toEqual(mockResult);
      expect(mockIntegrityService.performIntegrityCheck).toHaveBeenCalledTimes(1);
    });

    it('should perform integrity check for specific appointment', async () => {
      const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResult = {
        isValid: true,
        errors: [],
        warnings: [],
        stats: {
          totalAppointments: 1,
          appointmentsWithEventIds: 1,
          totalEventIds: 2,
          validEventIds: 2,
          invalidEventIds: 0,
          orphanedEventIds: 0,
          duplicateEventIds: 0
        }
      };

      mockIntegrityService.checkAppointmentIntegrity.mockResolvedValue(mockResult);

      const request = new NextRequest(`http://localhost:3000/api/integrity/google-events?appointmentId=${appointmentId}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toEqual(mockResult);
      expect(mockIntegrityService.checkAppointmentIntegrity).toHaveBeenCalledWith(appointmentId);
    });

    it('should perform auto-cleanup when requested', async () => {
      const mockIntegrityResult = {
        isValid: false,
        errors: [
          {
            type: 'orphaned_event' as const,
            message: 'Event does not exist',
            appointmentId: 'appointment-1',
            staffId: 'staff-1',
            eventId: 'orphaned-event-123',
            severity: 'error' as const
          }
        ],
        warnings: [],
        stats: {
          totalAppointments: 1,
          appointmentsWithEventIds: 1,
          totalEventIds: 1,
          validEventIds: 0,
          invalidEventIds: 1,
          orphanedEventIds: 1,
          duplicateEventIds: 0
        }
      };

      const mockCleanupResult = {
        success: true,
        cleanedCount: 1,
        errors: []
      };

      mockIntegrityService.performIntegrityCheck.mockResolvedValue(mockIntegrityResult);
      mockIntegrityService.autoCleanup.mockResolvedValue(mockCleanupResult);

      const request = new NextRequest('http://localhost:3000/api/integrity/google-events?autoCleanup=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.integrityCheck).toEqual(mockIntegrityResult);
      expect(data.cleanup).toEqual(mockCleanupResult);
      expect(mockIntegrityService.autoCleanup).toHaveBeenCalledTimes(1);
    });

    it('should return error for invalid query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrity/google-events?appointmentId=invalid-uuid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should handle service errors', async () => {
      mockIntegrityService.performIntegrityCheck.mockRejectedValue(new Error('Service error'));

      const request = new NextRequest('http://localhost:3000/api/integrity/google-events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Integrity check failed');
      expect(data.message).toBe('Service error');
    });
  });

  describe('POST', () => {
    it('should perform cleanup operations', async () => {
      const operations = [
        {
          type: 'remove_orphaned' as const,
          appointmentId: '550e8400-e29b-41d4-a716-446655440000',
          staffId: '550e8400-e29b-41d4-a716-446655440001',
          eventId: 'orphaned-event-789',
          reason: 'Event does not exist in Google Calendar'
        }
      ];

      const mockResult = {
        success: true,
        cleanedCount: 1,
        errors: []
      };

      mockIntegrityService.cleanupInvalidEventIds.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/integrity/google-events', {
        method: 'POST',
        body: JSON.stringify({ operations }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toEqual(mockResult);
      expect(mockIntegrityService.cleanupInvalidEventIds).toHaveBeenCalledWith(operations);
    });

    it('should return error for invalid request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrity/google-events', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request body');
    });

    it('should handle service errors', async () => {
      const operations = [
        {
          type: 'remove_orphaned' as const,
          appointmentId: '550e8400-e29b-41d4-a716-446655440000',
          staffId: '550e8400-e29b-41d4-a716-446655440001',
          eventId: 'orphaned-event-789',
          reason: 'Event does not exist in Google Calendar'
        }
      ];

      mockIntegrityService.cleanupInvalidEventIds.mockRejectedValue(new Error('Cleanup failed'));

      const request = new NextRequest('http://localhost:3000/api/integrity/google-events', {
        method: 'POST',
        body: JSON.stringify({ operations }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cleanup operation failed');
      expect(data.message).toBe('Cleanup failed');
    });
  });

  describe('PUT', () => {
    it('should validate and fix specific appointment', async () => {
      const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResult = {
        success: true,
        fixed: true,
        errors: []
      };

      mockIntegrityService.validateAndFixAppointment.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/integrity/google-events', {
        method: 'PUT',
        body: JSON.stringify({ appointmentId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toEqual(mockResult);
      expect(mockIntegrityService.validateAndFixAppointment).toHaveBeenCalledWith(appointmentId);
    });

    it('should return error for invalid appointment ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrity/google-events', {
        method: 'PUT',
        body: JSON.stringify({ appointmentId: 'invalid-uuid' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request body');
    });

    it('should handle service errors', async () => {
      const appointmentId = '550e8400-e29b-41d4-a716-446655440000';

      mockIntegrityService.validateAndFixAppointment.mockRejectedValue(new Error('Validation failed'));

      const request = new NextRequest('http://localhost:3000/api/integrity/google-events', {
        method: 'PUT',
        body: JSON.stringify({ appointmentId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Appointment validation failed');
      expect(data.message).toBe('Validation failed');
    });
  });

  describe('DELETE', () => {
    it('should perform auto-cleanup', async () => {
      const mockResult = {
        success: true,
        cleanedCount: 3,
        errors: []
      };

      mockIntegrityService.autoCleanup.mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/integrity/google-events', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toEqual(mockResult);
      expect(mockIntegrityService.autoCleanup).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      mockIntegrityService.autoCleanup.mockRejectedValue(new Error('Auto-cleanup failed'));

      const request = new NextRequest('http://localhost:3000/api/integrity/google-events', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Auto-cleanup failed');
      expect(data.message).toBe('Auto-cleanup failed');
    });
  });
});
