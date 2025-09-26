/**
 * Calendar Sync Worker
 *
 * This script runs every 5 minutes to sync appointments to Google Calendar.
 * It finds appointments that don't have calendar events yet and creates them.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncAppointmentsToCalendar() {
  try {
    console.log('🔄 Starting calendar sync worker...');

    // Find appointments that don't have calendar events yet
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        appointment_staff!inner(
          id,
          google_event_id,
          staff:staff_id (
            id,
            first_name,
            last_name,
            google_calendar_id,
            email
          )
        )
      `)
      .eq('status', 'scheduled')
      .is('appointment_staff.google_event_id', null)
      .gte('appointment_date', new Date().toISOString().split('T')[0]) // Only future appointments
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(20); // Process up to 20 appointments per run

    if (error) {
      console.error('❌ Error fetching appointments:', error);
      return;
    }

    if (!appointments || appointments.length === 0) {
      console.log('✅ No appointments need calendar sync');
      return;
    }

    console.log(`📅 Found ${appointments.length} appointments to sync`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const appointment of appointments) {
      console.log(`\n📅 Processing appointment: ${appointment.id}`);
      console.log(`   Date: ${appointment.appointment_date}`);
      console.log(`   Time: ${appointment.start_time}`);
      console.log(`   Type: ${appointment.appointment_type}`);

      if (!appointment.appointment_staff || appointment.appointment_staff.length === 0) {
        console.log('⚠️ No staff assignments found, skipping');
        continue;
      }

      // Sync to each staff member's calendar
      for (const assignment of appointment.appointment_staff) {
        const staff = assignment.staff;

        if (!staff.google_calendar_id) {
          console.log(`⚠️ Staff ${staff.first_name} ${staff.last_name} has no calendar ID, skipping`);
          continue;
        }

        console.log(`👤 Syncing to staff: ${staff.first_name} ${staff.last_name}`);

        try {
          // Calculate end time
          const startTime = appointment.start_time;
          const duration = appointment.duration_minutes || 60;
          const [hours, minutes] = startTime.split(':');
          const endMinutes = parseInt(minutes) + duration;
          const endHours = parseInt(hours) + Math.floor(endMinutes / 60);
          const finalEndMinutes = endMinutes % 60;
          const endTime = `${endHours.toString().padStart(2, '0')}:${finalEndMinutes.toString().padStart(2, '0')}:00`;

          const eventData = {
            staff_id: staff.id,
            google_calendar_id: staff.google_calendar_id,
            event_title: `Appointment: ${appointment.appointment_type}`,
            event_description: `Appointment with patient on ${appointment.appointment_date}`,
            start_time: `${appointment.appointment_date}T${appointment.start_time}`,
            end_time: `${appointment.appointment_date}T${endTime}`
          };

          console.log(`📅 Creating calendar event...`);

          const response = await fetch('http://localhost:3000/api/calendar/create-simple', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
          });

          const result = await response.json();

          if (result.success) {
            console.log(`✅ Calendar event created: ${result.data.eventId}`);

            // Update the appointment_staff record with the event ID
            const { error: updateError } = await supabase
              .from('appointment_staff')
              .update({
                google_event_id: result.data.eventId,
                updated_at: new Date().toISOString()
              })
              .eq('id', assignment.id);

            if (updateError) {
              console.error(`❌ Error updating appointment_staff:`, updateError);
              errorCount++;
            } else {
              console.log(`✅ Updated appointment_staff with Google event ID`);
              syncedCount++;
            }

          } else {
            console.error(`❌ Failed to create calendar event:`, result.error);
            errorCount++;
          }

        } catch (eventError) {
          console.error(`❌ Event creation failed:`, eventError);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Sync Summary:`);
    console.log(`   ✅ Successfully synced: ${syncedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📅 Total processed: ${appointments.length}`);

  } catch (error) {
    console.error('❌ Calendar sync worker error:', error);
  }
}

// Run the sync function
syncAppointmentsToCalendar();
