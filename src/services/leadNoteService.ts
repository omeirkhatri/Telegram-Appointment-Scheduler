import { supabase } from '@/lib/supabase';
import type { LeadNote, UpdateLeadNote } from '@/types/lead';
import { LeadActivityService } from './leadActivityService';

export class LeadNoteService {
  /**
   * Create note for a lead
   */
  static async createNote(leadId: string, userId: string, note: string, isPinned: boolean = false): Promise<LeadNote> {
    // Get user name for denormalization
    const { data: user } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const { data: leadNote, error } = await supabase
      .from('lead_notes')
      .insert({
        lead_id: leadId,
        user_id: userId,
        user_name: user?.full_name || 'Unknown User',
        note: note.trim(),
        is_pinned: isPinned,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create note: ${error.message}`);
    }

    // Log note addition activity
    await LeadActivityService.logNoteAdded(
      leadId,
      userId,
      leadNote.id,
      note.trim()
    );

    return leadNote;
  }

  /**
   * Get notes for a lead
   */
  static async getLeadNotes(leadId: string): Promise<LeadNote[]> {
    const { data, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get lead notes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update note
   */
  static async updateNote(noteId: string, data: UpdateLeadNote, userId: string): Promise<LeadNote> {
    const { data: note, error } = await supabase
      .from('lead_notes')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update note: ${error.message}`);
    }

    return note;
  }

  /**
   * Delete note
   */
  static async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('lead_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`);
    }
  }

  /**
   * Pin/unpin note
   */
  static async pinNote(noteId: string, isPinned: boolean): Promise<LeadNote> {
    const { data: note, error } = await supabase
      .from('lead_notes')
      .update({
        is_pinned: isPinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to pin/unpin note: ${error.message}`);
    }

    return note;
  }

  /**
   * Get note by ID
   */
  static async getNoteById(noteId: string): Promise<LeadNote> {
    const { data, error } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (error) {
      throw new Error(`Failed to get note: ${error.message}`);
    }

    return data;
  }

  /**
   * Get notes by user
   */
  static async getUserNotes(userId: string, limit: number = 100): Promise<LeadNote[]> {
    const { data, error } = await supabase
      .from('lead_notes')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user notes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Search notes
   */
  static async searchNotes(query: string, leadId?: string): Promise<LeadNote[]> {
    let supabaseQuery = supabase
      .from('lead_notes')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .ilike('note', `%${query}%`)
      .order('created_at', { ascending: false });

    if (leadId) {
      supabaseQuery = supabaseQuery.eq('lead_id', leadId);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      throw new Error(`Failed to search notes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get note statistics
   */
  static async getNoteStatistics(): Promise<{
    total_notes: number;
    pinned_notes: number;
    notes_by_user: Record<string, number>;
  }> {
    const { data: notes, error } = await supabase
      .from('lead_notes')
      .select('user_id, is_pinned');

    if (error) {
      throw new Error(`Failed to get note statistics: ${error.message}`);
    }

    const total_notes = notes.length;
    const pinned_notes = notes.filter(note => note.is_pinned).length;

    const notes_by_user = notes.reduce((acc, note) => {
      acc[note.user_id] = (acc[note.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_notes,
      pinned_notes,
      notes_by_user,
    };
  }
}



