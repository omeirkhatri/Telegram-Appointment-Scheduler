import {
    getDailyAgendaJobStatus,
    toggleDailyAgendaJob,
    triggerDailyAgendaJob,
    updateDailyAgendaJobSchedule,
} from '@/jobs/dailyAgendaJob';
import type { DailyAgendaJobParameters } from '@/types/job';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/jobs/daily-agenda - Get daily agenda job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeExecutions = searchParams.get('includeExecutions') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

    const status = await getDailyAgendaJobStatus();

    // Get recent executions if requested
    let executions = undefined;
    if (includeExecutions) {
      const { jobSchedulerService } = await import('@/services/jobSchedulerService');
      executions = await jobSchedulerService.getJobExecutions(status.job.id, limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        executions,
      },
    });

  } catch (error) {
    console.error('Error fetching daily agenda job status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch daily agenda job status',
      },
      { status: 500 },
    );
  }
}

// POST /api/jobs/daily-agenda - Trigger daily agenda job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      staffId,
      testMode = false,
      forceSend = false,
    } = body;

    // Validate parameters
    const parameters: DailyAgendaJobParameters = {};

    if (date) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Date must be in YYYY-MM-DD format',
          },
          { status: 400 },
        );
      }
      parameters.date = date;
    }

    if (staffId) {
      parameters.staffId = staffId;
    }

    if (testMode) {
      parameters.testMode = testMode;
    }

    if (forceSend) {
      parameters.forceSend = forceSend;
    }

    console.log('🚀 Triggering daily agenda job', { parameters });

    const execution = await triggerDailyAgendaJob(parameters);

    return NextResponse.json({
      success: true,
      data: {
        executionId: execution.id,
        status: execution.status,
        startedAt: execution.startedAt,
        parameters,
      },
      message: 'Daily agenda job triggered successfully',
    });

  } catch (error) {
    console.error('Error triggering daily agenda job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger daily agenda job',
      },
      { status: 500 },
    );
  }
}

// PUT /api/jobs/daily-agenda - Update daily agenda job configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, cronExpression, enabled } = body;

    switch (action) {
      case 'update_schedule':
        if (!cronExpression) {
          return NextResponse.json(
            {
              success: false,
              error: 'cronExpression is required for update_schedule action',
            },
            { status: 400 },
          );
        }

        await updateDailyAgendaJobSchedule(cronExpression);
        return NextResponse.json({
          success: true,
          message: 'Daily agenda job schedule updated successfully',
          data: { cronExpression },
        });

      case 'toggle_enabled':
        if (typeof enabled !== 'boolean') {
          return NextResponse.json(
            {
              success: false,
              error: 'enabled must be a boolean for toggle_enabled action',
            },
            { status: 400 },
          );
        }

        await toggleDailyAgendaJob(enabled);
        return NextResponse.json({
          success: true,
          message: `Daily agenda job ${enabled ? 'enabled' : 'disabled'} successfully`,
          data: { enabled },
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: update_schedule, toggle_enabled',
          },
          { status: 400 },
        );
    }

  } catch (error) {
    console.error('Error updating daily agenda job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update daily agenda job',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/jobs/daily-agenda - Cancel running daily agenda job
export async function DELETE(_request: NextRequest) {
  try {
    const { jobSchedulerService } = await import('@/services/jobSchedulerService');

    // Get the daily agenda job
    const jobs = await jobSchedulerService.getAllJobs();
    const dailyAgendaJob = jobs.find(job => job.type === 'daily_agenda');

    if (!dailyAgendaJob) {
      return NextResponse.json(
        {
          success: false,
          error: 'Daily agenda job not found',
        },
        { status: 404 },
      );
    }

    // Stop any running execution
    try {
      await jobSchedulerService.stopJob(dailyAgendaJob.id);
    } catch (error) {
      // Job might not be running, which is fine
      console.log('No running execution to stop for daily agenda job');
    }

    return NextResponse.json({
      success: true,
      message: 'Daily agenda job execution cancelled successfully',
    });

  } catch (error) {
    console.error('Error cancelling daily agenda job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel daily agenda job',
      },
      { status: 500 },
    );
  }
}
