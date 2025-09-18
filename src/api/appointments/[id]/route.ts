import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import type { StaffAssignment, UpdateAppointment } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/appointments/[id] - Get a single appointment by ID with staff assignments
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
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

    // Get staff assignments for this appointment
    const staffAssignments = await appointmentStaffService.getStaffForAppointment(params.id);

    return NextResponse.json({
      success: true,
      data: {
        appointment,
        staff_assignments: staffAssignments,
      },
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch appointment',
      },
      { status: 500 },
    );
  }
}

// PUT /api/appointments/[id] - Update an existing appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();

    // Check if appointment exists
    const existingAppointment = await appointmentService.getAppointment(params.id);
    if (!existingAppointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment not found',
        },
        { status: 404 },
      );
    }

    // Extract appointment data
    const updateData: Partial<UpdateAppointment> = {
      patient_id: body.patient_id,
      appointment_type: body.appointment_type,
      appointment_date: body.appointment_date,
      start_time: body.start_time,
      duration_minutes: body.duration_minutes,
      status: body.status,
      custom_fields: body.custom_fields,
      transportation_type: body.transportation_type,
      transportation_method: body.transportation_method,
      driver_id: body.driver_id,
      notes: body.notes,
      recurring_rule: body.recurring_rule,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateAppointment] === undefined) {
        delete updateData[key as keyof UpdateAppointment];
      }
    });

    // Validate required fields if they are being updated
    const validationErrors = validateAppointmentUpdateData(updateData);
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

    // Update appointment
    const updatedAppointment = await appointmentService.updateAppointment(params.id, updateData);

    // Handle staff assignment updates if provided
    if (body.staff_assignments !== undefined) {
      // Remove all existing staff assignments
      await appointmentStaffService.removeAllStaffFromAppointment(params.id);

      // Assign new staff if provided (no validation)
      if (body.staff_assignments.length > 0) {
        const staffAssignments: StaffAssignment[] = body.staff_assignments;

        // Assign staff to appointment without validation
        const assignedStaff = await appointmentStaffService.assignStaffToAppointment(
          params.id,
          staffAssignments,
        );
      }
    }

    // Fetch updated appointment with staff assignments
    const finalAppointment = await appointmentService.getAppointment(params.id);
    const staffForAppointment = await appointmentStaffService.getStaffForAppointment(params.id);

    return NextResponse.json({
      success: true,
      data: {
        appointment: finalAppointment,
        staff_assignments: staffForAppointment,
      },
      message: 'Appointment updated successfully',
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update appointment',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appointments/[id] - Delete an appointment
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

    // Delete appointment
    await appointmentService.deleteAppointment(params.id);

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete appointment',
      },
      { status: 500 },
    );
  }
}

// Helper function to validate appointment update data
function validateAppointmentUpdateData(data: Partial<UpdateAppointment>): string[] {
  const errors: string[] = [];

  if (data.appointment_date !== undefined) {
    const appointmentDate = new Date(data.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      errors.push('Appointment date must be today or in the future');
    }
  }

  if (data.start_time !== undefined) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.start_time)) {
      errors.push('Invalid start time format (HH:MM)');
    }
  }

  if (data.duration_minutes !== undefined && (data.duration_minutes < 1 || data.duration_minutes > 1440)) {
    errors.push('Duration must be between 1 and 1440 minutes');
  }

  if (data.transportation_type === 'driver' && !data.driver_id) {
    errors.push('Driver ID is required when transportation type is driver');
  }

  if (data.transportation_type === 'self_transport' && !data.transportation_method) {
    errors.push('Transportation method is required when transportation type is self-transport');
  }

  return errors;
}


// Helper function to get appointment end time
function getAppointmentEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toTimeString().slice(0, 5); // HH:MM format
}
