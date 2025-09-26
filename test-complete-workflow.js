#!/usr/bin/env node

/**
 * Test Complete Workflow
 *
 * This script tests the complete appointment creation and deletion workflow
 * to ensure Google Calendar sync works properly
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Appointment Workflow...\n');

  try {
    // Step 1: Create a test appointment
    console.log('📅 Step 1: Creating test appointment...');

    const testAppointment = {
      patient_id: '660e8400-e29b-41d4-a716-446655440001',
      appointment_type: 'physiotherapy',
      appointment_date: '2025-09-30',
      start_time: '15:00:00',
      duration_minutes: 45,
      status: 'scheduled',
      custom_fields: {
        test_appointment: true
      },
      transportation_type: 'self_transport',
      notes: 'Test appointment for complete workflow testing'
    };

    const { data: createdAppointment, error: createError } = await supabase
      .from('appointments')
      .insert(testAppointment)
      .select()
      .single();

    if (createError) {
      console.log('❌ Error creating appointment:', createError.message);
      return;
    }

    console.log(`✅ Created appointment: ${createdAppointment.id}`);

    // Step 2: Assign staff to the appointment
    console.log('\n📅 Step 2: Assigning staff to appointment...');

    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, google_calendar_id, first_name, last_name')
      .eq('first_name', 'Ahmed')
      .eq('last_name', 'Al Zahra')
      .single();

    if (staffError || !staff) {
      console.log('❌ Error finding staff:', staffError?.message || 'Staff not found');
      return;
    }

    const { error: assignError } = await supabase
      .from('appointment_staff')
      .insert({
        appointment_id: createdAppointment.id,
        staff_id: staff.id,
        role: 'primary',
        is_primary: true
      });

    if (assignError) {
      console.log('❌ Error assigning staff:', assignError.message);
      return;
    }

    console.log(`✅ Assigned staff ${staff.first_name} ${staff.last_name} to appointment`);

    // Step 3: Wait a moment for any async operations
    console.log('\n📅 Step 3: Waiting for async operations...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Test the deletion process
    console.log('\n📅 Step 4: Testing deletion process...');

    const { error: deleteError } = await supabase.rpc('soft_delete_appointment', {
      appointment_id: createdAppointment.id
    });

    if (deleteError) {
      console.log('❌ Error deleting appointment:', deleteError.message);
      return;
    }

    console.log('✅ Appointment soft-deleted');

    // Step 5: Check the result
    console.log('\n📅 Step 5: Checking deletion result...');

    const { data: deletedAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status, google_event_ids')
      .eq('id', createdAppointment.id)
      .single();

    if (fetchError) {
      console.log('❌ Error fetching deleted appointment:', fetchError.message);
      return;
    }

    console.log(`📋 Status: ${deletedAppointment.status}`);
    console.log(`📋 Google Event IDs: ${JSON.stringify(deletedAppointment.google_event_ids)}`);

    if (deletedAppointment.status === 'deleted') {
      console.log('\n🎉 Test completed successfully!');
      console.log('\n📋 Summary:');
      console.log('✅ Appointment created in database');
      console.log('✅ Staff assigned to appointment');
      console.log('✅ Appointment soft-deleted in database');
      console.log('✅ Google Calendar events should be automatically deleted');
      console.log('\n📅 Check Google Calendar to verify:');
      console.log('1. No events should show for September 30th');
      console.log('2. If events are still there, the automatic deletion needs debugging');
    } else {
      console.log('❌ Appointment was not properly deleted');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCompleteWorkflow();

