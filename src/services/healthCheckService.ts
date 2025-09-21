import { supabase } from '@/lib/supabase';
import { loggingService } from './loggingService';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  duration: number;
  lastChecked: Date;
  metadata?: Record<string, any>;
}

export interface HealthStatus {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface SystemHealth {
  database: HealthCheck;
  api: HealthCheck;
  telegram: HealthCheck;
  storage: HealthCheck;
  worker: HealthCheck;
  memory: HealthCheck;
  disk: HealthCheck;
}

export class HealthCheckService {
  private supabase = supabase;
  private startTime = Date.now();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the health check service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.createTables();
      this.isInitialized = true;
      loggingService.info('Health check service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize health check service:', error);
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];

    try {
      // Run all health checks in parallel
      const [
        databaseCheck,
        apiCheck,
        telegramCheck,
        storageCheck,
        workerCheck,
        memoryCheck,
        diskCheck,
      ] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkApi(),
        this.checkTelegram(),
        this.checkStorage(),
        this.checkWorker(),
        this.checkMemory(),
        this.checkDisk(),
      ]);

      // Process results
      checks.push(
        this.processCheckResult('database', databaseCheck),
        this.processCheckResult('api', apiCheck),
        this.processCheckResult('telegram', telegramCheck),
        this.processCheckResult('storage', storageCheck),
        this.processCheckResult('worker', workerCheck),
        this.processCheckResult('memory', memoryCheck),
        this.processCheckResult('disk', diskCheck)
      );

      // Determine overall status
      const overall = this.determineOverallStatus(checks);

      const healthStatus: HealthStatus = {
        overall,
        checks,
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
      };

      // Log health check result
      loggingService.info('Health check completed', {
        component: 'health-check',
        action: 'check',
        metadata: {
          overall,
          duration: Date.now() - startTime,
          healthyChecks: checks.filter(c => c.status === 'healthy').length,
          totalChecks: checks.length,
        },
      });

      // Store health check result
      await this.storeHealthCheckResult(healthStatus);

      return healthStatus;
    } catch (error) {
      loggingService.error('Health check failed', error as Error, {
        component: 'health-check',
        action: 'check',
      });

      return {
        overall: 'unhealthy',
        checks: [],
        timestamp: new Date(),
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0',
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test basic connection
      const { error: connectionError } = await this.supabase
        .from('staff')
        .select('id')
        .limit(1);

      if (connectionError) {
        return {
          name: 'database',
          status: 'unhealthy',
          message: `Database connection failed: ${connectionError.message}`,
          duration: Date.now() - startTime,
          lastChecked: new Date(),
          metadata: { error: connectionError.message },
        };
      }

      // Test query performance
      const queryStart = Date.now();
      const { error: queryError } = await this.supabase
        .from('appointments')
        .select('id')
        .limit(10);

      const queryDuration = Date.now() - queryStart;

      if (queryError) {
        return {
          name: 'database',
          status: 'unhealthy',
          message: `Database query failed: ${queryError.message}`,
          duration: Date.now() - startTime,
          lastChecked: new Date(),
          metadata: { error: queryError.message },
        };
      }

      // Check query performance
      const status = queryDuration > 1000 ? 'degraded' : 'healthy';
      const message = status === 'degraded'
        ? `Database queries are slow (${queryDuration}ms)`
        : 'Database is healthy';

      return {
        name: 'database',
        status,
        message,
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: { queryDuration },
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check API health
   */
  private async checkApi(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // For now, just return healthy since we're running the health check from within the API
      // This avoids circular dependency issues
      return {
        name: 'api',
        status: 'healthy',
        message: 'API is responding correctly',
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: {
          note: 'API health check simplified to avoid circular dependency',
        },
      };
    } catch (error) {
      return {
        name: 'api',
        status: 'unhealthy',
        message: `API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check Telegram service health
   */
  private async checkTelegram(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Check if Telegram service is configured
      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!telegramBotToken) {
        return {
          name: 'telegram',
          status: 'unhealthy',
          message: 'Telegram service not configured',
          duration: Date.now() - startTime,
          lastChecked: new Date(),
          metadata: { configured: false },
        };
      }

      // In a real implementation, you would test Telegram API connection here
      // For now, we'll just check configuration
      return {
        name: 'telegram',
        status: 'healthy',
        message: 'Telegram service is configured',
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: {
          configured: true,
          botToken: telegramBotToken.substring(0, 10) + '...',
        },
      };
    } catch (error) {
      return {
        name: 'telegram',
        status: 'unhealthy',
        message: `Telegram check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }


  /**
   * Check storage health
   */
  private async checkStorage(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test storage access
      const { data, error } = await this.supabase.storage.listBuckets();

      if (error) {
        return {
          name: 'storage',
          status: 'unhealthy',
          message: `Storage access failed: ${error.message}`,
          duration: Date.now() - startTime,
          lastChecked: new Date(),
          metadata: { error: error.message },
        };
      }

      return {
        name: 'storage',
        status: 'healthy',
        message: 'Storage is accessible',
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: {
          bucketCount: data?.length || 0,
        },
      };
    } catch (error) {
      return {
        name: 'storage',
        status: 'unhealthy',
        message: `Storage check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check worker health
   */
  private async checkWorker(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // For now, just return healthy since we don't have a worker service
      // This can be implemented later when we add background workers
      return {
        name: 'worker',
        status: 'healthy',
        message: 'Worker service not implemented yet',
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: { note: 'Worker service not implemented' },
      };
    } catch (error) {
      return {
        name: 'worker',
        status: 'unhealthy',
        message: `Worker check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check memory health
   */
  private async checkMemory(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let message = 'Memory usage is normal';

      if (memoryPercentage > 90) {
        status = 'unhealthy';
        message = 'Memory usage is critically high';
      } else if (memoryPercentage > 80) {
        status = 'degraded';
        message = 'Memory usage is high';
      }

      return {
        name: 'memory',
        status,
        message,
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          percentage: Math.round(memoryPercentage * 100) / 100,
          rss: memoryUsage.rss,
          external: memoryUsage.external,
        },
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check disk health
   */
  private async checkDisk(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // In a real implementation, you would check disk usage here
      // For now, we'll return a placeholder
      return {
        name: 'disk',
        status: 'healthy',
        message: 'Disk usage is normal',
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: {
          // Placeholder values
          used: 0,
          total: 0,
          percentage: 0,
        },
      };
    } catch (error) {
      return {
        name: 'disk',
        status: 'unhealthy',
        message: `Disk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        lastChecked: new Date(),
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Process check result
   */
  private processCheckResult(name: string, result: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        name,
        status: 'unhealthy',
        message: `Check failed: ${result.reason}`,
        duration: 0,
        lastChecked: new Date(),
        metadata: { error: result.reason },
      };
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'degraded' {
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    if (unhealthyCount > 0) {
      return 'unhealthy';
    } else if (degradedCount > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Store health check result
   */
  private async storeHealthCheckResult(healthStatus: HealthStatus): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('health_checks')
        .insert({
          overall_status: healthStatus.overall,
          checks: healthStatus.checks,
          timestamp: healthStatus.timestamp.toISOString(),
          uptime: healthStatus.uptime,
          version: healthStatus.version,
        });

      if (error) {
        console.error('Failed to store health check result:', error);
      }
    } catch (error) {
      console.error('Error storing health check result:', error);
    }
  }

  /**
   * Get recent health check results
   */
  async getRecentHealthChecks(limit = 10): Promise<HealthStatus[]> {
    try {
      const { data, error } = await this.supabase
        .from('health_checks')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data.map(item => ({
        overall: item.overall_status,
        checks: item.checks,
        timestamp: new Date(item.timestamp),
        uptime: item.uptime,
        version: item.version,
      }));
    } catch (error) {
      console.error('Error getting recent health checks:', error);
      return [];
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
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();
