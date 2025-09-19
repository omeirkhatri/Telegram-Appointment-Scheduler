import { run30MinReminders } from '@/jobs/simple30MinReminderJob';
import { NextRequest, NextResponse } from 'next/server';

/**
 * SIMPLE API to test 30-minute reminders
 * Just call this endpoint to trigger reminders immediately
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔔 API: Testing 30-minute reminders...');

    // Run the simple reminder job
    await run30MinReminders();

    return NextResponse.json({
      success: true,
      message: '30-minute reminder test completed! Check the console logs for details.',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ API Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Same as GET for simplicity
  return GET(request);
}
