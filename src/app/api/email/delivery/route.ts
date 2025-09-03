import { emailDeliveryService } from '@/services/emailDeliveryService';
import type { EmailDeliveryFilters } from '@/types/email';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/email/delivery - Get delivery logs and statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'logs';
    const limit = parseInt(searchParams.get('limit') || '100');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');
    const emailType = searchParams.get('emailType');
    const priority = searchParams.get('priority');
    const staffId = searchParams.get('staffId');
    const hasErrors = searchParams.get('hasErrors') === 'true';
    const needsRetry = searchParams.get('needsRetry') === 'true';

    const filters: EmailDeliveryFilters = {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: status ? status.split(',') : undefined,
      emailType: emailType ? emailType.split(',') : undefined,
      priority: priority ? priority.split(',') : undefined,
      staffId: staffId || undefined,
      hasErrors,
      needsRetry,
    };

    switch (action) {
      case 'statistics':
        const statistics = await emailDeliveryService.getDeliveryStatistics(filters);
        return NextResponse.json({
          success: true,
          data: statistics,
        });

      case 'failed':
        const failedDeliveries = await emailDeliveryService.getFailedDeliveriesForRetry();
        return NextResponse.json({
          success: true,
          data: failedDeliveries,
        });

      case 'logs':
      default:
        const logs = await emailDeliveryService.getDeliveryLogs(filters, limit);
        return NextResponse.json({
          success: true,
          data: logs,
          count: logs.length,
        });
    }

  } catch (error) {
    console.error('Error fetching delivery data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delivery data',
      },
      { status: 500 },
    );
  }
}

// POST /api/email/delivery - Retry failed deliveries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, logId } = body;

    switch (action) {
      case 'retry_single':
        if (!logId) {
          return NextResponse.json(
            {
              success: false,
              error: 'logId is required for retry_single action',
            },
            { status: 400 },
          );
        }

        const retriedLog = await emailDeliveryService.retryFailedDelivery(logId);
        return NextResponse.json({
          success: true,
          data: retriedLog,
          message: 'Delivery retry scheduled successfully',
        });

      case 'retry_all':
        const retryResult = await emailDeliveryService.retryAllFailedDeliveries();
        return NextResponse.json({
          success: true,
          data: retryResult,
          message: `Retry operation completed: ${retryResult.success} successful, ${retryResult.failed} failed`,
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: retry_single, retry_all',
          },
          { status: 400 },
        );
    }

  } catch (error) {
    console.error('Error retrying deliveries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry deliveries',
      },
      { status: 500 },
    );
  }
}

// PUT /api/email/delivery - Update delivery status or cleanup
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, logId, status, error } = body;

    switch (action) {
      case 'update_status':
        if (!logId || !status) {
          return NextResponse.json(
            {
              success: false,
              error: 'logId and status are required for update_status action',
            },
            { status: 400 },
          );
        }

        const updatedLog = await emailDeliveryService.updateDeliveryStatus(logId, status, error);
        return NextResponse.json({
          success: true,
          data: updatedLog,
          message: 'Delivery status updated successfully',
        });

      case 'cleanup':
        const daysToKeep = body.daysToKeep || 90;
        const deletedCount = await emailDeliveryService.cleanupOldLogs(daysToKeep);
        return NextResponse.json({
          success: true,
          data: { deletedCount },
          message: `Cleaned up ${deletedCount} old delivery logs`,
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: update_status, cleanup',
          },
          { status: 400 },
        );
    }

  } catch (error) {
    console.error('Error updating delivery:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update delivery',
      },
      { status: 500 },
    );
  }
}
