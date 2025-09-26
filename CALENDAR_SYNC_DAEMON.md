# Enhanced Calendar Sync Daemon

The enhanced calendar sync daemon now handles all appointment lifecycle events including creates, updates, and deletes. It runs continuously and syncs appointments to Google Calendar every 10 seconds.

## Features

### ✅ What it handles:

1. **New Appointments** - Creates calendar events for newly scheduled appointments
2. **Cancelled Appointments** - Deletes calendar events when appointments are cancelled
3. **Rescheduled Appointments** - Updates calendar events when appointments are rescheduled
4. **Updated Appointments** - Syncs changes to appointment details (time, date, type, etc.)
5. **Orphaned Events** - Automatically cleans up calendar events that no longer have corresponding appointments in the database

### 🔄 How it works:

The daemon runs in four phases every 10 seconds:

1. **Phase 1: Handle Cancelled Appointments**
   - Finds appointments with status = 'cancelled' that have calendar events
   - Deletes the corresponding Google Calendar events
   - Clears the `google_event_id` from `appointment_staff` records

2. **Phase 2: Handle Updated Appointments**
   - Finds appointments that were updated in the last 5 minutes
   - Updates the corresponding Google Calendar events with new details
   - Handles reschedules, time changes, and other modifications

3. **Phase 3: Handle New Appointments**
   - Finds scheduled appointments without calendar events
   - Creates new Google Calendar events
   - Updates `appointment_staff` records with the new `google_event_id`

4. **Phase 4: Clean Up Orphaned Events**
   - Finds calendar events that no longer have corresponding appointments in the database
   - Deletes these orphaned events from Google Calendar
   - Removes the corresponding `appointment_staff` records

## Usage

### Starting the Daemon

```bash
# Start the enhanced daemon
npm run calendar-sync-daemon &

# Or run directly
node src/scripts/calendar-sync-daemon.js
```

### Stopping the Daemon

```bash
# Find the process
ps aux | grep calendar-sync-daemon

# Kill the process
kill <process_id>
```

## API Endpoints

The daemon uses three simple API endpoints:

### 1. Create Calendar Event
- **Endpoint**: `POST /api/calendar/create-simple`
- **Purpose**: Creates new calendar events
- **Used by**: Phase 3 (new appointments)

### 2. Update Calendar Event
- **Endpoint**: `POST /api/calendar/update-simple`
- **Purpose**: Updates existing calendar events
- **Used by**: Phase 2 (updated appointments)

### 3. Delete Calendar Event
- **Endpoint**: `POST /api/calendar/delete-simple`
- **Purpose**: Deletes calendar events
- **Used by**: Phase 1 (cancelled appointments)

## Configuration

The daemon uses the following environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY=your_base64_encoded_service_account_key
```

## Database Schema

The daemon relies on these key database fields:

### `appointments` table:
- `status` - 'scheduled', 'confirmed', 'completed', 'cancelled'
- `appointment_date` - Date of the appointment
- `start_time` - Start time of the appointment
- `duration_minutes` - Duration in minutes
- `updated_at` - Timestamp for detecting changes

### `appointment_staff` table:
- `google_event_id` - Google Calendar event ID (null if not synced)
- `staff_id` - Reference to staff member
- `appointment_id` - Reference to appointment

### `staff` table:
- `google_calendar_id` - Google Calendar ID for the staff member

## Monitoring

The daemon provides detailed logging:

```
🔄 Starting enhanced calendar sync worker...
🗑️ Checking for cancelled appointments...
✅ No cancelled appointments to process
🔄 Checking for updated appointments...
✅ No updated appointments to process
📅 Checking for new appointments...
📅 Found 2 new appointments to sync
📅 Processing new appointment: 123e4567-e89b-12d3-a456-426614174000
   Date: 2024-01-15
   Time: 10:00:00
   Type: doctor_on_call
👤 Syncing to staff: Dr. John Smith
✅ Calendar event created: abc123def456
✅ Updated appointment_staff with Google event ID

📊 New Appointments Summary:
   ✅ Successfully synced: 2
   ❌ Errors: 0
   📅 Total processed: 2
```

## Testing

Use the provided test script to verify the daemon works correctly:

```bash
node test-calendar-sync.js
```

This will:
1. Create a test appointment
2. Wait for the daemon to sync it
3. Reschedule the appointment
4. Wait for the daemon to update it
5. Cancel the appointment
6. Wait for the daemon to delete it
7. Clean up test data

## Error Handling

The daemon includes comprehensive error handling:

- **Database errors**: Logged and skipped, daemon continues
- **API errors**: Logged and counted, daemon continues
- **Network errors**: Retried automatically
- **Validation errors**: Logged with details

## Performance

- **Batch size**: Processes up to 20 appointments per phase
- **Update detection**: Only processes appointments updated in last 5 minutes
- **Future-only**: Only processes future appointments
- **Concurrent safety**: Prevents multiple sync cycles from running simultaneously

## Troubleshooting

### Common Issues:

1. **No appointments being synced**
   - Check if staff have `google_calendar_id` set
   - Verify `GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY` is correct
   - Check appointment status is 'scheduled'

2. **Events not being deleted**
   - Verify appointment status is 'cancelled'
   - Check if `google_event_id` exists in `appointment_staff`

3. **Events not being updated**
   - Check if appointment was updated recently (within 5 minutes)
   - Verify `google_event_id` exists in `appointment_staff`

### Debug Mode:

Add more verbose logging by modifying the daemon script:

```javascript
// Add this at the top of the file
const DEBUG = true;

// Then use it in logging
if (DEBUG) {
  console.log('🔍 Debug: Detailed information here');
}
```

## Future Enhancements

Potential improvements for the daemon:

1. **Webhook support**: Real-time updates instead of polling
2. **Retry logic**: Exponential backoff for failed operations
3. **Metrics**: Prometheus metrics for monitoring
4. **Configuration**: Configurable sync intervals and batch sizes
5. **Health checks**: Endpoint to check daemon status
6. **Event history**: Track all sync operations for audit
