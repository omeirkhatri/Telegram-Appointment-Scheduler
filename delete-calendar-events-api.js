#!/usr/bin/env node

/**
 * Delete Calendar Events via Google Calendar API
 *
 * This script directly deletes events from Google Calendar using the API
 * when you can't change permissions through the UI
 */

const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

// Ahmed Al Zahra's Calendar ID
const AHMED_CALENDAR_ID = 'fa56fb3cafa281059d90f3d2d7ad49fc854d3f28b474adaa78ea6965ed613115@group.calendar.google.com';

async function deleteCalendarEvents() {
  console.log('🗑️  Deleting calendar events via Google Calendar API...\n');

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
      console.log('');
      console.log('🔧 To set up:');
      console.log('1. Go to Google Cloud Console');
      console.log('2. Create a service account');
      console.log('3. Download JSON key file');
      console.log('4. Add credentials to .env.local');
      return;
    }

    console.log('✅ Google Calendar credentials found');
    console.log(`📧 Service Account: ${credentials.client_email}`);
    console.log(`📅 Calendar ID: ${AHMED_CALENDAR_ID}\n`);

    // Initialize Google Calendar API
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    console.log('🔍 Listing events in calendar...');

    // List all events
    const response = await calendar.events.list({
      calendarId: AHMED_CALENDAR_ID,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    console.log(`📅 Found ${events.length} events in calendar`);

    if (events.length === 0) {
      console.log('✅ No events found to delete');
      return;
    }

    // Display events
    events.forEach((event, index) => {
      const start = event.start?.dateTime || event.start?.date;
      const summary = event.summary || 'No title';
      console.log(`${index + 1}. ${summary} (${start}) - ID: ${event.id}`);
    });

    console.log('\n🗑️  Deleting all events...');

    // Delete all events
    let deletedCount = 0;
    let errorCount = 0;

    for (const event of events) {
      try {
        await calendar.events.delete({
          calendarId: AHMED_CALENDAR_ID,
          eventId: event.id
        });
        console.log(`✅ Deleted: ${event.summary || 'Untitled event'}`);
        deletedCount++;
      } catch (error) {
        console.log(`❌ Failed to delete ${event.summary || 'Untitled event'}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Deletion Summary:`);
    console.log(`✅ Successfully deleted: ${deletedCount} events`);
    console.log(`❌ Failed to delete: ${errorCount} events`);

    if (deletedCount > 0) {
      console.log('\n🎉 Calendar cleanup completed!');
      console.log('📅 Check Google Calendar to verify events are deleted');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('permission')) {
      console.log('\n🔧 Permission Error:');
      console.log('The service account needs edit permissions on the calendar');
      console.log('1. Go to Google Calendar settings');
      console.log('2. Share the calendar with the service account');
      console.log('3. Set permission to "Make changes to events"');
    } else if (error.message.includes('credentials')) {
      console.log('\n🔧 Credentials Error:');
      console.log('Check your .env.local file for correct Google Calendar credentials');
    }
  }
}

// Run the script
deleteCalendarEvents();

