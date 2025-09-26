#!/usr/bin/env node

/**
 * Compatible Unified Calendar Sync Daemon
 *
 * This daemon works with the existing database schema and provides
 * reliable calendar sync processing without requiring schema changes.
 *
 * Features:
 * - Processes pending syncs every 30 seconds
 * - Cleans up orphaned calendar events
 * - Works with existing google_event_id field
 * - Provides health monitoring
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let isRunning = false;
let syncInterval = null;
let startTime = new Date();

// Statistics tracking
let stats = {
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  totalSyncsProcessed: 0,
  totalEventsCreated: 0,
  totalEventsUpdated: 0,
  totalEventsDeleted: 0,
  totalOrphansCleaned: 0,
  lastRunAt: null,
  lastErrorAt: null,
  lastError: null
};

async function runCompatibleUnifiedSync() {
  if (isRunning) {
    console.log('⏳ [DAEMON] Sync already in progress, skipping cycle');
    return;
  }

  isRunning = true;
  stats.totalRuns++;
  stats.lastRunAt = new Date().toISOString();

  try {
    console.log('🔄 [DAEMON] Starting compatible unified calendar sync cycle...');

    // Process pending syncs
    await processPendingSyncs();

    // Clean up orphaned events (every 2 cycles - 10 seconds)
    if (stats.totalRuns % 2 === 0) {
      await cleanupOrphanedEvents();
    }

    // Health check (every 12 cycles - 1 minute)
    if (stats.totalRuns % 12 === 0) {
      await performHealthCheck();
    }

    stats.successfulRuns++;
    console.log('✅ [DAEMON] Sync cycle completed successfully');

  } catch (error) {
    stats.failedRuns++;
    stats.lastErrorAt = new Date().toISOString();
    stats.lastError = error.message;
    console.error('❌ [DAEMON] Sync cycle failed:', error);
  } finally {
    isRunning = false;
  }
}

async function processPendingSyncs() {
  console.log('📅 [DAEMON] Processing pending syncs...');

  try {
    // Find appointments with staff assignments that don't have calendar events
    const { data: pendingSyncs, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        start_time,
        appointment_type,
        status,
        duration_minutes,
        patient:patient_id(id, name, phone, flat_villa_no, building_street, area, city),
        appointment_staff!inner(
          id,
          staff_id,
          role,
          google_event_id,
          staff:staff_id(
            id,
            first_name,
            last_name,
            google_calendar_id
          )
        )
      `)
      .eq('status', 'scheduled')
      .is('appointment_staff.google_event_id', null)
      .not('appointment_staff.staff.google_calendar_id', 'is', null)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(50);

    if (error) {
      throw new Error(`Failed to get pending syncs: ${error.message}`);
    }

    if (!pendingSyncs || pendingSyncs.length === 0) {
      console.log('✅ [DAEMON] No pending syncs found');
      return;
    }

    console.log(`📅 [DAEMON] Found ${pendingSyncs.length} appointments with pending syncs`);

    let processedCount = 0;
    let createdCount = 0;
    let errorCount = 0;

    for (const appointment of pendingSyncs) {
      try {
        // Process each staff assignment that needs sync
        for (const assignment of appointment.appointment_staff) {
          if (!assignment.staff.google_calendar_id || assignment.google_event_id) {
            continue; // Skip if no calendar or already has event
          }

          const result = await createCalendarEventForAssignment(appointment, assignment);
          if (result.success) {
            createdCount++;
            processedCount++;
          } else {
            errorCount++;
          }
        }

      } catch (error) {
        console.error(`❌ [DAEMON] Failed to process appointment ${appointment.id}:`, error);
        errorCount++;
      }
    }

    stats.totalSyncsProcessed += processedCount;
    stats.totalEventsCreated += createdCount;

    console.log(`📊 [DAEMON] Processed ${processedCount} syncs (${createdCount} created, ${errorCount} errors)`);

  } catch (error) {
    console.error('❌ [DAEMON] Failed to process pending syncs:', error);
    throw error;
  }
}

async function createCalendarEventForAssignment(appointment, assignment) {
  const staff = assignment.staff;
  console.log(`🔄 [DAEMON] Creating calendar event for ${staff.first_name} ${staff.last_name}`);

  try {
    const eventTitle = buildEventTitle(appointment, staff, assignment.role);
    const eventDescription = buildEventDescription(appointment, staff, assignment.role);
    const location = buildLocation(appointment);

    const startDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const endDateTime = new Date(startDateTime.getTime() + (appointment.duration_minutes || 60) * 60000);

    const result = await createCalendarEvent({
      staff_id: staff.id,
      google_calendar_id: staff.google_calendar_id,
      event_title: eventTitle,
      event_description: eventDescription,
      location: location,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString()
    });

    if (result.success) {
      // Update the assignment with the event ID
      await supabase
        .from('appointment_staff')
        .update({
          google_event_id: result.data.eventId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.id);

      console.log(`✅ [DAEMON] Calendar event created: ${result.data.eventId}`);
      return { success: true, eventId: result.data.eventId };
    } else {
      console.error(`❌ [DAEMON] Failed to create calendar event: ${result.error}`);
      return { success: false, error: result.error };
    }

  } catch (error) {
    console.error(`❌ [DAEMON] Event creation failed:`, error);
    return { success: false, error: error.message };
  }
}

async function cleanupOrphanedEvents() {
  console.log('🧹 [DAEMON] Cleaning up orphaned events...');

  try {
    // Find appointment_staff records with calendar events but deleted/missing appointments
    const { data: potentialOrphans, error } = await supabase
      .from('appointment_staff')
      .select(`
        id,
        appointment_id,
        google_event_id,
        staff:staff_id(
          id,
          first_name,
          last_name,
          google_calendar_id
        ),
        appointments:appointment_id(id, status)
      `)
      .not('google_event_id', 'is', null)
      .not('staff.google_calendar_id', 'is', null);

    if (error) {
      throw new Error(`Failed to get potential orphaned events: ${error.message}`);
    }

    if (!potentialOrphans || potentialOrphans.length === 0) {
      console.log('✅ [DAEMON] No potential orphaned events found');
      return;
    }

    // Filter for truly orphaned events
    const orphanedEvents = potentialOrphans.filter(event =>
      !event.appointments || event.appointments.status === 'deleted'
    );

    if (orphanedEvents.length === 0) {
      console.log('✅ [DAEMON] No truly orphaned events found');
      return;
    }

    console.log(`🗑️ [DAEMON] Found ${orphanedEvents.length} orphaned events`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const event of orphanedEvents) {
      try {
        const result = await deleteCalendarEvent(
          event.staff.google_calendar_id,
          event.google_event_id
        );

        if (result.success) {
          // Clear the event ID
          await supabase
            .from('appointment_staff')
            .update({ google_event_id: null })
            .eq('id', event.id);

          console.log(`✅ [DAEMON] Cleaned orphaned event for ${event.staff.first_name} ${event.staff.last_name}`);
          cleanedCount++;
        } else {
          console.error(`❌ [DAEMON] Failed to delete orphaned event: ${result.error}`);
          errorCount++;
        }

      } catch (error) {
        console.error(`❌ [DAEMON] Error cleaning orphaned event:`, error);
        errorCount++;
      }
    }

    stats.totalOrphansCleaned += cleanedCount;
    console.log(`📊 [DAEMON] Cleaned ${cleanedCount} orphaned events, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ [DAEMON] Failed to cleanup orphaned events:', error);
    throw error;
  }
}

async function performHealthCheck() {
  console.log('🏥 [DAEMON] Performing health check...');

  try {
    const uptime = Math.round((Date.now() - startTime.getTime()) / 1000 / 60); // minutes

    // Get basic statistics
    const { count: totalAssignments } = await supabase
      .from('appointment_staff')
      .select('id', { count: 'exact' })
      .not('staff.google_calendar_id', 'is', null);

    const { count: withEvents } = await supabase
      .from('appointment_staff')
      .select('id', { count: 'exact' })
      .not('google_event_id', 'is', null)
      .not('staff.google_calendar_id', 'is', null);

    const { count: pendingSyncs } = await supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('status', 'scheduled')
      .is('appointment_staff.google_event_id', null)
      .not('appointment_staff.staff.google_calendar_id', 'is', null)
      .gte('appointment_date', new Date().toISOString().split('T')[0]);

    console.log('📊 [DAEMON] Health Status:');
    console.log(`   Uptime: ${uptime} minutes`);
    console.log(`   Total Runs: ${stats.totalRuns}`);
    console.log(`   Success Rate: ${((stats.successfulRuns / stats.totalRuns) * 100).toFixed(1)}%`);
    console.log(`   Total Syncs Processed: ${stats.totalSyncsProcessed}`);
    console.log(`   Events Created: ${stats.totalEventsCreated}`);
    console.log(`   Orphans Cleaned: ${stats.totalOrphansCleaned}`);
    console.log('📊 [DAEMON] Database Status:');
    console.log(`   Total Assignments: ${totalAssignments || 0}`);
    console.log(`   Pending Syncs: ${pendingSyncs || 0}`);
    console.log(`   With Events: ${withEvents || 0}`);
    console.log(`   Without Events: ${(totalAssignments || 0) - (withEvents || 0)}`);

    // Alert on high pending counts
    if ((pendingSyncs || 0) > 50) {
      console.warn(`⚠️ [DAEMON] HIGH PENDING COUNT: ${pendingSyncs} pending syncs detected`);
    }

  } catch (error) {
    console.error('❌ [DAEMON] Health check failed:', error);
  }
}

// API helper functions
async function createCalendarEvent(eventData) {
  try {
    const response = await fetch('http://localhost:3000/api/calendar/create-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    });

    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteCalendarEvent(calendarId, eventId) {
  try {
    const response = await fetch('http://localhost:3000/api/calendar/delete-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        google_calendar_id: calendarId,
        event_id: eventId
      })
    });

    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Event formatting functions
function buildEventTitle(appointment, staff, role) {
  const patientName = appointment.patient?.name || 'Unknown Patient';
  const appointmentType = getAppointmentTypeDisplayName(appointment.appointment_type);
  const area = appointment.patient?.area || appointment.patient?.city || 'Location TBD';
  const staffName = `${staff.first_name} ${staff.last_name}`;

  if (role === 'primary') {
    return `${patientName} - ${area} - ${appointmentType} - ${staffName}`;
  } else {
    return `${patientName} - ${area} - ${appointmentType} - ${staffName} (${role})`;
  }
}

function buildEventDescription(appointment, staff, role) {
  const parts = [];

  parts.push('🏥 BESTDOC APPOINTMENT');
  parts.push('═'.repeat(50));

  parts.push('👤 PATIENT DETAILS:');
  parts.push(`   Name: ${appointment.patient?.name || 'Not provided'}`);
  parts.push(`   Phone: ${appointment.patient?.phone || 'Not provided'}`);

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
  }

  parts.push('\n📅 APPOINTMENT DETAILS:');
  parts.push(`   Type: ${getAppointmentTypeDisplayName(appointment.appointment_type)}`);
  parts.push(`   Date: ${appointment.appointment_date}`);
  parts.push(`   Time: ${appointment.start_time}`);
  parts.push(`   Duration: ${appointment.duration_minutes || 60} minutes`);

  parts.push('\n👨‍⚕️ STAFF ASSIGNMENT:');
  parts.push(`   Name: ${staff.first_name} ${staff.last_name}`);
  parts.push(`   Role: ${role.toUpperCase()}`);

  parts.push('\n' + '═'.repeat(50));
  parts.push('📱 Created by BestDOC Compatible Unified Calendar Sync');
  parts.push(`🕒 Generated: ${new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}`);

  return parts.join('\n');
}

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

// Daemon lifecycle management
function startDaemon() {
  console.log('🚀 [DAEMON] Starting Compatible Unified Calendar Sync Daemon...');
  console.log('📅 [DAEMON] Will sync appointments every 5 seconds');
  console.log('🧹 [DAEMON] Will clean orphaned events every 10 seconds');
  console.log('🏥 [DAEMON] Will perform health checks every 1 minute');
  console.log('🔧 [DAEMON] Compatible with existing database schema');
  console.log(`⏰ [DAEMON] Started at: ${startTime.toISOString()}`);
  console.log('---');

  // Run immediately
  runCompatibleUnifiedSync();

  // Then run every 5 seconds
  syncInterval = setInterval(runCompatibleUnifiedSync, 5 * 1000);
}

function stopDaemon() {
  console.log('🛑 [DAEMON] Stopping Compatible Unified Calendar Sync Daemon...');

  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  console.log('✅ [DAEMON] Daemon stopped gracefully');
  console.log('📊 [DAEMON] Final Statistics:');
  console.log(`   Total Runs: ${stats.totalRuns}`);
  console.log(`   Success Rate: ${((stats.successfulRuns / stats.totalRuns) * 100).toFixed(1)}%`);
  console.log(`   Total Syncs: ${stats.totalSyncsProcessed}`);
  console.log(`   Events Created: ${stats.totalEventsCreated}`);
  console.log(`   Orphans Cleaned: ${stats.totalOrphansCleaned}`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 [DAEMON] Received SIGINT, shutting down gracefully...');
  stopDaemon();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 [DAEMON] Received SIGTERM, shutting down gracefully...');
  stopDaemon();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 [DAEMON] Uncaught exception:', error);
  stats.lastErrorAt = new Date().toISOString();
  stats.lastError = error.message;
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [DAEMON] Unhandled rejection at:', promise, 'reason:', reason);
  stats.lastErrorAt = new Date().toISOString();
  stats.lastError = reason;
});

// Start the daemon
startDaemon();
