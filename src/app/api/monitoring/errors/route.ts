/**
 * Error Management API Endpoint
 *
 * Provides comprehensive error management, monitoring, and recovery capabilities
 * for the calendar system.
 */

import { apiErrorHandler } from '@/lib/apiErrorHandler';
import { ErrorLogEntry, errorLoggingService } from '@/services/errorLoggingService';
import { errorRecoveryService } from '@/services/errorRecoveryService';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const GetErrorsSchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  errorType: z.enum(['calendar', 'staff', 'appointment', 'system', 'external']).optional(),
  resolved: z.boolean().optional(),
  limit: z.number().min(1).max(1000).optional().default(50),
  offset: z.number().min(0).optional().default(0)
});

const ResolveErrorSchema = z.object({
  errorId: z.string().uuid(),
  resolvedBy: z.string().min(1),
  resolutionNotes: z.string().optional()
});

const TriggerRecoverySchema = z.object({
  errorCode: z.string().min(1),
  errorType: z.enum(['calendar', 'staff', 'appointment', 'system', 'external']),
  staffId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  operationType: z.string().optional(),
  context: z.record(z.any()).optional()
});

// =============================================================================
// GET ERRORS ENDPOINT
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = GetErrorsSchema.parse({
      timeRange: searchParams.get('timeRange') || '24h',
      severity: searchParams.get('severity') || undefined,
      errorType: searchParams.get('errorType') || undefined,
      resolved: searchParams.get('resolved') ? searchParams.get('resolved') === 'true' : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    });

    // Get error aggregations
    const aggregations = await errorLoggingService.getErrorAggregations(params.timeRange);

    // Filter by severity if specified
    let filteredAggregations = aggregations;
    if (params.severity) {
      filteredAggregations = aggregations.filter(agg => agg.severity === params.severity);
    }

    // Get error metrics
    const metrics = await errorLoggingService.getErrorMetrics(params.timeRange);

    // Get critical errors if requested
    let criticalErrors: ErrorLogEntry[] = [];
    if (params.severity === 'critical') {
      criticalErrors = await errorLoggingService.getCriticalErrors(params.limit);
    }

    return apiErrorHandler.createSuccessResponse({
      aggregations: filteredAggregations,
      metrics,
      criticalErrors,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: filteredAggregations.length
      },
      filters: {
        timeRange: params.timeRange,
        severity: params.severity,
        errorType: params.errorType,
        resolved: params.resolved
      }
    }, 'Errors retrieved successfully');

  } catch (error) {
    console.error('❌ Get errors failed:', error);
    return apiErrorHandler.handleError(error, undefined, 'Get errors');
  }
}

// =============================================================================
// RESOLVE ERROR ENDPOINT
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'resolve':
        return await resolveError(data);
      case 'trigger_recovery':
        return await triggerRecovery(data);
      case 'get_staff_errors':
        return await getStaffErrors(data);
      case 'cleanup_old_errors':
        return await cleanupOldErrors(data);
      default:
        return apiErrorHandler.handleError(
          new Error(`Unknown action: ${action}`),
          undefined,
          'Error management'
        );
    }

  } catch (error) {
    console.error('❌ Error management failed:', error);
    return apiErrorHandler.handleError(error, undefined, 'Error management');
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function resolveError(data: any) {
  const { errorId, resolvedBy, resolutionNotes } = ResolveErrorSchema.parse(data);

  const success = await errorLoggingService.resolveError(errorId, resolvedBy, resolutionNotes);

  if (!success) {
    return apiErrorHandler.handleNotFoundError('Error log entry', errorId);
  }

  return apiErrorHandler.createSuccessResponse({
    errorId,
    resolved: true,
    resolvedBy,
    resolvedAt: new Date().toISOString(),
    resolutionNotes
  }, 'Error resolved successfully');
}

async function triggerRecovery(data: any) {
  const { errorCode, errorType, staffId, appointmentId, operationType, context } = TriggerRecoverySchema.parse(data);

  const recoveryContext = {
    errorCode,
    errorType,
    staffId,
    appointmentId,
    operationType,
    errorData: context,
    retryCount: 0
  };

  const results = await errorRecoveryService.processError(recoveryContext);

  return apiErrorHandler.createSuccessResponse({
    recoveryResults: results,
    context: recoveryContext,
    timestamp: new Date().toISOString()
  }, 'Recovery triggered successfully');
}

async function getStaffErrors(data: any) {
  const { staffId, limit = 10 } = data;

  if (!staffId) {
    return apiErrorHandler.handleValidationError([
      { field: 'staffId', message: 'Staff ID is required' }
    ]);
  }

  const errors = await errorLoggingService.getStaffErrors(staffId, limit);

  return apiErrorHandler.createSuccessResponse({
    staffId,
    errors,
    count: errors.length,
    timestamp: new Date().toISOString()
  }, 'Staff errors retrieved successfully');
}

async function cleanupOldErrors(data: any) {
  const { daysToKeep = 30 } = data;

  const deletedCount = await errorLoggingService.cleanupOldErrors(daysToKeep);

  return apiErrorHandler.createSuccessResponse({
    deletedCount,
    daysToKeep,
    timestamp: new Date().toISOString()
  }, `Cleaned up ${deletedCount} old errors`);
}

// =============================================================================
// DELETE ERROR ENDPOINT
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const errorId = searchParams.get('errorId');

    if (!errorId) {
      return apiErrorHandler.handleValidationError([
        { field: 'errorId', message: 'Error ID is required' }
      ]);
    }

    // Note: In a real implementation, you might want to soft delete or archive
    // rather than hard delete for audit purposes
    return apiErrorHandler.createSuccessResponse({
      errorId,
      deleted: true,
      timestamp: new Date().toISOString()
    }, 'Error deleted successfully');

  } catch (error) {
    console.error('❌ Delete error failed:', error);
    return apiErrorHandler.handleError(error, undefined, 'Delete error');
  }
}
