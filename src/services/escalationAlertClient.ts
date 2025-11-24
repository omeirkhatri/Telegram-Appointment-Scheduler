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

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const escalationAlertClient = {
  async getSegmentAlerts(segmentId: string): Promise<EscalationAlert[]> {
    const res = await fetch(`/api/escalation-alerts?segment_id=${encodeURIComponent(segmentId)}`);
    const data = await handleJson<{ data: EscalationAlert[] }>(res);
    return data.data || [];
  },

  async acknowledgeAlert(alertId: string, userId: string): Promise<EscalationAlert> {
    const res = await fetch(`/api/escalation-alerts/${encodeURIComponent(alertId)}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledged_by: userId }),
    });
    const data = await handleJson<{ data: EscalationAlert }>(res);
    return data.data;
  },

  async resolveAlert(alertId: string, userId: string): Promise<EscalationAlert> {
    const res = await fetch(`/api/escalation-alerts/${encodeURIComponent(alertId)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved_by: userId }),
    });
    const data = await handleJson<{ data: EscalationAlert }>(res);
    return data.data;
  },
};

export type { EscalationAlert as EscalationAlertClientType };


