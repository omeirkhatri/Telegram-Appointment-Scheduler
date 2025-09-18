'use client';

import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
import { Calendar, Check, CheckCircle, ChevronDown, Clock, Filter, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface AppointmentFilterState {
  staffIds?: string[];
  appointmentTypes?: string[];
  statuses?: string[];
  dateFrom?: string;
  dateTo?: string;
}

interface AppointmentFiltersProps {
  filters: AppointmentFilterState;
  onFiltersChange: (filters: AppointmentFilterState) => void;
  onClearFilters: () => void;
  staffOptions?: Array<{ id: string; name: string; staff_type: string }>;
  className?: string;
}

// Custom Multi-Select Dropdown Component
interface CustomMultiSelectProps {
  options: Array<{ value: string; label: string; color?: string; icon?: any }>;
  values?: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  className?: string;
}

function CustomMultiSelect({ options, values = [], onChange, placeholder, className = '' }: CustomMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter(option => values.includes(option.value));

  const handleToggleOption = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter(v => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  const handleSelectAll = () => {
    if (values.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(option => option.value));
    }
  };

  const getDisplayText = () => {
    if (values.length === 0) return placeholder;
    if (values.length === 1) return selectedOptions[0]?.label || placeholder;
    if (values.length === options.length) return `All ${placeholder.toLowerCase()}`;
    return `${values.length} selected`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-[--card] border border-[--border] rounded-lg hover:border-[--ring] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent transition-all text-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {values.length > 0 && values.length < options.length && (
              <div className="flex -space-x-1">
                {selectedOptions.slice(0, 2).map((option) => (
                  <div
                    key={option.value}
                    className="w-3 h-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: option.color }}
                  />
                ))}
                {values.length > 2 && (
                  <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-white">+{values.length - 2}</span>
                  </div>
                )}
              </div>
            )}
            <span className={`${values.length === 0 ? 'text-[--muted-foreground]' : 'text-[--foreground]'}`}>
              {getDisplayText()}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-[--muted-foreground] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-[--card] border border-[--border] rounded-lg shadow-lg">
          <div className="py-1">
            <button
              type="button"
              onClick={handleSelectAll}
              className="w-full px-3 py-2 text-left text-sm text-[--muted-foreground] hover:bg-[--accent] flex items-center space-x-2"
            >
              <Check className={`w-4 h-4 ${values.length === options.length ? 'text-[--primary]' : 'text-[--muted-foreground]'}`} />
              <span>All {placeholder.toLowerCase()}</span>
            </button>
            {options.map((option) => {
              const isSelected = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggleOption(option.value)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[--accent] flex items-center space-x-2"
                >
                  <Check className={`w-4 h-4 ${isSelected ? 'text-[--primary]' : 'text-[--muted-foreground]'}`} />
                  {option.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  {option.icon && <option.icon className="w-4 h-4 text-[--muted-foreground]" />}
                  <span className="text-[--foreground]">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppointmentFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  staffOptions = [],
  className = '',
}: AppointmentFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [localFilters, setLocalFilters] = useState<AppointmentFilterState>(filters);

  const appointmentTypes = [
    { value: 'doctor_on_call', label: 'Doctor on Call', color: getAppointmentTypeColor('doctor_on_call', 'primary') },
    { value: 'lab_test', label: 'Lab Test', color: getAppointmentTypeColor('lab_test', 'primary') },
    { value: 'teleconsultation', label: 'Teleconsultation', color: getAppointmentTypeColor('teleconsultation', 'primary') },
    { value: 'physiotherapy', label: 'Physiotherapy', color: getAppointmentTypeColor('physiotherapy', 'primary') },
    { value: 'caregiver', label: 'Caregiver', color: getAppointmentTypeColor('caregiver', 'primary') },
    { value: 'iv_therapy', label: 'IV Therapy', color: getAppointmentTypeColor('iv_therapy', 'primary') },
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled', color: '#f59e0b', icon: Clock },
    { value: 'confirmed', label: 'Confirmed', color: '#3b82f6', icon: CheckCircle },
    { value: 'completed', label: 'Completed', color: '#10b981', icon: CheckCircle },
    { value: 'cancelled', label: 'Cancelled', color: '#ef4444', icon: XCircle },
  ];

  // Convert staff options to dropdown format
  const staffDropdownOptions = staffOptions.map(staff => ({
    value: staff.id,
    label: `${staff.name} (${staff.staff_type.replace('_', ' ')})`,
    color: '#6b7280', // Gray color for staff
  }));

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleLocalFilterChange = (key: keyof AppointmentFilterState, value: string[] | string | undefined) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const hasActiveFilters = Object.values(localFilters).some(value =>
    value !== undefined &&
    value !== '' &&
    (!Array.isArray(value) || value.length > 0)
  );

  const getFilterCount = () => {
    return Object.values(localFilters).filter(value =>
      value !== undefined &&
      value !== '' &&
      (!Array.isArray(value) || value.length > 0)
    ).length;
  };

  return (
    <div className={`bg-[--card] border border-[--border] rounded-lg shadow-sm ${className}`}>
      {/* Filter Header */}
      <div className="px-4 py-3 border-b border-[--border]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-[--foreground] hover:text-[--primary] transition-colors group"
          >
            <div className="p-1.5 bg-[--primary]/10 rounded-md group-hover:bg-[--primary]/20 transition-colors">
              <Filter className="w-4 h-4 text-[--primary]" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">Filters</span>
              {hasActiveFilters && (
                <span className="bg-[--primary] text-[--primary-foreground] text-xs font-medium px-2 py-0.5 rounded-full">
                  {getFilterCount()}
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center space-x-1 text-[--muted-foreground] hover:text-[--error] transition-colors px-2 py-1 rounded-md hover:bg-[--error]/10"
            >
              <X className="w-3 h-3" />
              <span className="text-xs font-medium">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Compact Filter Row with Inline Apply Button */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            {/* Staff Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[--muted-foreground] uppercase tracking-wide">Staff</label>
              <CustomMultiSelect
                options={staffDropdownOptions}
                values={localFilters.staffIds || []}
                onChange={(values) => handleLocalFilterChange('staffIds', values)}
                placeholder="Staff Member"
              />
            </div>

            {/* Appointment Type Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[--muted-foreground] uppercase tracking-wide">Type</label>
              <CustomMultiSelect
                options={appointmentTypes}
                values={localFilters.appointmentTypes || []}
                onChange={(values) => handleLocalFilterChange('appointmentTypes', values)}
                placeholder="Appointment Type"
              />
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[--muted-foreground] uppercase tracking-wide">Status</label>
              <CustomMultiSelect
                options={statusOptions}
                values={localFilters.statuses || []}
                onChange={(values) => handleLocalFilterChange('statuses', values)}
                placeholder="Status"
              />
            </div>

            {/* Date Range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[--muted-foreground] uppercase tracking-wide">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-[--muted-foreground]" />
                  <input
                    type="date"
                    value={localFilters.dateFrom || ''}
                    onChange={(e) => handleLocalFilterChange('dateFrom', e.target.value || undefined)}
                    className="w-full pl-7 pr-2 py-2 text-xs border border-[--border] rounded-lg bg-[--card] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                    placeholder="From"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-[--muted-foreground]" />
                  <input
                    type="date"
                    value={localFilters.dateTo || ''}
                    onChange={(e) => handleLocalFilterChange('dateTo', e.target.value || undefined)}
                    className="w-full pl-7 pr-2 py-2 text-xs border border-[--border] rounded-lg bg-[--card] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>

            {/* Apply Button - Inline */}
            <div className="flex justify-end">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-[--primary] text-[--primary-foreground] text-sm font-medium rounded-lg hover:bg-[--primary]/90 focus:outline-none focus:ring-2 focus:ring-[--ring] focus:ring-offset-2 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
