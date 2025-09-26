#!/usr/bin/env node

/**
 * Cleanup Deleted Appointments
 *
 * This script deletes Google Calendar events for all appointments that are marked as deleted
 * but still have Google Calendar events in the appointment_staff table
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const { GoogleCalendarService } = require('./src/services/googleCalendarService');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const googleCalendarService = new GoogleCalendarService();

async function cleanupDeletedAppointments() {
  console.log('🧹 Cleaning up deleted appointments with Google Calendar events...\n');

  try {
    // Get all deleted appointments that have Google Calendar events
    const { data: deletedAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        appointment_staff!inner(
          staff_id,
          google_event_id,
          staff:staff_id(
            google_calendar_id,
            first_name,
            last_name
          )
        )
      `)
      .eq('status', 'deleted')
      .not('appointment_staff.google_event_id', 'is', null);

    if (appointmentsError) {
      console.error('❌ Error fetching deleted appointments:', appointmentsError);
      return;
    }

    console.log(`📅 Found ${deletedAppointments.length} deleted appointments with Google Calendar events`);

    if (deletedAppointments.length === 0) {
      console.log('✅ No deleted appointments with Google Calendar events found');
      return;
    }

    // Process each deleted appointment
    let totalDeleted = 0;
    let totalFailed = 0;

    for (const appointment of deletedAppointments) {
      console.log(`\n🗑️ Processing appointment ${appointment.id} (${appointment.appointment_date} ${appointment.start_time})`);

      for (const staffRecord of appointment.appointment_staff) {
        if (!staffRecord.google_event_id || !staffRecord.staff?.google_calendar_id) {
          console.log(`⚠️ Skipping staff ${staffRecord.staff_id} - missing event ID or calendar ID`);
          continue;
        }

        try {
          console.log(`  📅 Deleting event for ${staffRecord.staff.first_name} ${staffRecord.staff.last_name}...`);

          const deleteResult = await googleCalendarService.deleteEvent(
            staffRecord.staff.google_calendar_id,
            staffRecord.google_event_id
          );

          if (deleteResult.success) {
            console.log(`  ✅ Deleted Google Calendar event`);

            // Clear the google_event_id from appointment_staff
            await supabase
              .from('appointment_staff')
              .update({ google_event_id: null })
              .eq('appointment_id', appointment.id)
              .eq('staff_id', staffRecord.staff_id);

            totalDeleted++;
          } else {
            console.log(`  ❌ Failed to delete: ${deleteResult.errorMessage}`);
            totalFailed++;
          }
        } catch (error) {
          console.log(`  ❌ Error deleting event: ${error.message}`);
          totalFailed++;
        }
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`✅ Successfully deleted: ${totalDeleted} Google Calendar events`);
    console.log(`❌ Failed to delete: ${totalFailed} Google Calendar events`);
    console.log(`📅 Processed: ${deletedAppointments.length} deleted appointments`);

    if (totalDeleted > 0) {
      console.log('\n🎉 Cleanup completed! Check Google Calendar to verify events are deleted.');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Run the cleanup
cleanupDeletedAppointments();

