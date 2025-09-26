/**
 * Error Notification Service
 *
 * Sends notifications to admins when critical errors occur or error thresholds are exceeded.
 * Provides real-time alerting and escalation for calendar system issues.
 */

import { getEmailService } from './emailService';
import { ErrorLogEntry, errorLoggingService } from './errorLoggingService';

// =============================================================================
// NOTIFICATION INTERFACES
// =============================================================================

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    errorType?: 'calendar' | 'staff' | 'appointment' | 'system' | 'external';
    errorCode?: string;
    operationType?: string;
    timeWindow?: number; // minutes
    threshold?: number; // number of occurrences
  };
  notification: {
    type: 'email' | 'webhook' | 'log';
    recipients: string[];
    template?: string;
    webhookUrl?: string;
  };
  cooldown?: number; // minutes between notifications
  lastTriggered?: string;
}

export interface NotificationContext {
  errorCount: number;
  timeWindow: number;
  errors: ErrorLogEntry[];
  affectedStaff: string[];
  affectedOperations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// =============================================================================
// DEFAULT NOTIFICATION RULES
// =============================================================================

const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: 'critical_errors',
    name: 'Critical Errors Alert',
    enabled: true,
    conditions: {
      severity: 'critical',
      threshold: 1,
      timeWindow: 5
    },
    notification: {
      type: 'email',
      recipients: ['admin@bestdoc.com'],
      template: 'critical-error-alert'
    },
    cooldown: 15
  },
  {
    id: 'calendar_creation_failures',
    name: 'Calendar Creation Failures',
    enabled: true,
    conditions: {
      errorType: 'calendar',
      operationType: 'create_calendar',
      threshold: 3,
      timeWindow: 10
    },
    notification: {
      type: 'email',
      recipients: ['admin@bestdoc.com'],
      template: 'calendar-creation-failures'
    },
    cooldown: 30
  },
  {
    id: 'high_error_rate',
    name: 'High Error Rate',
    enabled: true,
    conditions: {
      severity: 'high',
      threshold: 10,
      timeWindow: 15
    },
    notification: {
      type: 'email',
      recipients: ['admin@bestdoc.com'],
      template: 'high-error-rate'
    },
    cooldown: 60
  },
  {
    id: 'quota_exceeded',
    name: 'API Quota Exceeded',
    enabled: true,
    conditions: {
      errorCode: 'GC_AUTH_005', // QUOTA_EXCEEDED
      threshold: 1,
      timeWindow: 5
    },
    notification: {
      type: 'email',
      recipients: ['admin@bestdoc.com'],
      template: 'quota-exceeded'
    },
    cooldown: 60
  },
  {
    id: 'circuit_breaker_open',
    name: 'Circuit Breaker Open',
    enabled: true,
    conditions: {
      errorCode: 'CIRCUIT_BREAKER_OPEN',
      threshold: 1,
      timeWindow: 1
    },
    notification: {
      type: 'email',
      recipients: ['admin@bestdoc.com'],
      template: 'circuit-breaker-open'
    },
    cooldown: 30
  }
];

// =============================================================================
// ERROR NOTIFICATION SERVICE
// =============================================================================

export class ErrorNotificationService {
  private static instance: ErrorNotificationService;
  private notificationRules: NotificationRule[] = [...DEFAULT_NOTIFICATION_RULES];
  private cooldownTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): ErrorNotificationService {
    if (!ErrorNotificationService.instance) {
      ErrorNotificationService.instance = new ErrorNotificationService();
    }
    return ErrorNotificationService.instance;
  }

  /**
   * Process a new error and check for notification triggers
   */
  public async processError(error: ErrorLogEntry): Promise<void> {
    try {
      for (const rule of this.notificationRules) {
        if (!rule.enabled) continue;

        // Check cooldown
        if (this.isInCooldown(rule)) continue;

        // Check if rule conditions are met
        if (await this.checkRuleConditions(rule, error)) {
          await this.triggerNotification(rule, error);
          this.setCooldown(rule);
        }
      }
    } catch (error) {
      console.error('❌ Error processing notification:', error);
    }
  }

  /**
   * Check if a notification rule is in cooldown
   */
  private isInCooldown(rule: NotificationRule): boolean {
    if (!rule.cooldown || !rule.lastTriggered) return false;

    const lastTriggered = new Date(rule.lastTriggered);
    const cooldownEnd = new Date(lastTriggered.getTime() + (rule.cooldown * 60 * 1000));

    return new Date() < cooldownEnd;
  }

  /**
   * Set cooldown for a rule
   */
  private setCooldown(rule: NotificationRule): void {
    rule.lastTriggered = new Date().toISOString();

    // Clear existing timer
    if (this.cooldownTimers.has(rule.id)) {
      clearTimeout(this.cooldownTimers.get(rule.id)!);
    }

    // Set new timer
    if (rule.cooldown) {
      const timer = setTimeout(() => {
        this.cooldownTimers.delete(rule.id);
      }, rule.cooldown * 60 * 1000);

      this.cooldownTimers.set(rule.id, timer);
    }
  }

  /**
   * Check if rule conditions are met
   */
  private async checkRuleConditions(rule: NotificationRule, error: ErrorLogEntry): Promise<boolean> {
    const conditions = rule.conditions;

    // Check severity
    if (conditions.severity && error.severity !== conditions.severity) {
      return false;
    }

    // Check error type
    if (conditions.errorType && error.error_type !== conditions.errorType) {
      return false;
    }

    // Check error code
    if (conditions.errorCode && error.error_code !== conditions.errorCode) {
      return false;
    }

    // Check operation type
    if (conditions.operationType && error.operation_type !== conditions.operationType) {
      return false;
    }

    // Check threshold and time window
    if (conditions.threshold && conditions.timeWindow) {
      const errorCount = await this.getErrorCountInTimeWindow(
        conditions.timeWindow,
        {
          severity: conditions.severity,
          errorType: conditions.errorType,
          errorCode: conditions.errorCode,
          operationType: conditions.operationType
        }
      );

      if (errorCount < conditions.threshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get error count in time window with filters
   */
  private async getErrorCountInTimeWindow(
    timeWindowMinutes: number,
    filters: {
      severity?: string;
      errorType?: string;
      errorCode?: string;
      operationType?: string;
    }
  ): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - (timeWindowMinutes * 60 * 1000));

      // This would typically query the database, but for now we'll use the error logging service
      const recentErrors = await errorLoggingService.getErrorAggregations('1h');

      let count = 0;
      for (const error of recentErrors) {
        if (filters.severity && error.severity !== filters.severity) continue;
        if (filters.errorCode && error.error_code !== filters.errorCode) continue;

        count += error.count;
      }

      return count;
    } catch (error) {
      console.error('❌ Error getting error count:', error);
      return 0;
    }
  }

  /**
   * Trigger notification for a rule
   */
  private async triggerNotification(rule: NotificationRule, error: ErrorLogEntry): Promise<void> {
    try {
      const context = await this.buildNotificationContext(rule, error);

      switch (rule.notification.type) {
        case 'email':
          await this.sendEmailNotification(rule, context);
          break;
        case 'webhook':
          await this.sendWebhookNotification(rule, context);
          break;
        case 'log':
          this.sendLogNotification(rule, context);
          break;
      }

      console.log(`📧 Notification triggered: ${rule.name}`);
    } catch (error) {
      console.error('❌ Error triggering notification:', error);
    }
  }

  /**
   * Build notification context
   */
  private async buildNotificationContext(rule: NotificationRule, error: ErrorLogEntry): Promise<NotificationContext> {
    const timeWindow = rule.conditions.timeWindow || 15;
    const errorCount = await this.getErrorCountInTimeWindow(timeWindow, rule.conditions);

    // Get recent errors for context
    const recentErrors = await errorLoggingService.getErrorAggregations('1h');

    return {
      errorCount,
      timeWindow,
      errors: recentErrors.map(agg => ({
        id: '',
        error_code: agg.error_code,
        error_type: 'system' as const,
        severity: agg.severity,
        message: '',
        retryable: agg.retryable,
        resolved: false,
        created_at: agg.last_occurrence
      })),
      affectedStaff: [...new Set(recentErrors.map(agg => agg.error_code))],
      affectedOperations: [...new Set(recentErrors.map(agg => agg.error_code))],
      severity: error.severity
    };
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(rule: NotificationRule, context: NotificationContext): Promise<void> {
    try {
      const template = rule.notification.template || 'error-alert';
      const subject = this.getEmailSubject(rule, context);
      const html = await this.getEmailHtml(template, rule, context);

      for (const recipient of rule.notification.recipients) {
        await getEmailService().sendEmail({
          to: recipient,
          subject,
          html,
          isHtml: true
        });
      }
    } catch (error) {
      console.error('❌ Error sending email notification:', error);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(rule: NotificationRule, context: NotificationContext): Promise<void> {
    if (!rule.notification.webhookUrl) return;

    try {
      const payload = {
        rule: rule.name,
        context,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(rule.notification.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error sending webhook notification:', error);
    }
  }

  /**
   * Send log notification
   */
  private sendLogNotification(rule: NotificationRule, context: NotificationContext): void {
    console.log(`🚨 NOTIFICATION: ${rule.name}`);
    console.log(`   Error Count: ${context.errorCount} in ${context.timeWindow} minutes`);
    console.log(`   Severity: ${context.severity}`);
    console.log(`   Affected Operations: ${context.affectedOperations.join(', ')}`);
  }

  /**
   * Get email subject
   */
  private getEmailSubject(rule: NotificationRule, context: NotificationContext): string {
    const severity = context.severity.toUpperCase();
    return `[${severity}] ${rule.name} - ${context.errorCount} errors in ${context.timeWindow} minutes`;
  }

  /**
   * Get email HTML content
   */
  private async getEmailHtml(template: string, rule: NotificationRule, context: NotificationContext): Promise<string> {
    // This would typically use a template engine, but for now we'll create simple HTML
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
          .content { margin: 20px 0; }
          .error-list { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
          .error-item { margin: 10px 0; padding: 10px; background-color: white; border-radius: 3px; }
          .severity-critical { border-left: 4px solid #dc3545; }
          .severity-high { border-left: 4px solid #fd7e14; }
          .severity-medium { border-left: 4px solid #ffc107; }
          .severity-low { border-left: 4px solid #28a745; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>🚨 ${rule.name}</h2>
          <p><strong>Error Count:</strong> ${context.errorCount} errors in ${context.timeWindow} minutes</p>
          <p><strong>Severity:</strong> ${context.severity.toUpperCase()}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="content">
          <h3>Recent Errors</h3>
          <div class="error-list">
            ${context.errors.map(error => `
              <div class="error-item severity-${error.severity}">
                <strong>${error.error_code}</strong> - ${error.severity.toUpperCase()}
                <br>
                <small>Last occurred: ${new Date(error.created_at).toLocaleString()}</small>
              </div>
            `).join('')}
          </div>

          <h3>Recommended Actions</h3>
          <ul>
            <li>Check the error logs for detailed information</li>
            <li>Verify system health and external service availability</li>
            <li>Review recent changes that might have caused the errors</li>
            <li>Consider implementing additional error handling if needed</li>
          </ul>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Add or update a notification rule
   */
  public addNotificationRule(rule: NotificationRule): void {
    const existingIndex = this.notificationRules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.notificationRules[existingIndex] = rule;
    } else {
      this.notificationRules.push(rule);
    }
  }

  /**
   * Remove a notification rule
   */
  public removeNotificationRule(ruleId: string): void {
    this.notificationRules = this.notificationRules.filter(r => r.id !== ruleId);

    // Clear cooldown timer
    if (this.cooldownTimers.has(ruleId)) {
      clearTimeout(this.cooldownTimers.get(ruleId)!);
      this.cooldownTimers.delete(ruleId);
    }
  }

  /**
   * Get all notification rules
   */
  public getNotificationRules(): NotificationRule[] {
    return [...this.notificationRules];
  }

  /**
   * Test a notification rule
   */
  public async testNotificationRule(ruleId: string): Promise<boolean> {
    const rule = this.notificationRules.find(r => r.id === ruleId);
    if (!rule) return false;

    try {
      // Create a test error
      const testError: ErrorLogEntry = {
        id: 'test',
        error_code: rule.conditions.errorCode || 'TEST_ERROR',
        error_type: rule.conditions.errorType || 'system',
        severity: rule.conditions.severity || 'medium',
        message: 'Test notification',
        retryable: false,
        resolved: false,
        created_at: new Date().toISOString()
      };

      await this.processError(testError);
      return true;
    } catch (error) {
      console.error('❌ Error testing notification rule:', error);
      return false;
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const errorNotificationService = ErrorNotificationService.getInstance();
export default errorNotificationService;
