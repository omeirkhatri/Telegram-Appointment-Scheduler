/**
 * Manual Test of Calendar Sync Daemon Functions
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDaemonFunctions() {
  console.log('🧪 Testing Daemon Functions Manually...\n');

  try {
    // Test 1: Check for cancelled appointments
    console.log('🗑️ Testing cancelled appointments detection...');
    const { data: cancelledAppointments, error: cancelledError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, appointment_type, status')
      .eq('status', 'cancelled')
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .limit(20);

    if (cancelledError) {
      console.error('❌ Error:', cancelledError);
    } else {
      console.log(`✅ Found ${cancelledAppointments?.length || 0} cancelled appointments`);
    }

    // Test 2: Check for recently updated appointments
    console.log('\n🔄 Testing updated appointments detection...');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    console.log(`   Looking for appointments updated after: ${fiveMinutesAgo}`);

    const { data: updatedAppointments, error: updatedError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, appointment_type, status, updated_at')
      .eq('status', 'scheduled')
      .gte('updated_at', fiveMinutesAgo)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .limit(20);

    if (updatedError) {
      console.error('❌ Error:', updatedError);
    } else {
      console.log(`✅ Found ${updatedAppointments?.length || 0} updated appointments`);
      if (updatedAppointments && updatedAppointments.length > 0) {
        updatedAppointments.forEach(apt => {
          console.log(`   - ${apt.id} | ${apt.appointment_date} ${apt.start_time} | Updated: ${apt.updated_at}`);
        });
      }
    }

    // Test 3: Check for new appointments
    console.log('\n📅 Testing new appointments detection...');
    const { data: newAppointments, error: newError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, appointment_type, status')
      .eq('status', 'scheduled')
      .is('appointment_staff.google_event_id', null)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .limit(20);

    if (newError) {
      console.error('❌ Error:', newError);
    } else {
      console.log(`✅ Found ${newAppointments?.length || 0} new appointments`);
    }

    // Test 4: Check staff assignments for updated appointments
    if (updatedAppointments && updatedAppointments.length > 0) {
      console.log('\n👥 Testing staff assignments for updated appointments...');

      for (const appointment of updatedAppointments) {
        console.log(`\n   Checking appointment ${appointment.id}:`);

        const { data: staffAssignments, error: staffError } = await supabase
          .from('appointment_staff')
          .select(`
            id,
            google_event_id,
            role,
            staff:staff_id (
              id,
              first_name,
              last_name,
              google_calendar_id,
              email
            )
          `)
          .eq('appointment_id', appointment.id)
          .not('google_event_id', 'is', null);

        if (staffError) {
          console.error(`     ❌ Error fetching staff assignments:`, staffError);
        } else if (staffAssignments && staffAssignments.length > 0) {
          console.log(`     ✅ Found ${staffAssignments.length} staff assignments with calendar events`);
          staffAssignments.forEach(assignment => {
            console.log(`       - ${assignment.staff?.first_name} ${assignment.staff?.last_name} | Event ID: ${assignment.google_event_id} | Calendar ID: ${assignment.staff?.google_calendar_id}`);
          });
        } else {
          console.log(`     ⚠️ No staff assignments with calendar events found`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
testDaemonFunctions();
