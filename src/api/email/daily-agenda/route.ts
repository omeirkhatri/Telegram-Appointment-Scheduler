import { emailService } from '@/services/emailService';
import { staffAggregationService } from '@/services/staffAggregationService';
import { formatDubaiDate, getAgendaDate, isPastDailyAgendaTime } from '@/utils/timezone';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/email/daily-agenda - Generate and send daily agendas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, staffId, testMode = false } = body;

    // Validate request
    if (!date && !staffId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either date or staffId must be provided'
        },
        { status: 400 }
      );
    }

    // Check if SMTP is configured
    if (!emailService.validateEmailConfig()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email service is not configured. Please check SMTP settings.'
        },
        { status: 500 }
      );
    }

    let result;

    if (staffId) {
      // Generate agenda for specific staff member
      const agendaDate = date ? new Date(date) : getAgendaDate();
      result = await generateStaffAgenda(staffId, agendaDate, testMode);
    } else {
      // Generate agendas for all eligible staff
      const agendaDate = date ? new Date(date) : getAgendaDate();
      result = await staffAggregationService.generateDailyAgendas(agendaDate);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Daily agenda${staffId ? ' for staff member' : 's'} generated successfully`
    });

  } catch (error) {
    console.error('Error generating daily agenda:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate daily agenda'
      },
      { status: 500 }
    );
  }
}

// GET /api/email/daily-agenda - Get daily agenda status and statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const staffId = searchParams.get('staffId');

    const agendaDate = date ? new Date(date) : getAgendaDate();

    if (staffId) {
      // Get agenda for specific staff member
      const agendaData = await staffAggregationService.generateStaffAgenda(staffId, agendaDate);
      const preferences = await staffAggregationService.getStaffEmailPreferences(staffId);

      return NextResponse.json({
        success: true,
        data: {
          agenda: agendaData,
          preferences,
          date: formatDubaiDate(agendaDate),
        }
      });
    } else {
      // Get daily agenda statistics
      const stats = await staffAggregationService.getDailyAgendaStats(agendaDate);
      const isPastAgendaTime = isPastDailyAgendaTime();

      return NextResponse.json({
        success: true,
        data: {
          stats,
          date: formatDubaiDate(agendaDate),
          isPastAgendaTime,
          nextAgendaTime: isPastAgendaTime ? 'Tomorrow at 06:00' : 'Today at 06:00',
        }
      });
    }

  } catch (error) {
    console.error('Error fetching daily agenda data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch daily agenda data'
      },
      { status: 500 }
    );
  }
}

// PUT /api/email/daily-agenda - Update staff email preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, preferences } = body;

    if (!staffId || !preferences) {
      return NextResponse.json(
        {
          success: false,
          error: 'staffId and preferences are required'
        },
        { status: 400 }
      );
    }

    const updatedPreferences = await staffAggregationService.updateStaffEmailPreferences(
      staffId,
      preferences
    );

    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Staff email preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating staff preferences:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update staff preferences'
      },
      { status: 500 }
    );
  }
}

// Helper function to generate agenda for specific staff member
async function generateStaffAgenda(
  staffId: string,
  date: Date,
  testMode: boolean
): Promise<{
  success: boolean;
  agenda?: any;
  emailResult?: any;
  error?: string;
}> {
  try {
    // Generate agenda data
    const agendaData = await staffAggregationService.generateStaffAgenda(staffId, date);

    if (testMode) {
      // Return agenda data without sending email
      return {
        success: true,
        agenda: agendaData,
      };
    }

    // Send email
    const emailResult = await emailService.sendEmail({
      to: agendaData.staffEmail!,
      subject: agendaData.subject,
      html: agendaData.content, // This would be rendered HTML in real implementation
      from: 'MediCare Scheduler <noreply@medicare.com>',
    });

    return {
      success: true,
      agenda: agendaData,
      emailResult,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
