import { appointmentStaffService } from '@/services/appointmentStaffService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/appointment-staff - Get staff assignments with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query parameters
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const staffId = searchParams.get('staff_id');

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'start_date and end_date are required',
      }, { status: 400 });
    }

    // Get staff assignments for the date range
    const staffAssignments = await appointmentStaffService.getAppointmentsWithStaffForDateRange(
      startDate,
      endDate
    );

    // Filter by staff ID if provided
    const filteredAssignments = staffId
      ? staffAssignments.filter(assignment => assignment.staff_id === staffId)
      : staffAssignments;

    return NextResponse.json({
      success: true,
      data: filteredAssignments,
    });
  } catch (error) {
    console.error('Error fetching staff assignments:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch staff assignments',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
