'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import type { Lead, LeadActivity, LeadNote, LeadQuote } from '@/types/lead';
import { Activity, DollarSign, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { ActivityTimeline } from './ActivityTimeline';
import { NotesManagement } from './NotesManagement';
import { QuoteManagement } from './QuoteManagement';

interface LeadDetailTabsProps {
  lead: Lead;
  activities: LeadActivity[];
  notes: LeadNote[];
  quotes: LeadQuote[];
  onActivityCreate: (activity: Omit<LeadActivity, 'id' | 'created_at'>) => Promise<void>;
  onActivityDelete?: (activityId: string) => Promise<void>;
  onNoteCreate: (note: Omit<LeadNote, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onNoteUpdate: (noteId: string, note: Partial<LeadNote>) => Promise<void>;
  onNoteDelete: (noteId: string) => Promise<void>;
  onQuoteCreate: (quote: Omit<LeadQuote, 'id' | 'created_at' | 'updated_at' | 'sent_at' | 'sent_by_user_id' | 'sent_by_user_name'>) => Promise<void>;
  onQuoteUpdate: (quoteId: string, quote: Partial<LeadQuote>) => Promise<void>;
  onQuoteDelete: (quoteId: string) => Promise<void>;
  currentUserId: string;
  currentUserName: string;
  className?: string;
  activeTab?: 'activities' | 'notes' | 'quotes';
  onTabChange?: (tab: 'activities' | 'notes' | 'quotes') => void;
  showTabHeaders?: boolean;
}

export function LeadDetailTabs({
  lead,
  activities,
  notes,
  quotes,
  onActivityCreate,
  onActivityDelete,
  onNoteCreate,
  onNoteUpdate,
  onNoteDelete,
  onQuoteCreate,
  onQuoteUpdate,
  onQuoteDelete,
  currentUserId,
  currentUserName,
  className = '',
  activeTab,
  onTabChange,
  showTabHeaders = true,
}: LeadDetailTabsProps) {
  const [internalTab, setInternalTab] = useState<'activities' | 'notes' | 'quotes'>('activities');

  const currentTab = activeTab ?? internalTab;

  const handleTabChange = (value: string) => {
    const tabValue = value as 'activities' | 'notes' | 'quotes';
    if (onTabChange) {
      onTabChange(tabValue);
    } else {
      setInternalTab(tabValue);
    }
  };

  // Update tab counts in real-time
  const tabCounts = {
    activities: activities.length,
    notes: notes.length,
    quotes: quotes.length,
  };

  return (
    <div className={className}>
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        {showTabHeaders && (
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Timeline
              {tabCounts.activities > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                  {tabCounts.activities}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notes
              {tabCounts.notes > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                  {tabCounts.notes}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Quotes
              {tabCounts.quotes > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                  {tabCounts.quotes}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="activities" className="mt-6">
          <ActivityTimeline
            leadId={lead.id}
            activities={activities}
            onActivityCreate={onActivityCreate}
            onActivityDelete={onActivityDelete}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <NotesManagement
            leadId={lead.id}
            notes={notes}
            onNoteCreate={onNoteCreate}
            onNoteUpdate={onNoteUpdate}
            onNoteDelete={onNoteDelete}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        </TabsContent>

        <TabsContent value="quotes" className="mt-6">
          <QuoteManagement
            leadId={lead.id}
            quotes={quotes}
            onQuoteCreate={onQuoteCreate}
            onQuoteUpdate={onQuoteUpdate}
            onQuoteDelete={onQuoteDelete}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
