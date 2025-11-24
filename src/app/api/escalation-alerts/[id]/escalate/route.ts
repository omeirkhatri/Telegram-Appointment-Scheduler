import { isDriverAssignmentOverhaulEscalationEnabled } from '@/lib/featureFlags';
import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if escalation feature is enabled
    if (!isDriverAssignmentOverhaulEscalationEnabled()) {
      return NextResponse.json(
        { error: 'Escalation feature is disabled' },
        { status: 403 }
      );
    }

    const supabase = createServerClient();
    const alertId = params.id;

    // Get the alert details
    const { data: alert, error: fetchError } = await supabase
      .from('escalation_alerts')
      .select(`
        *,
        segment:transportation_segments(
          *,
          appointment:appointments(
            patient_name,
            appointment_date,
            service_line
          )
        )
      `)
      .eq('id', alertId)
      .single();

    if (fetchError || !alert) {
      console.error('Error fetching escalation alert:', fetchError);
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Update the alert to mark duty manager as notified
    const { data, error } = await supabase
      .from('escalation_alerts')
      .update({
        duty_manager_notified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Error updating escalation alert:', error);
      return NextResponse.json(
        { error: 'Failed to escalate alert' },
        { status: 500 }
      );
    }

    // Send notification to duty manager
    try {
      const message = `🚨 CRITICAL ESCALATION ALERT 🚨

Alert Type: ${alert.alert_type.replace('_', ' ').toUpperCase()}
Severity: ${alert.severity.toUpperCase()}
Patient: ${alert.segment?.appointment?.patient_name || 'Unknown'}
Service: ${alert.segment?.appointment?.service_line || 'Unknown'}
Appointment Date: ${alert.segment?.appointment?.appointment_date || 'Unknown'}
Segment Type: ${alert.segment?.segment_type || 'Unknown'}

Message: ${alert.message}

Please review and take immediate action to resolve this escalation.

Alert ID: ${alertId}`;

      // Send to duty manager (you'll need to configure the duty manager's Telegram ID)
      const telegramUserId = process.env.DUTY_MANAGER_TELEGRAM_ID || 'duty_manager_id';
      const telegramMessage = {
        chat_id: telegramUserId,
        text: message,
        parse_mode: 'HTML' as const,
      };

      // Import telegramService to send the message directly
      const { telegramService } = await import('@/services/telegramService');
      await telegramService.sendMessage(telegramMessage);
    } catch (notificationError) {
      console.error('Error sending duty manager notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      alert: data,
      dutyManagerNotified: true
    });
  } catch (error) {
    console.error('Error in escalate to duty manager API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
