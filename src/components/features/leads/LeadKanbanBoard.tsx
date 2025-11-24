'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Lead, LeadStage, UserProfile } from '@/types/lead';
import { isStaleLead } from '@/types/lead';
import { AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';
import { LeadCard } from './LeadCard';

interface LeadKanbanBoardProps {
  leads: Lead[];
  onLeadSelect: (lead: Lead) => void;
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onAssignment: (leadId: string, userId: string) => void;
  onAddNote: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onConvertToPatient: (leadId: string) => void;
  loading?: boolean;
  user?: UserProfile | null;
}

const STAGES: Array<{
  key: string;
  label: string;
  icon: string;
  headerGradient: string;
  indicatorColor: string;
  iconColor: string;
  countClass: string;
}> = [
  {
    key: 'new',
    label: 'New',
    icon: '✨',
    headerGradient: 'from-sky-50 to-white',
    indicatorColor: 'bg-sky-500',
    iconColor: 'text-sky-500',
    countClass: 'bg-sky-100 text-sky-700',
  },
  {
    key: 'contacted',
    label: 'Contacted',
    icon: '📞',
    headerGradient: 'from-blue-50 to-white',
    indicatorColor: 'bg-blue-500',
    iconColor: 'text-blue-500',
    countClass: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'quoted',
    label: 'Quoted',
    icon: '💰',
    headerGradient: 'from-indigo-50 to-white',
    indicatorColor: 'bg-indigo-500',
    iconColor: 'text-indigo-500',
    countClass: 'bg-indigo-100 text-indigo-700',
  },
  {
    key: 'qualified',
    label: 'Qualified',
    icon: '⭐',
    headerGradient: 'from-emerald-50 to-white',
    indicatorColor: 'bg-emerald-500',
    iconColor: 'text-emerald-500',
    countClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    key: 'not_qualified',
    label: 'Not Qualified',
    icon: '❌',
    headerGradient: 'from-rose-50 to-white',
    indicatorColor: 'bg-rose-500',
    iconColor: 'text-rose-500',
    countClass: 'bg-rose-100 text-rose-700',
  },
  {
    key: 'converted',
    label: 'Converted',
    icon: '🎉',
    headerGradient: 'from-teal-50 to-white',
    indicatorColor: 'bg-teal-500',
    iconColor: 'text-teal-500',
    countClass: 'bg-teal-100 text-teal-700',
  },
];

export function LeadKanbanBoard({
  leads,
  onLeadSelect,
  onStageChange,
  onAssignment,
  onAddNote,
  onScheduleFollowUp,
  onConvertToPatient,
  loading = false,
  user,
}: LeadKanbanBoardProps) {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const getLeadsByStage = (stage: string) => {
    return leads.filter(lead => lead.stage === stage);
  };

  const getStaleLeadsCount = () => {
    return leads.filter(lead => isStaleLead(lead)).length;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onStageChange(leadId, targetStage);
    }
  };

  if (loading) {
    return (
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {STAGES.map(stage => (
          <div key={stage.key} className="flex-shrink-0 w-80">
            <div className="bg-[--card] rounded-xl border shadow-sm p-4 h-[600px] animate-pulse">
              <div className="h-8 bg-[--muted] rounded-lg mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-[--muted] rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedLeads.size > 0 && (
        <div className="flex items-center space-x-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-700">
            {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline">
              Bulk Assign
            </Button>
            <Button size="sm" variant="outline">
              Bulk Stage Change
            </Button>
            <Button size="sm" variant="outline">
              Export Selected
            </Button>
          </div>
        </div>
      )}

      {/* Stale Leads Alert */}
      {getStaleLeadsCount() > 0 && (
        <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span className="text-sm font-medium text-orange-700">
            {getStaleLeadsCount()} stale lead{getStaleLeadsCount() > 1 ? 's' : ''} need attention
          </span>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageLeads = getLeadsByStage(stage.key);
          const staleCount = stageLeads.filter(lead => isStaleLead(lead)).length;

          return (
            <div key={stage.key} className="flex-shrink-0 w-80">
              <div className="bg-[--card] rounded-xl border border-slate-200 shadow-sm">
                {/* Stage Header */}
                <div className={`p-4 border-b border-slate-200/70 bg-gradient-to-r ${stage.headerGradient}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${stage.indicatorColor}`}></span>
                      <span className={`text-lg ${stage.iconColor}`}>{stage.icon}</span>
                      <h3 className="font-semibold text-slate-700">{stage.label}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {staleCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {staleCount}
                        </Badge>
                      )}
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${stage.countClass}`}>
                        {stageLeads.length}
                      </div>
                    </div>
                  </div>
                </div>

              {/* Stage Content */}
              <div
                className="p-3 min-h-[500px] max-h-[600px] overflow-y-auto"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="space-y-2">
                  {stageLeads.map(lead => (
                    <div key={lead.id} className="flex items-start space-x-3">
                      <div className="pt-1.5 flex-shrink-0">
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <LeadCard
                          lead={lead}
                          onClick={() => onLeadSelect(lead)}
                          onStageChange={onStageChange}
                          onAssignment={onAssignment}
                          user={user}
                        />
                      </div>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="text-center py-12 text-[--muted-foreground]">
                      <div className="text-4xl mb-2 opacity-50">{stage.icon}</div>
                      <p className="text-sm font-medium">No leads in this stage</p>
                      <p className="text-xs mt-1">Drag leads here to move them</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
