'use client';

import { GoogleSheetsSyncButton } from '@/components/features/leads/GoogleSheetsSyncButton';
import { LeadCardsView } from '@/components/features/leads/LeadCardsView';
import { LeadDetailModal } from '@/components/features/leads/LeadDetailModal';
import { LeadFilters } from '@/components/features/leads/LeadFilters';
import { LeadKanbanBoard } from '@/components/features/leads/LeadKanbanBoard';
import { LeadModal } from '@/components/features/leads/LeadModal';
import { LeadTableView } from '@/components/features/leads/LeadTableView';
import { LeadTimelineView } from '@/components/features/leads/LeadTimelineView';
import { LeadViewSwitcher, useLeadViewMode } from '@/components/features/leads/LeadViewSwitcher';
import { PageHeader } from '@/components/layout/PageHeader';
import { ShadButton as Button, ShadCard as Card, FilterButton } from '@/components/ui';
import { LeadDetailService } from '@/services/leadDetailService';
import type { Lead, LeadFilters as LeadFiltersType, LeadStage } from '@/types/lead';
import { useEffect, useState } from 'react';

export default function LeadsPage() {
  // Mock user for now - remove authentication requirements
  const user = { id: 'mock-user', role: 'admin' as const };
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFiltersType>({});
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useLeadViewMode();

  // Fetch leads
  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters.stage?.length) {
        filters.stage.forEach(stage => queryParams.append('stage', stage));
      }
      if (filters.status?.length) {
        filters.status.forEach(status => queryParams.append('status', status));
      }
      if (filters.assigned_to_user_id) {
        queryParams.append('assigned_to_user_id', filters.assigned_to_user_id);
      }
      if (filters.search) {
        queryParams.append('search', filters.search);
      }
      if (filters.created_after) {
        queryParams.append('created_after', filters.created_after);
      }
      if (filters.created_before) {
        queryParams.append('created_before', filters.created_before);
      }
      if (filters.source) {
        queryParams.append('source', filters.source);
      }

      const response = await fetch(`/api/leads?${queryParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leads');
      }

      setLeads(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const handleLeadSelect = (lead: Lead) => {
    const hasUnreadNotes = (lead.new_notes_count ?? 0) > 0;
    const hasUnreadQuotes = (lead.new_quotes_count ?? 0) > 0;

    let nextLead = lead;

    if (hasUnreadNotes || hasUnreadQuotes) {
      nextLead = {
        ...lead,
        new_notes_count: hasUnreadNotes ? 0 : lead.new_notes_count,
        new_quotes_count: hasUnreadQuotes ? 0 : lead.new_quotes_count,
      };

      setLeads(prev =>
        prev.map(item => (item.id === lead.id ? nextLead : item))
      );

      LeadDetailService.markUpdatesAsRead(lead.id, {
        notes: hasUnreadNotes,
        quotes: hasUnreadQuotes,
      }).catch(err => {
        console.error('Failed to mark lead updates as read:', err);
      });
    }

    setSelectedLead(nextLead);
    setShowDetailModal(true);
  };

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(prev => prev.map(lead =>
      lead.id === updatedLead.id ? updatedLead : lead
    ));
    setSelectedLead(updatedLead);
  };

  const handleLeadCreate = (newLead: Lead) => {
    setLeads(prev => [newLead, ...prev]);
    setShowLeadModal(false);
  };

  const handleLeadDelete = (leadId: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== leadId));
    if (selectedLead?.id === leadId) {
      setSelectedLead(null);
      setShowDetailModal(false);
    }
  };

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: newStage }),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead stage');
      }

      const data = await response.json();
      handleLeadUpdate(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead stage');
    }
  };

  const handleAssignment = async (leadId: string, userId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigned_to_user_id: userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign lead');
      }

      const data = await response.json();
      handleLeadUpdate(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign lead');
    }
  };

  const handleSyncComplete = () => {
    fetchLeads(); // Refresh leads after sync
  };

  const handleAddNote = (leadId: string) => {
    // TODO: Implement add note functionality
    console.log('Add note for lead:', leadId);
  };

  const handleScheduleFollowUp = (leadId: string) => {
    // TODO: Implement schedule follow-up functionality
    console.log('Schedule follow-up for lead:', leadId);
  };

  const handleConvertToPatient = (leadId: string) => {
    // TODO: Implement convert to patient functionality
    console.log('Convert lead to patient:', leadId);
  };

  // Count active filters
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.stage && filters.stage.length > 0) count++;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.assigned_to_user_id) count++;
    if (filters.source) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  if (loading && leads.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--background]">
      <PageHeader
        title="Lead Management"
        description="Manage and track your leads through the sales pipeline"
        actions={
          <div className="flex items-center space-x-3">
            <LeadViewSwitcher
              currentView={viewMode}
              onViewChange={setViewMode}
            />
            <FilterButton
              onClick={() => setIsFilterPanelOpen(prev => !prev)}
              activeCount={activeFiltersCount}
              isActive={isFilterPanelOpen}
            />
            {user?.role === 'admin' && (
              <GoogleSheetsSyncButton onSyncComplete={handleSyncComplete} />
            )}
            <Button onClick={() => setShowLeadModal(true)}>
              Add Lead
            </Button>
          </div>
        }
      />

      {/* Lead Statistics Overview */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--muted-foreground]">Total Leads</p>
                <p className="text-2xl font-bold text-[--foreground]">{leads.length}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-sm font-semibold">🎯</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--muted-foreground]">New Leads</p>
                <p className="text-2xl font-bold text-[--foreground]">
                  {leads.filter(lead => lead.stage === 'new').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-sm font-semibold">✨</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--muted-foreground]">Qualified</p>
                <p className="text-2xl font-bold text-[--foreground]">
                  {leads.filter(lead => lead.stage === 'qualified').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 text-sm font-semibold">⭐</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[--muted-foreground]">Converted</p>
                <p className="text-2xl font-bold text-[--foreground]">
                  {leads.filter(lead => lead.stage === 'converted').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-600 text-sm font-semibold">🎉</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="fixed top-28 right-6 z-40 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-[--border] bg-[--card] shadow-2xl">
          <LeadFilters
            filters={filters}
            onFiltersChange={setFilters}
            user={user}
            onClose={() => setIsFilterPanelOpen(false)}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-6 pb-4">
          <Card className="border-red-200 bg-red-50">
            <div className="p-4">
              <div className="text-sm text-red-700">{error}</div>
              <Button
                onClick={() => setError(null)}
                variant="ghost"
                size="sm"
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Dismiss
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Area */}
      <div className="px-6 pb-8">
        {viewMode === 'kanban' && (
          <LeadKanbanBoard
            leads={leads}
            onLeadSelect={handleLeadSelect}
            onStageChange={handleStageChange}
            onAssignment={handleAssignment}
            onAddNote={handleAddNote}
            onScheduleFollowUp={handleScheduleFollowUp}
            onConvertToPatient={handleConvertToPatient}
            loading={loading}
            user={user}
          />
        )}

        {viewMode === 'table' && (
          <LeadTableView
            leads={leads}
            onLeadSelect={handleLeadSelect}
            onStageChange={handleStageChange}
            onAssignment={handleAssignment}
            onAddNote={handleAddNote}
            onScheduleFollowUp={handleScheduleFollowUp}
            onConvertToPatient={handleConvertToPatient}
            loading={loading}
            user={user}
          />
        )}

        {viewMode === 'cards' && (
          <LeadCardsView
            leads={leads}
            onLeadSelect={handleLeadSelect}
            onStageChange={handleStageChange}
            onAssignment={handleAssignment}
            onAddNote={handleAddNote}
            onScheduleFollowUp={handleScheduleFollowUp}
            onConvertToPatient={handleConvertToPatient}
            loading={loading}
            user={user}
          />
        )}

        {viewMode === 'timeline' && (
          <LeadTimelineView
            leads={leads}
            onLeadSelect={handleLeadSelect}
            onStageChange={handleStageChange}
            onAssignment={handleAssignment}
            onAddNote={handleAddNote}
            onScheduleFollowUp={handleScheduleFollowUp}
            onConvertToPatient={handleConvertToPatient}
            loading={loading}
            user={user}
          />
        )}
      </div>

      {/* Lead Modal */}
      {showLeadModal && (
        <LeadModal
          isOpen={showLeadModal}
          onClose={() => setShowLeadModal(false)}
          onSuccess={handleLeadCreate}
        />
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLead(null);
          }}
          lead={selectedLead}
          onLeadUpdate={handleLeadUpdate}
          onLeadDelete={handleLeadDelete}
          onStageChange={handleStageChange}
          onAssignment={handleAssignment}
          onAddNote={handleAddNote}
          onScheduleFollowUp={handleScheduleFollowUp}
          onConvertToPatient={handleConvertToPatient}
          user={user}
        />
      )}
    </div>
  );
}
