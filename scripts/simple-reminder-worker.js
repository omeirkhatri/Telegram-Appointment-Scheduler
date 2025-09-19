#!/usr/bin/env node

/**
 * SIMPLE REMINDER WORKER
 * This calls the API endpoint every 5 minutes to send reminders
 * No TypeScript compilation issues - just HTTP calls
 */

const cron = require('node-cron');
const https = require('https');
const http = require('http');

// Set timezone
process.env.TZ = 'Asia/Dubai';

console.log('🚀 Starting SIMPLE reminder worker...');
console.log('⏰ Timezone:', process.env.TZ);
console.log('🕐 Current time:', new Date().toISOString());

// Function to call the reminder API
async function callReminderAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/send-reminder-now',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ API Response:', result.message);
          if (result.appointments && result.appointments.length > 0) {
            console.log(`📱 Sent ${result.appointments.length} reminders`);
          }
          resolve(result);
        } catch (error) {
          console.error('❌ Error parsing API response:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ API Request error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Function to run reminders
async function runReminders() {
  try {
    console.log('\n🔔 Running 30-minute reminder check...');
    console.log('⏰ Time:', new Date().toISOString());

    await callReminderAPI();

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
  console.log('\n👋 Shutting down reminder worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down reminder worker...');
  process.exit(0);
});

console.log('✅ Reminder worker started!');
console.log('📅 Schedule: Every 5 minutes');
console.log('⏰ Timezone: Asia/Dubai');
console.log('🔔 Press Ctrl+C to stop');

