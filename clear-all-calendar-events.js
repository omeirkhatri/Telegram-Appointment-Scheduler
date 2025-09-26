/**
 * Clear All Calendar Events Script
 *
 * This script deletes ALL calendar events from ALL staff calendars
 * Use this to clean up before testing the enhanced daemon
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearAllCalendarEvents() {
  console.log('🧹 Starting to clear ALL calendar events...\n');

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
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointment_staff')
      .select(`
        id,
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
      throw new Error(`Failed to fetch appointments: ${appointmentError.message}`);
    }

    if (!appointments || appointments.length === 0) {
      console.log('✅ No calendar events found to delete');
      return;
    }

    console.log(`📅 Found ${appointments.length} calendar events to delete\n`);

    let deletedCount = 0;
    let errorCount = 0;

    // Delete each calendar event
    for (const appointment of appointments) {
      const staff = appointment.staff;

      if (!staff.google_calendar_id || !appointment.google_event_id) {
        console.log(`⚠️ Skipping appointment ${appointment.id} - missing calendar ID or event ID`);
        continue;
      }

      try {
        console.log(`🗑️ Deleting event ${appointment.google_event_id} from ${staff.first_name} ${staff.last_name}'s calendar...`);

        const result = await deleteCalendarEvent(staff, appointment.google_event_id);

        if (result.success) {
          console.log(`✅ Deleted successfully`);

          // Clear the google_event_id from appointment_staff
          const { error: updateError } = await supabase
            .from('appointment_staff')
            .update({
              google_event_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', appointment.id);

          if (updateError) {
            console.error(`❌ Error clearing google_event_id:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Cleared google_event_id from database`);
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

    console.log(`\n📊 Clear All Calendar Events Summary:`);
    console.log(`   ✅ Successfully deleted: ${deletedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📅 Total processed: ${appointments.length}`);

    if (deletedCount > 0) {
      console.log('\n🎉 All calendar events have been cleared!');
      console.log('💡 You can now test the enhanced daemon with a clean slate');
    }

  } catch (error) {
    console.error('❌ Failed to clear calendar events:', error);
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
clearAllCalendarEvents();
