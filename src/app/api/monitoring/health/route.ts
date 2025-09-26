/**
 * Monitoring Health Check API Endpoint
 *
 * Provides comprehensive health monitoring and system status information
 * for the calendar system and all related services.
 */

import { apiErrorHandler } from '@/lib/apiErrorHandler';
import { getRetryStatistics } from '@/lib/retryUtils';
import { errorLoggingService } from '@/services/errorLoggingService';
import { errorRecoveryService } from '@/services/errorRecoveryService';
import { gracefulDegradationService } from '@/services/gracefulDegradationService';
import { monitoringService } from '@/services/monitoringService';
import { NextRequest } from 'next/server';

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const includeMetrics = searchParams.get('metrics') === 'true';

    // Get basic health status
    const health = await monitoringService.performHealthCheck();

    // Get additional metrics if requested
    let metrics = undefined;
    if (includeMetrics) {
      const errorMetrics = await errorLoggingService.getErrorMetrics('24h');
      const recoveryStats = errorRecoveryService.getRecoveryStatistics();
      const degradationMetrics = gracefulDegradationService.getMetrics();
      const retryStats = getRetryStatistics();

      metrics = {
        errors: errorMetrics,
        recovery: recoveryStats,
        degradation: degradationMetrics,
        retry: retryStats
      };
    }

    // Get detailed information if requested
    let details = undefined;
    if (detailed) {
      const alerts = monitoringService.getAlerts();
      const performanceHistory = monitoringService.getPerformanceHistory(24);
      const queuedOperations = gracefulDegradationService.getQueuedOperations();

      details = {
        alerts,
        performanceHistory,
        queuedOperations,
        degradationLevel: gracefulDegradationService.getCurrentLevel()
      };
    }

    return apiErrorHandler.createSuccessResponse({
      health,
      metrics,
      details,
      timestamp: new Date().toISOString()
    }, 'Health check completed successfully');

  } catch (error) {
    console.error('❌ Health check failed:', error);
    return apiErrorHandler.handleError(error, undefined, 'Health check');
  }
}

// =============================================================================
// HEALTH CHECK SUMMARY ENDPOINT
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { services, includeAlerts = false } = body;

    // Get health for specific services if requested
    const health = await monitoringService.performHealthCheck();

    let filteredHealth = health;
    if (services && Array.isArray(services)) {
      filteredHealth = {
        ...health,
        services: Object.fromEntries(
          Object.entries(health.services).filter(([key]) => services.includes(key))
        )
      };
    }

    // Include alerts if requested
    let alerts = undefined;
    if (includeAlerts) {
      alerts = monitoringService.getAlerts();
    }

    return apiErrorHandler.createSuccessResponse({
      status: filteredHealth.status,
      services: filteredHealth.services,
      alerts,
      timestamp: filteredHealth.timestamp
    }, 'Health summary generated successfully');

  } catch (error) {
    console.error('❌ Health summary failed:', error);
    return apiErrorHandler.handleError(error, undefined, 'Health summary');
  }
}
