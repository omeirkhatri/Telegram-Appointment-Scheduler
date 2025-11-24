import type { LeadActivity, LeadNote, LeadQuote } from '@/types/lead';

export class LeadDetailService {
  private static baseUrl = '/api/leads';

  // Activity Management
  static async getActivities(leadId: string): Promise<LeadActivity[]> {
    const response = await fetch(`${this.baseUrl}/${leadId}/activities`);
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    const data = await response.json();
    return data.data || [];
  }

  static async createActivity(
    leadId: string,
    activity: Omit<LeadActivity, 'id' | 'created_at'>
  ): Promise<LeadActivity> {
    const response = await fetch(`${this.baseUrl}/${leadId}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      throw new Error('Failed to create activity');
    }

    const data = await response.json();
    return data.data;
  }

  static async deleteActivity(leadId: string, activityId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${leadId}/activities/${activityId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete activity');
    }
  }

  // Notes Management
  static async getNotes(leadId: string): Promise<LeadNote[]> {
    const response = await fetch(`${this.baseUrl}/${leadId}/notes`);
    if (!response.ok) {
      throw new Error('Failed to fetch notes');
    }
    const data = await response.json();
    return data.data || [];
  }

  static async createNote(
    leadId: string,
    note: Omit<LeadNote, 'id' | 'created_at' | 'updated_at'>
  ): Promise<LeadNote> {
    const response = await fetch(`${this.baseUrl}/${leadId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(note),
    });

    if (!response.ok) {
      throw new Error('Failed to create note');
    }

    const data = await response.json();
    return data.data;
  }

  static async updateNote(
    leadId: string,
    noteId: string,
    note: Partial<LeadNote> & { user_id: string; user_name: string }
  ): Promise<LeadNote> {
    const response = await fetch(`${this.baseUrl}/${leadId}/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(note),
    });

    if (!response.ok) {
      throw new Error('Failed to update note');
    }

    const data = await response.json();
    return data.data;
  }

  static async deleteNote(
    leadId: string,
    noteId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${leadId}/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, user_name: userName }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete note');
    }
  }

  // Quote Management
  static async getQuotes(leadId: string): Promise<LeadQuote[]> {
    const response = await fetch(`${this.baseUrl}/${leadId}/quotes`);
    if (!response.ok) {
      throw new Error('Failed to fetch quotes');
    }
    const data = await response.json();
    return data.data || [];
  }

  static async createQuote(
    leadId: string,
    quote: Omit<LeadQuote, 'id' | 'created_at' | 'updated_at' | 'sent_at' | 'sent_by_user_id' | 'sent_by_user_name'> & { user_id?: string; user_name?: string }
  ): Promise<LeadQuote> {
    const response = await fetch(`${this.baseUrl}/${leadId}/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quote),
    });

    if (!response.ok) {
      throw new Error('Failed to create quote');
    }

    const data = await response.json();
    return data.data;
  }

  static async updateQuote(
    leadId: string,
    quoteId: string,
    quote: Partial<LeadQuote> & { user_id: string; user_name: string }
  ): Promise<LeadQuote> {
    const response = await fetch(`${this.baseUrl}/${leadId}/quotes/${quoteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quote),
    });

    if (!response.ok) {
      throw new Error('Failed to update quote');
    }

    const data = await response.json();
    return data.data;
  }

  static async deleteQuote(
    leadId: string,
    quoteId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${leadId}/quotes/${quoteId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, user_name: userName }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete quote');
    }
  }

  // Bulk operations for initial data loading
  static async getLeadDetailData(leadId: string): Promise<{
    activities: LeadActivity[];
    notes: LeadNote[];
    quotes: LeadQuote[];
  }> {
    const [activities, notes, quotes] = await Promise.all([
      this.getActivities(leadId),
      this.getNotes(leadId),
      this.getQuotes(leadId),
    ]);

    return { activities, notes, quotes };
  }

  static async markUpdatesAsRead(
    leadId: string,
    options: { notes?: boolean; quotes?: boolean } = {},
  ): Promise<{ new_notes_count?: number; new_quotes_count?: number }> {
    const response = await fetch(`${this.baseUrl}/${leadId}/updates`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error('Failed to mark lead updates as read');
    }

    const data = await response.json();
    return data.data || {};
  }
}
