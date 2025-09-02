# Google Calendar API Setup Guide

This guide will help you set up Google Calendar API v3 authentication for the MediCare Scheduler application.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with the Google Calendar API enabled
3. Access to create service accounts and API keys

## Setup Options

The application supports two authentication methods:

### Option 1: Service Account Authentication (Recommended)

This method provides full read/write access to calendars and is suitable for server-side operations.

#### Step 1: Enable Google Calendar API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "APIs & Services" > "Library"
4. Search for "Google Calendar API"
5. Click on it and press "Enable"

#### Step 2: Create a Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - **Name**: `medicare-scheduler-calendar`
   - **Description**: `Service account for MediCare Scheduler calendar integration`
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

#### Step 3: Generate Service Account Key

1. Click on the created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose "JSON" format
5. Download the JSON file (keep it secure!)

#### Step 4: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_PROJECT_ID=your-project-id
```

**Important Notes:**
- Replace `your-service-account@project.iam.gserviceaccount.com` with the email from your service account JSON
- Replace `Your private key here` with the actual private key from the JSON file
- Replace `your-project-id` with your GCP project ID
- The private key should include the `\n` characters as shown

### Option 2: API Key Authentication (Read-only)

This method is simpler but provides limited access (read-only operations).

#### Step 1: Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key

#### Step 2: Configure Environment Variable

Add to your `.env.local` file:

```env
GOOGLE_CALENDAR_API_KEY=your-api-key-here
```

#### Step 3: Restrict API Key (Recommended)

1. Click on the created API key
2. Under "Application restrictions", select "HTTP referrers" and add your domain
3. Under "API restrictions", select "Restrict key" and choose "Google Calendar API"

## Calendar Access Setup

### For Service Account Authentication

The service account needs access to the calendars it will manage:

1. **For individual user calendars**: The calendar owner must share their calendar with the service account email
2. **For shared calendars**: Add the service account email as a calendar member with appropriate permissions

### For API Key Authentication

The API key can only access public calendars or calendars that have been explicitly shared with the service account.

## Testing the Setup

### Test Service Account Authentication

```typescript
import { googleCalendarAuth } from '@/lib/googleCalendarAuth';

// Test authentication
try {
  await googleCalendarAuth.initializeServiceAccount();
  console.log('Service account authentication successful');

  // Test calendar access
  const hasAccess = await googleCalendarAuth.testCalendarAccess('primary');
  console.log('Calendar access:', hasAccess);
} catch (error) {
  console.error('Authentication failed:', error);
}
```

### Test API Key Authentication

```typescript
import { googleCalendarAuth } from '@/lib/googleCalendarAuth';

// Test authentication
try {
  googleCalendarAuth.initializeApiKey();
  console.log('API key authentication successful');
} catch (error) {
  console.error('Authentication failed:', error);
}
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL` | For service account | Service account email address |
| `GOOGLE_CALENDAR_PRIVATE_KEY` | For service account | Service account private key |
| `GOOGLE_CALENDAR_PROJECT_ID` | For service account | GCP project ID |
| `GOOGLE_CALENDAR_API_KEY` | For API key | Google Calendar API key |

## Security Best Practices

1. **Never commit credentials to version control**
2. **Use environment variables for all credentials**
3. **Restrict API keys to specific domains and APIs**
4. **Use service accounts with minimal required permissions**
5. **Regularly rotate credentials**
6. **Monitor API usage in Google Cloud Console**

## Troubleshooting

### Common Issues

1. **"Invalid private key" error**
   - Ensure the private key includes the `\n` characters
   - Check that the key is properly formatted

2. **"Calendar not found" error**
   - Verify the calendar ID is correct
   - Ensure the service account has access to the calendar
   - Check calendar sharing permissions

3. **"API key not valid" error**
   - Verify the API key is correct
   - Check if the API key has the necessary restrictions
   - Ensure Google Calendar API is enabled

4. **"Insufficient permissions" error**
   - Check service account permissions
   - Verify calendar sharing settings
   - Ensure the service account has the required scopes

### Getting Help

If you encounter issues:

1. Check the Google Cloud Console for API usage and errors
2. Verify all environment variables are set correctly
3. Test authentication using the provided test code
4. Check the application logs for detailed error messages

## Next Steps

After setting up authentication:

1. Configure staff members with their Google Calendar IDs
2. Test calendar event creation and synchronization
3. Set up webhooks for real-time updates (if needed)
4. Monitor the integration for any issues
