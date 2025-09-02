import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/services';
import { validateAppointmentData } from '@/lib/validations/appointment';
import type { CreateAppointment, StaffAssignment } from '@/types';

// POST /api/appointments/[id]/copy - Copy an existing appointment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const body = await request.json();

    // Get the source appointment
    const sourceAppointment = await appointmentService.getAppointment(appointmentId);
    if (!sourceAppointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source appointment not found'
        },
        { status: 404 }
      );
    }

    // Create appointment data for the copy
    const appointmentData: CreateAppointment = {
      patient_id: body.patient_id || sourceAppointment.patient_id,
      appointment_type: body.appointment_type || sourceAppointment.appointment_type,
      appointment_date: body.appointment_date, // This should be provided by the form
      start_time: body.start_time || sourceAppointment.start_time,
      duration_minutes: body.duration_minutes || sourceAppointment.duration_minutes,
      status: body.status || 'scheduled', // Reset to scheduled for new appointment
      custom_fields: body.custom_fields || sourceAppointment.custom_fields || {},
      transportation_type: body.transportation_type || sourceAppointment.transportation_type,
      transportation_method: body.transportation_method || sourceAppointment.transportation_method,
      driver_id: body.driver_id || sourceAppointment.driver_id,
      notes: body.notes || sourceAppointment.notes,
      recurring_rule: body.recurring_rule || undefined, // Don't copy recurring rules by default
      google_event_ids: {}, // Clear Google event IDs for new appointment
    };

    // Validate the appointment data
    const validationErrors = validateAppointmentData(appointmentData);
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

    // Create the copied appointment
    const newAppointment = await appointmentService.createAppointment(appointmentData);

    // Handle staff assignments if provided
    const staffAssignments: StaffAssignment[] = body.staff_assignments || [];
    let assignedStaff = [];

    if (staffAssignments.length > 0) {
      // Assign staff to the new appointment
      for (const assignment of staffAssignments) {
        try {
          const assigned = await appointmentService.assignStaffToAppointment(
            newAppointment.id,
            assignment.staff_id,
            assignment.role,
            assignment.is_primary
          );
          assignedStaff.push(assigned);
        } catch (error) {
          console.error(`Failed to assign staff ${assignment.staff_id}:`, error);
          // Continue with other assignments even if one fails
        }
      }
    } else {
      // If no staff assignments provided, copy from source appointment
      const sourceStaff = await appointmentService.getAppointmentStaff(appointmentId);
      for (const staffMember of sourceStaff) {
        try {
          const assigned = await appointmentService.assignStaffToAppointment(
            newAppointment.id,
            staffMember.staff_id,
            staffMember.role,
            staffMember.is_primary
          );
          assignedStaff.push(assigned);
        } catch (error) {
          console.error(`Failed to copy staff assignment ${staffMember.staff_id}:`, error);
          // Continue with other assignments even if one fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        appointment: newAppointment,
        assignedStaff
      },
      message: 'Appointment copied successfully'
    });

  } catch (error) {
    console.error('Error copying appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to copy appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
