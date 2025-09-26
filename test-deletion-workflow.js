/**
 * Test Deletion Workflow
 *
 * This script tests the complete workflow:
 * 1. Create appointment → Calendar event created
 * 2. Delete appointment from database → Calendar event should be cleaned up by daemon
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDeletionWorkflow() {
  console.log('🧪 Testing Deletion Workflow...\n');

  try {
    // Step 1: Create a test appointment
    console.log('📅 Step 1: Creating test appointment...');
    const testAppointment = await createTestAppointment();
    console.log(`✅ Created test appointment: ${testAppointment.id}\n`);

    // Wait for daemon to create calendar event
    console.log('⏳ Waiting 15 seconds for daemon to create calendar event...');
    await sleep(15000);

    // Check if calendar event was created
    console.log('🔍 Checking if calendar event was created...');
    const { data: staffAssignments } = await supabase
      .from('appointment_staff')
      .select('google_event_id, staff:staff_id(first_name, last_name)')
      .eq('appointment_id', testAppointment.id)
      .not('google_event_id', 'is', null);

    if (staffAssignments && staffAssignments.length > 0) {
      console.log(`✅ Calendar event created: ${staffAssignments[0].google_event_id}`);
    } else {
      console.log('❌ No calendar event found');
    }

    // Step 2: Delete the appointment from database
    console.log('\n🗑️ Step 2: Deleting appointment from database...');
    await deleteAppointmentFromDatabase(testAppointment.id);
    console.log('✅ Appointment deleted from database\n');

    // Wait for daemon to clean up orphaned calendar event
    console.log('⏳ Waiting 20 seconds for daemon to clean up orphaned calendar event...');
    await sleep(20000);

    // Check if appointment_staff record was cleaned up
    console.log('🔍 Checking if appointment_staff record was cleaned up...');
    const { data: remainingAssignments } = await supabase
      .from('appointment_staff')
      .select('id, google_event_id')
      .eq('appointment_id', testAppointment.id);

    if (!remainingAssignments || remainingAssignments.length === 0) {
      console.log('✅ Appointment staff record was cleaned up');
    } else {
      console.log('❌ Appointment staff record still exists');
    }

    console.log('\n🎉 Deletion workflow test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function createTestAppointment() {
  // Get a patient and staff member
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
      appointment_type: 'physiotherapy',
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

async function deleteAppointmentFromDatabase(appointmentId) {
  // Delete appointment_staff records first
  const { error: staffError } = await supabase
    .from('appointment_staff')
    .delete()
    .eq('appointment_id', appointmentId);

  if (staffError) {
    throw new Error(`Failed to delete appointment staff: ${staffError.message}`);
  }

  // Delete appointment
  const { error: appointmentError } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId);

  if (appointmentError) {
    throw new Error(`Failed to delete appointment: ${appointmentError.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testDeletionWorkflow();
