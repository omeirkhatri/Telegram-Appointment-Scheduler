import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/telegram/reminders/test - Test 1-hour reminders for specific appointments or staff
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      appointmentId = null,
      staffId = null,
      testMode = true,
      forceSend = true
    } = body;

    // Validate that at least one identifier is provided
    if (!appointmentId && !staffId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either appointmentId or staffId must be provided',
        },
        { status: 400 },
      );
    }

    let appointments = [];
    let results = [];

    if (appointmentId) {
      // Test specific appointment
      console.log(`🧪 Testing 1-hour reminder for appointment ${appointmentId}`);

      const appointment = await appointmentService.getAppointment(appointmentId);
      if (!appointment) {
        return NextResponse.json(
          {
            success: false,
            error: `Appointment ${appointmentId} not found`,
          },
          { status: 404 },
        );
      }

      // Get staff assignments for this appointment
      const staffAssignments = await appointmentStaffService.getStaffForAppointment(appointmentId);

      if (!staffAssignments || staffAssignments.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `No staff assignments found for appointment ${appointmentId}`,
          },
          { status: 404 },
        );
      }

      // Send test notifications
      const notificationResult = await telegramNotificationService.sendOneHourReminderNotificationsToStaff(
        appointment,
        staffAssignments
      );

      results.push({
        appointmentId,
        patientName: 'Test Patient',
        appointmentTime: appointment.start_time,
        staffCount: staffAssignments.length,
        notificationsSent: notificationResult.results.filter(r => r.success).length,
        notificationsFailed: notificationResult.results.filter(r => !r.success).length,
        results: notificationResult.results,
      });

    } else if (staffId) {
      // Test specific staff member
      console.log(`🧪 Testing 1-hour reminder for staff ${staffId}`);

      // Get today's appointments for this staff member
      const today = new Date().toISOString().split('T')[0];
      const appointments = await appointmentService.getAppointments({
        appointment_date: today,
        status: 'scheduled',
      });

      // Filter appointments for this staff member
      const staffAppointments = [];
      for (const appointment of appointments) {
        const staffAssignments = await appointmentStaffService.getStaffForAppointment(appointment.id);
        const isAssigned = staffAssignments.some(assignment => assignment.staff_id === staffId);

        if (isAssigned) {
          staffAppointments.push({ appointment, staffAssignments });
        }
      }

      if (staffAppointments.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `No scheduled appointments found for staff ${staffId} today`,
          },
          { status: 404 },
        );
      }

      // Send test notifications for each appointment
      for (const { appointment, staffAssignments } of staffAppointments) {
        const notificationResult = await telegramNotificationService.sendOneHourReminderNotificationsToStaff(
          appointment,
          staffAssignments
        );

        results.push({
          appointmentId: appointment.id,
          patientName: 'Test Patient',
          appointmentTime: appointment.start_time,
          staffCount: staffAssignments.length,
          notificationsSent: notificationResult.results.filter(r => r.success).length,
          notificationsFailed: notificationResult.results.filter(r => !r.success).length,
          results: notificationResult.results,
        });
      }
    }

    const totalNotificationsSent = results.reduce((sum, r) => sum + r.notificationsSent, 0);
    const totalNotificationsFailed = results.reduce((sum, r) => sum + r.notificationsFailed, 0);
    const successRate = totalNotificationsSent + totalNotificationsFailed > 0
      ? Math.round((totalNotificationsSent / (totalNotificationsSent + totalNotificationsFailed)) * 100)
      : 100;

    return NextResponse.json({
      success: true,
      data: {
        testMode,
        forceSend,
        totalAppointments: results.length,
        totalNotificationsSent,
        totalNotificationsFailed,
        successRate,
        results,
      },
      message: `Test completed: ${totalNotificationsSent} notifications sent, ${totalNotificationsFailed} failed`,
    });

  } catch (error) {
    console.error('Error testing 1-hour reminders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test 1-hour reminders',
      },
      { status: 500 },
    );
  }
}
