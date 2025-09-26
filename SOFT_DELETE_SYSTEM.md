# Soft Delete System for Appointments

## Overview

The soft delete system allows appointments to be marked as "deleted" in the database instead of being physically removed. This provides better data integrity, audit trails, and allows for recovery of accidentally deleted appointments.

## How It Works

### 1. Database Changes

- Added `'deleted'` status to the `appointment_status_enum`
- Created database functions for soft delete operations:
  - `soft_delete_appointment(appointment_id)` - Marks appointment as deleted
  - `restore_appointment(appointment_id, new_status)` - Restores deleted appointment
  - `get_all_appointments_including_deleted()` - Gets all appointments including deleted ones

### 2. Service Layer Changes

- Updated `AppointmentService.deleteAppointment()` to use soft delete instead of hard delete
- Added `hardDeleteAppointment()` method for daemon use only
- Added `restoreAppointment()` method for restoring deleted appointments
- Updated all query methods to exclude deleted appointments by default

### 3. Calendar Integration

- Deleted appointments are hidden from all calendar views and maps
- Calendar events are cleaned up by the daemon after soft delete
- Google Calendar events are removed asynchronously to ensure consistency

## Usage

### Soft Delete an Appointment

```typescript
// This will mark the appointment as deleted instead of removing it
await appointmentService.deleteAppointment(appointmentId);
```

### Restore a Deleted Appointment

```typescript
// Restore with default status 'scheduled'
await appointmentService.restoreAppointment(appointmentId);

// Restore with specific status
await appointmentService.restoreAppointment(appointmentId, 'confirmed');
```

### Query Deleted Appointments

```typescript
// Get all appointments including deleted ones
const allAppointments = await appointmentService.getAllAppointmentsIncludingDeleted();

// Get only deleted appointments
const deletedAppointments = await appointmentService.getAppointmentsByStatus('deleted');
```

## Daemon System

### Appointment Cleanup Daemon

The daemon runs every 30 seconds and:
1. Finds appointments with status 'deleted'
2. Removes their Google Calendar events
3. Hard deletes them from the database after calendar cleanup

### Starting the Daemon

```bash
# Using npm script
npm run daemon:cleanup

# Or directly
node src/scripts/start-appointment-cleanup-daemon.js
```

### Daemon API Endpoints

```bash
# Check daemon status
GET /api/daemon/appointment-cleanup?action=status

# Get cleanup statistics
GET /api/daemon/appointment-cleanup?action=stats

# Start daemon
POST /api/daemon/appointment-cleanup
{
  "action": "start"
}

# Stop daemon
POST /api/daemon/appointment-cleanup
{
  "action": "stop"
}

# Cleanup specific appointment
POST /api/daemon/appointment-cleanup
{
  "action": "cleanup-specific",
  "appointmentId": "uuid"
}
```

## Recurring Appointments

The soft delete system handles recurring appointments properly:

- When a base recurring appointment is soft deleted, all related occurrences are also soft deleted
- When individual occurrences are soft deleted, only that occurrence is affected
- The daemon processes all deleted appointments (base and occurrences) for calendar cleanup

## Database Functions

### soft_delete_appointment(appointment_id)

Marks an appointment as deleted. If it's a recurring base appointment, also marks all related occurrences as deleted.

### restore_appointment(appointment_id, new_status)

Restores a deleted appointment with the specified status (defaults to 'scheduled').

### get_all_appointments_including_deleted()

Returns all appointments including deleted ones. Useful for admin purposes.

## Testing

Run the comprehensive test to verify the soft delete workflow:

```bash
node test-soft-delete-workflow.js
```

This test covers:
1. Creating an appointment
2. Soft deleting it
3. Verifying it's hidden from normal queries
4. Verifying it appears in deleted queries
5. Testing restore functionality
6. Testing daemon cleanup (hard delete)

## Benefits

1. **Data Integrity**: No data is permanently lost
2. **Audit Trail**: Can track when appointments were deleted
3. **Recovery**: Accidentally deleted appointments can be restored
4. **Consistency**: Calendar cleanup happens asynchronously
5. **Performance**: Queries are faster as they exclude deleted records by default

## Migration

The system is backward compatible. Existing appointments continue to work normally. The soft delete functionality is only applied to new deletions.

## Monitoring

The daemon provides statistics about:
- Total deleted appointments
- Appointments processed today
- Pending cleanup count

Access these via the API endpoint `/api/daemon/appointment-cleanup?action=stats`

