import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { supabase } from '@/lib/supabase';
import type { CreateLeadQuote } from '@/types/lead';
import { MockLeadDetailService } from '@/services/mockLeadDetailService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

// GET /api/leads/[id]/quotes - Get all quotes for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    if (!leadId) {
      return apiErrorHandler.handleValidationError([
        { field: 'id', message: 'Lead ID is required' }
      ]);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(leadId);

    if (!isUuid) {
      const quotes = await MockLeadDetailService.getQuotes(leadId);
      return NextResponse.json({
        success: true,
        data: quotes,
        count: quotes.length,
      });
    }

    const { data: quotes, error } = await supabase
      .from('lead_quotes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead quotes:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to fetch lead quotes',
        error.message
      );
    }

    return NextResponse.json({
      success: true,
      data: quotes || [],
      count: quotes?.length || 0,
    });

  } catch (error) {
    console.error('Error in GET /api/leads/[id]/quotes:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to fetch lead quotes',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// POST /api/leads/[id]/quotes - Create a new quote for a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();

    if (!leadId) {
      return apiErrorHandler.handleValidationError([
        { field: 'id', message: 'Lead ID is required' }
      ]);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(leadId);

    // Validate required fields
    const { user_id, user_name, service_type } = body;

    if (!user_id || !user_name || !service_type?.trim()) {
      return apiErrorHandler.handleValidationError([
        { field: 'user_id', message: 'User ID is required' },
        { field: 'user_name', message: 'User name is required' },
        { field: 'service_type', message: 'Service type is required' }
      ]);
    }

    // Validate amount if provided
    if (body.amount !== undefined && body.amount !== null && body.amount < 0) {
      return apiErrorHandler.handleValidationError([
        { field: 'amount', message: 'Amount cannot be negative' }
      ]);
    }

    const quoteData: CreateLeadQuote = {
      lead_id: leadId,
      service_type: service_type.trim(),
      description: body.description?.trim() || null,
      amount: body.amount || null,
      currency: body.currency || 'AED',
      status: body.status || 'draft',
    };

    if (!isUuid) {
      const newQuote = await MockLeadDetailService.createQuote(leadId, {
        ...quoteData,
        user_id: user_id,
        user_name: user_name,
      });

      return NextResponse.json({
        success: true,
        data: newQuote,
        message: 'Quote created successfully'
      });
    }

    const { data: newQuote, error } = await supabase
      .from('lead_quotes')
      .insert(quoteData)
      .select()
      .single();

    if (error) {
      console.error('Error creating lead quote:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to create lead quote',
        error.message
      );
    }

    // Create an activity record for the quote
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        user_id,
        user_name,
        activity_type: 'quote_sent',
        description: `Created a quote for ${service_type}${body.amount ? ` - ${body.currency} ${body.amount}` : ''}`,
        metadata: { quote_id: newQuote.id, service_type, amount: body.amount }
      });

    // Update lead's last_contacted_at
    await supabase
      .from('leads')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', leadId);

    return NextResponse.json({
      success: true,
      data: newQuote,
      message: 'Quote created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/leads/[id]/quotes:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to create lead quote',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
