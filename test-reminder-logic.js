#!/usr/bin/env node

/**
 * Test the reminder logic to see when reminders will be sent
 */

const now = new Date();
const dubaiTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Dubai"}));

console.log('🕐 Current Dubai time:', dubaiTime.toISOString());
console.log('📅 Current date:', dubaiTime.toISOString().split('T')[0]);

// Your appointment time
const appointmentTime = new Date('2025-09-19T18:30:00+04:00'); // 6:30 PM Dubai time
console.log('📅 Appointment time:', appointmentTime.toISOString());

// Calculate 30 minutes before appointment
const reminderTime = new Date(appointmentTime.getTime() - 30 * 60 * 1000);
console.log('🔔 Reminder should be sent at:', reminderTime.toISOString());

// Calculate time until reminder
const timeUntilReminder = reminderTime.getTime() - dubaiTime.getTime();
const hoursUntilReminder = Math.floor(timeUntilReminder / (1000 * 60 * 60));
const minutesUntilReminder = Math.floor((timeUntilReminder % (1000 * 60 * 60)) / (1000 * 60));

console.log(`⏰ Time until reminder: ${hoursUntilReminder} hours ${minutesUntilReminder} minutes`);

// Test the reminder window logic (25-35 minutes before appointment)
const windowStart = new Date(appointmentTime.getTime() - 35 * 60 * 1000);
const windowEnd = new Date(appointmentTime.getTime() - 25 * 60 * 1000);

console.log('🔍 Reminder window:');
console.log('   Start:', windowStart.toISOString());
console.log('   End:', windowEnd.toISOString());

// Check if we're in the reminder window
const isInWindow = dubaiTime >= windowStart && dubaiTime <= windowEnd;
console.log('✅ Currently in reminder window:', isInWindow);

if (!isInWindow) {
  console.log('⏳ Not time for reminders yet. The worker will check every 5 minutes.');
}
