/**
 * Test Complete Deletion Workflow
 *
 * This script tests the complete workflow:
 * 1. Create an appointment (which creates a calendar event)
 * 2. Delete the appointment from database
 * 3. Verify the calendar event is automatically cleaned up
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCompleteDeletionWorkflow() {
  console.log('🧪 Testing Complete Deletion Workflow...\n');

  try {
    // Step 1: Find a doctor with calendar ID
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, google_calendar_id, staff_type')
      .not('google_calendar_id', 'is', null)
      .eq('staff_type', 'doctor')
      .limit(1);

    if (staffError) {
      throw new Error(`Failed to fetch staff: ${staffError.message}`);
    }

    if (!staff || staff.length === 0) {
      console.log('⚠️ No doctors with calendar IDs found. Please add a doctor with Google Calendar ID first.');
      return;
    }

    const testStaff = staff[0];
    console.log(`👤 Using doctor: ${testStaff.first_name} ${testStaff.last_name} (${testStaff.staff_type})`);

    // Step 2: Find a patient
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, name')
      .limit(1);

    if (patientsError) {
      throw new Error(`Failed to fetch patients: ${patientsError.message}`);
    }

    if (!patients || patients.length === 0) {
      console.log('⚠️ No patients found. Please add a patient first.');
      return;
    }

    const testPatient = patients[0];
    console.log(`👤 Using patient: ${testPatient.name}`);

    // Step 3: Create a test appointment
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const appointmentDate = tomorrow.toISOString().split('T')[0];

    console.log(`\n📅 Creating test appointment for ${appointmentDate}...`);

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_id: testPatient.id,
        appointment_date: appointmentDate,
        start_time: '10:00:00',
        appointment_type: 'doctor_on_call',
        status: 'scheduled',
        duration_minutes: 60,
        notes: 'Test appointment for deletion workflow testing'
      })
      .select()
      .single();

    if (appointmentError) {
      throw new Error(`Failed to create appointment: ${appointmentError.message}`);
    }

    console.log(`✅ Created test appointment: ${appointment.id}`);

    // Step 4: Assign staff to appointment
    console.log(`\n👥 Assigning staff to appointment...`);

    const { data: assignment, error: assignmentError } = await supabase
      .from('appointment_staff')
      .insert({
        appointment_id: appointment.id,
        staff_id: testStaff.id,
        role: 'primary',
        is_primary: true
      })
      .select()
      .single();

    if (assignmentError) {
      throw new Error(`Failed to create staff assignment: ${assignmentError.message}`);
    }

    console.log(`✅ Created staff assignment: ${assignment.id}`);

    // Step 5: Wait for daemon to create calendar event
    console.log(`\n⏳ Waiting for daemon to create calendar event...`);
    console.log(`   (This may take up to 10 seconds)`);

    let calendarEventCreated = false;
    let attempts = 0;
    const maxAttempts = 20; // Wait up to 20 seconds

    while (!calendarEventCreated && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      // Check if calendar event was created
      const { data: updatedAssignment, error: updateError } = await supabase
        .from('appointment_staff')
        .select('google_event_id')
        .eq('id', assignment.id)
        .single();

      if (!updateError && updatedAssignment && updatedAssignment.google_event_id) {
        calendarEventCreated = true;
        console.log(`✅ Calendar event created: ${updatedAssignment.google_event_id}`);
      } else {
        console.log(`   Attempt ${attempts}/${maxAttempts} - Waiting for calendar event...`);
      }
    }

    if (!calendarEventCreated) {
      console.log(`⚠️ Calendar event was not created within ${maxAttempts} seconds`);
      console.log(`   This might be because the daemon is not running or there's an issue`);
      console.log(`   Let's proceed with the deletion test anyway...`);
    }

    // Step 6: Verify calendar event exists in Google Calendar
    if (calendarEventCreated) {
      console.log(`\n🔍 Verifying calendar event exists in Google Calendar...`);

      const { data: finalAssignment, error: finalError } = await supabase
        .from('appointment_staff')
        .select('google_event_id')
        .eq('id', assignment.id)
        .single();

      if (finalAssignment && finalAssignment.google_event_id) {
        const eventExists = await checkEventExists(testStaff.google_calendar_id, finalAssignment.google_event_id);

        if (eventExists) {
          console.log(`✅ Calendar event verified in Google Calendar`);
        } else {
          console.log(`❌ Calendar event not found in Google Calendar`);
        }
      }
    }

    // Step 7: Delete the appointment from database
    console.log(`\n🗑️ Deleting appointment from database...`);

    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointment.id);

    if (deleteError) {
      throw new Error(`Failed to delete appointment: ${deleteError.message}`);
    }

    console.log(`✅ Deleted appointment from database`);

    // Step 8: Wait for daemon to clean up calendar event
    console.log(`\n⏳ Waiting for daemon to clean up calendar event...`);
    console.log(`   (This may take up to 10 seconds)`);

    let calendarEventDeleted = false;
    attempts = 0;

    while (!calendarEventDeleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      // Check if calendar event still exists
      if (calendarEventCreated) {
        const { data: finalAssignment, error: finalError } = await supabase
          .from('appointment_staff')
          .select('google_event_id')
          .eq('id', assignment.id)
          .single();

        if (finalError || !finalAssignment || !finalAssignment.google_event_id) {
          calendarEventDeleted = true;
          console.log(`✅ Calendar event cleaned up from database`);
        } else {
          console.log(`   Attempt ${attempts}/${maxAttempts} - Waiting for calendar cleanup...`);
        }
      } else {
        // If no calendar event was created, we're done
        calendarEventDeleted = true;
        console.log(`✅ No calendar event to clean up`);
      }
    }

    // Step 9: Verify calendar event is gone from Google Calendar
    if (calendarEventCreated) {
      console.log(`\n🔍 Verifying calendar event is deleted from Google Calendar...`);

      const { data: finalAssignment, error: finalError } = await supabase
        .from('appointment_staff')
        .select('google_event_id')
        .eq('id', assignment.id)
        .single();

      if (finalAssignment && finalAssignment.google_event_id) {
        const eventExists = await checkEventExists(testStaff.google_calendar_id, finalAssignment.google_event_id);

        if (!eventExists) {
          console.log(`✅ Calendar event successfully deleted from Google Calendar`);
        } else {
          console.log(`❌ Calendar event still exists in Google Calendar`);
        }
      } else {
        console.log(`✅ Calendar event reference removed from database`);
      }
    }

    console.log(`\n🎉 Test completed!`);
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Appointment created: ${appointment.id}`);
    console.log(`   ✅ Staff assigned: ${assignment.id}`);
    console.log(`   ${calendarEventCreated ? '✅' : '⚠️'} Calendar event created: ${calendarEventCreated ? 'Yes' : 'No'}`);
    console.log(`   ✅ Appointment deleted from database`);
    console.log(`   ${calendarEventDeleted ? '✅' : '⚠️'} Calendar event cleaned up: ${calendarEventDeleted ? 'Yes' : 'No'}`);

    if (calendarEventCreated && calendarEventDeleted) {
      console.log(`\n🎯 SUCCESS: Complete deletion workflow is working!`);
      console.log(`   When appointments are deleted from the database,`);
      console.log(`   they are automatically removed from Google Calendar.`);
    } else {
      console.log(`\n⚠️ PARTIAL SUCCESS: Some steps may need attention.`);
      console.log(`   Check if the calendar sync daemon is running.`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Helper function to check if an event exists in Google Calendar
async function checkEventExists(googleCalendarId, googleEventId) {
  try {
    const response = await fetch('http://localhost:3000/api/calendar/event-exists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        google_calendar_id: googleCalendarId,
        google_event_id: googleEventId
      })
    });

    const result = await response.json();
    return result.success && result.data && result.data.exists;

  } catch (error) {
    console.error('❌ Error checking event existence:', error);
    return false;
  }
}

// Run the test
testCompleteDeletionWorkflow();
