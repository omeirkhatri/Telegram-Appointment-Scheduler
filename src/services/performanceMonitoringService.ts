import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { loggingService } from './loggingService';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context: {
    component?: string;
    action?: string;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  };
  tags: string[];
}

export interface PerformanceStats {
  totalMetrics: number;
  metricsByName: Record<string, {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  }>;
  recentMetrics: number;
  slowestOperations: Array<{
    name: string;
    average: number;
    count: number;
  }>;
}

export interface HealthMetrics {
  database: {
    connectionTime: number;
    queryTime: number;
    isHealthy: boolean;
  };
  api: {
    averageResponseTime: number;
    errorRate: number;
    isHealthy: boolean;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    isHealthy: boolean;
  };
  cpu: {
    usage: number;
    isHealthy: boolean;
  };
}

export class PerformanceMonitoringService {
  private supabase = supabase;
  private metricsBuffer: PerformanceMetric[] = [];
  private isInitialized = false;
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the performance monitoring service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.createTables();
      this.startFlushTimer();
      this.isInitialized = true;
      loggingService.info('Performance monitoring service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize performance monitoring service:', error);
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    context: PerformanceMetric['context'] = {},
    tags: string[] = []
  ): void {
    const metric: PerformanceMetric = {
      id: uuidv4(),
      name,
      value,
      unit,
      timestamp: new Date(),
      context,
      tags,
    };

    this.metricsBuffer.push(metric);

    // Log performance metric
    loggingService.performance(`Metric recorded: ${name}`, value, {
      component: 'performance-monitoring',
      action: 'record',
      metadata: {
        name,
        unit,
        context,
        tags,
      },
    });

    // Flush if buffer is full
    if (this.metricsBuffer.length >= 100) {
      this.flush();
    }
  }

  /**
   * Record API response time
   */
  recordApiResponseTime(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context: PerformanceMetric['context'] = {}
  ): void {
    this.recordMetric(
      'api_response_time',
      duration,
      'ms',
      {
        ...context,
        component: 'api',
        action: 'request',
        metadata: {
          method,
          path,
          statusCode,
          ...context.metadata,
        },
      },
      [`method:${method}`, `path:${path}`, `status:${statusCode}`]
    );
  }

  /**
   * Record database operation time
   */
  recordDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    context: PerformanceMetric['context'] = {}
  ): void {
    this.recordMetric(
      'database_operation_time',
      duration,
      'ms',
      {
        ...context,
        component: 'database',
        action: operation,
        metadata: {
          operation,
          table,
          ...context.metadata,
        },
      },
      [`operation:${operation}`, `table:${table}`]
    );
  }

  /**
   * Record email operation time
   */
  recordEmailOperation(
    operation: string,
    duration: number,
    context: PerformanceMetric['context'] = {}
  ): void {
    this.recordMetric(
      'email_operation_time',
      duration,
      'ms',
      {
        ...context,
        component: 'email',
        action: operation,
        metadata: {
          operation,
          ...context.metadata,
        },
      },
      [`operation:${operation}`]
    );
  }

  /**
   * Record calendar operation time
   */
  recordCalendarOperation(
    operation: string,
    duration: number,
    context: PerformanceMetric['context'] = {}
  ): void {
    this.recordMetric(
      'calendar_operation_time',
      duration,
      'ms',
      {
        ...context,
        component: 'calendar',
        action: operation,
        metadata: {
          operation,
          ...context.metadata,
        },
      },
      [`operation:${operation}`]
    );
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(context: PerformanceMetric['context'] = {}): void {
    const memoryUsage = process.memoryUsage();

    this.recordMetric(
      'memory_heap_used',
      memoryUsage.heapUsed,
      'bytes',
      {
        ...context,
        component: 'system',
        action: 'memory',
        metadata: {
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
          ...context.metadata,
        },
      },
      ['type:heap']
    );

    this.recordMetric(
      'memory_rss',
      memoryUsage.rss,
      'bytes',
      {
        ...context,
        component: 'system',
        action: 'memory',
        metadata: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          ...context.metadata,
        },
      },
      ['type:rss']
    );
  }

  /**
   * Record CPU usage
   */
  recordCpuUsage(usage: number, context: PerformanceMetric['context'] = {}): void {
    this.recordMetric(
      'cpu_usage',
      usage,
      'percent',
      {
        ...context,
        component: 'system',
        action: 'cpu',
        metadata: {
          ...context.metadata,
        },
      },
      ['type:cpu']
    );
  }

  /**
   * Record user action time
   */
  recordUserAction(
    action: string,
    duration: number,
    context: PerformanceMetric['context'] = {}
  ): void {
    this.recordMetric(
      'user_action_time',
      duration,
      'ms',
      {
        ...context,
        component: 'user',
        action,
        metadata: {
          ...context.metadata,
        },
      },
      [`action:${action}`]
    );
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(timeRange: number = 24 * 60 * 60 * 1000): Promise<PerformanceStats> {
    try {
      const since = new Date(Date.now() - timeRange);

      const { data: metrics, error } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', since.toISOString());

      if (error) {
        throw error;
      }

      const stats: PerformanceStats = {
        totalMetrics: metrics?.length || 0,
        metricsByName: {},
        recentMetrics: metrics?.length || 0,
        slowestOperations: [],
      };

      // Group metrics by name
      const metricsByName = new Map<string, number[]>();
      metrics?.forEach(metric => {
        if (!metricsByName.has(metric.metric_name)) {
          metricsByName.set(metric.metric_name, []);
        }
        metricsByName.get(metric.metric_name)!.push(metric.metric_value);
      });

      // Calculate statistics for each metric
      metricsByName.forEach((values, name) => {
        const sortedValues = values.sort((a, b) => a - b);
        const count = values.length;
        const average = values.reduce((sum, val) => sum + val, 0) / count;
        const min = sortedValues[0];
        const max = sortedValues[count - 1];
        const p95Index = Math.floor(count * 0.95);
        const p99Index = Math.floor(count * 0.99);

        stats.metricsByName[name] = {
          count,
          average: Math.round(average * 100) / 100,
          min,
          max,
          p95: sortedValues[p95Index] || 0,
          p99: sortedValues[p99Index] || 0,
        };
      });

      // Find slowest operations
      Object.entries(stats.metricsByName)
        .filter(([name]) => name.includes('_time'))
        .sort(([, a], [, b]) => b.average - a.average)
        .slice(0, 10)
        .forEach(([name, stat]) => {
          stats.slowestOperations.push({
            name,
            average: stat.average,
            count: stat.count,
          });
        });

      return stats;
    } catch (error) {
      console.error('Error getting performance stats:', error);
      return {
        totalMetrics: 0,
        metricsByName: {},
        recentMetrics: 0,
        slowestOperations: [],
      };
    }
  }

  /**
   * Get health metrics
   */
  async getHealthMetrics(): Promise<HealthMetrics> {
    try {
      const healthMetrics: HealthMetrics = {
        database: {
          connectionTime: 0,
          queryTime: 0,
          isHealthy: false,
        },
        api: {
          averageResponseTime: 0,
          errorRate: 0,
          isHealthy: false,
        },
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
          isHealthy: false,
        },
        cpu: {
          usage: 0,
          isHealthy: false,
        },
      };

      // Get database metrics
      const dbStart = Date.now();
      const { error: dbError } = await this.supabase
        .from('performance_metrics')
        .select('id')
        .limit(1);
      const dbTime = Date.now() - dbStart;

      healthMetrics.database.connectionTime = dbTime;
      healthMetrics.database.isHealthy = !dbError && dbTime < 1000;

      // Get API metrics
      const { data: apiMetrics } = await this.supabase
        .from('performance_metrics')
        .select('metric_value')
        .eq('metric_name', 'api_response_time')
        .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (apiMetrics && apiMetrics.length > 0) {
        const totalTime = apiMetrics.reduce((sum, m) => sum + m.metric_value, 0);
        healthMetrics.api.averageResponseTime = totalTime / apiMetrics.length;
        healthMetrics.api.isHealthy = healthMetrics.api.averageResponseTime < 2000;
      }

      // Get memory metrics
      const memoryUsage = process.memoryUsage();
      healthMetrics.memory.used = memoryUsage.heapUsed;
      healthMetrics.memory.total = memoryUsage.heapTotal;
      healthMetrics.memory.percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      healthMetrics.memory.isHealthy = healthMetrics.memory.percentage < 80;

      // CPU usage would need to be implemented with a system monitoring library
      healthMetrics.cpu.usage = 0; // Placeholder
      healthMetrics.cpu.isHealthy = true; // Placeholder

      return healthMetrics;
    } catch (error) {
      console.error('Error getting health metrics:', error);
      return {
        database: { connectionTime: 0, queryTime: 0, isHealthy: false },
        api: { averageResponseTime: 0, errorRate: 0, isHealthy: false },
        memory: { used: 0, total: 0, percentage: 0, isHealthy: false },
        cpu: { usage: 0, isHealthy: false },
      };
    }
  }

  /**
   * Flush metrics to database
   */
  async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      const { error } = await this.supabase
        .from('performance_metrics')
        .insert(metricsToFlush.map(metric => ({
          id: metric.id,
          metric_name: metric.name,
          metric_value: metric.value,
          metric_unit: metric.unit,
          context: metric.context,
          tags: metric.tags,
          timestamp: metric.timestamp.toISOString(),
        })));

      if (error) {
        console.error('Failed to flush metrics to database:', error);
        // Re-add metrics to buffer for retry
        this.metricsBuffer.unshift(...metricsToFlush);
      }
    } catch (error) {
      console.error('Error flushing metrics:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
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
   * Note: Tables are now created via database migrations
   */
  private async createTables(): Promise<void> {
    // Tables are created via database migrations
    // This method is kept for compatibility but does nothing
    console.log('✅ Database tables are managed via migrations');
  }

  /**
   * Clean up old metrics
   */
  async cleanup(maxRetentionDays: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxRetentionDays);

      const { error } = await this.supabase
        .from('performance_metrics')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to cleanup old metrics:', error);
      } else {
        console.log(`🧹 Cleaned up metrics older than ${maxRetentionDays} days`);
      }
    } catch (error) {
      console.error('Error cleaning up metrics:', error);
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
    loggingService.info('Performance monitoring service shutdown');
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();
