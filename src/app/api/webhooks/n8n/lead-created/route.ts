import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (implement your own verification logic)
    const headersList = headers();
    const signature = headersList.get('x-n8n-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.lead_id || !body.name || !body.phone) {
      return NextResponse.json({
        error: 'Missing required fields: lead_id, name, phone'
      }, { status: 400 });
    }

    // Log the webhook for debugging
    console.log('Lead Created Webhook:', {
      lead_id: body.lead_id,
      name: body.name,
      service: body.service_interested_in,
      stage: body.stage,
      timestamp: new Date().toISOString()
    });

    // Here you would typically trigger n8n workflows
    // For now, we'll just acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      lead_id: body.lead_id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lead Created Webhook Error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
