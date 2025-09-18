import { telegramValidationService } from '@/utils/telegramValidation';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Get stats for specific user
      const stats = telegramValidationService.getUserStats(userId);
      return NextResponse.json({
        success: true,
        data: {
          userId,
          ...stats
        }
      });
    } else {
      // Get overall stats (this would need to be implemented in the validation service)
      return NextResponse.json({
        success: true,
        data: {
          message: 'Overall monitoring stats not yet implemented',
          availableEndpoints: [
            'GET /api/telegram/monitoring?userId=<telegram_user_id> - Get user stats',
            'POST /api/telegram/monitoring/cleanup - Clean up old data'
          ]
        }
      });
    }
  } catch (error) {
    console.error('❌ Error getting monitoring data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get monitoring data',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'cleanup') {
      // Clean up old usage data
      telegramValidationService.cleanupOldData();

      return NextResponse.json({
        success: true,
        message: 'Old data cleaned up successfully'
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Supported actions: cleanup',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Error processing monitoring action:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process monitoring action',
      },
      { status: 500 }
    );
  }
}
