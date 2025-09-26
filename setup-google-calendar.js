#!/usr/bin/env node

/**
 * Google Calendar Setup Helper
 *
 * This script helps you set up Google Calendar integration
 * to automatically manage calendar events.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Google Calendar Setup Helper\n');

console.log('To set up Google Calendar integration, you need to:');
console.log('');
console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
console.log('2. Create a new project or select an existing one');
console.log('3. Enable the Google Calendar API');
console.log('4. Create a Service Account:');
console.log('   - Go to IAM & Admin > Service Accounts');
console.log('   - Click "Create Service Account"');
console.log('   - Name: "BestDOC Calendar Service"');
console.log('   - Description: "Service account for BestDOC calendar management"');
console.log('   - Click "Create and Continue"');
console.log('   - Skip roles for now, click "Continue"');
console.log('   - Click "Done"');
console.log('');
console.log('5. Create and download credentials:');
console.log('   - Click on the service account you just created');
console.log('   - Go to "Keys" tab');
console.log('   - Click "Add Key" > "Create new key"');
console.log('   - Choose "JSON" format');
console.log('   - Download the JSON file');
console.log('');
console.log('6. Share the calendar with the service account:');
console.log('   - Go to Google Calendar (calendar.google.com)');
console.log('   - Sign in with khatri.omeir3@gmail.com');
console.log('   - Go to calendar settings');
console.log('   - Share the calendar with the service account email');
console.log('   - Give it "Make changes to events" permission');
console.log('');
console.log('7. Add credentials to .env.local:');
console.log('   - Copy the contents of the downloaded JSON file');
console.log('   - Add these lines to your .env.local file:');
console.log('');
console.log('   GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY={"type":"service_account",...}');
console.log('   GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com');
console.log('   GOOGLE_CALENDAR_API_ENABLED=true');
console.log('   GOOGLE_CALENDAR_SYNC_ENABLED=true');
console.log('');
console.log('8. Test the integration:');
console.log('   - Run: node clear-all-calendar-events.js');
console.log('   - This will clean up all calendar events');
console.log('');
console.log('📝 Note: The service account email will look like:');
console.log('   bestdoc-calendar-service@your-project-id.iam.gserviceaccount.com');
console.log('');
console.log('Once set up, the system will automatically:');
console.log('✅ Create calendar events when appointments are created');
console.log('✅ Update calendar events when appointments are modified');
console.log('✅ Delete calendar events when appointments are deleted');
console.log('✅ Clean up orphaned events automatically');

