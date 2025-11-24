# Testing Calendar Sync Daemon

This guide will help you test the enhanced calendar sync daemon with a clean slate.

## 🧹 Step 1: Clear All Existing Calendar Events

First, delete all existing calendar events so you can test with a clean slate:

```bash
# Clear all calendar events from all staff calendars
npm run clear-calendar-events
```

This will:
- Find all staff members with Google Calendar IDs
- Find all appointments with existing calendar events
- Delete all calendar events from Google Calendar
- Clear the `google_event_id` from the database
- Show you a summary of what was deleted

## 🚀 Step 2: Start the Enhanced Daemon

Start the enhanced daemon in the background:

```bash
# Start the daemon (runs every 10 seconds)
npm run calendar-sync-daemon &
```

You should see output like:
```
🚀 Starting Calendar Sync Daemon...
📅 Will sync appointments every 10 seconds
⏰ Started at: 2024-01-15T10:00:00.000Z
---
🔄 Starting enhanced calendar sync worker...
🗑️ Checking for cancelled appointments...
✅ No cancelled appointments to process
🔄 Checking for updated appointments...
✅ No updated appointments to process
📅 Checking for new appointments...
✅ No new appointments need calendar sync
```

## 🧪 Step 3: Test the Daemon

### Option A: Use the Automated Test Script

```bash
# Run the comprehensive test
npm run test:calendar-sync
```

This will:
1. Create a test appointment
2. Wait for the daemon to sync it (creates calendar event)
3. Reschedule the appointment
4. Wait for the daemon to update it (updates calendar event)
5. Cancel the appointment
6. Wait for the daemon to delete it (deletes calendar event)
7. Clean up test data

### Option B: Manual Testing

1. **Create a new appointment** in your app
   - Go to the appointments page
   - Create a new appointment with status "scheduled"
   - Assign it to a staff member with a Google Calendar ID
   - Watch the daemon logs - it should create a calendar event

2. **Reschedule the appointment**
   - Edit the appointment time or date
   - Watch the daemon logs - it should update the calendar event

3. **Cancel the appointment**
   - Change the status to "cancelled"
   - Watch the daemon logs - it should delete the calendar event

## 📊 Step 4: Monitor the Daemon

The daemon provides detailed logging. You should see:

### For New Appointments:
```
📅 Found 1 new appointments to sync
📅 Processing new appointment: 123e4567-e89b-12d3-a456-426614174000
   Date: 2024-01-15
   Time: 10:00:00
   Type: doctor_on_call
👤 Syncing to staff: Dr. John Smith
✅ Calendar event created: abc123def456
✅ Updated appointment_staff with Google event ID

📊 New Appointments Summary:
   ✅ Successfully synced: 1
   ❌ Errors: 0
   📅 Total processed: 1
```

### For Updated Appointments:
```
🔄 Found 1 updated appointments to process
🔄 Processing updated appointment: 123e4567-e89b-12d3-a456-426614174000
   Date: 2024-01-15
   Time: 14:00:00
   Type: doctor_on_call
👤 Updating calendar event for staff: Dr. John Smith
✅ Calendar event updated successfully

📊 Updated Appointments Summary:
   ✅ Successfully updated: 1
   ❌ Errors: 0
```

### For Cancelled Appointments:
```
🗑️ Found 1 cancelled appointments to process
🗑️ Processing cancelled appointment: 123e4567-e89b-12d3-a456-426614174000
👤 Deleting calendar event for staff: Dr. John Smith
✅ Calendar event deleted successfully
✅ Cleared google_event_id from appointment_staff

📊 Cancelled Appointments Summary:
   ✅ Successfully deleted: 1
   ❌ Errors: 0
```

### For Orphaned Events Cleanup:
```
🧹 Checking for orphaned calendar events...
🗑️ Found 2 orphaned calendar events to clean up
🗑️ Deleting orphaned event abc123def456 from Dr. John Smith's calendar...
✅ Deleted successfully
✅ Deleted appointment_staff record

📊 Orphaned Events Cleanup Summary:
   ✅ Successfully deleted: 2
   ❌ Errors: 0
   🗑️ Total processed: 2
```

## 🔍 Step 5: Verify in Google Calendar

1. Open Google Calendar
2. Check the staff member's calendar
3. You should see:
   - New appointments appear as calendar events
   - Updated appointments reflect the new time/date
   - Cancelled appointments are removed

## 🛑 Step 6: Stop the Daemon

When you're done testing:

```bash
# Find the daemon process
ps aux | grep calendar-sync-daemon

# Kill the process (replace <PID> with the actual process ID)
kill <PID>
```

## 🐛 Troubleshooting

### No appointments being synced:
- Check if staff have `google_calendar_id` set
- Verify `GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY` is correct
- Check appointment status is 'scheduled'

### Events not being deleted:
- Verify appointment status is 'cancelled'
- Check if `google_event_id` exists in `appointment_staff`

### Events not being updated:
- Check if appointment was updated recently (within 5 minutes)
- Verify `google_event_id` exists in `appointment_staff`

### API errors:
- Make sure your Next.js app is running (`npm run dev`)
- Check the API endpoints are accessible
- Verify Google Calendar API credentials

## 📝 Expected Behavior

The enhanced daemon should:

✅ **Create** calendar events for new scheduled appointments
✅ **Update** calendar events when appointments are rescheduled
✅ **Delete** calendar events when appointments are cancelled
✅ **Clean up** orphaned calendar events automatically
✅ **Sync** changes within 10 seconds
✅ **Handle** errors gracefully and continue running
✅ **Log** detailed information about all operations

## 🎯 Success Criteria

Your test is successful if:
1. New appointments appear in Google Calendar
2. Rescheduled appointments update in Google Calendar
3. Cancelled appointments disappear from Google Calendar
4. All operations complete within 10 seconds
5. No errors in the daemon logs
6. Database `google_event_id` fields are properly managed

## 🔄 Clean Up After Testing

After testing, you can clear all calendar events again:

```bash
npm run clear-calendar-events
```

This ensures a clean state for future testing or production use.
