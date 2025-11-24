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
  enableSearch?: boolean;
}

function CustomMultiSelect({ options, values = [], onChange, placeholder, className = '', enableSearch = false }: CustomMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredOptions = !normalizedSearch
    ? options
    : options.filter((option) => option.label.toLowerCase().includes(normalizedSearch));

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
        className="w-full px-3 py-1.5 text-left bg-[--card] border border-[--border] rounded-lg hover:border-[--ring] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent transition-all text-sm"
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
            {enableSearch && (
              <div className="px-3 pb-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={`Search ${placeholder.toLowerCase()}`}
                  className="w-full px-3 py-1.5 text-sm border border-[--border] rounded-md bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleSelectAll}
              className="w-full px-3 py-2 text-left text-sm text-[--muted-foreground] hover:bg-[--accent] flex items-center space-x-2"
            >
              <Check className={`w-4 h-4 ${values.length === options.length ? 'text-[--primary]' : 'text-[--muted-foreground]'}`} />
              <span>All {placeholder.toLowerCase()}</span>
            </button>
            {filteredOptions.map((option) => {
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
  const hasActiveFilters = Object.values(filters).some(value =>
    value !== undefined &&
    value !== '' &&
    (!Array.isArray(value) || value.length > 0)
  );

  const activeCount = Object.values(filters).filter(value =>
    value !== undefined &&
    value !== '' &&
    (!Array.isArray(value) || value.length > 0)
  ).length;

  const updateFilter = (partial: Partial<AppointmentFilterState>) => {
    onFiltersChange({
      ...filters,
      ...partial,
    });
  };

  const handleDateChange = (key: 'dateFrom' | 'dateTo') => (value: string) => {
    updateFilter({ [key]: value || undefined });
  };

  return (
    <div className={`flex h-full flex-col bg-[--card] border border-[--border] rounded-lg shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-2 border-b border-[--border] px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[--foreground]">
            <Filter className="h-4 w-4 text-[--primary]" />
            Filter Appointments
            {hasActiveFilters && (
              <span className="rounded-full bg-[--primary] px-2 py-0.5 text-xs font-semibold text-[--primary-foreground]">
                {activeCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[--muted-foreground]">
            Narrow down the list to focus on a staff member or a specific schedule window.
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[--muted-foreground] transition-colors hover:bg-[--error]/10 hover:text-[--error]"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[--muted-foreground]">Staff schedule</p>
              <p className="text-xs text-[--muted-foreground]">
                Select one or more staff members to focus the calendar on their appointments.
              </p>
            </div>
          </div>
          <CustomMultiSelect
            options={staffDropdownOptions}
            values={filters.staffIds || []}
            onChange={(values) => updateFilter({ staffIds: values.length ? values : undefined })}
            placeholder="Staff members"
            className="text-sm"
            enableSearch
          />
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[--muted-foreground]">Appointment type</p>
          <CustomMultiSelect
            options={appointmentTypes}
            values={filters.appointmentTypes || []}
            onChange={(values) => updateFilter({ appointmentTypes: values.length ? values : undefined })}
            placeholder="Appointment types"
            className="text-sm"
          />
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[--muted-foreground]">Status</p>
          <CustomMultiSelect
            options={statusOptions}
            values={filters.statuses || []}
            onChange={(values) => updateFilter({ statuses: values.length ? values : undefined })}
            placeholder="Statuses"
            className="text-sm"
          />
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[--muted-foreground]">Date range</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="relative flex flex-col text-xs text-[--muted-foreground]">
              <span className="mb-1 font-medium text-[--foreground]">From</span>
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[--muted-foreground]" />
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(event) => handleDateChange('dateFrom')(event.target.value)}
                  className="w-full rounded-lg border border-[--border] bg-[--card] pl-7 pr-2 py-1.5 text-xs text-[--foreground] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[--ring]"
                />
              </div>
            </label>
            <label className="relative flex flex-col text-xs text-[--muted-foreground]">
              <span className="mb-1 font-medium text-[--foreground]">To</span>
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[--muted-foreground]" />
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(event) => handleDateChange('dateTo')(event.target.value)}
                  className="w-full rounded-lg border border-[--border] bg-[--card] pl-7 pr-2 py-1.5 text-xs text-[--foreground] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[--ring]"
                />
              </div>
            </label>
          </div>
        </section>
      </div>

      {hasActiveFilters && (
        <div className="border-t border-[--border] px-4 py-3">
          <div className="text-xs text-[--muted-foreground]">
            Showing appointments that match the selected filters.
          </div>
        </div>
      )}
    </div>
  );
}
