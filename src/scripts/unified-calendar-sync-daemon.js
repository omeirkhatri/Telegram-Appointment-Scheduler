#!/usr/bin/env node

/**
 * Unified Calendar Sync Daemon
 *
 * This daemon provides reliable, background calendar sync processing.
 * It works alongside the event-driven sync to ensure no appointments are missed.
 *
 * Features:
 * - Processes pending syncs every 30 seconds
 * - Cleans up orphaned calendar events
 * - Provides health monitoring and statistics
 * - Handles errors gracefully with retry logic
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let isRunning = false;
let syncInterval = null;
let healthCheckInterval = null;
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

async function runUnifiedSync() {
  if (isRunning) {
    console.log('⏳ [DAEMON] Sync already in progress, skipping cycle');
    return;
  }

  isRunning = true;
  stats.totalRuns++;
  stats.lastRunAt = new Date().toISOString();

  try {
    console.log('🔄 [DAEMON] Starting unified calendar sync cycle...');

    // Process pending syncs
    await processPendingSyncs();

    // Clean up orphaned events (less frequently)
    if (stats.totalRuns % 10 === 0) { // Every 10 cycles (5 minutes)
      await cleanupOrphanedEvents();
    }

    // Health check (every 20 cycles - 10 minutes)
    if (stats.totalRuns % 20 === 0) {
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
    // Get pending syncs from database
    const { data: pendingSyncs, error } = await supabase
      .rpc('get_pending_calendar_syncs', { limit_count: 50 });

    if (error) {
      throw new Error(`Failed to get pending syncs: ${error.message}`);
    }

    if (!pendingSyncs || pendingSyncs.length === 0) {
      console.log('✅ [DAEMON] No pending syncs found');
      return;
    }

    console.log(`📅 [DAEMON] Found ${pendingSyncs.length} pending syncs`);

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const sync of pendingSyncs) {
      try {
        const operation = sync.google_event_id ? 'update' : 'create';
        await processSingleSync(sync, operation);

        processedCount++;
        if (operation === 'create') {
          createdCount++;
        } else {
          updatedCount++;
        }

      } catch (error) {
        console.error(`❌ [DAEMON] Failed to process sync ${sync.appointment_staff_id}:`, error);
        errorCount++;

        // Update sync status to failed
        await updateSyncStatus(sync.appointment_staff_id, 'failed', null, error.message);
      }
    }

    stats.totalSyncsProcessed += processedCount;
    stats.totalEventsCreated += createdCount;
    stats.totalEventsUpdated += updatedCount;

    console.log(`📊 [DAEMON] Processed ${processedCount} syncs (${createdCount} created, ${updatedCount} updated, ${errorCount} errors)`);

  } catch (error) {
    console.error('❌ [DAEMON] Failed to process pending syncs:', error);
    throw error;
  }
}

async function processSingleSync(sync, operation) {
  console.log(`🔄 [DAEMON] Processing ${operation} for ${sync.staff_first_name} ${sync.staff_last_name}`);

  // Mark as syncing
  await updateSyncStatus(sync.appointment_staff_id, 'syncing');

  try {
    const eventTitle = buildEventTitle(sync);
    const eventDescription = buildEventDescription(sync);
    const location = buildLocation(sync);

    const startDateTime = new Date(`${sync.appointment_date}T${sync.start_time}`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60000); // 60 minutes default

    let result;

    if (operation === 'create') {
      result = await createCalendarEvent({
        staff_id: sync.staff_id,
        google_calendar_id: sync.staff_google_calendar_id,
        event_title: eventTitle,
        event_description: eventDescription,
        location: location,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString()
      });
    } else {
      result = await updateCalendarEvent({
        google_calendar_id: sync.staff_google_calendar_id,
        event_id: sync.google_event_id,
        event_title: eventTitle,
        event_description: eventDescription,
        location: location,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString()
      });
    }

    if (result.success) {
      await updateSyncStatus(sync.appointment_staff_id, 'synced', result.data?.eventId || sync.google_event_id);
      console.log(`✅ [DAEMON] ${operation} successful: ${result.data?.eventId || sync.google_event_id}`);
    } else {
      throw new Error(result.error || `Failed to ${operation} calendar event`);
    }

  } catch (error) {
    console.error(`❌ [DAEMON] ${operation} failed:`, error);
    throw error;
  }
}

async function cleanupOrphanedEvents() {
  console.log('🧹 [DAEMON] Cleaning up orphaned events...');

  try {
    // Get orphaned events from database
    const { data: orphanedEvents, error } = await supabase
      .rpc('get_orphaned_calendar_events');

    if (error) {
      throw new Error(`Failed to get orphaned events: ${error.message}`);
    }

    if (!orphanedEvents || orphanedEvents.length === 0) {
      console.log('✅ [DAEMON] No orphaned events found');
      return;
    }

    console.log(`🗑️ [DAEMON] Found ${orphanedEvents.length} orphaned events`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const event of orphanedEvents) {
      try {
        const result = await deleteCalendarEvent(
          event.staff_google_calendar_id,
          event.google_event_id
        );

        if (result.success) {
          // Remove the appointment_staff record
          await supabase
            .from('appointment_staff')
            .delete()
            .eq('id', event.appointment_staff_id);

          console.log(`✅ [DAEMON] Cleaned orphaned event for ${event.staff_name}`);
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
    const { data: healthStats, error } = await supabase
      .rpc('get_calendar_sync_statistics');

    if (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }

    const health = healthStats[0];
    const uptime = Math.round((Date.now() - startTime.getTime()) / 1000 / 60); // minutes

    console.log('📊 [DAEMON] Health Status:');
    console.log(`   Uptime: ${uptime} minutes`);
    console.log(`   Total Runs: ${stats.totalRuns}`);
    console.log(`   Success Rate: ${((stats.successfulRuns / stats.totalRuns) * 100).toFixed(1)}%`);
    console.log(`   Total Syncs Processed: ${stats.totalSyncsProcessed}`);
    console.log(`   Events Created: ${stats.totalEventsCreated}`);
    console.log(`   Events Updated: ${stats.totalEventsUpdated}`);
    console.log(`   Orphans Cleaned: ${stats.totalOrphansCleaned}`);
    console.log('📊 [DAEMON] Database Status:');
    console.log(`   Total Assignments: ${health.total_assignments}`);
    console.log(`   Pending Syncs: ${health.pending_syncs}`);
    console.log(`   Synced: ${health.synced_count}`);
    console.log(`   Failed: ${health.failed_count}`);
    console.log(`   With Events: ${health.with_events}`);

    // Alert on high failure rates
    if (health.failed_count > 10) {
      console.warn(`⚠️ [DAEMON] HIGH FAILURE COUNT: ${health.failed_count} failed syncs detected`);
    }

    if (health.pending_syncs > 50) {
      console.warn(`⚠️ [DAEMON] HIGH PENDING COUNT: ${health.pending_syncs} pending syncs detected`);
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

async function updateCalendarEvent(eventData) {
  try {
    const response = await fetch('http://localhost:3000/api/calendar/update-simple', {
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

async function updateSyncStatus(appointmentStaffId, status, eventId = null, error = null) {
  await supabase.rpc('update_sync_status', {
    p_appointment_staff_id: appointmentStaffId,
    p_status: status,
    p_event_id: eventId,
    p_error: error
  });
}

// Event formatting functions
function buildEventTitle(sync) {
  const appointmentType = getAppointmentTypeDisplayName(sync.appointment_type);
  const staffName = `${sync.staff_first_name} ${sync.staff_last_name}`;
  return `Patient Appointment - ${appointmentType} - ${staffName}`;
}

function buildEventDescription(sync) {
  const parts = [];

  parts.push('🏥 BESTDOC APPOINTMENT');
  parts.push('═'.repeat(50));

  parts.push('📅 APPOINTMENT DETAILS:');
  parts.push(`   Type: ${getAppointmentTypeDisplayName(sync.appointment_type)}`);
  parts.push(`   Date: ${sync.appointment_date}`);
  parts.push(`   Time: ${sync.start_time}`);

  parts.push('\n👨‍⚕️ STAFF ASSIGNMENT:');
  parts.push(`   Name: ${sync.staff_first_name} ${sync.staff_last_name}`);

  parts.push('\n' + '═'.repeat(50));
  parts.push('📱 Created by BestDOC Unified Calendar Sync');
  parts.push(`🕒 Generated: ${new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai' })}`);

  return parts.join('\n');
}

function buildLocation(sync) {
  return 'Patient Location'; // Placeholder - would need patient data
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
  console.log('🚀 [DAEMON] Starting Unified Calendar Sync Daemon...');
  console.log('📅 [DAEMON] Will sync appointments every 30 seconds');
  console.log('🧹 [DAEMON] Will clean orphaned events every 5 minutes');
  console.log('🏥 [DAEMON] Will perform health checks every 10 minutes');
  console.log(`⏰ [DAEMON] Started at: ${startTime.toISOString()}`);
  console.log('---');

  // Run immediately
  runUnifiedSync();

  // Then run every 30 seconds
  syncInterval = setInterval(runUnifiedSync, 30 * 1000);

  // Health check every 5 minutes
  healthCheckInterval = setInterval(() => {
    console.log(`💓 [DAEMON] Heartbeat - Uptime: ${Math.round((Date.now() - startTime.getTime()) / 1000 / 60)} minutes`);
  }, 5 * 60 * 1000);
}

function stopDaemon() {
  console.log('🛑 [DAEMON] Stopping Unified Calendar Sync Daemon...');

  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  console.log('✅ [DAEMON] Daemon stopped gracefully');
  console.log('📊 [DAEMON] Final Statistics:');
  console.log(`   Total Runs: ${stats.totalRuns}`);
  console.log(`   Success Rate: ${((stats.successfulRuns / stats.totalRuns) * 100).toFixed(1)}%`);
  console.log(`   Total Syncs: ${stats.totalSyncsProcessed}`);
  console.log(`   Events Created: ${stats.totalEventsCreated}`);
  console.log(`   Events Updated: ${stats.totalEventsUpdated}`);
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
  // Don't exit on uncaught exceptions, just log them
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [DAEMON] Unhandled rejection at:', promise, 'reason:', reason);
  stats.lastErrorAt = new Date().toISOString();
  stats.lastError = reason;
  // Don't exit on unhandled rejections, just log them
});

// Start the daemon
startDaemon();




