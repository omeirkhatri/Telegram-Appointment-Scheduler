import { isDriverAssignmentOverhaulEscalationEnabled } from '@/lib/featureFlags';
import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if escalation feature is enabled
    if (!isDriverAssignmentOverhaulEscalationEnabled()) {
      return NextResponse.json({ alerts: [] });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const severity = searchParams.get('severity');

    let query = supabase
      .from('escalation_alerts')
      .select(`
        *,
        segment:transportation_segments(
          id,
          segment_type,
          planned_start,
          planned_end,
          patient_location,
          appointment:appointments(
            id,
            patient_name,
            appointment_date,
            service_line
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by status
    if (status === 'active') {
      query = query.is('resolved_at', null);
    } else if (status === 'resolved') {
      query = query.not('resolved_at', 'is', null);
    }

    // Filter by severity
    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching escalation alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch escalation alerts' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const alerts = data?.map(alert => ({
      id: alert.id,
      segmentId: alert.segment_id,
      appointmentId: alert.appointment_id,
      alertType: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      createdAt: alert.created_at,
      acknowledgedAt: alert.acknowledged_at,
      resolvedAt: alert.resolved_at,
      dutyManagerNotified: alert.duty_manager_notified,
      segment: alert.segment ? {
        id: alert.segment.id,
        segmentType: alert.segment.segment_type,
        plannedStart: alert.segment.planned_start,
        plannedEnd: alert.segment.planned_end,
        patientLocation: alert.segment.patient_location,
        appointment: alert.segment.appointment ? {
          id: alert.segment.appointment.id,
          patientName: alert.segment.appointment.patient_name,
          appointmentDate: alert.segment.appointment.appointment_date,
          serviceLine: alert.segment.appointment.service_line
        } : undefined
      } : undefined
    })) || [];

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error in escalation-alerts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



