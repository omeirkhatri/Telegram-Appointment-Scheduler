'use client';

import { Badge } from '@/components/ui/Badge';
import type { Lead, LeadStage, UserProfile } from '@/types/lead';
import {
    getDaysSinceLastContact,
    getLeadDisplayPhone,
    getLeadPriorityColor,
    getLeadPriorityIcon,
    getLeadStageColor,
    getServiceTypeIcon,
    isStaleLead
} from '@/types/lead';
import {
    Activity,
    AlertTriangle,
    Clock,
    Mail,
    MessageSquare,
    Phone
} from 'lucide-react';
import { useMemo } from 'react';
import { QuickActions } from './QuickActions';

interface LeadTimelineViewProps {
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

interface TimelineGroup {
  label: string;
  leads: Lead[];
  icon: string;
  color: string;
}

export function LeadTimelineView({
  leads,
  onLeadSelect,
  onStageChange,
  onAssignment,
  onAddNote,
  onScheduleFollowUp,
  onConvertToPatient,
  loading = false,
  user,
}: LeadTimelineViewProps) {
  const timelineGroups = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: TimelineGroup[] = [
      { label: 'Today', leads: [], icon: '🌅', color: 'text-green-600' },
      { label: 'Yesterday', leads: [], icon: '🌆', color: 'text-blue-600' },
      { label: 'This Week', leads: [], icon: '📅', color: 'text-purple-600' },
      { label: 'Last Week', leads: [], icon: '📆', color: 'text-orange-600' },
      { label: 'Last Month', leads: [], icon: '🗓️', color: 'text-gray-600' },
      { label: 'Older', leads: [], icon: '📜', color: 'text-gray-500' },
    ];

    leads.forEach(lead => {
      const createdDate = new Date(lead.created_at);

      if (createdDate >= today) {
        groups[0].leads.push(lead);
      } else if (createdDate >= yesterday) {
        groups[1].leads.push(lead);
      } else if (createdDate >= thisWeek) {
        groups[2].leads.push(lead);
      } else if (createdDate >= lastWeek) {
        groups[3].leads.push(lead);
      } else if (createdDate >= lastMonth) {
        groups[4].leads.push(lead);
      } else {
        groups[5].leads.push(lead);
      }
    });

    return groups.filter(group => group.leads.length > 0);
  }, [leads]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="space-y-3 ml-11">
              {[1, 2, 3].map((j) => (
                <div key={j} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {timelineGroups.map((group, groupIndex) => (
        <div key={group.label} className="space-y-4">
          {/* Group Header */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{group.icon}</span>
              <h3 className={`text-lg font-semibold ${group.color}`}>
                {group.label}
              </h3>
            </div>
            <Badge variant="secondary" className="text-sm">
              {group.leads.length} lead{group.leads.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Timeline Items */}
          <div className="space-y-3 ml-11">
            {group.leads.map((lead, leadIndex) => {
              const daysSinceContact = getDaysSinceLastContact(lead);
              const isStale = isStaleLead(lead);

              return (
                <div
                  key={lead.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group relative"
                  onClick={() => onLeadSelect(lead)}
                >
                  {/* Timeline Connector */}
                  {leadIndex < group.leads.length - 1 && (
                    <div className="absolute left-0 top-12 w-px h-8 bg-gray-200"></div>
                  )}

                  {/* Timeline Dot */}
                  <div className="absolute -left-8 top-4 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Lead Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                            {lead.name}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{getServiceTypeIcon(lead.service_interested_in)}</span>
                            <span>{lead.service_interested_in || 'General'}</span>
                            <span>•</span>
                            <span>{formatDate(lead.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="flex items-center space-x-4 mb-3">
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

                      {/* Status & Priority */}
                      <div className="flex items-center space-x-2 mb-3">
                        <Badge className={`text-xs ${getLeadStageColor(lead.stage)}`}>
                          {lead.stage.replace('_', ' ')}
                        </Badge>
                        <div className="flex items-center">
                          <span className="mr-1">{getLeadPriorityIcon(lead.priority)}</span>
                          <Badge variant="outline" className={`text-xs ${getLeadPriorityColor(lead.priority)}`}>
                            {lead.priority}
                          </Badge>
                        </div>
                        {isStale && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Stale ({daysSinceContact}d)
                          </Badge>
                        )}
                      </div>

                      {/* Activity Indicators */}
                      <div className="flex items-center space-x-4">
                        {lead.notes_count > 0 && (
                          <div className="flex items-center text-xs text-gray-500">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {lead.notes_count} note{lead.notes_count !== 1 ? 's' : ''}
                          </div>
                        )}
                        {lead.quotes_count > 0 && (
                          <div className="flex items-center text-xs text-gray-500">
                            💰 {lead.quotes_count} quote{lead.quotes_count !== 1 ? 's' : ''}
                          </div>
                        )}
                        {lead.last_contacted_at && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            Last contact {formatDate(lead.last_contacted_at)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conversion Score & Actions */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              lead.conversion_probability >= 80 ? 'bg-green-500' :
                              lead.conversion_probability >= 60 ? 'bg-blue-500' :
                              lead.conversion_probability >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${lead.conversion_probability}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {lead.conversion_probability}%
                        </span>
                      </div>

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
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {leads.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-sm">Try adjusting your filters or add a new lead</p>
          </div>
        </div>
      )}
    </div>
  );
}
