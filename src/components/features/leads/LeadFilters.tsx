'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LeadFilters as LeadFiltersType, LeadPriority, UserProfile } from '@/types/lead';
import { format } from 'date-fns';
import { AlertTriangle, Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { useState } from 'react';

interface LeadFiltersProps {
  filters: LeadFiltersType;
  onFiltersChange: (filters: LeadFiltersType) => void;
  user?: UserProfile | null;
  onClose?: () => void;
}

const STAGE_OPTIONS = [
  { value: 'new', label: 'New', icon: '✨', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'contacted', label: 'Contacted', icon: '📞', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'quoted', label: 'Quoted', icon: '💰', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'qualified', label: 'Qualified', icon: '⭐', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'not_qualified', label: 'Not Qualified', icon: '❌', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'converted', label: 'Converted', icon: '🎉', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', icon: '🟢' },
  { value: 'inactive', label: 'Inactive', icon: '🔴' },
  { value: 'converted', label: 'Converted', icon: '✅' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', icon: '⬇️', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { value: 'medium', label: 'Medium', icon: '➡️', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'high', label: 'High', icon: '⬆️', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'urgent', label: 'Urgent', icon: '🚨', color: 'bg-red-50 text-red-700 border-red-200' },
];

const QUICK_FILTER_PRESETS = [
  {
    id: 'new_today',
    label: 'New Today',
    icon: '✨',
    filters: {
      created_after: new Date().toISOString().split('T')[0],
      stage: ['new']
    }
  },
  {
    id: 'needs_followup',
    label: 'Needs Follow-up',
    icon: '📞',
    filters: {
      last_contacted_after: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      stage: ['contacted', 'quoted']
    }
  },
  {
    id: 'stale',
    label: 'Stale Leads',
    icon: '⏰',
    filters: {
      stale_leads: true
    }
  },
  {
    id: 'high_priority',
    label: 'High Priority',
    icon: '🚨',
    filters: {
      priority: ['high', 'urgent']
    }
  },
  {
    id: 'converted',
    label: 'Converted',
    icon: '🎉',
    filters: {
      stage: ['converted']
    }
  },
  {
    id: 'lost_leads',
    label: 'Lost Leads',
    icon: '💔',
    filters: {
      lost_leads: true
    }
  },
];

export function LeadFilters({ filters, onFiltersChange, user, onClose }: LeadFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedStages, setSelectedStages] = useState<string[]>(filters.stage || []);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(filters.status || []);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(filters.priority || []);
  const [assignedTo, setAssignedTo] = useState(filters.assigned_to_user_id || '');
  const [source, setSource] = useState(filters.source || '');
  const [createdAfter, setCreatedAfter] = useState<Date | undefined>(
    filters.created_after ? new Date(filters.created_after) : undefined
  );
  const [createdBefore, setCreatedBefore] = useState<Date | undefined>(
    filters.created_before ? new Date(filters.created_before) : undefined
  );
  const [lastContactedAfter, setLastContactedAfter] = useState<Date | undefined>(
    filters.last_contacted_after ? new Date(filters.last_contacted_after) : undefined
  );
  const [lastContactedBefore, setLastContactedBefore] = useState<Date | undefined>(
    filters.last_contacted_before ? new Date(filters.last_contacted_before) : undefined
  );
  const [conversionProbabilityMin, setConversionProbabilityMin] = useState(filters.conversion_probability_min || '');
  const [conversionProbabilityMax, setConversionProbabilityMax] = useState(filters.conversion_probability_max || '');
  const [staleLeads, setStaleLeads] = useState(filters.stale_leads || false);
  const [lostLeads, setLostLeads] = useState(filters.lost_leads || false);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onFiltersChange({
      ...filters,
      search: value || undefined,
    });
  };

  const handleStageToggle = (stage: string) => {
    const newStages = selectedStages.includes(stage)
      ? selectedStages.filter(s => s !== stage)
      : [...selectedStages, stage];

    setSelectedStages(newStages);
    onFiltersChange({
      ...filters,
      stage: newStages.length > 0 ? newStages : undefined,
    });
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];

    setSelectedStatuses(newStatuses);
    onFiltersChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  const handleAssignedToChange = (value: string) => {
    setAssignedTo(value);
    onFiltersChange({
      ...filters,
      assigned_to_user_id: value || undefined,
    });
  };

  const handleSourceChange = (value: string) => {
    setSource(value);
    onFiltersChange({
      ...filters,
      source: value || undefined,
    });
  };

  const handlePriorityToggle = (priority: string) => {
    const newPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter(p => p !== priority)
      : [...selectedPriorities, priority];

    setSelectedPriorities(newPriorities);
    onFiltersChange({
      ...filters,
      priority: newPriorities.length > 0 ? newPriorities as LeadPriority[] : undefined,
    });
  };

  const handleQuickFilter = (preset: typeof QUICK_FILTER_PRESETS[0]) => {
    onFiltersChange(preset.filters);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStages([]);
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setAssignedTo('');
    setSource('');
    setCreatedAfter(undefined);
    setCreatedBefore(undefined);
    setLastContactedAfter(undefined);
    setLastContactedBefore(undefined);
    setConversionProbabilityMin('');
    setConversionProbabilityMax('');
    setStaleLeads(false);
    setLostLeads(false);
    onFiltersChange({});
  };

  const hasActiveFilters = searchTerm || selectedStages.length > 0 || selectedStatuses.length > 0 ||
    selectedPriorities.length > 0 || assignedTo || source || createdAfter || createdBefore ||
    lastContactedAfter || lastContactedBefore || conversionProbabilityMin || conversionProbabilityMax ||
    staleLeads || lostLeads;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--foreground]">Lead Filters</h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs"
            >
              Clear All
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      <div className="space-y-4">
        {/* Quick Filter Presets */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-[--foreground]">
            Quick Filters
          </Label>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTER_PRESETS.map(preset => (
              <Button
                key={preset.id}
                onClick={() => handleQuickFilter(preset)}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-medium hover:bg-[--muted]"
              >
                <span className="mr-1">{preset.icon}</span>
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium text-[--foreground]">
            Search Leads
          </Label>
          <Input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full"
          />
        </div>

        {/* Stages */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-[--foreground]">
            Pipeline Stages
          </Label>
          <div className="flex flex-wrap gap-2">
            {STAGE_OPTIONS.map(option => (
              <Button
                key={option.value}
                onClick={() => handleStageToggle(option.value)}
                variant={selectedStages.includes(option.value) ? "default" : "outline"}
                size="sm"
                className={`h-8 px-3 text-xs font-medium transition-all duration-200 ${
                  selectedStages.includes(option.value)
                    ? option.color
                    : 'hover:bg-[--muted]'
                }`}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-[--foreground]">
            Lead Status
          </Label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(option => (
              <Button
                key={option.value}
                onClick={() => handleStatusToggle(option.value)}
                variant={selectedStatuses.includes(option.value) ? "default" : "outline"}
                size="sm"
                className={`h-8 px-3 text-xs font-medium transition-all duration-200 ${
                  selectedStatuses.includes(option.value)
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'hover:bg-[--muted]'
                }`}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-[--foreground]">
            Priority
          </Label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map(option => (
              <Button
                key={option.value}
                onClick={() => handlePriorityToggle(option.value)}
                variant={selectedPriorities.includes(option.value) ? "default" : "outline"}
                size="sm"
                className={`h-8 px-3 text-xs font-medium transition-all duration-200 ${
                  selectedPriorities.includes(option.value)
                    ? option.color
                    : 'hover:bg-[--muted]'
                }`}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Date Ranges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[--foreground]">
              Created Date Range
            </Label>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {createdAfter ? format(createdAfter, 'MMM dd') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={createdAfter}
                    onSelect={setCreatedAfter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {createdBefore ? format(createdBefore, 'MMM dd') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={createdBefore}
                    onSelect={setCreatedBefore}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[--foreground]">
              Last Contact Range
            </Label>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    {lastContactedAfter ? format(lastContactedAfter, 'MMM dd') : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={lastContactedAfter}
                    onSelect={setLastContactedAfter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    {lastContactedBefore ? format(lastContactedBefore, 'MMM dd') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={lastContactedBefore}
                    onSelect={setLastContactedBefore}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Conversion Probability Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[--foreground]">
            Conversion Probability
          </Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Min %"
              value={conversionProbabilityMin}
              onChange={(e) => setConversionProbabilityMin(e.target.value)}
              className="flex-1"
              min="0"
              max="100"
            />
            <Input
              type="number"
              placeholder="Max %"
              value={conversionProbabilityMax}
              onChange={(e) => setConversionProbabilityMax(e.target.value)}
              className="flex-1"
              min="0"
              max="100"
            />
          </div>
        </div>

        {/* Special Filters */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-[--foreground]">
            Special Filters
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setStaleLeads(!staleLeads)}
              variant={staleLeads ? "default" : "outline"}
              size="sm"
              className="h-8 px-3 text-xs font-medium"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Stale Leads (7+ days)
            </Button>
            <Button
              onClick={() => setLostLeads(!lostLeads)}
              variant={lostLeads ? "default" : "outline"}
              size="sm"
              className="h-8 px-3 text-xs font-medium"
            >
              <X className="h-3 w-3 mr-1" />
              Lost Leads (30+ days)
            </Button>
          </div>
        </div>

        {/* Assigned To & Source Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assigned-to" className="text-sm font-medium text-[--foreground]">
              Assigned To
            </Label>
            <Select value={assignedTo} onValueChange={handleAssignedToChange}>
              <SelectTrigger id="assigned-to">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All users</SelectItem>
                <SelectItem value={user?.id || ''}>{user?.full_name} (Me)</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source" className="text-sm font-medium text-[--foreground]">
              Source
            </Label>
            <Select value={source} onValueChange={handleSourceChange}>
              <SelectTrigger id="source">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sources</SelectItem>
                <SelectItem value="google_sheets">Google Sheets</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-[--border]">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-sm font-medium text-[--muted-foreground]">Active filters:</span>
              <Badge variant="secondary" className="text-xs">
                {[searchTerm, ...selectedStages, ...selectedStatuses, assignedTo, source].filter(Boolean).length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  🔍 {searchTerm}
                </Badge>
              )}
              {selectedStages.map(stage => {
                const stageOption = STAGE_OPTIONS.find(s => s.value === stage);
                return (
                  <Badge key={stage} variant="outline" className="text-xs">
                    {stageOption?.icon} {stageOption?.label}
                  </Badge>
                );
              })}
              {selectedStatuses.map(status => {
                const statusOption = STATUS_OPTIONS.find(s => s.value === status);
                return (
                  <Badge key={status} variant="outline" className="text-xs">
                    {statusOption?.icon} {statusOption?.label}
                  </Badge>
                );
              })}
              {assignedTo && (
                <Badge variant="outline" className="text-xs">
                  👤 {assignedTo === user?.id ? 'Me' : assignedTo === 'unassigned' ? 'Unassigned' : 'Other'}
                </Badge>
              )}
              {source && (
                <Badge variant="outline" className="text-xs">
                  📊 {source}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
