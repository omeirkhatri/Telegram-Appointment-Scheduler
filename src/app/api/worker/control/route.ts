import { cronWorkerService } from '@/services/cronWorkerService';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/worker/control - Control worker service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        await cronWorkerService.start();
        return NextResponse.json({
          success: true,
          message: 'Worker service started successfully',
        });

      case 'stop':
        await cronWorkerService.stop();
        return NextResponse.json({
          success: true,
          message: 'Worker service stopped successfully',
        });

      case 'restart':
        await cronWorkerService.restart();
        return NextResponse.json({
          success: true,
          message: 'Worker service restarted successfully',
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action. Supported actions: start, stop, restart',
          },
          { status: 400 },
        );
    }

  } catch (error) {
    console.error('Error controlling worker service:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to control worker service',
      },
      { status: 500 },
    );
  }
}
