import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const headersList = headers();
    const signature = headersList.get('x-n8n-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.stale_leads || !Array.isArray(body.stale_leads)) {
      return NextResponse.json({
        error: 'Missing required fields: stale_leads (array)'
      }, { status: 400 });
    }

    // Log the webhook for debugging
    console.log('Stale Leads Check Webhook:', {
      stale_leads_count: body.stale_leads.length,
      check_time: body.check_time,
      timestamp: new Date().toISOString()
    });

    // Group stale leads by assigned user
    const leadsByUser = body.stale_leads.reduce((acc, lead) => {
      const userId = lead.assigned_to_user_id || 'unassigned';
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(lead);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('Stale leads by user:', Object.keys(leadsByUser).map(userId => ({
      user_id: userId,
      count: leadsByUser[userId].length
    })));

    // Calculate stale lead statistics
    const stats = {
      total_stale_leads: body.stale_leads.length,
      unassigned_stale_leads: leadsByUser.unassigned?.length || 0,
      users_with_stale_leads: Object.keys(leadsByUser).filter(key => key !== 'unassigned').length,
      oldest_stale_lead: Math.max(...body.stale_leads.map(lead => lead.days_since_last_contact || 0))
    };

    console.log('Stale leads statistics:', stats);

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      stats,
      leads_by_user: leadsByUser,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stale Leads Check Webhook Error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
