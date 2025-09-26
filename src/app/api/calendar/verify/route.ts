/**
 * Calendar Verification API Endpoint
 *
 * Handles calendar verification requests for staff members.
 * This endpoint starts, checks, and manages the verification process.
 */

import { apiErrorHandler, CalendarError, generateRequestId, ValidationError } from '@/lib/apiErrorHandler';
import { getCalendarVerificationService } from '@/services/calendarVerificationService';
import { CalendarErrorCode, CalendarVerificationStatus, VerifyCalendarRequest } from '@/types/calendar';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const VerifyCalendarRequestSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID format'),
  google_calendar_id: z.string().min(1, 'Google Calendar ID is required'),
  staff_email: z.string().email('Invalid email format')
});

const CheckVerificationRequestSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID format')
});

const RetryVerificationRequestSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID format'),
  max_attempts: z.number().min(1).max(10).optional(),
  timeout_hours: z.number().min(1).max(168).optional(), // Max 1 week
  send_email: z.boolean().optional()
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /api/calendar/verify - Start calendar verification process
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = VerifyCalendarRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const requestData: VerifyCalendarRequest = validationResult.data;

    // Start verification process
    const verificationService = getCalendarVerificationService();
    const result = await verificationService.startVerification(requestData);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.errorMessage || 'Verification failed',
        error_code: result.errorCode || 'UNKNOWN_ERROR',
        error_description: result.errorMessage || 'Verification failed',
        suggested_actions: ['Check your Google Calendar configuration', 'Contact support if the issue persists'],
        retryable: true,
        timestamp: new Date().toISOString(),
        request_id: requestId
      }, { status: 400 });
    }

    return apiErrorHandler.createSuccessResponse({
      staff_id: requestData.staff_id,
      verification_status: result.verificationStatus,
      verification_event_id: result.verificationEventId,
      message: getVerificationMessage(result.verificationStatus)
    }, 'Verification process started successfully');

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Calendar verification');
  }
}

/**
 * GET /api/calendar/verify - Check verification status
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');

    if (!staffId) {
      throw new ValidationError([{
        field: 'staff_id',
        message: 'Staff ID is required'
      }]);
    }

    // Validate staff ID format
    const validationResult = CheckVerificationRequestSchema.safeParse({ staff_id: staffId });
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    // Check verification status
    const verificationService = getCalendarVerificationService();
    const status = await verificationService.checkVerificationStatus(staffId);

    return apiErrorHandler.createSuccessResponse({
      staff_id: status.staffId,
      google_calendar_id: status.googleCalendarId,
      verification_status: status.verificationStatus,
      verification_date: status.verificationDate,
      error_code: status.errorCode,
      error_message: status.errorMessage,
      last_attempt: status.lastAttempt,
      attempts_remaining: status.attemptsRemaining,
      message: getVerificationStatusMessage(status.verificationStatus, status.attemptsRemaining)
    });

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Calendar verification status check');
  }
}

/**
 * PUT /api/calendar/verify - Retry verification process
 */
export async function PUT(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = RetryVerificationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const { staff_id, ...options } = validationResult.data;

    // Retry verification process
    const verificationService = getCalendarVerificationService();
    const result = await verificationService.retryVerification(staff_id, options);

    if (!result.success) {
      throw new CalendarError(
        result.errorCode || 'UNKNOWN_ERROR',
        result.errorMessage || 'Verification retry failed'
      );
    }

    return apiErrorHandler.createSuccessResponse({
      staff_id,
      verification_status: result.verificationStatus,
      verification_event_id: result.verificationEventId,
      message: getRetryMessage(result.verificationStatus)
    }, 'Verification retry completed successfully');

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Calendar verification retry');
  }
}

/**
 * DELETE /api/calendar/verify - Cancel verification process
 */
export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');

    if (!staffId) {
      throw new ValidationError([{
        field: 'staff_id',
        message: 'Staff ID is required'
      }]);
    }

    // Validate staff ID format
    const validationResult = CheckVerificationRequestSchema.safeParse({ staff_id: staffId });
    if (!validationResult.success) {
      const validationErrors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    // Cancel verification process
    const verificationService = getCalendarVerificationService();
    const result = await verificationService.cancelVerification(staffId);

    if (!result.success) {
      throw new CalendarError(
        'VERIFICATION_CANCEL_FAILED' as CalendarErrorCode,
        result.errorMessage || 'Failed to cancel verification'
      );
    }

    return apiErrorHandler.createSuccessResponse({
      staff_id: staffId,
      message: 'Verification process cancelled successfully'
    }, 'Verification cancelled successfully');

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Calendar verification cancellation');
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get user-friendly message for verification status
 */
function getVerificationMessage(status: CalendarVerificationStatus): string {
  switch (status) {
    case 'pending':
      return 'Verification process started. Please check your email and accept the test event invitation.';
    case 'verified':
      return 'Calendar verification completed successfully.';
    case 'failed':
      return 'Calendar verification failed. Please try again or contact support.';
    case 'not_required':
      return 'Calendar verification is not required for this staff member.';
    default:
      return 'Unknown verification status.';
  }
}

/**
 * Get user-friendly message for verification status check
 */
function getVerificationStatusMessage(status: CalendarVerificationStatus, attemptsRemaining: number): string {
  switch (status) {
    case 'pending':
      return `Verification is pending. ${attemptsRemaining} attempts remaining.`;
    case 'verified':
      return 'Calendar verification completed successfully.';
    case 'failed':
      return 'Calendar verification failed. You can retry the process.';
    case 'not_required':
      return 'Calendar verification is not required for this staff member.';
    default:
      return 'Unknown verification status.';
  }
}

/**
 * Get user-friendly message for retry operation
 */
function getRetryMessage(status: CalendarVerificationStatus): string {
  switch (status) {
    case 'pending':
      return 'Verification retry started. Please check your email for the new test event.';
    case 'verified':
      return 'Calendar verification completed successfully.';
    case 'failed':
      return 'Verification retry failed. Please contact support if the issue persists.';
    default:
      return 'Verification retry completed.';
  }
}
