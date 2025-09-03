import { cronWorkerService } from '@/services/cronWorkerService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/worker/status - Get worker status
export async function GET(request: NextRequest) {
  try {
    const status = cronWorkerService.getStatus();
    const health = await cronWorkerService.getHealthStatus();

    return NextResponse.json({
      success: true,
      data: {
        status,
        health,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error getting worker status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get worker status',
      },
      { status: 500 },
    );
  }
}
