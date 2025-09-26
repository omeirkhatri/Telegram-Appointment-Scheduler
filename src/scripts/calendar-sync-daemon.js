/**
 * Enhanced Calendar Sync Daemon
 *
 * This daemon runs continuously and syncs appointments to Google Calendar.
 * It handles:
 * - Creating new calendar events for scheduled appointments
 * - Deleting calendar events for cancelled appointments
 * - Updating calendar events for rescheduled appointments
 * - Syncing changes to appointment details
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let isRunning = false;
let syncInterval = null;

// Helper function to calculate end time
function calculateEndTime(startTime, durationMinutes) {
  const [hours, minutes] = startTime.split(':');
  const endMinutes = parseInt(minutes) + durationMinutes;
  const endHours = parseInt(hours) + Math.floor(endMinutes / 60);
  const finalEndMinutes = endMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${finalEndMinutes.toString().padStart(2, '0')}:00`;
}

// Helper function to create calendar event
async function createCalendarEvent(appointment, staff, assignment) {
  const endTime = calculateEndTime(appointment.start_time, appointment.duration_minutes || 60);

  // Build comprehensive event title
  const eventTitle = buildEventTitle(appointment, staff, assignment.role);

  // Build detailed event description
  const eventDescription = buildEventDescription(appointment, staff, assignment.role);

  // Build location information
  const location = buildLocation(appointment);

  const eventData = {
    staff_id: staff.id,
    google_calendar_id: staff.google_calendar_id,
    event_title: eventTitle,
    event_description: eventDescription,
    location: location,
    start_time: `${appointment.appointment_date}T${appointment.start_time}`,
    end_time: `${appointment.appointment_date}T${endTime}`
  };

  const response = await fetch('http://localhost:3000/api/calendar/create-simple', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData)
  });

  return await response.json();
}

// Helper function to update calendar event
async function updateCalendarEvent(appointment, staff, eventId) {
  const endTime = calculateEndTime(appointment.start_time, appointment.duration_minutes || 60);

  // Build comprehensive event title
  const eventTitle = buildEventTitle(appointment, staff, 'primary');

  // Build detailed event description
  const eventDescription = buildEventDescription(appointment, staff, 'primary');

  // Build location information
  const location = buildLocation(appointment);

  const eventData = {
    event_title: eventTitle,
    event_description: eventDescription,
    location: location,
    start_time: `${appointment.appointment_date}T${appointment.start_time}`,
    end_time: `${appointment.appointment_date}T${endTime}`
  };

  const response = await fetch('http://localhost:3000/api/calendar/update-simple', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      google_calendar_id: staff.google_calendar_id,
      event_id: eventId,
      ...eventData
    })
  });

  return await response.json();
}

// Helper function to delete calendar event
async function deleteCalendarEvent(staff, eventId) {
  const response = await fetch('http://localhost:3000/api/calendar/delete-simple', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      google_calendar_id: staff.google_calendar_id,
      event_id: eventId
    })
  });

  return await response.json();
}

async function syncAppointmentsToCalendar() {
  if (isRunning) {
    console.log('⏳ Sync already in progress, skipping this cycle');
    return;
  }

  isRunning = true;

  try {
    console.log('🔄 Starting enhanced calendar sync worker...');

    // 1. Handle cancelled appointments - delete their calendar events
    await handleCancelledAppointments();

    // 2. Handle rescheduled/updated appointments - update their calendar events
    await handleUpdatedAppointments();

    // 3. Handle new scheduled appointments - create calendar events
    await handleNewAppointments();

    // 4. Clean up orphaned calendar events (events without database records)
    await handleOrphanedCalendarEvents();

  } catch (error) {
    console.error('❌ Calendar sync worker error:', error);
  } finally {
    isRunning = false;
  }
}

// Handle cancelled appointments - delete their calendar events
async function handleCancelledAppointments() {
  console.log('🗑️ Checking for cancelled appointments...');

  // First, get all cancelled appointments
  const { data: cancelledAppointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('id, appointment_date, start_time, appointment_type, status')
    .eq('status', 'cancelled')
    .gte('appointment_date', new Date().toISOString().split('T')[0]) // Only future appointments
    .limit(20);

  if (appointmentsError) {
    console.error('❌ Error fetching cancelled appointments:', appointmentsError);
    return;
  }

  if (!cancelledAppointments || cancelledAppointments.length === 0) {
    console.log('✅ No cancelled appointments to process');
    return;
  }

  console.log(`🗑️ Found ${cancelledAppointments.length} cancelled appointments to process`);

  let deletedCount = 0;
  let errorCount = 0;

  for (const appointment of cancelledAppointments) {
    console.log(`\n🗑️ Processing cancelled appointment: ${appointment.id}`);

    // Get staff assignments for this appointment
    const { data: staffAssignments, error: staffError } = await supabase
      .from('appointment_staff')
      .select(`
        id,
        google_event_id,
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
      console.error(`❌ Error fetching staff assignments for appointment ${appointment.id}:`, staffError);
      errorCount++;
      continue;
    }

    if (!staffAssignments || staffAssignments.length === 0) {
      console.log(`⚠️ No staff assignments with calendar events found for appointment ${appointment.id}`);
      continue;
    }

    for (const assignment of staffAssignments) {
      const staff = assignment.staff;

      if (!staff.google_calendar_id || !assignment.google_event_id) {
        console.log(`⚠️ Staff ${staff.first_name} ${staff.last_name} has no calendar ID or event ID, skipping`);
        continue;
      }

      try {
        console.log(`👤 Deleting calendar event for staff: ${staff.first_name} ${staff.last_name}`);

        const result = await deleteCalendarEvent(staff, assignment.google_event_id);

        if (result.success) {
          console.log(`✅ Calendar event deleted successfully`);

          // Clear the google_event_id from appointment_staff
          const { error: updateError } = await supabase
            .from('appointment_staff')
            .update({
              google_event_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', assignment.id);

          if (updateError) {
            console.error(`❌ Error clearing google_event_id:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Cleared google_event_id from appointment_staff`);
            deletedCount++;
          }

        } else {
          console.error(`❌ Failed to delete calendar event:`, result.error);
          errorCount++;
        }

      } catch (eventError) {
        console.error(`❌ Event deletion failed:`, eventError);
        errorCount++;
      }
    }
  }

  console.log(`\n📊 Cancelled Appointments Summary:`);
  console.log(`   ✅ Successfully deleted: ${deletedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
}

// Handle rescheduled/updated appointments - update their calendar events
async function handleUpdatedAppointments() {
  console.log('🔄 Checking for updated appointments...');

  // Find appointments that have been updated recently (within last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // First, get all updated appointments
  const { data: updatedAppointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('id, appointment_date, start_time, appointment_type, status, updated_at, duration_minutes, notes, mini_notes, full_notes, transportation_type, transportation_method, driver_id, pickup_instructions, custom_fields, patient:patient_id(id, name, phone, flat_villa_no, building_street, area, city, google_maps_link, medical_notes, emergency_contact, preferred_transport, latitude, longitude)')
    .eq('status', 'scheduled')
    .gte('updated_at', fiveMinutesAgo)
    .gte('appointment_date', new Date().toISOString().split('T')[0]) // Only future appointments
    .limit(20);

  if (appointmentsError) {
    console.error('❌ Error fetching updated appointments:', appointmentsError);
    return;
  }

  if (!updatedAppointments || updatedAppointments.length === 0) {
    console.log('✅ No updated appointments to process');
    return;
  }

  console.log(`🔄 Found ${updatedAppointments.length} updated appointments to process`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const appointment of updatedAppointments) {
    console.log(`\n🔄 Processing updated appointment: ${appointment.id}`);
    console.log(`   Date: ${appointment.appointment_date}`);
    console.log(`   Time: ${appointment.start_time}`);
    console.log(`   Type: ${appointment.appointment_type}`);
    console.log(`   Updated: ${appointment.updated_at}`);

    // Get staff assignments for this appointment that have calendar events
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
      console.error(`❌ Error fetching staff assignments for appointment ${appointment.id}:`, staffError);
      errorCount++;
      continue;
    }

    if (!staffAssignments || staffAssignments.length === 0) {
      console.log(`⚠️ No staff assignments with calendar events found for appointment ${appointment.id}`);
      continue;
    }

    for (const assignment of staffAssignments) {
      const staff = assignment.staff;

      if (!staff.google_calendar_id || !assignment.google_event_id) {
        console.log(`⚠️ Staff ${staff.first_name} ${staff.last_name} has no calendar ID or event ID, skipping`);
        continue;
      }

      try {
        console.log(`👤 Updating calendar event for staff: ${staff.first_name} ${staff.last_name}`);

        const result = await updateCalendarEvent(appointment, staff, assignment.google_event_id);

        if (result.success) {
          console.log(`✅ Calendar event updated successfully`);
          updatedCount++;
        } else {
          console.error(`❌ Failed to update calendar event:`, result.error);
          errorCount++;
        }

      } catch (eventError) {
        console.error(`❌ Event update failed:`, eventError);
        errorCount++;
      }
    }
  }

  console.log(`\n📊 Updated Appointments Summary:`);
  console.log(`   ✅ Successfully updated: ${updatedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
}

// Handle new scheduled appointments - create calendar events
async function handleNewAppointments() {
  console.log('📅 Checking for new appointments...');

  // Find appointments that don't have calendar events yet
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patient_id(id, name, phone, flat_villa_no, building_street, area, city, google_maps_link, medical_notes, emergency_contact, preferred_transport, latitude, longitude)
    `)
    .eq('status', 'scheduled')
    .gte('appointment_date', new Date().toISOString().split('T')[0]) // Only future appointments
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(20); // Process up to 20 appointments per run

  if (error) {
    console.error('❌ Error fetching new appointments:', error);
    return;
  }

  if (!appointments || appointments.length === 0) {
    console.log('✅ No new appointments need calendar sync');
    return;
  }

  console.log(`📅 Found ${appointments.length} new appointments to sync`);

  let syncedCount = 0;
  let errorCount = 0;

  for (const appointment of appointments) {
    console.log(`\n📅 Processing new appointment: ${appointment.id}`);
    console.log(`   Date: ${appointment.appointment_date}`);
    console.log(`   Time: ${appointment.start_time}`);
    console.log(`   Type: ${appointment.appointment_type}`);

    // Get staff assignments for this appointment
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
      .is('google_event_id', null);

    if (staffError) {
      console.error(`❌ Error fetching staff assignments for appointment ${appointment.id}:`, staffError);
      errorCount++;
      continue;
    }

    if (!staffAssignments || staffAssignments.length === 0) {
      console.log('⚠️ No staff assignments found, skipping');
      continue;
    }

    // Sync to each staff member's calendar
    for (const assignment of staffAssignments) {
      const staff = assignment.staff;

      if (!staff.google_calendar_id) {
        console.log(`⚠️ Staff ${staff.first_name} ${staff.last_name} has no calendar ID, skipping`);
        continue;
      }

      console.log(`👤 Syncing to staff: ${staff.first_name} ${staff.last_name}`);

      try {
        const result = await createCalendarEvent(appointment, staff, assignment);

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

  console.log(`\n📊 New Appointments Summary:`);
  console.log(`   ✅ Successfully synced: ${syncedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📅 Total processed: ${appointments.length}`);
}

// Handle orphaned calendar events - delete events that don't have corresponding appointments
async function handleOrphanedCalendarEvents() {
  console.log('🧹 Checking for orphaned calendar events...');

  try {
    // Get all staff with calendar IDs
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name, google_calendar_id')
      .not('google_calendar_id', 'is', null);

    if (staffError) {
      console.error('❌ Error fetching staff:', staffError);
      return;
    }

    if (!staff || staff.length === 0) {
      console.log('✅ No staff with calendar IDs found');
      return;
    }

    // Get all appointment_staff records with google_event_id
    const { data: appointmentStaff, error: appointmentError } = await supabase
      .from('appointment_staff')
      .select(`
        id,
        appointment_id,
        google_event_id,
        staff:staff_id (
          id,
          first_name,
          last_name,
          google_calendar_id
        )
      `)
      .not('google_event_id', 'is', null);

    if (appointmentError) {
      console.error('❌ Error fetching appointment staff:', appointmentError);
      return;
    }

    if (!appointmentStaff || appointmentStaff.length === 0) {
      console.log('✅ No appointment staff records with calendar events found');
      return;
    }

    console.log(`🔍 Found ${appointmentStaff.length} appointment staff records with calendar events`);

    // Get all existing appointments
    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id');

    if (appointmentsError) {
      console.error('❌ Error fetching appointments:', appointmentsError);
      return;
    }

    const existingAppointmentIds = new Set(existingAppointments?.map(apt => apt.id) || []);
    console.log(`📋 Found ${existingAppointmentIds.size} existing appointments in database`);

    // Find orphaned calendar events (appointment_staff records where the appointment no longer exists)
    const orphanedEvents = appointmentStaff.filter(assignment =>
      !existingAppointmentIds.has(assignment.appointment_id)
    );

    console.log(`🗑️ Found ${orphanedEvents.length} orphaned events (no corresponding appointment in database)`);

    // Also check for events that exist in database but not in Google Calendar
    const eventsToVerify = appointmentStaff.filter(assignment =>
      existingAppointmentIds.has(assignment.appointment_id)
    );

    console.log(`🔍 Verifying ${eventsToVerify.length} events exist in Google Calendar...`);

    let verifiedCount = 0;
    let missingFromCalendarCount = 0;
    let deletedCount = 0;
    let errorCount = 0;

    // Verify events exist in Google Calendar
    for (const assignment of eventsToVerify) {
      const staff = assignment.staff;

      if (!staff.google_calendar_id || !assignment.google_event_id) {
        console.log(`⚠️ Skipping assignment ${assignment.id} - missing calendar ID or event ID`);
        continue;
      }

      try {
        // Check if event exists in Google Calendar
        const eventExists = await checkEventExists(staff.google_calendar_id, assignment.google_event_id);

        if (eventExists) {
          verifiedCount++;
        } else {
          console.log(`❌ Event ${assignment.google_event_id} not found in Google Calendar for ${staff.first_name} ${staff.last_name}`);
          missingFromCalendarCount++;

          // Clear the google_event_id from the database since the event doesn't exist in Google Calendar
          const { error: updateError } = await supabase
            .from('appointment_staff')
            .update({ google_event_id: null })
            .eq('id', assignment.id);

          if (updateError) {
            console.error(`❌ Error clearing google_event_id:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Cleared google_event_id from database`);
            deletedCount++;
          }
        }

      } catch (eventError) {
        console.error(`❌ Error checking event existence:`, eventError);
        errorCount++;
      }
    }

    // Delete orphaned calendar events (events without corresponding appointments)
    for (const assignment of orphanedEvents) {
      const staff = assignment.staff;

      if (!staff.google_calendar_id || !assignment.google_event_id) {
        console.log(`⚠️ Skipping assignment ${assignment.id} - missing calendar ID or event ID`);
        continue;
      }

      try {
        console.log(`🗑️ Deleting orphaned event ${assignment.google_event_id} from ${staff.first_name} ${staff.last_name}'s calendar...`);

        const result = await deleteCalendarEvent(staff, assignment.google_event_id);

        if (result.success) {
          console.log(`✅ Deleted successfully`);

          // Delete the appointment_staff record
          const { error: deleteError } = await supabase
            .from('appointment_staff')
            .delete()
            .eq('id', assignment.id);

          if (deleteError) {
            console.error(`❌ Error deleting appointment_staff record:`, deleteError);
            errorCount++;
          } else {
            console.log(`✅ Deleted appointment_staff record`);
            deletedCount++;
          }

        } else {
          console.error(`❌ Failed to delete calendar event:`, result.error);
          errorCount++;
        }

      } catch (eventError) {
        console.error(`❌ Event deletion failed:`, eventError);
        errorCount++;
      }
    }

    console.log(`\n📊 Orphaned Events Cleanup Summary:`);
    console.log(`   ✅ Events verified in Google Calendar: ${verifiedCount}`);
    console.log(`   ❌ Events missing from Google Calendar: ${missingFromCalendarCount}`);
    console.log(`   🗑️ Orphaned events deleted: ${orphanedEvents.length}`);
    console.log(`   ✅ Total cleaned up: ${deletedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (orphanedEvents.length === 0 && missingFromCalendarCount === 0) {
      console.log('✅ No orphaned calendar events found');
    }

  } catch (error) {
    console.error('❌ Error in orphaned events cleanup:', error);
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

// Start the daemon
function startDaemon() {
  console.log('🚀 Starting Calendar Sync Daemon...');
  console.log('📅 Will sync appointments every 10 seconds');
  console.log('⏰ Started at:', new Date().toISOString());
  console.log('---');

  // Run immediately
  syncAppointmentsToCalendar();

  // Then run every 10 seconds
  syncInterval = setInterval(syncAppointmentsToCalendar, 10 * 1000); // 10 seconds
}

// Stop the daemon
function stopDaemon() {
  console.log('🛑 Stopping Calendar Sync Daemon...');
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  console.log('✅ Daemon stopped');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  stopDaemon();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  stopDaemon();
  process.exit(0);
});

// =============================================================================
// COMPREHENSIVE CALENDAR EVENT FORMATTING FUNCTIONS
// =============================================================================

/**
 * Build comprehensive event title
 */
function buildEventTitle(appointment, staff, role) {
  const patientName = appointment.patient?.name || 'Unknown Patient';
  const appointmentType = getAppointmentTypeDisplayName(appointment.appointment_type);
  const area = appointment.patient?.area || appointment.patient?.city || 'Location TBD';
  const staffName = `${staff.first_name} ${staff.last_name}`;

  // Format: "Patient Name - Area - Appointment Type - Staff Name (Role)"
  if (role === 'primary') {
    return `${patientName} - ${area} - ${appointmentType} - ${staffName}`;
  } else {
    return `${patientName} - ${area} - ${appointmentType} - ${staffName} (${role})`;
  }
}

/**
 * Build detailed event description
 */
function buildEventDescription(appointment, staff, role) {
  const parts = [];

  // Header
  parts.push('🏥 BESTDOC APPOINTMENT');
  parts.push('═'.repeat(50));

  // Patient Information
  parts.push('👤 PATIENT DETAILS:');
  parts.push(`   Name: ${appointment.patient?.name || 'Not provided'}`);
  parts.push(`   Phone: ${appointment.patient?.phone || 'Not provided'}`);

  if (appointment.patient?.emergency_contact) {
    parts.push(`   Emergency Contact: ${appointment.patient.emergency_contact}`);
  }

  // Address Information
  if (appointment.patient?.flat_villa_no || appointment.patient?.building_street || appointment.patient?.area) {
    parts.push('\n📍 LOCATION:');
    if (appointment.patient?.flat_villa_no) {
      parts.push(`   Flat/Villa: ${appointment.patient.flat_villa_no}`);
    }
    if (appointment.patient?.building_street) {
      parts.push(`   Building/Street: ${appointment.patient.building_street}`);
    }
    if (appointment.patient?.area) {
      parts.push(`   Area: ${appointment.patient.area}`);
    }
    if (appointment.patient?.city) {
      parts.push(`   City: ${appointment.patient.city}`);
    }
    if (appointment.patient?.google_maps_link) {
      parts.push(`   Maps Link: ${appointment.patient.google_maps_link}`);
    }
  }

  // Appointment Details
  parts.push('\n📅 APPOINTMENT DETAILS:');
  parts.push(`   Type: ${getAppointmentTypeDisplayName(appointment.appointment_type)}`);
  parts.push(`   Date: ${formatDate(appointment.appointment_date)}`);
  parts.push(`   Time: ${formatTime(appointment.start_time)} - ${formatTime(calculateEndTime(appointment.start_time, appointment.duration_minutes || 60))}`);
  parts.push(`   Duration: ${appointment.duration_minutes || 60} minutes`);
  parts.push(`   Status: ${appointment.status.toUpperCase()}`);

  // Staff Information
  parts.push('\n👨‍⚕️ STAFF ASSIGNMENT:');
  parts.push(`   Name: ${staff.first_name} ${staff.last_name}`);
  parts.push(`   Role: ${role.toUpperCase()}`);
  parts.push(`   Email: ${staff.email || 'Not provided'}`);

  // Transportation
  if (appointment.transportation_type) {
    parts.push('\n🚗 TRANSPORTATION:');
    parts.push(`   Type: ${appointment.transportation_type.replace('_', ' ').toUpperCase()}`);
    if (appointment.transportation_method) {
      parts.push(`   Method: ${appointment.transportation_method}`);
    }
    if (appointment.driver_id) {
      parts.push(`   Driver ID: ${appointment.driver_id}`);
    }
  }

  // Notes and Additional Information
  if (appointment.notes || appointment.mini_notes || appointment.full_notes) {
    parts.push('\n📝 NOTES:');
    if (appointment.notes) {
      parts.push(`   General: ${appointment.notes}`);
    }
    if (appointment.mini_notes) {
      parts.push(`   Quick Notes: ${appointment.mini_notes}`);
    }
    if (appointment.full_notes) {
      parts.push(`   Detailed Notes: ${appointment.full_notes}`);
    }
  }

  // Pickup Instructions
  if (appointment.pickup_instructions) {
    parts.push('\n🚪 PICKUP INSTRUCTIONS:');
    parts.push(`   ${appointment.pickup_instructions}`);
  }

  // Custom Fields
  if (appointment.custom_fields && Object.keys(appointment.custom_fields).length > 0) {
    parts.push('\n📋 ADDITIONAL INFORMATION:');
    for (const [key, value] of Object.entries(appointment.custom_fields)) {
      if (value) {
        parts.push(`   ${key.replace(/_/g, ' ').toUpperCase()}: ${value}`);
      }
    }
  }

  // Footer
  parts.push('\n' + '═'.repeat(50));
  parts.push('📱 Created by BestDOC Appointment Scheduler');
  parts.push(`🕒 Generated: ${new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}`);

  return parts.join('\n');
}

/**
 * Build location information
 */
function buildLocation(appointment) {
  const locationParts = [];

  if (appointment.patient?.flat_villa_no) {
    locationParts.push(appointment.patient.flat_villa_no);
  }

  if (appointment.patient?.building_street) {
    locationParts.push(appointment.patient.building_street);
  }

  if (appointment.patient?.area) {
    locationParts.push(appointment.patient.area);
  }

  if (appointment.patient?.city) {
    locationParts.push(appointment.patient.city);
  }

  return locationParts.length > 0 ? locationParts.join(', ') : 'Location TBD';
}

/**
 * Get display name for appointment type
 */
function getAppointmentTypeDisplayName(type) {
  const displayNames = {
    'doctor_on_call': 'Doctor On Call',
    'lab_test': 'Lab Test',
    'teleconsultation': 'Teleconsultation',
    'physiotherapy': 'Physiotherapy',
    'caregiver': 'Caregiver Service',
    'iv_therapy': 'IV Therapy'
  };
  return displayNames[type] || type;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AE', {
    timeZone: 'Asia/Dubai',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for display
 */
function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes), 0);
  return date.toLocaleTimeString('en-AE', {
    timeZone: 'Asia/Dubai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Start the daemon
startDaemon();
