#!/usr/bin/env node

/**
 * SIMPLE 30-MINUTE REMINDER WORKER
 * This version uses direct API calls instead of imports to avoid module issues
 */

const cron = require('node-cron');
const https = require('https');
const http = require('http');

// Set timezone
process.env.TZ = 'Asia/Dubai';

console.log('🚀 Starting SIMPLE 30-minute reminder worker...');
console.log('⏰ Timezone:', process.env.TZ);
console.log('🕐 Current time:', new Date().toISOString());

// Function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      });
    }).on('error', reject);
  });
}

// Function to run reminders
async function runReminders() {
  try {
    console.log('\n🔔 Running 30-minute reminder check...');
    console.log('⏰ Time:', new Date().toISOString());

    // Call the API endpoint
    const result = await makeRequest('http://localhost:3000/api/test-30min-reminders');

    if (result.success) {
      console.log('✅ Reminder check completed successfully');
    } else {
      console.log('❌ Reminder check failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error running reminders:', error.message);
  }
}

// Schedule to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  await runReminders();
}, {
  timezone: 'Asia/Dubai',
});

// Run immediately on startup
console.log('🔔 Running initial reminder check...');
runReminders();

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down 30-minute reminder worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down 30-minute reminder worker...');
  process.exit(0);
});

console.log('✅ 30-minute reminder worker started!');
console.log('📅 Schedule: Every 5 minutes');
console.log('⏰ Timezone: Asia/Dubai');
console.log('🔔 Press Ctrl+C to stop');
