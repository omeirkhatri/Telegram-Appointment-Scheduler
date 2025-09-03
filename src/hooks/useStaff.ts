import type { CreateStaff, Staff, StaffFilters, UpdateStaff } from '@/types';
import { useCallback, useEffect, useState } from 'react';

interface UseStaffOptions {
  initialFilters?: StaffFilters;
  autoFetch?: boolean;
}

interface UseStaffReturn {
  // Data
  staff: Staff[];
  staffMember: Staff | null;
  isLoading: boolean;
  error: string | null;

  // Pagination
  totalCount: number;
  currentPage: number;
  pageSize: number;

  // Filters and search
  filters: StaffFilters;
  searchTerm: string;

  // CRUD operations
  createStaff: (data: CreateStaff) => Promise<Staff>;
  updateStaff: (id: string, data: UpdateStaff) => Promise<Staff>;
  deleteStaff: (id: string) => Promise<void>;
  getStaff: (id: string) => Promise<Staff>;

  // Data fetching
  fetchStaff: (filters?: StaffFilters) => Promise<void>;
  fetchStaffMember: (id: string) => Promise<void>;
  searchStaff: (term: string) => Promise<void>;

  // Filter management
  setFilters: (filters: StaffFilters) => void;
  clearFilters: () => void;
  setSearchTerm: (term: string) => void;

  // Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Google Calendar operations
  validateCalendarId: (calendarId: string) => Promise<boolean>;
  checkStaffAvailability: (staffId: string, startTime: string, endTime: string, date: string) => Promise<boolean>;

  // State management
  refresh: () => void;
  clearError: () => void;
}

export function useStaff(options: UseStaffOptions = {}): UseStaffReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  // State
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffMember, setStaffMember] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters and search
  const [filters, setFilters] = useState<StaffFilters>(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch staff with filters
  const fetchStaff = useCallback(async (newFilters?: StaffFilters) => {
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

      const response = await fetch(`/api/staff?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch staff');
      }

      setStaff(data.data || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // Fetch single staff member
  const fetchStaffMember = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch staff member');
      }

      setStaffMember(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff member');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get staff member (returns data directly)
  const getStaff = useCallback(async (id: string): Promise<Staff> => {
    const response = await fetch(`/api/staff/${id}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch staff member');
    }

    return data.data;
  }, []);

  // Create staff member
  const createStaff = useCallback(async (staffData: CreateStaff): Promise<Staff> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(staffData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create staff member');
      }

      // Refresh the staff list
      await fetchStaff();

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create staff member');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchStaff]);

  // Update staff member
  const updateStaff = useCallback(async (id: string, staffData: UpdateStaff): Promise<Staff> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(staffData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update staff member');
      }

      // Update local state
      setStaff(prev => prev.map(s => s.id === id ? data.data : s));
      if (staffMember?.id === id) {
        setStaffMember(data.data);
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff member');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [staffMember]);

  // Delete staff member
  const deleteStaff = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete staff member');
      }

      // Update local state
      setStaff(prev => prev.filter(s => s.id !== id));
      if (staffMember?.id === id) {
        setStaffMember(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [staffMember]);

  // Search staff
  const searchStaff = useCallback(async (term: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', term);

      const response = await fetch(`/api/staff/search?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to search staff');
      }

      setStaff(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search staff');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate Google Calendar ID
  const validateCalendarId = useCallback(async (calendarId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/staff/validate-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendarId }),
      });

      const data = await response.json();
      return data.success;
    } catch (err) {
      return false;
    }
  }, []);

  // Check staff availability
  const checkStaffAvailability = useCallback(async (
    staffId: string,
    startTime: string,
    endTime: string,
    date: string,
  ): Promise<boolean> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('start_time', startTime);
      queryParams.append('end_time', endTime);
      queryParams.append('date', date);

      const response = await fetch(`/api/staff/${staffId}/availability?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to check availability');
      }

      return data.data.isAvailable;
    } catch (err) {
      return false;
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: StaffFilters) => {
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
      searchStaff(searchTerm);
    } else {
      fetchStaff();
    }
  }, [searchTerm, searchStaff, fetchStaff]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      if (searchTerm) {
        searchStaff(searchTerm);
      } else {
        fetchStaff();
      }
    }
  }, [autoFetch, searchTerm, currentPage, pageSize, fetchStaff, searchStaff]);

  return {
    // Data
    staff,
    staffMember,
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
    createStaff,
    updateStaff,
    deleteStaff,
    getStaff,

    // Data fetching
    fetchStaff,
    fetchStaffMember,
    searchStaff,

    // Filter management
    setFilters: updateFilters,
    clearFilters,
    setSearchTerm: updateSearchTerm,

    // Pagination
    setPage: updatePage,
    setPageSize: updatePageSize,

    // Google Calendar operations
    validateCalendarId,
    checkStaffAvailability,

    // State management
    refresh,
    clearError,
  };
}
