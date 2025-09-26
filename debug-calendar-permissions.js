#!/usr/bin/env node

/**
 * Debug Google Calendar Permissions
 *
 * This script helps debug why the Google Calendar is read-only
 */

console.log('🔍 Google Calendar Permissions Debug\n');

console.log('Common reasons why Google Calendar is read-only:');
console.log('');
console.log('1. ❌ Service account not added to calendar sharing');
console.log('2. ❌ Service account has "See all event details" instead of "Make changes to events"');
console.log('3. ❌ Calendar is owned by a different Google account');
console.log('4. ❌ Google Calendar API not enabled');
console.log('5. ❌ Service account credentials not properly configured');
console.log('');
console.log('🔧 Quick Fix Steps:');
console.log('');
console.log('1. Go to Google Calendar: https://calendar.google.com');
console.log('2. Sign in with: khatri.omeir3@gmail.com');
console.log('3. Click the 3 dots next to your calendar name');
console.log('4. Select "Settings and sharing"');
console.log('5. Scroll to "Share with specific people"');
console.log('6. Look for any service account email (ends with @project.iam.gserviceaccount.com)');
console.log('7. If found, change permission to "Make changes to events"');
console.log('8. If not found, you need to set up Google Calendar integration first');
console.log('');
console.log('📧 Service account email should look like:');
console.log('   bestdoc-calendar-service@your-project-id.iam.gserviceaccount.com');
console.log('');
console.log('🔑 To set up Google Calendar integration:');
console.log('   1. Go to Google Cloud Console');
console.log('   2. Create a project and enable Calendar API');
console.log('   3. Create a service account and download JSON key');
console.log('   4. Add the service account email to calendar sharing');
console.log('   5. Add credentials to .env.local file');
console.log('');
console.log('💡 Alternative: Create a new test calendar');
console.log('   1. Create a new calendar in Google Calendar');
console.log('   2. Share it with the service account');
console.log('   3. Use that calendar for testing');

