#!/usr/bin/env node

/**
 * Simple Worker for MediCare Scheduler
 *
 * This is a simplified worker that handles basic cron jobs
 * without requiring TypeScript compilation.
 */

const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  timezone: process.env.TZ || 'Asia/Dubai',
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

// Logging function
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

  if (data && Object.keys(data).length > 0) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

// Health check function
async function healthCheck() {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('count')
      .limit(1);

    if (error) {
      log('error', 'Health check failed', { error: error.message });
      return false;
    }

    log('info', 'Health check passed');
    return true;
  } catch (error) {
    log('error', 'Health check error', { error: error.message });
    return false;
  }
}

// Daily agenda job (placeholder)
async function dailyAgendaJob() {
  log('info', 'Running daily agenda job...');

  try {
    // This is a placeholder - you can implement the actual daily agenda logic here
    // For now, just log that the job would run
    log('info', 'Daily agenda job completed (placeholder)');

    // Update worker status in database if needed
    const { error } = await supabase
      .from('worker_status')
      .upsert({
        id: 'cron-worker',
        status: 'running',
        last_run: new Date().toISOString(),
        next_run: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
      });

    if (error) {
      log('warn', 'Failed to update worker status', { error: error.message });
    }

  } catch (error) {
    log('error', 'Daily agenda job failed', { error: error.message });
  }
}

// Main worker function
async function startWorker() {
  log('info', 'Starting MediCare Scheduler Worker...');
  log('info', 'Configuration', {
    supabaseUrl: config.supabaseUrl,
    timezone: config.timezone,
    logLevel: config.logLevel,
  });

  // Initial health check
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    log('error', 'Initial health check failed, exiting');
    process.exit(1);
  }

  // Schedule daily agenda job at 6:00 AM Dubai time
  // Note: This is a simplified schedule - in production you'd want more sophisticated scheduling
  cron.schedule('0 6 * * *', async () => {
    log('info', 'Triggering daily agenda job...');
    await dailyAgendaJob();
  }, {
    timezone: config.timezone,
  });

  // Schedule health checks every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await healthCheck();
  });

  // Periodic status logging every hour
  cron.schedule('0 * * * *', () => {
    log('info', 'Worker status check', {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timezone: config.timezone,
    });
  });

  log('info', 'Worker started successfully');
  log('info', 'Scheduled jobs:', {
    dailyAgenda: '0 6 * * * (6:00 AM Dubai time)',
    healthCheck: '*/5 * * * * (every 5 minutes)',
    statusLog: '0 * * * * (every hour)',
  });

  // Keep the process alive
  process.on('SIGINT', () => {
    log('info', 'Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('info', 'Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

// Start the worker
if (require.main === module) {
  startWorker().catch((error) => {
    log('error', 'Failed to start worker', { error: error.message });
    process.exit(1);
  });
}

module.exports = { startWorker, healthCheck, dailyAgendaJob };
