import type {
    Appointment,
    AppointmentFilters,
    CreateAppointment,
    StaffAssignment,
    UpdateAppointment
} from '@/types';
import { useCallback, useEffect, useState } from 'react';

interface UseAppointmentsOptions {
  initialFilters?: AppointmentFilters;
  autoFetch?: boolean;
}

interface UseAppointmentsReturn {
  // Data
  appointments: Appointment[];
  appointment: Appointment | null;
  staffAssignments: any[];
  isLoading: boolean;
  error: string | null;

  // Pagination
  totalCount: number;
  currentPage: number;
  pageSize: number;

  // Filters and search
  filters: AppointmentFilters;
  searchTerm: string;

  // CRUD operations
  createAppointment: (data: CreateAppointment) => Promise<Appointment>;
  updateAppointment: (id: string, data: UpdateAppointment) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointment: (id: string) => Promise<Appointment>;

  // Data fetching
  fetchAppointments: (filters?: AppointmentFilters) => Promise<void>;
  fetchAppointment: (id: string) => Promise<void>;
  searchAppointments: (term: string) => Promise<void>;

  // Staff assignment operations
  assignStaffToAppointment: (appointmentId: string, assignments: StaffAssignment[]) => Promise<void>;
  removeStaffFromAppointment: (appointmentId: string) => Promise<void>;
  getAppointmentStaff: (appointmentId: string) => Promise<any[]>;

  // Filter management
  setFilters: (filters: AppointmentFilters) => void;
  clearFilters: () => void;
  setSearchTerm: (term: string) => void;

  // Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // State management
  refresh: () => void;
  clearError: () => void;
}

export function useAppointments(options: UseAppointmentsOptions = {}): UseAppointmentsReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [staffAssignments, setStaffAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters and search
  const [filters, setFilters] = useState<AppointmentFilters>(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch appointments with filters
  const fetchAppointments = useCallback(async (newFilters?: AppointmentFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      // Add filters
      const activeFilters = newFilters || filters;
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      // Add pagination
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', pageSize.toString());

      const response = await fetch(`/api/appointments?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch appointments');
      }

      setAppointments(data.data || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // Fetch single appointment
  const fetchAppointment = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch appointment');
      }

      setAppointment(data.data.appointment);
      setStaffAssignments(data.data.staff_assignments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appointment');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get appointment (returns data directly)
  const getAppointment = useCallback(async (id: string): Promise<Appointment> => {
    const response = await fetch(`/api/appointments/${id}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch appointment');
    }

    return data.data.appointment;
  }, []);

  // Create appointment
  const createAppointment = useCallback(async (appointmentData: CreateAppointment): Promise<Appointment> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create appointment');
      }

      // Refresh the appointments list
      await fetchAppointments();

      return data.data.appointment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAppointments]);

  // Update appointment
  const updateAppointment = useCallback(async (id: string, appointmentData: UpdateAppointment): Promise<Appointment> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update appointment');
      }

      // Update local state
      setAppointments(prev => prev.map(a => a.id === id ? data.data.appointment : a));
      if (appointment?.id === id) {
        setAppointment(data.data.appointment);
        setStaffAssignments(data.data.staff_assignments || []);
      }

      return data.data.appointment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update appointment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [appointment]);

  // Delete appointment
  const deleteAppointment = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete appointment');
      }

      // Update local state
      setAppointments(prev => prev.filter(a => a.id !== id));
      if (appointment?.id === id) {
        setAppointment(null);
        setStaffAssignments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete appointment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [appointment]);

  // Search appointments
  const searchAppointments = useCallback(async (term: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', term);

      const response = await fetch(`/api/appointments/search?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to search appointments');
      }

      setAppointments(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search appointments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Assign staff to appointment
  const assignStaffToAppointment = useCallback(async (appointmentId: string, assignments: StaffAssignment[]): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staff_assignments: assignments }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to assign staff to appointment');
      }

      // Update local state
      setStaffAssignments(data.data.staff_assignments || []);
      if (appointment?.id === appointmentId) {
        setAppointment(prev => prev ? { ...prev, staff_assignments: data.data.staff_assignments } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign staff to appointment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [appointment]);

  // Remove staff from appointment
  const removeStaffFromAppointment = useCallback(async (appointmentId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/staff`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to remove staff from appointment');
      }

      // Update local state
      setStaffAssignments([]);
      if (appointment?.id === appointmentId) {
        setAppointment(prev => prev ? { ...prev, staff_assignments: [] } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove staff from appointment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [appointment]);

  // Get appointment staff
  const getAppointmentStaff = useCallback(async (appointmentId: string): Promise<any[]> => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/staff`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch appointment staff');
      }

      return data.data.staff_assignments || [];
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to fetch appointment staff');
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: AppointmentFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchTerm('');
    setCurrentPage(1);
  }, [initialFilters]);

  // Update search term
  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when search changes
  }, []);

  // Update page
  const updatePage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Update page size
  const updatePageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    if (searchTerm) {
      searchAppointments(searchTerm);
    } else {
      fetchAppointments();
    }
  }, [searchTerm, searchAppointments, fetchAppointments]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      if (searchTerm) {
        searchAppointments(searchTerm);
      } else {
        fetchAppointments();
      }
    }
  }, [autoFetch, searchTerm, currentPage, pageSize, fetchAppointments, searchAppointments]);

  return {
    // Data
    appointments,
    appointment,
    staffAssignments,
    isLoading,
    error,

    // Pagination
    totalCount,
    currentPage,
    pageSize,

    // Filters and search
    filters,
    searchTerm,

    // CRUD operations
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointment,

    // Data fetching
    fetchAppointments,
    fetchAppointment,
    searchAppointments,

    // Staff assignment operations
    assignStaffToAppointment,
    removeStaffFromAppointment,
    getAppointmentStaff,

    // Filter management
    setFilters: updateFilters,
    clearFilters,
    setSearchTerm: updateSearchTerm,

    // Pagination
    setPage: updatePage,
    setPageSize: updatePageSize,

    // State management
    refresh,
    clearError,
  };
}
