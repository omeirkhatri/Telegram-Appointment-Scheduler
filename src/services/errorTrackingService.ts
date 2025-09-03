import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { loggingService } from './loggingService';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  userAgent?: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  errorId: string;
  errorType: string;
  message: string;
  stackTrace?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  occurrences: number;
  lastOccurrence: Date;
}

export interface ErrorStats {
  totalErrors: number;
  errorsBySeverity: Record<string, number>;
  errorsByComponent: Record<string, number>;
  errorsByType: Record<string, number>;
  recentErrors: number;
  unresolvedErrors: number;
}

export class ErrorTrackingService {
  private supabase = supabase;
  private errorCache = new Map<string, ErrorReport>();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the error tracking service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.createTables();
      this.isInitialized = true;
      loggingService.info('Error tracking service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize error tracking service:', error);
    }
  }

  /**
   * Track an error
   */
  async trackError(
    error: Error,
    context: ErrorContext = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    try {
      const errorId = this.generateErrorId(error, context);
      const errorType = error.constructor.name || 'Error';

      // Check if this error already exists
      let errorReport = await this.getErrorReport(errorId);

      if (errorReport) {
        // Update existing error report
        errorReport.occurrences += 1;
        errorReport.lastOccurrence = new Date();
        await this.updateErrorReport(errorReport);
      } else {
        // Create new error report
        errorReport = {
          id: uuidv4(),
          errorId,
          errorType,
          message: error.message,
          stackTrace: error.stack,
          context,
          severity,
          resolved: false,
          createdAt: new Date(),
          occurrences: 1,
          lastOccurrence: new Date(),
        };
        await this.createErrorReport(errorReport);
      }

      // Log the error
      loggingService.error(`Error tracked: ${error.message}`, error, {
        component: 'error-tracking',
        action: 'track',
        metadata: {
          errorId,
          errorType,
          severity,
          occurrences: errorReport.occurrences,
        },
      });

      // Cache the error report
      this.errorCache.set(errorId, errorReport);

      return errorId;
    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
      return '';
    }
  }

  /**
   * Track API error
   */
  async trackApiError(
    error: Error,
    method: string,
    path: string,
    statusCode: number,
    context: ErrorContext = {}
  ): Promise<string> {
    const severity = this.determineApiErrorSeverity(statusCode);
    return this.trackError(error, {
      ...context,
      component: 'api',
      action: 'request',
      metadata: {
        method,
        path,
        statusCode,
        ...context.metadata,
      },
    }, severity);
  }

  /**
   * Track database error
   */
  async trackDatabaseError(
    error: Error,
    operation: string,
    table: string,
    context: ErrorContext = {}
  ): Promise<string> {
    return this.trackError(error, {
      ...context,
      component: 'database',
      action: operation,
      metadata: {
        operation,
        table,
        ...context.metadata,
      },
    }, 'high');
  }

  /**
   * Track email error
   */
  async trackEmailError(
    error: Error,
    operation: string,
    recipient: string,
    context: ErrorContext = {}
  ): Promise<string> {
    return this.trackError(error, {
      ...context,
      component: 'email',
      action: operation,
      metadata: {
        operation,
        recipient,
        ...context.metadata,
      },
    }, 'medium');
  }

  /**
   * Track calendar error
   */
  async trackCalendarError(
    error: Error,
    operation: string,
    eventId: string,
    context: ErrorContext = {}
  ): Promise<string> {
    return this.trackError(error, {
      ...context,
      component: 'calendar',
      action: operation,
      metadata: {
        operation,
        eventId,
        ...context.metadata,
      },
    }, 'medium');
  }

  /**
   * Track client-side error
   */
  async trackClientError(
    error: Error,
    component: string,
    context: ErrorContext = {}
  ): Promise<string> {
    return this.trackError(error, {
      ...context,
      component: `client-${component}`,
      action: 'render',
      metadata: {
        userAgent: context.userAgent,
        url: context.url,
        ...context.metadata,
      },
    }, 'low');
  }

  /**
   * Get error report by ID
   */
  async getErrorReport(errorId: string): Promise<ErrorReport | null> {
    try {
      // Check cache first
      if (this.errorCache.has(errorId)) {
        return this.errorCache.get(errorId)!;
      }

      const { data, error } = await this.supabase
        .from('error_tracking')
        .select('*')
        .eq('error_id', errorId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Error not found
        }
        throw error;
      }

      const errorReport: ErrorReport = {
        id: data.id,
        errorId: data.error_id,
        errorType: data.error_type,
        message: data.message,
        stackTrace: data.stack_trace,
        context: data.context,
        severity: data.severity,
        resolved: data.resolved,
        resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
        resolvedBy: data.resolved_by,
        createdAt: new Date(data.created_at),
        occurrences: 1, // This would need to be calculated from occurrences table
        lastOccurrence: new Date(data.created_at), // This would need to be updated
      };

      // Cache the result
      this.errorCache.set(errorId, errorReport);

      return errorReport;
    } catch (error) {
      console.error('Error getting error report:', error);
      return null;
    }
  }

  /**
   * Get all error reports
   */
  async getAllErrorReports(limit = 100): Promise<ErrorReport[]> {
    try {
      const { data, error } = await this.supabase
        .from('error_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data.map(item => ({
        id: item.id,
        errorId: item.error_id,
        errorType: item.error_type,
        message: item.message,
        stackTrace: item.stack_trace,
        context: item.context,
        severity: item.severity,
        resolved: item.resolved,
        resolvedAt: item.resolved_at ? new Date(item.resolved_at) : undefined,
        resolvedBy: item.resolved_by,
        createdAt: new Date(item.created_at),
        occurrences: 1,
        lastOccurrence: new Date(item.created_at),
      }));
    } catch (error) {
      console.error('Error getting all error reports:', error);
      return [];
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(): Promise<ErrorStats> {
    try {
      const { data: totalErrors } = await this.supabase
        .from('error_tracking')
        .select('*', { count: 'exact', head: true });

      const { data: errorsBySeverity } = await this.supabase
        .from('error_tracking')
        .select('severity')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: errorsByComponent } = await this.supabase
        .from('error_tracking')
        .select('context')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: recentErrors } = await this.supabase
        .from('error_tracking')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: unresolvedErrors } = await this.supabase
        .from('error_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      const severityCounts: Record<string, number> = {};
      const componentCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};

      errorsBySeverity?.forEach(error => {
        severityCounts[error.severity] = (severityCounts[error.severity] || 0) + 1;
      });

      errorsByComponent?.forEach(error => {
        const component = error.context?.component || 'unknown';
        componentCounts[component] = (componentCounts[component] || 0) + 1;
      });

      return {
        totalErrors: totalErrors?.length || 0,
        errorsBySeverity: severityCounts,
        errorsByComponent: componentCounts,
        errorsByType: typeCounts,
        recentErrors: recentErrors?.length || 0,
        unresolvedErrors: unresolvedErrors?.length || 0,
      };
    } catch (error) {
      console.error('Error getting error stats:', error);
      return {
        totalErrors: 0,
        errorsBySeverity: {},
        errorsByComponent: {},
        errorsByType: {},
        recentErrors: 0,
        unresolvedErrors: 0,
      };
    }
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string, resolvedBy: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('error_tracking')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
        })
        .eq('error_id', errorId);

      if (error) {
        throw error;
      }

      // Update cache
      const errorReport = this.errorCache.get(errorId);
      if (errorReport) {
        errorReport.resolved = true;
        errorReport.resolvedAt = new Date();
        errorReport.resolvedBy = resolvedBy;
      }

      loggingService.info(`Error resolved: ${errorId}`, {
        component: 'error-tracking',
        action: 'resolve',
        metadata: { errorId, resolvedBy },
      });

      return true;
    } catch (error) {
      console.error('Error resolving error:', error);
      return false;
    }
  }

  /**
   * Create error report
   */
  private async createErrorReport(errorReport: ErrorReport): Promise<void> {
    const { error } = await this.supabase
      .from('error_tracking')
      .insert({
        id: errorReport.id,
        error_id: errorReport.errorId,
        error_type: errorReport.errorType,
        message: errorReport.message,
        stack_trace: errorReport.stackTrace,
        context: errorReport.context,
        severity: errorReport.severity,
        resolved: errorReport.resolved,
        created_at: errorReport.createdAt.toISOString(),
      });

    if (error) {
      throw error;
    }
  }

  /**
   * Update error report
   */
  private async updateErrorReport(errorReport: ErrorReport): Promise<void> {
    const { error } = await this.supabase
      .from('error_tracking')
      .update({
        resolved: errorReport.resolved,
        resolved_at: errorReport.resolvedAt?.toISOString(),
        resolved_by: errorReport.resolvedBy,
      })
      .eq('error_id', errorReport.errorId);

    if (error) {
      throw error;
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(error: Error, context: ErrorContext): string {
    const errorSignature = `${error.constructor.name}:${error.message}`;
    const contextSignature = context.component ? `:${context.component}` : '';
    return `${errorSignature}${contextSignature}`.replace(/[^a-zA-Z0-9:]/g, '_');
  }

  /**
   * Determine API error severity
   */
  private determineApiErrorSeverity(statusCode: number): 'low' | 'medium' | 'high' | 'critical' {
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400) return 'high';
    if (statusCode >= 300) return 'medium';
    return 'low';
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    const tables = [
      {
        name: 'error_tracking',
        sql: `
          CREATE TABLE IF NOT EXISTS error_tracking (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            error_id VARCHAR(255) NOT NULL UNIQUE,
            error_type VARCHAR(100) NOT NULL,
            message TEXT NOT NULL,
            stack_trace TEXT,
            context JSONB,
            user_id UUID,
            session_id VARCHAR(255),
            request_id VARCHAR(255),
            component VARCHAR(100),
            severity VARCHAR(20) NOT NULL,
            resolved BOOLEAN DEFAULT false,
            resolved_at TIMESTAMPTZ,
            resolved_by UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `,
      },
    ];

    for (const table of tables) {
      try {
        const { error } = await this.supabase.rpc('exec_sql', { sql: table.sql });
        if (error) {
          console.warn(`⚠️ Could not create table ${table.name}:`, error.message);
        }
      } catch (error) {
        console.warn(`⚠️ Could not create table ${table.name}:`, error);
      }
    }
  }
}

// Export singleton instance
export const errorTrackingService = new ErrorTrackingService();
