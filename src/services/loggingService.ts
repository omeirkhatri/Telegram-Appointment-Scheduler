import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration?: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };
  tags?: string[];
}

export interface LoggingConfig {
  enableConsole: boolean;
  enableDatabase: boolean;
  enableExternal: boolean;
  logLevel: LogLevel;
  batchSize: number;
  flushInterval: number;
  maxRetentionDays: number;
  enablePerformanceLogging: boolean;
  enableErrorTracking: boolean;
}

export class LoggingService {
  private supabase = supabase;
  private config: LoggingConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = {
      enableConsole: true,
      enableDatabase: true,
      enableExternal: false,
      logLevel: env.LOG_LEVEL as LogLevel,
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      maxRetentionDays: 30,
      enablePerformanceLogging: true,
      enableErrorTracking: true,
      ...config,
    };

    this.initialize();
  }

  /**
   * Initialize the logging service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create database tables if they don't exist
      await this.createTables();

      // Start flush timer
      this.startFlushTimer();

      this.isInitialized = true;
      console.log('✅ Logging service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize logging service:', error);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context: LogContext = {}): void {
    this.log('debug', message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context: LogContext = {}): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context: LogContext = {}): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context: LogContext = {}): void {
    this.log('error', message, context, error);
  }

  /**
   * Log a fatal error message
   */
  fatal(message: string, error?: Error, context: LogContext = {}): void {
    this.log('fatal', message, context, error);
  }

  /**
   * Log performance metrics
   */
  performance(
    message: string,
    duration: number,
    context: LogContext = {},
    memoryUsage?: NodeJS.MemoryUsage
  ): void {
    if (!this.config.enablePerformanceLogging) {
      return;
    }

    this.log('info', message, context, undefined, {
      duration,
      memoryUsage,
    });
  }

  /**
   * Log user action
   */
  userAction(action: string, context: LogContext = {}): void {
    this.log('info', `User action: ${action}`, {
      ...context,
      action,
      component: 'user-action',
    });
  }

  /**
   * Log API request
   */
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context: LogContext = {}
  ): void {
    const level = statusCode >= 400 ? 'error' : 'info';
    this.log(level, `API ${method} ${path} - ${statusCode}`, {
      ...context,
      component: 'api',
      action: 'request',
      metadata: {
        method,
        path,
        statusCode,
        duration,
      },
    });
  }

  /**
   * Log database operation
   */
  databaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    context: LogContext = {}
  ): void {
    const level = success ? 'info' : 'error';
    this.log(level, `Database ${operation} on ${table}`, {
      ...context,
      component: 'database',
      action: operation,
      metadata: {
        table,
        duration,
        success,
      },
    });
  }

  /**
   * Log email operation
   */
  emailOperation(
    operation: string,
    recipient: string,
    success: boolean,
    context: LogContext = {}
  ): void {
    const level = success ? 'info' : 'error';
    this.log(level, `Email ${operation} to ${recipient}`, {
      ...context,
      component: 'email',
      action: operation,
      metadata: {
        recipient,
        success,
      },
    });
  }

  /**
   * Log calendar operation
   */
  calendarOperation(
    operation: string,
    eventId: string,
    success: boolean,
    context: LogContext = {}
  ): void {
    const level = success ? 'info' : 'error';
    this.log(level, `Calendar ${operation} for event ${eventId}`, {
      ...context,
      component: 'calendar',
      action: operation,
      metadata: {
        eventId,
        success,
      },
    });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error,
    performance?: { duration?: number; memoryUsage?: NodeJS.MemoryUsage }
  ): void {
    // Check if we should log this level
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      } : undefined,
      performance,
      tags: this.generateTags(level, context),
    };

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Add to buffer for batch processing
    if (this.config.enableDatabase) {
      this.logBuffer.push(logEntry);

      // Flush if buffer is full
      if (this.logBuffer.length >= this.config.batchSize) {
        this.flush();
      }
    }

    // External logging (e.g., Sentry)
    if (this.config.enableExternal && level === 'error') {
      this.logToExternal(logEntry);
    }
  }

  /**
   * Check if we should log this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context.component ? `[${entry.context.component}]` : '';
    const message = `${timestamp} ${level} ${context} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.context, entry.error);
        break;
      case 'info':
        console.info(message, entry.context, entry.performance);
        break;
      case 'warn':
        console.warn(message, entry.context, entry.error);
        break;
      case 'error':
      case 'fatal':
        console.error(message, entry.context, entry.error);
        break;
    }
  }

  /**
   * Log to external service (e.g., Sentry)
   */
  private logToExternal(entry: LogEntry): void {
    if (env.SENTRY_DSN) {
      // In a real implementation, you would integrate with Sentry here
      console.log('Would send to external service:', entry);
    }
  }

  /**
   * Flush logs to database
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const { error } = await this.supabase
        .from('application_logs')
        .insert(logsToFlush.map(log => ({
          id: log.id,
          timestamp: log.timestamp.toISOString(),
          level: log.level,
          message: log.message,
          context: log.context,
          error: log.error,
          performance: log.performance,
          tags: log.tags,
        })));

      if (error) {
        console.error('Failed to flush logs to database:', error);
        // Re-add logs to buffer for retry
        this.logBuffer.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Error flushing logs:', error);
      // Re-add logs to buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    const tables = [
      {
        name: 'application_logs',
        sql: `
          CREATE TABLE IF NOT EXISTS application_logs (
            id UUID PRIMARY KEY,
            timestamp TIMESTAMPTZ NOT NULL,
            level VARCHAR(10) NOT NULL,
            message TEXT NOT NULL,
            context JSONB,
            error JSONB,
            performance JSONB,
            tags TEXT[],
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `,
      },
      {
        name: 'error_tracking',
        sql: `
          CREATE TABLE IF NOT EXISTS error_tracking (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            error_id VARCHAR(255) NOT NULL,
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
      {
        name: 'performance_metrics',
        sql: `
          CREATE TABLE IF NOT EXISTS performance_metrics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            metric_name VARCHAR(100) NOT NULL,
            metric_value DECIMAL NOT NULL,
            metric_unit VARCHAR(20),
            context JSONB,
            tags TEXT[],
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate tags for log entry
   */
  private generateTags(level: LogLevel, context: LogContext): string[] {
    const tags: string[] = [level];

    if (context.component) {
      tags.push(`component:${context.component}`);
    }

    if (context.action) {
      tags.push(`action:${context.action}`);
    }

    if (context.userId) {
      tags.push('user-action');
    }

    return tags;
  }

  /**
   * Clean up old logs
   */
  async cleanup(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.maxRetentionDays);

      const { error } = await this.supabase
        .from('application_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to cleanup old logs:', error);
      } else {
        console.log(`🧹 Cleaned up logs older than ${this.config.maxRetentionDays} days`);
      }
    } catch (error) {
      console.error('Error cleaning up logs:', error);
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats(): Promise<{
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsByComponent: Record<string, number>;
    recentErrors: number;
  }> {
    try {
      const { data: totalLogs } = await this.supabase
        .from('application_logs')
        .select('*', { count: 'exact', head: true });

      const { data: logsByLevel } = await this.supabase
        .from('application_logs')
        .select('level')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: recentErrors } = await this.supabase
        .from('application_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'error')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const levelCounts: Record<string, number> = {};
      const componentCounts: Record<string, number> = {};

      logsByLevel?.forEach(log => {
        levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
      });

      return {
        totalLogs: totalLogs?.length || 0,
        logsByLevel: levelCounts,
        logsByComponent: componentCounts,
        recentErrors: recentErrors?.length || 0,
      };
    } catch (error) {
      console.error('Error getting log stats:', error);
      return {
        totalLogs: 0,
        logsByLevel: {},
        logsByComponent: {},
        recentErrors: 0,
      };
    }
  }

  /**
   * Shutdown the logging service
   */
  async shutdown(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
    console.log('✅ Logging service shutdown');
  }
}

// Export singleton instance
export const loggingService = new LoggingService();
