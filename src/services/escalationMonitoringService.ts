import { EscalationAlertService } from './escalationAlertService';
import { TransportationSegmentService } from './transportationSegmentService';

export interface EscalationMonitoringConfig {
  checkIntervalMinutes: number;
  enableSixHourDeadlineAlerts: boolean;
  enableCriticalEscalationAlerts: boolean;
  enableDutyManagerNotifications: boolean;
  dutyManagerChatId?: string;
  operationsChatId?: string;
}

export interface EscalationMonitoringStats {
  lastCheck: string;
  sixHourDeadlineAlertsCreated: number;
  criticalEscalationAlertsCreated: number;
  dutyManagerNotificationsSent: number;
  totalSegmentsChecked: number;
  errors: string[];
}

export class EscalationMonitoringService {
  private escalationService: EscalationAlertService;
  private segmentService: TransportationSegmentService;
  private config: EscalationMonitoringConfig;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private stats: EscalationMonitoringStats = {
    lastCheck: new Date().toISOString(),
    sixHourDeadlineAlertsCreated: 0,
    criticalEscalationAlertsCreated: 0,
    dutyManagerNotificationsSent: 0,
    totalSegmentsChecked: 0,
    errors: []
  };

  constructor(config: EscalationMonitoringConfig) {
    this.config = config;
    this.escalationService = new EscalationAlertService();
    this.segmentService = new TransportationSegmentService();
  }

  /**
   * Start the escalation monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.log('Escalation monitoring service is already running');
      return;
    }

    console.log(`Starting escalation monitoring service with ${this.config.checkIntervalMinutes} minute intervals`);
    this.isRunning = true;

    // Run immediately on start
    this.performEscalationCheck();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.performEscalationCheck();
    }, this.config.checkIntervalMinutes * 60 * 1000);
  }

  /**
   * Stop the escalation monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Escalation monitoring service is not running');
      return;
    }

    console.log('Stopping escalation monitoring service');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform a single escalation check
   */
  async performEscalationCheck(): Promise<EscalationMonitoringStats> {
    const startTime = new Date();
    console.log(`🔍 Starting escalation check at ${startTime.toISOString()}`);

    const checkStats: EscalationMonitoringStats = {
      lastCheck: startTime.toISOString(),
      sixHourDeadlineAlertsCreated: 0,
      criticalEscalationAlertsCreated: 0,
      dutyManagerNotificationsSent: 0,
      totalSegmentsChecked: 0,
      errors: []
    };

    try {
      // Update escalation states first
      await this.segmentService.updateEscalationStates();

      // Check for six-hour deadline alerts
      if (this.config.enableSixHourDeadlineAlerts) {
        try {
          const sixHourResult = await this.escalationService.checkSixHourDeadlines();
          checkStats.sixHourDeadlineAlertsCreated = sixHourResult.alerts_created;
          checkStats.totalSegmentsChecked += sixHourResult.segments_checked;

          if (sixHourResult.alerts_created > 0) {
            console.log(`⚠️ Created ${sixHourResult.alerts_created} six-hour deadline alerts`);
          }
        } catch (error) {
          const errorMsg = `Failed to check six-hour deadlines: ${error}`;
          console.error(errorMsg);
          checkStats.errors.push(errorMsg);
        }
      }

      // Check for critical escalations
      if (this.config.enableCriticalEscalationAlerts) {
        try {
          const criticalResult = await this.escalationService.checkCriticalEscalations();
          checkStats.criticalEscalationAlertsCreated = criticalResult.alerts_created;
          checkStats.totalSegmentsChecked += criticalResult.segments_checked;

          if (criticalResult.alerts_created > 0) {
            console.log(`🚨 Created ${criticalResult.alerts_created} critical escalation alerts`);
          }
        } catch (error) {
          const errorMsg = `Failed to check critical escalations: ${error}`;
          console.error(errorMsg);
          checkStats.errors.push(errorMsg);
        }
      }

      // Send duty manager notifications for critical alerts
      if (this.config.enableDutyManagerNotifications && this.config.dutyManagerChatId) {
        try {
          const notificationsSent = await this.sendDutyManagerNotifications();
          checkStats.dutyManagerNotificationsSent = notificationsSent;

          if (notificationsSent > 0) {
            console.log(`📱 Sent ${notificationsSent} duty manager notifications`);
          }
        } catch (error) {
          const errorMsg = `Failed to send duty manager notifications: ${error}`;
          console.error(errorMsg);
          checkStats.errors.push(errorMsg);
        }
      }

      // Update stats
      this.stats = checkStats;

      const duration = Date.now() - startTime.getTime();
      console.log(`✅ Escalation check completed in ${duration}ms`);
      console.log(`   - Six-hour deadline alerts: ${checkStats.sixHourDeadlineAlertsCreated}`);
      console.log(`   - Critical escalation alerts: ${checkStats.criticalEscalationAlertsCreated}`);
      console.log(`   - Duty manager notifications: ${checkStats.dutyManagerNotificationsSent}`);
      console.log(`   - Total segments checked: ${checkStats.totalSegmentsChecked}`);
      console.log(`   - Errors: ${checkStats.errors.length}`);

    } catch (error) {
      const errorMsg = `Escalation check failed: ${error}`;
      console.error(errorMsg);
      checkStats.errors.push(errorMsg);
      this.stats = checkStats;
    }

    return checkStats;
  }

  /**
   * Send duty manager notifications for critical alerts
   */
  private async sendDutyManagerNotifications(): Promise<number> {
    if (!this.config.dutyManagerChatId) {
      return 0;
    }

    try {
      // Get active critical alerts
      const activeAlerts = await this.escalationService.getActiveAlerts();
      const criticalAlerts = activeAlerts.filter(alert =>
        alert.severity === 'critical' &&
        !alert.acknowledged_at &&
        !alert.resolved_at
      );

      if (criticalAlerts.length === 0) {
        return 0;
      }

      // Group alerts by appointment for consolidated notifications
      const alertsByAppointment = criticalAlerts.reduce((acc, alert) => {
        if (!acc[alert.appointment_id]) {
          acc[alert.appointment_id] = [];
        }
        acc[alert.appointment_id].push(alert);
        return acc;
      }, {} as Record<string, typeof criticalAlerts>);

      let notificationsSent = 0;

      for (const [appointmentId, alerts] of Object.entries(alertsByAppointment)) {
        const consolidatedMessage = this.buildDutyManagerNotificationMessage(appointmentId, alerts);

        try {
          // Send to duty manager
          await this.sendTelegramNotification(this.config.dutyManagerChatId, consolidatedMessage);
          notificationsSent++;

          // Also send to operations channel if different
          if (this.config.operationsChatId && this.config.operationsChatId !== this.config.dutyManagerChatId) {
            await this.sendTelegramNotification(this.config.operationsChatId, consolidatedMessage);
          }
        } catch (error) {
          console.error(`Failed to send duty manager notification for appointment ${appointmentId}:`, error);
        }
      }

      return notificationsSent;
    } catch (error) {
      console.error('Failed to send duty manager notifications:', error);
      return 0;
    }
  }

  /**
   * Build consolidated duty manager notification message
   */
  private buildDutyManagerNotificationMessage(appointmentId: string, alerts: any[]): string {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;

    let message = `🚨 DUTY MANAGER ALERT - CRITICAL ESCALATIONS\n\n`;
    message += `Appointment ID: ${appointmentId}\n`;
    message += `Critical Alerts: ${criticalCount}\n`;
    message += `High Priority Alerts: ${highCount}\n\n`;

    message += `IMMEDIATE ACTION REQUIRED:\n`;
    message += `• Review unassigned transportation segments\n`;
    message += `• Assign drivers or arrange alternative transport\n`;
    message += `• Escalate to backup drivers if needed\n\n`;

    message += `Alert Details:\n`;
    alerts.forEach((alert, index) => {
      message += `${index + 1}. ${alert.alert_type.replace('_', ' ').toUpperCase()}\n`;
      message += `   Severity: ${alert.severity.toUpperCase()}\n`;
      message += `   Created: ${new Date(alert.created_at).toLocaleString()}\n`;
      if (alert.message) {
        message += `   Message: ${alert.message.substring(0, 100)}...\n`;
      }
      message += `\n`;
    });

    message += `Please acknowledge and resolve these alerts immediately.`;

    return message;
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegramNotification(chatId: string, message: string): Promise<void> {
    // This would integrate with your existing Telegram service
    // For now, we'll just log the message
    console.log(`📱 Telegram notification to ${chatId}:`);
    console.log(message);

    // TODO: Integrate with actual TelegramNotificationService
    // await this.telegramService.sendMessage({
    //   chatId,
    //   message,
    //   parseMode: 'HTML'
    // });
  }

  /**
   * Get current monitoring statistics
   */
  getStats(): EscalationMonitoringStats {
    return { ...this.stats };
  }

  /**
   * Check if the service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<EscalationMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Updated escalation monitoring configuration:', this.config);
  }

  /**
   * Get escalation metrics for dashboard
   */
  async getEscalationMetrics() {
    return await this.escalationService.getEscalationMetrics();
  }
}
