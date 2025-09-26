#!/usr/bin/env node

/**
 * Test Soft Delete Workflow
 *
 * This script tests the complete soft delete workflow:
 * 1. Create an appointment
 * 2. Soft delete it (status = 'deleted')
 * 3. Verify it doesn't appear in normal queries
 * 4. Verify it appears in deleted queries
 * 5. Test daemon cleanup
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSoftDeleteWorkflow() {
  console.log('🧪 Starting Soft Delete Workflow Test...\n');

  try {
    // Step 1: Create a test appointment
    console.log('📅 Step 1: Creating test appointment...');
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .limit(1)
      .single();

    if (patientError || !patient) {
      console.error('❌ No patients found. Please create a patient first.');
      return;
    }

    const testAppointment = {
      patient_id: patient.id,
      appointment_type: 'doctor_on_call',
      appointment_date: '2025-12-25',
      start_time: '10:00:00',
      duration_minutes: 60,
      status: 'scheduled',
      notes: 'Test appointment for soft delete workflow'
    };

    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert(testAppointment)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create appointment: ${createError.message}`);
    }

    console.log(`✅ Created appointment ${appointment.id}`);

    // Step 2: Verify appointment appears in normal queries
    console.log('\n📅 Step 2: Verifying appointment appears in normal queries...');
    const { data: normalAppointments, error: normalError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment.id)
      .neq('status', 'deleted');

    if (normalError) {
      throw new Error(`Failed to query normal appointments: ${normalError.message}`);
    }

    if (normalAppointments.length === 0) {
      throw new Error('Appointment should appear in normal queries');
    }

    console.log('✅ Appointment appears in normal queries');

    // Step 3: Soft delete the appointment
    console.log('\n📅 Step 3: Soft deleting appointment...');
    const { error: softDeleteError } = await supabase.rpc('soft_delete_appointment', {
      appointment_id: appointment.id
    });

    if (softDeleteError) {
      throw new Error(`Failed to soft delete appointment: ${softDeleteError.message}`);
    }

    console.log('✅ Appointment soft deleted');

    // Step 4: Verify appointment doesn't appear in normal queries
    console.log('\n📅 Step 4: Verifying appointment is hidden from normal queries...');
    const { data: hiddenAppointments, error: hiddenError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment.id)
      .neq('status', 'deleted');

    if (hiddenError) {
      throw new Error(`Failed to query hidden appointments: ${hiddenError.message}`);
    }

    if (hiddenAppointments.length > 0) {
      throw new Error('Appointment should be hidden from normal queries');
    }

    console.log('✅ Appointment is hidden from normal queries');

    // Step 5: Verify appointment appears in deleted queries
    console.log('\n📅 Step 5: Verifying appointment appears in deleted queries...');
    const { data: deletedAppointments, error: deletedError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment.id)
      .eq('status', 'deleted');

    if (deletedError) {
      throw new Error(`Failed to query deleted appointments: ${deletedError.message}`);
    }

    if (deletedAppointments.length === 0) {
      throw new Error('Appointment should appear in deleted queries');
    }

    console.log('✅ Appointment appears in deleted queries');

    // Step 6: Test restore functionality
    console.log('\n📅 Step 6: Testing restore functionality...');
    const { error: restoreError } = await supabase.rpc('restore_appointment', {
      appointment_id: appointment.id,
      new_status: 'scheduled'
    });

    if (restoreError) {
      throw new Error(`Failed to restore appointment: ${restoreError.message}`);
    }

    console.log('✅ Appointment restored');

    // Step 7: Verify appointment appears in normal queries again
    console.log('\n📅 Step 7: Verifying appointment appears in normal queries after restore...');
    const { data: restoredAppointments, error: restoredError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment.id)
      .neq('status', 'deleted');

    if (restoredError) {
      throw new Error(`Failed to query restored appointments: ${restoredError.message}`);
    }

    if (restoredAppointments.length === 0) {
      throw new Error('Restored appointment should appear in normal queries');
    }

    console.log('✅ Restored appointment appears in normal queries');

    // Step 8: Test daemon cleanup (hard delete)
    console.log('\n📅 Step 8: Testing daemon cleanup...');

    // First, soft delete again
    const { error: softDeleteAgainError } = await supabase.rpc('soft_delete_appointment', {
      appointment_id: appointment.id
    });

    if (softDeleteAgainError) {
      throw new Error(`Failed to soft delete appointment again: ${softDeleteAgainError.message}`);
    }

    // Simulate daemon cleanup by hard deleting
    const { error: hardDeleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointment.id);

    if (hardDeleteError) {
      throw new Error(`Failed to hard delete appointment: ${hardDeleteError.message}`);
    }

    console.log('✅ Appointment hard deleted (daemon cleanup)');

    // Step 9: Verify appointment is completely gone
    console.log('\n📅 Step 9: Verifying appointment is completely gone...');
    const { data: goneAppointments, error: goneError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment.id);

    if (goneError) {
      throw new Error(`Failed to query gone appointments: ${goneError.message}`);
    }

    if (goneAppointments.length > 0) {
      throw new Error('Appointment should be completely gone after hard delete');
    }

    console.log('✅ Appointment is completely gone');

    console.log('\n🎉 All tests passed! Soft delete workflow is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSoftDeleteWorkflow();
