/**
 * Debug Calendar Mismatch
 *
 * This script helps debug calendar synchronization issues by:
 * 1. Checking what's in the database
 * 2. Checking what's in Google Calendar
 * 3. Identifying mismatches
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCalendarMismatch() {
  console.log('🔍 Debugging Calendar Mismatch...\n');

  try {
    // 1. Check what's in the database
    console.log('📊 DATABASE ANALYSIS:');
    console.log('===================');

    // Get all appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, appointment_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (appointmentsError) {
      console.error('❌ Error fetching appointments:', appointmentsError);
    } else {
      console.log(`📅 Found ${appointments?.length || 0} appointments in database:`);
      appointments?.forEach(apt => {
        console.log(`   - ${apt.id}: ${apt.appointment_date} ${apt.start_time} (${apt.status}) - ${apt.appointment_type}`);
      });
    }

    // Get all appointment_staff records
    const { data: appointmentStaff, error: staffError } = await supabase
      .from('appointment_staff')
      .select(`
        id,
        appointment_id,
        google_event_id,
        role,
        staff:staff_id (
          id,
          first_name,
          last_name,
          google_calendar_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (staffError) {
      console.error('❌ Error fetching appointment staff:', staffError);
    } else {
      console.log(`\n👥 Found ${appointmentStaff?.length || 0} appointment staff records:`);
      appointmentStaff?.forEach(assignment => {
        const staff = assignment.staff;
        console.log(`   - Assignment ${assignment.id}:`);
        console.log(`     Appointment: ${assignment.appointment_id}`);
        console.log(`     Staff: ${staff?.first_name} ${staff?.last_name}`);
        console.log(`     Calendar ID: ${staff?.google_calendar_id || 'None'}`);
        console.log(`     Event ID: ${assignment.google_event_id || 'None'}`);
        console.log(`     Role: ${assignment.role}`);
        console.log('');
      });
    }

    // Get staff with calendar IDs
    const { data: staff, error: staffError2 } = await supabase
      .from('staff')
      .select('id, first_name, last_name, google_calendar_id, email')
      .not('google_calendar_id', 'is', null);

    if (staffError2) {
      console.error('❌ Error fetching staff:', staffError2);
    } else {
      console.log(`\n👤 Found ${staff?.length || 0} staff with Google Calendar IDs:`);
      staff?.forEach(s => {
        console.log(`   - ${s.first_name} ${s.last_name}: ${s.google_calendar_id}`);
      });
    }

    // 2. Check what's in Google Calendar (if we have staff with calendar IDs)
    if (staff && staff.length > 0) {
      console.log('\n\n📅 GOOGLE CALENDAR ANALYSIS:');
      console.log('============================');

      for (const staffMember of staff) {
        console.log(`\n🔍 Checking calendar for ${staffMember.first_name} ${staffMember.last_name}:`);
        console.log(`   Calendar ID: ${staffMember.google_calendar_id}`);

        try {
          // Check if calendar exists
          const calendarExists = await checkCalendarExists(staffMember.google_calendar_id);
          console.log(`   Calendar exists: ${calendarExists ? '✅ Yes' : '❌ No'}`);

          if (calendarExists) {
            // List events in the calendar
            const events = await listCalendarEvents(staffMember.google_calendar_id);
            console.log(`   Events found: ${events.length}`);

            if (events.length > 0) {
              console.log('   Recent events:');
              events.slice(0, 5).forEach(event => {
                console.log(`     - ${event.summary} (${event.id})`);
                console.log(`       Start: ${event.start?.dateTime || event.start?.date}`);
                console.log(`       End: ${event.end?.dateTime || event.end?.date}`);
              });
            }
          }

        } catch (error) {
          console.error(`   ❌ Error checking calendar:`, error.message);
        }
      }
    }

    // 3. Identify mismatches
    console.log('\n\n🔍 MISMATCH ANALYSIS:');
    console.log('====================');

    if (appointmentStaff && appointmentStaff.length > 0) {
      const eventsWithGoogleIds = appointmentStaff.filter(a => a.google_event_id);
      console.log(`📊 Database events with Google Event IDs: ${eventsWithGoogleIds.length}`);

      // Check which events actually exist in Google Calendar
      let verifiedCount = 0;
      let missingCount = 0;

      for (const assignment of eventsWithGoogleIds) {
        const staff = assignment.staff;
        if (staff?.google_calendar_id && assignment.google_event_id) {
          try {
            const exists = await checkEventExists(staff.google_calendar_id, assignment.google_event_id);
            if (exists) {
              verifiedCount++;
            } else {
              missingCount++;
              console.log(`❌ Event ${assignment.google_event_id} not found in Google Calendar for ${staff.first_name} ${staff.last_name}`);
            }
          } catch (error) {
            console.error(`❌ Error checking event ${assignment.google_event_id}:`, error.message);
          }
        }
      }

      console.log(`\n📊 Verification Results:`);
      console.log(`   ✅ Events verified in Google Calendar: ${verifiedCount}`);
      console.log(`   ❌ Events missing from Google Calendar: ${missingCount}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Helper functions
async function checkCalendarExists(calendarId) {
  try {
    const response = await fetch('http://localhost:3000/api/calendar/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result.success && result.data && result.data.exists;

  } catch (error) {
    return false;
  }
}

async function listCalendarEvents(calendarId) {
  try {
    // This would require implementing a list events API endpoint
    // For now, we'll just return an empty array
    return [];

  } catch (error) {
    return [];
  }
}

async function checkEventExists(googleCalendarId, googleEventId) {
  try {
    const response = await fetch('http://localhost:3000/api/calendar/event-exists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        google_calendar_id: googleCalendarId,
        google_event_id: googleEventId
      })
    });

    const result = await response.json();
    return result.success && result.data && result.data.exists;

  } catch (error) {
    return false;
  }
}

// Run the debug
debugCalendarMismatch();

