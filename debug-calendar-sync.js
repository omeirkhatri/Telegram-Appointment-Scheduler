/**
 * Debug Calendar Sync Script
 *
 * This script helps debug why appointments aren't being detected for updates/deletes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCalendarSync() {
  console.log('🔍 Debugging Calendar Sync Issues...\n');

  try {
    // 1. Check all appointments and their status
    console.log('📋 All Appointments:');
    const { data: allAppointments, error: allError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, appointment_type, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.error('❌ Error fetching appointments:', allError);
      return;
    }

    if (allAppointments && allAppointments.length > 0) {
      allAppointments.forEach(apt => {
        console.log(`   ${apt.id} | ${apt.status} | ${apt.appointment_date} ${apt.start_time} | ${apt.appointment_type} | Updated: ${apt.updated_at}`);
      });
    } else {
      console.log('   No appointments found');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 2. Check cancelled appointments
    console.log('🗑️ Cancelled Appointments:');
    const { data: cancelledAppointments, error: cancelledError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, appointment_type, status, updated_at')
      .eq('status', 'cancelled')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (cancelledError) {
      console.error('❌ Error fetching cancelled appointments:', cancelledError);
    } else if (cancelledAppointments && cancelledAppointments.length > 0) {
      cancelledAppointments.forEach(apt => {
        console.log(`   ${apt.id} | ${apt.appointment_date} ${apt.start_time} | ${apt.appointment_type} | Updated: ${apt.updated_at}`);
      });
    } else {
      console.log('   No cancelled appointments found');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 3. Check recently updated appointments (last 10 minutes)
    console.log('🔄 Recently Updated Appointments (last 10 minutes):');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: recentAppointments, error: recentError } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, appointment_type, status, updated_at')
      .gte('updated_at', tenMinutesAgo)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent appointments:', recentError);
    } else if (recentAppointments && recentAppointments.length > 0) {
      recentAppointments.forEach(apt => {
        console.log(`   ${apt.id} | ${apt.status} | ${apt.appointment_date} ${apt.start_time} | ${apt.appointment_type} | Updated: ${apt.updated_at}`);
      });
    } else {
      console.log('   No recently updated appointments found');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 4. Check appointment_staff assignments
    console.log('👥 Appointment Staff Assignments:');
    const { data: staffAssignments, error: staffError } = await supabase
      .from('appointment_staff')
      .select(`
        id,
        appointment_id,
        google_event_id,
        role,
        staff:staff_id (
          id,
          first_name,
          last_name,
          google_calendar_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (staffError) {
      console.error('❌ Error fetching staff assignments:', staffError);
    } else if (staffAssignments && staffAssignments.length > 0) {
      staffAssignments.forEach(assignment => {
        const hasEventId = assignment.google_event_id ? '✅' : '❌';
        const hasCalendarId = assignment.staff?.google_calendar_id ? '✅' : '❌';
        console.log(`   ${assignment.appointment_id} | ${assignment.staff?.first_name} ${assignment.staff?.last_name} | Event ID: ${hasEventId} | Calendar ID: ${hasCalendarId} | Role: ${assignment.role}`);
      });
    } else {
      console.log('   No staff assignments found');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 5. Check specific appointment if provided
    if (process.argv[2]) {
      const appointmentId = process.argv[2];
      console.log(`🔍 Detailed info for appointment ${appointmentId}:`);

      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id(id, name, phone, email, date_of_birth, address, area, city),
          appointment_staff(
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
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (aptError) {
        console.error('❌ Error fetching appointment:', aptError);
      } else if (appointment) {
        console.log('   Appointment:', JSON.stringify(appointment, null, 2));
      } else {
        console.log('   Appointment not found');
      }
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug script
debugCalendarSync();
