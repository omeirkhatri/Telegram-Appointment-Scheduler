/**
 * Force Cleanup All Calendar Events Script
 *
 * This script directly deletes ALL events from Google Calendar
 * regardless of database state. Use this when calendar events
 * exist but database records are missing or corrupted.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceCleanupAllCalendarEvents() {
  console.log('🧹 Force cleaning ALL calendar events from Google Calendar...\n');

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

    let totalDeleted = 0;
    let totalErrors = 0;

    // Clear each staff member's calendar
    for (const staffMember of staff) {
      console.log(`\n🧹 Clearing calendar for ${staffMember.first_name} ${staffMember.last_name}...`);

      try {
        const result = await clearStaffCalendar(staffMember);
        totalDeleted += result.deleted;
        totalErrors += result.errors;

        console.log(`✅ Cleared ${result.deleted} events from ${staffMember.first_name}'s calendar`);
        if (result.errors > 0) {
          console.log(`⚠️ ${result.errors} errors occurred`);
        }

      } catch (error) {
        console.error(`❌ Failed to clear ${staffMember.first_name}'s calendar:`, error.message);
        totalErrors++;
      }
    }

    console.log(`\n📊 Force Cleanup Summary:`);
    console.log(`   ✅ Total events deleted: ${totalDeleted}`);
    console.log(`   ❌ Total errors: ${totalErrors}`);
    console.log(`   👥 Staff calendars processed: ${staff.length}`);

    if (totalDeleted > 0) {
      console.log('\n🎉 All calendar events have been force cleaned!');
      console.log('💡 Your Google Calendar should now be completely empty');
    }

  } catch (error) {
    console.error('❌ Failed to force cleanup calendar events:', error);
  }
}

// Helper function to clear a staff member's calendar
async function clearStaffCalendar(staff) {
  let deleted = 0;
  let errors = 0;
  let nextPageToken = null;

  try {
    // Get service account credentials
    const serviceAccountKey = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY not found');
    }

    const credentials = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));

    // Initialize Google Calendar API
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    // List all events in the calendar
    do {
      const response = await calendar.events.list({
        calendarId: staff.google_calendar_id,
        maxResults: 100,
        pageToken: nextPageToken,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];

      // Delete each event
      for (const event of events) {
        try {
          await calendar.events.delete({
            calendarId: staff.google_calendar_id,
            eventId: event.id
          });
          deleted++;
          console.log(`  🗑️ Deleted: ${event.summary || 'Untitled Event'}`);
        } catch (deleteError) {
          console.error(`  ❌ Failed to delete event ${event.id}:`, deleteError.message);
          errors++;
        }
      }

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

  } catch (error) {
    console.error(`❌ Error accessing ${staff.first_name}'s calendar:`, error.message);
    errors++;
  }

  return { deleted, errors };
}

// Run the script
forceCleanupAllCalendarEvents();
