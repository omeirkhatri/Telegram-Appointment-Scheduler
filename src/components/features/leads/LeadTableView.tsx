'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import type { Lead, LeadStage, UserProfile } from '@/types/lead';
import {
    getConversionProbabilityColor,
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
    ArrowUpDown,
    Calendar,
    Mail,
    Phone,
    User
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { QuickActions } from './QuickActions';

interface LeadTableViewProps {
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

type SortField = 'name' | 'created_at' | 'last_contacted_at' | 'stage' | 'priority' | 'conversion_probability';
type SortDirection = 'asc' | 'desc';

export function LeadTableView({
  leads,
  onLeadSelect,
  onStageChange,
  onAssignment,
  onAddNote,
  onScheduleFollowUp,
  onConvertToPatient,
  loading = false,
  user,
}: LeadTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'last_contacted_at':
          aValue = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
          bValue = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
          break;
        case 'stage':
          const stageOrder = ['new', 'contacted', 'quoted', 'qualified', 'not_qualified', 'converted'];
          aValue = stageOrder.indexOf(a.stage);
          bValue = stageOrder.indexOf(b.stage);
          break;
        case 'priority':
          const priorityOrder = ['low', 'medium', 'high', 'urgent'];
          aValue = priorityOrder.indexOf(a.priority);
          bValue = priorityOrder.indexOf(b.priority);
          break;
        case 'conversion_probability':
          aValue = a.conversion_probability;
          bValue = b.conversion_probability;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [leads, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-medium hover:bg-transparent"
    >
      <span className="flex items-center space-x-1">
        <span>{children}</span>
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </Button>
  );

  if (loading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox disabled />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><div className="h-4 w-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-12 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></TableCell>
                <TableCell><div className="h-4 w-8 bg-gray-200 rounded animate-pulse" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedLeads.size === leads.length && leads.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <SortButton field="name">Name</SortButton>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>
                <SortButton field="stage">Stage</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="priority">Priority</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="last_contacted_at">Last Contact</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="conversion_probability">Score</SortButton>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeads.map((lead) => {
              const daysSinceContact = getDaysSinceLastContact(lead);
              const isStale = isStaleLead(lead);

              return (
                <TableRow
                  key={lead.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onLeadSelect(lead)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div>
                        <div className="font-medium text-sm">{lead.name}</div>
                        {lead.assigned_to_user && (
                          <div className="flex items-center text-xs text-gray-500">
                            <User className="h-3 w-3 mr-1" />
                            {lead.assigned_to_user.full_name}
                          </div>
                        )}
                      </div>
                      {isStale && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <Phone className="h-3 w-3 mr-1 text-blue-500" />
                        {getLeadDisplayPhone(lead)}
                      </div>
                      {lead.email && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-3 w-3 mr-1" />
                          {lead.email}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center text-sm">
                      <span className="mr-1">{getServiceTypeIcon(lead.service_interested_in)}</span>
                      {lead.service_interested_in || 'General'}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge className={`text-xs ${getLeadStageColor(lead.stage)}`}>
                      {lead.stage.replace('_', ' ')}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center">
                      <span className="mr-1">{getLeadPriorityIcon(lead.priority)}</span>
                      <Badge variant="outline" className={`text-xs ${getLeadPriorityColor(lead.priority)}`}>
                        {lead.priority}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                      {lead.last_contacted_at ? formatDate(lead.last_contacted_at) : 'Never'}
                      {daysSinceContact > 0 && (
                        <span className="ml-1 text-xs text-gray-500">
                          ({daysSinceContact}d)
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getConversionProbabilityColor(lead.conversion_probability)}`}
                    >
                      {lead.conversion_probability}%
                    </Badge>
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <QuickActions
                      lead={lead}
                      onStageChange={onStageChange}
                      onAssignment={onAssignment}
                      onAddNote={onAddNote}
                      onScheduleFollowUp={onScheduleFollowUp}
                      onConvertToPatient={onConvertToPatient}
                      compact
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {leads.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-sm">Try adjusting your filters or add a new lead</p>
          </div>
        </div>
      )}
    </div>
  );
}
