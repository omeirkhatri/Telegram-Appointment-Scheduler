import { config } from '@/lib/env';
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
    const { action, webhook_url } = body;

    if (action === 'set_webhook') {
      if (!webhook_url) {
        return NextResponse.json(
          {
            success: false,
            error: 'webhook_url is required for setting webhook',
          },
          { status: 400 }
        );
      }

      const result = await telegramService.setWebhook(
        webhook_url,
        config.telegram.webhookSecret
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Webhook set successfully',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 500 }
        );
      }
    } else if (action === 'delete_webhook') {
      const result = await telegramService.deleteWebhook();

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Webhook deleted successfully',
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 500 }
        );
      }
    } else if (action === 'get_info') {
      const botInfo = await telegramService.getBotInfo();
      const webhookInfo = await telegramService.getWebhookInfo();

      if (botInfo.success) {
        return NextResponse.json({
          success: true,
          bot: botInfo.bot,
          webhook: webhookInfo.webhook,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: botInfo.error,
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use: set_webhook, delete_webhook, or get_info',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Error in Telegram setup API:', error);
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

    // Get bot and webhook information
    const botInfo = await telegramService.getBotInfo();
    const webhookInfo = await telegramService.getWebhookInfo();

    if (!botInfo.success) {
      return NextResponse.json(
        {
          success: false,
          error: botInfo.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bot: botInfo.bot,
      webhook: webhookInfo.webhook,
      configured: true,
    });
  } catch (error) {
    console.error('❌ Error getting Telegram setup info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
