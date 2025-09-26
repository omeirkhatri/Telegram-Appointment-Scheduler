/**
 * FORCE DELETE ORPHANED EVENTS
 *
 * This script will IMMEDIATELY delete all the orphaned events you're seeing
 * in Google Calendar. It finds events that don't have corresponding database records
 * and deletes them right away.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceDeleteOrphanedEvents() {
  console.log('🔥 FORCE DELETING ORPHANED EVENTS...\n');

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

    // Get all existing appointments
    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id');

    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    const existingAppointmentIds = new Set(existingAppointments?.map(apt => apt.id) || []);
    console.log(`📋 Found ${existingAppointmentIds.size} existing appointments in database`);

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

    // Create a map of valid event IDs (events that should exist in Google Calendar)
    const validEventIds = new Set();
    appointmentStaff?.forEach(assignment => {
      if (existingAppointmentIds.has(assignment.appointment_id)) {
        validEventIds.add(assignment.google_event_id);
      }
    });

    console.log(`✅ Found ${validEventIds.size} valid event IDs that should exist in Google Calendar`);

    let totalDeleted = 0;
    let totalErrors = 0;

    // For each staff member, check their calendar and delete orphaned events
    for (const staffMember of staff) {
      console.log(`\n🔍 Checking calendar for ${staffMember.first_name} ${staffMember.last_name}...`);
      console.log(`   Calendar ID: ${staffMember.google_calendar_id}`);

      try {
        // List events in the calendar
        const events = await listCalendarEvents(staffMember.google_calendar_id);

        if (events.length === 0) {
          console.log(`   ✅ No events found in calendar`);
          continue;
        }

        console.log(`   📅 Found ${events.length} events in calendar`);

        // Check each event to see if it should exist
        let deletedFromThisCalendar = 0;
        let errorsFromThisCalendar = 0;

        for (const event of events) {
          // Skip if this is a valid event (exists in our database)
          if (validEventIds.has(event.id)) {
            console.log(`   ✅ Event ${event.id} is valid (${event.summary})`);
            continue;
          }

          // This event doesn't exist in our database, so it's orphaned
          console.log(`   🗑️ Event ${event.id} is ORPHANED (${event.summary}) - DELETING NOW...`);

          try {
            const result = await deleteCalendarEvent(staffMember, event.id);

            if (result.success) {
              console.log(`   ✅ DELETED SUCCESSFULLY`);
              deletedFromThisCalendar++;
            } else {
              console.log(`   ❌ Failed to delete: ${result.error}`);
              errorsFromThisCalendar++;
            }

          } catch (deleteError) {
            console.log(`   ❌ Delete error: ${deleteError.message}`);
            errorsFromThisCalendar++;
          }
        }

        console.log(`   📊 Calendar cleanup summary:`);
        console.log(`      ✅ Deleted: ${deletedFromThisCalendar}`);
        console.log(`      ❌ Errors: ${errorsFromThisCalendar}`);

        totalDeleted += deletedFromThisCalendar;
        totalErrors += errorsFromThisCalendar;

      } catch (calendarError) {
        console.error(`   ❌ Error checking calendar: ${calendarError.message}`);
        totalErrors++;
      }
    }

    console.log(`\n🔥 FORCE DELETE COMPLETE!`);
    console.log(`   ✅ Total events deleted: ${totalDeleted}`);
    console.log(`   ❌ Total errors: ${totalErrors}`);

    if (totalDeleted > 0) {
      console.log(`\n🎉 SUCCESS! ${totalDeleted} orphaned events have been FORCE DELETED!`);
      console.log(`   Check your Google Calendar now - the appointments should be gone!`);
    } else {
      console.log(`\n✅ No orphaned events found to delete`);
    }

  } catch (error) {
    console.error('❌ Force delete failed:', error);
  }
}

// Helper function to list events from a calendar
async function listCalendarEvents(calendarId) {
  try {
    const response = await fetch('http://localhost:3000/api/calendar/list-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        google_calendar_id: calendarId,
        max_results: 100,
        time_min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        time_max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next 30 days
        single_events: true,
        order_by: 'startTime'
      })
    });

    const result = await response.json();

    if (result.success && result.data && result.data.events) {
      return result.data.events;
    } else {
      console.error(`   ❌ Error listing events: ${result.error || 'Unknown error'}`);
      return [];
    }

  } catch (error) {
    console.error(`   ❌ Error listing events: ${error.message}`);
    return [];
  }
}

// Helper function to delete calendar event
async function deleteCalendarEvent(staff, eventId) {
  try {
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

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the force delete
forceDeleteOrphanedEvents();

