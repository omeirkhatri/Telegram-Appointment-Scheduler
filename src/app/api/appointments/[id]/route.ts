import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import type { StaffAssignment, UpdateAppointment } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/appointments/[id] - Get a single appointment by ID with staff assignments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const appointment = await appointmentService.getAppointment(id);

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
    const staffAssignments = await appointmentStaffService.getStaffForAppointment(id);

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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if appointment exists
    const existingAppointment = await appointmentService.getAppointment(id);
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
      mini_notes: body.mini_notes,
      full_notes: body.full_notes,
      pickup_instructions: body.pickup_instructions,
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
      console.error('Appointment update validation failed:', {
        appointmentId: id,
        updateData,
        validationErrors
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    // Detect what fields have changed for better reschedule notifications
    const changedFields = detectChangedFields(existingAppointment, updateData);
    const hasAppointmentChanges = Object.keys(updateData).length > 0;

    // Update appointment
    const updatedAppointment = await appointmentService.updateAppointment(id, updateData);

    // Handle staff assignment updates if provided
    let assignedStaff: any[] = [];
    if (body.staff_assignments !== undefined) {
      // Remove all existing staff assignments
      await appointmentStaffService.removeAllStaffFromAppointment(id);

      // Assign new staff if provided (no validation)
      if (body.staff_assignments.length > 0) {
        const staffAssignments: StaffAssignment[] = body.staff_assignments;

        // Assign staff to appointment without validation
        assignedStaff = await appointmentStaffService.assignStaffToAppointment(
          id,
          staffAssignments,
        );
      }
    } else {
      // If no staff assignment changes, get current staff assignments
      assignedStaff = await appointmentStaffService.getStaffForAppointment(id);
    }

    // Send reschedule notifications if any changes were made (appointment fields or staff assignments)
    if (hasAppointmentChanges || body.staff_assignments !== undefined) {
      console.log(`📱 Sending reschedule notifications for appointment ${id} - appointment changes: ${hasAppointmentChanges}, staff changes: ${body.staff_assignments !== undefined}`);
      console.log(`📱 Changed fields:`, changedFields);
      await sendTelegramNotifications(updatedAppointment, assignedStaff, changedFields);
    }

    // Fetch updated appointment with staff assignments
    const finalAppointment = await appointmentService.getAppointment(id);
    const staffForAppointment = await appointmentStaffService.getStaffForAppointment(id);

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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // Check if appointment exists
    const appointment = await appointmentService.getAppointment(id);
    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment not found',
        },
        { status: 404 },
      );
    }

    // Get staff assignments before deleting for notifications
    const staffAssignments = await appointmentStaffService.getStaffForAppointment(id);

    // IMPORTANT: Delete appointment first (this will trigger calendar cleanup via unified service)
    // The unified service needs the staff assignments to still exist to find the calendar events
    await appointmentService.deleteAppointment(id);

    // Send cancellation notifications to all assigned staff members
    if (staffAssignments && staffAssignments.length > 0) {
      console.log(`📱 Sending cancellation notifications for appointment ${id} to ${staffAssignments.length} staff members`);
      await sendTelegramNotifications(appointment, staffAssignments, undefined, 'cancelled');
    }

    // Remove all staff assignments (after calendar cleanup is done)
    await appointmentStaffService.removeAllStaffFromAppointment(id);

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
    const appointmentDate = new Date(data.appointment_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Compare dates only (ignore time)
    const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (appointmentDateOnly < todayOnly) {
      errors.push('Appointment date must be today or in the future');
    }
  }

  if (data.start_time !== undefined) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (!timeRegex.test(data.start_time)) {
      errors.push('Invalid start time format (HH:MM or HH:MM:SS)');
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

// Helper function to detect changed fields
function detectChangedFields(existingAppointment: any, updateData: any): string[] {
  const changedFields: string[] = [];

  for (const [key, newValue] of Object.entries(updateData)) {
    if (newValue !== undefined && existingAppointment[key] !== newValue) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

// Helper function to send Telegram notifications
async function sendTelegramNotifications(appointment: any, staffAssignments: any[], changedFields?: string[], notificationType: 'updated' | 'cancelled' = 'updated'): Promise<void> {
  // Check if Telegram is configured
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('📱 Telegram not configured, skipping notifications');
    return;
  }

  if (notificationType === 'cancelled') {
    console.log(`📱 Starting cancellation Telegram notifications for appointment ${appointment.id} to ${staffAssignments.length} staff members`);
  } else {
    console.log(`📱 Starting reschedule Telegram notifications for appointment ${appointment.id} to ${staffAssignments.length} staff members`);
    if (changedFields && changedFields.length > 0) {
      console.log(`📱 Changed fields: ${changedFields.join(', ')}`);
    }
  }

  // Send notifications to all assigned staff members
  const result = await telegramNotificationService.sendAppointmentNotificationsToStaff(
    appointment,
    staffAssignments,
    notificationType
  );

  if (result.success) {
    const successCount = result.results.filter(r => r.success).length;
    const notificationTypeText = notificationType === 'cancelled' ? 'cancellation' : 'reschedule';
    console.log(`📱 ${notificationTypeText} Telegram notifications completed: ${successCount}/${result.results.length} successful`);
  } else {
    const notificationTypeText = notificationType === 'cancelled' ? 'cancellation' : 'reschedule';
    console.error(`❌ Failed to send ${notificationTypeText} Telegram notifications:`, result.results);
  }
}
