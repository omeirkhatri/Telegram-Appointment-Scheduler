#!/usr/bin/env node

/**
 * Start Escalation Monitoring Service
 *
 * This script starts the escalation monitoring service that checks for:
 * - Segments approaching 6-hour deadline
 * - Critical escalations requiring duty manager attention
 * - Sends notifications to duty managers and operations teams
 */

const { EscalationMonitoringService } = require('../src/services/escalationMonitoringService');

// Configuration from environment variables
const config = {
  checkIntervalMinutes: parseInt(process.env.ESCALATION_CHECK_INTERVAL_MINUTES || '15'),
  enableSixHourDeadlineAlerts: process.env.ENABLE_SIX_HOUR_DEADLINE_ALERTS !== 'false',
  enableCriticalEscalationAlerts: process.env.ENABLE_CRITICAL_ESCALATION_ALERTS !== 'false',
  enableDutyManagerNotifications: process.env.ENABLE_DUTY_MANAGER_NOTIFICATIONS !== 'false',
  dutyManagerChatId: process.env.DUTY_MANAGER_TELEGRAM_CHAT_ID,
  operationsChatId: process.env.OPERATIONS_TELEGRAM_CHAT_ID
};

console.log('🚀 Starting Escalation Monitoring Service');
console.log('Configuration:', JSON.stringify(config, null, 2));

// Create and start the monitoring service
const monitoringService = new EscalationMonitoringService(config);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  monitoringService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  monitoringService.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  monitoringService.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  monitoringService.stop();
  process.exit(1);
});

// Start the service
monitoringService.start();

console.log('✅ Escalation Monitoring Service started successfully');
console.log(`📊 Check interval: ${config.checkIntervalMinutes} minutes`);
console.log(`⚠️ Six-hour deadline alerts: ${config.enableSixHourDeadlineAlerts ? 'enabled' : 'disabled'}`);
console.log(`🚨 Critical escalation alerts: ${config.enableCriticalEscalationAlerts ? 'enabled' : 'disabled'}`);
console.log(`📱 Duty manager notifications: ${config.enableDutyManagerNotifications ? 'enabled' : 'disabled'}`);

// Keep the process alive
setInterval(() => {
  const stats = monitoringService.getStats();
  console.log(`📈 Service running - Last check: ${stats.lastCheck}, Errors: ${stats.errors.length}`);
}, 60000); // Log status every minute
