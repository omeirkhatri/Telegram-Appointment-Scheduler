'use client';

import { SkeletonList } from '@/components/ui';
import { SEARCH_DEBOUNCE_DELAY } from '@/constants';
import { useAppointments, useDebounce, useSearchFilterCache } from '@/hooks';
import type { AppointmentFilters } from '@/types';
import { getAppointmentTypeDisplayName } from '@/types/appointment';
import React, { useEffect, useState } from 'react';

interface AppointmentSearchFormProps {
  onSearch: (filters: AppointmentFilters) => void;
  onReset: () => void;
  isLoading?: boolean;
}

function AppointmentSearchForm({ onSearch, onReset, isLoading }: AppointmentSearchFormProps) {
  const [filters, setFilters] = useState<AppointmentFilters>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleReset = () => {
    setFilters({});
    onReset();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appointment Type
          </label>
          <select
            value={filters.appointment_type || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, appointment_type: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All types</option>
            <option value="doctor_on_call">Doctor on Call</option>
            <option value="lab_test">Lab Test</option>
            <option value="teleconsultation">Teleconsultation</option>
            <option value="physiotherapy">Physiotherapy</option>
            <option value="caregiver">Caregiver</option>
            <option value="iv_therapy">IV Therapy</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transportation Type
          </label>
          <select
            value={filters.transportation_type || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, transportation_type: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All types</option>
            <option value="driver">Driver</option>
            <option value="self_transport">Self Transport</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date From
          </label>
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date To
          </label>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recurring Appointments
          </label>
          <select
            value={filters.has_recurring_rule ? 'true' : filters.has_recurring_rule === false ? 'false' : ''}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              has_recurring_rule: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined,
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="true">Recurring</option>
            <option value="false">One-time</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Reset
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}

interface AppointmentSearchProps {
  onAppointmentSelect?: (appointment: any) => void;
  showFilters?: boolean;
  className?: string;
}

export function AppointmentSearch({ onAppointmentSelect, showFilters = true, className = '' }: AppointmentSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<AppointmentFilters>({});

  // Enhanced debouncing with pending state
  const { debouncedValue: debouncedSearchTerm, isPending: isSearchPending } = useDebounce(searchTerm, {
    delay: SEARCH_DEBOUNCE_DELAY,
    leading: false,
    trailing: true,
  });

  // Filter caching
  const { getCachedResults, setCachedResults } = useSearchFilterCache<any[]>();

  const {
    appointments,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    setSearchTerm: setHookSearchTerm,
    setFilters,
    clearFilters,
    setPage,
    setPageSize,
    refresh,
  } = useAppointments({ autoFetch: false });

  // Enhanced debounced search with caching
  useEffect(() => {
    const trimmedTerm = debouncedSearchTerm.trim();

    // Check cache first
    const cacheKey = { ...selectedFilters };
    const cachedResults = getCachedResults(cacheKey, trimmedTerm);

    if (cachedResults) {
      // Use cached results - we'd need to update the hook to accept cached data
      // For now, we'll still call the API but this shows the caching structure
    }

    if (trimmedTerm) {
      setHookSearchTerm(trimmedTerm);
    } else {
      setHookSearchTerm('');
    }
  }, [debouncedSearchTerm, selectedFilters, setHookSearchTerm, getCachedResults]);

  // Apply filters when they change
  useEffect(() => {
    if (Object.keys(selectedFilters).length > 0) {
      setFilters(selectedFilters);
    }
  }, [selectedFilters, setFilters]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilterChange = (filters: AppointmentFilters) => {
    setSelectedFilters(filters);
  };

  const handleClearFilters = () => {
    setSelectedFilters({});
    clearFilters();
    setSearchTerm('');
  };

  const handleAppointmentClick = (appointment: any) => {
    if (onAppointmentSelect) {
      onAppointmentSelect(appointment);
    }
  };

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  const getAppointmentTypeColor = (type: string) => {
    // Use centralized color system
    const colorMap: Record<string, string> = {
      doctor_on_call: 'bg-blue-100 text-blue-800',
      lab_test: 'bg-green-100 text-green-800',
      teleconsultation: 'bg-purple-100 text-purple-800',
      physiotherapy: 'bg-yellow-100 text-yellow-800',
      caregiver: 'bg-red-100 text-red-800',
      iv_therapy: 'bg-cyan-100 text-cyan-800',
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search appointments by patient, type, or notes..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {showFilters && (
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          )}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && showAdvancedFilters && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <AppointmentSearchForm
            onSearch={handleFilterChange}
            onReset={handleClearFilters}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          {totalCount > 0 ? (
            <span>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} appointments
            </span>
          ) : (
            <span>No appointments found</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Page size:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(isLoading || isSearchPending) && (
        <div className="py-8">
          <SkeletonList items={5} showAvatar={false} />
        </div>
      )}

      {/* Results List */}
      {!isLoading && !isSearchPending && appointments.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transportation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    onClick={() => handleAppointmentClick(appointment)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getAppointmentTypeDisplayName(appointment.appointment_type)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.duration_minutes} minutes
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(appointment.appointment_date)}</div>
                      <div className="text-sm text-gray-500">
                        {formatTime(appointment.start_time)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAppointmentTypeColor(appointment.appointment_type)}`}>
                          {appointment.appointment_type.replace('_', ' ')}
                        </span>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {appointment.transportation_type ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          appointment.transportation_type === 'driver'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {appointment.transportation_type.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {appointment.staff_assignments && appointment.staff_assignments.length > 0 ? (
                        <div className="text-sm text-gray-900">
                          {appointment.staff_assignments.length} staff assigned
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No staff assigned</span>
                      )}
                      {appointment.recurring_rule && (
                        <div className="text-sm text-gray-500">
                          Recurring
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isSearchPending && appointments.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                <span className="font-medium">{totalCount}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
