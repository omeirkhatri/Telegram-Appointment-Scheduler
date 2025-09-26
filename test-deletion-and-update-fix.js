#!/usr/bin/env node

/**
 * Test Deletion and Update Fixes
 *
 * This script tests the fixes for deletion and rescheduling issues.
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDeletionAndUpdateFixes() {
  console.log('🧪 Testing Deletion and Update Fixes...\n');

  try {
    // Step 1: Find an appointment with calendar events to test
    console.log('🔍 Finding appointment with calendar events to test...');

    const { data: testAppointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        status,
        appointment_date,
        start_time,
        appointment_type,
        appointment_staff!inner(
          id,
          google_event_id,
          staff:staff_id(
            first_name,
            last_name,
            google_calendar_id
          )
        )
      `)
      .eq('status', 'scheduled')
      .not('appointment_staff.google_event_id', 'is', null)
      .limit(1);

    if (error) {
      console.error('❌ Error finding test appointments:', error.message);
      return;
    }

    if (!testAppointments || testAppointments.length === 0) {
      console.log('⚠️ No appointments with calendar events found to test');
      console.log('🎯 Creating a test appointment...');

      // Create a test appointment for testing
      await createTestAppointment();
      return;
    }

    const testAppointment = testAppointments[0];
    console.log(`📅 Found test appointment: ${testAppointment.id}`);
    console.log(`   Date: ${testAppointment.appointment_date} ${testAppointment.start_time}`);
    console.log(`   Type: ${testAppointment.appointment_type}`);
    console.log(`   Staff assignments with calendar events:`);

    testAppointment.appointment_staff.forEach(assignment => {
      const staff = assignment.staff;
      console.log(`      👤 ${staff.first_name} ${staff.last_name}: Event ${assignment.google_event_id}`);
    });

    // Step 2: Test update (rescheduling)
    console.log('\n🔄 Testing appointment update (rescheduling)...');

    const originalDate = testAppointment.appointment_date;
    const originalTime = testAppointment.start_time;

    // Move appointment to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newDate = tomorrow.toISOString().split('T')[0];
    const newTime = '14:30:00';

    console.log(`   Changing from: ${originalDate} ${originalTime}`);
    console.log(`   Changing to: ${newDate} ${newTime}`);

    try {
      const updateResponse = await fetch('http://localhost:3000/api/appointments/' + testAppointment.id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_date: newDate,
          start_time: newTime
        })
      });

      const updateResult = await updateResponse.json();

      if (updateResult.success) {
        console.log('✅ Update API call successful');

        // Wait a moment for sync to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if appointment was updated in database
        const { data: updatedAppointment } = await supabase
          .from('appointments')
          .select('appointment_date, start_time')
          .eq('id', testAppointment.id)
          .single();

        if (updatedAppointment) {
          console.log(`✅ Database updated: ${updatedAppointment.appointment_date} ${updatedAppointment.start_time}`);
        }

      } else {
        console.error('❌ Update API call failed:', updateResult.error);
      }
    } catch (updateError) {
      console.error('❌ Update test failed:', updateError.message);
    }

    // Step 3: Test deletion
    console.log('\n🗑️ Testing appointment deletion...');

    // Get current calendar events before deletion
    const { data: beforeDeletion } = await supabase
      .from('appointment_staff')
      .select('id, google_event_id')
      .eq('appointment_id', testAppointment.id)
      .not('google_event_id', 'is', null);

    console.log(`   Calendar events before deletion: ${beforeDeletion?.length || 0}`);

    try {
      const deleteResponse = await fetch('http://localhost:3000/api/appointments/' + testAppointment.id, {
        method: 'DELETE'
      });

      const deleteResult = await deleteResponse.json();

      if (deleteResult.success) {
        console.log('✅ Delete API call successful');

        // Wait a moment for sync to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if appointment was marked as deleted
        const { data: deletedAppointment } = await supabase
          .from('appointments')
          .select('status')
          .eq('id', testAppointment.id)
          .single();

        if (deletedAppointment) {
          console.log(`✅ Appointment status: ${deletedAppointment.status}`);
        }

        // Check if calendar events were cleared
        const { data: afterDeletion } = await supabase
          .from('appointment_staff')
          .select('id, google_event_id')
          .eq('appointment_id', testAppointment.id)
          .not('google_event_id', 'is', null);

        console.log(`   Calendar events after deletion: ${afterDeletion?.length || 0}`);

        if ((afterDeletion?.length || 0) === 0) {
          console.log('✅ Calendar events successfully cleared from database');
        } else {
          console.log('⚠️ Some calendar events still exist in database - daemon should clean them up');
        }

      } else {
        console.error('❌ Delete API call failed:', deleteResult.error);
      }
    } catch (deleteError) {
      console.error('❌ Delete test failed:', deleteError.message);
    }

    console.log('\n📋 Test Summary:');
    console.log('✅ Update (rescheduling) test completed');
    console.log('✅ Delete test completed');
    console.log('🔄 Monitor daemon logs to see if sync operations are working');
    console.log('📊 Check Google Calendar to verify events were updated/deleted');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

async function createTestAppointment() {
  console.log('🎯 Creating a test appointment with calendar events...');

  // This would require more setup - for now just inform user
  console.log('⚠️ No test appointments available');
  console.log('📋 To test the fixes:');
  console.log('1. Create an appointment through your app');
  console.log('2. Verify it appears in Google Calendar');
  console.log('3. Try rescheduling the appointment');
  console.log('4. Try deleting the appointment');
  console.log('5. Check if Google Calendar events are updated/removed');
}

// Run the test
testDeletionAndUpdateFixes();




