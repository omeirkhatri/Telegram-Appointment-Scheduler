/**
 * Monitoring Service
 *
 * Comprehensive monitoring and alerting service for calendar operations.
 * Provides real-time monitoring, health checks, and performance metrics.
 */

import { getRetryStatistics } from '@/lib/retryUtils';
import { errorLoggingService } from './errorLoggingService';
import { errorNotificationService } from './errorNotificationService';
import { errorRecoveryService } from './errorRecoveryService';
import { getGoogleCalendarService } from './googleCalendarService';

// =============================================================================
// MONITORING INTERFACES
// =============================================================================

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    googleCalendar: ServiceHealth;
    errorLogging: ServiceHealth;
    notifications: ServiceHealth;
    recovery: ServiceHealth;
    database: ServiceHealth;
  };
  metrics: {
    errorRate: number;
    responseTime: number;
    uptime: number;
    activeConnections: number;
  };
  alerts: Alert[];
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface Alert {
  id: string;
  type: 'error' | 'performance' | 'availability' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  timestamp: string;
  errorRate: number;
  responseTime: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueSize: number;
}

export interface HealthCheckConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  thresholds: {
    errorRate: number; // percentage
    responseTime: number; // milliseconds
    memoryUsage: number; // percentage
    cpuUsage: number; // percentage
  };
}

// =============================================================================
// MONITORING SERVICE
// =============================================================================

export class MonitoringService {
  private static instance: MonitoringService;
  private healthCheckConfig: HealthCheckConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private alerts: Map<string, Alert> = new Map();
  private performanceHistory: PerformanceMetrics[] = [];
  private startTime: number = Date.now();

  private constructor() {
    this.healthCheckConfig = {
      interval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      retries: 3,
      thresholds: {
        errorRate: 5, // 5%
        responseTime: 5000, // 5 seconds
        memoryUsage: 80, // 80%
        cpuUsage: 80 // 80%
      }
    };
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Start monitoring service
   */
  public start(): void {
    if (this.healthCheckInterval) {
      console.log('⚠️ Monitoring service already running');
      return;
    }

    console.log('🚀 Starting monitoring service...');

    // Start health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, this.healthCheckConfig.interval);

    // Start performance monitoring
    this.startPerformanceMonitoring();

    console.log('✅ Monitoring service started');
  }

  /**
   * Stop monitoring service
   */
  public stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    console.log('🛑 Monitoring service stopped');
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<SystemHealth> {
    const timestamp = new Date().toISOString();
    const services = await this.checkAllServices();
    const metrics = await this.getCurrentMetrics();
    const alerts = Array.from(this.alerts.values());

    // Determine overall system health
    const serviceStatuses = Object.values(services).map(s => s.status);
    const unhealthyCount = serviceStatuses.filter(s => s === 'unhealthy').length;
    const degradedCount = serviceStatuses.filter(s => s === 'degraded').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0 || metrics.errorRate > this.healthCheckConfig.thresholds.errorRate) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    const health: SystemHealth = {
      status,
      timestamp,
      services,
      metrics,
      alerts: alerts.filter(alert => !alert.resolved)
    };

    // Check for new alerts
    await this.checkForAlerts(health);

    return health;
  }

  /**
   * Check all services
   */
  private async checkAllServices(): Promise<SystemHealth['services']> {
    const [googleCalendar, errorLogging, notifications, recovery, database] = await Promise.allSettled([
      this.checkGoogleCalendarService(),
      this.checkErrorLoggingService(),
      this.checkNotificationService(),
      this.checkRecoveryService(),
      this.checkDatabaseService()
    ]);

    return {
      googleCalendar: googleCalendar.status === 'fulfilled' ? googleCalendar.value : this.createUnhealthyService('Google Calendar', googleCalendar.status === 'rejected' ? googleCalendar.reason : 'Unknown error'),
      errorLogging: errorLogging.status === 'fulfilled' ? errorLogging.value : this.createUnhealthyService('Error Logging', errorLogging.status === 'rejected' ? errorLogging.reason : 'Unknown error'),
      notifications: notifications.status === 'fulfilled' ? notifications.value : this.createUnhealthyService('Notifications', notifications.status === 'rejected' ? notifications.reason : 'Unknown error'),
      recovery: recovery.status === 'fulfilled' ? recovery.value : this.createUnhealthyService('Recovery', recovery.status === 'rejected' ? recovery.reason : 'Unknown error'),
      database: database.status === 'fulfilled' ? database.value : this.createUnhealthyService('Database', database.status === 'rejected' ? database.reason : 'Unknown error')
    };
  }

  /**
   * Check Google Calendar service
   */
  private async checkGoogleCalendarService(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Test service health
      const isHealthy = await getGoogleCalendarService().isHealthy();
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          healthy: isHealthy,
          responseTime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Check error logging service
   */
  private async checkErrorLoggingService(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Test error logging by logging a test error
      const testErrorId = await errorLoggingService.logSystemError({
        errorCode: 'HEALTH_CHECK',
        message: 'Health check test error',
        context: { test: true },
        operationType: 'health_check'
      });

      const responseTime = Date.now() - startTime;

      return {
        status: testErrorId ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          testErrorId,
          responseTime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Check notification service
   */
  private async checkNotificationService(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Test notification service by getting rules
      const rules = errorNotificationService.getNotificationRules();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          ruleCount: rules.length,
          enabledRules: rules.filter(r => r.enabled).length,
          responseTime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Check recovery service
   */
  private async checkRecoveryService(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Test recovery service by getting statistics
      const stats = errorRecoveryService.getRecoveryStatistics();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          ...stats,
          responseTime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Check database service
   */
  private async checkDatabaseService(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Test database by getting error metrics
      const metrics = await errorLoggingService.getErrorMetrics('1h');
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        details: {
          totalErrors: metrics.total_errors,
          responseTime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Get current system metrics
   */
  private async getCurrentMetrics(): Promise<SystemHealth['metrics']> {
    try {
      const errorMetrics = await errorLoggingService.getErrorMetrics('1h');
      const retryStats = getRetryStatistics();

      // Calculate error rate (errors per minute)
      const errorRate = errorMetrics.total_errors / 60; // Assuming 1 hour window

      // Get memory usage (simplified)
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      return {
        errorRate,
        responseTime: 0, // Would need to track this
        uptime: Date.now() - this.startTime,
        activeConnections: retryStats.totalOperations
      };
    } catch (error) {
      console.error('❌ Error getting metrics:', error);
      return {
        errorRate: 0,
        responseTime: 0,
        uptime: Date.now() - this.startTime,
        activeConnections: 0
      };
    }
  }

  /**
   * Check for new alerts
   */
  private async checkForAlerts(health: SystemHealth): Promise<void> {
    // Check for high error rate
    if (health.metrics.errorRate > this.healthCheckConfig.thresholds.errorRate) {
      await this.createAlert({
        type: 'performance',
        severity: 'high',
        title: 'High Error Rate',
        message: `Error rate is ${health.metrics.errorRate.toFixed(2)}% (threshold: ${this.healthCheckConfig.thresholds.errorRate}%)`,
        metadata: { errorRate: health.metrics.errorRate, threshold: this.healthCheckConfig.thresholds.errorRate }
      });
    }

    // Check for unhealthy services
    const unhealthyServices = Object.entries(health.services)
      .filter(([_, service]) => service.status === 'unhealthy')
      .map(([name, _]) => name);

    if (unhealthyServices.length > 0) {
      await this.createAlert({
        type: 'availability',
        severity: 'critical',
        title: 'Unhealthy Services',
        message: `The following services are unhealthy: ${unhealthyServices.join(', ')}`,
        metadata: { unhealthyServices }
      });
    }

    // Check for degraded services
    const degradedServices = Object.entries(health.services)
      .filter(([_, service]) => service.status === 'degraded')
      .map(([name, _]) => name);

    if (degradedServices.length > 0) {
      await this.createAlert({
        type: 'availability',
        severity: 'medium',
        title: 'Degraded Services',
        message: `The following services are degraded: ${degradedServices.join(', ')}`,
        metadata: { degradedServices }
      });
    }
  }

  /**
   * Create a new alert
   */
  private async createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      ...alertData
    };

    this.alerts.set(alert.id, alert);

    // Send notification for critical alerts
    if (alert.severity === 'critical') {
      await errorNotificationService.processError({
        id: alert.id,
        error_code: 'CRITICAL_ALERT',
        error_type: 'system',
        severity: 'critical',
        message: alert.message,
        retryable: false,
        resolved: false,
        created_at: alert.timestamp
      });
    }

    console.log(`🚨 Alert created: ${alert.title} (${alert.severity})`);
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string, resolutionNotes?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();

    if (resolutionNotes) {
      alert.metadata = { ...alert.metadata, resolutionNotes };
    }

    console.log(`✅ Alert resolved: ${alert.title}`);
    return true;
  }

  /**
   * Get all alerts
   */
  public getAlerts(resolved: boolean = false): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => resolved ? alert.resolved : !alert.resolved);
  }

  /**
   * Get performance history
   */
  public getPerformanceHistory(hours: number = 24): PerformanceMetrics[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.performanceHistory.filter(metric =>
      new Date(metric.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000); // Every minute
  }

  /**
   * Collect performance metrics
   */
  private collectPerformanceMetrics(): void {
    const memoryUsage = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      errorRate: 0, // Would need to calculate this
      responseTime: 0, // Would need to track this
      throughput: 0, // Would need to track this
      memoryUsage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      cpuUsage: 0, // Would need to calculate this
      activeConnections: 0, // Would need to track this
      queueSize: 0 // Would need to track this
    };

    this.performanceHistory.push(metrics);

    // Keep only last 24 hours of data
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    this.performanceHistory = this.performanceHistory.filter(metric =>
      new Date(metric.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Create unhealthy service response
   */
  private createUnhealthyService(name: string, error: any): ServiceHealth {
    return {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      details: { service: name }
    };
  }

  /**
   * Get monitoring configuration
   */
  public getConfig(): HealthCheckConfig {
    return { ...this.healthCheckConfig };
  }

  /**
   * Update monitoring configuration
   */
  public updateConfig(config: Partial<HealthCheckConfig>): void {
    this.healthCheckConfig = { ...this.healthCheckConfig, ...config };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const monitoringService = MonitoringService.getInstance();
export default monitoringService;
