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
    if (!body.lead_id || !body.old_stage || !body.new_stage) {
      return NextResponse.json({
        error: 'Missing required fields: lead_id, old_stage, new_stage'
      }, { status: 400 });
    }

    // Log the webhook for debugging
    console.log('Lead Stage Changed Webhook:', {
      lead_id: body.lead_id,
      old_stage: body.old_stage,
      new_stage: body.new_stage,
      lead_name: body.lead_data?.name,
      service: body.lead_data?.service_interested_in,
      timestamp: new Date().toISOString()
    });

    // Special handling for different stage transitions
    const stageTransitions = {
      'new_to_contacted': 'First contact made',
      'contacted_to_quoted': 'Quote prepared',
      'quoted_to_qualified': 'Lead qualified',
      'qualified_to_converted': 'Lead converted to patient',
      'any_to_not_qualified': 'Lead not qualified'
    };

    const transitionKey = `${body.old_stage}_to_${body.new_stage}`;
    const transitionDescription = stageTransitions[transitionKey] || 'Stage updated';

    console.log('Stage transition:', transitionDescription);

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      lead_id: body.lead_id,
      transition: transitionDescription,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lead Stage Changed Webhook Error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
