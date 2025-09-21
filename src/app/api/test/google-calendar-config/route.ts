import { NextResponse } from 'next/server';
import { config } from '@/lib/env';

export async function GET() {
  try {
    const googleCalendarStatus = config.googleCalendar.getConfigurationStatus();
    
    return NextResponse.json({
      success: true,
      status: googleCalendarStatus,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasClientId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        hasRedirectUri: !!process.env.GOOGLE_OAUTH_REDIRECT_URI,
        hasEncryptionKey: !!process.env.GOOGLE_OAUTH_ENCRYPTION_KEY,
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasClientId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        hasRedirectUri: !!process.env.GOOGLE_OAUTH_REDIRECT_URI,
        hasEncryptionKey: !!process.env.GOOGLE_OAUTH_ENCRYPTION_KEY,
      }
    }, { status: 500 });
  }
}
