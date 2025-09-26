/**
 * Check Main Calendar
 *
 * This script checks the main Google Calendar for events that might be showing up
 * but not properly tracked in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMainCalendar() {
  console.log('🔍 Checking Main Google Calendar...\n');

  try {
    // Check if we can access the main calendar
    const mainCalendarId = 'primary'; // This is the main calendar ID

    console.log('📅 Checking main calendar (primary)...');

    try {
      const response = await fetch('http://localhost:3000/api/calendar/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Calendar status response:', JSON.stringify(result, null, 2));

    } catch (error) {
      console.error('❌ Error checking main calendar:', error.message);
    }

    // Let's also check if there are any appointments that might have been created recently
    console.log('\n📊 Checking for recent appointments in database...');

    const { data: recentAppointments, error: recentError } = await supabase
      .from('appointments')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false });

    if (recentError) {
      console.error('❌ Error fetching recent appointments:', recentError);
    } else {
      console.log(`📅 Found ${recentAppointments?.length || 0} recent appointments:`);
      recentAppointments?.forEach(apt => {
        console.log(`   - ${apt.id}: ${apt.appointment_date} ${apt.start_time} (${apt.status}) - ${apt.appointment_type}`);
        console.log(`     Created: ${apt.created_at}`);
        console.log(`     Patient: ${apt.patient_id}`);
        console.log('');
      });
    }

    // Check for any appointment_staff records
    console.log('\n👥 Checking all appointment_staff records...');

    const { data: allStaffRecords, error: allStaffError } = await supabase
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
      .order('created_at', { ascending: false });

    if (allStaffError) {
      console.error('❌ Error fetching all staff records:', allStaffError);
    } else {
      console.log(`👥 Found ${allStaffRecords?.length || 0} total appointment staff records:`);
      allStaffRecords?.forEach(assignment => {
        const staff = assignment.staff;
        console.log(`   - Assignment ${assignment.id}:`);
        console.log(`     Appointment: ${assignment.appointment_id}`);
        console.log(`     Staff: ${staff?.first_name} ${staff?.last_name}`);
        console.log(`     Calendar ID: ${staff?.google_calendar_id || 'None'}`);
        console.log(`     Event ID: ${assignment.google_event_id || 'None'}`);
        console.log(`     Role: ${assignment.role}`);
        console.log(`     Created: ${assignment.created_at}`);
        console.log('');
      });
    }

    // Check if there are any events in the main calendar that might be orphaned
    console.log('\n🔍 Checking for orphaned events in main calendar...');

    // This would require implementing a way to list events from the main calendar
    // For now, let's just check if we can access it

    try {
      const response = await fetch('http://localhost:3000/api/calendar/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Main calendar is accessible');
      } else {
        console.log('❌ Main calendar is not accessible');
      }

    } catch (error) {
      console.error('❌ Error accessing main calendar:', error.message);
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkMainCalendar();

