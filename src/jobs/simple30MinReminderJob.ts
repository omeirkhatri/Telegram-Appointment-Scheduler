import { buildTimezoneArtifacts, formatLocalDate, getCurrentLocalTime } from '@/lib/timezoneArtifacts';
import { appointmentService } from '@/services/appointmentService';
import { appointmentStaffService } from '@/services/appointmentStaffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import { toUTC } from '@/utils/timezone';

/**
 * SIMPLE 30-MINUTE REMINDER JOB
 * This is a much simpler approach that just checks for appointments starting in 30 minutes
 * and sends reminders immediately. No complex time windows or job scheduling.
 */
export async function simple30MinReminderJob(): Promise<void> {
  console.log('🔔 Starting SIMPLE 30-minute reminder check...');

  try {
    // Resolve timezone context
    const artifacts = buildTimezoneArtifacts();
    const nowLocal = getCurrentLocalTime(artifacts);
    const timezone = artifacts.resolution;
    const todayString = formatLocalDate(artifacts, nowLocal, 'yyyy-MM-dd');

    // Log timezone resolution telemetry for reminder job
    console.log('🕐 Reminder job timezone context:', {
      timezone: timezone.timezone,
      timezoneSource: timezone.source,
      offsetMinutes: timezone.offsetMinutes,
      abbreviation: timezone.abbreviation,
      resolutionPath: timezone.resolutionPath,
      contextSummary: {
        hasExplicit: Boolean(artifacts.context.explicitTimezone),
        hasLocation: Boolean(artifacts.context.locationTimezone),
        hasOrganization: Boolean(artifacts.context.organizationTimezone),
        hasFallback: Boolean(artifacts.context.fallbackTimezone),
        preferLegacy: artifacts.context.preferLegacyFallback,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`⏰ Current local time (${timezone.timezone}): ${nowLocal.toISOString()}`);
    console.log(`📅 Today: ${todayString}`);

    // Calculate 30 minutes from now
    const thirtyMinutesFromNow = new Date(nowLocal.getTime() + 30 * 60 * 1000);
    console.log(`⏰ 30 minutes from now (${timezone.timezone}): ${thirtyMinutesFromNow.toISOString()}`);

    // Get all scheduled appointments for today
    const appointments = await appointmentService.getAppointments({
      appointment_date: todayString,
      status: 'scheduled',
    });

    console.log(`📋 Found ${appointments.length} scheduled appointments for today`);

    // Find appointments starting in exactly 30 minutes (±5 minute window)
    const nowUtc = new Date();
    const reminderAppointments = appointments.filter(appointment => {
      const appointmentUtc = toUTC(`${appointment.appointment_date}T${appointment.start_time}:00`, artifacts.context);

      // Check if appointment is within 25-35 minutes from now (5-minute window)
      const timeDiff = appointmentUtc.getTime() - nowUtc.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      return minutesDiff >= 25 && minutesDiff <= 35;
    });

    console.log(`🔔 Found ${reminderAppointments.length} appointments needing 30-minute reminders`);

    if (reminderAppointments.length === 0) {
      console.log('✅ No appointments need 30-minute reminders right now');
      return;
    }

    // Process each appointment
    for (const appointment of reminderAppointments) {
      console.log(`\n📱 Processing 30-minute reminder for appointment ${appointment.id}`);
      console.log(`   Patient: ${appointment.patient_id}`);
      console.log(`   Time: ${appointment.start_time}`);
      console.log(`   Type: ${appointment.appointment_type}`);

      try {
        // Get staff assignments
        const staffAssignments = await appointmentStaffService.getStaffForAppointment(appointment.id);

        if (!staffAssignments || staffAssignments.length === 0) {
          console.log(`   ⚠️  No staff assigned to this appointment`);
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

        if (failCount > 0) {
          console.log(`   ❌ Errors:`, result.results.filter(r => !r.success).map(r => r.error));
        }

      } catch (error) {
        console.error(`   ❌ Error processing appointment ${appointment.id}:`, error);
      }
    }

    console.log('\n🎉 30-minute reminder job completed!');

  } catch (error) {
    console.error('❌ Error in 30-minute reminder job:', error);
  }
}

/**
 * Run the simple 30-minute reminder job
 * Call this function to manually trigger reminders
 */
export async function run30MinReminders(): Promise<void> {
  console.log('🚀 MANUALLY TRIGGERING 30-MINUTE REMINDERS...');
  await simple30MinReminderJob();
}
