#!/usr/bin/env node

/**
 * Test Appointment Deletion
 *
 * This script tests the appointment deletion process to ensure Google Calendar events are deleted
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAppointmentDeletion() {
  console.log('🧪 Testing Appointment Deletion Process...\n');

  try {
    // Step 1: Create a test appointment
    console.log('📅 Step 1: Creating test appointment...');

    const testAppointment = {
      patient_id: '660e8400-e29b-41d4-a716-446655440001', // Use existing patient
      appointment_type: 'physiotherapy',
      appointment_date: '2025-09-30',
      start_time: '14:00:00',
      duration_minutes: 45,
      status: 'scheduled',
      custom_fields: {
        test_appointment: true,
        notes: 'Test appointment for deletion testing'
      },
      transportation_type: 'none',
      notes: 'Test appointment for automatic deletion testing'
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
      .select('id, google_calendar_id')
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

    console.log(`✅ Assigned staff ${staff.id} to appointment`);

    // Step 3: Simulate Google Calendar event creation
    console.log('\n📅 Step 3: Simulating Google Calendar event creation...');

    // Store a fake Google Event ID in the appointment
    const fakeGoogleEventId = 'test-event-' + Date.now();
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        google_event_ids: { [staff.id]: fakeGoogleEventId }
      })
      .eq('id', createdAppointment.id);

    if (updateError) {
      console.log('❌ Error updating google_event_ids:', updateError.message);
      return;
    }

    console.log(`✅ Stored fake Google Event ID: ${fakeGoogleEventId}`);

    // Step 4: Test the deletion process
    console.log('\n📅 Step 4: Testing deletion process...');

    // Use the database function for soft delete
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
      console.log('✅ Appointment successfully soft-deleted!');
      console.log('\n📋 Next steps:');
      console.log('1. The appointment should be deleted from Google Calendar automatically');
      console.log('2. Check Google Calendar to verify the event is gone');
      console.log('3. If it\'s still there, the automatic deletion needs to be fixed');
    } else {
      console.log('❌ Appointment was not properly deleted');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAppointmentDeletion();

