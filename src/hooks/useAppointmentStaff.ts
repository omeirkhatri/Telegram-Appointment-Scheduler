import type { AppointmentStaffWithDetails } from '@/types/appointmentStaff';
import { useCallback, useEffect, useState } from 'react';

interface UseAppointmentStaffOptions {
  startDate?: Date;
  endDate?: Date;
  staffId?: string;
}

interface UseAppointmentStaffReturn {
  staffAssignments: AppointmentStaffWithDetails[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAppointmentStaff(options: UseAppointmentStaffOptions = {}): UseAppointmentStaffReturn {
  const [staffAssignments, setStaffAssignments] = useState<AppointmentStaffWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffAssignments = useCallback(async () => {
    if (!options.startDate || !options.endDate) {
      setStaffAssignments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const startDateString = options.startDate.toISOString().split('T')[0];
      const endDateString = options.endDate.toISOString().split('T')[0];

      // Build query parameters
      const params = new URLSearchParams();
      params.append('start_date', startDateString);
      params.append('end_date', endDateString);
      if (options.staffId) {
        params.append('staff_id', options.staffId);
      }

      // Add cache-busting parameter to ensure fresh data
      params.append('_t', Date.now().toString());
      const response = await fetch(`/api/appointment-staff?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch staff assignments: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch staff assignments');
      }

      setStaffAssignments(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching staff assignments';
      setError(errorMessage);
      console.error('Error fetching staff assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.startDate, options.endDate, options.staffId]);

  useEffect(() => {
    // Only fetch on client-side to prevent hydration mismatches
    if (typeof window !== 'undefined') {
      fetchStaffAssignments();
    }
  }, [fetchStaffAssignments]);

  return {
    staffAssignments,
    isLoading,
    error,
    refetch: fetchStaffAssignments,
  };
}

// Hook for fetching staff assignments for a specific date range
export function useAppointmentStaffForDateRange(startDate: Date, endDate: Date, staffId?: string) {
  return useAppointmentStaff({
    startDate,
    endDate,
    staffId,
  });
}
