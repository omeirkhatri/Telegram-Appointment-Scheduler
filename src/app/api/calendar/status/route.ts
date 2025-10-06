/**
 * Calendar Status API Endpoint
 *
 * Provides comprehensive calendar status information for staff members.
 * This endpoint checks calendar health, verification status, and error information.
 */

import { apiErrorHandler, generateRequestId, ValidationError } from '@/lib/apiErrorHandler';
import { supabase } from '@/lib/supabase';
import { getCalendarVerificationService } from '@/services/calendarVerificationService';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
import { CalendarErrorCode, CalendarStatusResponse } from '@/types/calendar';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST VALIDATION SCHEMAS
// =============================================================================

const StaffCalendarStatusRequestSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID format')
});

const CalendarHealthRequestSchema = z.object({
  google_calendar_id: z.string().min(1, 'Google Calendar ID is required')
});

const BulkStatusRequestSchema = z.object({
  staff_ids: z.array(z.string().uuid()).min(1, 'At least one staff ID is required').max(50, 'Maximum 50 staff IDs allowed'),
  include_verification: z.boolean().optional().default(true),
  include_health: z.boolean().optional().default(true)
});

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * GET /api/calendar/status - Get calendar status for a staff member
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');
    const googleCalendarId = searchParams.get('google_calendar_id');

    // Handle single staff member status
    if (staffId) {
      const validationResult = StaffCalendarStatusRequestSchema.safeParse({ staff_id: staffId });
      if (!validationResult.success) {
        const validationErrors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new ValidationError(validationErrors);
      }

      const status = await getStaffCalendarStatus(staffId);
      return apiErrorHandler.createSuccessResponse(status);
    }

    // Handle calendar health check
    if (googleCalendarId) {
      const validationResult = CalendarHealthRequestSchema.safeParse({ google_calendar_id: googleCalendarId });
      if (!validationResult.success) {
        const validationErrors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new ValidationError(validationErrors);
      }

      const health = await getCalendarHealth(googleCalendarId);
      return apiErrorHandler.createSuccessResponse(health);
    }

    // Handle bulk status check
    const staffIdsParam = searchParams.get('staff_ids');
    if (staffIdsParam) {
      const staffIds = staffIdsParam.split(',').map(id => id.trim());
      const includeVerification = searchParams.get('include_verification') !== 'false';
      const includeHealth = searchParams.get('include_health') !== 'false';

      const validationResult = BulkStatusRequestSchema.safeParse({
        staff_ids: staffIds,
        include_verification,
        include_health
      });

      if (!validationResult.success) {
        const validationErrors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        throw new ValidationError(validationErrors);
      }

      const bulkStatus = await getBulkCalendarStatus(staffIds, includeVerification, includeHealth);
      return apiErrorHandler.createSuccessResponse(bulkStatus, undefined, {
        total: staffIds.length,
        checked_at: new Date().toISOString()
      });
    }

    // No valid parameters provided
    throw new ValidationError([{
      field: 'parameters',
      message: 'Provide either staff_id, google_calendar_id, or staff_ids parameter'
    }]);

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Calendar status check');
  }
}

/**
 * POST /api/calendar/status - Get bulk calendar status
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = BulkStatusRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      throw new ValidationError(validationErrors);
    }

    const { staff_ids, include_verification, include_health } = validationResult.data;

    // Get bulk status
    const bulkStatus = await getBulkCalendarStatus(staff_ids, include_verification, include_health);

    return apiErrorHandler.createSuccessResponse(bulkStatus, undefined, {
      total_staff: staff_ids.length,
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    return apiErrorHandler.handleError(error, requestId, 'Bulk calendar status check');
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get comprehensive calendar status for a single staff member
 */
async function getStaffCalendarStatus(staffId: string): Promise<CalendarStatusResponse> {
  try {
    // Get staff information from database
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        first_name,
        last_name,
        email,
        google_calendar_id,
        calendar_verification_status,
        calendar_verification_date,
        calendar_error_code,
        updated_at
      `)
      .eq('id', staffId)
      .single();

    if (staffError || !staff) {
      throw new Error(`Staff member not found: ${staffError?.message || 'Unknown error'}`);
    }

    // Initialize response
    const status: CalendarStatusResponse = {
      staff_id: staffId,
      google_calendar_id: staff.google_calendar_id,
      verification_status: staff.calendar_verification_status || 'not_required',
      verification_date: staff.calendar_verification_date,
      error_code: staff.calendar_error_code,
      error_message: staff.calendar_error_code ? getErrorDescription(staff.calendar_error_code)?.description : undefined,
      last_operation: 'unknown',
      last_operation_status: 'unknown',
      last_operation_date: staff.updated_at
    };

    // Check calendar health if calendar ID exists
    if (staff.google_calendar_id) {
      try {
        const googleCalendarService = getGoogleCalendarService();
        const calendarExists = await googleCalendarService.calendarExists(staff.google_calendar_id);

        if (!calendarExists) {
          status.error_code = 'CALENDAR_NOT_FOUND';
          status.error_message = 'Calendar not found or not accessible';
          status.last_operation_status = 'failed';
        } else {
          status.last_operation_status = 'success';
        }
      } catch (error) {
        status.error_code = 'GOOGLE_API_UNAVAILABLE';
        status.error_message = 'Failed to check calendar health';
        status.last_operation_status = 'failed';
      }
    }

    // Get verification status if enabled
    if (staff.google_calendar_id && staff.email) {
      try {
        const verificationService = getCalendarVerificationService();
        const verificationStatus = await verificationService.checkVerificationStatus(staffId);

        status.verification_status = verificationStatus.verificationStatus;
        status.verification_date = verificationStatus.verificationDate;

        if (verificationStatus.errorCode) {
          status.error_code = verificationStatus.errorCode;
          status.error_message = verificationStatus.errorMessage;
        }
      } catch (error) {
        console.warn(`Failed to check verification status for staff ${staffId}:`, error);
      }
    }

    return status;

  } catch (error) {
    console.error(`❌ Failed to get calendar status for staff ${staffId}:`, error);

    return {
      staff_id: staffId,
      verification_status: 'failed',
      error_code: 'INTERNAL_ERROR',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      last_operation: 'status_check',
      last_operation_status: 'failed',
      last_operation_date: new Date().toISOString()
    };
  }
}

/**
 * Get calendar health information
 */
async function getCalendarHealth(googleCalendarId: string): Promise<{
  google_calendar_id: string;
  exists: boolean;
  accessible: boolean;
  health_status: 'healthy' | 'unhealthy' | 'unknown';
  last_checked: string;
  error_code?: CalendarErrorCode;
  error_message?: string;
}> {
  try {
    const googleCalendarService = getGoogleCalendarService();

    // Check if calendar exists
    const exists = await googleCalendarService.calendarExists(googleCalendarId);

    if (!exists) {
      return {
        google_calendar_id: googleCalendarId,
        exists: false,
        accessible: false,
        health_status: 'unhealthy',
        last_checked: new Date().toISOString(),
        error_code: 'CALENDAR_NOT_FOUND',
        error_message: 'Calendar not found or not accessible'
      };
    }

    // Get calendar status
    const calendarStatus = await googleCalendarService.getCalendarStatus(googleCalendarId);

    return {
      google_calendar_id: googleCalendarId,
      exists: true,
      accessible: true,
      health_status: 'healthy',
      last_checked: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ Failed to check calendar health for ${googleCalendarId}:`, error);

    return {
      google_calendar_id: googleCalendarId,
      exists: false,
      accessible: false,
      health_status: 'unhealthy',
      last_checked: new Date().toISOString(),
      error_code: 'GOOGLE_API_UNAVAILABLE',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get bulk calendar status for multiple staff members
 */
async function getBulkCalendarStatus(
  staffIds: string[],
  includeVerification: boolean = true,
  includeHealth: boolean = true
): Promise<{
  staff_statuses: CalendarStatusResponse[];
  summary: {
    total: number;
    verified: number;
    pending: number;
    failed: number;
    not_required: number;
    healthy: number;
    unhealthy: number;
  };
}> {
  const staffStatuses: CalendarStatusResponse[] = [];
  const summary = {
    total: staffIds.length,
    verified: 0,
    pending: 0,
    failed: 0,
    not_required: 0,
    healthy: 0,
    unhealthy: 0
  };

  // Process each staff member
  for (const staffId of staffIds) {
    try {
      const status = await getStaffCalendarStatus(staffId);
      staffStatuses.push(status);

      // Update summary counts
      switch (status.verification_status) {
        case 'verified':
          summary.verified++;
          break;
        case 'pending':
          summary.pending++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'not_required':
          summary.not_required++;
          break;
      }

      // Update health counts
      if (status.last_operation_status === 'success') {
        summary.healthy++;
      } else if (status.last_operation_status === 'failed') {
        summary.unhealthy++;
      }

    } catch (error) {
      console.error(`❌ Failed to get status for staff ${staffId}:`, error);

      staffStatuses.push({
        staff_id: staffId,
        verification_status: 'failed',
        error_code: 'INTERNAL_ERROR',
        error_message: 'Failed to get status',
        last_operation: 'bulk_status_check',
        last_operation_status: 'failed',
        last_operation_date: new Date().toISOString()
      });

      summary.failed++;
      summary.unhealthy++;
    }
  }

  return {
    staff_statuses: staffStatuses,
    summary
  };
}
