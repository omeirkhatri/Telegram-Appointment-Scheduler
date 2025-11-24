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

    // Update the alert to mark it as acknowledged
    const { data, error } = await supabase
      .from('escalation_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Error acknowledging escalation alert:', error);
      return NextResponse.json(
        { error: 'Failed to acknowledge alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: data
    });
  } catch (error) {
    console.error('Error in acknowledge escalation alert API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



