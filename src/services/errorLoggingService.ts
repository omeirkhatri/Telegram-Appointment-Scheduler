/**
 * Error Logging Service
 *
 * Comprehensive error logging and monitoring service for calendar operations.
 * Provides structured logging, error aggregation, and monitoring capabilities.
 */

import { getErrorDescription, getErrorSeverity, isRetryableError } from '@/lib/errorCodes';
import { supabase } from '@/lib/supabase';
import { CalendarErrorCode } from '@/types/calendar';

// =============================================================================
// ERROR LOG INTERFACES
// =============================================================================

export interface ErrorLogEntry {
  id?: string;
  error_code: string;
  error_type: 'calendar' | 'staff' | 'appointment' | 'system' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context?: Record<string, any>;
  stack_trace?: string;
  user_id?: string;
  staff_id?: string;
  appointment_id?: string;
  operation_type?: string;
  retryable: boolean;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ErrorAggregation {
  error_code: string;
  count: number;
  first_occurrence: string;
  last_occurrence: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  resolved_count: number;
  unresolved_count: number;
}

export interface ErrorMetrics {
  total_errors: number;
  errors_by_severity: Record<string, number>;
  errors_by_type: Record<string, number>;
  retryable_errors: number;
  resolved_errors: number;
  unresolved_errors: number;
  error_trend: Array<{
    date: string;
    count: number;
    severity: string;
  }>;
}

// =============================================================================
// ERROR LOGGING SERVICE
// =============================================================================

export class ErrorLoggingService {
  private static instance: ErrorLoggingService;

  private constructor() {}

  public static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Log an error with full context
   */
  public async logError(params: {
    errorCode: string;
    errorType: ErrorLogEntry['error_type'];
    message: string;
    context?: Record<string, any>;
    stackTrace?: string;
    userId?: string;
    staffId?: string;
    appointmentId?: string;
    operationType?: string;
  }): Promise<string | null> {
    try {
      const errorDescription = getErrorDescription(params.errorCode);
      const severity = getErrorSeverity(params.errorCode);
      const retryable = isRetryableError(params.errorCode);

      const logEntry: Omit<ErrorLogEntry, 'id' | 'created_at' | 'updated_at'> = {
        error_code: params.errorCode,
        error_type: params.errorType,
        severity,
        message: params.message,
        context: params.context || null,
        stack_trace: params.stackTrace || null,
        user_id: params.userId || null,
        staff_id: params.staffId || null,
        appointment_id: params.appointmentId || null,
        operation_type: params.operationType || null,
        retryable,
        resolved: false
      };

      const { data, error } = await supabase
        .from('error_logs')
        .insert(logEntry)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Failed to log error:', error);
        return null;
      }

      // Log to console for immediate visibility
      this.logToConsole(logEntry, data.id);

      return data.id;
    } catch (error) {
      console.error('❌ Error in error logging service:', error);
      return null;
    }
  }

  /**
   * Log calendar-specific errors
   */
  public async logCalendarError(params: {
    errorCode: CalendarErrorCode;
    message: string;
    context?: Record<string, any>;
    staffId?: string;
    appointmentId?: string;
    operationType?: string;
  }): Promise<string | null> {
    return this.logError({
      errorCode: params.errorCode,
      errorType: 'calendar',
      message: params.message,
      context: params.context,
      staffId: params.staffId,
      appointmentId: params.appointmentId,
      operationType: params.operationType,
      stackTrace: new Error().stack
    });
  }

  /**
   * Log staff-related errors
   */
  public async logStaffError(params: {
    errorCode: string;
    message: string;
    context?: Record<string, any>;
    staffId: string;
    operationType?: string;
  }): Promise<string | null> {
    return this.logError({
      errorCode: params.errorCode,
      errorType: 'staff',
      message: params.message,
      context: params.context,
      staffId: params.staffId,
      operationType: params.operationType,
      stackTrace: new Error().stack
    });
  }

  /**
   * Log appointment-related errors
   */
  public async logAppointmentError(params: {
    errorCode: string;
    message: string;
    context?: Record<string, any>;
    appointmentId: string;
    staffId?: string;
    operationType?: string;
  }): Promise<string | null> {
    return this.logError({
      errorCode: params.errorCode,
      errorType: 'appointment',
      message: params.message,
      context: params.context,
      appointmentId: params.appointmentId,
      staffId: params.staffId,
      operationType: params.operationType,
      stackTrace: new Error().stack
    });
  }

  /**
   * Log system errors
   */
  public async logSystemError(params: {
    errorCode: string;
    message: string;
    context?: Record<string, any>;
    operationType?: string;
  }): Promise<string | null> {
    return this.logError({
      errorCode: params.errorCode,
      errorType: 'system',
      message: params.message,
      context: params.context,
      operationType: params.operationType,
      stackTrace: new Error().stack
    });
  }

  /**
   * Log external service errors
   */
  public async logExternalServiceError(params: {
    errorCode: string;
    message: string;
    service: string;
    context?: Record<string, any>;
    operationType?: string;
  }): Promise<string | null> {
    return this.logError({
      errorCode: params.errorCode,
      errorType: 'external',
      message: params.message,
      context: { ...params.context, service: params.service },
      operationType: params.operationType,
      stackTrace: new Error().stack
    });
  }

  /**
   * Mark an error as resolved
   */
  public async resolveError(
    errorId: string,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution_notes: resolutionNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', errorId);

      if (error) {
        console.error('❌ Failed to resolve error:', error);
        return false;
      }

      console.log(`✅ Error ${errorId} marked as resolved by ${resolvedBy}`);
      return true;
    } catch (error) {
      console.error('❌ Error resolving error:', error);
      return false;
    }
  }

  /**
   * Get error aggregations for monitoring
   */
  public async getErrorAggregations(
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<ErrorAggregation[]> {
    try {
      const timeRanges = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const { data, error } = await supabase
        .from('error_logs')
        .select(`
          error_code,
          severity,
          retryable,
          resolved,
          created_at
        `)
        .gte('created_at', new Date(Date.now() - this.getTimeRangeMs(timeRange)).toISOString());

      if (error) {
        throw new Error(`Failed to fetch error aggregations: ${error.message}`);
      }

      // Aggregate the data
      const aggregations = new Map<string, ErrorAggregation>();

      data?.forEach(entry => {
        const key = entry.error_code;
        if (!aggregations.has(key)) {
          aggregations.set(key, {
            error_code: entry.error_code,
            count: 0,
            first_occurrence: entry.created_at,
            last_occurrence: entry.created_at,
            severity: entry.severity,
            retryable: entry.retryable,
            resolved_count: 0,
            unresolved_count: 0
          });
        }

        const agg = aggregations.get(key)!;
        agg.count++;
        agg.last_occurrence = entry.created_at;

        if (entry.resolved) {
          agg.resolved_count++;
        } else {
          agg.unresolved_count++;
        }
      });

      return Array.from(aggregations.values()).sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('❌ Failed to get error aggregations:', error);
      return [];
    }
  }

  /**
   * Get error metrics for dashboard
   */
  public async getErrorMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<ErrorMetrics> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select(`
          error_code,
          error_type,
          severity,
          retryable,
          resolved,
          created_at
        `)
        .gte('created_at', new Date(Date.now() - this.getTimeRangeMs(timeRange)).toISOString());

      if (error) {
        throw new Error(`Failed to fetch error metrics: ${error.message}`);
      }

      const metrics: ErrorMetrics = {
        total_errors: data?.length || 0,
        errors_by_severity: {},
        errors_by_type: {},
        retryable_errors: 0,
        resolved_errors: 0,
        unresolved_errors: 0,
        error_trend: []
      };

      data?.forEach(entry => {
        // Count by severity
        metrics.errors_by_severity[entry.severity] = (metrics.errors_by_severity[entry.severity] || 0) + 1;

        // Count by type
        metrics.errors_by_type[entry.error_type] = (metrics.errors_by_type[entry.error_type] || 0) + 1;

        // Count retryable
        if (entry.retryable) {
          metrics.retryable_errors++;
        }

        // Count resolved/unresolved
        if (entry.resolved) {
          metrics.resolved_errors++;
        } else {
          metrics.unresolved_errors++;
        }
      });

      return metrics;
    } catch (error) {
      console.error('❌ Failed to get error metrics:', error);
      return {
        total_errors: 0,
        errors_by_severity: {},
        errors_by_type: {},
        retryable_errors: 0,
        resolved_errors: 0,
        unresolved_errors: 0,
        error_trend: []
      };
    }
  }

  /**
   * Get recent errors for a specific staff member
   */
  public async getStaffErrors(
    staffId: string,
    limit: number = 10
  ): Promise<ErrorLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch staff errors: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get staff errors:', error);
      return [];
    }
  }

  /**
   * Get critical errors that need immediate attention
   */
  public async getCriticalErrors(limit: number = 20): Promise<ErrorLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('severity', 'critical')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch critical errors: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get critical errors:', error);
      return [];
    }
  }

  /**
   * Clean up old resolved errors
   */
  public async cleanupOldErrors(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));

      const { data, error } = await supabase
        .from('error_logs')
        .delete()
        .eq('resolved', true)
        .lt('resolved_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw new Error(`Failed to cleanup old errors: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      console.log(`🧹 Cleaned up ${deletedCount} old resolved errors`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup old errors:', error);
      return 0;
    }
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private logToConsole(logEntry: Omit<ErrorLogEntry, 'id' | 'created_at' | 'updated_at'>, logId: string): void {
    const timestamp = new Date().toISOString();
    const severityIcon = this.getSeverityIcon(logEntry.severity);

    console.log(`${severityIcon} [${timestamp}] Error ${logId}: ${logEntry.error_code}`);
    console.log(`   Type: ${logEntry.error_type} | Severity: ${logEntry.severity} | Retryable: ${logEntry.retryable}`);
    console.log(`   Message: ${logEntry.message}`);

    if (logEntry.context) {
      console.log(`   Context:`, logEntry.context);
    }

    if (logEntry.staff_id) {
      console.log(`   Staff ID: ${logEntry.staff_id}`);
    }

    if (logEntry.appointment_id) {
      console.log(`   Appointment ID: ${logEntry.appointment_id}`);
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '❓';
    }
  }

  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const errorLoggingService = ErrorLoggingService.getInstance();
export default errorLoggingService;
