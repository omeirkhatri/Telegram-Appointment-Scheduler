import { jobSchedulerService } from '@/services/jobSchedulerService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/jobs - Get all jobs and scheduler status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeExecutions = searchParams.get('includeExecutions') === 'true';

    // Get all jobs
    const jobs = await jobSchedulerService.getAllJobs();

    // Get scheduler status
    const isRunning = jobSchedulerService.isRunning();

    // Get overall statistics if requested
    let stats = null;
    if (includeStats) {
      stats = await jobSchedulerService.getAllJobStats();
    }

    // Get job executions if requested
    const jobExecutions: Record<string, any[]> = {};
    if (includeExecutions) {
      for (const job of jobs) {
        jobExecutions[job.id] = await jobSchedulerService.getJobExecutions(job.id, 10);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        scheduler: {
          isRunning,
          totalJobs: jobs.length,
          enabledJobs: jobs.filter(job => job.enabled).length,
        },
        stats,
        executions: includeExecutions ? jobExecutions : undefined,
      },
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch jobs',
      },
      { status: 500 },
    );
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, cronExpression, timezone, priority, enabled, maxRetries, retryDelay, timeout, handler, parameters } = body;

    // Validate required fields
    if (!name || !cronExpression || !handler) {
      return NextResponse.json(
        {
          success: false,
          error: 'name, cronExpression, and handler are required',
        },
        { status: 400 },
      );
    }

    // Create job definition
    const jobDefinition = {
      name,
      description: description || '',
      type: type || 'custom',
      cronExpression,
      timezone: timezone || 'Asia/Dubai',
      priority: priority || 'medium',
      enabled: enabled !== false,
      maxRetries: maxRetries || 3,
      retryDelay: retryDelay || 5000,
      timeout: timeout || 300000,
      handler,
      parameters: parameters || {},
    };

    // Add the job
    const job = await jobSchedulerService.addJob(jobDefinition);

    return NextResponse.json({
      success: true,
      data: job,
      message: 'Job created successfully',
    });

  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create job',
      },
      { status: 500 },
    );
  }
}

// PUT /api/jobs - Update scheduler control
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobId, updates } = body;

    switch (action) {
      case 'start_scheduler':
        await jobSchedulerService.startScheduler();
        return NextResponse.json({
          success: true,
          message: 'Scheduler started successfully',
        });

      case 'stop_scheduler':
        await jobSchedulerService.stopScheduler();
        return NextResponse.json({
          success: true,
          message: 'Scheduler stopped successfully',
        });

      case 'update_job':
        if (!jobId || !updates) {
          return NextResponse.json(
            {
              success: false,
              error: 'jobId and updates are required for update_job action',
            },
            { status: 400 },
          );
        }

        const updatedJob = await jobSchedulerService.updateJob(jobId, updates);
        return NextResponse.json({
          success: true,
          data: updatedJob,
          message: 'Job updated successfully',
        });

      case 'remove_job':
        if (!jobId) {
          return NextResponse.json(
            {
              success: false,
              error: 'jobId is required for remove_job action',
            },
            { status: 400 },
          );
        }

        await jobSchedulerService.removeJob(jobId);
        return NextResponse.json({
          success: true,
          message: 'Job removed successfully',
        });

      case 'trigger_job':
        if (!jobId) {
          return NextResponse.json(
            {
              success: false,
              error: 'jobId is required for trigger_job action',
            },
            { status: 400 },
          );
        }

        const execution = await jobSchedulerService.triggerJob(jobId, updates?.parameters || {});
        return NextResponse.json({
          success: true,
          data: execution,
          message: 'Job triggered successfully',
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: start_scheduler, stop_scheduler, update_job, remove_job, trigger_job',
          },
          { status: 400 },
        );
    }

  } catch (error) {
    console.error('Error updating scheduler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update scheduler',
      },
      { status: 500 },
    );
  }
}
