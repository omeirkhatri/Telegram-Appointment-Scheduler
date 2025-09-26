/**
 * Test Google Calendar Service Initialization
 *
 * This script tests the Google Calendar service initialization to identify
 * why the service is not available.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testGoogleCalendarInit() {
  console.log('🔧 Testing Google Calendar Service Initialization...\n');

  try {
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log('GOOGLE_CALENDAR_API_ENABLED:', process.env.GOOGLE_CALENDAR_API_ENABLED);
    console.log('GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY exists:', !!process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY);
    console.log('GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL);

    // Test the API endpoint that should initialize the service
    console.log('\n🔍 Testing API endpoint...');

    const response = await fetch('http://localhost:3000/api/calendar/event-exists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        google_calendar_id: 'primary',
        google_event_id: 'test'
      })
    });

    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));

    // Test the list events endpoint
    console.log('\n🔍 Testing list events endpoint...');

    const listResponse = await fetch('http://localhost:3000/api/calendar/list-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        google_calendar_id: 'primary',
        max_results: 5
      })
    });

    const listResult = await listResponse.json();
    console.log('List Events Response:', JSON.stringify(listResult, null, 2));

    // Test calendar status endpoint
    console.log('\n🔍 Testing calendar status endpoint...');

    const statusResponse = await fetch('http://localhost:3000/api/calendar/status?google_calendar_id=primary', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const statusResult = await statusResponse.json();
    console.log('Status Response:', JSON.stringify(statusResult, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testGoogleCalendarInit();

