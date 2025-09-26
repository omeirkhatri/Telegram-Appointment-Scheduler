/**
 * Cleanup Orphaned Calendar Events Script
 *
 * This script finds calendar events in Google Calendar that don't have
 * corresponding appointments in the database and deletes them.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupOrphanedCalendarEvents() {
  console.log('🧹 Cleaning up orphaned calendar events...\n');

  try {
    // Get all staff with calendar IDs
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, google_calendar_id')
      .not('google_calendar_id', 'is', null);

    if (staffError) {
      throw new Error(`Failed to fetch staff: ${staffError.message}`);
    }

    if (!staff || staff.length === 0) {
      console.log('⚠️ No staff with calendar IDs found');
      return;
    }

    console.log(`👥 Found ${staff.length} staff members with calendars`);

    // Get all appointment_staff records with google_event_id
    const { data: appointmentStaff, error: appointmentError } = await supabase
      .from('appointment_staff')
      .select(`
        id,
        appointment_id,
        google_event_id,
        staff:staff_id (
          id,
          first_name,
          last_name,
          google_calendar_id
        )
      `)
      .not('google_event_id', 'is', null);

    if (appointmentError) {
      throw new Error(`Failed to fetch appointment staff: ${appointmentError.message}`);
    }

    console.log(`📅 Found ${appointmentStaff?.length || 0} appointment staff records with calendar events`);

    // Get all existing appointments
    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id');

    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    const existingAppointmentIds = new Set(existingAppointments?.map(apt => apt.id) || []);
    console.log(`📋 Found ${existingAppointmentIds.size} existing appointments in database`);

    // Find orphaned calendar events (appointment_staff records where the appointment no longer exists)
    const orphanedEvents = appointmentStaff?.filter(assignment =>
      !existingAppointmentIds.has(assignment.appointment_id)
    ) || [];

    console.log(`🗑️ Found ${orphanedEvents.length} orphaned calendar events to clean up\n`);

    if (orphanedEvents.length === 0) {
      console.log('✅ No orphaned calendar events found');
      return;
    }

    let deletedCount = 0;
    let errorCount = 0;

    // Delete each orphaned calendar event
    for (const assignment of orphanedEvents) {
      const staff = assignment.staff;

      if (!staff.google_calendar_id || !assignment.google_event_id) {
        console.log(`⚠️ Skipping assignment ${assignment.id} - missing calendar ID or event ID`);
        continue;
      }

      try {
        console.log(`🗑️ Deleting orphaned event ${assignment.google_event_id} from ${staff.first_name} ${staff.last_name}'s calendar...`);

        const result = await deleteCalendarEvent(staff, assignment.google_event_id);

        if (result.success) {
          console.log(`✅ Deleted successfully`);

          // Delete the appointment_staff record
          const { error: deleteError } = await supabase
            .from('appointment_staff')
            .delete()
            .eq('id', assignment.id);

          if (deleteError) {
            console.error(`❌ Error deleting appointment_staff record:`, deleteError);
            errorCount++;
          } else {
            console.log(`✅ Deleted appointment_staff record`);
            deletedCount++;
          }

        } else {
          console.error(`❌ Failed to delete calendar event:`, result.error);
          errorCount++;
        }

      } catch (eventError) {
        console.error(`❌ Event deletion failed:`, eventError);
        errorCount++;
      }
    }

    console.log(`\n📊 Orphaned Events Cleanup Summary:`);
    console.log(`   ✅ Successfully deleted: ${deletedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   🗑️ Total processed: ${orphanedEvents.length}`);

    if (deletedCount > 0) {
      console.log('\n🎉 Orphaned calendar events have been cleaned up!');
    }

  } catch (error) {
    console.error('❌ Failed to cleanup orphaned calendar events:', error);
  }
}

// Helper function to delete calendar event
async function deleteCalendarEvent(staff, eventId) {
  const response = await fetch('http://localhost:3000/api/calendar/delete-simple', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      google_calendar_id: staff.google_calendar_id,
      event_id: eventId
    })
  });

  return await response.json();
}

// Run the script
cleanupOrphanedCalendarEvents();
