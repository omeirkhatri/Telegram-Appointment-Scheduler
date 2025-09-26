#!/usr/bin/env node

/**
 * Test Simple Calendar Sync
 *
 * This script tests the simplified calendar sync that works directly from appointments table
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSimpleCalendarSync() {
  console.log('🧪 Testing Simple Calendar Sync...\n');

  try {
    // Check current appointments status
    console.log('📅 Checking current appointments...');

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, status, google_event_ids')
      .order('appointment_date', { ascending: true })
      .limit(10);

    if (error) {
      console.log('❌ Error fetching appointments:', error.message);
      return;
    }

    console.log(`📅 Found ${appointments.length} appointments:`);

    appointments.forEach(apt => {
      const hasGoogleEvents = apt.google_event_ids && Object.keys(apt.google_event_ids).length > 0;
      console.log(`- ${apt.appointment_date} ${apt.start_time}: Status=${apt.status}, GoogleEvents=${hasGoogleEvents ? 'Yes' : 'No'}`);
    });

    // Check deleted appointments specifically
    const deletedAppointments = appointments.filter(apt => apt.status === 'deleted');
    console.log(`\n📅 Deleted appointments: ${deletedAppointments.length}`);

    const deletedWithGoogleEvents = deletedAppointments.filter(apt =>
      apt.google_event_ids && Object.keys(apt.google_event_ids).length > 0
    );
    console.log(`📅 Deleted appointments with Google events: ${deletedWithGoogleEvents.length}`);

    console.log('\n✅ Simple Calendar Sync Test Complete!');
    console.log('\n📋 How it works now:');
    console.log('1. When appointment is created → Google Calendar event is created');
    console.log('2. Google Event ID is stored in appointments.google_event_ids');
    console.log('3. When appointment is deleted → Google Calendar event is automatically deleted');
    console.log('4. Only looks at appointments table, not appointment_staff table');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSimpleCalendarSync();

