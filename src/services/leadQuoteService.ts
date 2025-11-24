import { supabase } from '@/lib/supabase';
import type { CreateLeadQuote, LeadQuote, QuoteStatus, UpdateLeadQuote } from '@/types/lead';
import { LeadActivityService } from './leadActivityService';

export class LeadQuoteService {
  /**
   * Create quote for a lead
   */
  static async createQuote(leadId: string, data: CreateLeadQuote, userId: string): Promise<LeadQuote> {
    const { data: quote, error } = await supabase
      .from('lead_quotes')
      .insert({
        lead_id: leadId,
        service_type: data.service_type,
        description: data.description,
        amount: data.amount,
        currency: data.currency || 'AED',
        status: data.status || 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create quote: ${error.message}`);
    }

    return quote;
  }

  /**
   * Get quotes for a lead
   */
  static async getLeadQuotes(leadId: string): Promise<LeadQuote[]> {
    const { data, error } = await supabase
      .from('lead_quotes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get lead quotes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get quote by ID
   */
  static async getQuoteById(quoteId: string): Promise<LeadQuote> {
    const { data, error } = await supabase
      .from('lead_quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error) {
      throw new Error(`Failed to get quote: ${error.message}`);
    }

    return data;
  }

  /**
   * Update quote
   */
  static async updateQuote(quoteId: string, data: UpdateLeadQuote, userId: string): Promise<LeadQuote> {
    const { data: quote, error } = await supabase
      .from('lead_quotes')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update quote: ${error.message}`);
    }

    return quote;
  }

  /**
   * Mark quote as sent
   */
  static async markQuoteSent(quoteId: string, userId: string): Promise<LeadQuote> {
    // Get user name for denormalization
    const { data: user } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const { data: quote, error } = await supabase
      .from('lead_quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by_user_id: userId,
        sent_by_user_name: user?.full_name || 'Unknown User',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark quote as sent: ${error.message}`);
    }

    // Log quote sent activity
    await LeadActivityService.logQuoteSent(
      quote.lead_id,
      userId,
      quoteId,
      quote.service_type,
      quote.amount
    );

    return quote;
  }

  /**
   * Update quote status
   */
  static async updateQuoteStatus(quoteId: string, status: QuoteStatus, userId?: string): Promise<LeadQuote> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // If status is being updated to 'sent', record who sent it
    if (status === 'sent' && userId) {
      const { data: user } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      updateData.sent_at = new Date().toISOString();
      updateData.sent_by_user_id = userId;
      updateData.sent_by_user_name = user?.full_name || 'Unknown User';
    }

    const { data: quote, error } = await supabase
      .from('lead_quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update quote status: ${error.message}`);
    }

    // Log quote sent activity if status changed to 'sent'
    if (status === 'sent' && userId) {
      await LeadActivityService.logQuoteSent(
        quote.lead_id,
        userId,
        quoteId,
        quote.service_type,
        quote.amount
      );
    }

    return quote;
  }

  /**
   * Delete quote
   */
  static async deleteQuote(quoteId: string): Promise<void> {
    const { error } = await supabase
      .from('lead_quotes')
      .delete()
      .eq('id', quoteId);

    if (error) {
      throw new Error(`Failed to delete quote: ${error.message}`);
    }
  }

  /**
   * Get quotes by user
   */
  static async getUserQuotes(userId: string, limit: number = 100): Promise<LeadQuote[]> {
    const { data, error } = await supabase
      .from('lead_quotes')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq('sent_by_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user quotes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get quotes by status
   */
  static async getQuotesByStatus(status: QuoteStatus): Promise<LeadQuote[]> {
    const { data, error } = await supabase
      .from('lead_quotes')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get quotes by status: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Search quotes
   */
  static async searchQuotes(query: string, leadId?: string): Promise<LeadQuote[]> {
    let supabaseQuery = supabase
      .from('lead_quotes')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .or(`service_type.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (leadId) {
      supabaseQuery = supabaseQuery.eq('lead_id', leadId);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      throw new Error(`Failed to search quotes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get quote statistics
   */
  static async getQuoteStatistics(): Promise<{
    total_quotes: number;
    quotes_by_status: Record<string, number>;
    total_quote_value: number;
    average_quote_value: number;
  }> {
    const { data: quotes, error } = await supabase
      .from('lead_quotes')
      .select('status, amount');

    if (error) {
      throw new Error(`Failed to get quote statistics: ${error.message}`);
    }

    const total_quotes = quotes.length;
    const quotes_by_status = quotes.reduce((acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const quotesWithAmount = quotes.filter(quote => quote.amount !== null);
    const total_quote_value = quotesWithAmount.reduce((sum, quote) => sum + (quote.amount || 0), 0);
    const average_quote_value = quotesWithAmount.length > 0 ? total_quote_value / quotesWithAmount.length : 0;

    return {
      total_quotes,
      quotes_by_status,
      total_quote_value,
      average_quote_value,
    };
  }

  /**
   * Get recent quotes
   */
  static async getRecentQuotes(limit: number = 50): Promise<LeadQuote[]> {
    const { data, error } = await supabase
      .from('lead_quotes')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent quotes: ${error.message}`);
    }

    return data || [];
  }
}



