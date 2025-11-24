#!/usr/bin/env node

/**
 * Google Sheets Lead Sync Daemon
 *
 * This daemon runs periodically to sync leads from Google Sheets
 * into the lead management system.
 */

const { GoogleSheetsLeadService } = require('../services/googleSheetsLeadService');
const { config } = require('../lib/env');

class GoogleSheetsSyncDaemon {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.syncInterval = config.googleSheets.syncIntervalMinutes * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Start the daemon
   */
  start() {
    if (this.isRunning) {
      console.log('Google Sheets sync daemon is already running');
      return;
    }

    console.log('Starting Google Sheets sync daemon...');
    console.log(`Sync interval: ${config.googleSheets.syncIntervalMinutes} minutes`);

    // Check if Google Sheets is configured
    if (!config.googleSheets.isConfigured()) {
      console.error('Google Sheets integration is not configured. Please set the following environment variables:');
      console.error('- GOOGLE_SHEETS_LEAD_SHEET_ID');
      console.error('- GOOGLE_SHEETS_CREDENTIALS_PATH');
      process.exit(1);
    }

    this.isRunning = true;

    // Run initial sync
    this.performSync();

    // Schedule periodic syncs
    this.intervalId = setInterval(() => {
      this.performSync();
    }, this.syncInterval);

    console.log('Google Sheets sync daemon started successfully');
  }

  /**
   * Stop the daemon
   */
  stop() {
    if (!this.isRunning) {
      console.log('Google Sheets sync daemon is not running');
      return;
    }

    console.log('Stopping Google Sheets sync daemon...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('Google Sheets sync daemon stopped');
  }

  /**
   * Perform a single sync operation
   */
  async performSync() {
    const startTime = new Date();
    console.log(`[${startTime.toISOString()}] Starting Google Sheets sync...`);

    try {
      const result = await GoogleSheetsLeadService.syncLeadsFromGoogleSheets();

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log(`[${endTime.toISOString()}] Sync completed successfully`);
      console.log(`  - New leads created: ${result.newLeads}`);
      console.log(`  - Errors: ${result.errors.length}`);
      console.log(`  - Duration: ${duration}ms`);

      if (result.errors.length > 0) {
        console.log('  - Error details:');
        result.errors.forEach((error, index) => {
          console.log(`    ${index + 1}. ${error}`);
        });
      }

    } catch (error) {
      const endTime = new Date();
      console.error(`[${endTime.toISOString()}] Sync failed:`, error.message);

      // Log error details for debugging
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  /**
   * Get daemon status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: config.googleSheets.syncIntervalMinutes,
      nextSync: this.intervalId ? new Date(Date.now() + this.syncInterval).toISOString() : null,
    };
  }
}

// Create daemon instance
const daemon = new GoogleSheetsSyncDaemon();

// Handle process signals
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  daemon.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  daemon.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  daemon.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  daemon.stop();
  process.exit(1);
});

// Start daemon if this script is run directly
if (require.main === module) {
  daemon.start();
}

module.exports = { GoogleSheetsSyncDaemon, daemon };



