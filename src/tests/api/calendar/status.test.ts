/**
 * API Tests for Calendar Status Endpoint
 *
 * Tests GET and POST methods for the /api/calendar/status endpoint
 * with single staff status, calendar health checks, and bulk operations.
 */

import { GET, POST } from '@/app/api/calendar/status/route';
import { getErrorDescription } from '@/lib/errorCodes';
import { supabase } from '@/lib/supabase';
import { getCalendarVerificationService } from '@/services/calendarVerificationService';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/services/calendarVerificationService');
jest.mock('@/services/googleCalendarService');
jest.mock('@/lib/errorCodes');

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

(supabase as any) = mockSupabase;

// Mock services
const mockVerificationService = {
  checkVerificationStatus: jest.fn(),
};

const mockGoogleCalendarService = {
  calendarExists: jest.fn(),
  getCalendarStatus: jest.fn(),
};

(getCalendarVerificationService as any) = jest.fn(() => mockVerificationService);
(getGoogleCalendarService as any) = jest.fn(() => mockGoogleCalendarService);
(getErrorDescription as any) = jest.fn();

describe('/api/calendar/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/calendar/status - Single Staff Status', () => {
    it('should get staff calendar status successfully', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const mockStaff = {
        id: staffId,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'verified',
        calendar_verification_date: '2024-01-01T10:00:00Z',
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockStaff,
              error: null,
            }),
          })),
        })),
      });

      mockGoogleCalendarService.calendarExists.mockResolvedValue(true);
      mockVerificationService.checkVerificationStatus.mockResolvedValue({
        staffId,
        verificationStatus: 'verified',
        verificationDate: '2024-01-01T10:00:00Z',
        errorCode: null,
        errorMessage: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_id).toBe(staffId);
      expect(responseData.data.google_calendar_id).toBe(mockStaff.google_calendar_id);
      expect(responseData.data.verification_status).toBe('verified');
      expect(responseData.data.last_operation_status).toBe('success');
    });

    it('should handle staff not found', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Staff not found' },
            }),
          })),
        })),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_id).toBe(staffId);
      expect(responseData.data.verification_status).toBe('failed');
      expect(responseData.data.error_code).toBe('INTERNAL_ERROR');
    });

    it('should handle calendar not found', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const mockStaff = {
        id: staffId,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        google_calendar_id: 'invalid-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'pending',
        calendar_verification_date: null,
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockStaff,
              error: null,
            }),
          })),
        })),
      });

      mockGoogleCalendarService.calendarExists.mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.error_code).toBe('CALENDAR_NOT_FOUND');
      expect(responseData.data.last_operation_status).toBe('failed');
    });

    it('should handle Google API unavailable', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const mockStaff = {
        id: staffId,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'pending',
        calendar_verification_date: null,
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockStaff,
              error: null,
            }),
          })),
        })),
      });

      mockGoogleCalendarService.calendarExists.mockRejectedValue(
        new Error('Google API unavailable')
      );

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.error_code).toBe('GOOGLE_API_UNAVAILABLE');
      expect(responseData.data.last_operation_status).toBe('failed');
    });

    it('should validate staff_id parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/status');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('parameters');
    });

    it('should validate staff_id format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/calendar/status?staff_id=invalid-uuid'
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('staff_id');
    });
  });

  describe('GET /api/calendar/status - Calendar Health Check', () => {
    it('should check calendar health successfully', async () => {
      const googleCalendarId = 'test-calendar-id@group.calendar.google.com';

      mockGoogleCalendarService.calendarExists.mockResolvedValue(true);
      mockGoogleCalendarService.getCalendarStatus.mockResolvedValue({
        staff_id: '',
        google_calendar_id: googleCalendarId,
        verification_status: 'not_required',
        last_operation: 'create_calendar',
        last_operation_status: 'success',
        last_operation_date: '2024-01-01T10:00:00Z',
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?google_calendar_id=${googleCalendarId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.google_calendar_id).toBe(googleCalendarId);
      expect(responseData.data.exists).toBe(true);
      expect(responseData.data.accessible).toBe(true);
      expect(responseData.data.health_status).toBe('healthy');
    });

    it('should handle calendar not found', async () => {
      const googleCalendarId = 'invalid-calendar-id@group.calendar.google.com';

      mockGoogleCalendarService.calendarExists.mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?google_calendar_id=${googleCalendarId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.exists).toBe(false);
      expect(responseData.data.accessible).toBe(false);
      expect(responseData.data.health_status).toBe('unhealthy');
      expect(responseData.data.error_code).toBe('CALENDAR_NOT_FOUND');
    });

    it('should handle Google API errors', async () => {
      const googleCalendarId = 'test-calendar-id@group.calendar.google.com';

      mockGoogleCalendarService.calendarExists.mockRejectedValue(
        new Error('API quota exceeded')
      );

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?google_calendar_id=${googleCalendarId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.health_status).toBe('unhealthy');
      expect(responseData.data.error_code).toBe('GOOGLE_API_UNAVAILABLE');
    });

    it('should validate google_calendar_id parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/calendar/status?google_calendar_id='
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('google_calendar_id');
    });
  });

  describe('GET /api/calendar/status - Bulk Status Check', () => {
    it('should get bulk status successfully', async () => {
      const staffIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
      ];

      // Mock staff data
      const mockStaff1 = {
        id: staffIds[0],
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        google_calendar_id: 'calendar-1@group.calendar.google.com',
        calendar_verification_status: 'verified',
        calendar_verification_date: '2024-01-01T10:00:00Z',
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      const mockStaff2 = {
        id: staffIds[1],
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com',
        google_calendar_id: 'calendar-2@group.calendar.google.com',
        calendar_verification_status: 'pending',
        calendar_verification_date: null,
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockResolvedValueOnce({ data: mockStaff1, error: null })
              .mockResolvedValueOnce({ data: mockStaff2, error: null }),
          })),
        })),
      });

      mockGoogleCalendarService.calendarExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      mockVerificationService.checkVerificationStatus
        .mockResolvedValueOnce({
          staffId: staffIds[0],
          verificationStatus: 'verified',
          verificationDate: '2024-01-01T10:00:00Z',
        })
        .mockResolvedValueOnce({
          staffId: staffIds[1],
          verificationStatus: 'pending',
          verificationDate: null,
        });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_ids=${staffIds.join(',')}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_statuses).toHaveLength(2);
      expect(responseData.data.summary.total).toBe(2);
      expect(responseData.data.summary.verified).toBe(1);
      expect(responseData.data.summary.pending).toBe(1);
      expect(responseData.meta.total).toBe(2);
    });

    it('should handle bulk status with options', async () => {
      const staffIds = ['123e4567-e89b-12d3-a456-426614174000'];

      const mockStaff = {
        id: staffIds[0],
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'verified',
        calendar_verification_date: '2024-01-01T10:00:00Z',
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockStaff,
              error: null,
            }),
          })),
        })),
      });

      mockGoogleCalendarService.calendarExists.mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_ids=${staffIds.join(',')}&include_verification=false&include_health=false`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_statuses).toHaveLength(1);
    });

    it('should validate bulk request parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/calendar/status?staff_ids='
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('staff_ids');
    });

    it('should validate maximum staff IDs limit', async () => {
      const staffIds = Array.from({ length: 51 }, (_, i) =>
        `123e4567-e89b-12d3-a456-42661417400${i}`
      );

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_ids=${staffIds.join(',')}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('staff_ids');
    });

    it('should handle mixed success and failure in bulk status', async () => {
      const staffIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
      ];

      const mockStaff = {
        id: staffIds[0],
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'verified',
        calendar_verification_date: '2024-01-01T10:00:00Z',
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockResolvedValueOnce({ data: mockStaff, error: null })
              .mockResolvedValueOnce({ data: null, error: { message: 'Staff not found' } }),
          })),
        })),
      });

      mockGoogleCalendarService.calendarExists.mockResolvedValue(true);
      mockVerificationService.checkVerificationStatus.mockResolvedValue({
        staffId: staffIds[0],
        verificationStatus: 'verified',
        verificationDate: '2024-01-01T10:00:00Z',
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_ids=${staffIds.join(',')}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_statuses).toHaveLength(2);
      expect(responseData.data.summary.verified).toBe(1);
      expect(responseData.data.summary.failed).toBe(1);
    });
  });

  describe('POST /api/calendar/status - Bulk Status Check', () => {
    it('should get bulk status via POST successfully', async () => {
      const requestData = {
        staff_ids: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
        ],
        include_verification: true,
        include_health: true,
      };

      const mockStaff1 = {
        id: requestData.staff_ids[0],
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        google_calendar_id: 'calendar-1@group.calendar.google.com',
        calendar_verification_status: 'verified',
        calendar_verification_date: '2024-01-01T10:00:00Z',
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      const mockStaff2 = {
        id: requestData.staff_ids[1],
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com',
        google_calendar_id: 'calendar-2@group.calendar.google.com',
        calendar_verification_status: 'pending',
        calendar_verification_date: null,
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockResolvedValueOnce({ data: mockStaff1, error: null })
              .mockResolvedValueOnce({ data: mockStaff2, error: null }),
          })),
        })),
      });

      mockGoogleCalendarService.calendarExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      mockVerificationService.checkVerificationStatus
        .mockResolvedValueOnce({
          staffId: requestData.staff_ids[0],
          verificationStatus: 'verified',
          verificationDate: '2024-01-01T10:00:00Z',
        })
        .mockResolvedValueOnce({
          staffId: requestData.staff_ids[1],
          verificationStatus: 'pending',
          verificationDate: null,
        });

      const request = new NextRequest('http://localhost:3000/api/calendar/status', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_statuses).toHaveLength(2);
      expect(responseData.data.summary.total).toBe(2);
      expect(responseData.meta.total_staff).toBe(2);
    });

    it('should validate POST request body', async () => {
      const invalidRequestData = {
        staff_ids: [],
        include_verification: 'invalid-boolean',
        include_health: 'invalid-boolean',
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/status', {
        method: 'POST',
        body: JSON.stringify(invalidRequestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors).toHaveLength(3);
    });

    it('should handle malformed JSON in POST request', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/status', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          })),
        })),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.verification_status).toBe('failed');
      expect(responseData.data.error_code).toBe('INTERNAL_ERROR');
    });

    it('should handle verification service errors', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const mockStaff = {
        id: staffId,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'pending',
        calendar_verification_date: null,
        calendar_error_code: null,
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockStaff,
              error: null,
            }),
          })),
        })),
      });

      mockGoogleCalendarService.calendarExists.mockResolvedValue(true);
      mockVerificationService.checkVerificationStatus.mockRejectedValue(
        new Error('Verification service unavailable')
      );

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Should still return status even if verification check fails
      expect(responseData.data.staff_id).toBe(staffId);
    });

    it('should handle missing error description', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const mockStaff = {
        id: staffId,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        calendar_verification_status: 'failed',
        calendar_verification_date: null,
        calendar_error_code: 'UNKNOWN_ERROR',
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockStaff,
              error: null,
            }),
          })),
        })),
      });

      mockGoogleCalendarService.calendarExists.mockResolvedValue(true);
      (getErrorDescription as any).mockReturnValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/status?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.error_code).toBe('UNKNOWN_ERROR');
      expect(responseData.data.error_message).toBeUndefined();
    });
  });
});
