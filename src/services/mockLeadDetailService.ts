import type {
  LeadActivity,
  LeadActivityType,
  LeadNote,
  LeadQuote,
  QuoteStatus,
} from '@/types/lead';
import { randomUUID } from 'crypto';

interface LeadDetailData {
  activities: LeadActivity[];
  notes: LeadNote[];
  quotes: LeadQuote[];
  unread: {
    notes: Set<string>;
    quotes: Set<string>;
  };
}

type NoteUpdatePayload = {
  note?: string;
  is_pinned?: boolean;
  user_id: string;
  user_name: string;
};

type QuoteUpdatePayload = {
  service_type?: string | null;
  description?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: QuoteStatus | null;
  user_id: string;
  user_name: string;
};

const DEFAULT_USER_ID = 'mock-user';
const DEFAULT_USER_NAME = 'Medicare Admin';

const leadDetails = new Map<string, LeadDetailData>();

function generateId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function buildActivity(params: {
  leadId: string;
  activityType: LeadActivityType;
  description: string;
  daysAgo?: number;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}): LeadActivity {
  const {
    leadId,
    activityType,
    description,
    daysAgo = 0,
    userId = DEFAULT_USER_ID,
    userName = DEFAULT_USER_NAME,
    metadata = {},
    oldValue,
    newValue,
  } = params;

  return {
    id: generateId('activity'),
    lead_id: leadId,
    user_id: userId,
    user_name: userName,
    activity_type: activityType,
    description,
    old_value: oldValue ?? undefined,
    new_value: newValue ?? undefined,
    metadata,
    created_at: daysAgo > 0 ? daysAgoFn(daysAgo) : new Date().toISOString(),
  };
}

function daysAgoFn(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildNote(params: {
  leadId: string;
  note: string;
  isPinned?: boolean;
  daysAgo?: number;
  userId?: string;
  userName?: string;
}): LeadNote {
  const {
    leadId,
    note,
    isPinned = false,
    daysAgo = 0,
    userId = DEFAULT_USER_ID,
    userName = DEFAULT_USER_NAME,
  } = params;

  const timestamp = daysAgo > 0 ? daysAgoFn(daysAgo) : new Date().toISOString();

  return {
    id: generateId('note'),
    lead_id: leadId,
    user_id: userId,
    user_name: userName,
    note,
    is_pinned: isPinned,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function buildQuote(params: {
  leadId: string;
  serviceType: string;
  amount?: number;
  currency?: string;
  status?: QuoteStatus;
  description?: string;
  daysAgo?: number;
  sent?: boolean;
  userId?: string;
  userName?: string;
}): LeadQuote {
  const {
    leadId,
    serviceType,
    amount,
    currency = 'AED',
    status = 'draft',
    description,
    daysAgo = 0,
    sent = false,
    userId = DEFAULT_USER_ID,
    userName = DEFAULT_USER_NAME,
  } = params;

  const createdAt = daysAgo > 0 ? daysAgoFn(daysAgo) : new Date().toISOString();

  return {
    id: generateId('quote'),
    lead_id: leadId,
    service_type: serviceType,
    description,
    amount,
    currency,
    status,
    sent_at: sent ? createdAt : undefined,
    sent_by_user_id: sent ? userId : undefined,
    sent_by_user_name: sent ? userName : undefined,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function seedLeadDetails() {
  const seeds: Array<{ id: string; activities: LeadActivity[]; notes: LeadNote[]; quotes: LeadQuote[] }> = [
    {
      id: '1',
      activities: [
        buildActivity({
          leadId: '1',
          activityType: 'created',
          description: 'Lead imported from Google Sheets.',
          daysAgo: 7,
          metadata: { source: 'google_sheets' },
        }),
        buildActivity({
          leadId: '1',
          activityType: 'assigned',
          description: 'Lead assigned to Sarah Johnson.',
          daysAgo: 6,
          metadata: { assigned_to: 'Sarah Johnson' },
        }),
        buildActivity({
          leadId: '1',
          activityType: 'note_added',
          description: 'Added initial consultation notes.',
          daysAgo: 4,
          metadata: { note_id: 'initial' },
        }),
      ],
      notes: [
        buildNote({
          leadId: '1',
          note: 'Customer interested in newborn care package. Follow up next week.',
          isPinned: true,
          daysAgo: 4,
        }),
        buildNote({
          leadId: '1',
          note: 'Shared pricing details via WhatsApp.',
          daysAgo: 2,
        }),
      ],
      quotes: [
        buildQuote({
          leadId: '1',
          serviceType: 'Newborn Care Package',
          amount: 3500,
          status: 'sent',
          description: 'Includes night nurse for 3 weeks.',
          daysAgo: 3,
          sent: true,
        }),
      ],
    },
    {
      id: '2',
      activities: [
        buildActivity({
          leadId: '2',
          activityType: 'created',
          description: 'Lead captured from referral program.',
          daysAgo: 10,
          metadata: { source: 'referral' },
        }),
        buildActivity({
          leadId: '2',
          activityType: 'stage_changed',
          description: 'Stage moved to contacted.',
          daysAgo: 9,
          oldValue: { stage: 'new' },
          newValue: { stage: 'contacted' },
        }),
      ],
      notes: [
        buildNote({
          leadId: '2',
          note: 'Prefers female caregiver with elderly care experience.',
          daysAgo: 8,
        }),
      ],
      quotes: [
        buildQuote({
          leadId: '2',
          serviceType: 'Elderly Care - Daily Visits',
          amount: 2200,
          status: 'draft',
          description: 'Daily visits for 2 hours.',
          daysAgo: 5,
        }),
      ],
    },
    {
      id: '3',
      activities: [
        buildActivity({
          leadId: '3',
          activityType: 'created',
          description: 'Lead imported from Google Sheets.',
          daysAgo: 3,
        }),
        buildActivity({
          leadId: '3',
          activityType: 'quote_sent',
          description: 'Sent physiotherapy session quote.',
          daysAgo: 2,
          metadata: { amount: 1800 },
        }),
      ],
      notes: [
        buildNote({
          leadId: '3',
          note: 'Family looking for twice weekly physiotherapy.',
          daysAgo: 3,
        }),
      ],
      quotes: [
        buildQuote({
          leadId: '3',
          serviceType: 'Physiotherapy Sessions',
          amount: 1800,
          status: 'sent',
          description: '10 session package.',
          daysAgo: 2,
          sent: true,
        }),
      ],
    },
    {
      id: '4',
      activities: [
        buildActivity({
          leadId: '4',
          activityType: 'created',
          description: 'Lead created manually by admin.',
          daysAgo: 12,
        }),
        buildActivity({
          leadId: '4',
          activityType: 'note_added',
          description: 'Added follow-up note.',
          daysAgo: 6,
        }),
      ],
      notes: [
        buildNote({
          leadId: '4',
          note: 'Needs caregiver starting next month.',
          daysAgo: 6,
        }),
      ],
      quotes: [],
    },
    {
      id: '5',
      activities: [
        buildActivity({
          leadId: '5',
          activityType: 'created',
          description: 'Lead imported from Facebook campaign.',
          daysAgo: 15,
          metadata: { campaign: 'FB-Q1-2024' },
        }),
        buildActivity({
          leadId: '5',
          activityType: 'stage_changed',
          description: 'Lead marked as not qualified.',
          daysAgo: 13,
          oldValue: { stage: 'contacted' },
          newValue: { stage: 'not_qualified' },
        }),
      ],
      notes: [
        buildNote({
          leadId: '5',
          note: 'Lead opted for competitor service for pricing reasons.',
          daysAgo: 12,
        }),
      ],
      quotes: [],
    },
  ];

  seeds.forEach(({ id, activities, notes, quotes }) => {
    const unreadNotes = new Set<string>();
    const unreadQuotes = new Set<string>();

    if (notes.length > 0) {
      unreadNotes.add(notes[0].id);
    }
    if (quotes.length > 0) {
      unreadQuotes.add(quotes[0].id);
    }

    leadDetails.set(id, {
      activities: [...activities],
      notes: [...notes],
      quotes: [...quotes],
      unread: {
        notes: unreadNotes,
        quotes: unreadQuotes,
      },
    });
  });
}

seedLeadDetails();

export class MockLeadDetailService {
  private static ensureLead(leadId: string): LeadDetailData {
    if (!leadDetails.has(leadId)) {
      leadDetails.set(leadId, {
        activities: [],
        notes: [],
        quotes: [],
        unread: {
          notes: new Set<string>(),
          quotes: new Set<string>(),
        },
      });
    }
    return leadDetails.get(leadId)!;
  }

  static initializeLead(leadId: string) {
    this.ensureLead(leadId);
  }

  static removeLead(leadId: string) {
    leadDetails.delete(leadId);
  }

  static getLeadCounts(leadId: string) {
    const data = this.ensureLead(leadId);
    return {
      activities: data.activities.length,
      notes: data.notes.length,
      quotes: data.quotes.length,
      newNotes: data.unread.notes.size,
      newQuotes: data.unread.quotes.size,
    };
  }

  static markUpdatesAsRead(
    leadId: string,
    options: { notes?: boolean; quotes?: boolean } = { notes: true, quotes: true },
  ) {
    const data = this.ensureLead(leadId);
    if (options.notes !== false) {
      data.unread.notes.clear();
    }
    if (options.quotes !== false) {
      data.unread.quotes.clear();
    }

    return {
      notes: data.unread.notes.size,
      quotes: data.unread.quotes.size,
    };
  }

  static async getLeadDetailData(leadId: string) {
    const data = this.ensureLead(leadId);
    return {
      activities: [...data.activities],
      notes: [...data.notes],
      quotes: [...data.quotes],
    };
  }

  static async getActivities(leadId: string) {
    const data = this.ensureLead(leadId);
    return [...data.activities].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  static async createActivity(
    leadId: string,
    activity: Omit<LeadActivity, 'id' | 'created_at'>,
  ): Promise<LeadActivity> {
    const data = this.ensureLead(leadId);
    const newActivity: LeadActivity = {
      id: generateId('activity'),
      lead_id: leadId,
      user_id: activity.user_id || DEFAULT_USER_ID,
      user_name: activity.user_name || DEFAULT_USER_NAME,
      activity_type: activity.activity_type,
      description: activity.description,
      old_value: activity.old_value ?? undefined,
      new_value: activity.new_value ?? undefined,
      metadata: activity.metadata ?? {},
      created_at: new Date().toISOString(),
    };

    data.activities.unshift(newActivity);
    return newActivity;
  }

  static async deleteActivity(leadId: string, activityId: string): Promise<void> {
    const data = this.ensureLead(leadId);
    data.activities = data.activities.filter(activity => activity.id !== activityId);
  }

  static async getNotes(leadId: string) {
    const data = this.ensureLead(leadId);
    return [...data.notes];
  }

  static async createNote(
    leadId: string,
    note: Omit<LeadNote, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<LeadNote> {
    const data = this.ensureLead(leadId);
    const timestamp = new Date().toISOString();

    const newNote: LeadNote = {
      id: generateId('note'),
      lead_id: leadId,
      user_id: note.user_id || DEFAULT_USER_ID,
      user_name: note.user_name || DEFAULT_USER_NAME,
      note: note.note,
      is_pinned: note.is_pinned ?? false,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.notes.unshift(newNote);
    data.unread.notes.add(newNote.id);

    await this.createActivity(leadId, {
      lead_id: leadId,
      user_id: newNote.user_id,
      user_name: newNote.user_name,
      activity_type: 'note_added',
      description: `Added a note: "${newNote.note.substring(0, 50)}${
        newNote.note.length > 50 ? '...' : ''
      }"`,
      metadata: { note_id: newNote.id },
    });

    return newNote;
  }

  static async updateNote(
    leadId: string,
    noteId: string,
    payload: NoteUpdatePayload,
  ): Promise<LeadNote> {
    const data = this.ensureLead(leadId);
    const noteIndex = data.notes.findIndex(note => note.id === noteId);

    if (noteIndex === -1) {
      throw new Error('Note not found');
    }

    const existingNote = data.notes[noteIndex];
    const updatedNote: LeadNote = {
      ...existingNote,
      note: payload.note !== undefined ? payload.note : existingNote.note,
      is_pinned:
        payload.is_pinned !== undefined ? payload.is_pinned : existingNote.is_pinned,
      updated_at: new Date().toISOString(),
    };

    data.notes[noteIndex] = updatedNote;
    data.unread.notes.add(noteId);

    await this.createActivity(leadId, {
      lead_id: leadId,
      user_id: payload.user_id,
      user_name: payload.user_name,
      activity_type: 'field_updated',
      description: `Updated a note${
        payload.note
          ? `: "${payload.note.substring(0, 50)}${payload.note.length > 50 ? '...' : ''}"`
          : ''
      }`,
      metadata: {
        note_id: noteId,
        updated_fields: Object.keys({
          ...(payload.note !== undefined && { note: true }),
          ...(payload.is_pinned !== undefined && { is_pinned: true }),
        }),
      },
    });

    return updatedNote;
  }

  static async deleteNote(
    leadId: string,
    noteId: string,
    userId: string,
    userName: string,
  ): Promise<void> {
    const data = this.ensureLead(leadId);
    const noteToDelete = data.notes.find(note => note.id === noteId);

    data.notes = data.notes.filter(note => note.id !== noteId);
    data.unread.notes.delete(noteId);

    if (noteToDelete) {
      await this.createActivity(leadId, {
        lead_id: leadId,
        user_id: userId,
        user_name: userName,
        activity_type: 'field_updated',
        description: `Deleted a note: "${noteToDelete.note.substring(0, 50)}${
          noteToDelete.note.length > 50 ? '...' : ''
        }"`,
        metadata: { note_id: noteId, action: 'deleted' },
      });
    }
  }

  static async getQuotes(leadId: string) {
    const data = this.ensureLead(leadId);
    return [...data.quotes];
  }

  static async createQuote(
    leadId: string,
    quote: Omit<
      LeadQuote,
      'id' | 'created_at' | 'updated_at' | 'sent_at' | 'sent_by_user_id' | 'sent_by_user_name'
    > & { user_id?: string; user_name?: string },
  ): Promise<LeadQuote> {
    const data = this.ensureLead(leadId);
    const timestamp = new Date().toISOString();
    const userId = quote.user_id || DEFAULT_USER_ID;
    const userName = quote.user_name || DEFAULT_USER_NAME;
    const status = quote.status || 'draft';

    const newQuote: LeadQuote = {
      id: generateId('quote'),
      lead_id: leadId,
      service_type: quote.service_type,
      description: quote.description ?? null,
      amount: quote.amount ?? null,
      currency: quote.currency || 'AED',
      status,
      sent_at: status === 'sent' ? timestamp : undefined,
      sent_by_user_id: status === 'sent' ? userId : undefined,
      sent_by_user_name: status === 'sent' ? userName : undefined,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.quotes.unshift(newQuote);
    data.unread.quotes.add(newQuote.id);

    await this.createActivity(leadId, {
      lead_id: leadId,
      user_id: userId,
      user_name: userName,
      activity_type: status === 'sent' ? 'quote_sent' : 'field_updated',
      description: `Created a quote for ${newQuote.service_type}${
        newQuote.amount ? ` - ${newQuote.currency} ${newQuote.amount}` : ''
      }`,
      metadata: { quote_id: newQuote.id, amount: newQuote.amount },
    });

    return newQuote;
  }

  static async updateQuote(
    leadId: string,
    quoteId: string,
    payload: QuoteUpdatePayload,
  ): Promise<LeadQuote> {
    const data = this.ensureLead(leadId);
    const quoteIndex = data.quotes.findIndex(quote => quote.id === quoteId);

    if (quoteIndex === -1) {
      throw new Error('Quote not found');
    }

    const existingQuote = data.quotes[quoteIndex];
    const status = payload.status ?? existingQuote.status;
    const updatedQuote: LeadQuote = {
      ...existingQuote,
      service_type:
        payload.service_type !== undefined && payload.service_type !== null
          ? payload.service_type
          : existingQuote.service_type,
      description:
        payload.description !== undefined ? payload.description : existingQuote.description,
      amount:
        payload.amount !== undefined && payload.amount !== null
          ? payload.amount
          : existingQuote.amount,
      currency:
        payload.currency !== undefined && payload.currency !== null
          ? payload.currency
          : existingQuote.currency,
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : existingQuote.sent_at,
      sent_by_user_id: status === 'sent' ? payload.user_id : existingQuote.sent_by_user_id,
      sent_by_user_name: status === 'sent' ? payload.user_name : existingQuote.sent_by_user_name,
      updated_at: new Date().toISOString(),
    };

    data.quotes[quoteIndex] = updatedQuote;
    data.unread.quotes.add(quoteId);

    const activityDescription =
      status === 'sent'
        ? `Sent quote for ${updatedQuote.service_type}${
            updatedQuote.amount ? ` - ${updatedQuote.currency} ${updatedQuote.amount}` : ''
          }`
        : `Updated quote for ${updatedQuote.service_type}${
            updatedQuote.amount ? ` - ${updatedQuote.currency} ${updatedQuote.amount}` : ''
          }`;

    await this.createActivity(leadId, {
      lead_id: leadId,
      user_id: payload.user_id,
      user_name: payload.user_name,
      activity_type: status === 'sent' ? 'quote_sent' : 'field_updated',
      description: activityDescription,
      metadata: {
        quote_id: quoteId,
        updated_fields: Object.keys({
          ...(payload.service_type !== undefined && { service_type: true }),
          ...(payload.description !== undefined && { description: true }),
          ...(payload.amount !== undefined && { amount: true }),
          ...(payload.currency !== undefined && { currency: true }),
          ...(payload.status !== undefined && { status: true }),
        }),
      },
    });

    return updatedQuote;
  }

  static async deleteQuote(
    leadId: string,
    quoteId: string,
    userId: string,
    userName: string,
  ): Promise<void> {
    const data = this.ensureLead(leadId);
    const quoteToDelete = data.quotes.find(quote => quote.id === quoteId);

    data.quotes = data.quotes.filter(quote => quote.id !== quoteId);
    data.unread.quotes.delete(quoteId);

    if (quoteToDelete) {
      await this.createActivity(leadId, {
        lead_id: leadId,
        user_id: userId,
        user_name: userName,
        activity_type: 'field_updated',
        description: `Deleted quote for ${quoteToDelete.service_type}${
          quoteToDelete.amount ? ` - ${quoteToDelete.currency} ${quoteToDelete.amount}` : ''
        }`,
        metadata: { quote_id: quoteId, action: 'deleted' },
      });
    }
  }
}
