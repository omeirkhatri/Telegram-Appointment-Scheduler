import { emailService } from '@/services/emailService';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/email/test - Send test email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, template = 'agenda' } = body;

    if (!to) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email address is required',
        },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email address format',
        },
        { status: 400 },
      );
    }

    // Check if SMTP is configured
    if (!emailService.validateEmailConfig()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email service is not configured. Please check SMTP settings.',
        },
        { status: 500 },
      );
    }

    // Send test email
    const result = await emailService.sendTestEmail(to, template);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          messageId: result.messageId,
          to,
          template,
        },
        message: 'Test email sent successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test email',
        },
        { status: 500 },
      );
    }

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test email',
      },
      { status: 500 },
    );
  }
}

// GET /api/email/test - Get email service status
export async function GET() {
  try {
    const smtpStatus = emailService.getSMTPStatus();
    const connectionTest = await emailService.testSMTPConnection();

    return NextResponse.json({
      success: true,
      data: {
        smtp: smtpStatus,
        connection: connectionTest,
        configured: emailService.validateEmailConfig(),
      },
    });

  } catch (error) {
    console.error('Error checking email service status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check email service status',
      },
      { status: 500 },
    );
  }
}
