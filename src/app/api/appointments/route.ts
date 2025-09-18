import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
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
    console.log('Request body received:', JSON.stringify(body, null, 2));

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
      mini_notes: body.mini_notes,
      full_notes: body.full_notes,
      pickup_instructions: body.pickup_instructions,
      recurring_rule: body.recurring_rule,
    };

    // Validate required fields
    console.log('Validating appointment data:', appointmentData);
    const validationErrors = validateAppointmentData(appointmentData);
    console.log('Appointment validation errors:', validationErrors);
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
    console.log('Creating appointment with data:', appointmentData);
    const appointment = await appointmentService.createAppointment(appointmentData);
    console.log('Created appointment:', {
      id: appointment.id,
      date: appointment.appointment_date,
      time: appointment.start_time,
      duration: appointment.duration_minutes
    });

    // Handle staff assignments if provided (no validation)
    const staffAssignments: StaffAssignment[] = body.staff_assignments || [];
    let assignedStaff = [];

    if (staffAssignments && staffAssignments.length > 0) {
      // Assign staff to appointment without validation
      assignedStaff = await appointmentStaffService.assignStaffToAppointment(
        appointment.id,
        staffAssignments,
      );

      // Send Telegram notifications to assigned staff (only for same-day appointments)
      await sendTelegramNotifications(appointment, assignedStaff);
    }

    // Generate recurring appointments if recurring rule is provided
    let recurringAppointments: any[] = [];
    if (appointmentData.recurring_rule) {
      try {
        console.log('Generating recurring appointments for rule:', appointmentData.recurring_rule);

        // Calculate how many occurrences to generate (default to 12 weeks for weekly, 3 months for monthly, etc.)
        let occurrences = 12; // Default
        if (appointmentData.recurring_rule.frequency === 'daily') {
          occurrences = 30; // 30 days
        } else if (appointmentData.recurring_rule.frequency === 'weekly') {
          occurrences = 12; // 12 weeks
        } else if (appointmentData.recurring_rule.frequency === 'monthly') {
          occurrences = 6; // 6 months
        } else if (appointmentData.recurring_rule.frequency === 'yearly') {
          occurrences = 2; // 2 years
        }

        // Respect end conditions
        if (appointmentData.recurring_rule.end_occurrences) {
          occurrences = Math.min(occurrences, appointmentData.recurring_rule.end_occurrences);
        }

        // Generate recurring appointments
        recurringAppointments = await appointmentService.generateRecurringAppointments(
          appointment.id,
          occurrences
        );

        console.log(`Generated ${recurringAppointments.length} recurring appointments`);

        // Assign staff to all recurring appointments
        if (staffAssignments && staffAssignments.length > 0) {
          for (const recurringAppointment of recurringAppointments) {
            try {
              await appointmentStaffService.assignStaffToAppointment(
                recurringAppointment.id,
                staffAssignments
              );
            } catch (error) {
              console.error(`Failed to assign staff to recurring appointment ${recurringAppointment.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error generating recurring appointments:', error);
        // Don't fail the entire request if recurring generation fails
      }
    }

    // Fetch appointment with staff assignments
    const appointmentWithStaff = await appointmentService.getAppointment(appointment.id);
    const staffForAppointment = await appointmentStaffService.getStaffForAppointment(appointment.id);

    return NextResponse.json({
      success: true,
      data: {
        appointment: appointmentWithStaff,
        staff_assignments: staffForAppointment,
        recurring_appointments: recurringAppointments,
      },
      message: `Appointment created successfully${recurringAppointments.length > 0 ? ` with ${recurringAppointments.length} recurring instances` : ''}`,
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



// Helper function to get appointment end time
function getAppointmentEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toTimeString().slice(0, 5); // HH:MM format
}

// Helper function to send Telegram notifications
async function sendTelegramNotifications(appointment: any, staffAssignments: any[]): Promise<void> {
  // Check if Telegram is configured
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('📱 Telegram not configured, skipping notifications');
    return;
  }

  // Import timezone utilities
  const { getTodayDubai, utcToDateString } = await import('@/utils/timezone');

  // Check if appointment is for today in Dubai timezone
  const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00Z');
  const appointmentDateString = utcToDateString(appointmentDate);
  const todayString = utcToDateString(getTodayDubai());

  if (appointmentDateString !== todayString) {
    console.log(`📱 Skipping immediate Telegram notifications - appointment is for ${appointmentDateString}, not today (${todayString}). Will be included in daily agenda.`);
    return;
  }

  console.log(`📱 Starting immediate Telegram notifications for same-day appointment ${appointment.id} to ${staffAssignments.length} staff members`);

  // Send Telegram notifications to all assigned staff members using enhanced notification service
  const result = await telegramNotificationService.sendAppointmentNotificationsToStaff(
    appointment,
    staffAssignments,
    'created'
  );

  if (result.success) {
    const successCount = result.results.filter(r => r.success).length;
    console.log(`📱 Telegram notifications completed: ${successCount}/${result.results.length} successful`);
  } else {
    console.error(`❌ Failed to send Telegram notifications:`, result.results);
  }
}
