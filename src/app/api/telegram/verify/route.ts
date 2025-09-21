import { config } from '@/lib/env';
import { staffService } from '@/services/staffService';
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
    const { staff_id } = body;

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
          error: 'Staff member does not have a Telegram user ID. Please add a Telegram User ID first, then try verification again.',
        },
        { status: 400 }
      );
    }

    // Send verification message
    const verificationMessage = `🔐 <b>Telegram Verification</b>\n\n` +
      `Hello ${staff.first_name} ${staff.last_name}!\n\n` +
      `This is a verification message from BD Appointment Bot. ` +
      `Your Telegram account has been successfully verified for receiving appointment notifications.\n\n` +
      `You will now receive:\n` +
      `• Appointment reminders\n` +
      `• Schedule updates\n` +
      `• Daily agenda messages\n\n` +
      `Thank you for using our service!`;

    const result = await telegramService.sendMessage({
      chat_id: staff.telegram_user_id,
      text: verificationMessage,
      parse_mode: 'HTML',
    });

    if (result.success) {
      try {
        // Update staff verification status in database
        await staffService.updateStaff(staff_id, {
          telegram_verified: true,
        });

        console.log(`✅ Successfully verified Telegram for staff ${staff_id}`);

        return NextResponse.json({
          success: true,
          message: 'Verification message sent successfully',
          messageId: result.messageId,
        });
      } catch (updateError) {
        console.error('❌ Error updating staff verification status:', updateError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to update verification status in database',
          },
          { status: 500 }
        );
      }
    } else {
      console.error('❌ Telegram message sending failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send verification message',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Error in Telegram verification API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
