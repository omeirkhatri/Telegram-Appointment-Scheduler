import { triggerTelegramReminderJob } from '@/jobs/telegramReminderJob';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/telegram/reminders - Get reminder job status
export async function GET(request: NextRequest) {
  try {
    const { getTelegramReminderJobStatus } = await import('@/jobs/telegramReminderJob');

    const status = await getTelegramReminderJobStatus();

    return NextResponse.json({
      success: true,
      data: {
        job: status.job,
        stats: status.stats,
        lastExecution: status.lastExecution,
      },
    });

  } catch (error) {
    console.error('Error fetching reminder job status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reminder job status',
      },
      { status: 500 },
    );
  }
}

// POST /api/telegram/reminders - Manually trigger 1-hour reminders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      testMode = false,
      forceSend = false,
      timeWindow = 15,
      appointmentId = null,
      staffId = null
    } = body;

    // Validate parameters
    if (timeWindow < 1 || timeWindow > 60) {
      return NextResponse.json(
        {
          success: false,
          error: 'timeWindow must be between 1 and 60 minutes',
        },
        { status: 400 },
      );
    }

    // Prepare trigger parameters
    const parameters = {
      testMode: Boolean(testMode),
      forceSend: Boolean(forceSend),
      timeWindow: Number(timeWindow),
      ...(appointmentId && { appointmentId: String(appointmentId) }),
      ...(staffId && { staffId: String(staffId) }),
    };

    console.log('🚀 Manually triggering 1-hour reminder job with parameters:', parameters);

    // Trigger the reminder job
    const execution = await triggerTelegramReminderJob(parameters);

    return NextResponse.json({
      success: true,
      data: {
        executionId: execution.id,
        status: execution.status,
        startedAt: execution.startedAt,
        parameters,
      },
      message: '1-hour reminder job triggered successfully',
    });

  } catch (error) {
    console.error('Error triggering reminder job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger reminder job',
      },
      { status: 500 },
    );
  }
}

// PUT /api/telegram/reminders - Update reminder job configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, updates } = body;

    if (action !== 'update_config') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Only "update_config" is supported',
        },
        { status: 400 },
      );
    }

    // Get the job scheduler service
    const { jobSchedulerService } = await import('@/services/jobSchedulerService');

    // Find the Telegram reminder job
    const allJobs = await jobSchedulerService.getAllJobs();
    const reminderJob = allJobs.find(job => job.handler === 'telegram_reminder');

    if (!reminderJob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Telegram reminder job not found',
        },
        { status: 404 },
      );
    }

    // Update the job with new configuration
    const updatedJob = await jobSchedulerService.updateJob(reminderJob.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: 'Reminder job configuration updated successfully',
    });

  } catch (error) {
    console.error('Error updating reminder job configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update reminder job configuration',
      },
      { status: 500 },
    );
  }
}
