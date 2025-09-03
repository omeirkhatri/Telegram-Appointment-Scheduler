import { errorTrackingService } from '@/services/errorTrackingService';
import { healthCheckService } from '@/services/healthCheckService';
import { loggingService } from '@/services/loggingService';
import { performanceMonitoringService } from '@/services/performanceMonitoringService';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/observability/status - Get comprehensive observability status
export async function GET(request: NextRequest) {
  try {
    const [
      logStats,
      errorStats,
      performanceStats,
      healthStatus,
    ] = await Promise.allSettled([
      loggingService.getLogStats(),
      errorTrackingService.getErrorStats(),
      performanceMonitoringService.getPerformanceStats(),
      healthCheckService.performHealthCheck(),
    ]);

    const observabilityStatus = {
      timestamp: new Date().toISOString(),
      logging: {
        status: logStats.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        data: logStats.status === 'fulfilled' ? logStats.value : null,
        error: logStats.status === 'rejected' ? logStats.reason : null,
      },
      errors: {
        status: errorStats.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        data: errorStats.status === 'fulfilled' ? errorStats.value : null,
        error: errorStats.status === 'rejected' ? errorStats.reason : null,
      },
      performance: {
        status: performanceStats.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        data: performanceStats.status === 'fulfilled' ? performanceStats.value : null,
        error: performanceStats.status === 'rejected' ? performanceStats.reason : null,
      },
      health: {
        status: healthStatus.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        data: healthStatus.status === 'fulfilled' ? healthStatus.value : null,
        error: healthStatus.status === 'rejected' ? healthStatus.reason : null,
      },
    };

    // Determine overall status
    const overallStatus = Object.values(observabilityStatus).every(
      service => service.status === 'healthy'
    ) ? 'healthy' : 'unhealthy';

    return NextResponse.json({
      status: overallStatus,
      ...observabilityStatus,
    });

  } catch (error) {
    console.error('Observability status check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Observability status check failed',
      },
      { status: 500 },
    );
  }
}
