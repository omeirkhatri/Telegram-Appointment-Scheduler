import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { googleCalendarService } from '@/services/googleCalendarService';
import { patientService } from '@/services/patientService';
import { staffService } from '@/services/staffService';
import type { AppointmentFilters, CreateAppointment, StaffAssignment } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/appointments - Get all appointments with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query parameters
    const filters: AppointmentFilters = {};

    if (searchParams.has('patient_id')) {
      filters.patient_id = searchParams.get('patient_id')!;
    }

    if (searchParams.has('appointment_type')) {
      filters.appointment_type = searchParams.get('appointment_type') as any;
    }

    if (searchParams.has('status')) {
      filters.status = searchParams.get('status') as any;
    }

    if (searchParams.has('appointment_date')) {
      filters.appointment_date = searchParams.get('appointment_date')!;
    }

    if (searchParams.has('date_from')) {
      filters.date_from = searchParams.get('date_from')!;
    }

    if (searchParams.has('date_to')) {
      filters.date_to = searchParams.get('date_to')!;
    }

    if (searchParams.has('driver_id')) {
      filters.driver_id = searchParams.get('driver_id')!;
    }

    if (searchParams.has('transportation_type')) {
      filters.transportation_type = searchParams.get('transportation_type') as any;
    }

    if (searchParams.has('has_recurring_rule')) {
      filters.has_recurring_rule = searchParams.get('has_recurring_rule') === 'true';
    }

    const appointments = await appointmentService.getAppointments(filters);

    return NextResponse.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch appointments',
      },
      { status: 500 },
    );
  }
}

// POST /api/appointments - Create a new appointment with staff assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract appointment data
    const appointmentData: CreateAppointment = {
      patient_id: body.patient_id,
      appointment_type: body.appointment_type,
      appointment_date: body.appointment_date,
      start_time: body.start_time,
      duration_minutes: body.duration_minutes,
      status: body.status || 'scheduled',
      custom_fields: body.custom_fields || {},
      transportation_type: body.transportation_type,
      transportation_method: body.transportation_method,
      driver_id: body.driver_id,
      notes: body.notes,
      recurring_rule: body.recurring_rule,
      google_event_ids: body.google_event_ids || {},
    };

    // Validate required fields
    const validationErrors = validateAppointmentData(appointmentData);
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

    // Create appointment
    const appointment = await appointmentService.createAppointment(appointmentData);

    // Handle staff assignments if provided
    const staffAssignments: StaffAssignment[] = body.staff_assignments || [];
    let assignedStaff = [];

    if (staffAssignments.length > 0) {
      // Validate staff assignments
      const staffValidationErrors = await validateStaffAssignments(staffAssignments, appointment);
      if (staffValidationErrors.length > 0) {
        // Delete the appointment if staff assignment fails
        await appointmentService.deleteAppointment(appointment.id);
        return NextResponse.json(
          {
            success: false,
            error: 'Staff assignment validation failed',
            details: staffValidationErrors,
          },
          { status: 400 },
        );
      }

      // Assign staff to appointment
      assignedStaff = await appointmentStaffService.assignStaffToAppointment(
        appointment.id,
        staffAssignments,
      );

      // Create Google Calendar events for staff with calendar integration
      await createGoogleCalendarEvents(appointment, assignedStaff);
    }

    // Fetch appointment with staff assignments
    const appointmentWithStaff = await appointmentService.getAppointment(appointment.id);
    const staffForAppointment = await appointmentStaffService.getStaffForAppointment(appointment.id);

    return NextResponse.json({
      success: true,
      data: {
        appointment: appointmentWithStaff,
        staff_assignments: staffForAppointment,
      },
      message: 'Appointment created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create appointment',
      },
      { status: 500 },
    );
  }
}

// Helper function to validate appointment data
function validateAppointmentData(data: CreateAppointment): string[] {
  const errors: string[] = [];

  if (!data.patient_id?.trim()) {
    errors.push('Patient ID is required');
  }

  if (!data.appointment_type) {
    errors.push('Appointment type is required');
  }

  if (!data.appointment_date?.trim()) {
    errors.push('Appointment date is required');
  } else {
    const appointmentDate = new Date(data.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      errors.push('Appointment date must be today or in the future');
    }
  }

  if (!data.start_time?.trim()) {
    errors.push('Start time is required');
  } else {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.start_time)) {
      errors.push('Invalid start time format (HH:MM)');
    }
  }

  if (!data.duration_minutes || data.duration_minutes < 1 || data.duration_minutes > 1440) {
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
      // Get patient data for proper event formatting
      const patient = await patientService.getPatient(appointment.patient_id);
      if (!patient) {
        throw new Error(`Patient not found for appointment ${appointment.id}`);
      }

      // Create staff-specific event based on staff type
      const eventId = await googleCalendarService.createStaffSpecificEvent(
        appointment,
        patient,
        staff,
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

// Helper function to get appointment end time
function getAppointmentEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toTimeString().slice(0, 5); // HH:MM format
}
