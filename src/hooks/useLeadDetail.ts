import { LeadDetailService } from '@/services/leadDetailService';
import type { LeadActivity, LeadNote, LeadQuote } from '@/types/lead';
import { useCallback, useEffect, useState } from 'react';

interface UseLeadDetailReturn {
  activities: LeadActivity[];
  notes: LeadNote[];
  quotes: LeadQuote[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createActivity: (activity: Omit<LeadActivity, 'id' | 'created_at'>) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  createNote: (note: Omit<LeadNote, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateNote: (noteId: string, note: Partial<LeadNote>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  createQuote: (quote: Omit<LeadQuote, 'id' | 'created_at' | 'updated_at' | 'sent_at' | 'sent_by_user_id' | 'sent_by_user_name'>) => Promise<void>;
  updateQuote: (quoteId: string, quote: Partial<LeadQuote>) => Promise<void>;
  deleteQuote: (quoteId: string) => Promise<void>;
}

interface UseLeadDetailParams {
  leadId: string;
  userId: string;
  userName: string;
}

export function useLeadDetail(leadId: string, userId: string = 'unknown', userName: string = 'Unknown User'): UseLeadDetailReturn {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [quotes, setQuotes] = useState<LeadQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearNotesBadge = useCallback(() => {
    if (!leadId) return;
    LeadDetailService.markUpdatesAsRead(leadId, { notes: true, quotes: false }).catch(err => {
      console.error('Failed to clear new note notifications:', err);
    });
  }, [leadId]);

  const clearQuotesBadge = useCallback(() => {
    if (!leadId) return;
    LeadDetailService.markUpdatesAsRead(leadId, { notes: false, quotes: true }).catch(err => {
      console.error('Failed to clear new quote notifications:', err);
    });
  }, [leadId]);

  const loadData = useCallback(async () => {
    if (!leadId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await LeadDetailService.getLeadDetailData(leadId);
      setActivities(data.activities);
      setNotes(data.notes);
      setQuotes(data.quotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead detail data');
      console.error('Error loading lead detail data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Activity management
  const createActivity = useCallback(async (activity: Omit<LeadActivity, 'id' | 'created_at'>) => {
    try {
      const newActivity = await LeadDetailService.createActivity(leadId, activity);
      setActivities(prev => [newActivity, ...prev]);
    } catch (err) {
      console.error('Error creating activity:', err);
      throw err;
    }
  }, [leadId]);

  const deleteActivity = useCallback(async (activityId: string) => {
    try {
      await LeadDetailService.deleteActivity(leadId, activityId);
      setActivities(prev => prev.filter(activity => activity.id !== activityId));
    } catch (err) {
      console.error('Error deleting activity:', err);
      throw err;
    }
  }, [leadId]);

  // Notes management
  const createNote = useCallback(async (note: Omit<LeadNote, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newNote = await LeadDetailService.createNote(leadId, note);
      setNotes(prev => [newNote, ...prev]);
      clearNotesBadge();
    } catch (err) {
      console.error('Error creating note:', err);
      throw err;
    }
  }, [leadId, clearNotesBadge]);

  const updateNote = useCallback(async (noteId: string, note: Partial<LeadNote>) => {
    try {
      const updatedNote = await LeadDetailService.updateNote(leadId, noteId, { ...note, user_id: userId, user_name: userName });
      setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n));
      clearNotesBadge();
    } catch (err) {
      console.error('Error updating note:', err);
      throw err;
    }
  }, [leadId, userId, userName, clearNotesBadge]);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      await LeadDetailService.deleteNote(leadId, noteId, userId, userName);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      clearNotesBadge();
    } catch (err) {
      console.error('Error deleting note:', err);
      throw err;
    }
  }, [leadId, userId, userName, clearNotesBadge]);

  // Quote management
  const createQuote = useCallback(async (quote: Omit<LeadQuote, 'id' | 'created_at' | 'updated_at' | 'sent_at' | 'sent_by_user_id' | 'sent_by_user_name'>) => {
    try {
      const newQuote = await LeadDetailService.createQuote(leadId, {
        ...quote,
        user_id: userId,
        user_name: userName,
      });
      setQuotes(prev => [newQuote, ...prev]);
      clearQuotesBadge();
    } catch (err) {
      console.error('Error creating quote:', err);
      throw err;
    }
  }, [leadId, userId, userName, clearQuotesBadge]);

  const updateQuote = useCallback(async (quoteId: string, quote: Partial<LeadQuote>) => {
    try {
      const updatedQuote = await LeadDetailService.updateQuote(leadId, quoteId, { ...quote, user_id: userId, user_name: userName });
      setQuotes(prev => prev.map(q => q.id === quoteId ? updatedQuote : q));
      clearQuotesBadge();
    } catch (err) {
      console.error('Error updating quote:', err);
      throw err;
    }
  }, [leadId, userId, userName, clearQuotesBadge]);

  const deleteQuote = useCallback(async (quoteId: string) => {
    try {
      await LeadDetailService.deleteQuote(leadId, quoteId, userId, userName);
      setQuotes(prev => prev.filter(quote => quote.id !== quoteId));
      clearQuotesBadge();
    } catch (err) {
      console.error('Error deleting quote:', err);
      throw err;
    }
  }, [leadId, userId, userName, clearQuotesBadge]);

  // Load data on mount and when leadId changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    activities,
    notes,
    quotes,
    isLoading,
    error,
    refreshData,
    createActivity,
    deleteActivity,
    createNote,
    updateNote,
    deleteNote,
    createQuote,
    updateQuote,
    deleteQuote,
  };
}
