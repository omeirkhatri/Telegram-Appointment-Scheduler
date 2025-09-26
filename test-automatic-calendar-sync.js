#!/usr/bin/env node

/**
 * Test Automatic Calendar Sync
 *
 * This script tests that appointments automatically sync with Google Calendar
 * when created and deleted
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const { AppointmentService } = require('./src/services/appointmentService.ts');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const appointmentService = new AppointmentService();

async function testAutomaticCalendarSync() {
  console.log('🧪 Testing Automatic Calendar Sync...\n');

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
        notes: 'Test appointment for calendar sync'
      },
      transportation_type: 'none',
      notes: 'Test appointment for automatic calendar sync'
    };

    const createdAppointment = await appointmentService.createAppointment(testAppointment);
    console.log(`✅ Created appointment: ${createdAppointment.id}`);

    // Step 2: Check if Google Calendar event was created
    console.log('\n📅 Step 2: Checking Google Calendar event creation...');

    // Wait a moment for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: updatedAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('google_event_ids')
      .eq('id', createdAppointment.id)
      .single();

    if (fetchError) {
      console.log('❌ Error fetching appointment:', fetchError.message);
    } else {
      console.log('📋 Google Event IDs:', JSON.stringify(updatedAppointment.google_event_ids, null, 2));

      if (updatedAppointment.google_event_ids && Object.keys(updatedAppointment.google_event_ids).length > 0) {
        console.log('✅ Google Calendar event was created and stored!');
      } else {
        console.log('❌ Google Calendar event was not created or stored');
      }
    }

    // Step 3: Delete the appointment
    console.log('\n📅 Step 3: Deleting appointment...');

    await appointmentService.deleteAppointment(createdAppointment.id);
    console.log('✅ Appointment deleted');

    // Step 4: Check if Google Calendar event was deleted
    console.log('\n📅 Step 4: Checking Google Calendar event deletion...');

    // Wait a moment for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: deletedAppointment, error: deleteFetchError } = await supabase
      .from('appointments')
      .select('google_event_ids, status')
      .eq('id', createdAppointment.id)
      .single();

    if (deleteFetchError) {
      console.log('❌ Error fetching deleted appointment:', deleteFetchError.message);
    } else {
      console.log('📋 Status:', deletedAppointment.status);
      console.log('📋 Google Event IDs after deletion:', JSON.stringify(deletedAppointment.google_event_ids, null, 2));

      if (deletedAppointment.status === 'deleted' &&
          (!deletedAppointment.google_event_ids || Object.keys(deletedAppointment.google_event_ids).length === 0)) {
        console.log('✅ Appointment soft-deleted and Google Calendar events cleaned up!');
      } else {
        console.log('❌ Google Calendar events were not properly cleaned up');
      }
    }

    console.log('\n🎉 Test completed!');
    console.log('\n📋 Summary:');
    console.log('- Appointment creation should create Google Calendar events');
    console.log('- Appointment deletion should delete Google Calendar events');
    console.log('- google_event_ids should be stored and cleared properly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testAutomaticCalendarSync();
