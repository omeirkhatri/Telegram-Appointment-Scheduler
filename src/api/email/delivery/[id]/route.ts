import { emailDeliveryService } from '@/services/emailDeliveryService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/email/delivery/[id] - Get specific delivery log
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const deliveryLog = await emailDeliveryService.getDeliveryLogById(id);

    if (!deliveryLog) {
      return NextResponse.json(
        {
          success: false,
          error: 'Delivery log not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deliveryLog,
    });

  } catch (error) {
    console.error('Error fetching delivery log:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch delivery log'
      },
      { status: 500 }
    );
  }
}

// POST /api/email/delivery/[id] - Add delivery attempt or retry
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, attemptData } = body;

    switch (action) {
      case 'add_attempt':
        if (!attemptData) {
          return NextResponse.json(
            {
              success: false,
              error: 'attemptData is required for add_attempt action'
            },
            { status: 400 }
          );
        }

        const attempt = await emailDeliveryService.addDeliveryAttempt(id, attemptData);
        return NextResponse.json({
          success: true,
          data: attempt,
          message: 'Delivery attempt added successfully'
        });

      case 'retry':
        const retriedLog = await emailDeliveryService.retryFailedDelivery(id);
        return NextResponse.json({
          success: true,
          data: retriedLog,
          message: 'Delivery retry scheduled successfully'
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: add_attempt, retry'
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing delivery log action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process delivery log action'
      },
      { status: 500 }
    );
  }
}

// PUT /api/email/delivery/[id] - Update delivery log
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, error } = body;

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: 'status is required'
        },
        { status: 400 }
      );
    }

    const updatedLog = await emailDeliveryService.updateDeliveryStatus(id, status, error);

    return NextResponse.json({
      success: true,
      data: updatedLog,
      message: 'Delivery log updated successfully'
    });

  } catch (error) {
    console.error('Error updating delivery log:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update delivery log'
      },
      { status: 500 }
    );
  }
}
