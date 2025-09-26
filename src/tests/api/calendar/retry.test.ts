/**
 * API Tests for Calendar Retry Endpoint
 *
 * Tests POST and GET methods for the /api/calendar/retry endpoint
 * with operation retry, staff operation retry, and bulk retry functionality.
 */

import { GET, POST } from '@/app/api/calendar/retry/route';
import { isRetryableError } from '@/lib/errorCodes';
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
        order: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      lt: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
};

(supabase as any) = mockSupabase;

// Mock services
const mockVerificationService = {
  startVerification: jest.fn(),
};

const mockGoogleCalendarService = {
  createCalendar: jest.fn(),
  shareCalendar: jest.fn(),
};

(getCalendarVerificationService as any) = jest.fn(() => mockVerificationService);
(getGoogleCalendarService as any) = jest.fn(() => mockGoogleCalendarService);
(isRetryableError as any) = jest.fn();

describe('/api/calendar/retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/calendar/retry - Operation Retry', () => {
    it('should retry operation successfully', async () => {
      const operationLogId = '123e4567-e89b-12d3-a456-426614174000';
      const mockOperationLog = {
        id: operationLogId,
        staff_id: 'staff-123',
        operation_type: 'create_calendar',
        operation_status: 'failed',
        retry_count: 1,
        max_retries: 3,
        error_code: 'GOOGLE_API_UNAVAILABLE',
        error_message: 'API temporarily unavailable',
        operation_data: {
          staff_name: 'Dr. John Smith',
          staff_type: 'Doctor',
          staff_email: 'john.smith@example.com',
        },
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockOperationLog,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      (isRetryableError as any).mockReturnValue(true);

      const requestData = {
        operation_log_id: operationLogId,
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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
      expect(responseData.data.operation_log_id).toBe(operationLogId);
      expect(responseData.data.retry_count).toBe(2);
    });

    it('should handle operation not found', async () => {
      const operationLogId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          })),
        })),
      });

      const requestData = {
        operation_log_id: operationLogId,
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('NotFoundError');
    });

    it('should handle maximum retries exceeded', async () => {
      const operationLogId = '123e4567-e89b-12d3-a456-426614174000';
      const mockOperationLog = {
        id: operationLogId,
        staff_id: 'staff-123',
        operation_type: 'create_calendar',
        operation_status: 'failed',
        retry_count: 3,
        max_retries: 3,
        error_code: 'GOOGLE_API_UNAVAILABLE',
        error_message: 'API temporarily unavailable',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockOperationLog,
              error: null,
            }),
          })),
        })),
      });

      const requestData = {
        operation_log_id: operationLogId,
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_code).toBe('VERIFICATION_TIMEOUT');
      expect(responseData.message).toContain('Maximum retry attempts exceeded');
    });

    it('should handle non-retryable error', async () => {
      const operationLogId = '123e4567-e89b-12d3-a456-426614174000';
      const mockOperationLog = {
        id: operationLogId,
        staff_id: 'staff-123',
        operation_type: 'create_calendar',
        operation_status: 'failed',
        retry_count: 1,
        max_retries: 3,
        error_code: 'PERMISSION_DENIED',
        error_message: 'Insufficient permissions',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockOperationLog,
              error: null,
            }),
          })),
        })),
      });

      (isRetryableError as any).mockReturnValue(false);

      const requestData = {
        operation_log_id: operationLogId,
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_code).toBe('PERMISSION_DENIED');
      expect(responseData.message).toContain('Operation is not retryable');
    });

    it('should force retry even when max retries exceeded', async () => {
      const operationLogId = '123e4567-e89b-12d3-a456-426614174000';
      const mockOperationLog = {
        id: operationLogId,
        staff_id: 'staff-123',
        operation_type: 'create_calendar',
        operation_status: 'failed',
        retry_count: 3,
        max_retries: 3,
        error_code: 'GOOGLE_API_UNAVAILABLE',
        error_message: 'API temporarily unavailable',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockOperationLog,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      const requestData = {
        operation_log_id: operationLogId,
        force_retry: true,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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
    });

    it('should validate operation log ID format', async () => {
      const requestData = {
        operation_log_id: 'invalid-uuid',
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('operation_log_id');
    });
  });

  describe('POST /api/calendar/retry - Staff Operation Retry', () => {
    it('should retry staff operation successfully', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const mockStaff = {
        id: staffId,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        staff_type: 'Doctor',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
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
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ error: null }),
        })),
      });

      mockGoogleCalendarService.createCalendar.mockResolvedValue({
        success: true,
        calendarId: 'new-calendar-id@group.calendar.google.com',
      });

      const requestData = {
        staff_id: staffId,
        operation_type: 'create_calendar',
        force_retry: false,
        max_retries: 3,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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
      expect(responseData.data.staff_id).toBe(staffId);
      expect(responseData.data.operation_type).toBe('create_calendar');
      expect(responseData.data.success).toBe(true);
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

      const requestData = {
        staff_id: staffId,
        operation_type: 'create_calendar',
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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
      expect(responseData.data.success).toBe(false);
      expect(responseData.data.message).toContain('Staff member not found');
    });

    it('should handle missing email for calendar creation', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const mockStaff = {
        id: staffId,
        first_name: 'John',
        last_name: 'Smith',
        email: 'no-email@bestdoc.com',
        staff_type: 'Doctor',
        google_calendar_id: null,
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

      const requestData = {
        staff_id: staffId,
        operation_type: 'create_calendar',
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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
      expect(responseData.data.success).toBe(false);
      expect(responseData.data.message).toContain('Staff email is required');
    });

    it('should handle missing calendar ID for sharing', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const mockStaff = {
        id: staffId,
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        staff_type: 'Doctor',
        google_calendar_id: null,
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

      const requestData = {
        staff_id: staffId,
        operation_type: 'share_calendar',
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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
      expect(responseData.data.success).toBe(false);
      expect(responseData.data.message).toContain('Staff calendar ID is required');
    });

    it('should validate staff operation request', async () => {
      const requestData = {
        staff_id: 'invalid-uuid',
        operation_type: 'invalid_operation',
        force_retry: 'invalid-boolean',
        max_retries: 15, // Exceeds maximum
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.details).toHaveLength(4);
    });
  });

  describe('POST /api/calendar/retry - Bulk Retry', () => {
    it('should retry bulk operations successfully', async () => {
      const staffIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
      ];

      const mockStaff1 = {
        id: staffIds[0],
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        staff_type: 'Doctor',
        google_calendar_id: 'test-calendar-1@group.calendar.google.com',
      };

      const mockStaff2 = {
        id: staffIds[1],
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@example.com',
        staff_type: 'Nurse',
        google_calendar_id: 'test-calendar-2@group.calendar.google.com',
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

      mockGoogleCalendarService.shareCalendar
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      const requestData = {
        staff_ids: staffIds,
        operation_type: 'share_calendar',
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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
      expect(responseData.data.results).toHaveLength(2);
      expect(responseData.data.errors).toHaveLength(0);
      expect(responseData.data.summary.total).toBe(2);
      expect(responseData.data.summary.successful).toBe(2);
      expect(responseData.data.summary.failed).toBe(0);
    });

    it('should handle mixed success and failure in bulk retry', async () => {
      const staffIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
      ];

      const mockStaff1 = {
        id: staffIds[0],
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        staff_type: 'Doctor',
        google_calendar_id: 'test-calendar-1@group.calendar.google.com',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
              .mockResolvedValueOnce({ data: mockStaff1, error: null })
              .mockResolvedValueOnce({ data: null, error: { message: 'Staff not found' } }),
          })),
        })),
      });

      mockGoogleCalendarService.shareCalendar.mockResolvedValue({ success: true });

      const requestData = {
        staff_ids: staffIds,
        operation_type: 'share_calendar',
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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
      expect(responseData.data.results).toHaveLength(1);
      expect(responseData.data.errors).toHaveLength(1);
      expect(responseData.data.summary.successful).toBe(1);
      expect(responseData.data.summary.failed).toBe(1);
    });

    it('should validate bulk retry request', async () => {
      const requestData = {
        staff_ids: [],
        operation_type: 'invalid_operation',
        force_retry: 'invalid-boolean',
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Validation failed');
    });

    it('should validate maximum staff IDs limit', async () => {
      const staffIds = Array.from({ length: 21 }, (_, i) =>
        `123e4567-e89b-12d3-a456-42661417400${i}`
      );

      const requestData = {
        staff_ids: staffIds,
        operation_type: 'create_calendar',
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Validation failed');
    });
  });

  describe('GET /api/calendar/retry - Get Retryable Operations', () => {
    it('should get retryable operations successfully', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const mockOperations = [
        {
          id: 'op-1',
          staff_id: staffId,
          operation_type: 'create_calendar',
          operation_status: 'failed',
          retry_count: 1,
          max_retries: 3,
          error_code: 'GOOGLE_API_UNAVAILABLE',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'op-2',
          staff_id: staffId,
          operation_type: 'share_calendar',
          operation_status: 'failed',
          retry_count: 0,
          max_retries: 3,
          error_code: 'PERMISSION_DENIED',
          created_at: '2024-01-01T11:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              order: jest.fn(() => ({
                data: mockOperations,
                error: null,
              })),
            })),
          })),
        })),
      });

      (isRetryableError as any)
        .mockReturnValueOnce(true) // GOOGLE_API_UNAVAILABLE is retryable
        .mockReturnValueOnce(false); // PERMISSION_DENIED is not retryable

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/retry?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_id).toBe(staffId);
      expect(responseData.data.retryable_operations).toHaveLength(1);
      expect(responseData.data.total_count).toBe(1);
      expect(responseData.data.operation_types).toContain('create_calendar');
    });

    it('should filter by operation type', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';
      const operationType = 'create_calendar';
      const mockOperations = [
        {
          id: 'op-1',
          staff_id: staffId,
          operation_type: 'create_calendar',
          operation_status: 'failed',
          retry_count: 1,
          max_retries: 3,
          error_code: 'GOOGLE_API_UNAVAILABLE',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              order: jest.fn(() => ({
                data: mockOperations,
                error: null,
              })),
            })),
          })),
        })),
      });

      (isRetryableError as any).mockReturnValue(true);

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/retry?staff_id=${staffId}&operation_type=${operationType}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.retryable_operations).toHaveLength(1);
    });

    it('should validate staff_id parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/retry');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('staff_id');
    });

    it('should handle database errors', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            lt: jest.fn(() => ({
              order: jest.fn(() => ({
                data: null,
                error: { message: 'Database connection failed' },
              })),
            })),
          })),
        })),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/retry?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('InternalServerError');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
        method: 'POST',
        body: '',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
    });

    it('should handle service errors during retry', async () => {
      const operationLogId = '123e4567-e89b-12d3-a456-426614174000';
      const mockOperationLog = {
        id: operationLogId,
        staff_id: 'staff-123',
        operation_type: 'create_calendar',
        operation_status: 'failed',
        retry_count: 1,
        max_retries: 3,
        error_code: 'GOOGLE_API_UNAVAILABLE',
        error_message: 'API temporarily unavailable',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockOperationLog,
              error: null,
            }),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockRejectedValue(new Error('Database update failed')),
        })),
      });

      (isRetryableError as any).mockReturnValue(true);

      const requestData = {
        operation_log_id: operationLogId,
        force_retry: false,
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/retry', {
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
      expect(responseData.data.new_status).toBe('failed');
    });
  });
});
