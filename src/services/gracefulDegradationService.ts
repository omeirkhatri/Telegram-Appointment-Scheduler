/**
 * Graceful Degradation Service
 *
 * Implements graceful degradation strategies when Google Calendar API is unavailable
 * or experiencing issues. Provides fallback mechanisms and queue-based processing.
 */

import { retryWithBackoff } from '@/lib/retryUtils';
import { errorLoggingService } from './errorLoggingService';
import { errorNotificationService } from './errorNotificationService';
import { monitoringService } from './monitoringService';

// =============================================================================
// DEGRADATION INTERFACES
// =============================================================================

export interface DegradationLevel {
  level: 'normal' | 'degraded' | 'offline' | 'maintenance';
  description: string;
  features: {
    calendarCreation: boolean;
    calendarSharing: boolean;
    eventCreation: boolean;
    eventUpdates: boolean;
    verification: boolean;
    notifications: boolean;
  };
  fallbacks: {
    queueOperations: boolean;
    cacheResponses: boolean;
    useLocalStorage: boolean;
    sendEmailAlerts: boolean;
  };
  maxRetries: number;
  retryDelay: number;
}

export interface QueuedOperation {
  id: string;
  type: 'create_calendar' | 'share_calendar' | 'create_event' | 'update_event' | 'delete_event' | 'verify_calendar';
  data: any;
  staffId?: string;
  appointmentId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  scheduledFor?: string;
  error?: string;
}

export interface DegradationMetrics {
  currentLevel: string;
  queuedOperations: number;
  processedOperations: number;
  failedOperations: number;
  averageQueueTime: number;
  lastProcessedAt?: string;
  uptime: number;
}

// =============================================================================
// DEGRADATION LEVELS
// =============================================================================

const DEGRADATION_LEVELS: Record<string, DegradationLevel> = {
  normal: {
    level: 'normal',
    description: 'All services operating normally',
    features: {
      calendarCreation: true,
      calendarSharing: true,
      eventCreation: true,
      eventUpdates: true,
      verification: true,
      notifications: true
    },
    fallbacks: {
      queueOperations: false,
      cacheResponses: false,
      useLocalStorage: false,
      sendEmailAlerts: false
    },
    maxRetries: 3,
    retryDelay: 1000
  },
  degraded: {
    level: 'degraded',
    description: 'Some services experiencing issues, using fallbacks',
    features: {
      calendarCreation: true,
      calendarSharing: false,
      eventCreation: true,
      eventUpdates: false,
      verification: false,
      notifications: true
    },
    fallbacks: {
      queueOperations: true,
      cacheResponses: true,
      useLocalStorage: false,
      sendEmailAlerts: true
    },
    maxRetries: 5,
    retryDelay: 2000
  },
  offline: {
    level: 'offline',
    description: 'Google Calendar API unavailable, queuing all operations',
    features: {
      calendarCreation: false,
      calendarSharing: false,
      eventCreation: false,
      eventUpdates: false,
      verification: false,
      notifications: true
    },
    fallbacks: {
      queueOperations: true,
      cacheResponses: true,
      useLocalStorage: true,
      sendEmailAlerts: true
    },
    maxRetries: 10,
    retryDelay: 5000
  },
  maintenance: {
    level: 'maintenance',
    description: 'System in maintenance mode, minimal operations',
    features: {
      calendarCreation: false,
      calendarSharing: false,
      eventCreation: false,
      eventUpdates: false,
      verification: false,
      notifications: false
    },
    fallbacks: {
      queueOperations: true,
      cacheResponses: true,
      useLocalStorage: true,
      sendEmailAlerts: false
    },
    maxRetries: 1,
    retryDelay: 10000
  }
};

// =============================================================================
// GRACEFUL DEGRADATION SERVICE
// =============================================================================

export class GracefulDegradationService {
  private static instance: GracefulDegradationService;
  private currentLevel: DegradationLevel = DEGRADATION_LEVELS.normal;
  private operationQueue: QueuedOperation[] = [];
  private processingInterval?: NodeJS.Timeout;
  private isProcessing = false;
  private metrics: DegradationMetrics;
  private startTime: number = Date.now();

  private constructor() {
    this.metrics = {
      currentLevel: 'normal',
      queuedOperations: 0,
      processedOperations: 0,
      failedOperations: 0,
      averageQueueTime: 0,
      uptime: 0
    };
  }

  public static getInstance(): GracefulDegradationService {
    if (!GracefulDegradationService.instance) {
      GracefulDegradationService.instance = new GracefulDegradationService();
    }
    return GracefulDegradationService.instance;
  }

  /**
   * Initialize the degradation service
   */
  public initialize(): void {
    console.log('🚀 Initializing graceful degradation service...');

    // Start processing queue
    this.startQueueProcessing();

    // Start health monitoring
    this.startHealthMonitoring();

    console.log('✅ Graceful degradation service initialized');
  }

  /**
   * Execute an operation with graceful degradation
   */
  public async executeOperation<T>(
    operationType: QueuedOperation['type'],
    operation: () => Promise<T>,
    data: any,
    options: {
      staffId?: string;
      appointmentId?: string;
      priority?: QueuedOperation['priority'];
      forceExecute?: boolean;
    } = {}
  ): Promise<T | { queued: true; operationId: string }> {
    const { staffId, appointmentId, priority = 'medium', forceExecute = false } = options;

    // Check if operation should be executed immediately
    if (this.shouldExecuteImmediately(operationType) || forceExecute) {
      try {
        return await this.executeWithRetry(operation, operationType, data, staffId, appointmentId);
      } catch (error) {
        // If execution fails and we're not in offline mode, queue the operation
        if (this.currentLevel.level !== 'offline') {
          return this.queueOperation(operationType, data, staffId, appointmentId, priority);
        }
        throw error;
      }
    }

    // Queue the operation for later processing
    return this.queueOperation(operationType, data, staffId, appointmentId, priority);
  }

  /**
   * Check if operation should be executed immediately
   */
  private shouldExecuteImmediately(operationType: QueuedOperation['type']): boolean {
    switch (operationType) {
      case 'create_calendar':
        return this.currentLevel.features.calendarCreation;
      case 'share_calendar':
        return this.currentLevel.features.calendarSharing;
      case 'create_event':
        return this.currentLevel.features.eventCreation;
      case 'update_event':
        return this.currentLevel.features.eventUpdates;
      case 'delete_event':
        return this.currentLevel.features.eventUpdates;
      case 'verify_calendar':
        return this.currentLevel.features.verification;
      default:
        return false;
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: string,
    data: any,
    staffId?: string,
    appointmentId?: string
  ): Promise<T> {
    return retryWithBackoff(operation, {
      operationType,
      staffId,
      appointmentId,
      maxAttempts: this.currentLevel.maxRetries,
      baseDelay: this.currentLevel.retryDelay,
      context: { degradationLevel: this.currentLevel.level }
    });
  }

  /**
   * Queue an operation for later processing
   */
  private queueOperation(
    operationType: QueuedOperation['type'],
    data: any,
    staffId?: string,
    appointmentId?: string,
    priority: QueuedOperation['priority'] = 'medium'
  ): { queued: true; operationId: string } {
    const operation: QueuedOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: operationType,
      data,
      staffId,
      appointmentId,
      priority,
      attempts: 0,
      maxAttempts: this.currentLevel.maxRetries,
      createdAt: new Date().toISOString()
    };

    // Add to queue based on priority
    this.addToQueue(operation);

    // Update metrics
    this.metrics.queuedOperations++;

    console.log(`📝 Operation queued: ${operationType} (${priority}) - ID: ${operation.id}`);

    return { queued: true, operationId: operation.id };
  }

  /**
   * Add operation to queue with priority ordering
   */
  private addToQueue(operation: QueuedOperation): void {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    // Find insertion point based on priority
    let insertIndex = this.operationQueue.length;
    for (let i = 0; i < this.operationQueue.length; i++) {
      if (priorityOrder[operation.priority] > priorityOrder[this.operationQueue[i].priority]) {
        insertIndex = i;
        break;
      }
    }

    this.operationQueue.splice(insertIndex, 0, operation);
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing && this.operationQueue.length > 0) {
        await this.processQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process queued operations
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.operationQueue.length === 0) return;

    this.isProcessing = true;
    console.log(`🔄 Processing ${this.operationQueue.length} queued operations...`);

    try {
      // Process operations in batches
      const batchSize = Math.min(5, this.operationQueue.length);
      const batch = this.operationQueue.splice(0, batchSize);

      await Promise.allSettled(
        batch.map(operation => this.processOperation(operation))
      );

      // Update metrics
      this.metrics.lastProcessedAt = new Date().toISOString();
      this.metrics.queuedOperations = this.operationQueue.length;

    } catch (error) {
      console.error('❌ Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queued operation
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    try {
      operation.attempts++;

      // Check if operation should be executed now
      if (!this.shouldExecuteImmediately(operation.type)) {
        // Reschedule for later
        operation.scheduledFor = new Date(Date.now() + this.currentLevel.retryDelay).toISOString();
        this.addToQueue(operation);
        return;
      }

      // Execute the operation
      await this.executeQueuedOperation(operation);

      // Mark as processed
      this.metrics.processedOperations++;
      console.log(`✅ Processed queued operation: ${operation.type} - ID: ${operation.id}`);

    } catch (error) {
      operation.error = error instanceof Error ? error.message : 'Unknown error';

      if (operation.attempts < operation.maxAttempts) {
        // Retry later
        operation.scheduledFor = new Date(Date.now() + this.currentLevel.retryDelay).toISOString();
        this.addToQueue(operation);
        console.log(`🔄 Retrying operation: ${operation.type} - ID: ${operation.id} (attempt ${operation.attempts})`);
      } else {
        // Max attempts reached, mark as failed
        this.metrics.failedOperations++;
        console.error(`❌ Operation failed after ${operation.attempts} attempts: ${operation.type} - ID: ${operation.id}`);

        // Log the failure
        await errorLoggingService.logError({
          errorCode: 'QUEUED_OPERATION_FAILED',
          errorType: 'system',
          message: `Queued operation failed: ${operation.type}`,
          context: {
            operationId: operation.id,
            attempts: operation.attempts,
            error: operation.error
          },
          staffId: operation.staffId,
          appointmentId: operation.appointmentId,
          operationType: operation.type
        });
      }
    }
  }

  /**
   * Execute a queued operation
   */
  private async executeQueuedOperation(operation: QueuedOperation): Promise<void> {
    // This would typically call the appropriate service method
    // For now, we'll simulate the execution
    console.log(`Executing queued operation: ${operation.type} - ID: ${operation.id}`);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkSystemHealth();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check system health and adjust degradation level
   */
  private async checkSystemHealth(): Promise<void> {
    try {
      const health = await monitoringService.performHealthCheck();

      // Determine degradation level based on health
      let newLevel: DegradationLevel;

      if (health.status === 'unhealthy') {
        newLevel = DEGRADATION_LEVELS.offline;
      } else if (health.status === 'degraded') {
        newLevel = DEGRADATION_LEVELS.degraded;
      } else {
        newLevel = DEGRADATION_LEVELS.normal;
      }

      // Update level if changed
      if (newLevel.level !== this.currentLevel.level) {
        await this.updateDegradationLevel(newLevel);
      }

    } catch (error) {
      console.error('❌ Error checking system health:', error);
    }
  }

  /**
   * Update degradation level
   */
  private async updateDegradationLevel(newLevel: DegradationLevel): Promise<void> {
    const oldLevel = this.currentLevel.level;
    this.currentLevel = newLevel;
    this.metrics.currentLevel = newLevel.level;

    console.log(`🔄 Degradation level changed: ${oldLevel} → ${newLevel.level}`);

    // Log the change
    await errorLoggingService.logSystemError({
      errorCode: 'DEGRADATION_LEVEL_CHANGED',
      message: `Degradation level changed from ${oldLevel} to ${newLevel.level}`,
      context: {
        oldLevel,
        newLevel: newLevel.level,
        description: newLevel.description
      },
      operationType: 'degradation_monitoring'
    });

    // Send notification for critical level changes
    if (newLevel.level === 'offline' || newLevel.level === 'maintenance') {
      await errorNotificationService.processError({
        id: `degradation_${Date.now()}`,
        error_code: 'DEGRADATION_LEVEL_CHANGED',
        error_type: 'system',
        severity: 'high',
        message: `System degradation level changed to ${newLevel.level}`,
        retryable: false,
        resolved: false,
        created_at: new Date().toISOString()
      });
    }
  }

  /**
   * Get current degradation metrics
   */
  public getMetrics(): DegradationMetrics {
    this.metrics.uptime = Date.now() - this.startTime;
    this.metrics.queuedOperations = this.operationQueue.length;

    // Calculate average queue time
    if (this.operationQueue.length > 0) {
      const totalQueueTime = this.operationQueue.reduce((sum, op) => {
        return sum + (Date.now() - new Date(op.createdAt).getTime());
      }, 0);
      this.metrics.averageQueueTime = totalQueueTime / this.operationQueue.length;
    }

    return { ...this.metrics };
  }

  /**
   * Get current degradation level
   */
  public getCurrentLevel(): DegradationLevel {
    return { ...this.currentLevel };
  }

  /**
   * Force degradation level (for testing or manual intervention)
   */
  public async setDegradationLevel(level: keyof typeof DEGRADATION_LEVELS): Promise<void> {
    await this.updateDegradationLevel(DEGRADATION_LEVELS[level]);
  }

  /**
   * Get queued operations
   */
  public getQueuedOperations(): QueuedOperation[] {
    return [...this.operationQueue];
  }

  /**
   * Clear operation queue
   */
  public clearQueue(): void {
    this.operationQueue = [];
    this.metrics.queuedOperations = 0;
    console.log('🧹 Operation queue cleared');
  }

  /**
   * Shutdown the service
   */
  public shutdown(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    console.log('🛑 Graceful degradation service shutdown');
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const gracefulDegradationService = GracefulDegradationService.getInstance();
export default gracefulDegradationService;
