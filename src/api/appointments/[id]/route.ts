import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { staffService } from '@/services/staffService';
import { googleCalendarService } from '@/services/googleCalendarService';
import type { UpdateAppointment, StaffAssignment } from '@/types';

// GET /api/appointments/[id] - Get a single appointment by ID with staff assignments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointment = await appointmentService.getAppointment(params.id);
    
    if (!appointment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Appointment not found' 
        },
        { status: 404 }
      );
    }

    // Get staff assignments for this appointment
    const staffAssignments = await appointmentStaffService.getStaffForAppointment(params.id);

    return NextResponse.json({ 
      success: true, 
      data: {
        appointment,
        staff_assignments: staffAssignments
      }
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch appointment' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/appointments/[id] - Update an existing appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Check if appointment exists
    const existingAppointment = await appointmentService.getAppointment(params.id);
    if (!existingAppointment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Appointment not found' 
        },
        { status: 404 }
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
      google_event_ids: body.google_event_ids,
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
          details: validationErrors 
        },
        { status: 400 }
      );
    }

    // Update appointment
    const updatedAppointment = await appointmentService.updateAppointment(params.id, updateData);

    // Handle staff assignment updates if provided
    if (body.staff_assignments !== undefined) {
      // Remove all existing staff assignments
      await appointmentStaffService.removeAllStaffFromAppointment(params.id);

      // Delete existing Google Calendar events
      await deleteGoogleCalendarEvents(existingAppointment);

      // Assign new staff if provided
      if (body.staff_assignments.length > 0) {
        const staffAssignments: StaffAssignment[] = body.staff_assignments;
        
        // Validate staff assignments
        const staffValidationErrors = await validateStaffAssignments(staffAssignments, updatedAppointment);
        if (staffValidationErrors.length > 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Staff assignment validation failed', 
              details: staffValidationErrors 
            },
            { status: 400 }
          );
        }

        // Assign staff to appointment
        const assignedStaff = await appointmentStaffService.assignStaffToAppointment(
          params.id,
          staffAssignments
        );

        // Create new Google Calendar events
        await createGoogleCalendarEvents(updatedAppointment, assignedStaff);
      }
    }

    // Fetch updated appointment with staff assignments
    const finalAppointment = await appointmentService.getAppointment(params.id);
    const staffForAppointment = await appointmentStaffService.getStaffForAppointment(params.id);

    return NextResponse.json({ 
      success: true, 
      data: {
        appointment: finalAppointment,
        staff_assignments: staffForAppointment
      },
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update appointment' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/[id] - Delete an appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if appointment exists
    const appointment = await appointmentService.getAppointment(params.id);
    if (!appointment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Appointment not found' 
        },
        { status: 404 }
      );
    }

    // Delete Google Calendar events
    await deleteGoogleCalendarEvents(appointment);

    // Remove all staff assignments
    await appointmentStaffService.removeAllStaffFromAppointment(params.id);

    // Delete appointment
    await appointmentService.deleteAppointment(params.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Appointment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete appointment' 
      },
      { status: 500 }
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

// Helper function to validate staff assignments
async function validateStaffAssignments(
  staffAssignments: StaffAssignment[], 
  appointment: any
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
          appointment.appointment_date
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
        eventData
      );

      // Update appointment with Google Calendar event ID
      await appointmentService.addGoogleCalendarEventId(
        appointment.id,
        assignment.staff_id,
        eventId
      );

      // Update appointment staff assignment with Google Calendar event ID
      await appointmentStaffService.updateGoogleCalendarEventId(
        assignment.id,
        eventId
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
