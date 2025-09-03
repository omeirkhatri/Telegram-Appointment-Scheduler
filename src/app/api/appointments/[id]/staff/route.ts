import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { googleCalendarService } from '@/services/googleCalendarService';
import { staffService } from '@/services/staffService';
import type { StaffAssignment } from '@/types';
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

    // Validate staff assignments
    const staffValidationErrors = await validateStaffAssignments(staff_assignments, appointment);
    if (staffValidationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Staff assignment validation failed',
          details: staffValidationErrors,
        },
        { status: 400 },
      );
    }

    // Remove existing staff assignments
    await appointmentStaffService.removeAllStaffFromAppointment(params.id);

    // Delete existing Google Calendar events
    await deleteGoogleCalendarEvents(appointment);

    // Assign new staff
    const assignedStaff = await appointmentStaffService.assignStaffToAppointment(
      params.id,
      staff_assignments,
    );

    // Create Google Calendar events
    await createGoogleCalendarEvents(appointment, assignedStaff);

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

    // Delete Google Calendar events
    await deleteGoogleCalendarEvents(appointment);

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

// Helper function to validate staff assignments
async function validateStaffAssignments(
  staffAssignments: StaffAssignment[],
  appointment: any,
): Promise<string[]> {
  const errors: string[] = [];

  for (const assignment of staffAssignments) {
    // Check if staff exists
    const staff = await staffService.getStaffMember(assignment.staff_id);
    if (!staff) {
      errors.push(`Staff member with ID ${assignment.staff_id} not found`);
      continue;
    }

    // Check if staff is active
    if (staff.status !== 'active') {
      errors.push(`Staff member ${staff.first_name} ${staff.last_name} is not active`);
      continue;
    }

    // Check staff availability
    const appointmentDate = new Date(appointment.appointment_date);
    const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1-7 format

    if (!staff.available_days.includes(adjustedDay)) {
      errors.push(`Staff member ${staff.first_name} ${staff.last_name} is not available on this day`);
      continue;
    }

    // Check working hours
    const startTimeDate = new Date(`2000-01-01T${appointment.start_time}:00`);
    const endTimeDate = new Date(`2000-01-01T${getAppointmentEndTime(appointment.start_time, appointment.duration_minutes)}:00`);
    const workingStartDate = new Date(`2000-01-01T${staff.working_hours_start}:00`);
    const workingEndDate = new Date(`2000-01-01T${staff.working_hours_end}:00`);

    if (startTimeDate < workingStartDate || endTimeDate > workingEndDate) {
      errors.push(`Staff member ${staff.first_name} ${staff.last_name} is not available during this time`);
      continue;
    }

    // Check Google Calendar availability if integrated
    if (staff.google_calendar_id) {
      try {
        const isAvailable = await googleCalendarService.checkStaffAvailability(
          staff,
          appointment.start_time,
          getAppointmentEndTime(appointment.start_time, appointment.duration_minutes),
          appointment.appointment_date,
        );

        if (!isAvailable) {
          errors.push(`Staff member ${staff.first_name} ${staff.last_name} has conflicting appointments`);
        }
      } catch (error) {
        console.error('Error checking calendar availability:', error);
        errors.push(`Could not verify calendar availability for ${staff.first_name} ${staff.last_name}`);
      }
    }
  }

  return errors;
}

// Helper function to create Google Calendar events
async function createGoogleCalendarEvents(appointment: any, staffAssignments: any[]): Promise<void> {
  for (const assignment of staffAssignments) {
    const staff = await staffService.getStaffMember(assignment.staff_id);
    if (!staff || !staff.google_calendar_id) {
      continue;
    }

    try {
      const eventData = {
        summary: `Appointment - ${appointment.appointment_type}`,
        description: `Patient appointment\nType: ${appointment.appointment_type}\nNotes: ${appointment.notes || 'No notes'}`,
        start: {
          dateTime: `${appointment.appointment_date}T${appointment.start_time}:00+04:00`,
          timeZone: 'Asia/Dubai',
        },
        end: {
          dateTime: `${appointment.appointment_date}T${getAppointmentEndTime(appointment.start_time, appointment.duration_minutes)}:00+04:00`,
          timeZone: 'Asia/Dubai',
        },
      };

      const eventId = await googleCalendarService.createCalendarEvent(
        staff.google_calendar_id,
        eventData,
      );

      // Update appointment with Google Calendar event ID
      await appointmentService.addGoogleCalendarEventId(
        appointment.id,
        assignment.staff_id,
        eventId,
      );

      // Update appointment staff assignment with Google Calendar event ID
      await appointmentStaffService.updateGoogleCalendarEventId(
        assignment.id,
        eventId,
      );
    } catch (error) {
      console.error(`Failed to create Google Calendar event for staff ${assignment.staff_id}:`, error);
    }
  }
}

// Helper function to delete Google Calendar events
async function deleteGoogleCalendarEvents(appointment: any): Promise<void> {
  if (!appointment.google_event_ids) {
    return;
  }

  for (const [staffId, eventId] of Object.entries(appointment.google_event_ids)) {
    try {
      const staff = await staffService.getStaffMember(staffId);
      if (!staff || !staff.google_calendar_id) {
        continue;
      }

      await googleCalendarService.deleteCalendarEvent(staff.google_calendar_id, eventId as string);
    } catch (error) {
      console.error(`Failed to delete Google Calendar event ${eventId} for staff ${staffId}:`, error);
    }
  }
}

// Helper function to get appointment end time
function getAppointmentEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toTimeString().slice(0, 5); // HH:MM format
}
