'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Lead, LeadStage, UserProfile } from '@/types/lead';
import {
    getDaysSinceLastContact,
    getLeadDisplayPhone,
    getLeadStageColor,
    getServiceTypeIcon,
    isLostLead
} from '@/types/lead';
import {
    AlertTriangle,
    Clock,
    Download,
    Filter,
    Mail,
    Phone,
    RefreshCw,
    RotateCcw
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { QuickActions } from './QuickActions';

interface LostLeadsPanelProps {
  leads: Lead[];
  onLeadSelect: (lead: Lead) => void;
  onStageChange: (leadId: string, newStage: LeadStage) => void;
  onAssignment: (leadId: string, userId: string) => void;
  onAddNote: (leadId: string) => void;
  onScheduleFollowUp: (leadId: string) => void;
  onConvertToPatient: (leadId: string) => void;
  onReactivateLead: (leadId: string) => void;
  user?: UserProfile | null;
}

interface LostLeadGroup {
  label: string;
  leads: Lead[];
  icon: string;
  color: string;
  description: string;
}

export function LostLeadsPanel({
  leads,
  onLeadSelect,
  onStageChange,
  onAssignment,
  onAddNote,
  onScheduleFollowUp,
  onConvertToPatient,
  onReactivateLead,
  user,
}: LostLeadsPanelProps) {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [filterReason, setFilterReason] = useState<string>('all');

  const lostLeads = useMemo(() => {
    return leads.filter(lead => isLostLead(lead));
  }, [leads]);

  const groupedLeads = useMemo((): LostLeadGroup[] => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const groups: LostLeadGroup[] = [
      {
        label: '30-60 Days',
        leads: [],
        icon: '🕐',
        color: 'text-orange-600',
        description: 'Recently lost leads - high reactivation potential'
      },
      {
        label: '60-90 Days',
        leads: [],
        icon: '⏰',
        color: 'text-red-600',
        description: 'Moderately lost leads - moderate reactivation potential'
      },
      {
        label: '90+ Days',
        leads: [],
        icon: '💀',
        color: 'text-gray-600',
        description: 'Long lost leads - low reactivation potential'
      }
    ];

    lostLeads.forEach(lead => {
      const lastContact = lead.last_contacted_at ? new Date(lead.last_contacted_at) : new Date(lead.created_at);
      const daysSinceContact = getDaysSinceLastContact(lead);

      if (daysSinceContact >= 30 && daysSinceContact < 60) {
        groups[0].leads.push(lead);
      } else if (daysSinceContact >= 60 && daysSinceContact < 90) {
        groups[1].leads.push(lead);
      } else if (daysSinceContact >= 90) {
        groups[2].leads.push(lead);
      }
    });

    return groups.filter(group => group.leads.length > 0);
  }, [lostLeads]);

  const filteredLeads = useMemo(() => {
    if (filterReason === 'all') return lostLeads;

    return lostLeads.filter(lead => {
      if (filterReason === 'no_response') {
        return !lead.rejection_reason || lead.rejection_reason === '';
      }
      if (filterReason === 'price_objection') {
        return lead.rejection_reason?.toLowerCase().includes('price') ||
               lead.rejection_reason?.toLowerCase().includes('expensive');
      }
      if (filterReason === 'timing_issue') {
        return lead.rejection_reason?.toLowerCase().includes('timing') ||
               lead.rejection_reason?.toLowerCase().includes('later');
      }
      if (filterReason === 'competitor') {
        return lead.rejection_reason?.toLowerCase().includes('competitor') ||
               lead.rejection_reason?.toLowerCase().includes('other');
      }
      return true;
    });
  }, [lostLeads, filterReason]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(filteredLeads.map(lead => lead.id)));
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

  const handleBulkReactivate = () => {
    selectedLeads.forEach(leadId => {
      onReactivateLead(leadId);
    });
    setSelectedLeads(new Set());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRejectionReasonIcon = (reason?: string) => {
    if (!reason) return '❓';
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('price') || lowerReason.includes('expensive')) return '💰';
    if (lowerReason.includes('timing') || lowerReason.includes('later')) return '⏰';
    if (lowerReason.includes('competitor') || lowerReason.includes('other')) return '🏢';
    return '❓';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lost Leads Recovery</h2>
          <p className="text-gray-600">Reconnect with leads that haven't been contacted in 30+ days</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Lost Leads</p>
              <p className="text-2xl font-bold text-gray-900">{lostLeads.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">High Potential</p>
              <p className="text-2xl font-bold text-gray-900">
                {groupedLeads.find(g => g.label === '30-60 Days')?.leads.length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">No Response</p>
              <p className="text-2xl font-bold text-gray-900">
                {lostLeads.filter(lead => !lead.rejection_reason).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Days Lost</p>
              <p className="text-2xl font-bold text-gray-900">
                {lostLeads.length > 0
                  ? Math.round(lostLeads.reduce((sum, lead) => sum + getDaysSinceLastContact(lead), 0) / lostLeads.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filter by Rejection Reason</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">Select All</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All', icon: '📋' },
            { value: 'no_response', label: 'No Response', icon: '❓' },
            { value: 'price_objection', label: 'Price Objection', icon: '💰' },
            { value: 'timing_issue', label: 'Timing Issue', icon: '⏰' },
            { value: 'competitor', label: 'Competitor', icon: '🏢' }
          ].map(filter => (
            <Button
              key={filter.value}
              onClick={() => setFilterReason(filter.value)}
              variant={filterReason === filter.value ? "default" : "outline"}
              size="sm"
              className="h-8"
            >
              <span className="mr-1">{filter.icon}</span>
              {filter.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedLeads.size > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">
              {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleBulkReactivate}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Bulk Reactivate
              </Button>
              <Button size="sm" variant="outline">
                Bulk Assign
              </Button>
              <Button size="sm" variant="outline">
                Bulk Follow-up
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Grouped Leads */}
      <div className="space-y-6">
        {groupedLeads.map((group) => (
          <Card key={group.label} className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-2xl">{group.icon}</span>
              <div>
                <h3 className={`text-lg font-semibold ${group.color}`}>
                  {group.label} ({group.leads.length} leads)
                </h3>
                <p className="text-sm text-gray-600">{group.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.leads.map((lead) => {
                const daysSinceContact = getDaysSinceLastContact(lead);

                return (
                  <div
                    key={lead.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onLeadSelect(lead)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-600 font-semibold text-sm">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {lead.name}
                          </h4>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <span>{getServiceTypeIcon(lead.service_interested_in)}</span>
                            <span className="truncate">{lead.service_interested_in || 'General'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center text-xs text-gray-600">
                        <Phone className="h-3 w-3 mr-1 text-blue-500" />
                        {getLeadDisplayPhone(lead)}
                      </div>
                      {lead.email && (
                        <div className="flex items-center text-xs text-gray-600">
                          <Mail className="h-3 w-3 mr-1 text-green-500" />
                          {lead.email}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <Badge className={`text-xs ${getLeadStageColor(lead.stage)}`}>
                        {lead.stage.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {daysSinceContact}d ago
                      </div>
                    </div>

                    {lead.rejection_reason && (
                      <div className="mb-3">
                        <div className="flex items-center text-xs text-gray-600">
                          <span className="mr-1">{getRejectionReasonIcon(lead.rejection_reason)}</span>
                          <span className="truncate">{lead.rejection_reason}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Lost {formatDate(lead.last_contacted_at || lead.created_at)}
                      </span>
                      <QuickActions
                        lead={lead}
                        onStageChange={onStageChange}
                        onAssignment={onAssignment}
                        onAddNote={onAddNote}
                        onScheduleFollowUp={onScheduleFollowUp}
                        onConvertToPatient={onConvertToPatient}
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {lostLeads.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No lost leads found</p>
            <p className="text-sm">All your leads are being actively managed!</p>
          </div>
        </Card>
      )}
    </div>
  );
}
