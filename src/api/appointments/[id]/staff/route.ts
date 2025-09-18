import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/appointments/[id]/staff - Get staff assignments for an appointment
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check if appointment exists
    const appointment = await appointmentService.getAppointment(params.id);
    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment not found',
        },
        { status: 404 },
      );
    }

    // Get staff assignments
    const staffAssignments = await appointmentStaffService.getStaffForAppointment(params.id);
    const staffSummary = await appointmentStaffService.getAppointmentStaffSummary(params.id);

    return NextResponse.json({
      success: true,
      data: {
        staff_assignments: staffAssignments,
        summary: staffSummary,
      },
    });
  } catch (error) {
    console.error('Error fetching appointment staff:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch appointment staff',
      },
      { status: 500 },
    );
  }
}

// POST /api/appointments/[id]/staff - Assign staff to an appointment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { staff_assignments } = body;

    // Check if appointment exists
    const appointment = await appointmentService.getAppointment(params.id);
    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment not found',
        },
        { status: 404 },
      );
    }

    if (!staff_assignments || !Array.isArray(staff_assignments)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Staff assignments array is required',
        },
        { status: 400 },
      );
    }

    // Remove existing staff assignments (no validation)
    await appointmentStaffService.removeAllStaffFromAppointment(params.id);

    // Assign new staff
    const assignedStaff = await appointmentStaffService.assignStaffToAppointment(
      params.id,
      staff_assignments,
    );

    // Fetch updated staff assignments
    const updatedStaffAssignments = await appointmentStaffService.getStaffForAppointment(params.id);
    const staffSummary = await appointmentStaffService.getAppointmentStaffSummary(params.id);

    return NextResponse.json({
      success: true,
      data: {
        staff_assignments: updatedStaffAssignments,
        summary: staffSummary,
      },
      message: 'Staff assigned successfully',
    });
  } catch (error) {
    console.error('Error assigning staff to appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign staff to appointment',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appointments/[id]/staff - Remove all staff from an appointment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check if appointment exists
    const appointment = await appointmentService.getAppointment(params.id);
    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment not found',
        },
        { status: 404 },
      );
    }

    // Remove all staff assignments
    await appointmentStaffService.removeAllStaffFromAppointment(params.id);

    return NextResponse.json({
      success: true,
      message: 'All staff removed from appointment successfully',
    });
  } catch (error) {
    console.error('Error removing staff from appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove staff from appointment',
      },
      { status: 500 },
    );
  }
}


// Helper function to get appointment end time
function getAppointmentEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toTimeString().slice(0, 5); // HH:MM format
}
