import type { Appointment, CalendarEvent } from '@/types';
import { getAppointmentTypeDisplayName } from '@/types/appointment';
import { getAppointmentTypeColor, getDurationConstraints, validateDurationForType } from '@/utils/appointmentTypes';
import { useCallback, useEffect, useState } from 'react';

// Helper function to snap duration to nearest allowed value
function snapToNearestAllowedDuration(appointmentType: string, durationMinutes: number): number {
  const constraints = getDurationConstraints(appointmentType as any);

  if (!constraints.allowedValues) {
    // If no allowed values, just ensure it's within min/max bounds
    return Math.max(constraints.min, Math.min(constraints.max, durationMinutes));
  }

  // Find the closest allowed value
  let closest = constraints.allowedValues[0];
  let minDiff = Math.abs(durationMinutes - closest);

  for (const allowedValue of constraints.allowedValues) {
    const diff = Math.abs(durationMinutes - allowedValue);
    if (diff < minDiff) {
      minDiff = diff;
      closest = allowedValue;
    }
  }

  return closest;
}

interface UseAppointmentsOptions {
  dateFrom?: string;
  dateTo?: string;
  staffId?: string;
  appointmentType?: string;
  status?: string;
}

interface UseAppointmentsReturn {
  events: CalendarEvent[];
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Use centralized color mapping from utils

export function useAppointments(options: UseAppointmentsOptions = {}): UseAppointmentsReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (options.dateFrom) params.append('date_from', options.dateFrom);
      if (options.dateTo) params.append('date_to', options.dateTo);
      if (options.staffId) params.append('staff_id', options.staffId);
      if (options.appointmentType) params.append('appointment_type', options.appointmentType);
      if (options.status) params.append('status', options.status);

      // Add cache-busting parameter to ensure fresh data
      params.append('_t', Date.now().toString());
      const response = await fetch(`/api/appointments?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch appointments: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch appointments');
      }

      const fetchedAppointments: Appointment[] = data.data || [];
      setAppointments(fetchedAppointments);

      // Transform appointments to calendar events
      const calendarEvents: CalendarEvent[] = fetchedAppointments.map((appointment) => {
        const startDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
        const endDateTime = new Date(startDateTime.getTime() + appointment.duration_minutes * 60000);

        return {
          id: appointment.id,
          title: getAppointmentTypeDisplayName(appointment.appointment_type),
          start: startDateTime,
          end: endDateTime,
          allDay: false,
          color: getAppointmentTypeColor(appointment.appointment_type, 'primary'),
          appointment: appointment,
        };
      });

      setEvents(calendarEvents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching appointments';
      setError(errorMessage);
      console.error('Error fetching appointments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.dateFrom, options.dateTo, options.staffId, options.appointmentType, options.status]);

  useEffect(() => {
    // Only fetch on client-side to prevent hydration mismatches
    if (typeof window !== 'undefined') {
      fetchAppointments();
    }
  }, [fetchAppointments]);

  return {
    events,
    appointments,
    isLoading,
    error,
    refetch: fetchAppointments,
  };
}

// Hook for fetching appointments for a specific date range (useful for calendar views)
export function useAppointmentsForDateRange(startDate: Date, endDate: Date, filters?: Omit<UseAppointmentsOptions, 'dateFrom' | 'dateTo'>) {
  const dateFrom = startDate.toISOString().split('T')[0];
  const dateTo = endDate.toISOString().split('T')[0];

  return useAppointments({
    ...filters,
    dateFrom,
    dateTo,
  });
}

// Hook for fetching today's appointments
export function useTodaysAppointments(filters?: Omit<UseAppointmentsOptions, 'dateFrom' | 'dateTo'>) {
  const today = new Date();
  return useAppointmentsForDateRange(today, today, filters);
}

// Hook for creating appointments
export function useCreateAppointment() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAppointment = useCallback(async (appointmentData: any) => {
    setIsCreating(true);
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

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create appointment');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while creating appointment';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createAppointment,
    isCreating,
    error,
  };
}

// Hook for updating appointment time/date (for drag-and-drop rescheduling)
export function useUpdateAppointment() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAppointmentTime = useCallback(async (
    appointmentId: string,
    newStart: Date,
    newEnd: Date,
    appointmentType?: string,
    originalDuration?: number,
  ) => {
    setIsUpdating(true);
    setError(null);

    try {
      // Format the new date and time
      const appointmentDate = newStart.toISOString().split('T')[0];
      const startTime = newStart.toTimeString().slice(0, 5); // HH:MM format

      // Use original duration if provided, otherwise calculate from drag distance
      let durationMinutes = originalDuration || Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60));

      // If we have an appointment type and the duration doesn't match allowed values, snap to nearest
      if (appointmentType) {
        const validation = validateDurationForType(appointmentType as any, durationMinutes);
        if (!validation.isValid) {
          // Snap to nearest allowed duration
          const originalCalculatedDuration = durationMinutes;
          durationMinutes = snapToNearestAllowedDuration(appointmentType, durationMinutes);
          console.log(`Snapped duration from ${originalCalculatedDuration} to ${durationMinutes} minutes for ${appointmentType}`);
        }
      }

      console.log('Updating appointment time:', {
        appointmentId,
        appointmentDate,
        startTime,
        durationMinutes,
        originalDuration,
        appointmentType,
        newStart: newStart.toISOString(),
        newEnd: newEnd.toISOString()
      });

      // Final validation
      if (appointmentType) {
        const validation = validateDurationForType(appointmentType as any, durationMinutes);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
      }

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_date: appointmentDate,
          start_time: startTime,
          duration_minutes: durationMinutes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update appointment: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update appointment');
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating appointment';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    updateAppointmentTime,
    isUpdating,
    error,
  };
}
