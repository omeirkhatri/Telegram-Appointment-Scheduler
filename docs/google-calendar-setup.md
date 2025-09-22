# Google Calendar Service Account Setup Guide

This guide explains how to set up Google Calendar integration using a service account for the BestDOC appointment scheduler system.

## Overview

The Google Calendar integration uses a service account approach instead of OAuth, which provides:
- Centralized control over all calendar operations
- No user authentication required
- Consistent calendar management across all staff members
- Simplified deployment and maintenance

## Prerequisites

- Google Cloud Platform account
- Google Workspace account (for calendar sharing)
- Access to Google Cloud Console
- Administrative access to the application server

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `BestDOC Calendar Integration`
4. Select your organization (if applicable)
5. Click "Create"

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, navigate to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on "Google Calendar API"
4. Click "Enable"

## Step 3: Create a Service Account

1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in the service account details:
   - **Name**: `bestdoc-calendar-service`
   - **Description**: `Service account for BestDOC calendar integration`
4. Click "Create and Continue"
5. Skip the "Grant access" step for now (we'll handle permissions later)
6. Click "Done"

## Step 4: Generate Service Account Key

1. In the "Credentials" page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" → "Create new key"
5. Select "JSON" format
6. Click "Create"
7. The JSON key file will be downloaded automatically

## Step 5: Configure Service Account Permissions

### 5.1 Google Cloud IAM Permissions

1. Go to "IAM & Admin" → "IAM"
2. Find your service account in the list
3. Click the edit (pencil) icon
4. Add the following roles:
   - **Calendar API Editor** (for calendar management)
   - **Service Account User** (for authentication)

### 5.2 Google Calendar Domain-Wide Delegation (Optional)

If you want the service account to act on behalf of users in your domain:

1. In the service account details, go to "Advanced settings"
2. Check "Enable Google Workspace Domain-wide Delegation"
3. Note the "Client ID" (you'll need this for domain-wide delegation)
4. In Google Workspace Admin Console, go to "Security" → "API Controls"
5. Add the Client ID with the following scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

## Step 6: Configure Calendar Sharing

### 6.1 Create a Master Calendar (Recommended)

1. In Google Calendar, create a new calendar:
   - **Name**: `BestDOC Staff Calendars`
   - **Description**: `Master calendar for managing staff calendars`
2. Share this calendar with your service account email:
   - **Permission**: "Make changes to events"
   - **Access**: "See all event details"

### 6.2 Set Up Calendar Sharing Permissions

For each staff member's calendar, ensure:
1. The service account has "Make changes to events" permission
2. The staff member has "See all event details" permission
3. The calendar is visible to the service account

## Step 7: Configure Environment Variables

### 7.1 Convert Service Account Key to Base64

```bash
# Convert the JSON key file to base64
cat path/to/service-account-key.json | base64 -w 0
```

### 7.2 Update Environment Configuration

Add the following variables to your `.env` file:

```env
# Google Calendar Service Account Configuration
GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY=your-base64-encoded-service-account-json-here
GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CALENDAR_API_ENABLED=true
GOOGLE_CALENDAR_VERIFICATION_ENABLED=true
GOOGLE_CALENDAR_ORGANIZATION_NAME=BestDOC
GOOGLE_CALENDAR_DEFAULT_TIMEZONE=Asia/Dubai
GOOGLE_CALENDAR_MAX_RETRIES=3
GOOGLE_CALENDAR_RETRY_DELAY_MS=1000
GOOGLE_CALENDAR_OPERATION_TIMEOUT_MS=30000
GOOGLE_CALENDAR_EMAIL_FROM=noreply@bestdoc.com
GOOGLE_CALENDAR_EMAIL_FROM_NAME=BestDOC Scheduler
```

## Step 8: Test the Configuration

### 8.1 Verify Service Account Access

```bash
# Test the service account authentication
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://www.googleapis.com/calendar/v3/users/me/calendarList"
```

### 8.2 Test Calendar Creation

Use the application's calendar verification endpoint to test:
- Service account authentication
- Calendar creation
- Calendar sharing
- Event creation

## Step 9: Security Considerations

### 9.1 Service Account Key Security

- **Never commit the JSON key file to version control**
- Store the base64-encoded key in environment variables only
- Rotate the service account key regularly
- Use least-privilege access principles

### 9.2 Network Security

- Restrict API access to specific IP addresses if possible
- Use HTTPS for all API communications
- Monitor API usage for unusual patterns

### 9.3 Calendar Permissions

- Regularly audit calendar sharing permissions
- Remove access for staff members who no longer need it
- Monitor calendar access logs

## Step 10: Monitoring and Maintenance

### 10.1 API Quota Monitoring

- Monitor Google Calendar API usage in the Cloud Console
- Set up alerts for quota approaching limits
- Implement rate limiting in the application

### 10.2 Error Handling

- Monitor application logs for calendar-related errors
- Set up alerts for critical calendar operations
- Implement retry logic for transient failures

### 10.3 Regular Maintenance

- Rotate service account keys quarterly
- Review and update calendar permissions monthly
- Monitor API usage and optimize as needed

## Troubleshooting

### Common Issues

#### Authentication Failed
- **Cause**: Invalid service account key or email
- **Solution**: Verify the base64-encoded key and email address

#### Insufficient Permissions
- **Cause**: Service account lacks required permissions
- **Solution**: Add the necessary IAM roles and calendar permissions

#### Calendar Not Found
- **Cause**: Calendar doesn't exist or isn't shared with service account
- **Solution**: Create the calendar or update sharing permissions

#### API Quota Exceeded
- **Cause**: Too many API requests in a short time
- **Solution**: Implement rate limiting and retry logic

### Debug Commands

```bash
# Check service account authentication
gcloud auth activate-service-account --key-file=path/to/service-account-key.json

# List available calendars
gcloud calendar list

# Test calendar access
gcloud calendar events list --calendar=calendar-id
```

## Required Permissions Summary

### Google Cloud IAM Roles
- `roles/calendar.admin` - Full calendar management
- `roles/serviceusage.serviceUsageConsumer` - API usage

### Google Calendar Scopes
- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/calendar.events` - Event management

### Calendar Sharing Permissions
- **Service Account**: "Make changes to events"
- **Staff Members**: "See all event details"

## Support and Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Cloud IAM Documentation](https://cloud.google.com/iam/docs)
- [Service Account Authentication](https://cloud.google.com/docs/authentication/service-accounts)
- [Calendar API Quotas](https://developers.google.com/calendar/api/limits)

## Changelog

- **v1.0** - Initial setup guide for service account integration
- **v1.1** - Added security considerations and monitoring
- **v1.2** - Updated for BestDOC-specific configuration
