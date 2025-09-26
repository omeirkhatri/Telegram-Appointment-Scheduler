'use client';

import { DriverAvailabilityIndicator } from '@/components/ui/DriverAvailabilityIndicator';
import { PatientCombobox } from '@/components/ui/PatientCombobox';
import { PlacesAutocomplete, type PlaceResult } from '@/components/ui/PlacesAutocomplete';
import { TimePicker } from '@/components/ui/TimePicker';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { appointmentFormSchema, type AppointmentFormData } from '@/lib/validations/appointment';
import type { Appointment, Patient, Staff, StaffAssignment } from '@/types';
import type { PickupLocationType, TransportationSegment, TransportationSegmentLocation, TransportationSegmentType } from '@/types/transportationSegment';
import { getDistanceMatrix } from '@/utils/google/distanceMatrix';
import { formatTimeToHHMM } from '@/utils/timezone';
import {
    calculateSegmentWarnings,
    type TravelWarning
} from '@/utils/transportationSegments';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { PickupLocationSelector } from './PickupLocationSelector';
import { RecurrenceRuleBuilder } from './RecurrenceRuleBuilder';

interface AppointmentFormProps {
  appointment?: Appointment;
  patients?: Patient[];
  staff?: Staff[];
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  staffAssignments?: StaffAssignment[];
  transportationSegments?: TransportationSegment[];
}

const APPOINTMENT_TYPES = [
  { value: 'doctor_on_call', label: 'Doctor on Call' },
  { value: 'lab_test', label: 'Lab Test' },
  { value: 'teleconsultation', label: 'Teleconsultation' },
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'iv_therapy', label: 'IV Therapy' },
] as const;

const TRANSPORTATION_TYPES = [
  { value: 'driver', label: 'Driver' },
  { value: 'self_transport', label: 'Self Transport' },
] as const;

const TRANSPORTATION_METHODS = [
  "Won't work",
  'Family member',
  'Taxi',
  'Public transport',
  'Walking',
] as const;

const STAFF_ROLES = [
  { value: 'primary', label: 'Primary' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'driver', label: 'Driver' },
] as const;

const TRANSPORTATION_SEGMENT_TYPES = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'dropoff', label: 'Drop-off' },
  { value: 'stay_with_staff', label: 'Stay with Staff' },
  { value: 'metro_assist', label: 'Metro Assist' },
  { value: 'custom', label: 'Custom' },
] as const;

const TRANSPORTATION_MODE_OPTIONS = [
  { value: 'simple', label: 'Simple Mode', description: 'Single driver assignment (current workflow)' },
  { value: 'segments', label: 'Segment Mode', description: 'Multiple transportation segments with different drivers' },
] as const;

const TRAVEL_ESTIMATE_COOLDOWN_MS = 30_000;

interface TravelEstimateStateEntry {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  lastCalculatedAt?: number;
}


export function AppointmentForm({
  appointment,
  patients = [],
  staff = [],
  onSubmit,
  onCancel,
  isLoading = false,
  staffAssignments = [],
  transportationSegments = [],
}: AppointmentFormProps) {
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [transportationMode, setTransportationMode] = useState<'simple' | 'segments'>('simple');
  const [transportationSegmentsData, setTransportationSegmentsData] = useState<TransportationSegment[]>(transportationSegments);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);
  const [travelEstimateState, setTravelEstimateState] = useState<Record<string, TravelEstimateStateEntry>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setTravelEstimateState(prev => {
      const next = { ...prev } as Record<string, TravelEstimateStateEntry>;
      let changed = false;

      const activeIds = new Set(transportationSegmentsData.map(segment => segment.id));

      transportationSegmentsData.forEach(segment => {
        if (!next[segment.id]) {
          next[segment.id] = { status: 'idle' };
          changed = true;
        }
      });

      Object.keys(next).forEach(id => {
        if (!activeIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [transportationSegmentsData]);

  const segmentWarnings = useMemo<Record<string, TravelWarning>>(
    () => calculateSegmentWarnings(transportationSegmentsData),
    [transportationSegmentsData],
  );

  const updateSegmentData = useCallback(
    (segmentId: string, updates: Partial<TransportationSegment>, options?: { resetEstimate?: boolean }) => {
      setTransportationSegmentsData(prev => {
        const index = prev.findIndex(segment => segment.id === segmentId);
        if (index === -1) {
          return prev;
        }

        const updated = [...prev];
        const nextSegment: TransportationSegment = {
          ...updated[index],
          ...updates,
        };

        if (options?.resetEstimate) {
          nextSegment.estimated_travel_minutes = undefined;
          nextSegment.estimated_distance_km = undefined;
        }

        updated[index] = nextSegment;
        return updated;
      });

      if (options?.resetEstimate) {
        setTravelEstimateState(prev => ({
          ...prev,
          [segmentId]: {
            status: 'idle',
            message: 'Travel estimate needs recalculation after recent changes.',
          },
        }));
      }
    },
    [setTransportationSegmentsData, setTravelEstimateState],
  );

  const resolveSegmentTravelMode = useCallback((segment: TransportationSegment): 'driving' | 'walking' | 'bicycling' | 'transit' => {
    const mode = segment.travel_mode?.toLowerCase();

    if (mode === 'walking' || mode === 'on_foot') {
      return 'walking';
    }

    if (mode === 'bicycling' || mode === 'bike') {
      return 'bicycling';
    }

    if (mode === 'transit' || mode === 'metro' || mode === 'metro_assist' || mode === 'public_transport') {
      return 'transit';
    }

    if (!mode && segment.segment_type === 'metro_assist') {
      return 'transit';
    }

    return 'driving';
  }, []);

  const handleRecalculateTravel = useCallback(
    async (segment: TransportationSegment) => {
      const segmentId = segment.id;
      const currentState = travelEstimateState[segmentId];

      const hasPickupLocationCoordinates = segment.pickup_location?.lat !== undefined && segment.pickup_location?.lng !== undefined;
      const hasPatientLocationCoordinates = segment.patient_location?.lat !== undefined && segment.patient_location?.lng !== undefined;

      if (!hasPickupLocationCoordinates || !hasPatientLocationCoordinates) {
        setTravelEstimateState(prev => ({
          ...prev,
          [segmentId]: {
            status: 'error',
            message: 'Add both pickup and patient locations with coordinates before calculating travel time.',
            lastCalculatedAt: prev[segmentId]?.lastCalculatedAt,
          },
        }));
        return;
      }

      if (currentState?.status === 'loading') {
        return;
      }

      if (currentState?.lastCalculatedAt) {
        const elapsed = Date.now() - currentState.lastCalculatedAt;
        if (elapsed < TRAVEL_ESTIMATE_COOLDOWN_MS) {
          const secondsRemaining = Math.ceil((TRAVEL_ESTIMATE_COOLDOWN_MS - elapsed) / 1000);
          setTravelEstimateState(prev => ({
            ...prev,
            [segmentId]: {
              ...prev[segmentId],
              status: prev[segmentId]?.status === 'success' ? 'success' : 'idle',
              message: `Please wait ${secondsRemaining}s before recalculating to stay within Google API limits.`,
            },
          }));
          return;
        }
      }

      setTravelEstimateState(prev => ({
        ...prev,
        [segmentId]: {
          status: 'loading',
          message: 'Calculating travel estimate...',
          lastCalculatedAt: prev[segmentId]?.lastCalculatedAt,
        },
      }));

      try {
        const mode = resolveSegmentTravelMode(segment);
        const departureTime = segment.planned_start ? new Date(segment.planned_start) : undefined;

        const result = await getDistanceMatrix(
          { lat: Number(segment.pickup_location!.lat), lng: Number(segment.pickup_location!.lng) },
          { lat: Number(segment.patient_location!.lat), lng: Number(segment.patient_location!.lng) },
          { mode, departureTime },
        );

        if (result.status === 'success') {
          setTransportationSegmentsData(prev => {
            const index = prev.findIndex(item => item.id === segmentId);
            if (index === -1) {
              return prev;
            }

            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              estimated_travel_minutes: result.durationMinutes,
              estimated_distance_km: Number(result.distanceKilometers.toFixed(2)),
            };
            return updated;
          });

          setTravelEstimateState(prev => ({
            ...prev,
            [segmentId]: {
              status: 'success',
              message: `Estimated ${result.text.duration} (${result.text.distance})`,
              lastCalculatedAt: Date.now(),
            },
          }));
        } else {
          setTravelEstimateState(prev => ({
            ...prev,
            [segmentId]: {
              status: 'error',
              message: result.error,
              lastCalculatedAt: prev[segmentId]?.lastCalculatedAt,
            },
          }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to calculate travel time.';
        setTravelEstimateState(prev => ({
          ...prev,
          [segmentId]: {
            status: 'error',
            message,
            lastCalculatedAt: prev[segmentId]?.lastCalculatedAt,
          },
        }));
      }
    },
    [resolveSegmentTravelMode, setTransportationSegmentsData, setTravelEstimateState, travelEstimateState],
  );


  // Helper function to calculate end time from start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return '';

    const [hours, minutes] = startTime.split(':').map(Number);
    const startTotalMinutes = hours * 60 + minutes;
    const endTotalMinutes = startTotalMinutes + durationMinutes;

    // Handle overflow to next day
    const endHours = Math.floor((endTotalMinutes % (24 * 60)) / 60);
    const endMins = endTotalMinutes % 60;

    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  // Helper function to calculate duration from start and end times
  const calculateDuration = () => {
    const startTime = watch('start_time');
    const endTime = watch('end_time');

    if (startTime && endTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);

      const startTimeInMinutes = startHours * 60 + startMinutes;
      const endTimeInMinutes = endHours * 60 + endMinutes;

      const duration = endTimeInMinutes - startTimeInMinutes;

      if (duration > 0) {
        setValue('duration_minutes', duration);
      }
    }
  };

  // Helper function to update end time when duration changes
  const updateEndTimeFromDuration = (duration: number) => {
    const startTime = watch('start_time');
    if (startTime && duration > 0) {
      const endTime = calculateEndTime(startTime, duration);
      setValue('end_time', endTime, { shouldValidate: true });
    }
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    trigger,
    reset,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: appointment?.patient_id || '',
      appointment_type: appointment?.appointment_type || 'doctor_on_call',
      appointment_date: appointment?.appointment_date || '',
      start_time: appointment?.start_time ? formatTimeToHHMM(appointment.start_time) : '09:00',
      end_time: appointment?.end_time ? formatTimeToHHMM(appointment.end_time) : calculateEndTime(appointment?.start_time ? formatTimeToHHMM(appointment.start_time) : '09:00', appointment?.duration_minutes || 60),
      duration_minutes: appointment?.duration_minutes || 60,
      status: appointment?.status || 'scheduled',
      transportation_type: appointment?.transportation_type || undefined,
      transportation_method: appointment?.transportation_method || '',
      driver_id: appointment?.driver_id || '',
      notes: appointment?.notes || '',
      mini_notes: appointment?.mini_notes || '',
      full_notes: appointment?.full_notes || '',
      pickup_instructions: appointment?.pickup_instructions || '',
      custom_fields: appointment?.custom_fields || {},
      recurring_rule: appointment?.recurring_rule || undefined,
      staff_assignments: staffAssignments && staffAssignments.length > 0 ? staffAssignments : undefined,
    },
    mode: 'onSubmit', // Only validate on submit to avoid premature validation
  });

  // Debug form state
  console.log('Form errors:', errors);
  console.log('Form isSubmitting:', isSubmitting);
  console.log('Appointment data:', appointment);

  // Ensure form is properly initialized when editing
  useEffect(() => {
    if (appointment) {
      // Set the time values explicitly to ensure they're in the correct format
      // Use a small delay to ensure the form is fully initialized
      setTimeout(() => {
        if (appointment.start_time) {
          setValue('start_time', formatTimeToHHMM(appointment.start_time), { shouldValidate: false });
        }
        if (appointment.end_time) {
          setValue('end_time', formatTimeToHHMM(appointment.end_time), { shouldValidate: false });
        }
      }, 100);

      // Initialize transportation segments if they exist
      if (transportationSegments && transportationSegments.length > 0) {
        setTransportationSegmentsData(transportationSegments);
        setTransportationMode('segments');
      }
    }
  }, [appointment, setValue, transportationSegments]);


  const { fields, append, remove } = useFieldArray({
    control,
    name: 'staff_assignments',
  });

  const watchedAppointmentType = watch('appointment_type');
  const watchedTransportationType = watch('transportation_type');
  const watchedRecurringRule = watch('recurring_rule');

  // Stabilize the recurring rule value to prevent infinite re-renders
  const stableRecurringRule = useMemo(() => watchedRecurringRule, [
    watchedRecurringRule?.frequency,
    watchedRecurringRule?.interval,
    watchedRecurringRule?.days_of_week,
    watchedRecurringRule?.day_of_month,
    watchedRecurringRule?.month_of_year,
    watchedRecurringRule?.end_date,
    watchedRecurringRule?.end_occurrences,
  ]);


  // Filter staff by appointment type
  const filteredStaff = staff.filter(s => {
    switch (watchedAppointmentType) {
      case 'doctor_on_call':
        return s.staff_type === 'doctor';
      case 'lab_test':
        return s.staff_type === 'nurse' || s.staff_type === 'lab_technician';
      case 'teleconsultation':
        return s.staff_type === 'doctor';
      case 'physiotherapy':
        return s.staff_type === 'physiotherapist';
      case 'caregiver':
        return s.staff_type === 'caregiver';
      case 'iv_therapy':
        return s.staff_type === 'nurse';
      default:
        return true;
    }
  });

  // Filter drivers for transportation
  const drivers = staff.filter(s => s.staff_type === 'driver' && s.status === 'active');

  const handleFormSubmit = async (data: AppointmentFormData) => {
    console.log('Form submitted with data:', data);

    try {
      // Prepare the submission data with transportation segments if in segment mode
      const submissionData = {
        ...data,
        ...(transportationMode === 'segments' && isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED') && {
          transportation_segments: transportationSegmentsData.map(segment => ({
            segment_type: segment.segment_type,
            title: segment.title || `${segment.segment_type} segment`,
            planned_start: segment.planned_start,
            planned_end: segment.planned_end,
            driver_id: segment.driver_id,
            travel_mode: segment.travel_mode,
            pickup_location: segment.pickup_location,
            patient_location: segment.patient_location,
            estimated_travel_minutes: segment.estimated_travel_minutes,
            estimated_distance_km: segment.estimated_distance_km,
            buffer_minutes: segment.buffer_minutes,
            instructions: segment.instructions,
            requires_follow_up: segment.requires_follow_up,
            status: segment.status,
            manual_override: segment.manual_override,
          }))
        })
      };

      await onSubmit(submissionData);
      console.log('Form submission successful');
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const addStaffAssignment = () => {
    append({
      staff_id: '',
      role: 'primary',
      is_primary: false,
    });
  };

  const removeStaffAssignment = (index: number) => {
    remove(index);
  };

  const handleStaffRoleChange = (index: number, role: string) => {
    const newAssignments = [...watch('staff_assignments')];
    newAssignments[index].role = role as any;

    // If this is primary, unset others
    if (role === 'primary') {
      newAssignments.forEach((assignment, i) => {
        if (i !== index) {
          assignment.is_primary = false;
        }
      });
      newAssignments[index].is_primary = true;
    }

    setValue('staff_assignments', newAssignments);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Appointment Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Details</h3>

        {/* Patient and Appointment Type Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="patient_id" className="block text-sm font-medium text-gray-700 mb-1">
              Patient *
            </label>
            <PatientCombobox
              patients={patients}
              selectedPatient={patients.find(p => p.id === watch('patient_id')) || null}
              onPatientSelect={(patient) => {
                setValue('patient_id', patient?.id || '');
                trigger('patient_id');
              }}
              placeholder="Search patients by name..."
              error={errors.patient_id?.message}
            />
          </div>

          <div>
            <label htmlFor="appointment_type" className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Type *
            </label>
            <select
              {...register('appointment_type')}
              id="appointment_type"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.appointment_type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {APPOINTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.appointment_type && (
              <p className="mt-1 text-sm text-red-600">{errors.appointment_type.message}</p>
            )}
          </div>
        </div>

        {/* Appointment Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="appointment_date" className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Date *
            </label>
            <input
              {...register('appointment_date')}
              type="date"
              id="appointment_date"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.appointment_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.appointment_date && (
              <p className="mt-1 text-sm text-red-600">{errors.appointment_date.message}</p>
            )}
          </div>
        </div>

        {/* Start Time and End Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <label htmlFor="start_time" className="block text-sm font-medium text-blue-800 mb-2">
              Start Time *
            </label>
            <TimePicker
              value={watch('start_time') || '09:00'}
              onChange={(time) => {
                setValue('start_time', time, { shouldValidate: true });
                calculateDuration();
              }}
              disabled={isSubmitting}
              className={errors.start_time ? 'border-red-500' : ''}
            />
            {errors.start_time && (
              <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <label htmlFor="end_time" className="block text-sm font-medium text-green-800 mb-2">
              End Time *
            </label>
            <TimePicker
              value={watch('end_time') || '10:00'}
              onChange={(time) => {
                setValue('end_time', time, { shouldValidate: true });
                calculateDuration();
              }}
              disabled={isSubmitting}
              className={errors.end_time ? 'border-red-500' : ''}
            />
            {errors.end_time && (
              <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
            )}
          </div>
        </div>

        {/* Duration and Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <input
              {...register('duration_minutes', {
                valueAsNumber: true,
                onChange: (e) => {
                  const duration = parseInt(e.target.value) || 0;
                  // Round to nearest 15-minute interval
                  const roundedDuration = Math.round(duration / 15) * 15;
                  if (roundedDuration !== duration) {
                    e.target.value = roundedDuration.toString();
                  }
                  updateEndTimeFromDuration(roundedDuration);
                }
              })}
              type="number"
              id="duration_minutes"
              min="15"
              max="1440"
              step="15"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.duration_minutes ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">Editable in 15-minute intervals. Changes end time.</p>
            {errors.duration_minutes && (
              <p className="mt-1 text-sm text-red-600">{errors.duration_minutes.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              {...register('status')}
              id="status"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium ${
                errors.status ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Transportation */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transportation</h3>

        {/* Transportation Mode Selection */}
        {isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED') && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-blue-800 mb-3">
              Transportation Mode
            </label>
            <div className="space-y-3">
              {TRANSPORTATION_MODE_OPTIONS.map((mode) => (
                <label key={mode.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="transportation_mode"
                    value={mode.value}
                    checked={transportationMode === mode.value}
                    onChange={(e) => setTransportationMode(e.target.value as 'simple' | 'segments')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{mode.label}</div>
                    <div className="text-xs text-gray-600">{mode.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Simple Mode Transportation */}
        {transportationMode === 'simple' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="transportation_type" className="block text-sm font-medium text-gray-700 mb-1">
                Transportation Type
              </label>
              <select
                {...register('transportation_type')}
                id="transportation_type"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.transportation_type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select transportation type</option>
                {TRANSPORTATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.transportation_type && (
                <p className="mt-1 text-sm text-red-600">{errors.transportation_type.message}</p>
              )}
            </div>

            {watchedTransportationType === 'driver' && (
              <div>
                <label htmlFor="driver_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Driver *
                </label>
                <select
                  {...register('driver_id')}
                  id="driver_id"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.driver_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name} - {driver.phone}
                    </option>
                  ))}
                </select>
                {errors.driver_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.driver_id.message}</p>
                )}
              </div>
            )}

            {watchedTransportationType === 'self_transport' && (
              <div>
                <label htmlFor="transportation_method" className="block text-sm font-medium text-gray-700 mb-1">
                  Transportation Method *
                </label>
                <select
                  {...register('transportation_method')}
                  id="transportation_method"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.transportation_method ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select transportation method</option>
                  {TRANSPORTATION_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                {errors.transportation_method && (
                  <p className="mt-1 text-sm text-red-600">{errors.transportation_method.message}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Segment Mode Transportation */}
        {transportationMode === 'segments' && isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED') && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Transportation Segments</h4>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const newSegmentId = `temp-${Date.now()}`;
                    const newSegment: Partial<TransportationSegment> = {
                      id: newSegmentId,
                      appointment_id: appointment?.id || '',
                      segment_type: 'pickup',
                      title: '',
                      status: 'draft',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };
                    setTransportationSegmentsData([...transportationSegmentsData, newSegment as TransportationSegment]);
                    setTravelEstimateState(prev => ({
                      ...prev,
                      [newSegmentId]: {
                        status: 'idle',
                        message: 'Add pickup and patient locations to calculate travel estimate.',
                      },
                    }));
                    setSegmentsError(null);
                  }}
                  className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                  disabled={segmentsLoading}
                >
                  Add Pickup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newSegmentId = `temp-${Date.now()}`;
                    const newSegment: Partial<TransportationSegment> = {
                      id: newSegmentId,
                      appointment_id: appointment?.id || '',
                      segment_type: 'dropoff',
                      title: '',
                      status: 'draft',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };
                    setTransportationSegmentsData([...transportationSegmentsData, newSegment as TransportationSegment]);
                    setTravelEstimateState(prev => ({
                      ...prev,
                      [newSegmentId]: {
                        status: 'idle',
                        message: 'Add pickup and patient locations to calculate travel estimate.',
                      },
                    }));
                    setSegmentsError(null);
                  }}
                  className="px-3 py-1 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
                  disabled={segmentsLoading}
                >
                  Add Drop-off
                </button>
              </div>
            </div>

            {/* Error Display */}
            {segmentsError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-red-500">⚠️</span>
                  <span className="text-sm text-red-700">{segmentsError}</span>
                  <button
                    type="button"
                    onClick={() => setSegmentsError(null)}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {segmentsLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-700">Processing segments...</span>
                </div>
              </div>
            )}

            {transportationSegmentsData.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-sm mb-2">No transportation segments added yet.</p>
                <p className="text-gray-400 text-xs">Click "Add Pickup" or "Add Drop-off" to create segments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transportationSegmentsData.map((segment, index) => {
                  const travelState: TravelEstimateStateEntry = travelEstimateState[segment.id] ?? { status: 'idle' };
                  const warning = segmentWarnings[segment.id];
                  const lastCalculatedAt = travelState.lastCalculatedAt;
                  const isTravelLoading = travelState.status === 'loading';
                  const hasCoordinates =
                    segment.pickup_location?.lat !== undefined &&
                    segment.pickup_location?.lng !== undefined &&
                    segment.patient_location?.lat !== undefined &&
                    segment.patient_location?.lng !== undefined;
                  const isCoolingDown = !!lastCalculatedAt && now - lastCalculatedAt < TRAVEL_ESTIMATE_COOLDOWN_MS;
                  const cooldownRemaining = isCoolingDown
                    ? Math.ceil((TRAVEL_ESTIMATE_COOLDOWN_MS - (now - lastCalculatedAt)) / 1000)
                    : 0;
                  const travelButtonDisabled = !hasCoordinates || isTravelLoading || isCoolingDown;

                  return (
                  <div key={segment.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          segment.segment_type === 'pickup' ? 'bg-blue-500' :
                          segment.segment_type === 'dropoff' ? 'bg-green-500' :
                          segment.segment_type === 'stay_with_staff' ? 'bg-purple-500' :
                          segment.segment_type === 'metro_assist' ? 'bg-orange-500' :
                          'bg-gray-500'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-900">
                          {TRANSPORTATION_SEGMENT_TYPES.find(t => t.value === segment.segment_type)?.label}
                        </span>
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTransportationSegmentsData(prev => prev.filter(item => item.id !== segment.id));
                          setTravelEstimateState(prev => {
                            if (!(segment.id in prev)) {
                              return prev;
                            }
                            const { [segment.id]: _removed, ...rest } = prev;
                            return rest;
                          });
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Segment Type *
                        </label>
                        <select
                          value={segment.segment_type}
                          onChange={(e) => {
                            updateSegmentData(segment.id, { segment_type: e.target.value as TransportationSegmentType });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {TRANSPORTATION_SEGMENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                          <div className="flex items-center space-x-1 text-sm text-gray-700">
                            <Clock className="w-3 h-3" />
                            <span>
                              {segment.estimated_travel_minutes != null
                                ? `${segment.estimated_travel_minutes} min`
                                : 'No travel estimate'}
                            </span>
                            {segment.estimated_distance_km != null && (
                              <span className="text-xs text-gray-500">
                                ({segment.estimated_distance_km} km)
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRecalculateTravel(segment)}
                            disabled={travelButtonDisabled}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                            title={
                              hasCoordinates
                                ? isCoolingDown
                                  ? `Please wait ${cooldownRemaining}s before recalculating.`
                                  : 'Recalculate travel estimate'
                                : 'Add pickup and patient locations to enable travel estimate'
                            }
                          >
                            {isTravelLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            <span className="ml-1">
                              {isTravelLoading ? 'Calculating…' : segment.estimated_travel_minutes != null ? 'Recalculate' : 'Calculate'}
                            </span>
                          </button>

                          {!hasCoordinates && (
                            <span className="text-xs text-gray-500">
                              Add pickup and patient locations to enable travel estimate.
                            </span>
                          )}

                          {isCoolingDown && hasCoordinates && !isTravelLoading && (
                            <span className="text-xs text-orange-600">Retry in {cooldownRemaining}s</span>
                          )}

                          {travelState.status === 'error' && travelState.message && (
                            <span className="text-xs text-red-600">{travelState.message}</span>
                          )}

                          {travelState.status === 'success' && travelState.message && (
                            <span className="text-xs text-green-600">{travelState.message}</span>
                          )}

                          {travelState.status === 'idle' && travelState.message && (
                            <span className="text-xs text-gray-500">{travelState.message}</span>
                          )}
                        </div>
                      </div>

                      {warning && (
                        <div className="md:col-span-2 flex flex-wrap items-start gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
                          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                          <div className="flex-1 space-y-1 text-xs text-orange-700">
                            {warning.messages.map((message, messageIndex) => (
                              <p key={messageIndex}>{message}</p>
                            ))}
                            {!segment.manual_override ? (
                              <p className="italic">Mark a manual override or adjust timings/buffers before proceeding.</p>
                            ) : (
                              <p className="italic text-orange-600">Manual override recorded for this segment.</p>
                            )}
                          </div>
                          {!segment.manual_override && (
                            <button
                              type="button"
                              onClick={() => updateSegmentData(segment.id, { manual_override: true })}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 border border-orange-300 rounded-md hover:bg-orange-100"
                            >
                              Mark override
                            </button>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Driver
                        </label>
                        <select
                          value={segment.driver_id || ''}
                          onChange={(e) => {
                            updateSegmentData(segment.id, { driver_id: e.target.value || null });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select a driver</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.first_name} {driver.last_name} - {driver.phone}
                            </option>
                          ))}
                        </select>

                        {/* Driver Availability Indicator */}
                        {segment.driver_id && segment.planned_start && segment.planned_end && (
                          <div className="mt-2">
                            <DriverAvailabilityIndicator
                              driverId={segment.driver_id}
                              segment={segment}
                              allSegments={transportationSegmentsData}
                              drivers={drivers}
                              onOverrideConfirm={(overrideSegment) => {
                                updateSegmentData(overrideSegment.id, {
                                  ...overrideSegment,
                                  manual_override: true,
                                });
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={segment.planned_start ? segment.planned_start.split('T')[1].substring(0, 5) : ''}
                          onChange={(e) => {
                            const appointmentDate = watch('appointment_date');
                            const startDateTime = appointmentDate ? `${appointmentDate}T${e.target.value}:00` : '';
                            updateSegmentData(segment.id, { planned_start: startDateTime }, { resetEstimate: true });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={segment.planned_end ? segment.planned_end.split('T')[1].substring(0, 5) : ''}
                          onChange={(e) => {
                            const appointmentDate = watch('appointment_date');
                            const endDateTime = appointmentDate ? `${appointmentDate}T${e.target.value}:00` : '';
                            updateSegmentData(segment.id, { planned_end: endDateTime }, { resetEstimate: true });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <PickupLocationSelector
                          pickupLocationType={segment.pickup_location_type || 'office'}
                          pickupLocationReference={segment.pickup_location_reference}
                          pickupLocation={segment.pickup_location}
                          onTypeChange={(type: PickupLocationType) => {
                            updateSegmentData(segment.id, {
                              pickup_location_type: type,
                              pickup_location_reference: null,
                              pickup_location: null
                            }, { resetEstimate: true });
                          }}
                          onLocationChange={(location: TransportationSegmentLocation | null) => {
                            updateSegmentData(segment.id, {
                              pickup_location: location
                            }, { resetEstimate: true });
                          }}
                          onReferenceChange={(reference: string | null) => {
                            updateSegmentData(segment.id, {
                              pickup_location_reference: reference
                            }, { resetEstimate: true });
                          }}
                          appointments={[]} // TODO: Pass actual appointments
                          currentAppointmentId={appointment?.id}
                          disabled={segmentsLoading}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Patient Location
                        </label>
                      <PlacesAutocomplete
                        value={segment.patient_location?.address || ''}
                        onChange={(value) => {
                          updateSegmentData(
                            segment.id,
                            {
                              patient_location: {
                                ...(segment.patient_location || {}),
                                address: value,
                              } as TransportationSegmentLocation,
                            },
                            { resetEstimate: true },
                          );
                        }}
                        onPlaceSelect={(place: PlaceResult) => {
                          updateSegmentData(
                            segment.id,
                            {
                              patient_location: {
                                lat: place.geometry.location.lat,
                                lng: place.geometry.location.lng,
                                address: place.formatted_address,
                                landmark: place.name,
                              },
                            },
                            { resetEstimate: true },
                          );
                        }}
                          placeholder="Search for patient location..."
                          className="w-full"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Instructions
                        </label>
                        <textarea
                          value={segment.instructions || ''}
                          onChange={(e) => {
                            updateSegmentData(segment.id, { instructions: e.target.value });
                          }}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Segment-specific instructions..."
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={segment.requires_follow_up || false}
                              onChange={(e) => {
                                updateSegmentData(segment.id, { requires_follow_up: e.target.checked });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Requires follow-up</span>
                          </label>

                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={segment.manual_override || false}
                              onChange={(e) => {
                                updateSegmentData(segment.id, { manual_override: e.target.checked });
                              }}
                              className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-700">Manual override</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Staff Assignments */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Staff Assignments</h3>
          <button
            type="button"
            onClick={addStaffAssignment}
            className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            Add Staff
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="text-gray-500 text-sm">No staff assigned yet. Click "Add Staff" to assign staff members.</p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Staff Member *
                    </label>
                    <select
                      {...register(`staff_assignments.${index}.staff_id`)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.staff_assignments?.[index]?.staff_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select staff member</option>
                      {filteredStaff.map((staffMember) => (
                        <option key={staffMember.id} value={staffMember.id}>
                          {staffMember.first_name} {staffMember.last_name} ({staffMember.staff_type})
                        </option>
                      ))}
                    </select>
                    {errors.staff_assignments?.[index]?.staff_id && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.staff_assignments[index]?.staff_id?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      {...register(`staff_assignments.${index}.role`)}
                      onChange={(e) => handleStaffRoleChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {STAFF_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        {...register(`staff_assignments.${index}.is_primary`)}
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Primary</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeStaffAssignment(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recurring Options */}
      <RecurrenceRuleBuilder
        value={stableRecurringRule}
        onChange={(rule) => setValue('recurring_rule', rule)}
        baseDate={watch('appointment_date') || new Date().toISOString().split('T')[0]}
        disabled={isLoading}
      />

      {/* Notes and Instructions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes and Instructions</h3>

        <div className="space-y-6">
          {/* Mini Notes */}
          <div>
            <label htmlFor="mini_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Brief Notes <span className="text-gray-500">(for schedule views)</span>
            </label>
            <textarea
              {...register('mini_notes')}
              id="mini_notes"
              rows={2}
              maxLength={500}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.mini_notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Brief summary for quick reference (e.g., 'Mounjaro 2.5mg', 'Blood work - fasting required')"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.mini_notes && (
                <p className="text-sm text-red-600">{errors.mini_notes.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('mini_notes')?.length || 0}/500 characters
              </p>
            </div>
          </div>

          {/* Full Notes */}
          <div>
            <label htmlFor="full_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Detailed Notes <span className="text-gray-500">(for 1-hour reminders)</span>
            </label>
            <textarea
              {...register('full_notes')}
              id="full_notes"
              rows={4}
              maxLength={2000}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.full_notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Detailed notes for comprehensive reminders (e.g., 'Patient requires special attention due to diabetes. Check blood sugar levels before treatment. Bring insulin supplies.')"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.full_notes && (
                <p className="text-sm text-red-600">{errors.full_notes.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('full_notes')?.length || 0}/2000 characters
              </p>
            </div>
          </div>

          {/* Pickup Instructions */}
          <div>
            <label htmlFor="pickup_instructions" className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Instructions <span className="text-gray-500">(for drivers)</span>
            </label>
            <textarea
              {...register('pickup_instructions')}
              id="pickup_instructions"
              rows={3}
              maxLength={1000}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.pickup_instructions ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Special pickup instructions for drivers (e.g., 'Patient is wheelchair-bound. Use accessible vehicle. Ring doorbell twice. Patient's son will assist.')"
            />
            <div className="flex justify-between items-center mt-1">
              {errors.pickup_instructions && (
                <p className="text-sm text-red-600">{errors.pickup_instructions.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('pickup_instructions')?.length || 0}/1000 characters
              </p>
            </div>
          </div>

          {/* Legacy Notes Field */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              General Notes <span className="text-gray-500">(legacy field)</span>
            </label>
            <textarea
              {...register('notes')}
              id="notes"
              rows={3}
              maxLength={1000}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="General appointment notes (use specific fields above when possible)..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.notes && (
                <p className="text-sm text-red-600">{errors.notes.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('notes')?.length || 0}/1000 characters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting || isLoading ? 'Saving...' : appointment ? 'Update Appointment' : 'Create Appointment'}
        </button>
      </div>
    </form>
  );
}
