#!/usr/bin/env node

/**
 * Appointment Cleanup Daemon Startup Script
 *
 * This script starts the appointment cleanup daemon that processes
 * soft-deleted appointments and removes them from Google Calendar.
 */

const { appointmentCleanupDaemon } = require('../services/appointmentCleanupDaemon');

console.log('🚀 Starting Appointment Cleanup Daemon...');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  appointmentCleanupDaemon.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  appointmentCleanupDaemon.stop();
  process.exit(0);
});

// Start the daemon
appointmentCleanupDaemon.start();

console.log('✅ Appointment Cleanup Daemon started successfully');
console.log('📅 Daemon will process deleted appointments every 30 seconds');
console.log('🛑 Press Ctrl+C to stop the daemon');

// Keep the process alive
setInterval(() => {
  // Just keep the process running
}, 1000);

