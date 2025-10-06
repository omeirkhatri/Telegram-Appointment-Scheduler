import { buildTimezoneArtifacts } from '@/lib/timezoneArtifacts';
import type { Appointment } from '@/types';
import { useCallback, useEffect, useState } from 'react';

interface UseAppointmentsForMapOptions {
  dateFrom?: string;
  dateTo?: string;
  patientId?: string;
  appointmentType?: string;
  status?: string;
  driverId?: string;
  transportationType?: string;
  hasRecurringRule?: boolean;
}

interface UseAppointmentsForMapReturn {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAppointmentsForMap(options: UseAppointmentsForMapOptions = {}): UseAppointmentsForMapReturn {
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
      if (options.patientId) params.append('patient_id', options.patientId);
      if (options.appointmentType) params.append('appointment_type', options.appointmentType);
      if (options.status) params.append('status', options.status);
      if (options.driverId) params.append('driver_id', options.driverId);
      if (options.transportationType) params.append('transportation_type', options.transportationType);
      if (options.hasRecurringRule !== undefined) {
        params.append('has_recurring_rule', options.hasRecurringRule.toString());
      }

      // Add cache-busting parameter to ensure fresh data
      params.append('_t', Date.now().toString());
      params.append('_cache', 'no-cache');

      const response = await fetch(`/api/appointments?${params.toString()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          body: errorText
        });
        throw new Error(`Failed to fetch appointments for map: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        console.error('API Success False:', {
          success: data.success,
          error: data.error,
          data: data.data
        });
        throw new Error(data.error || 'Failed to fetch appointments for map');
      }

      const fetchedAppointments: Appointment[] = data.data || [];

      // Get timezone context for map appointments
      const timezoneArtifacts = buildTimezoneArtifacts();

      // Add timezone metadata to appointments for map display
      const appointmentsWithTimezone = fetchedAppointments.map(apt => {
        const normalizedSegments = apt.transportation_segments ?? apt.transportationSegments;

        return {
          ...apt,
          ...(normalizedSegments
            ? {
                transportation_segments: normalizedSegments,
                transportationSegments: normalizedSegments,
              }
            : {}),
          timezone: timezoneArtifacts.resolution.timezone,
          timezoneSource: timezoneArtifacts.resolution.source,
          timezoneAbbreviation: timezoneArtifacts.resolution.abbreviation,
          timezoneOffsetMinutes: timezoneArtifacts.resolution.offsetMinutes,
        };
      });

      // Debug logging for appointments data
      console.log('Fetched appointments for map (with expanded recurring):', appointmentsWithTimezone.map(apt => ({
        id: apt.id,
        patient_name: apt.patient?.name,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        timezone: apt.timezone,
        timezoneSource: apt.timezoneSource,
        has_coordinates: !!(apt.patient?.latitude && apt.patient?.longitude),
        coordinates: apt.patient?.latitude ? `${apt.patient.latitude}, ${apt.patient.longitude}` : 'None',
        is_recurring_generated: apt.custom_fields?.is_recurring_generated || false,
        base_appointment_id: apt.custom_fields?.base_appointment_id || 'N/A'
      })));

      setAppointments(appointmentsWithTimezone);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching appointments for map';
      setError(errorMessage);
      console.error('Error fetching appointments for map:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.dateFrom, options.dateTo, options.patientId, options.appointmentType, options.status, options.driverId, options.transportationType, options.hasRecurringRule]);

  useEffect(() => {
    // Only fetch on client-side to prevent hydration mismatches
    if (typeof window !== 'undefined') {
      fetchAppointments();
    }
  }, [options.dateFrom, options.dateTo, options.patientId, options.appointmentType, options.status, options.driverId, options.transportationType, options.hasRecurringRule]);

  return {
    appointments,
    isLoading,
    error,
    refetch: fetchAppointments,
  };
}

// Hook for fetching appointments for a specific date range for map view
export function useAppointmentsForMapDateRange(startDate: Date, endDate: Date, filters?: Omit<UseAppointmentsForMapOptions, 'dateFrom' | 'dateTo'>) {
  const dateFrom = startDate.toISOString().split('T')[0];
  const dateTo = endDate.toISOString().split('T')[0];

  return useAppointmentsForMap({
    ...filters,
    dateFrom,
    dateTo,
  });
}
