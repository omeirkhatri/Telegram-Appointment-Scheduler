'use client';

import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';

export interface AppointmentFilterState {
  staffId?: string;
  appointmentType?: string;
  status?: string;
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

export function AppointmentFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  staffOptions = [],
  className = '',
}: AppointmentFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const appointmentTypes = [
    { value: 'doctor_on_call', label: 'Doctor on Call', color: getAppointmentTypeColor('doctor_on_call', 'primary') },
    { value: 'lab_test', label: 'Lab Test', color: getAppointmentTypeColor('lab_test', 'primary') },
    { value: 'teleconsultation', label: 'Teleconsultation', color: getAppointmentTypeColor('teleconsultation', 'primary') },
    { value: 'physiotherapy', label: 'Physiotherapy', color: getAppointmentTypeColor('physiotherapy', 'primary') },
    { value: 'caregiver', label: 'Caregiver', color: getAppointmentTypeColor('caregiver', 'primary') },
    { value: 'iv_therapy', label: 'IV Therapy', color: getAppointmentTypeColor('iv_therapy', 'primary') },
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  ];

  const handleFilterChange = (key: keyof AppointmentFilterState, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  const getFilterCount = () => {
    return Object.values(filters).filter(value => value !== undefined && value !== '').length;
  };

  return (
    <div className={`bg-[--card] border border-[--border] rounded-xl shadow-lg ${className}`}>
      {/* Filter Header */}
      <div className="p-4 border-b border-[--border]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-[--foreground] hover:text-[--primary] transition-colors"
            >
              <span className="font-medium">Filters</span>
              {hasActiveFilters && (
                <span className="bg-[--primary] text-[--primary-foreground] text-xs px-2 py-1 rounded-full">
                  {getFilterCount()}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex items-center space-x-1 text-[--muted-foreground] hover:text-[--foreground] transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="text-sm">Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Staff Filter */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">
              Staff Member
            </label>
            <select
              value={filters.staffId || ''}
              onChange={(e) => handleFilterChange('staffId', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
            >
              <option value="">All staff members</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.staff_type.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Appointment Type Filter */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">
              Appointment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {appointmentTypes.map((type) => (
                <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.appointmentType === type.value}
                    onChange={(e) => handleFilterChange('appointmentType', e.target.checked ? type.value : undefined)}
                    className="rounded border-[--border] text-[--primary] focus:ring-[--ring]"
                  />
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm text-[--foreground]">{type.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((status) => (
                <label key={status.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.status === status.value}
                    onChange={(e) => handleFilterChange('status', e.target.checked ? status.value : undefined)}
                    className="rounded border-[--border] text-[--primary] focus:ring-[--ring]"
                  />
                  <span className={`text-sm px-2 py-1 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">From</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                    className="w-full pl-10 pr-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[--muted-foreground] mb-1">To</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                    className="w-full pl-10 pr-3 py-2 border border-[--border] rounded-lg bg-[--muted] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
