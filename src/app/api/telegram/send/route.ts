import { config } from '@/lib/env';
import { staffService } from '@/services/staffService';
import { telegramNotificationService } from '@/services/telegramNotificationService';
import { telegramService } from '@/services/telegramService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check if Telegram is configured
    if (!config.telegram.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Telegram bot is not configured. Please set TELEGRAM_BOT_TOKEN environment variable.',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { staff_id, message_type, appointment_id, test_message } = body;

    // Validate required fields
    if (!staff_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'staff_id is required',
        },
        { status: 400 }
      );
    }

    // Get staff member
    const staff = await staffService.getStaffMember(staff_id);
    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          error: 'Staff member not found',
        },
        { status: 404 }
      );
    }

    if (!staff.telegram_user_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Staff member does not have a Telegram user ID',
        },
        { status: 400 }
      );
    }

    let result;

    if (test_message) {
      // Send test message
      result = await telegramNotificationService.sendTestMessage(
        staff.telegram_user_id,
        `${staff.first_name} ${staff.last_name}`
      );
    } else if (message_type === 'appointment' && appointment_id) {
      // Send appointment notification
      // This would require fetching the appointment data
      // For now, return an error as this should be handled by the appointment creation/update flow
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment notifications should be sent through the appointment API endpoints',
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid message_type or missing appointment_id',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error) {
    console.error('❌ Error in Telegram send API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check if Telegram is configured
    if (!config.telegram.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Telegram bot is not configured',
        },
        { status: 400 }
      );
    }

    // Get bot information
    const botInfo = await telegramService.getBotInfo();

    if (!botInfo.success) {
      return NextResponse.json(
        {
          success: false,
          error: botInfo.error,
        },
        { status: 500 }
      );
    }

    // Get webhook info
    const webhookInfo = await telegramService.getWebhookInfo();

    return NextResponse.json({
      success: true,
      bot: botInfo.bot,
      webhook: webhookInfo.webhook,
      configured: true,
    });
  } catch (error) {
    console.error('❌ Error getting Telegram bot info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
