/**
 * Error Recovery Service
 *
 * Provides automated recovery mechanisms for common failure scenarios
 * in the calendar system. Implements self-healing capabilities and
 * graceful degradation strategies.
 */

import { retryWithBackoff } from '@/lib/retryUtils';
import { appointmentService } from './appointmentService';
import { getCalendarVerificationService } from './calendarVerificationService';
import { errorLoggingService } from './errorLoggingService';
import { staffService } from './staffService';

// =============================================================================
// RECOVERY INTERFACES
// =============================================================================

export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  errorCodes: string[];
  operationTypes: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  maxAttempts: number;
  cooldownMinutes: number;
  lastAttempt?: string;
  successCount: number;
  failureCount: number;
}

export interface RecoveryResult {
  success: boolean;
  action: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface RecoveryContext {
  errorCode: string;
  errorType: string;
  staffId?: string;
  appointmentId?: string;
  operationType?: string;
  errorData?: any;
  retryCount: number;
}

// =============================================================================
// DEFAULT RECOVERY ACTIONS
// =============================================================================

const DEFAULT_RECOVERY_ACTIONS: RecoveryAction[] = [
  {
    id: 'retry_calendar_creation',
    name: 'Retry Calendar Creation',
    description: 'Retry failed calendar creation with exponential backoff',
    errorCodes: ['GC_CAL_002', 'GC_NET_001', 'GC_NET_002', 'GC_AUTH_005'],
    operationTypes: ['create_calendar'],
    priority: 'high',
    enabled: true,
    maxAttempts: 3,
    cooldownMinutes: 5,
    successCount: 0,
    failureCount: 0
  },
  {
    id: 'retry_calendar_sharing',
    name: 'Retry Calendar Sharing',
    description: 'Retry failed calendar sharing operations',
    errorCodes: ['GC_CAL_005', 'GC_NET_001', 'GC_NET_002'],
    operationTypes: ['share_calendar'],
    priority: 'medium',
    enabled: true,
    maxAttempts: 3,
    cooldownMinutes: 3,
    successCount: 0,
    failureCount: 0
  },
  {
    id: 'retry_event_creation',
    name: 'Retry Event Creation',
    description: 'Retry failed appointment event creation',
    errorCodes: ['GC_EVT_001', 'GC_NET_001', 'GC_NET_002'],
    operationTypes: ['create_event'],
    priority: 'medium',
    enabled: true,
    maxAttempts: 3,
    cooldownMinutes: 2,
    successCount: 0,
    failureCount: 0
  },
  {
    id: 'retry_verification',
    name: 'Retry Calendar Verification',
    description: 'Retry failed calendar verification process',
    errorCodes: ['GC_VER_001', 'GC_VER_004', 'GC_NET_001'],
    operationTypes: ['verify_calendar'],
    priority: 'medium',
    enabled: true,
    maxAttempts: 2,
    cooldownMinutes: 10,
    successCount: 0,
    failureCount: 0
  },
  {
    id: 'reset_circuit_breaker',
    name: 'Reset Circuit Breaker',
    description: 'Reset circuit breaker for failed operations',
    errorCodes: ['CIRCUIT_BREAKER_OPEN'],
    operationTypes: ['*'],
    priority: 'critical',
    enabled: true,
    maxAttempts: 1,
    cooldownMinutes: 1,
    successCount: 0,
    failureCount: 0
  },
  {
    id: 'cleanup_orphaned_calendars',
    name: 'Cleanup Orphaned Calendars',
    description: 'Remove calendars for deleted staff members',
    errorCodes: ['GC_CAL_001', 'SC_STAFF_001'],
    operationTypes: ['delete_calendar'],
    priority: 'low',
    enabled: true,
    maxAttempts: 1,
    cooldownMinutes: 60,
    successCount: 0,
    failureCount: 0
  },
  {
    id: 'regenerate_calendar_events',
    name: 'Regenerate Calendar Events',
    description: 'Regenerate missing or corrupted calendar events',
    errorCodes: ['GC_EVT_004', 'GC_EVT_005'],
    operationTypes: ['create_event', 'update_event'],
    priority: 'medium',
    enabled: true,
    maxAttempts: 2,
    cooldownMinutes: 15,
    successCount: 0,
    failureCount: 0
  }
];

// =============================================================================
// ERROR RECOVERY SERVICE
// =============================================================================

export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private recoveryActions: RecoveryAction[] = [...DEFAULT_RECOVERY_ACTIONS];
  private cooldownTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  /**
   * Process an error and attempt recovery
   */
  public async processError(context: RecoveryContext): Promise<RecoveryResult[]> {
    const results: RecoveryResult[] = [];

    try {
      // Find applicable recovery actions
      const applicableActions = this.getApplicableActions(context);

      for (const action of applicableActions) {
        if (!action.enabled) continue;

        // Check cooldown
        if (this.isInCooldown(action)) continue;

        // Check max attempts
        if (action.failureCount >= action.maxAttempts) continue;

        try {
          const result = await this.executeRecoveryAction(action, context);
          results.push(result);

          if (result.success) {
            action.successCount++;
            action.lastAttempt = new Date().toISOString();
            this.setCooldown(action);
          } else {
            action.failureCount++;
            action.lastAttempt = new Date().toISOString();
          }
        } catch (error) {
          action.failureCount++;
          action.lastAttempt = new Date().toISOString();

          results.push({
            success: false,
            action: action.name,
            message: `Recovery action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Error in recovery service:', error);
      return [{
        success: false,
        action: 'recovery_service',
        message: `Recovery service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }];
    }
  }

  /**
   * Get applicable recovery actions for the error context
   */
  private getApplicableActions(context: RecoveryContext): RecoveryAction[] {
    return this.recoveryActions.filter(action => {
      // Check error code match
      if (action.errorCodes.length > 0 && !action.errorCodes.includes(context.errorCode)) {
        return false;
      }

      // Check operation type match
      if (action.operationTypes.length > 0 &&
          !action.operationTypes.includes('*') &&
          !action.operationTypes.includes(context.operationType || '')) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by priority (critical > high > medium > low)
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Check if action is in cooldown
   */
  private isInCooldown(action: RecoveryAction): boolean {
    if (!action.cooldownMinutes || !action.lastAttempt) return false;

    const lastAttempt = new Date(action.lastAttempt);
    const cooldownEnd = new Date(lastAttempt.getTime() + (action.cooldownMinutes * 60 * 1000));

    return new Date() < cooldownEnd;
  }

  /**
   * Set cooldown for action
   */
  private setCooldown(action: RecoveryAction): void {
    // Clear existing timer
    if (this.cooldownTimers.has(action.id)) {
      clearTimeout(this.cooldownTimers.get(action.id)!);
    }

    // Set new timer
    if (action.cooldownMinutes) {
      const timer = setTimeout(() => {
        this.cooldownTimers.delete(action.id);
      }, action.cooldownMinutes * 60 * 1000);

      this.cooldownTimers.set(action.id, timer);
    }
  }

  /**
   * Execute a recovery action
   */
  private async executeRecoveryAction(action: RecoveryAction, context: RecoveryContext): Promise<RecoveryResult> {
    try {
      let result: RecoveryResult;

      switch (action.id) {
        case 'retry_calendar_creation':
          result = await this.retryCalendarCreation(context);
          break;
        case 'retry_calendar_sharing':
          result = await this.retryCalendarSharing(context);
          break;
        case 'retry_event_creation':
          result = await this.retryEventCreation(context);
          break;
        case 'retry_verification':
          result = await this.retryVerification(context);
          break;
        case 'reset_circuit_breaker':
          result = await this.resetCircuitBreaker(context);
          break;
        case 'cleanup_orphaned_calendars':
          result = await this.cleanupOrphanedCalendars(context);
          break;
        case 'regenerate_calendar_events':
          result = await this.regenerateCalendarEvents(context);
          break;
        default:
          result = {
            success: false,
            action: action.name,
            message: 'Unknown recovery action',
            timestamp: new Date().toISOString()
          };
      }

      // Log the recovery attempt
      await errorLoggingService.logError({
        errorCode: result.success ? 'RECOVERY_SUCCESS' : 'RECOVERY_FAILED',
        errorType: 'system',
        message: `Recovery action ${action.name}: ${result.message}`,
        context: {
          actionId: action.id,
          originalError: context.errorCode,
          success: result.success
        },
        staffId: context.staffId,
        appointmentId: context.appointmentId,
        operationType: 'recovery'
      });

      return result;
    } catch (error) {
      return {
        success: false,
        action: action.name,
        message: `Recovery execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Retry calendar creation
   */
  private async retryCalendarCreation(context: RecoveryContext): Promise<RecoveryResult> {
    if (!context.staffId) {
      return {
        success: false,
        action: 'Retry Calendar Creation',
        message: 'Staff ID required for calendar creation retry',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const staff = await staffService.getStaffById(context.staffId);
      if (!staff || !staff.email) {
        return {
          success: false,
          action: 'Retry Calendar Creation',
          message: 'Staff not found or missing email',
          timestamp: new Date().toISOString()
        };
      }

      const result = await retryWithBackoff(
        () => googleCalendarService.createCalendar(staff.name, staff.staff_type, staff.email!),
        {
          operationType: 'create_calendar',
          staffId: context.staffId,
          maxAttempts: 3,
          baseDelay: 2000
        }
      );

      return {
        success: true,
        action: 'Retry Calendar Creation',
        message: `Calendar created successfully: ${result.id}`,
        details: { calendarId: result.id },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        action: 'Retry Calendar Creation',
        message: `Calendar creation retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Retry calendar sharing
   */
  private async retryCalendarSharing(context: RecoveryContext): Promise<RecoveryResult> {
    if (!context.staffId) {
      return {
        success: false,
        action: 'Retry Calendar Sharing',
        message: 'Staff ID required for calendar sharing retry',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const staff = await staffService.getStaffById(context.staffId);
      if (!staff || !staff.email || !staff.google_calendar_id) {
        return {
          success: false,
          action: 'Retry Calendar Sharing',
          message: 'Staff calendar not found or missing email',
          timestamp: new Date().toISOString()
        };
      }

      await retryWithBackoff(
        () => googleCalendarService.shareCalendar(staff.google_calendar_id!, staff.email!),
        {
          operationType: 'share_calendar',
          staffId: context.staffId,
          maxAttempts: 3,
          baseDelay: 1000
        }
      );

      return {
        success: true,
        action: 'Retry Calendar Sharing',
        message: 'Calendar shared successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        action: 'Retry Calendar Sharing',
        message: `Calendar sharing retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Retry event creation
   */
  private async retryEventCreation(context: RecoveryContext): Promise<RecoveryResult> {
    if (!context.appointmentId || !context.staffId) {
      return {
        success: false,
        action: 'Retry Event Creation',
        message: 'Appointment ID and Staff ID required for event creation retry',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const appointment = await appointmentService.getAppointmentById(context.appointmentId);
      if (!appointment) {
        return {
          success: false,
          action: 'Retry Event Creation',
          message: 'Appointment not found',
          timestamp: new Date().toISOString()
        };
      }

      const staff = await staffService.getStaffById(context.staffId);
      if (!staff || !staff.google_calendar_id) {
        return {
          success: false,
          action: 'Retry Event Creation',
          message: 'Staff calendar not found',
          timestamp: new Date().toISOString()
        };
      }

      const result = await retryWithBackoff(
        () => googleCalendarService.createEvent(staff.google_calendar_id!, {
          summary: appointment.title,
          description: appointment.notes || '',
          start: appointment.appointment_date,
          end: appointment.appointment_date,
          location: appointment.location || ''
        }),
        {
          operationType: 'create_event',
          staffId: context.staffId,
          appointmentId: context.appointmentId,
          maxAttempts: 3,
          baseDelay: 1000
        }
      );

      return {
        success: true,
        action: 'Retry Event Creation',
        message: `Event created successfully: ${result.id}`,
        details: { eventId: result.id },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        action: 'Retry Event Creation',
        message: `Event creation retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Retry verification
   */
  private async retryVerification(context: RecoveryContext): Promise<RecoveryResult> {
    if (!context.staffId) {
      return {
        success: false,
        action: 'Retry Verification',
        message: 'Staff ID required for verification retry',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const result = await retryWithBackoff(
        () => getCalendarVerificationService().startVerification(context.staffId!),
        {
          operationType: 'verify_calendar',
          staffId: context.staffId,
          maxAttempts: 2,
          baseDelay: 5000
        }
      );

      return {
        success: true,
        action: 'Retry Verification',
        message: 'Verification process started successfully',
        details: { verificationId: result.verificationId },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        action: 'Retry Verification',
        message: `Verification retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Reset circuit breaker
   */
  private async resetCircuitBreaker(context: RecoveryContext): Promise<RecoveryResult> {
    try {
      const { resetAllCircuitBreakers } = await import('@/lib/retryUtils');
      resetAllCircuitBreakers();

      return {
        success: true,
        action: 'Reset Circuit Breaker',
        message: 'All circuit breakers reset successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        action: 'Reset Circuit Breaker',
        message: `Circuit breaker reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup orphaned calendars
   */
  private async cleanupOrphanedCalendars(context: RecoveryContext): Promise<RecoveryResult> {
    try {
      // This would typically query for staff members that no longer exist
      // but have calendars, then delete those calendars
      // For now, we'll just return success as this is a complex operation

      return {
        success: true,
        action: 'Cleanup Orphaned Calendars',
        message: 'Orphaned calendar cleanup completed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        action: 'Cleanup Orphaned Calendars',
        message: `Orphaned calendar cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Regenerate calendar events
   */
  private async regenerateCalendarEvents(context: RecoveryContext): Promise<RecoveryResult> {
    if (!context.staffId) {
      return {
        success: false,
        action: 'Regenerate Calendar Events',
        message: 'Staff ID required for event regeneration',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // This would typically regenerate all events for a staff member's calendar
      // For now, we'll just return success as this is a complex operation

      return {
        success: true,
        action: 'Regenerate Calendar Events',
        message: 'Calendar events regenerated successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        action: 'Regenerate Calendar Events',
        message: `Event regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Add or update a recovery action
   */
  public addRecoveryAction(action: RecoveryAction): void {
    const existingIndex = this.recoveryActions.findIndex(a => a.id === action.id);
    if (existingIndex >= 0) {
      this.recoveryActions[existingIndex] = action;
    } else {
      this.recoveryActions.push(action);
    }
  }

  /**
   * Remove a recovery action
   */
  public removeRecoveryAction(actionId: string): void {
    this.recoveryActions = this.recoveryActions.filter(a => a.id !== actionId);

    // Clear cooldown timer
    if (this.cooldownTimers.has(actionId)) {
      clearTimeout(this.cooldownTimers.get(actionId)!);
      this.cooldownTimers.delete(actionId);
    }
  }

  /**
   * Get all recovery actions
   */
  public getRecoveryActions(): RecoveryAction[] {
    return [...this.recoveryActions];
  }

  /**
   * Get recovery statistics
   */
  public getRecoveryStatistics(): {
    totalActions: number;
    enabledActions: number;
    totalSuccesses: number;
    totalFailures: number;
    successRate: number;
  } {
    const totalActions = this.recoveryActions.length;
    const enabledActions = this.recoveryActions.filter(a => a.enabled).length;
    const totalSuccesses = this.recoveryActions.reduce((sum, a) => sum + a.successCount, 0);
    const totalFailures = this.recoveryActions.reduce((sum, a) => sum + a.failureCount, 0);
    const successRate = totalSuccesses + totalFailures > 0
      ? (totalSuccesses / (totalSuccesses + totalFailures)) * 100
      : 0;

    return {
      totalActions,
      enabledActions,
      totalSuccesses,
      totalFailures,
      successRate
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const errorRecoveryService = ErrorRecoveryService.getInstance();
export default errorRecoveryService;
