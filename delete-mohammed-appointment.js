#!/usr/bin/env node

/**
 * Delete Mohammed Al Rashid Appointment from Google Calendar
 *
 * This script will:
 * 1. List events in Ahmed Al Zahra's calendar for September 30, 2025
 * 2. Find the Mohammed Al Rashid appointment
 * 3. Delete it from the calendar
 */

const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

// Ahmed Al Zahra's Calendar ID (from the existing script)
const AHMED_CALENDAR_ID = 'fa56fb3cafa281059d90f3d2d7ad49fc854d3f28b474adaa78ea6965ed613115@group.calendar.google.com';

// Target appointment details
const TARGET_PATIENT = 'Mohammed Al Rashid';
const TARGET_DATE = '2025-09-30';
const TARGET_TIME = '12:00'; // 12:00 AM

async function deleteMohammedAppointment() {
  console.log('🗑️  Deleting Mohammed Al Rashid appointment from Google Calendar...\n');

  try {
    // Check if credentials are configured
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
      private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`
    };

    // Validate credentials
    if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
      console.log('❌ Google Calendar credentials not configured');
      console.log('📋 Required environment variables:');
      console.log('- GOOGLE_SERVICE_ACCOUNT_EMAIL');
      console.log('- GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
      console.log('- GOOGLE_SERVICE_ACCOUNT_PROJECT_ID');
      return;
    }

    console.log('✅ Google Calendar credentials found');
    console.log(`📧 Service Account: ${credentials.client_email}`);
    console.log(`📅 Calendar ID: ${AHMED_CALENDAR_ID}`);
    console.log(`🎯 Target: ${TARGET_PATIENT} on ${TARGET_DATE} at ${TARGET_TIME}\n`);

    // Initialize Google Calendar API
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    console.log('🔍 Searching for events around September 30, 2025...');

    // Search for events in a broader date range (September 25 - October 5, 2025)
    const timeMin = new Date('2025-09-25T00:00:00Z').toISOString();
    const timeMax = new Date('2025-10-05T23:59:59Z').toISOString();

    const response = await calendar.events.list({
      calendarId: AHMED_CALENDAR_ID,
      timeMin: timeMin,
      timeMax: timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    console.log(`📅 Found ${events.length} events in the date range (Sep 25 - Oct 5, 2025)`);

    if (events.length === 0) {
      console.log('✅ No events found in this date range');
      return;
    }

    // Display all events found
    console.log('\n📋 Events found:');
    events.forEach((event, index) => {
      const start = event.start?.dateTime || event.start?.date;
      const summary = event.summary || 'No title';
      const description = event.description || 'No description';
      console.log(`${index + 1}. ${summary}`);
      console.log(`   Start: ${start}`);
      console.log(`   ID: ${event.id}`);
      console.log(`   Description: ${description.substring(0, 100)}...`);
      console.log('');
    });

    // Find the Mohammed Al Rashid appointment
    const targetEvent = events.find(event => {
      const summary = event.summary || '';
      const description = event.description || '';

      return summary.includes(TARGET_PATIENT) ||
             description.includes(TARGET_PATIENT) ||
             summary.includes('Mohammed') ||
             description.includes('Mohammed');
    });

    if (!targetEvent) {
      console.log(`❌ No appointment found for ${TARGET_PATIENT} on ${TARGET_DATE}`);
      console.log('🔍 Available events:');
      events.forEach(event => {
        console.log(`   - ${event.summary || 'Untitled'}`);
      });
      return;
    }

    console.log(`✅ Found target appointment:`);
    console.log(`   Title: ${targetEvent.summary}`);
    console.log(`   Start: ${targetEvent.start?.dateTime || targetEvent.start?.date}`);
    console.log(`   Event ID: ${targetEvent.id}`);
    console.log('');

    // Confirm deletion
    console.log('🗑️  Proceeding with deletion...');

    // Delete the event
    await calendar.events.delete({
      calendarId: AHMED_CALENDAR_ID,
      eventId: targetEvent.id
    });

    console.log(`✅ Successfully deleted appointment: ${targetEvent.summary}`);
    console.log(`📅 Event ID: ${targetEvent.id}`);
    console.log('\n🎉 Mohammed Al Rashid appointment has been removed from the calendar!');
    console.log('📱 Check Google Calendar to verify the deletion');

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.response) {
      console.error('📋 Response details:', error.response.data);
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if the service account has access to the calendar');
    console.log('2. Verify the calendar ID is correct');
    console.log('3. Ensure the appointment exists on the specified date');
  }
}

// Run the script
if (require.main === module) {
  deleteMohammedAppointment()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { deleteMohammedAppointment };
