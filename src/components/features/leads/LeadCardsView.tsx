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
    AlertTriangle,
    Calendar,
    Clock,
    FileText,
    Mail,
    MessageSquare,
    Phone,
    User
} from 'lucide-react';
import { useState } from 'react';
import { QuickActions } from './QuickActions';

interface LeadCardsViewProps {
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

export function LeadCardsView({
  leads,
  onLeadSelect,
  onStageChange,
  onAssignment,
  onAddNote,
  onScheduleFollowUp,
  onConvertToPatient,
  loading = false,
  user,
}: LeadCardsViewProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {leads.map((lead) => {
        const daysSinceContact = getDaysSinceLastContact(lead);
        const isStale = isStaleLead(lead);
        const unreadNotes = lead.new_notes_count ?? 0;
        const unreadQuotes = lead.new_quotes_count ?? 0;
        const formatBadgeNumber = (count: number) =>
          count > 99 ? '99+' : count.toString();

        return (
          <div
            key={lead.id}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer group"
            onClick={() => onLeadSelect(lead)}
            onMouseEnter={() => setHoveredCard(lead.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {lead.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                    {lead.name}
                  </h3>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <span>{getServiceTypeIcon(lead.service_interested_in)}</span>
                    <span className="truncate">{lead.service_interested_in || 'General'}</span>
                  </div>
                </div>
              </div>

              {/* Priority & Stale Indicators */}
              <div className="flex flex-col items-end space-y-1">
                <div className="flex items-center">
                  <span className="mr-1">{getLeadPriorityIcon(lead.priority)}</span>
                  <Badge variant="outline" className={`text-xs ${getLeadPriorityColor(lead.priority)}`}>
                    {lead.priority}
                  </Badge>
                </div>
                {isStale && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Stale
                  </Badge>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2 text-blue-500" />
                <span className="truncate">{getLeadDisplayPhone(lead)}</span>
              </div>
              {lead.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2 text-green-500" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
            </div>

            {/* Assignment */}
            {lead.assigned_to_user && (
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="h-3 w-3 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {lead.assigned_to_user.full_name}
                  </p>
                </div>
              </div>
            )}

            {/* Stage & Conversion Score */}
            <div className="flex items-center justify-between mb-4">
              <Badge className={`text-xs ${getLeadStageColor(lead.stage)}`}>
                {lead.stage.replace('_', ' ')}
              </Badge>
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
            </div>

            {/* Timeline */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                <span>Created {formatDate(lead.created_at)}</span>
              </div>
              {lead.last_contacted_at && (
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Last contact {formatDate(lead.last_contacted_at)}</span>
                  {daysSinceContact > 0 && (
                    <span className="ml-1 text-orange-600">({daysSinceContact}d ago)</span>
                  )}
                </div>
              )}
            </div>

            {/* Activity Indicators */}
            <div className="flex items-center mb-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    {unreadNotes > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center shadow-sm">
                        {formatBadgeNumber(unreadNotes)}
                      </span>
                    )}
                    <span className="sr-only">New notes</span>
                  </div>
                  <div className="leading-tight">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Notes</p>
                    <p className="text-xs font-semibold text-gray-700">{lead.notes_count ?? 0}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm">
                      <FileText className="h-4 w-4" />
                    </div>
                    {unreadQuotes > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center shadow-sm">
                        {formatBadgeNumber(unreadQuotes)}
                      </span>
                    )}
                    <span className="sr-only">New quotes</span>
                  </div>
                  <div className="leading-tight">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Quotes</p>
                    <p className="text-xs font-semibold text-gray-700">{lead.quotes_count ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - Show on Hover */}
            {hoveredCard === lead.id && (
              <div className="absolute inset-0 bg-white bg-opacity-95 rounded-xl flex items-center justify-center">
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
            )}
          </div>
        );
      })}
    </div>
  );
}
