#!/usr/bin/env node

/**
 * Debug the reminder timing for 6:30 AM appointment
 */

const now = new Date();
const dubaiTime = new Date(now.toLocaleString('en-US', {timeZone: 'Asia/Dubai'}));

console.log('🕐 Current Dubai time:', dubaiTime.toISOString());
console.log('📅 Current time formatted:', dubaiTime.toLocaleString('en-US', {timeZone: 'Asia/Dubai'}));

// Your appointment time (6:30 AM)
const appointmentTime = new Date('2025-09-19T06:30:00+04:00');
console.log('📅 Appointment time:', appointmentTime.toISOString());
console.log('📅 Appointment time formatted:', appointmentTime.toLocaleString('en-US', {timeZone: 'Asia/Dubai'}));

// Calculate 30 minutes before appointment (6:00 AM)
const reminderTime = new Date(appointmentTime.getTime() - 30 * 60 * 1000);
console.log('🔔 Reminder should be sent at:', reminderTime.toISOString());
console.log('🔔 Reminder time formatted:', reminderTime.toLocaleString('en-US', {timeZone: 'Asia/Dubai'}));

// Calculate time until appointment
const timeUntilAppointment = appointmentTime.getTime() - dubaiTime.getTime();
const minutesUntilAppointment = Math.floor(timeUntilAppointment / (1000 * 60));

console.log(`⏰ Time until appointment: ${minutesUntilAppointment} minutes`);

// Test the reminder window logic (25-35 minutes before appointment)
const windowStart = new Date(appointmentTime.getTime() - 35 * 60 * 1000);
const windowEnd = new Date(appointmentTime.getTime() - 25 * 60 * 1000);

console.log('🔍 Reminder window:');
console.log('   Start (5:55 AM):', windowStart.toISOString());
console.log('   End (6:05 AM):', windowEnd.toISOString());
console.log('   Start formatted:', windowStart.toLocaleString('en-US', {timeZone: 'Asia/Dubai'}));
console.log('   End formatted:', windowEnd.toLocaleString('en-US', {timeZone: 'Asia/Dubai'}));

// Check if we're in the reminder window
const isInWindow = dubaiTime >= windowStart && dubaiTime <= windowEnd;
console.log('✅ Currently in reminder window:', isInWindow);

if (isInWindow) {
  console.log('🎯 NOW IS THE TIME! The reminder should be sent!');
} else if (dubaiTime < windowStart) {
  console.log('⏳ Too early - reminder window starts at 5:55 AM');
} else {
  console.log('❌ Too late - reminder window ended at 6:05 AM');
}

// Test the actual logic from the reminder job
const thirtyMinutesFromNow = new Date(dubaiTime.getTime() + 30 * 60 * 1000);
console.log('\n🧪 Testing reminder job logic:');
console.log('   Current time:', dubaiTime.toISOString());
console.log('   30 minutes from now:', thirtyMinutesFromNow.toISOString());
console.log('   Appointment time:', appointmentTime.toISOString());

// Check if appointment is within 25-35 minutes from now
const timeDiff = appointmentTime.getTime() - dubaiTime.getTime();
const minutesDiff = timeDiff / (1000 * 60);

console.log(`   Minutes until appointment: ${minutesDiff}`);
console.log(`   Is within 25-35 minutes: ${minutesDiff >= 25 && minutesDiff <= 35}`);
