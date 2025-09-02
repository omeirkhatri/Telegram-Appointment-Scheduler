import { googleCalendarService } from '@/services/googleCalendarService';
import { staffService } from '@/services/staffService';
import type { CreateStaff, StaffFilters } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/staff - Get all staff with optional filtering
export async function GET(request: NextRequest) {
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

    if (searchParams.has('has_google_calendar')) {
      filters.has_google_calendar = searchParams.get('has_google_calendar') === 'true';
    }

    if (searchParams.has('available_on_day')) {
      filters.available_on_day = parseInt(searchParams.get('available_on_day')!);
    }

    const staff = await staffService.getStaff(filters);

    return NextResponse.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch staff'
      },
      { status: 500 }
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
      email: body.email,
      google_calendar_id: body.google_calendar_id,
      available_days: body.available_days || [1, 2, 3, 4, 5], // Default to Mon-Fri
      working_hours_start: body.working_hours_start || '09:00',
      working_hours_end: body.working_hours_end || '17:00',
      status: body.status || 'active',
      email_notifications_enabled: body.email_notifications_enabled !== false,
    };

    // Validate required fields
    const validationErrors = validateStaffData(staffData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    // Validate Google Calendar ID if provided
    if (staffData.google_calendar_id) {
      const isValidFormat = googleCalendarService.validateCalendarId(staffData.google_calendar_id);
      if (!isValidFormat) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid Google Calendar ID format'
          },
          { status: 400 }
        );
      }

      // Test calendar connection
      const isConnected = await googleCalendarService.testCalendarConnection(staffData.google_calendar_id);
      if (!isConnected) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unable to connect to Google Calendar. Please check the calendar ID and permissions.'
          },
          { status: 400 }
        );
      }
    }

    // Create staff member
    const staff = await staffService.createStaff(staffData);

    return NextResponse.json({
      success: true,
      data: staff,
      message: 'Staff member created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff member:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create staff member'
      },
      { status: 500 }
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

  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else {
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

  return errors;
}
