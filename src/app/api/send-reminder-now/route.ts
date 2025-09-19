import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import { NextRequest, NextResponse } from 'next/server';

/**
 * SIMPLE REMINDER API - Send reminders for appointments starting in 30 minutes
 * Just call this endpoint whenever you want to send reminders
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔔 MANUAL REMINDER TRIGGER - Sending 30-minute reminders...');

    // Get current Dubai time
    const now = new Date();
    // Convert UTC to Dubai time (UTC+4)
    const dubaiTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
    const todayString = dubaiTime.toISOString().split('T')[0];

    console.log(`⏰ Current UTC time: ${now.toISOString()}`);
    console.log(`⏰ Current Dubai time: ${dubaiTime.toISOString()}`);
    console.log(`📅 Today: ${todayString}`);

    // Get all scheduled appointments for today
    const appointments = await appointmentService.getAppointments({
      appointment_date: todayString,
      status: 'scheduled',
    });

    console.log(`📋 Found ${appointments.length} scheduled appointments for today`);

    // Find appointments starting in 20-40 minutes (wider window for timezone issues)
    const reminderAppointments = appointments.filter(appointment => {
      // Create appointment time by parsing the time string
      const [hours, minutes] = appointment.start_time.split(':').map(Number);
      const appointmentDateTime = new Date(dubaiTime);
      appointmentDateTime.setUTCHours(hours, minutes, 0, 0);

      const timeDiff = appointmentDateTime.getTime() - dubaiTime.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      console.log(`   Appointment ${appointment.id}: ${appointment.start_time} - ${minutesDiff.toFixed(1)} minutes away`);

      return minutesDiff >= 25 && minutesDiff <= 35; // 30-minute reminder window
    });

    console.log(`🔔 Found ${reminderAppointments.length} appointments needing 30-minute reminders`);

    if (reminderAppointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No appointments need 30-minute reminders right now',
        appointments: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Process each appointment
    const results = [];

    for (const appointment of reminderAppointments) {
      console.log(`\n📱 Processing 30-minute reminder for appointment ${appointment.id}`);
      console.log(`   Patient: ${appointment.patient_id}`);
      console.log(`   Time: ${appointment.start_time}`);

      try {
        // Get staff assignments
        const staffAssignments = await appointmentStaffService.getStaffForAppointment(appointment.id);

        if (!staffAssignments || staffAssignments.length === 0) {
          console.log(`   ⚠️  No staff assigned to this appointment`);
          results.push({
            appointmentId: appointment.id,
            success: false,
            error: 'No staff assigned'
          });
          continue;
        }

        console.log(`   👥 Sending reminders to ${staffAssignments.length} staff members`);

        // Send 30-minute reminder notifications
        const result = await telegramNotificationService.sendOneHourReminderNotificationsToStaff(
          appointment,
          staffAssignments
        );

        const successCount = result.results.filter(r => r.success).length;
        const failCount = result.results.filter(r => !r.success).length;

        console.log(`   ✅ Sent: ${successCount}, Failed: ${failCount}`);

        results.push({
          appointmentId: appointment.id,
          success: successCount > 0,
          notificationsSent: successCount,
          notificationsFailed: failCount,
          errors: result.results.filter(r => !r.success).map(r => r.error)
        });

      } catch (error) {
        console.error(`   ❌ Error processing appointment ${appointment.id}:`, error);
        results.push({
          appointmentId: appointment.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const totalSent = results.reduce((sum, r) => sum + (r.notificationsSent || 0), 0);
    const totalFailed = results.reduce((sum, r) => sum + (r.notificationsFailed || 0), 0);

    console.log(`\n🎉 MANUAL REMINDER COMPLETED!`);
    console.log(`   Total appointments: ${reminderAppointments.length}`);
    console.log(`   Notifications sent: ${totalSent}`);
    console.log(`   Notifications failed: ${totalFailed}`);

    return NextResponse.json({
      success: true,
      message: `Sent ${totalSent} reminders for ${reminderAppointments.length} appointments`,
      appointments: reminderAppointments.map(a => ({
        id: a.id,
        time: a.start_time,
        patient: a.patient_id
      })),
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Error in manual reminder:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Same as POST for simplicity
  return POST(request);
}
