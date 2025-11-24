import { ApiErrorHandler } from '@/lib/apiErrorHandler';
import { supabase } from '@/lib/supabase';
import type { UpdateLeadQuote } from '@/types/lead';
import { MockLeadDetailService } from '@/services/mockLeadDetailService';
import { NextRequest, NextResponse } from 'next/server';

const apiErrorHandler = ApiErrorHandler.getInstance();

// PUT /api/leads/[id]/quotes/[quoteId] - Update a quote
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; quoteId: string } }
) {
  try {
    const { id: leadId, quoteId } = params;
    const body = await request.json();

    if (!leadId || !quoteId) {
      return apiErrorHandler.handleValidationError([
        { field: 'id', message: 'Lead ID is required' },
        { field: 'quoteId', message: 'Quote ID is required' }
      ]);
    }

    // Validate required fields
    const { user_id, user_name } = body;

    if (!user_id || !user_name) {
      return apiErrorHandler.handleValidationError([
        { field: 'user_id', message: 'User ID is required' },
        { field: 'user_name', message: 'User name is required' }
      ]);
    }

    const updateData: UpdateLeadQuote = {};

    if (body.service_type !== undefined) {
      if (!body.service_type?.trim()) {
        return apiErrorHandler.handleValidationError([
          { field: 'service_type', message: 'Service type is required' }
        ]);
      }
      updateData.service_type = body.service_type.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (body.amount !== undefined) {
      if (body.amount !== null && body.amount < 0) {
        return apiErrorHandler.handleValidationError([
          { field: 'amount', message: 'Amount cannot be negative' }
        ]);
      }
      updateData.amount = body.amount;
    }

    if (body.currency !== undefined) {
      updateData.currency = body.currency;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // If status is being changed to 'sent', update sent_at and sent_by fields
    if (body.status === 'sent') {
      updateData.sent_at = new Date().toISOString();
      updateData.sent_by_user_id = user_id;
      updateData.sent_by_user_name = user_name;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(leadId);

    if (!isUuid) {
      const updatedQuote = await MockLeadDetailService.updateQuote(leadId, quoteId, {
        ...updateData,
        user_id,
        user_name,
      });

      return NextResponse.json({
        success: true,
        data: updatedQuote,
        message: 'Quote updated successfully'
      });
    }

    const { data: updatedQuote, error } = await supabase
      .from('lead_quotes')
      .update(updateData)
      .eq('id', quoteId)
      .eq('lead_id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead quote:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to update lead quote',
        error.message
      );
    }

    if (!updatedQuote) {
      return apiErrorHandler.handleNotFoundError('Quote not found');
    }

    // Create an activity record for the quote update
    const activityDescription = body.status === 'sent'
      ? `Sent quote for ${updatedQuote.service_type}${updatedQuote.amount ? ` - ${updatedQuote.currency} ${updatedQuote.amount}` : ''}`
      : `Updated quote for ${updatedQuote.service_type}${updatedQuote.amount ? ` - ${updatedQuote.currency} ${updatedQuote.amount}` : ''}`;

    await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        user_id,
        user_name,
        activity_type: body.status === 'sent' ? 'quote_sent' : 'field_updated',
        description: activityDescription,
        metadata: {
          quote_id: quoteId,
          updated_fields: Object.keys(updateData),
          service_type: updatedQuote.service_type,
          amount: updatedQuote.amount
        }
      });

    // Update lead's last_contacted_at if quote was sent
    if (body.status === 'sent') {
      await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', leadId);
    }

    return NextResponse.json({
      success: true,
      data: updatedQuote,
      message: 'Quote updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/leads/[id]/quotes/[quoteId]:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to update lead quote',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// DELETE /api/leads/[id]/quotes/[quoteId] - Delete a quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; quoteId: string } }
) {
  try {
    const { id: leadId, quoteId } = params;
    const body = await request.json();

    if (!leadId || !quoteId) {
      return apiErrorHandler.handleValidationError([
        { field: 'id', message: 'Lead ID is required' },
        { field: 'quoteId', message: 'Quote ID is required' }
      ]);
    }

    // Validate required fields
    const { user_id, user_name } = body;

    if (!user_id || !user_name) {
      return apiErrorHandler.handleValidationError([
        { field: 'user_id', message: 'User ID is required' },
        { field: 'user_name', message: 'User name is required' }
      ]);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(leadId);

    if (!isUuid) {
      await MockLeadDetailService.deleteQuote(leadId, quoteId, user_id, user_name);
      return NextResponse.json({
        success: true,
        message: 'Quote deleted successfully'
      });
    }

    // Get the quote before deleting for activity log
    const { data: quoteToDelete } = await supabase
      .from('lead_quotes')
      .select('service_type, amount, currency')
      .eq('id', quoteId)
      .eq('lead_id', leadId)
      .single();

    const { error } = await supabase
      .from('lead_quotes')
      .delete()
      .eq('id', quoteId)
      .eq('lead_id', leadId);

    if (error) {
      console.error('Error deleting lead quote:', error);
      return apiErrorHandler.handleInternalServerError(
        'Failed to delete lead quote',
        error.message
      );
    }

    // Create an activity record for the quote deletion
    if (quoteToDelete) {
      await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          user_id,
          user_name,
          activity_type: 'field_updated',
          description: `Deleted quote for ${quoteToDelete.service_type}${quoteToDelete.amount ? ` - ${quoteToDelete.currency} ${quoteToDelete.amount}` : ''}`,
          metadata: { quote_id: quoteId, action: 'deleted' }
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Quote deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/leads/[id]/quotes/[quoteId]:', error);
    return apiErrorHandler.handleInternalServerError(
      'Failed to delete lead quote',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
