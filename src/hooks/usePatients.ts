import type { CreatePatient, Patient, PatientFilters, UpdatePatient } from '@/types';
import { useCallback, useEffect, useState } from 'react';

interface UsePatientsOptions {
  initialFilters?: PatientFilters;
  autoFetch?: boolean;
}

interface UsePatientsReturn {
  // Data
  patients: Patient[];
  patient: Patient | null;
  isLoading: boolean;
  error: string | null;

  // Pagination
  totalCount: number;
  currentPage: number;
  pageSize: number;

  // Filters and search
  filters: PatientFilters;
  searchTerm: string;

  // CRUD operations
  createPatient: (data: CreatePatient) => Promise<Patient>;
  updatePatient: (id: string, data: UpdatePatient) => Promise<Patient>;
  deletePatient: (id: string) => Promise<void>;
  getPatient: (id: string) => Promise<Patient>;

  // Data fetching
  fetchPatients: (filters?: PatientFilters) => Promise<void>;
  fetchPatient: (id: string) => Promise<void>;
  searchPatients: (term: string) => Promise<void>;

  // Filter management
  setFilters: (filters: PatientFilters) => void;
  clearFilters: () => void;
  setSearchTerm: (term: string) => void;

  // Pagination
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // State management
  refresh: () => void;
  clearError: () => void;
}

export function usePatients(options: UsePatientsOptions = {}): UsePatientsReturn {
  const { initialFilters = {}, autoFetch = true } = options;

  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters and search
  const [filters, setFilters] = useState<PatientFilters>(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch patients with filters
  const fetchPatients = useCallback(async (newFilters?: PatientFilters) => {
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

      const response = await fetch(`/api/patients?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch patients');
      }

      setPatients(data.data || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patients');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, pageSize]);

  // Fetch single patient
  const fetchPatient = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/patients/${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch patient');
      }

      setPatient(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patient');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get patient (returns data directly)
  const getPatient = useCallback(async (id: string): Promise<Patient> => {
    const response = await fetch(`/api/patients/${id}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch patient');
    }

    return data.data;
  }, []);

  // Create patient
  const createPatient = useCallback(async (patientData: CreatePatient): Promise<Patient> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();

      // Add patient data
      Object.entries(patientData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'id_document' && value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const response = await fetch('/api/patients', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create patient');
      }

      // Refresh the patients list
      await fetchPatients();

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchPatients]);

  // Update patient
  const updatePatient = useCallback(async (id: string, patientData: UpdatePatient): Promise<Patient> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();

      // Add patient data
      Object.entries(patientData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'id_document' && value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update patient');
      }

      // Update local state
      setPatients(prev => prev.map(p => p.id === id ? data.data : p));
      if (patient?.id === id) {
        setPatient(data.data);
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [patient]);

  // Delete patient
  const deletePatient = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete patient');
      }

      // Update local state
      setPatients(prev => prev.filter(p => p.id !== id));
      if (patient?.id === id) {
        setPatient(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [patient]);

  // Search patients
  const searchPatients = useCallback(async (term: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', term);

      const response = await fetch(`/api/patients/search?${queryParams.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to search patients');
      }

      setPatients(data.data || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search patients');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: PatientFilters) => {
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
      searchPatients(searchTerm);
    } else {
      fetchPatients();
    }
  }, [searchTerm, searchPatients, fetchPatients]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    // Only fetch on client-side to prevent hydration mismatches
    if (typeof window !== 'undefined' && autoFetch) {
      if (searchTerm) {
        searchPatients(searchTerm);
      } else {
        fetchPatients();
      }
    }
  }, [autoFetch, searchTerm, currentPage, pageSize, fetchPatients, searchPatients]);

  return {
    // Data
    patients,
    patient,
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
    createPatient,
    updatePatient,
    deletePatient,
    getPatient,

    // Data fetching
    fetchPatients,
    fetchPatient,
    searchPatients,

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
