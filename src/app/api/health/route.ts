import { healthCheckService } from '@/services/healthCheckService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/health - Health check endpoint
export async function GET(request: NextRequest) {
  try {
    const healthStatus = await healthCheckService.performHealthCheck();

    // Return appropriate HTTP status based on health
    const statusCode = healthStatus.overall === 'healthy' ? 200 :
                      healthStatus.overall === 'degraded' ? 200 : 503;

    return NextResponse.json({
      status: healthStatus.overall,
      timestamp: healthStatus.timestamp,
      uptime: healthStatus.uptime,
      version: healthStatus.version,
      checks: healthStatus.checks,
    }, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 },
    );
  }
}
