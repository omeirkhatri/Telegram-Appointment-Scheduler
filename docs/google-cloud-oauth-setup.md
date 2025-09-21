# Google Cloud OAuth Setup for Calendar Integration

This document outlines the steps required to set up Google Cloud OAuth credentials for the Google Calendar integration feature.

## Prerequisites

- Access to Google Cloud Console
- A Google Cloud Project (or create a new one)
- Admin permissions to configure OAuth consent screen

## Step 1: Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Library**
4. Search for "Google Calendar API"
5. Click on **Google Calendar API** and press **Enable**

## Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have Google Workspace)
3. Fill in the required fields:
   - **App name**: `Best DOC Appointment Scheduler`
   - **User support email**: Your admin email
   - **Developer contact information**: Your contact email
4. Add the following scopes:
   - `https://www.googleapis.com/auth/calendar` (Read/write access to calendars)
   - `https://www.googleapis.com/auth/calendar.events` (Read/write access to calendar events)
5. Add test users (for development) or publish the app (for production)

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Web application** as the application type
4. Configure the following:
   - **Name**: `Best DOC Calendar Integration`
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (for development)
     - `https://schedule.n8nbdoc.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/google-calendar/callback` (for development)
     - `https://schedule.n8nbdoc.com/api/google-calendar/callback` (for production)

## Step 4: Generate Encryption Key

Generate a secure encryption key for storing OAuth tokens:

```bash
# Generate a 32-byte encryption key (base64 encoded)
openssl rand -base64 32
```

## Step 5: Configure Environment Variables

The following environment variables need to be set:

```bash
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your-client-id-here
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret-here
GOOGLE_OAUTH_REDIRECT_URI=https://your-domain.com/api/google-calendar/callback
GOOGLE_OAUTH_ENCRYPTION_KEY=your-32-byte-encryption-key-here

# Feature Flag (optional, defaults to true)
GOOGLE_CALENDAR_SYNC_ENABLED=true
```

## Security Considerations

1. **Client Secret**: Store securely and never expose in client-side code
2. **Encryption Key**: Use a strong, randomly generated key
3. **Redirect URIs**: Only include trusted domains
4. **Scopes**: Only request necessary permissions
5. **Token Storage**: OAuth tokens are encrypted before database storage

## Testing

1. Verify OAuth flow works in development
2. Test token refresh mechanism
3. Validate calendar event creation/updates
4. Ensure proper error handling for expired tokens

## Production Deployment

1. Update redirect URIs to production domain
2. Publish OAuth consent screen
3. Configure proper CORS settings
4. Set up monitoring for OAuth failures
5. Implement proper secret rotation procedures

## Troubleshooting

### Common Issues

1. **Invalid redirect URI**: Ensure the redirect URI exactly matches what's configured in Google Cloud Console
2. **Access blocked**: Check if the OAuth consent screen is published and user is added to test users
3. **Scope errors**: Verify all required scopes are added to the OAuth consent screen
4. **Token refresh failures**: Check if the refresh token is being stored and used correctly

### Debug Steps

1. Check Google Cloud Console logs
2. Verify environment variables are set correctly
3. Test OAuth flow in incognito mode
4. Check application logs for detailed error messages

## Support

For issues related to Google Cloud OAuth setup, contact the DevOps team or refer to:
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
