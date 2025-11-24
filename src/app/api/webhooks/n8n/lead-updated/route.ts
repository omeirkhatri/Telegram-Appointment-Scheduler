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
    if (!body.lead_id || !body.changes) {
      return NextResponse.json({
        error: 'Missing required fields: lead_id, changes'
      }, { status: 400 });
    }

    // Log the webhook for debugging
    console.log('Lead Updated Webhook:', {
      lead_id: body.lead_id,
      changes: Object.keys(body.changes),
      timestamp: new Date().toISOString()
    });

    // Check if stage changed (special handling)
    if (body.changes.stage) {
      console.log('Stage changed:', {
        lead_id: body.lead_id,
        old_stage: body.changes.stage.old_value,
        new_stage: body.changes.stage.new_value
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      lead_id: body.lead_id,
      changes_count: Object.keys(body.changes).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lead Updated Webhook Error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
