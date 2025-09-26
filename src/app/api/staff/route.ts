import { getErrorDescription } from '@/lib/errorCodes';
import { getCalendarVerificationService } from '@/services/calendarVerificationService';
import { getGoogleCalendarService } from '@/services/googleCalendarService';
import { staffService } from '@/services/staffService';
import type { CreateStaff, StaffFilters } from '@/types';
import { CalendarStatusResponse } from '@/types/calendar';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/staff - Get all staff with optional filtering
export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query parameters
    const filters: StaffFilters = {};

    if (searchParams.has('first_name')) {
      filters.first_name = searchParams.get('first_name')!;
    }

    if (searchParams.has('last_name')) {
      filters.last_name = searchParams.get('last_name')!;
    }

    if (searchParams.has('staff_type')) {
      filters.staff_type = searchParams.get('staff_type') as any;
    }

    if (searchParams.has('status')) {
      filters.status = searchParams.get('status') as any;
    }


    if (searchParams.has('available_on_day')) {
      filters.available_on_day = parseInt(searchParams.get('available_on_day')!);
    }

    const staff = await staffService.getStaff(filters);

    // Add calendar status to each staff member
    const staffWithCalendarStatus = await Promise.all(
      staff.map(async (staffMember) => {
        const calendarStatus = await getStaffCalendarStatus(staffMember.id);
        return {
          ...staffMember,
          calendar_status: calendarStatus
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: staffWithCalendarStatus,
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch staff',
      },
      { status: 500 },
    );
  }
}

// POST /api/staff - Create a new staff member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract staff data
    const staffData: CreateStaff = {
      first_name: body.first_name,
      last_name: body.last_name,
      staff_type: body.staff_type,
      specialization: body.specialization,
      phone: body.phone,
      email: body.email?.trim() || 'no-email@bestdoc.com',
      telegram_user_id: body.telegram_user_id && body.telegram_user_id.trim() !== '' ? body.telegram_user_id : undefined,
      available_days: body.available_days || [1, 2, 3, 4, 5], // Default to Mon-Fri
      working_hours_start: body.working_hours_start || '09:00',
      working_hours_end: body.working_hours_end || '17:00',
      status: body.status || 'active',
      telegram_verified: body.telegram_verified || false,
    };

    // Validate required fields
    const validationErrors = validateStaffData(staffData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 },
      );
    }


    // Create staff member
    const staff = await staffService.createStaff(staffData);

    // Add calendar status to the response
    const calendarStatus = await getStaffCalendarStatus(staff.id);
    const staffWithCalendarStatus = {
      ...staff,
      calendar_status: calendarStatus
    };

    return NextResponse.json({
      success: true,
      data: staffWithCalendarStatus,
      message: 'Staff member created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff member:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create staff member',
      },
      { status: 500 },
    );
  }
}

// Helper function to validate staff data
function validateStaffData(data: CreateStaff): string[] {
  const errors: string[] = [];

  if (!data.first_name?.trim()) {
    errors.push('First name is required');
  }

  if (!data.last_name?.trim()) {
    errors.push('Last name is required');
  }

  if (!data.phone?.trim()) {
    errors.push('Phone number is required');
  }

  if (data.email && data.email.trim()) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  }

  if (!data.staff_type) {
    errors.push('Staff type is required');
  }

  if (data.available_days && !data.available_days.every(day => day >= 1 && day <= 7)) {
    errors.push('Invalid available days (must be 1-7)');
  }

  if (data.working_hours_start && data.working_hours_end) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.working_hours_start) || !timeRegex.test(data.working_hours_end)) {
      errors.push('Invalid working hours format (HH:MM)');
    } else {
      const startTime = new Date(`2000-01-01T${data.working_hours_start}:00`);
      const endTime = new Date(`2000-01-01T${data.working_hours_end}:00`);
      if (startTime >= endTime) {
        errors.push('Working hours start must be before end time');
      }
    }
  }

  // Validate Telegram User ID if provided
  if (data.telegram_user_id !== undefined && data.telegram_user_id !== null) {
    if (data.telegram_user_id.trim() !== '' && !/^\d+$/.test(data.telegram_user_id)) {
      errors.push('Telegram User ID must be numeric');
    }
  }

  return errors;
}

/**
 * Get calendar status for a staff member
 */
async function getStaffCalendarStatus(staffId: string): Promise<CalendarStatusResponse> {
  try {
    // Get staff information from database
    const staff = await staffService.getStaffMember(staffId);

    if (!staff) {
      return {
        staff_id: staffId,
        verification_status: 'not_required',
        error_code: 'STAFF_NOT_FOUND',
        error_message: 'Staff member not found',
        last_operation: 'status_check',
        last_operation_status: 'failed',
        last_operation_date: new Date().toISOString()
      };
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

    // Get verification status if enabled and staff has email
    if (staff.google_calendar_id && staff.email && staff.email !== 'no-email@bestdoc.com') {
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
