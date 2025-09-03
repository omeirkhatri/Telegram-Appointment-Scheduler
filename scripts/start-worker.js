#!/usr/bin/env node

/**
 * MediCare Scheduler - Cron Worker Process
 *
 * This script starts the cron worker service for production environments.
 * It can be run as a standalone process or as a systemd service.
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Configuration
const config = {
  // Process configuration
  nodeEnv: process.env.NODE_ENV || 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
  timezone: process.env.TZ || 'Asia/Dubai',

  // Worker configuration
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || 5,
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
  persistenceInterval: parseInt(process.env.PERSISTENCE_INTERVAL) || 60000,

  // File paths
  pidFile: process.env.PID_FILE || './worker.pid',
  logFile: process.env.LOG_FILE || './logs/worker.log',
  errorFile: process.env.ERROR_FILE || './logs/worker-error.log',

  // Restart configuration
  maxRestarts: parseInt(process.env.MAX_RESTARTS) || 5,
  restartDelay: parseInt(process.env.RESTART_DELAY) || 5000,
};

// Global variables
let workerProcess = null;
let restartCount = 0;
let isShuttingDown = false;

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting MediCare Scheduler Cron Worker...');
  console.log('Configuration:', config);

  // Handle command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start':
      await startWorker();
      break;
    case 'stop':
      await stopWorker();
      break;
    case 'restart':
      await restartWorker();
      break;
    case 'status':
      await checkStatus();
      break;
    case 'logs':
      await showLogs();
      break;
    default:
      showHelp();
  }
}

/**
 * Start the worker process
 */
async function startWorker() {
  try {
    // Check if already running
    if (await isWorkerRunning()) {
      console.log('⚠️ Worker is already running');
      return;
    }

    // Create logs directory
    const logDir = path.dirname(config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Set up environment variables
    const env = {
      ...process.env,
      NODE_ENV: config.nodeEnv,
      LOG_LEVEL: config.logLevel,
      TZ: config.timezone,
      MAX_CONCURRENT_JOBS: config.maxConcurrentJobs.toString(),
      HEALTH_CHECK_INTERVAL: config.healthCheckInterval.toString(),
      PERSISTENCE_INTERVAL: config.persistenceInterval.toString(),
    };

    // Start the worker process
    console.log('🔄 Starting worker process...');
    workerProcess = spawn('node', [path.join(__dirname, 'worker.js')], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    // Set up logging
    setupLogging();

    // Set up process handlers
    setupProcessHandlers();

    // Save PID
    fs.writeFileSync(config.pidFile, workerProcess.pid.toString());

    console.log(`✅ Worker started with PID: ${workerProcess.pid}`);
    console.log(`📝 Logs: ${config.logFile}`);
    console.log(`❌ Errors: ${config.errorFile}`);

    // Keep the process alive
    await new Promise((resolve) => {
      workerProcess.on('exit', (code, signal) => {
        console.log(`Worker process exited with code ${code}, signal ${signal}`);
        resolve();
      });
    });

  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

/**
 * Stop the worker process
 */
async function stopWorker() {
  try {
    if (!await isWorkerRunning()) {
      console.log('⚠️ Worker is not running');
      return;
    }

    const pid = fs.readFileSync(config.pidFile, 'utf8').trim();
    console.log(`🛑 Stopping worker process (PID: ${pid})...`);

    // Send SIGTERM
    process.kill(parseInt(pid), 'SIGTERM');

    // Wait for graceful shutdown
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds

    while (attempts < maxAttempts) {
      try {
        process.kill(parseInt(pid), 0); // Check if process exists
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        // Process no longer exists
        break;
      }
    }

    // Force kill if still running
    if (attempts >= maxAttempts) {
      console.log('⚠️ Force killing worker process...');
      process.kill(parseInt(pid), 'SIGKILL');
    }

    // Clean up PID file
    if (fs.existsSync(config.pidFile)) {
      fs.unlinkSync(config.pidFile);
    }

    console.log('✅ Worker stopped successfully');

  } catch (error) {
    console.error('❌ Failed to stop worker:', error);
    process.exit(1);
  }
}

/**
 * Restart the worker process
 */
async function restartWorker() {
  console.log('🔄 Restarting worker...');
  await stopWorker();
  await new Promise(resolve => setTimeout(resolve, 2000));
  await startWorker();
}

/**
 * Check worker status
 */
async function checkStatus() {
  try {
    if (!await isWorkerRunning()) {
      console.log('❌ Worker is not running');
      return;
    }

    const pid = fs.readFileSync(config.pidFile, 'utf8').trim();
    console.log(`✅ Worker is running (PID: ${pid})`);

    // Show recent logs
    if (fs.existsSync(config.logFile)) {
      const stats = fs.statSync(config.logFile);
      console.log(`📝 Log file: ${config.logFile} (${stats.size} bytes)`);
    }

    if (fs.existsSync(config.errorFile)) {
      const stats = fs.statSync(config.errorFile);
      console.log(`❌ Error file: ${config.errorFile} (${stats.size} bytes)`);
    }

  } catch (error) {
    console.error('❌ Failed to check status:', error);
  }
}

/**
 * Show recent logs
 */
async function showLogs() {
  try {
    if (!fs.existsSync(config.logFile)) {
      console.log('📝 No log file found');
      return;
    }

    const lines = parseInt(process.argv[3]) || 50;
    const logContent = fs.readFileSync(config.logFile, 'utf8');
    const logLines = logContent.split('\n').slice(-lines);

    console.log(`📝 Last ${lines} lines from ${config.logFile}:`);
    console.log('─'.repeat(50));
    console.log(logLines.join('\n'));

  } catch (error) {
    console.error('❌ Failed to show logs:', error);
  }
}

/**
 * Check if worker is running
 */
async function isWorkerRunning() {
  try {
    if (!fs.existsSync(config.pidFile)) {
      return false;
    }

    const pid = fs.readFileSync(config.pidFile, 'utf8').trim();
    process.kill(parseInt(pid), 0); // Check if process exists
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Set up logging for the worker process
 */
function setupLogging() {
  // Set up stdout logging
  workerProcess.stdout.on('data', (data) => {
    const logMessage = `[${new Date().toISOString()}] ${data.toString()}`;
    fs.appendFileSync(config.logFile, logMessage);
    console.log(logMessage.trim());
  });

  // Set up stderr logging
  workerProcess.stderr.on('data', (data) => {
    const errorMessage = `[${new Date().toISOString()}] ERROR: ${data.toString()}`;
    fs.appendFileSync(config.errorFile, errorMessage);
    console.error(errorMessage.trim());
  });
}

/**
 * Set up process handlers
 */
function setupProcessHandlers() {
  // Handle worker process exit
  workerProcess.on('exit', (code, signal) => {
    console.log(`Worker process exited with code ${code}, signal ${signal}`);

    // Clean up PID file
    if (fs.existsSync(config.pidFile)) {
      fs.unlinkSync(config.pidFile);
    }

    // Restart if not shutting down and within restart limit
    if (!isShuttingDown && restartCount < config.maxRestarts) {
      restartCount++;
      console.log(`🔄 Restarting worker (attempt ${restartCount}/${config.maxRestarts})...`);

      setTimeout(() => {
        startWorker();
      }, config.restartDelay);
    } else if (restartCount >= config.maxRestarts) {
      console.error('❌ Maximum restart attempts reached. Worker will not restart.');
      process.exit(1);
    }
  });

  // Handle process signals
  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down...');
    isShuttingDown = true;
    if (workerProcess) {
      workerProcess.kill('SIGTERM');
    }
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down...');
    isShuttingDown = true;
    if (workerProcess) {
      workerProcess.kill('SIGTERM');
    }
  });
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
MediCare Scheduler - Cron Worker Manager

Usage: node start-worker.js <command> [options]

Commands:
  start     Start the worker process
  stop      Stop the worker process
  restart   Restart the worker process
  status    Check worker status
  logs [n]  Show last n lines of logs (default: 50)
  help      Show this help message

Environment Variables:
  NODE_ENV                 Node environment (default: production)
  LOG_LEVEL               Log level (default: info)
  TZ                      Timezone (default: Asia/Dubai)
  MAX_CONCURRENT_JOBS     Max concurrent jobs (default: 5)
  HEALTH_CHECK_INTERVAL   Health check interval in ms (default: 30000)
  PERSISTENCE_INTERVAL    Persistence interval in ms (default: 60000)
  PID_FILE                PID file path (default: ./worker.pid)
  LOG_FILE                Log file path (default: ./logs/worker.log)
  ERROR_FILE              Error file path (default: ./logs/worker-error.log)
  MAX_RESTARTS            Max restart attempts (default: 5)
  RESTART_DELAY           Restart delay in ms (default: 5000)

Examples:
  node start-worker.js start
  node start-worker.js status
  node start-worker.js logs 100
  node start-worker.js restart
`);
}

// Run main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
