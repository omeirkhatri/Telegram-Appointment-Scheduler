import { supabase } from '@/lib/supabase/client';
import { TransportationSegment } from '@/types/transportationSegment';
import { TelegramNotificationService } from './telegramNotificationService';

export interface EscalationAlert {
  id: string;
  segment_id: string;
  appointment_id: string;
  alert_type: 'six_hour_deadline' | 'critical_escalation' | 'duty_manager_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  created_at: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface EscalationMetrics {
  total_escalated: number;
  critical_escalated: number;
  six_hour_deadline: number;
  duty_manager_alerts: number;
  unacknowledged_alerts: number;
  next_escalation_deadline?: string | null;
}

export class EscalationAlertService {
  private telegramService: TelegramNotificationService;

  constructor() {
    this.telegramService = new TelegramNotificationService();
  }

  /**
   * Check for segments approaching 6-hour deadline and create alerts
   */
  async checkSixHourDeadlines(): Promise<{ alerts_created: number; segments_checked: number }> {
    const now = new Date();
    const sixHoursFromNow = new Date(now.getTime() + (6 * 60 * 60 * 1000));
    const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000));

    // Get segments that will escalate within the next hour
    const { data: segments, error } = await supabase
      .from('transportation_segments')
      .select(`
        *,
        driver:driver_id(id, first_name, last_name, staff_type, specialization, phone, email),
        appointment:appointment_id(id, patient_name, appointment_date, service_line)
      `)
      .is('driver_id', null)
      .eq('assignment_mode', 'assign_later')
      .in('status', ['draft', 'scheduled'])
      .not('escalation_deadline', 'is', null)
      .gte('escalation_deadline', now.toISOString())
      .lte('escalation_deadline', oneHourFromNow.toISOString())
      .order('escalation_deadline', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch segments approaching deadline: ${error.message}`);
    }

    let alertsCreated = 0;

    for (const segment of segments || []) {
      // Check if alert already exists for this segment
      const existingAlert = await this.getExistingAlert(segment.id, 'six_hour_deadline');

      if (!existingAlert) {
        await this.createEscalationAlert({
          segment_id: segment.id,
          appointment_id: segment.appointment_id,
          alert_type: 'six_hour_deadline',
          severity: this.calculateSeverity(segment),
          message: this.generateSixHourDeadlineMessage(segment)
        });
        alertsCreated++;
      }
    }

    return {
      alerts_created: alertsCreated,
      segments_checked: segments?.length || 0
    };
  }

  /**
   * Check for critical escalations and create duty manager alerts
   */
  async checkCriticalEscalations(): Promise<{ alerts_created: number; segments_checked: number }> {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));

    // Get segments that have been escalated for more than 2 hours
    const { data: segments, error } = await supabase
      .from('transportation_segments')
      .select(`
        *,
        driver:driver_id(id, first_name, last_name, staff_type, specialization, phone, email),
        appointment:appointment_id(id, patient_name, appointment_date, service_line)
      `)
      .is('driver_id', null)
      .eq('assignment_mode', 'assign_later')
      .eq('escalation_state', 'escalated')
      .in('status', ['draft', 'scheduled'])
      .lt('escalation_deadline', twoHoursAgo.toISOString())
      .order('escalation_deadline', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch critical escalated segments: ${error.message}`);
    }

    let alertsCreated = 0;

    for (const segment of segments || []) {
      // Check if duty manager alert already exists for this segment
      const existingAlert = await this.getExistingAlert(segment.id, 'duty_manager_alert');

      if (!existingAlert) {
        await this.createEscalationAlert({
          segment_id: segment.id,
          appointment_id: segment.appointment_id,
          alert_type: 'duty_manager_alert',
          severity: 'critical',
          message: this.generateDutyManagerAlertMessage(segment)
        });
        alertsCreated++;
      }
    }

    return {
      alerts_created: alertsCreated,
      segments_checked: segments?.length || 0
    };
  }

  /**
   * Create an escalation alert
   */
  async createEscalationAlert(alertData: {
    segment_id: string;
    appointment_id: string;
    alert_type: EscalationAlert['alert_type'];
    severity: EscalationAlert['severity'];
    message: string;
  }): Promise<EscalationAlert> {
    const { data, error } = await supabase
      .from('escalation_alerts')
      .insert({
        segment_id: alertData.segment_id,
        appointment_id: alertData.appointment_id,
        alert_type: alertData.alert_type,
        severity: alertData.severity,
        message: alertData.message,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create escalation alert: ${error.message}`);
    }

    // Send Telegram notification for critical alerts
    if (alertData.severity === 'critical' || alertData.alert_type === 'duty_manager_alert') {
      await this.sendEscalationNotification(data);
    }

    return data;
  }

  /**
   * Get escalation metrics for dashboard
   */
  async getEscalationMetrics(): Promise<EscalationMetrics> {
    const now = new Date().toISOString();

    // Get total escalated segments
    const { data: escalatedSegments, error: escalatedError } = await supabase
      .from('transportation_segments')
      .select('id, escalation_state, escalation_deadline, priority')
      .is('driver_id', null)
      .eq('assignment_mode', 'assign_later')
      .eq('escalation_state', 'escalated')
      .in('status', ['draft', 'scheduled']);

    if (escalatedError) {
      throw new Error(`Failed to fetch escalated segments: ${escalatedError.message}`);
    }

    // Get active alerts
    const { data: activeAlerts, error: alertsError } = await supabase
      .from('escalation_alerts')
      .select('alert_type, severity, acknowledged_at')
      .is('resolved_at', null);

    if (alertsError) {
      throw new Error(`Failed to fetch active alerts: ${alertsError.message}`);
    }

    // Get next escalation deadline
    const { data: nextEscalation, error: nextError } = await supabase
      .from('transportation_segments')
      .select('escalation_deadline')
      .is('driver_id', null)
      .eq('assignment_mode', 'assign_later')
      .in('status', ['draft', 'scheduled'])
      .not('escalation_deadline', 'is', null)
      .gte('escalation_deadline', now)
      .order('escalation_deadline', { ascending: true })
      .limit(1)
      .single();

    if (nextError && nextError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to fetch next escalation: ${nextError.message}`);
    }

    const criticalEscalated = escalatedSegments?.filter(s => (s.priority || 50) >= 80).length || 0;
    const sixHourDeadline = activeAlerts?.filter(a => a.alert_type === 'six_hour_deadline').length || 0;
    const dutyManagerAlerts = activeAlerts?.filter(a => a.alert_type === 'duty_manager_alert').length || 0;
    const unacknowledgedAlerts = activeAlerts?.filter(a => !a.acknowledged_at).length || 0;

    return {
      total_escalated: escalatedSegments?.length || 0,
      critical_escalated: criticalEscalated,
      six_hour_deadline: sixHourDeadline,
      duty_manager_alerts: dutyManagerAlerts,
      unacknowledged_alerts: unacknowledgedAlerts,
      next_escalation_deadline: nextEscalation?.escalation_deadline || null
    };
  }

  /**
   * Acknowledge an escalation alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<EscalationAlert> {
    const { data, error } = await supabase
      .from('escalation_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }

    return data;
  }

  /**
   * Resolve an escalation alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<EscalationAlert> {
    const { data, error } = await supabase
      .from('escalation_alerts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to resolve alert: ${error.message}`);
    }

    return data;
  }

  /**
   * Get active alerts for a specific segment
   */
  async getSegmentAlerts(segmentId: string): Promise<EscalationAlert[]> {
    const { data, error } = await supabase
      .from('escalation_alerts')
      .select('*')
      .eq('segment_id', segmentId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch segment alerts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all active alerts
   */
  async getActiveAlerts(): Promise<EscalationAlert[]> {
    const { data, error } = await supabase
      .from('escalation_alerts')
      .select(`
        *,
        segment:segment_id(id, title, planned_start, segment_type),
        appointment:appointment_id(id, patient_name, appointment_date)
      `)
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch active alerts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Private helper methods
   */
  private async getExistingAlert(segmentId: string, alertType: EscalationAlert['alert_type']): Promise<EscalationAlert | null> {
    const { data, error } = await supabase
      .from('escalation_alerts')
      .select('*')
      .eq('segment_id', segmentId)
      .eq('alert_type', alertType)
      .is('resolved_at', null)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check existing alert: ${error.message}`);
    }

    return data || null;
  }

  private calculateSeverity(segment: TransportationSegment): EscalationAlert['severity'] {
    const priority = segment.priority || 50;

    if (priority >= 90) return 'critical';
    if (priority >= 70) return 'high';
    if (priority >= 50) return 'medium';
    return 'low';
  }

  private generateSixHourDeadlineMessage(segment: TransportationSegment): string {
    const appointment = (segment as any).appointment;
    const timeUntilDeadline = segment.escalation_deadline
      ? Math.round((new Date(segment.escalation_deadline).getTime() - new Date().getTime()) / (1000 * 60))
      : 0;

    return `⚠️ SEGMENT APPROACHING DEADLINE\n\n` +
           `Patient: ${appointment?.patient_name || 'Unknown'}\n` +
           `Segment: ${segment.title || segment.segment_type}\n` +
           `Planned Start: ${segment.planned_start ? new Date(segment.planned_start).toLocaleString() : 'Not set'}\n` +
           `Time until escalation: ${timeUntilDeadline} minutes\n` +
           `Priority: ${segment.priority || 50}\n\n` +
           `Please assign a driver or mark as self-transport.`;
  }

  private generateDutyManagerAlertMessage(segment: TransportationSegment): string {
    const appointment = (segment as any).appointment;
    const timeSinceEscalation = segment.escalation_deadline
      ? Math.round((new Date().getTime() - new Date(segment.escalation_deadline).getTime()) / (1000 * 60 * 60))
      : 0;

    return `🚨 CRITICAL ESCALATION - DUTY MANAGER ALERT\n\n` +
           `Patient: ${appointment?.patient_name || 'Unknown'}\n` +
           `Segment: ${segment.title || segment.segment_type}\n` +
           `Planned Start: ${segment.planned_start ? new Date(segment.planned_start).toLocaleString() : 'Not set'}\n` +
           `Escalated for: ${timeSinceEscalation} hours\n` +
           `Priority: ${segment.priority || 50}\n\n` +
           `IMMEDIATE ATTENTION REQUIRED - Segment has been unassigned for over 2 hours past escalation deadline.`;
  }

  private async sendEscalationNotification(alert: EscalationAlert): Promise<void> {
    try {
      // Send to duty manager channel/group
      const dutyManagerChatId = process.env.DUTY_MANAGER_TELEGRAM_CHAT_ID;

      if (dutyManagerChatId) {
        await this.telegramService.sendMessage({
          chatId: dutyManagerChatId,
          message: alert.message,
          parseMode: 'HTML'
        });
      }

      // Also send to general operations channel if different
      const operationsChatId = process.env.OPERATIONS_TELEGRAM_CHAT_ID;

      if (operationsChatId && operationsChatId !== dutyManagerChatId) {
        await this.telegramService.sendMessage({
          chatId: operationsChatId,
          message: alert.message,
          parseMode: 'HTML'
        });
      }
    } catch (error) {
      console.error('Failed to send escalation notification:', error);
      // Don't throw - notification failure shouldn't break the alert creation
    }
  }
}
