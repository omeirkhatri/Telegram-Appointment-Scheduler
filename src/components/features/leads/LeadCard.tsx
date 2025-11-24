'use client';

import type { Lead, UserProfile } from '@/types/lead';
import React from 'react';
import { FileText, MessageSquare } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onStageChange: (leadId: string, newStage: string) => void;
  onAssignment: (leadId: string, userId: string) => void;
  user?: UserProfile | null;
}

export function LeadCard({
  lead,
  onClick,
  onStageChange,
  onAssignment,
  user,
}: LeadCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', lead.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const unreadNotes = lead.new_notes_count ?? 0;
  const unreadQuotes = lead.new_quotes_count ?? 0;
  const formatBadgeNumber = (count: number) =>
    count > 99 ? '99+' : count.toString();

  return (
    <div
      className="bg-white border border-[--border] rounded-md p-2.5 cursor-pointer hover:shadow-sm hover:border-[--primary]/30 transition-all duration-200 group"
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
    >
      {/* Lead Name */}
      <div className="mb-1.5">
        <h4 className="font-medium text-[--foreground] text-sm truncate group-hover:text-[--primary] transition-colors">
          {lead.name}
        </h4>
      </div>

      {/* Service Interest */}
      {lead.service_interested_in && (
        <div className="mb-1.5">
          <p className="text-xs text-[--muted-foreground] truncate">
            {lead.service_interested_in}
          </p>
        </div>
      )}

      {/* Activity Badges */}
      <div className="flex items-center space-x-3 mb-2">
        <div className="flex items-center space-x-1.5">
          <div className="relative">
            <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            {unreadNotes > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center shadow-sm">
                {formatBadgeNumber(unreadNotes)}
              </span>
            )}
            <span className="sr-only">New notes</span>
          </div>
          <span className="text-[11px] font-medium text-gray-600">
            {lead.notes_count ?? 0}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <div className="relative">
            <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm">
              <FileText className="h-3.5 w-3.5" />
            </div>
            {unreadQuotes > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center shadow-sm">
                {formatBadgeNumber(unreadQuotes)}
              </span>
            )}
            <span className="sr-only">New quotes</span>
          </div>
          <span className="text-[11px] font-medium text-gray-600">
            {lead.quotes_count ?? 0}
          </span>
        </div>
      </div>

      {/* Last Change Date */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[--muted-foreground]">
          {formatDate(lead.updated_at || lead.created_at)}
        </span>
      </div>
    </div>
  );
}
