import { isDriverAssignmentOverhaulEscalationEnabled } from '@/lib/featureFlags';
import { EscalationMonitoringService } from '@/services/escalationMonitoringService';
import { NextRequest, NextResponse } from 'next/server';

// Global instance of the monitoring service
let monitoringService: EscalationMonitoringService | null = null;

// Initialize the monitoring service with default configuration
function getMonitoringService(): EscalationMonitoringService {
  if (!monitoringService) {
    const config = {
      checkIntervalMinutes: parseInt(process.env.ESCALATION_CHECK_INTERVAL_MINUTES || '15'),
      enableSixHourDeadlineAlerts: process.env.ENABLE_SIX_HOUR_DEADLINE_ALERTS !== 'false',
      enableCriticalEscalationAlerts: process.env.ENABLE_CRITICAL_ESCALATION_ALERTS !== 'false',
      enableDutyManagerNotifications: process.env.ENABLE_DUTY_MANAGER_NOTIFICATIONS !== 'false',
      dutyManagerChatId: process.env.DUTY_MANAGER_TELEGRAM_CHAT_ID,
      operationsChatId: process.env.OPERATIONS_TELEGRAM_CHAT_ID
    };

    monitoringService = new EscalationMonitoringService(config);
  }

  return monitoringService;
}

/**
 * GET /api/escalation-monitoring
 * Get monitoring service status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check if escalation monitoring is enabled
    if (!isDriverAssignmentOverhaulEscalationEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Escalation monitoring API is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION is not enabled.',
        },
        { status: 403 },
      );
    }
    const service = getMonitoringService();
    const stats = service.getStats();
    const isRunning = service.isServiceRunning();

    return NextResponse.json({
      success: true,
      data: {
        isRunning,
        stats,
        config: {
          checkIntervalMinutes: service['config'].checkIntervalMinutes,
          enableSixHourDeadlineAlerts: service['config'].enableSixHourDeadlineAlerts,
          enableCriticalEscalationAlerts: service['config'].enableCriticalEscalationAlerts,
          enableDutyManagerNotifications: service['config'].enableDutyManagerNotifications
        }
      }
    });
  } catch (error) {
    console.error('Failed to get escalation monitoring status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get monitoring status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/escalation-monitoring
 * Start, stop, or configure the monitoring service
 */
export async function POST(request: NextRequest) {
  try {
    // Check if escalation monitoring is enabled
    if (!isDriverAssignmentOverhaulEscalationEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Escalation monitoring API is disabled. Feature flag DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION is not enabled.',
        },
        { status: 403 },
      );
    }
    const body = await request.json();
    const { action, config } = body;

    const service = getMonitoringService();

    switch (action) {
      case 'start':
        service.start();
        return NextResponse.json({
          success: true,
          message: 'Escalation monitoring service started',
          data: { isRunning: service.isServiceRunning() }
        });

      case 'stop':
        service.stop();
        return NextResponse.json({
          success: true,
          message: 'Escalation monitoring service stopped',
          data: { isRunning: service.isServiceRunning() }
        });

      case 'check':
        const stats = await service.performEscalationCheck();
        return NextResponse.json({
          success: true,
          message: 'Escalation check completed',
          data: { stats, isRunning: service.isServiceRunning() }
        });

      case 'configure':
        if (config) {
          service.updateConfig(config);
          return NextResponse.json({
            success: true,
            message: 'Configuration updated',
            data: { isRunning: service.isServiceRunning() }
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Configuration required' },
            { status: 400 }
          );
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: start, stop, check, or configure' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to manage escalation monitoring service:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage monitoring service' },
      { status: 500 }
    );
  }
}
