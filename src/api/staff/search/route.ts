import { staffService } from '@/services/staffService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/staff/search - Search staff with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const searchTerm = searchParams.get('q') || '';
    const staffType = searchParams.get('staff_type') || '';
    const status = searchParams.get('status') || '';
    const hasGoogleCalendar = searchParams.get('has_google_calendar');
    const availableOnDay = searchParams.get('available_on_day');

    let staff;

    if (searchTerm) {
      // Use search functionality
      staff = await staffService.searchStaff(searchTerm);
    } else if (staffType) {
      // Filter by staff type
      staff = await staffService.getStaffByType(staffType);
    } else if (status === 'active') {
      // Get active staff
      staff = await staffService.getActiveStaff();
    } else if (hasGoogleCalendar === 'true') {
      // Get staff with Google Calendar
      staff = await staffService.getStaffWithGoogleCalendar();
    } else if (availableOnDay) {
      // Get staff available on specific day
      staff = await staffService.getStaffAvailableOnDay(parseInt(availableOnDay));
    } else {
      // Use general filtering
      const filters: any = {};
      if (hasGoogleCalendar !== null) {
        filters.has_google_calendar = hasGoogleCalendar === 'true';
      }
      if (status) {
        filters.status = status;
      }
      if (staffType) {
        filters.staff_type = staffType;
      }
      staff = await staffService.getStaff(filters);
    }

    return NextResponse.json({
      success: true,
      data: staff,
      count: staff.length
    });
  } catch (error) {
    console.error('Error searching staff:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search staff'
      },
      { status: 500 }
    );
  }
}
