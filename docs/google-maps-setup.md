# Google Maps API Setup Guide

This guide explains how to set up Google Maps API integration for the appointment scheduler application.

## Prerequisites

- Google Cloud Platform account
- Billing enabled on your Google Cloud project
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID for later use

## Step 2: Enable Required APIs

Enable the following APIs in your Google Cloud project:

1. **Maps JavaScript API** - For displaying interactive maps  -
2. **Geocoding API** - For converting addresses to coordinates
3. **Places API** (optional) - For address autocomplete functionality

### To enable APIs:
1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for each API by name
3. Click on the API and press "Enable"

## Step 3: Create API Key

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. Click "Restrict Key" to configure security settings

## Step 4: Configure API Key Restrictions

### For Development (.env.local):
- **Application restrictions**: HTTP referrers
- **Website restrictions**: Add `http://localhost:3000/*`
- **API restrictions**: Select only the APIs you enabled

### For Production (.env.production):
- **Application restrictions**: HTTP referrers
- **Website restrictions**: Add your production domain `https://your-domain.com/*`
- **API restrictions**: Select only the APIs you enabled

## Step 5: Set Up Environment Variables

### For Local Development (.env.local):
```bash
# Copy the production template
cp env.production.template .env.local

# Edit .env.local and add your API key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-api-key-here
```

### For Production (.env.production):
```bash
# Copy the production template
cp env.production.template .env.production

# Edit .env.production and add your API key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-api-key-here
```

## Step 6: Verify Setup

1. Start your development server: `npm run dev`
2. Navigate to the map view in your application
3. Check browser console for any API key errors
4. Verify that maps load correctly

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use different API keys for development and production**
3. **Set up proper API restrictions**
4. **Monitor API usage and set up billing alerts**
5. **Rotate API keys regularly**

## Troubleshooting

### Common Issues:

1. **"This page can't load Google Maps correctly"**
   - Check if API key is correctly set in environment variables
   - Verify API restrictions allow your domain
   - Ensure required APIs are enabled

2. **"Geocoding API not enabled"**
   - Enable Geocoding API in Google Cloud Console
   - Add Geocoding API to your API key restrictions

3. **"Quota exceeded"**
   - Check your billing account
   - Review API usage in Google Cloud Console
   - Consider implementing caching to reduce API calls

## Cost Management

- Google Maps API has usage-based pricing
- Set up billing alerts to monitor costs
- Consider implementing caching to reduce API calls
- Review pricing at [Google Maps Platform Pricing](https://cloud.google.com/maps-platform/pricing)

## Support

For additional help:
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Google Cloud Support](https://cloud.google.com/support)
