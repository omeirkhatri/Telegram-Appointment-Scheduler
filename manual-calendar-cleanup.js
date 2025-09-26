/**
 * Manual Calendar Cleanup
 *
 * This script provides a manual way to clean up orphaned calendar events
 * when the Google Calendar service is not available.
 *
 * Instructions:
 * 1. Go to Google Calendar
 * 2. Find the appointments that should be deleted
 * 3. Delete them manually from Google Calendar
 * 4. Run this script to clean up the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function manualCalendarCleanup() {
  console.log('🧹 Manual Calendar Cleanup Helper...\n');

  try {
    // Get all appointment_staff records with google_event_id
    const { data: appointmentStaff, error: appointmentError } = await supabase
      .from('appointment_staff')
      .select(`
        id,
        appointment_id,
        google_event_id,
        role,
        created_at,
        staff:staff_id (
          id,
          first_name,
          last_name,
          google_calendar_id
        )
      `)
      .not('google_event_id', 'is', null);

    if (appointmentError) {
      throw new Error(`Failed to fetch appointment staff: ${appointmentError.message}`);
    }

    console.log(`📅 Found ${appointmentStaff?.length || 0} appointment staff records with calendar events`);

    if (!appointmentStaff || appointmentStaff.length === 0) {
      console.log('✅ No appointment staff records with calendar events found');
      console.log('This means there are no database records to clean up.');
      console.log('The appointments you see in Google Calendar were likely created outside of this app.');
      return;
    }

    // Get all existing appointments
    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id');

    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    const existingAppointmentIds = new Set(existingAppointments?.map(apt => apt.id) || []);
    console.log(`📋 Found ${existingAppointmentIds.size} existing appointments in database`);

    // Find orphaned records (appointment_staff records where the appointment no longer exists)
    const orphanedRecords = appointmentStaff.filter(assignment =>
      !existingAppointmentIds.has(assignment.appointment_id)
    );

    console.log(`\n🗑️ Found ${orphanedRecords.length} orphaned database records:`);

    if (orphanedRecords.length > 0) {
      console.log('\nThese database records should be cleaned up:');
      orphanedRecords.forEach((assignment, index) => {
        const staff = assignment.staff;
        console.log(`\n${index + 1}. Assignment ID: ${assignment.id}`);
        console.log(`   Appointment ID: ${assignment.appointment_id} (DELETED FROM DATABASE)`);
        console.log(`   Staff: ${staff?.first_name} ${staff?.last_name}`);
        console.log(`   Calendar ID: ${staff?.google_calendar_id}`);
        console.log(`   Event ID: ${assignment.google_event_id}`);
        console.log(`   Role: ${assignment.role}`);
        console.log(`   Created: ${assignment.created_at}`);
      });

      console.log('\n🔧 To clean up these orphaned records, run:');
      console.log('   node cleanup-orphaned-database-records.js');
    } else {
      console.log('✅ No orphaned database records found');
    }

    // Show valid records
    const validRecords = appointmentStaff.filter(assignment =>
      existingAppointmentIds.has(assignment.appointment_id)
    );

    console.log(`\n✅ Found ${validRecords.length} valid database records:`);

    if (validRecords.length > 0) {
      console.log('\nThese database records are valid (have corresponding appointments):');
      validRecords.forEach((assignment, index) => {
        const staff = assignment.staff;
        console.log(`\n${index + 1}. Assignment ID: ${assignment.id}`);
        console.log(`   Appointment ID: ${assignment.appointment_id} (EXISTS IN DATABASE)`);
        console.log(`   Staff: ${staff?.first_name} ${staff?.last_name}`);
        console.log(`   Calendar ID: ${staff?.google_calendar_id}`);
        console.log(`   Event ID: ${assignment.google_event_id}`);
        console.log(`   Role: ${assignment.role}`);
      });

      console.log('\n⚠️  If you see appointments in Google Calendar that are NOT listed above,');
      console.log('   they were created outside of this app and should be deleted manually.');
    }

    console.log('\n📋 SUMMARY:');
    console.log(`   Total database records: ${appointmentStaff.length}`);
    console.log(`   Valid records: ${validRecords.length}`);
    console.log(`   Orphaned records: ${orphanedRecords.length}`);
    console.log(`   Existing appointments: ${existingAppointmentIds.size}`);

  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
  }
}

// Run the manual cleanup
manualCalendarCleanup();

