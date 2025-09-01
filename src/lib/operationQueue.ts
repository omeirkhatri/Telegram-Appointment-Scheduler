/**
 * Operation queue for handling failed Google Calendar operations
 * Provides persistent retry mechanism for failed operations
 */

import { retryWithBackoff, RETRY_CONFIGS, type RetryResult } from './retryUtils';

export interface QueuedOperation {
  id: string;
  type: 'create_event' | 'update_event' | 'delete_event' | 'sync_calendar';
  data: any;
  staffId: string;
  appointmentId?: string;
  eventId?: string;
  attempts: number;
  maxAttempts: number;
  lastAttempt: Date;
  nextRetry: Date;
  error?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

export interface OperationResult {
  success: boolean;
  operationId: string;
  data?: any;
  error?: string;
  attempts: number;
}

export class OperationQueue {
  private queue: Map<string, QueuedOperation> = new Map();
  private processing: Set<string> = new Set();
  private retryIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Start processing queue
    this.startQueueProcessor();
  }

  /**
   * Add operation to queue
   */
  addOperation(
    type: QueuedOperation['type'],
    data: any,
    staffId: string,
    options: {
      appointmentId?: string;
      eventId?: string;
      priority?: QueuedOperation['priority'];
      maxAttempts?: number;
    } = {}
  ): string {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const priority = options.priority || 'medium';
    const maxAttempts = options.maxAttempts || this.getMaxAttemptsForType(type);

    const operation: QueuedOperation = {
      id: operationId,
      type,
      data,
      staffId,
      appointmentId: options.appointmentId,
      eventId: options.eventId,
      attempts: 0,
      maxAttempts,
      lastAttempt: new Date(),
      nextRetry: new Date(),
      priority,
      createdAt: new Date(),
    };

    this.queue.set(operationId, operation);
    console.log(`Added operation to queue: ${type} for staff ${staffId} (priority: ${priority})`);

    // Schedule immediate processing for high priority operations
    if (priority === 'high' || priority === 'critical') {
      this.scheduleRetry(operationId, 0);
    } else {
      this.scheduleRetry(operationId, this.getRetryDelay(operation));
    }

    return operationId;
  }

  /**
   * Get max attempts for operation type
   */
  private getMaxAttemptsForType(type: QueuedOperation['type']): number {
    switch (type) {
      case 'create_event':
      case 'update_event':
        return RETRY_CONFIGS.write.maxAttempts;
      case 'delete_event':
        return RETRY_CONFIGS.critical.maxAttempts;
      case 'sync_calendar':
        return RETRY_CONFIGS.read.maxAttempts;
      default:
        return RETRY_CONFIGS.write.maxAttempts;
    }
  }

  /**
   * Calculate retry delay based on attempts and priority
   */
  private getRetryDelay(operation: QueuedOperation): number {
    const baseDelay = RETRY_CONFIGS.write.baseDelay;
    const multiplier = Math.pow(2, operation.attempts);
    
    // Higher priority operations get shorter delays
    const priorityMultiplier = {
      critical: 0.5,
      high: 0.75,
      medium: 1,
      low: 1.5,
    }[operation.priority];

    return Math.min(
      baseDelay * multiplier * priorityMultiplier,
      RETRY_CONFIGS.write.maxDelay
    );
  }

  /**
   * Schedule retry for operation
   */
  private scheduleRetry(operationId: string, delay: number): void {
    // Clear existing timeout if any
    const existingTimeout = this.retryIntervals.get(operationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.processOperation(operationId);
    }, delay);

    this.retryIntervals.set(operationId, timeout);
  }

  /**
   * Process a single operation
   */
  private async processOperation(operationId: string): Promise<void> {
    const operation = this.queue.get(operationId);
    if (!operation) {
      return;
    }

    // Check if already processing
    if (this.processing.has(operationId)) {
      return;
    }

    // Check if max attempts reached
    if (operation.attempts >= operation.maxAttempts) {
      console.error(`Operation ${operationId} failed after ${operation.maxAttempts} attempts`);
      this.removeOperation(operationId);
      return;
    }

    this.processing.add(operationId);
    operation.attempts++;
    operation.lastAttempt = new Date();

    try {
      console.log(`Processing operation ${operationId} (attempt ${operation.attempts}/${operation.maxAttempts})`);
      
      const result = await this.executeOperation(operation);
      
      if (result.success) {
        console.log(`Operation ${operationId} completed successfully`);
        this.removeOperation(operationId);
      } else {
        // Schedule retry
        operation.error = result.error;
        operation.nextRetry = new Date(Date.now() + this.getRetryDelay(operation));
        this.scheduleRetry(operationId, this.getRetryDelay(operation));
      }
    } catch (error) {
      console.error(`Error processing operation ${operationId}:`, error);
      operation.error = error instanceof Error ? error.message : String(error);
      operation.nextRetry = new Date(Date.now() + this.getRetryDelay(operation));
      this.scheduleRetry(operationId, this.getRetryDelay(operation));
    } finally {
      this.processing.delete(operationId);
    }
  }

  /**
   * Execute the actual operation
   */
  private async executeOperation(operation: QueuedOperation): Promise<OperationResult> {
    // This would integrate with the actual Google Calendar service
    // For now, we'll simulate the operation
    const result = await retryWithBackoff(async () => {
      switch (operation.type) {
        case 'create_event':
          return await this.simulateCreateEvent(operation);
        case 'update_event':
          return await this.simulateUpdateEvent(operation);
        case 'delete_event':
          return await this.simulateDeleteEvent(operation);
        case 'sync_calendar':
          return await this.simulateSyncCalendar(operation);
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    }, RETRY_CONFIGS.write);

    return {
      success: result.success,
      operationId: operation.id,
      data: result.data,
      error: result.error?.message,
      attempts: result.attempts,
    };
  }

  /**
   * Simulate create event operation
   */
  private async simulateCreateEvent(operation: QueuedOperation): Promise<any> {
    // Simulate API call with potential failure
    if (Math.random() < 0.3) { // 30% failure rate for testing
      throw new Error('Simulated API failure');
    }
    
    return { eventId: `event_${Date.now()}` };
  }

  /**
   * Simulate update event operation
   */
  private async simulateUpdateEvent(operation: QueuedOperation): Promise<any> {
    if (Math.random() < 0.2) { // 20% failure rate for testing
      throw new Error('Simulated update failure');
    }
    
    return { updated: true };
  }

  /**
   * Simulate delete event operation
   */
  private async simulateDeleteEvent(operation: QueuedOperation): Promise<any> {
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error('Simulated delete failure');
    }
    
    return { deleted: true };
  }

  /**
   * Simulate sync calendar operation
   */
  private async simulateSyncCalendar(operation: QueuedOperation): Promise<any> {
    if (Math.random() < 0.15) { // 15% failure rate for testing
      throw new Error('Simulated sync failure');
    }
    
    return { synced: true };
  }

  /**
   * Remove operation from queue
   */
  private removeOperation(operationId: string): void {
    this.queue.delete(operationId);
    
    // Clear timeout
    const timeout = this.retryIntervals.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryIntervals.delete(operationId);
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    // Process high priority operations immediately
    setInterval(() => {
      const highPriorityOps = Array.from(this.queue.values())
        .filter(op => (op.priority === 'high' || op.priority === 'critical') && 
                     op.nextRetry <= new Date() && 
                     !this.processing.has(op.id));
      
      highPriorityOps.forEach(op => {
        this.processOperation(op.id);
      });
    }, 1000); // Check every second

    // Process medium/low priority operations less frequently
    setInterval(() => {
      const mediumPriorityOps = Array.from(this.queue.values())
        .filter(op => op.priority === 'medium' && 
                     op.nextRetry <= new Date() && 
                     !this.processing.has(op.id));
      
      mediumPriorityOps.forEach(op => {
        this.processOperation(op.id);
      });
    }, 5000); // Check every 5 seconds

    setInterval(() => {
      const lowPriorityOps = Array.from(this.queue.values())
        .filter(op => op.priority === 'low' && 
                     op.nextRetry <= new Date() && 
                     !this.processing.has(op.id));
      
      lowPriorityOps.forEach(op => {
        this.processOperation(op.id);
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    total: number;
    processing: number;
    byPriority: Record<QueuedOperation['priority'], number>;
    byType: Record<QueuedOperation['type'], number>;
  } {
    const operations = Array.from(this.queue.values());
    
    const byPriority = operations.reduce((acc, op) => {
      acc[op.priority] = (acc[op.priority] || 0) + 1;
      return acc;
    }, {} as Record<QueuedOperation['priority'], number>);

    const byType = operations.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {} as Record<QueuedOperation['type'], number>);

    return {
      total: operations.length,
      processing: this.processing.size,
      byPriority,
      byType,
    };
  }

  /**
   * Clear all operations (for testing)
   */
  clear(): void {
    this.queue.clear();
    this.processing.clear();
    
    // Clear all timeouts
    this.retryIntervals.forEach(timeout => clearTimeout(timeout));
    this.retryIntervals.clear();
  }
}

// Export singleton instance
export const operationQueue = new OperationQueue();
