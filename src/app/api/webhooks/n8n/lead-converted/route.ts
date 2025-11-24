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
    if (!body.lead_id || !body.patient_id) {
      return NextResponse.json({
        error: 'Missing required fields: lead_id, patient_id'
      }, { status: 400 });
    }

    // Log the webhook for debugging
    console.log('Lead Converted Webhook:', {
      lead_id: body.lead_id,
      patient_id: body.patient_id,
      conversion_time: body.conversion_data?.conversion_time,
      total_days_to_convert: body.conversion_data?.total_days_to_convert,
      timestamp: new Date().toISOString()
    });

    // Calculate conversion metrics
    const conversionMetrics = {
      lead_id: body.lead_id,
      patient_id: body.patient_id,
      conversion_date: new Date().toISOString(),
      days_to_convert: body.conversion_data?.total_days_to_convert || 0,
      final_stage: body.conversion_data?.final_stage || 'converted'
    };

    console.log('Conversion metrics:', conversionMetrics);

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      conversion_metrics: conversionMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lead Converted Webhook Error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
