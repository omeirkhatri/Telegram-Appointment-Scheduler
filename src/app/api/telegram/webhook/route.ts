import { config } from '@/lib/env';
import { telegramCommandService } from '@/services/telegramCommandService';
import { telegramService, TelegramWebhookUpdate } from '@/services/telegramService';
import { telegramCommandFormatters } from '@/utils/telegramCommandFormatters';
import { telegramValidationService } from '@/utils/telegramValidation';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

    // Verify webhook secret if configured
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    if (config.telegram.webhookSecret && !telegramService.verifyWebhookSecret(secretToken || '')) {
      console.warn('⚠️ Invalid webhook secret token');
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid secret token',
        },
        { status: 401 }
      );
    }

    const update: TelegramWebhookUpdate = await request.json();
    console.log('📱 Received Telegram webhook update:', update);

    // Validate webhook update structure
    const updateValidation = telegramValidationService.validateWebhookUpdate(update);
    if (!updateValidation.isValid) {
      console.error('❌ Invalid webhook update:', updateValidation.error);
      return NextResponse.json(
        {
          success: false,
          error: updateValidation.error,
        },
        { status: 400 }
      );
    }

    // Handle different types of updates
    if (update.message) {
      const messageValidation = telegramValidationService.validateMessage(update.message);
      if (!messageValidation.isValid) {
        console.error('❌ Invalid message structure:', messageValidation.error);
        return NextResponse.json(
          {
            success: false,
            error: messageValidation.error,
          },
          { status: 400 }
        );
      }
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error processing Telegram webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

async function handleMessage(message: any) {
  try {
    const chatId = message.chat.id;
    const text = message.text;
    const from = message.from;

    console.log(`📱 Received message from ${from.first_name} ${from.last_name || ''} (${from.id}): ${text}`);

    // Log user information for easy reference
    console.log(`📋 User Info - ID: ${from.id}, Name: ${from.first_name} ${from.last_name || ''}, Username: @${from.username || 'N/A'}`);

    // Handle different commands
    if (text === '/start') {
      await handleStartCommand(chatId, from);
    } else if (text === '/help') {
      await handleHelpCommand(chatId);
    } else if (text === '/info') {
      await handleInfoCommand(chatId, from);
    } else if (text === '/status') {
      await handleStatusCommand(chatId, from);
    } else if (text === '/today') {
      await handleTodayCommand(chatId, from);
    } else if (text === '/tomorrow') {
      await handleTomorrowCommand(chatId, from);
    } else if (text === '/week') {
      await handleWeekCommand(chatId, from);
    } else {
      // Handle unknown commands
      await handleUnknownCommand(chatId);
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
  }
}

async function handleCallbackQuery(callbackQuery: any) {
  try {
    const chatId = callbackQuery.message?.chat?.id;
    const data = callbackQuery.data;
    const from = callbackQuery.from;

    console.log(`📱 Received callback query from ${from.first_name} ${from.last_name || ''} (${from.id}): ${data}`);

    // Handle different callback data
    if (data === 'get_help') {
      await handleHelpCommand(chatId);
    } else if (data === 'get_info') {
      await handleInfoCommand(chatId, from);
    } else if (data === 'get_status') {
      await handleStatusCommand(chatId, from);
    } else if (data === 'get_today') {
      await handleTodayCommand(chatId, from);
    } else if (data === 'get_tomorrow') {
      await handleTomorrowCommand(chatId, from);
    } else if (data === 'get_week') {
      await handleWeekCommand(chatId, from);
    }
  } catch (error) {
    console.error('❌ Error handling callback query:', error);
  }
}

async function handleStartCommand(chatId: number, from: any) {
  const message = `👋 Hello ${from.first_name}!\n\n` +
    `Welcome to the Best DOC Scheduler Telegram bot.\n\n` +
    `This bot will send you appointment notifications and daily agendas.\n\n` +
    `📋 <b>Your Telegram Information:</b>\n` +
    `🆔 <b>User ID:</b> <code>${from.id}</code>\n` +
    `👤 <b>Name:</b> ${from.first_name} ${from.last_name || ''}\n` +
    `📛 <b>Username:</b> @${from.username || 'Not set'}\n` +
    `🌐 <b>Language:</b> ${from.language_code || 'Not set'}\n\n` +
    `💡 <b>To receive notifications:</b>\n` +
    `1. Copy your User ID: <code>${from.id}</code>\n` +
    `2. Send it to your administrator\n` +
    `3. They will add it to your staff profile\n\n` +
    `Use /help to see available commands.`;

  await telegramService.sendMessage({
    chat_id: chatId.toString(),
    text: message,
    parse_mode: 'HTML',
  });
}

async function handleInfoCommand(chatId: number, from: any) {
  const message = telegramCommandFormatters.formatInfoMessage(from);

  await telegramService.sendMessage({
    chat_id: chatId.toString(),
    text: message,
    parse_mode: 'HTML',
  });
}

async function handleHelpCommand(chatId: number) {
  try {
    const message = telegramCommandFormatters.formatHelpMessage();

    await telegramService.sendMessage({
      chat_id: chatId.toString(),
      text: message,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('❌ Error sending help message:', error);
    // For testing purposes, just log the message instead of sending
    console.log('📋 Help message that would be sent:');
    console.log(telegramCommandFormatters.formatHelpMessage());
  }
}

async function handleStatusCommand(chatId: number, from: any) {
  try {
    const result = await telegramCommandService.handleStatusCommand(from.id.toString());

    await telegramService.sendMessage({
      chat_id: chatId.toString(),
      text: result.message,
      parse_mode: 'HTML',
    });

    // Log command usage for monitoring
    if (!result.success) {
      console.warn(`⚠️ Status command failed for user ${from.id}: ${result.errorCode} - ${result.errorDetails || 'No details'}`);
    }
  } catch (error) {
    console.error('❌ Error handling status command:', error);

    await telegramService.sendMessage({
      chat_id: chatId.toString(),
      text: '❌ Error retrieving status. Please try again later.',
      parse_mode: 'HTML',
    });
  }
}

async function handleTodayCommand(chatId: number, from: any) {
  try {
    const result = await telegramCommandService.handleTodayCommand(from.id.toString());

    await telegramService.sendMessage({
      chat_id: chatId.toString(),
      text: result.message,
      parse_mode: 'HTML',
    });

    // Log command usage for monitoring
    if (!result.success) {
      console.warn(`⚠️ Today command failed for user ${from.id}: ${result.errorCode} - ${result.errorDetails || 'No details'}`);
    }
  } catch (error) {
    console.error('❌ Error handling today command:', error);

    await telegramService.sendMessage({
      chat_id: chatId.toString(),
      text: '❌ Error retrieving today\'s schedule. Please try again later.',
      parse_mode: 'HTML',
    });
  }
}

async function handleTomorrowCommand(chatId: number, from: any) {
  try {
    const result = await telegramCommandService.handleTomorrowCommand(from.id.toString());

    await telegramService.sendMessage({
      chat_id: chatId.toString(),
      text: result.message,
      parse_mode: 'HTML',
    });

    // Log command usage for monitoring
    if (!result.success) {
      console.warn(`⚠️ Tomorrow command failed for user ${from.id}: ${result.errorCode} - ${result.errorDetails || 'No details'}`);
    }
  } catch (error) {
    console.error('❌ Error handling tomorrow command:', error);

    await telegramService.sendMessage({
      chat_id: chatId.toString(),
      text: '❌ Error retrieving tomorrow\'s schedule. Please try again later.',
      parse_mode: 'HTML',
    });
  }
}

async function handleWeekCommand(chatId: number, from: any) {
  try {
    const result = await telegramCommandService.handleWeekCommand(from.id.toString());

    await telegramService.sendMessage({
      chat_id: chatId.toString(),
      text: result.message,
      parse_mode: 'HTML',
    });

    // Log command usage for monitoring
    if (!result.success) {
      console.warn(`⚠️ Week command failed for user ${from.id}: ${result.errorCode} - ${result.errorDetails || 'No details'}`);
    }
  } catch (error) {
    console.error('❌ Error handling week command:', error);

    await telegramService.sendMessage({
      chat_id: chatId.toString(),
      text: '❌ Error retrieving week\'s schedule. Please try again later.',
      parse_mode: 'HTML',
    });
  }
}

async function handleUnknownCommand(chatId: number) {
  const message = `❓ Unknown command.\n\n` +
    `Use /help to see available commands.`;

  await telegramService.sendMessage({
    chat_id: chatId.toString(),
    text: message,
    parse_mode: 'HTML',
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
