#!/usr/bin/env node

/**
 * MediCare Scheduler - Cron Worker
 *
 * This is the actual worker process that runs the cron jobs.
 * It's started by the start-worker.js script.
 */

const path = require('path');

// Add the src directory to the module path
require('module').globalPaths.push(path.join(__dirname, '..', 'src'));

// Set up environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import the cron worker service
const { cronWorkerService } = require('../src/services/cronWorkerService');

/**
 * Main worker function
 */
async function main() {
  console.log('🚀 Starting MediCare Scheduler Cron Worker...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Timezone:', process.env.TZ);
  console.log('Log Level:', process.env.LOG_LEVEL);

  try {
    // Start the cron worker service
    await cronWorkerService.start();

    console.log('✅ Cron worker service started successfully');

    // Set up graceful shutdown
    setupGracefulShutdown();

    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      gracefulShutdown();
    });

    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      gracefulShutdown();
    });

    // Log periodic status
    setInterval(async () => {
      try {
        const status = cronWorkerService.getStatus();
        const health = await cronWorkerService.getHealthStatus();

        console.log('📊 Worker Status:', {
          running: status.isRunning,
          uptime: status.uptime ? Math.round(status.uptime / 1000) + 's' : 'N/A',
          scheduler: status.schedulerStatus,
          health: health.status,
        });
      } catch (error) {
        console.error('❌ Error getting worker status:', error);
      }
    }, 60000); // Every minute

  } catch (error) {
    console.error('❌ Failed to start cron worker service:', error);
    process.exit(1);
  }
}

/**
 * Set up graceful shutdown
 */
function setupGracefulShutdown() {
  let isShuttingDown = false;

  const gracefulShutdown = async () => {
    if (isShuttingDown) {
      console.log('⚠️ Shutdown already in progress...');
      return;
    }

    isShuttingDown = true;
    console.log('🛑 Starting graceful shutdown...');

    try {
      // Stop the cron worker service
      await cronWorkerService.stop();
      console.log('✅ Cron worker service stopped successfully');

      // Exit the process
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown();
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
  });

  return gracefulShutdown;
}

/**
 * Graceful shutdown function
 */
async function gracefulShutdown() {
  console.log('🛑 Starting graceful shutdown...');

  try {
    await cronWorkerService.stop();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Start the worker
main().catch((error) => {
  console.error('❌ Fatal error in worker:', error);
  process.exit(1);
});
