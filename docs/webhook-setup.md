# Google Calendar Webhook Setup Guide

This guide explains how to set up and manage Google Calendar webhooks for bidirectional synchronization between the MediCare Scheduler and Google Calendar.

## Overview

The webhook system enables real-time synchronization between appointments in the MediCare Scheduler and Google Calendar events. When appointments are created, updated, or deleted in the system, corresponding events are automatically created in the staff members' Google Calendars. Conversely, when events are modified in Google Calendar, the changes are reflected back in the appointment system.

## Architecture

### Components

1. **Webhook Handler** (`/api/webhooks/calendar`): Receives notifications from Google Calendar
2. **Webhook Service**: Manages webhook lifecycle and operations
3. **Webhook Management API** (`/api/webhooks/management`): Administrative interface for webhook management
4. **Google Calendar Service**: Handles Google Calendar API interactions

### Flow

```
Google Calendar Event Change
           ↓
    Webhook Notification
           ↓
    Webhook Handler
           ↓
    Process Changes
           ↓
    Update Appointment System
```

## Setup Instructions

### 1. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Google Calendar Webhook Configuration
GOOGLE_CALENDAR_WEBHOOK_SECRET=your_secure_webhook_secret_here
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Google Calendar API Setup

Ensure you have completed the Google Calendar API setup as described in `docs/google-calendar-setup.md`.

### 3. Webhook Endpoint Configuration

The webhook endpoint is automatically available at:
```
https://your-domain.com/api/webhooks/calendar
```

### 4. Staff Calendar Integration

For each staff member who needs Google Calendar integration:

1. **Configure Google Calendar ID**: Set the `google_calendar_id` field in the staff member's profile
2. **Set up Webhook**: Use the webhook management API to establish the webhook connection

## Webhook Management

### API Endpoints

#### Get Webhook Status

```http
GET /api/webhooks/management
GET /api/webhooks/management?staff_id=staff-123
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "staffId": "staff-123",
      "staffName": "Dr. Sarah Smith",
      "hasGoogleCalendar": true,
      "hasWebhook": true,
      "webhookId": "webhook-456",
      "lastSync": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Set up Webhook for Staff

```http
POST /api/webhooks/management
Content-Type: application/json

{
  "staff_id": "staff-123",
  "action": "setup"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "webhookId": "webhook-456"
  }
}
```

#### Remove Webhook for Staff

```http
POST /api/webhooks/management
Content-Type: application/json

{
  "staff_id": "staff-123",
  "action": "remove"
}
```

#### Refresh Webhook (Renew before expiration)

```http
POST /api/webhooks/management
Content-Type: application/json

{
  "staff_id": "staff-123",
  "action": "refresh"
}
```

#### Test Webhook Connectivity

```http
POST /api/webhooks/management
Content-Type: application/json

{
  "staff_id": "staff-123",
  "action": "test"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "calendarAccess": true,
    "webhookSetup": true
  }
}
```

#### Bulk Operations

Set up webhooks for all staff members with Google Calendar integration:

```http
PUT /api/webhooks/management
Content-Type: application/json

{
  "action": "setup_all"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "results": [
      {
        "staffId": "staff-123",
        "staffName": "Dr. Sarah Smith",
        "success": true,
        "webhookId": "webhook-456"
      },
      {
        "staffId": "staff-456",
        "staffName": "Nurse Johnson",
        "success": true,
        "webhookId": "webhook-789"
      }
    ]
  }
}
```

## Webhook Lifecycle

### 1. Initial Setup

When a webhook is set up for a staff member:

1. **Calendar Access Verification**: The system verifies access to the staff member's Google Calendar
2. **Webhook Creation**: A webhook is created with Google Calendar API
3. **Storage**: Webhook information is stored for future reference
4. **Verification**: The webhook is tested to ensure it's working correctly

### 2. Event Processing

When Google Calendar sends a webhook notification:

1. **Authentication**: The webhook signature is verified
2. **Event Retrieval**: Recent events are fetched from the calendar
3. **Appointment Matching**: Events are matched with existing appointments
4. **Synchronization**: Appointment data is updated based on calendar changes

### 3. Webhook Expiration

Google Calendar webhooks expire after 30 days. The system provides:

- **Expiration Warnings**: Alerts when webhooks are about to expire
- **Automatic Refresh**: Ability to renew webhooks before expiration
- **Manual Management**: Tools to manage webhook lifecycle

## Event Synchronization

### Outbound Sync (MediCare → Google Calendar)

When appointments are created or updated in the system:

1. **Event Creation**: Google Calendar events are created with proper formatting
2. **Staff-Specific Events**: Different event types for drivers vs. medical staff
3. **Rich Content**: Events include patient information, medical notes, and custom fields
4. **Attendee Management**: Staff members are added as attendees

### Inbound Sync (Google Calendar → MediCare)

When events are modified in Google Calendar:

1. **Event Detection**: Webhook notifications trigger event processing
2. **Appointment Matching**: Events are matched with existing appointments
3. **Data Extraction**: Relevant information is extracted from calendar events
4. **Appointment Updates**: Appointment data is updated accordingly

## Security Considerations

### Webhook Authentication

- **Secret Verification**: All webhook requests are verified using a shared secret
- **HTTPS Required**: Webhooks must be served over HTTPS in production
- **Request Validation**: Webhook payloads are validated before processing

### Access Control

- **Staff-Specific Webhooks**: Each staff member has their own webhook
- **Calendar Isolation**: Events are only processed for the specific staff member's calendar
- **Error Handling**: Failed webhook processing doesn't affect other operations

## Monitoring and Troubleshooting

### Webhook Status Monitoring

Use the webhook management API to monitor:

- **Connection Status**: Whether webhooks are active
- **Last Sync Time**: When the last synchronization occurred
- **Error Logs**: Any issues with webhook processing

### Common Issues

#### Webhook Not Receiving Notifications

1. **Check Webhook Status**: Verify the webhook is active
2. **Verify Calendar Access**: Ensure the system can access the staff calendar
3. **Check Webhook URL**: Confirm the webhook endpoint is accessible
4. **Review Logs**: Check server logs for webhook processing errors

#### Synchronization Issues

1. **Event Matching**: Verify appointment and event data match
2. **Time Zone Issues**: Ensure consistent timezone handling
3. **Data Format**: Check that event data is properly formatted
4. **API Limits**: Monitor Google Calendar API usage

#### Webhook Expiration

1. **Set up Monitoring**: Use expiration warnings to track webhook status
2. **Automated Refresh**: Implement automatic webhook renewal
3. **Manual Management**: Use the management API to refresh webhooks

### Logging

The webhook system provides comprehensive logging:

```javascript
// Webhook setup
console.log(`Webhook set up successfully for staff ${staffId}: ${webhookId}`);

// Event processing
console.log(`Processed ${events.length} events for staff ${staff.id}`);

// Error handling
console.error('Failed to create Google Calendar event for staff:', error);
```

## Best Practices

### 1. Webhook Management

- **Regular Monitoring**: Check webhook status weekly
- **Proactive Renewal**: Refresh webhooks before expiration
- **Error Handling**: Implement proper error handling and retry logic
- **Testing**: Regularly test webhook connectivity

### 2. Data Synchronization

- **Conflict Resolution**: Implement strategies for handling conflicting changes
- **Data Validation**: Validate data before synchronization
- **Audit Trail**: Maintain logs of synchronization activities
- **Backup Strategy**: Ensure data can be recovered if synchronization fails

### 3. Performance

- **Batch Processing**: Process multiple events efficiently
- **Rate Limiting**: Respect Google Calendar API limits
- **Caching**: Cache frequently accessed data
- **Async Processing**: Use asynchronous processing for webhook handling

### 4. Security

- **Secret Management**: Store webhook secrets securely
- **Access Control**: Limit access to webhook management functions
- **Input Validation**: Validate all webhook inputs
- **HTTPS Enforcement**: Ensure all webhook communications use HTTPS

## Testing

### Manual Testing

1. **Webhook Setup**: Test webhook creation for a staff member
2. **Event Creation**: Create an appointment and verify Google Calendar event
3. **Event Modification**: Modify the Google Calendar event and verify appointment update
4. **Webhook Removal**: Test webhook removal and cleanup

### Automated Testing

Run the test suite to verify webhook functionality:

```bash
npm test -- src/api/webhooks/calendar/route.test.ts
npm test -- src/services/webhookService.test.ts
```

## Support

For issues with webhook setup or synchronization:

1. **Check Documentation**: Review this guide and related documentation
2. **Monitor Logs**: Check server logs for error messages
3. **Test Connectivity**: Use the test endpoints to verify functionality
4. **Contact Support**: Reach out to the development team for assistance

## Future Enhancements

Planned improvements to the webhook system:

- **Database Storage**: Store webhook information in database tables
- **Automated Renewal**: Automatic webhook refresh before expiration
- **Enhanced Monitoring**: Real-time webhook status dashboard
- **Conflict Resolution**: Advanced conflict detection and resolution
- **Performance Optimization**: Improved event processing efficiency
