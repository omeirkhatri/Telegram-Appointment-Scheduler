#!/usr/bin/env node

/**
 * Test Calendar Integration
 *
 * This script tests the calendar integration by making API calls
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCalendarIntegration() {
  console.log('🧪 Testing Calendar Integration...\n');

  try {
    // Step 1: Check if Google Calendar is enabled
    console.log('📅 Step 1: Checking Google Calendar configuration...');

    const googleCalendarEnabled = process.env.GOOGLE_CALENDAR_ENABLED === 'true';
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const hasPrivateKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    console.log('GOOGLE_CALENDAR_ENABLED:', googleCalendarEnabled);
    console.log('Service Account Email:', hasServiceAccount ? '✅ Set' : '❌ Missing');
    console.log('Private Key:', hasPrivateKey ? '✅ Set' : '❌ Missing');

    if (!googleCalendarEnabled || !hasServiceAccount || !hasPrivateKey) {
      console.log('❌ Google Calendar integration not properly configured');
      return;
    }

    console.log('✅ Google Calendar integration is configured');

    // Step 2: Check existing appointments with google_event_ids
    console.log('\n📅 Step 2: Checking existing appointments...');

    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, status, google_event_ids')
      .not('google_event_ids', 'is', null)
      .neq('google_event_ids', '{}')
      .limit(5);

    if (fetchError) {
      console.log('❌ Error fetching appointments:', fetchError.message);
    } else {
      console.log(`📋 Found ${appointments.length} appointments with Google Calendar events`);
      appointments.forEach(apt => {
        console.log(`- ID: ${apt.id}, Date: ${apt.appointment_date}, Status: ${apt.status}`);
        console.log(`  Google Event IDs: ${JSON.stringify(apt.google_event_ids)}`);
      });
    }

    // Step 3: Check deleted appointments
    console.log('\n📅 Step 3: Checking deleted appointments...');

    const { data: deletedAppointments, error: deletedError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, status, google_event_ids')
      .eq('status', 'deleted')
      .limit(5);

    if (deletedError) {
      console.log('❌ Error fetching deleted appointments:', deletedError.message);
    } else {
      console.log(`📋 Found ${deletedAppointments.length} deleted appointments`);
      deletedAppointments.forEach(apt => {
        console.log(`- ID: ${apt.id}, Date: ${apt.appointment_date}, Status: ${apt.status}`);
        console.log(`  Google Event IDs: ${JSON.stringify(apt.google_event_ids)}`);
      });
    }

    console.log('\n🎉 Test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Create a new appointment through the web app');
    console.log('2. Check if Google Calendar event is created');
    console.log('3. Delete the appointment through the web app');
    console.log('4. Check if Google Calendar event is deleted automatically');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCalendarIntegration();

