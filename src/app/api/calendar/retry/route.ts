/**
 * Calendar Retry API Endpoint
 *
 * Handles retrying failed calendar operations for staff members.
 * This endpoint provides retry functionality for various calendar operations.
 */

import { apiErrorHandler, CalendarError, generateRequestId, NotFoundError, ValidationError } from '@/lib/apiErrorHandler';
import { isRetryableError } from '@/lib/errorCodes';
import { supabase } from '@/lib/supabase';
import { getCalendarVerificationService } from '@/services/calendarVerificationService';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
import {
    CalendarErrorCode,
    CalendarOperationStatus,
    CalendarOperationType,
    RetryCalendarOperationResponse
} from '@/types/calendar';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const RetryOperationRequestSchema = z.object({
  operation_log_id: z.string().uuid('Invalid operation log ID format'),
  force_retry: z.boolean().optional().default(false)
});

const RetryStaffOperationRequestSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID format'),
  operation_type: z.enum([
    'create_calendar',
    'share_calendar',
    'verify_calendar',
    'create_event',
    'update_event',
    'delete_event'
  ]),
  force_retry: z.boolean().optional().default(false),
  max_retries: z.number().min(1).max(10).optional().default(3)
});

const BulkRetryRequestSchema = z.object({
  staff_ids: z.array(z.string().uuid()).min(1, 'At least one staff ID is required').max(20, 'Maximum 20 staff IDs allowed'),
  operation_type: z.enum([
    'create_calendar',
    'share_calendar',
    'verify_calendar'
  ]).optional(),
  force_retry: z.boolean().optional().default(false)
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /api/calendar/retry - Retry a specific calendar operation
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Check if this is a bulk retry request
    if (body.staff_ids && Array.isArray(body.staff_ids)) {
      return await handleBulkRetry(body, requestId);
    }

    // Check if this is a staff operation retry
    if (body.staff_id && body.operation_type) {
      return await handleStaffOperationRetry(body, requestId);
    }

    // Handle operation log retry
    const validationResult = RetryOperationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const { operation_log_id, force_retry } = validationResult.data;

    // Get operation log details
    const { data: operationLog, error: logError } = await supabase
      .from('calendar_operations_log')
      .select('*')
      .eq('id', operation_log_id)
      .single();

    if (logError || !operationLog) {
      throw new NotFoundError('Operation log', operation_log_id);
    }

    // Check if operation can be retried
    if (!force_retry && operationLog.retry_count >= operationLog.max_retries) {
      throw new CalendarError(
        'VERIFICATION_TIMEOUT' as CalendarErrorCode,
        'Maximum retry attempts exceeded',
        {
          retry_count: operationLog.retry_count,
          max_retries: operationLog.max_retries
        }
      );
    }

    // Check if error is retryable
    if (!force_retry && operationLog.error_code && !isRetryableError(operationLog.error_code)) {
      throw new CalendarError(
        operationLog.error_code,
        'Operation is not retryable',
        {
          error_code: operationLog.error_code
        }
      );
    }

    // Retry the operation
    const retryResult = await retryCalendarOperation(operationLog, force_retry);

    return apiErrorHandler.createSuccessResponse(retryResult, 'Operation retry completed successfully');

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Calendar retry');
  }
}

/**
 * GET /api/calendar/retry - Get retryable operations for a staff member
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');
    const operationType = searchParams.get('operation_type') as CalendarOperationType | null;

    if (!staffId) {
      throw new ValidationError([{
        field: 'staff_id',
        message: 'Staff ID is required'
      }]);
    }

    // Build query for retryable operations
    let query = supabase
      .from('calendar_operations_log')
      .select('*')
      .eq('staff_id', staffId)
      .eq('operation_status', 'failed')
      .lt('retry_count', 'max_retries')
      .order('created_at', { ascending: false });

    if (operationType) {
      query = query.eq('operation_type', operationType);
    }

    const { data: operations, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch retryable operations: ${error.message}`);
    }

    // Filter operations that are actually retryable
    const retryableOperations = operations?.filter(op =>
      !op.error_code || isRetryableError(op.error_code)
    ) || [];

    return apiErrorHandler.createSuccessResponse({
      staff_id: staffId,
      retryable_operations: retryableOperations,
      total_count: retryableOperations.length,
      operation_types: [...new Set(retryableOperations.map(op => op.operation_type))]
    });

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Get retryable operations');
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Handle bulk retry operations
 */
async function handleBulkRetry(body: any, requestId: string): Promise<NextResponse> {
  const validationResult = BulkRetryRequestSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      },
      { status: 400 }
    );
  }

  const { staff_ids, operation_type, force_retry } = validationResult.data;

  const results = [];
  const errors = [];

  for (const staffId of staff_ids) {
    try {
      if (operation_type) {
        // Retry specific operation type for all staff
        const result = await retryStaffOperation(staffId, operation_type, force_retry);
        results.push(result);
      } else {
        // Retry all failed operations for staff
        const result = await retryAllFailedOperations(staffId, force_retry);
        results.push(result);
      }
    } catch (error) {
      errors.push({
        staff_id: staffId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      results,
      errors,
      summary: {
        total: staff_ids.length,
        successful: results.length,
        failed: errors.length
      }
    }
  });
}

/**
 * Handle staff operation retry
 */
async function handleStaffOperationRetry(body: any, requestId: string): Promise<NextResponse> {
  const validationResult = RetryStaffOperationRequestSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      },
      { status: 400 }
    );
  }

  const { staff_id, operation_type, force_retry, max_retries } = validationResult.data;

  const result = await retryStaffOperation(staff_id, operation_type, force_retry, max_retries);

  return NextResponse.json({
    success: true,
    data: result
  });
}

/**
 * Retry a specific calendar operation
 */
async function retryCalendarOperation(
  operationLog: any,
  forceRetry: boolean = false
): Promise<RetryCalendarOperationResponse> {
  const newRetryCount = operationLog.retry_count + 1;

  try {
    // Update operation log to mark as retrying
    await supabase
      .from('calendar_operations_log')
      .update({
        operation_status: 'retrying',
        retry_count: newRetryCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', operationLog.id);

    // Execute the retry based on operation type
    let success = false;
    let errorCode: CalendarErrorCode | undefined;
    let errorMessage: string | undefined;

    switch (operationLog.operation_type) {
      case 'create_calendar':
        success = await retryCreateCalendar(operationLog);
        break;
      case 'share_calendar':
        success = await retryShareCalendar(operationLog);
        break;
      case 'verify_calendar':
        success = await retryVerifyCalendar(operationLog);
        break;
      case 'create_event':
        success = await retryCreateEvent(operationLog);
        break;
      case 'update_event':
        success = await retryUpdateEvent(operationLog);
        break;
      case 'delete_event':
        success = await retryDeleteEvent(operationLog);
        break;
      default:
        throw new Error(`Unknown operation type: ${operationLog.operation_type}`);
    }

    // Update operation log with result
    const newStatus: CalendarOperationStatus = success ? 'success' : 'failed';
    await supabase
      .from('calendar_operations_log')
      .update({
        operation_status: newStatus,
        error_code: errorCode,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', operationLog.id);

    return {
      operation_log_id: operationLog.id,
      new_status: newStatus,
      retry_count: newRetryCount,
      message: success
        ? 'Operation retry completed successfully'
        : 'Operation retry failed'
    };

  } catch (error) {
    console.error(`❌ Failed to retry operation ${operationLog.id}:`, error);

    // Update operation log with error
    await supabase
      .from('calendar_operations_log')
      .update({
        operation_status: 'failed',
        error_code: 'INTERNAL_ERROR',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', operationLog.id);

    return {
      operation_log_id: operationLog.id,
      new_status: 'failed',
      retry_count: newRetryCount,
      message: 'Operation retry failed with internal error'
    };
  }
}

/**
 * Retry staff operation
 */
async function retryStaffOperation(
  staffId: string,
  operationType: CalendarOperationType,
  forceRetry: boolean = false,
  maxRetries: number = 3
): Promise<{
  staff_id: string;
  operation_type: CalendarOperationType;
  success: boolean;
  message: string;
  error_code?: CalendarErrorCode;
}> {
  try {
    // Get staff information
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .single();

    if (staffError || !staff) {
      throw new Error('Staff member not found');
    }

    let success = false;
    let errorCode: CalendarErrorCode | undefined;
    let message = '';

    switch (operationType) {
      case 'create_calendar':
        if (!staff.email || staff.email === 'no-email@bestdoc.com') {
          throw new Error('Staff email is required for calendar creation');
        }
        success = await retryCreateCalendarForStaff(staff);
        message = success ? 'Calendar created successfully' : 'Calendar creation failed';
        break;

      case 'share_calendar':
        if (!staff.google_calendar_id) {
          throw new Error('Staff calendar ID is required for sharing');
        }
        success = await retryShareCalendarForStaff(staff);
        message = success ? 'Calendar shared successfully' : 'Calendar sharing failed';
        break;

      case 'verify_calendar':
        if (!staff.google_calendar_id) {
          throw new Error('Staff calendar ID is required for verification');
        }
        success = await retryVerifyCalendarForStaff(staff);
        message = success ? 'Calendar verification started' : 'Calendar verification failed';
        break;

      default:
        throw new Error(`Unsupported operation type: ${operationType}`);
    }

    return {
      staff_id: staffId,
      operation_type: operationType,
      success,
      message,
      error_code: errorCode
    };

  } catch (error) {
    console.error(`❌ Failed to retry ${operationType} for staff ${staffId}:`, error);

    return {
      staff_id: staffId,
      operation_type: operationType,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error_code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Retry all failed operations for a staff member
 */
async function retryAllFailedOperations(
  staffId: string,
  forceRetry: boolean = false
): Promise<{
  staff_id: string;
  total_operations: number;
  successful: number;
  failed: number;
  results: Array<{
    operation_type: CalendarOperationType;
    success: boolean;
    message: string;
  }>;
}> {
  // Get all failed operations for staff
  const { data: operations, error } = await supabase
    .from('calendar_operations_log')
    .select('*')
    .eq('staff_id', staffId)
    .eq('operation_status', 'failed')
    .lt('retry_count', 'max_retries')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch operations: ${error.message}`);
  }

  const results = [];
  let successful = 0;
  let failed = 0;

  for (const operation of operations || []) {
    try {
      const retryResult = await retryCalendarOperation(operation, forceRetry);

      results.push({
        operation_type: operation.operation_type,
        success: retryResult.new_status === 'success',
        message: retryResult.message
      });

      if (retryResult.new_status === 'success') {
        successful++;
      } else {
        failed++;
      }
    } catch (error) {
      results.push({
        operation_type: operation.operation_type,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      failed++;
    }
  }

  return {
    staff_id: staffId,
    total_operations: operations?.length || 0,
    successful,
    failed,
    results
  };
}

// =============================================================================
// OPERATION-SPECIFIC RETRY FUNCTIONS
// =============================================================================

async function retryCreateCalendar(operationLog: any): Promise<boolean> {
  // Implementation would depend on the specific operation data
  // This is a placeholder - actual implementation would use the Google Calendar service
  return false;
}

async function retryShareCalendar(operationLog: any): Promise<boolean> {
  // Implementation would depend on the specific operation data
  return false;
}

async function retryVerifyCalendar(operationLog: any): Promise<boolean> {
  // Implementation would depend on the specific operation data
  return false;
}

async function retryCreateEvent(operationLog: any): Promise<boolean> {
  // Implementation would depend on the specific operation data
  return false;
}

async function retryUpdateEvent(operationLog: any): Promise<boolean> {
  // Implementation would depend on the specific operation data
  return false;
}

async function retryDeleteEvent(operationLog: any): Promise<boolean> {
  // Implementation would depend on the specific operation data
  return false;
}

async function retryCreateCalendarForStaff(staff: any): Promise<boolean> {
  try {
    const googleCalendarService = getGoogleCalendarService();

    const result = await googleCalendarService.createCalendar({
      staff_id: staff.id,
      staff_name: `${staff.first_name} ${staff.last_name}`,
      staff_type: staff.staff_type,
      staff_email: staff.email
    });

    if (result.success) {
      // Update staff record with calendar ID
      await supabase
        .from('staff')
        .update({
          google_calendar_id: result.calendarId,
          calendar_verification_status: 'not_required',
          calendar_error_code: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', staff.id);
    }

    return result.success;
  } catch (error) {
    console.error('❌ Failed to create calendar for staff:', error);
    return false;
  }
}

async function retryShareCalendarForStaff(staff: any): Promise<boolean> {
  try {
    const googleCalendarService = getGoogleCalendarService();

    const result = await googleCalendarService.shareCalendar({
      staff_id: staff.id,
      google_calendar_id: staff.google_calendar_id,
      staff_email: staff.email,
      permission_level: 'reader'
    });

    return result.success;
  } catch (error) {
    console.error('❌ Failed to share calendar for staff:', error);
    return false;
  }
}

async function retryVerifyCalendarForStaff(staff: any): Promise<boolean> {
  try {
    const verificationService = getCalendarVerificationService();

    const result = await verificationService.startVerification({
      staff_id: staff.id,
      google_calendar_id: staff.google_calendar_id,
      staff_email: staff.email
    });

    return result.success;
  } catch (error) {
    console.error('❌ Failed to verify calendar for staff:', error);
    return false;
  }
}
