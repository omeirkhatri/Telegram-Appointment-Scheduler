import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import type { AppointmentFilters, CreateAppointment, StaffAssignment } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import { 
  createErrorResponse, 
  buildTimezoneContext, 
  shouldIncludeTimezoneMetadata,
  enhanceAppointmentWithTimezone,
  shouldUseLegacyFormat,
  getApiVersion,
  validateApiVersion,
  formatResponseForVersion,
  addVersionHeaders
} from '@/lib/apiUtils';
import { resolveTimezone } from '@/utils/timezone';

// GET /api/appointments - Get all appointments with optional filtering
export async function GET(request: NextRequest) {
  try {
    // Validate API version
    const versionValidation = validateApiVersion(request);
    if (!versionValidation.valid) {
      const errorResponse = createErrorResponse(
        versionValidation.error!,
        { supportedVersions: ['1.0', '1.1'] },
        request
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

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

    // Build timezone context and resolution
    const timezoneContext = await buildTimezoneContext(request);
    const timezoneResolution = resolveTimezone(timezoneContext);
    const includeTimezone = shouldIncludeTimezoneMetadata(request);
    const apiVersion = getApiVersion(request);
    const useLegacyFormat = shouldUseLegacyFormat(apiVersion);

    // Enhance appointments with timezone metadata if requested
    let enhancedAppointments = appointments;
    if (includeTimezone && !useLegacyFormat) {
      enhancedAppointments = appointments.map(appointment => 
        enhanceAppointmentWithTimezone(appointment, timezoneResolution)
      );
    }

    const response = formatResponseForVersion(enhancedAppointments, request, includeTimezone ? timezoneResolution : undefined);
    const jsonResponse = NextResponse.json(response);
    return await addVersionHeaders(jsonResponse, request);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    const errorResponse = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch appointments',
      undefined,
      request
    );
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// POST /api/appointments - Create a new appointment with staff assignment
export async function POST(request: NextRequest) {
  try {
    // Validate API version
    const versionValidation = validateApiVersion(request);
    if (!versionValidation.valid) {
      const errorResponse = createErrorResponse(
        versionValidation.error!,
        { supportedVersions: ['1.0', '1.1'] },
        request
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.log('=== POST /api/appointments called ===');
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
    console.log('Checking for recurring rule:', appointmentData.recurring_rule);
    console.log('Type of recurring_rule:', typeof appointmentData.recurring_rule);
    console.log('Is recurring_rule truthy:', !!appointmentData.recurring_rule);
    if (appointmentData.recurring_rule) {
      try {
        console.log('Generating recurring appointments for rule:', appointmentData.recurring_rule);
        console.log('Appointment ID for generation:', appointment.id);

        // Calculate how many occurrences to generate based on the rule
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

        // Respect end conditions - handle both end_occurrences and end_date
        if (appointmentData.recurring_rule.end_occurrences) {
          // end_occurrences means total appointments, so we need to generate (end_occurrences - 1) additional appointments
          // because the base appointment counts as occurrence 1
          occurrences = Math.max(0, appointmentData.recurring_rule.end_occurrences - 1);
          console.log(`End after ${appointmentData.recurring_rule.end_occurrences} occurrences means generating ${occurrences} additional appointments (total: ${appointmentData.recurring_rule.end_occurrences})`);
        } else if (appointmentData.recurring_rule.end_date) {
          // Calculate occurrences based on end date
          const baseDate = new Date(appointmentData.appointment_date);
          const endDate = new Date(appointmentData.recurring_rule.end_date);

          if (endDate > baseDate) {
            // For daily frequency, calculate the exact number of days
            if (appointmentData.recurring_rule.frequency === 'daily') {
              const timeDiff = endDate.getTime() - baseDate.getTime();
              const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
              occurrences = Math.floor(daysDiff / appointmentData.recurring_rule.interval);
            } else {
              // For other frequencies, calculate more accurately
              const timeDiff = endDate.getTime() - baseDate.getTime();
              switch (appointmentData.recurring_rule.frequency) {
                case 'weekly':
                  // For weekly recurrence, count the actual number of selected days within the date range
                  if (appointmentData.recurring_rule.days_of_week && appointmentData.recurring_rule.days_of_week.length > 0) {
                    let count = 0;
                    const currentDate = new Date(baseDate);
                    const endDate = new Date(appointmentData.recurring_rule.end_date);

                    // Count each selected day of the week within the date range
                    while (currentDate <= endDate) {
                      const dayOfWeek = currentDate.getDay();
                      // Convert Sunday (0) to 7 to match our day numbering (1=Monday, 7=Sunday)
                      const normalizedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

                      if (appointmentData.recurring_rule.days_of_week.includes(normalizedDay)) {
                        count++;
                      }
                      currentDate.setDate(currentDate.getDate() + 1);
                    }
                    occurrences = count - 1; // Subtract 1 because the base appointment is already created
                    console.log(`Weekly recurrence calculation: found ${count} selected days, generating ${occurrences} additional appointments`);
                  } else {
                    occurrences = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7 * appointmentData.recurring_rule.interval));
                  }
                  break;
                case 'biweekly':
                  // For bi-weekly recurrence, count occurrences every 2 weeks
                  if (appointmentData.recurring_rule.days_of_week && appointmentData.recurring_rule.days_of_week.length > 0) {
                    let count = 0;
                    const startDate = new Date(baseDate);
                    const endDate = new Date(appointmentData.recurring_rule.end_date);

                    // Calculate the number of weeks between start and end
                    const weeksDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

                    // For each selected day of the week, count occurrences every 2 weeks
                    for (const dayOfWeek of appointmentData.recurring_rule.days_of_week) {
                      // Find the first occurrence of this day after the start date
                      const firstOccurrence = new Date(startDate);
                      const daysToAdd = (dayOfWeek - startDate.getDay() + 7) % 7;
                      firstOccurrence.setDate(startDate.getDate() + daysToAdd);

                      // Count occurrences every 2 weeks from the first occurrence
                      let currentOccurrence = new Date(firstOccurrence);
                      while (currentOccurrence <= endDate) {
                        count++;
                        currentOccurrence.setDate(currentOccurrence.getDate() + 14); // Add 2 weeks
                      }
                    }
                    occurrences = count - 1; // Subtract 1 because the base appointment is already created
                    console.log(`Bi-weekly recurrence calculation: found ${count} selected days every 2 weeks, generating ${occurrences} additional appointments`);
                  } else {
                    occurrences = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7 * 2)); // Every 2 weeks
                  }
                  break;
                case 'monthly':
                  // Calculate months more accurately
                  const monthsDiff = (endDate.getFullYear() - baseDate.getFullYear()) * 12 +
                                   (endDate.getMonth() - baseDate.getMonth());
                  occurrences = Math.floor(monthsDiff / appointmentData.recurring_rule.interval);
                  break;
                case 'yearly':
                  const yearsDiff = endDate.getFullYear() - baseDate.getFullYear();
                  occurrences = Math.floor(yearsDiff / appointmentData.recurring_rule.interval);
                  break;
              }
            }
            // Ensure we don't exceed reasonable limits
            occurrences = Math.max(1, Math.min(occurrences, 365)); // Cap at 1 year max
            console.log(`Calculated ${occurrences} occurrences from ${baseDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} for ${appointmentData.recurring_rule.frequency} frequency`);
          } else {
            occurrences = 1; // If end date is before or same as start date, just create 1 occurrence
          }
        }

        // Generate recurring appointments
        console.log('Calling generateRecurringAppointments with:', {
          appointmentId: appointment.id,
          occurrences: occurrences,
          rule: appointmentData.recurring_rule,
          baseDate: appointmentData.appointment_date,
          endDate: appointmentData.recurring_rule.end_date,
          endOccurrences: appointmentData.recurring_rule.end_occurrences
        });
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

        // Fetch full appointment data for each recurring appointment (with patient and staff data)
        const recurringAppointmentsWithData = await Promise.all(
          recurringAppointments.map(async (apt) => {
            try {
              const fullAppointment = await appointmentService.getAppointment(apt.id);
              return fullAppointment;
            } catch (error) {
              console.error(`Failed to fetch full data for recurring appointment ${apt.id}:`, error);
              return apt; // Return original if fetch fails
            }
          })
        );

        // Update the recurring appointments with full data
        recurringAppointments.splice(0, recurringAppointments.length, ...recurringAppointmentsWithData);
      } catch (error) {
        console.error('Error generating recurring appointments:', error);
        // Don't fail the entire request if recurring generation fails
        // Just log the error and continue
      }
    }

    // Fetch appointment with staff assignments
    const appointmentWithStaff = await appointmentService.getAppointment(appointment.id);
    const staffForAppointment = await appointmentStaffService.getStaffForAppointment(appointment.id);

    // Build timezone context and resolution for response
    const timezoneContext = await buildTimezoneContext(request);
    const timezoneResolution = resolveTimezone(timezoneContext);
    const includeTimezone = shouldIncludeTimezoneMetadata(request);
    const apiVersion = getApiVersion(request);
    const useLegacyFormat = shouldUseLegacyFormat(apiVersion);

    // Enhance appointment with timezone metadata if requested
    let enhancedAppointment = appointmentWithStaff;
    if (includeTimezone && !useLegacyFormat) {
      enhancedAppointment = enhanceAppointmentWithTimezone(appointmentWithStaff, timezoneResolution);
    }

    const responseData = {
      appointment: enhancedAppointment,
      staff_assignments: staffForAppointment,
      recurring_appointments: recurringAppointments,
    };

    const response = formatResponseForVersion(responseData, request, includeTimezone ? timezoneResolution : undefined);
    response.message = `Appointment created successfully${recurringAppointments.length > 0 ? ` with ${recurringAppointments.length} recurring instances` : ''}`;
    
    const jsonResponse = NextResponse.json(response, { status: 201 });
    return await addVersionHeaders(jsonResponse, request);
  } catch (error) {
    console.error('Error creating appointment:', error);
    const errorResponse = createErrorResponse(
      error instanceof Error ? error.message : 'Failed to create appointment',
      undefined,
      request
    );
    return NextResponse.json(errorResponse, { status: 500 });
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
