/**
 * API Tests for Calendar Verification Endpoint
 *
 * Tests all HTTP methods (POST, GET, PUT, DELETE) for the
 * /api/calendar/verify endpoint with comprehensive scenarios.
 */

import { DELETE, GET, POST, PUT } from '@/app/api/calendar/verify/route';
import { getCalendarVerificationService } from '@/services/calendarVerificationService';
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/services/calendarVerificationService');

// Mock the verification service
const mockVerificationService = {
  startVerification: jest.fn(),
  checkVerificationStatus: jest.fn(),
  retryVerification: jest.fn(),
  cancelVerification: jest.fn(),
};

(getCalendarVerificationService as any) = jest.fn(() => mockVerificationService);

describe('/api/calendar/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/calendar/verify - Start Verification', () => {
    it('should start verification successfully', async () => {
      const requestData = {
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      mockVerificationService.startVerification.mockResolvedValue({
        success: true,
        verificationStatus: 'pending',
        verificationEventId: 'verification-event-123',
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
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
      expect(responseData.data.staff_id).toBe(requestData.staff_id);
      expect(responseData.data.verification_status).toBe('pending');
      expect(responseData.data.verification_event_id).toBe('verification-event-123');
      expect(responseData.message).toContain('Verification process started');
      expect(mockVerificationService.startVerification).toHaveBeenCalledWith(requestData);
    });

    it('should handle verification already completed', async () => {
      const requestData = {
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      mockVerificationService.startVerification.mockResolvedValue({
        success: true,
        verificationStatus: 'verified',
        verificationEventId: 'existing-verification-123',
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.verification_status).toBe('verified');
      expect(responseData.message).toContain('Calendar verification completed successfully');
    });

    it('should handle verification failure', async () => {
      const requestData = {
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      mockVerificationService.startVerification.mockResolvedValue({
        success: false,
        verificationStatus: 'failed',
        errorCode: 'VERIFICATION_EVENT_CREATION_FAILED',
        errorMessage: 'Failed to create verification event',
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
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
      expect(responseData.error_code).toBe('VERIFICATION_EVENT_CREATION_FAILED');
      expect(responseData.message).toContain('Failed to create verification event');
    });

    it('should validate required fields', async () => {
      const invalidRequestData = {
        staff_id: 'invalid-uuid',
        google_calendar_id: '',
        staff_email: 'invalid-email',
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
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
      expect(responseData.errors.some((err: any) => err.field === 'staff_id')).toBe(true);
      expect(responseData.errors.some((err: any) => err.field === 'google_calendar_id')).toBe(true);
      expect(responseData.errors.some((err: any) => err.field === 'staff_email')).toBe(true);
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
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

    it('should handle service errors', async () => {
      const requestData = {
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
      };

      mockVerificationService.startVerification.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('InternalServerError');
    });
  });

  describe('GET /api/calendar/verify - Check Status', () => {
    it('should check verification status successfully', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockVerificationService.checkVerificationStatus.mockResolvedValue({
        staffId,
        googleCalendarId: 'test-calendar-id@group.calendar.google.com',
        verificationStatus: 'pending',
        verificationDate: null,
        errorCode: null,
        errorMessage: null,
        lastAttempt: '2024-01-01T10:00:00Z',
        attemptsRemaining: 2,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_id).toBe(staffId);
      expect(responseData.data.verification_status).toBe('pending');
      expect(responseData.data.attempts_remaining).toBe(2);
      expect(responseData.message).toContain('Verification is pending');
      expect(mockVerificationService.checkVerificationStatus).toHaveBeenCalledWith(staffId);
    });

    it('should handle verified status', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockVerificationService.checkVerificationStatus.mockResolvedValue({
        staffId,
        googleCalendarId: 'test-calendar-id@group.calendar.google.com',
        verificationStatus: 'verified',
        verificationDate: '2024-01-01T10:00:00Z',
        errorCode: null,
        errorMessage: null,
        lastAttempt: '2024-01-01T10:00:00Z',
        attemptsRemaining: 0,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.verification_status).toBe('verified');
      expect(responseData.data.verification_date).toBe('2024-01-01T10:00:00Z');
      expect(responseData.message).toContain('Calendar verification completed successfully');
    });

    it('should handle failed status', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockVerificationService.checkVerificationStatus.mockResolvedValue({
        staffId,
        googleCalendarId: 'test-calendar-id@group.calendar.google.com',
        verificationStatus: 'failed',
        verificationDate: null,
        errorCode: 'VERIFICATION_TIMEOUT',
        errorMessage: 'Verification process timed out',
        lastAttempt: '2024-01-01T10:00:00Z',
        attemptsRemaining: 0,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.verification_status).toBe('failed');
      expect(responseData.data.error_code).toBe('VERIFICATION_TIMEOUT');
      expect(responseData.message).toContain('Calendar verification failed');
    });

    it('should handle not_required status', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockVerificationService.checkVerificationStatus.mockResolvedValue({
        staffId,
        googleCalendarId: '',
        verificationStatus: 'not_required',
        verificationDate: null,
        errorCode: null,
        errorMessage: null,
        lastAttempt: null,
        attemptsRemaining: 0,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.verification_status).toBe('not_required');
      expect(responseData.message).toContain('Calendar verification is not required');
    });

    it('should validate staff_id parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/verify');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('staff_id');
    });

    it('should validate staff_id format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/calendar/verify?staff_id=invalid-uuid'
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('staff_id');
    });

    it('should handle service errors', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockVerificationService.checkVerificationStatus.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${staffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('InternalServerError');
    });
  });

  describe('PUT /api/calendar/verify - Retry Verification', () => {
    it('should retry verification successfully', async () => {
      const requestData = {
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
        max_attempts: 5,
        timeout_hours: 48,
        send_email: true,
      };

      mockVerificationService.retryVerification.mockResolvedValue({
        success: true,
        verificationStatus: 'pending',
        verificationEventId: 'retry-verification-123',
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_id).toBe(requestData.staff_id);
      expect(responseData.data.verification_status).toBe('pending');
      expect(responseData.message).toContain('Verification retry started');
      expect(mockVerificationService.retryVerification).toHaveBeenCalledWith(
        requestData.staff_id,
        {
          maxAttempts: 5,
          timeoutHours: 48,
          sendEmail: true,
        }
      );
    });

    it('should retry with default options', async () => {
      const requestData = {
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockVerificationService.retryVerification.mockResolvedValue({
        success: true,
        verificationStatus: 'pending',
        verificationEventId: 'retry-verification-123',
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(mockVerificationService.retryVerification).toHaveBeenCalledWith(
        requestData.staff_id,
        {}
      );
    });

    it('should handle retry failure', async () => {
      const requestData = {
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockVerificationService.retryVerification.mockResolvedValue({
        success: false,
        verificationStatus: 'failed',
        errorCode: 'VERIFICATION_TIMEOUT',
        errorMessage: 'Maximum verification attempts exceeded',
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_code).toBe('VERIFICATION_TIMEOUT');
    });

    it('should validate retry request parameters', async () => {
      const invalidRequestData = {
        staff_id: 'invalid-uuid',
        max_attempts: 15, // Exceeds maximum of 10
        timeout_hours: 200, // Exceeds maximum of 168
      };

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
        method: 'PUT',
        body: JSON.stringify(invalidRequestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors).toHaveLength(3);
    });

    it('should handle service errors during retry', async () => {
      const requestData = {
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      mockVerificationService.retryVerification.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
        method: 'PUT',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await PUT(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('InternalServerError');
    });
  });

  describe('DELETE /api/calendar/verify - Cancel Verification', () => {
    it('should cancel verification successfully', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockVerificationService.cancelVerification.mockResolvedValue({
        success: true,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${staffId}`
      );

      const response = await DELETE(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.staff_id).toBe(staffId);
      expect(responseData.message).toContain('Verification process cancelled successfully');
      expect(mockVerificationService.cancelVerification).toHaveBeenCalledWith(staffId);
    });

    it('should handle cancellation failure', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockVerificationService.cancelVerification.mockResolvedValue({
        success: false,
        errorMessage: 'Failed to cancel verification',
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${staffId}`
      );

      const response = await DELETE(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_code).toBe('VERIFICATION_CANCEL_FAILED');
    });

    it('should validate staff_id parameter for cancellation', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/verify');

      const response = await DELETE(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
      expect(responseData.errors[0].field).toBe('staff_id');
    });

    it('should validate staff_id format for cancellation', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/calendar/verify?staff_id=invalid-uuid'
      );

      const response = await DELETE(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
    });

    it('should handle service errors during cancellation', async () => {
      const staffId = '123e4567-e89b-12d3-a456-426614174000';

      mockVerificationService.cancelVerification.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${staffId}`
      );

      const response = await DELETE(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('InternalServerError');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
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

    it('should handle null request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
        method: 'POST',
        body: 'null',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
    });

    it('should handle extra fields in request body', async () => {
      const requestData = {
        staff_id: '123e4567-e89b-12d3-a456-426614174000',
        google_calendar_id: 'test-calendar-id@group.calendar.google.com',
        staff_email: 'john.smith@example.com',
        extra_field: 'should be ignored',
      };

      mockVerificationService.startVerification.mockResolvedValue({
        success: true,
        verificationStatus: 'pending',
        verificationEventId: 'verification-event-123',
      });

      const request = new NextRequest('http://localhost:3000/api/calendar/verify', {
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
      // Should only pass validated fields to service
      expect(mockVerificationService.startVerification).toHaveBeenCalledWith({
        staff_id: requestData.staff_id,
        google_calendar_id: requestData.google_calendar_id,
        staff_email: requestData.staff_email,
      });
    });

    it('should handle very long staff_id', async () => {
      const longStaffId = 'a'.repeat(1000);
      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${longStaffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
    });

    it('should handle special characters in staff_id', async () => {
      const specialStaffId = 'staff-id-with-special-chars!@#$%^&*()';
      const request = new NextRequest(
        `http://localhost:3000/api/calendar/verify?staff_id=${specialStaffId}`
      );

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error_type).toBe('ValidationError');
    });
  });
});
