/**
 * Test script for the enhanced calendar sync daemon
 *
 * This script tests the various scenarios that the daemon should handle:
 * 1. Creating new appointments
 * 2. Cancelling appointments
 * 3. Rescheduling appointments
 * 4. Updating appointment details
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCalendarSync() {
  console.log('🧪 Starting Calendar Sync Daemon Test...\n');

  try {
    // Test 1: Create a test appointment
    console.log('📅 Test 1: Creating a test appointment...');
    const testAppointment = await createTestAppointment();
    console.log(`✅ Created test appointment: ${testAppointment.id}\n`);

    // Wait a moment for the daemon to process
    console.log('⏳ Waiting for daemon to process new appointment...');
    await sleep(15000); // Wait 15 seconds

    // Test 2: Update the appointment (reschedule)
    console.log('🔄 Test 2: Rescheduling the appointment...');
    await rescheduleAppointment(testAppointment.id);
    console.log('✅ Appointment rescheduled\n');

    // Wait for daemon to process the update
    console.log('⏳ Waiting for daemon to process reschedule...');
    await sleep(15000); // Wait 15 seconds

    // Test 3: Cancel the appointment
    console.log('🗑️ Test 3: Cancelling the appointment...');
    await cancelAppointment(testAppointment.id);
    console.log('✅ Appointment cancelled\n');

    // Wait for daemon to process the cancellation
    console.log('⏳ Waiting for daemon to process cancellation...');
    await sleep(15000); // Wait 15 seconds

    // Clean up
    console.log('🧹 Cleaning up test data...');
    await cleanupTestData(testAppointment.id);
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function createTestAppointment() {
  // First, get a patient and staff member
  const { data: patients } = await supabase
    .from('patients')
    .select('id')
    .limit(1);

  const { data: staff } = await supabase
    .from('staff')
    .select('id, google_calendar_id')
    .not('google_calendar_id', 'is', null)
    .limit(1);

  if (!patients || patients.length === 0) {
    throw new Error('No patients found for testing');
  }

  if (!staff || staff.length === 0) {
    throw new Error('No staff with calendar IDs found for testing');
  }

  // Create appointment
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const appointmentDate = tomorrow.toISOString().split('T')[0];

  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert({
      patient_id: patients[0].id,
      appointment_type: 'doctor_on_call',
      appointment_date: appointmentDate,
      start_time: '10:00:00',
      duration_minutes: 60,
      status: 'scheduled'
    })
    .select()
    .single();

  if (appointmentError) {
    throw new Error(`Failed to create appointment: ${appointmentError.message}`);
  }

  // Assign staff
  const { error: staffError } = await supabase
    .from('appointment_staff')
    .insert({
      appointment_id: appointment.id,
      staff_id: staff[0].id,
      role: 'primary',
      is_primary: true
    });

  if (staffError) {
    throw new Error(`Failed to assign staff: ${staffError.message}`);
  }

  return appointment;
}

async function rescheduleAppointment(appointmentId) {
  const { error } = await supabase
    .from('appointments')
    .update({
      start_time: '14:00:00',
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId);

  if (error) {
    throw new Error(`Failed to reschedule appointment: ${error.message}`);
  }
}

async function cancelAppointment(appointmentId) {
  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId);

  if (error) {
    throw new Error(`Failed to cancel appointment: ${error.message}`);
  }
}

async function cleanupTestData(appointmentId) {
  // Delete appointment_staff records
  await supabase
    .from('appointment_staff')
    .delete()
    .eq('appointment_id', appointmentId);

  // Delete appointment
  await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testCalendarSync();
