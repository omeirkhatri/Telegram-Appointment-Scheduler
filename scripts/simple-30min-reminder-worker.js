#!/usr/bin/env node

/**
 * SIMPLE 30-MINUTE REMINDER WORKER
 * This is a much simpler approach that just runs every 5 minutes
 * and checks for appointments starting in 30 minutes.
 */

const cron = require('node-cron');
const path = require('path');

// Set timezone
process.env.TZ = 'Asia/Dubai';

console.log('🚀 Starting SIMPLE 30-minute reminder worker...');
console.log('⏰ Timezone:', process.env.TZ);
console.log('🕐 Current time:', new Date().toISOString());

// Import the simple reminder function
async function runReminders() {
  try {
    // Import the simple reminder job
    const { simple30MinReminderJob } = await import('../src/jobs/simple30MinReminderJob.ts');
    await simple30MinReminderJob();
  } catch (error) {
    console.error('❌ Error running reminders:', error);
  }
}

// Schedule to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('\n🔔 Running 30-minute reminder check...');
  console.log('⏰ Time:', new Date().toISOString());
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
