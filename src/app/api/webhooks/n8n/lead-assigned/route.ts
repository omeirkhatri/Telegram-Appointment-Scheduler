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
    if (!body.lead_id || !body.assigned_to_user_id) {
      return NextResponse.json({
        error: 'Missing required fields: lead_id, assigned_to_user_id'
      }, { status: 400 });
    }

    // Log the webhook for debugging
    console.log('Lead Assigned Webhook:', {
      lead_id: body.lead_id,
      assigned_to_user_id: body.assigned_to_user_id,
      assigned_by_user_id: body.assigned_by_user_id,
      assigned_at: body.assigned_at,
      timestamp: new Date().toISOString()
    });

    // Check if this is a reassignment
    const isReassignment = body.assigned_by_user_id &&
                          body.assigned_by_user_id !== body.assigned_to_user_id;

    console.log('Assignment type:', isReassignment ? 'Reassignment' : 'Initial assignment');

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      lead_id: body.lead_id,
      assignment_type: isReassignment ? 'reassignment' : 'initial',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lead Assigned Webhook Error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
