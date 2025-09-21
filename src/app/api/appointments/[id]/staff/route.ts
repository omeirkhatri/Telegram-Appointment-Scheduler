import { appointmentStaffService } from '@/services/appointmentStaffService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/appointments/[id]/staff - Get staff assignments for an appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const staffAssignments = await appointmentStaffService.getStaffForAppointment(id);

    return NextResponse.json({
      success: true,
      data: {
        staff_assignments: staffAssignments,
      },
    });
  } catch (error) {
    console.error('Error fetching staff assignments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch staff assignments',
      },
      { status: 500 },
    );
  }
}
