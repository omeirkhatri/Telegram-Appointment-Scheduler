import { webhookService } from '@/services/webhookService';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/webhooks/management - Get webhook status for all staff
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');

    if (staffId) {
      // Get webhook status for specific staff member
      const status = await webhookService.getWebhookStatusForAllStaff();
      const staffStatus = status.find(s => s.staffId === staffId);

      if (!staffStatus) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: staffStatus
      });
    } else {
      // Get webhook status for all staff members
      const statuses = await webhookService.getWebhookStatusForAllStaff();

      return NextResponse.json({
        success: true,
        data: statuses
      });
    }
  } catch (error) {
    console.error('Error getting webhook status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get webhook status'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks/management - Set up webhook for staff member
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staff_id, action } = body;

    if (!staff_id || !action) {
      return NextResponse.json(
        {
          success: false,
          error: 'staff_id and action are required'
        },
        { status: 400 }
      );
    }

    switch (action) {
      case 'setup':
        const setupResult = await webhookService.setupWebhookForStaff(staff_id);
        return NextResponse.json({
          success: setupResult.success,
          data: setupResult
        });

      case 'remove':
        const removeResult = await webhookService.removeWebhookForStaff(staff_id);
        return NextResponse.json({
          success: removeResult.success,
          data: removeResult
        });

      case 'refresh':
        const refreshResult = await webhookService.refreshWebhookForStaff(staff_id);
        return NextResponse.json({
          success: refreshResult.success,
          data: refreshResult
        });

      case 'test':
        const testResult = await webhookService.testWebhookConnectivity(staff_id);
        return NextResponse.json({
          success: testResult.success,
          data: testResult
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: setup, remove, refresh, test'
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error managing webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage webhook'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/webhooks/management - Bulk webhook operations
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'action is required'
        },
        { status: 400 }
      );
    }

    switch (action) {
      case 'setup_all':
        const setupAllResult = await webhookService.setupWebhooksForAllStaff();
        return NextResponse.json({
          success: setupAllResult.success,
          data: setupAllResult
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: setup_all'
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing bulk webhook operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform bulk operation'
      },
      { status: 500 }
    );
  }
}
