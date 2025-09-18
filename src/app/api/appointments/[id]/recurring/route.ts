import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import type { CreateAppointment } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/appointments/[id]/recurring - Update a recurring appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      updateType,
      occurrenceNumber,
      updateData
    }: {
      updateType: 'this_occurrence' | 'all_future';
      occurrenceNumber?: number;
      updateData: Partial<CreateAppointment>;
    } = body;

    if (!updateType || !updateData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let updatedAppointment;

    if (updateType === 'this_occurrence') {
      if (occurrenceNumber === undefined) {
        return NextResponse.json(
          { success: false, error: 'Occurrence number is required for this_occurrence update' },
          { status: 400 }
        );
      }

      try {
        updatedAppointment = await appointmentService.updateRecurringAppointmentOccurrence(
          id,
          occurrenceNumber,
          updateData
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return NextResponse.json(
            { success: false, error: 'Base recurring appointment not found. It may have been deleted.' },
            { status: 404 }
          );
        }
        throw error;
      }
    } else if (updateType === 'all_future') {
      try {
        updatedAppointment = await appointmentService.updateRecurringAppointmentFuture(
          id,
          updateData
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return NextResponse.json(
            { success: false, error: 'Base recurring appointment not found. It may have been deleted.' },
            { status: 404 }
          );
        }
        throw error;
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid update type' },
        { status: 400 }
      );
    }

    // Send reschedule notifications for recurring appointment updates
    if (updatedAppointment) {
      try {
        const staffAssignments = await appointmentStaffService.getStaffForAppointment(updatedAppointment.id);
        if (staffAssignments && staffAssignments.length > 0) {
          console.log(`📱 Sending recurring appointment update notifications for appointment ${updatedAppointment.id} to ${staffAssignments.length} staff members`);
          await sendTelegramNotifications(updatedAppointment, staffAssignments, undefined, 'updated');
        }
      } catch (error) {
        console.error('Error sending recurring appointment update notifications:', error);
        // Don't fail the request if notification sending fails
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
    });
  } catch (error) {
    console.error('Error updating recurring appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update recurring appointment',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/[id]/recurring - Delete a recurring appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      deleteType,
      occurrenceNumber
    }: {
      deleteType: 'this_occurrence' | 'all_future';
      occurrenceNumber?: number;
    } = body;

    if (!deleteType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (deleteType === 'this_occurrence') {
      if (occurrenceNumber === undefined) {
        return NextResponse.json(
          { success: false, error: 'Occurrence number is required for this_occurrence deletion' },
          { status: 400 }
        );
      }

      try {
        await appointmentService.deleteRecurringAppointmentOccurrence(
          id,
          occurrenceNumber
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return NextResponse.json(
            { success: false, error: 'Base recurring appointment not found. It may have been deleted.' },
            { status: 404 }
          );
        }
        throw error;
      }
    } else if (deleteType === 'all_future') {
      try {
        await appointmentService.deleteAllFutureRecurringAppointments(id);
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return NextResponse.json(
            { success: false, error: 'Base recurring appointment not found. It may have been deleted.' },
            { status: 404 }
          );
        }
        throw error;
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid delete type' },
        { status: 400 }
      );
    }

    // Send cancellation notifications for recurring appointment deletions
    try {
      const staffAssignments = await appointmentStaffService.getStaffForAppointment(id);
      if (staffAssignments && staffAssignments.length > 0) {
        // Get the base appointment for notification context
        const baseAppointment = await appointmentService.getAppointment(id);
        if (baseAppointment) {
          console.log(`📱 Sending recurring appointment cancellation notifications for appointment ${id} to ${staffAssignments.length} staff members`);
          await sendTelegramNotifications(baseAppointment, staffAssignments, undefined, 'cancelled');
        }
      }
    } catch (error) {
      console.error('Error sending recurring appointment cancellation notifications:', error);
      // Don't fail the request if notification sending fails
    }

    return NextResponse.json({
      success: true,
      message: 'Recurring appointment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting recurring appointment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete recurring appointment',
      },
      { status: 500 }
    );
  }
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
