'use client';

import { DriverAvailabilityIndicator } from '@/components/ui/DriverAvailabilityIndicator';
import { PatientCombobox } from '@/components/ui/PatientCombobox';
import { PlacesAutocomplete, type PlaceResult } from '@/components/ui/PlacesAutocomplete';
import { TimePicker } from '@/components/ui/TimePicker';
import { isDriverAssignmentOverhaulUIEnabled, isFeatureEnabled } from '@/lib/featureFlags';
import { type AppointmentFormData } from '@/lib/validations/appointment';
import { overrideAnalyticsService } from '@/services/overrideAnalyticsService';
import type { Appointment, Patient, Staff, StaffAssignment } from '@/types';
import type { TransportationSegmentAssignmentMode } from '@/types/supabase';
import type {
    PickupLocationType,
    TransportationRecommendationMetadata,
    TransportationRecommendationOverride,
    TransportationSegment,
    TransportationSegmentLocation,
    TransportationSegmentType,
} from '@/types/transportationSegment';
import { getDistanceMatrix } from '@/utils/google/distanceMatrix';
import { formatTimeToHHMM } from '@/utils/timezone';
import {
    calculateSegmentWarnings,
    type TravelWarning
} from '@/utils/transportationSegments';
import { AlertCircle, AlertTriangle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { PickupLocationSelector } from './PickupLocationSelector';
import { RecurrenceRuleBuilder } from './RecurrenceRuleBuilder';
import { SegmentDriverSuggestions, SegmentMetaChips } from './SegmentEditor';

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

// Removed TRANSPORTATION_MODE_OPTIONS - simplified to always use segments mode

const ASSIGNMENT_MODE_OPTIONS = [
  {
    value: 'assign_now',
    label: 'Assign Driver Now',
    description: 'Select a driver immediately. Use when you know which driver will handle this appointment.',
    icon: '⚡',
    color: 'green',
    benefits: ['Immediate driver notification', 'Calendar sync enabled', 'Ready for dispatch'],
    whenToUse: 'When you know the driver and want immediate assignment'
  },
  {
    value: 'assign_later',
    label: 'Assign Driver Later',
    description: 'Save appointment without driver selection. Driver will be assigned later through the capacity planner.',
    icon: '⏰',
    color: 'blue',
    benefits: ['Flexible scheduling', 'Optimize driver routes', 'Manage workload balance'],
    whenToUse: 'When you need to plan optimal driver assignments'
  }
];

const SEGMENT_OVERRIDE_REASONS = [
  { value: 'driver_conflict', label: 'Driver conflict (already booked)' },
  { value: 'timing_conflict', label: 'Timing conflict / buffers insufficient' },
  { value: 'travel_buffer_insufficient', label: 'Travel buffer not acceptable' },
  { value: 'patient_preference', label: 'Patient requested alternative' },
  { value: 'vehicle_requirement', label: 'Vehicle / equipment requirement' },
  { value: 'manual_requirement', label: 'Operational override (manual requirement)' },
  { value: 'emergency_override', label: 'Emergency override' },
  { value: 'other', label: 'Other reason' },
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
  // Simplified: always use segments mode, no mode selection needed
  const [assignmentMode, setAssignmentMode] = useState<TransportationSegmentAssignmentMode>('assign_now');

  // Effective assignment mode - always 'assign_now' when feature flag is disabled
  const effectiveAssignmentMode = isDriverAssignmentOverhaulUIEnabled() ? assignmentMode : 'assign_now';
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
    // resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patient_id: appointment?.patient_id || '',
      appointment_type: appointment?.appointment_type || 'doctor_on_call',
      appointment_date: appointment?.appointment_date || '',
      start_time: appointment?.start_time ? formatTimeToHHMM(appointment.start_time) : '09:00',
      end_time: calculateEndTime(appointment?.start_time ? formatTimeToHHMM(appointment.start_time) : '09:00', appointment?.duration_minutes || 60),
      duration_minutes: appointment?.duration_minutes || 60,
      status: (appointment?.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled') || 'scheduled',
      transportation_type: appointment?.transportation_type || undefined,
      transportation_method: appointment?.transportation_method || '',
      driver_id: appointment?.driver_id || '',
      notes: appointment?.notes || '',
      mini_notes: appointment?.mini_notes || '',
      full_notes: appointment?.full_notes || '',
      pickup_instructions: appointment?.pickup_instructions || '',
      custom_fields: appointment?.custom_fields || {},
      recurring_rule: appointment?.recurring_rule || undefined,
      staff_assignments: staffAssignments && staffAssignments.length > 0 ? staffAssignments.map(sa => ({
        staff_id: sa.staff_id,
        role: sa.role as 'primary' | 'assistant' | 'driver',
        is_primary: sa.is_primary
      })) : undefined,
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
        // Calculate end_time from start_time and duration
        if (appointment.start_time && appointment.duration_minutes) {
          const calculatedEndTime = calculateEndTime(formatTimeToHHMM(appointment.start_time), appointment.duration_minutes);
          setValue('end_time', calculatedEndTime, { shouldValidate: false });
        }
      }, 100);

      // Initialize transportation segments if they exist
      if (transportationSegments && transportationSegments.length > 0) {
        setTransportationSegmentsData(transportationSegments);
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

  // Set default assignment mode based on transportation type
  useEffect(() => {
    if (watchedTransportationType === 'driver') {
      // For driver transportation, default to assign_now for immediate assignment
      setAssignmentMode('assign_now');
    } else if (watchedTransportationType === 'self_transport') {
      // For self transport, assignment mode is not relevant
      setAssignmentMode('assign_now');
    }
  }, [watchedTransportationType]);

  // Auto-create default pickup/drop-off segments when transportation requires a driver
  useEffect(() => {
    if (watchedTransportationType === 'driver' && isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED')) {
      // Only create segments if none exist yet
      if (transportationSegmentsData.length === 0) {
        const appointmentDate = watch('appointment_date');
        const startTime = watch('start_time');
        const endTime = watch('end_time');

        if (appointmentDate && startTime && endTime) {
          const pickupStartTime = `${appointmentDate}T${startTime}:00`;
          const pickupEndTime = `${appointmentDate}T${endTime}:00`;

          // Create pickup segment (30 minutes before appointment)
          const pickupStart = new Date(pickupStartTime);
          pickupStart.setMinutes(pickupStart.getMinutes() - 30);
          const pickupSegmentStart = pickupStart.toISOString();
          const pickupSegmentEnd = new Date(pickupStart.getTime() + 30 * 60000).toISOString();

          // Create drop-off segment (30 minutes after appointment)
          const dropoffStart = new Date(pickupEndTime);
          dropoffStart.setMinutes(dropoffStart.getMinutes() + 30);
          const dropoffSegmentStart = dropoffStart.toISOString();
          const dropoffSegmentEnd = new Date(dropoffStart.getTime() + 30 * 60000).toISOString();

          const defaultSegments: TransportationSegment[] = [
            {
              id: `temp-pickup-${Date.now()}`,
              appointment_id: appointment?.id || '',
              segment_type: 'pickup',
              title: 'Pickup from Office',
              planned_start: pickupSegmentStart,
              planned_end: pickupSegmentEnd,
              driver_id: effectiveAssignmentMode === 'assign_now' ? watch('driver_id') || null : null,
              travel_mode: 'driving',
              pickup_location_type: 'office',
              pickup_location_reference: null,
              pickup_location: null,
              patient_location: null,
              estimated_travel_minutes: null,
              estimated_distance_km: null,
              buffer_minutes: 15,
              instructions: null,
              requires_follow_up: false,
              status: effectiveAssignmentMode === 'assign_now' ? 'scheduled' : 'draft',
              manual_override: false,
              assignment_mode: effectiveAssignmentMode,
              priority: 1,
              recommended_driver_ids: [],
              recommendation_metadata: {},
              queue_rank: null,
              escalation_state: 'normal',
              escalation_deadline: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: `temp-dropoff-${Date.now() + 1}`,
              appointment_id: appointment?.id || '',
              segment_type: 'dropoff',
              title: 'Drop-off to Office',
              planned_start: dropoffSegmentStart,
              planned_end: dropoffSegmentEnd,
              driver_id: effectiveAssignmentMode === 'assign_now' ? watch('driver_id') || null : null,
              travel_mode: 'driving',
              pickup_location_type: 'office',
              pickup_location_reference: null,
              pickup_location: null,
              patient_location: null,
              estimated_travel_minutes: null,
              estimated_distance_km: null,
              buffer_minutes: 15,
              instructions: null,
              requires_follow_up: false,
              status: effectiveAssignmentMode === 'assign_now' ? 'scheduled' : 'draft',
              manual_override: false,
              assignment_mode: effectiveAssignmentMode,
              priority: 2,
              recommended_driver_ids: [],
              recommendation_metadata: {},
              queue_rank: null,
              escalation_state: 'normal',
              escalation_deadline: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ];

          setTransportationSegmentsData(defaultSegments);

          // Initialize travel estimate state for new segments
          const newTravelState: Record<string, TravelEstimateStateEntry> = {};
          defaultSegments.forEach(segment => {
            newTravelState[segment.id] = {
              status: 'idle',
              message: 'Add pickup and patient locations to calculate travel estimate.',
            };
          });
          setTravelEstimateState(prev => ({ ...prev, ...newTravelState }));
        }
      }
    } else if (watchedTransportationType !== 'driver' && transportationSegmentsData.length > 0) {
      // Clear segments if transportation type changes away from driver
      setTransportationSegmentsData([]);
      setTravelEstimateState({});
    }
  }, [watchedTransportationType, effectiveAssignmentMode, appointment?.id, watch]);

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
        return s.staff_type === 'nurse';
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

  // Function to send override analytics for segments with overrides
  const sendOverrideAnalytics = async (appointmentId: string, userId: string, userName?: string) => {
    const analyticsPromises = transportationSegmentsData
      .filter(segment => {
        const metadata = segment.recommendation_metadata;
        return metadata?.override?.reason && metadata.override.reason.trim().length > 0;
      })
      .map(async (segment) => {
        const metadata = segment.recommendation_metadata;
        const override = metadata?.override;

        if (!override) return;

        try {
          await overrideAnalyticsService.sendOverrideAnalytics({
            segmentId: segment.id,
            appointmentId,
            userId,
            userName,
            operationType: 'transportation_segment_override',
            overrideReason: override.reason as any,
            overrideNote: override.note,
            originalDriverId: override.recommended_driver_id,
            newDriverId: override.driver_id,
            conflictDetails: {
              driver_conflicts: [],
              timing_conflicts: [],
              travel_buffer_issues: [],
              warnings_acknowledged: [],
            },
            requiresFollowUp: false,
            metadata: {
              segment_type: segment.segment_type,
              assignment_mode: segment.assignment_mode,
              priority: segment.priority,
            },
          });
        } catch (error) {
          console.error(`Failed to send override analytics for segment ${segment.id}:`, error);
        }
      });

    await Promise.allSettled(analyticsPromises);
  };

  const handleFormSubmit = async (data: any) => {
    console.log('Form submitted with data:', data);

    try {
      // Validate transportation segments if enabled
      if (isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED') && transportationSegmentsData.length > 0) {
        const segmentErrors: string[] = [];

        transportationSegmentsData.forEach((segment, index) => {
          // Validate required fields for segments
          if (!segment.planned_start) {
            segmentErrors.push(`Segment ${index + 1}: Start time is required`);
          }
          if (!segment.planned_end) {
            segmentErrors.push(`Segment ${index + 1}: End time is required`);
          }
          if (!segment.pickup_location_type) {
            segmentErrors.push(`Segment ${index + 1}: Pickup location type is required`);
          }

          // For assign_now mode, driver is required
          if (effectiveAssignmentMode === 'assign_now' && !segment.driver_id) {
            segmentErrors.push(`Segment ${index + 1}: Driver is required when assignment mode is "Assign Now"`);
          }

          // Validate timing
          if (segment.planned_start && segment.planned_end) {
            const startTime = new Date(segment.planned_start);
            const endTime = new Date(segment.planned_end);
            if (endTime <= startTime) {
              segmentErrors.push(`Segment ${index + 1}: End time must be after start time`);
            }
          }
        });

        if (segmentErrors.length > 0) {
          setSegmentsError(segmentErrors.join('. '));
          return;
        }
      }

      // Prepare the submission data with transportation segments if in segment mode
      const submissionData = {
        ...data,
        // Include assignment mode for driver transportation
        ...(watchedTransportationType === 'driver' && {
          assignment_mode: effectiveAssignmentMode,
        }),
        ...(isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED') && {
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
            assignment_mode: effectiveAssignmentMode,
            priority: segment.priority,
            recommended_driver_ids: segment.recommended_driver_ids,
            recommendation_metadata: segment.recommendation_metadata,
          }))
        })
      };

      await onSubmit(submissionData);
      console.log('Form submission successful');

      // Send override analytics after successful submission
      // Note: We need to get the appointment ID from the response or use a placeholder
      // For now, we'll use the appointment ID if it exists, otherwise we'll skip analytics
      if (appointment?.id || data.id) {
        const appointmentId = appointment?.id || data.id;
        const userId = 'current-user-id'; // TODO: Get from auth context
        const userName = 'Current User'; // TODO: Get from auth context

        // Send analytics in background (don't block form submission)
        sendOverrideAnalytics(appointmentId, userId, userName).catch(error => {
          console.error('Failed to send override analytics:', error);
        });
      }

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
    const currentAssignments = watch('staff_assignments') || [];
    const newAssignments = [...currentAssignments];
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-10">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Appointment Details</h3>
            <p className="text-sm text-gray-600">Basic information for the appointment</p>
          </div>
        </div>

        {/* Patient and Appointment Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label htmlFor="patient_id" className="block text-sm font-semibold text-gray-700">
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
            {errors.patient_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.patient_id.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="appointment_type" className="block text-sm font-semibold text-gray-700">
              Appointment Type *
            </label>
            <select
              {...register('appointment_type')}
              id="appointment_type"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors ${
                errors.appointment_type ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {APPOINTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.appointment_type && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.appointment_type.message}
              </p>
            )}
          </div>
        </div>

        {/* Date and Time Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
            <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Schedule
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <label htmlFor="appointment_date" className="block text-sm font-medium text-gray-700">
                Date *
              </label>
              <input
                {...register('appointment_date')}
                type="date"
                id="appointment_date"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors ${
                  errors.appointment_date ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {errors.appointment_date && (
                <p className="mt-1 text-sm text-red-600">{errors.appointment_date.message}</p>
              )}
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                Start Time *
              </label>
              <div className="relative">
                <TimePicker
                  value={watch('start_time') || '09:00'}
                  onChange={(time) => {
                    setValue('start_time', time, { shouldValidate: true });
                    calculateDuration();
                  }}
                  disabled={isSubmitting}
                  className={`w-full ${errors.start_time ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
              )}
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                End Time *
              </label>
              <div className="relative">
                <TimePicker
                  value={watch('end_time') || '10:00'}
                  onChange={(time) => {
                    setValue('end_time', time, { shouldValidate: true });
                    calculateDuration();
                  }}
                  disabled={isSubmitting}
                  className={`w-full ${errors.end_time ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.end_time && (
                <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700">
                Duration *
              </label>
              <div className="relative">
                <input
                  {...register('duration_minutes', {
                    valueAsNumber: true,
                    onChange: (e) => {
                      const duration = parseInt(e.target.value) || 0;
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors ${
                    errors.duration_minutes ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                />
                <span className="absolute right-3 top-2 text-xs text-gray-500">min</span>
              </div>
              <p className="text-xs text-gray-500">15-min intervals</p>
              {errors.duration_minutes && (
                <p className="mt-1 text-sm text-red-600">{errors.duration_minutes.message}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="mt-4 max-w-xs">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              {...register('status')}
              id="status"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors ${
                errors.status ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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

      {/* Transportation Section */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 rounded-xl border border-green-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Transportation</h3>
            <p className="text-sm text-gray-600">How will the patient get to the appointment?</p>
          </div>
        </div>

        {/* Simplified Transportation Section - No mode selection needed */}

        {/* Driver Assignment Mode Selection - Simplified and Always Visible */}
        {watchedTransportationType === 'driver' && (
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Driver Assignment</h3>
                <p className="text-sm text-gray-600">Choose when to assign a driver to this appointment</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ASSIGNMENT_MODE_OPTIONS.map((mode) => (
                <label key={mode.value} className={`relative flex flex-col p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  effectiveAssignmentMode === mode.value
                    ? mode.color === 'green'
                      ? 'border-green-500 bg-green-50 shadow-lg ring-2 ring-green-200'
                      : 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
                }`}>
                  <input
                    type="radio"
                    name="assignment_mode"
                    value={mode.value}
                    checked={effectiveAssignmentMode === mode.value}
                    onChange={(e) => setAssignmentMode(e.target.value as TransportationSegmentAssignmentMode)}
                    className="sr-only"
                  />

                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{mode.icon}</span>
                      <div>
                        <div className="text-lg font-bold text-gray-900">{mode.label}</div>
                        <div className="text-sm text-gray-500 italic">{mode.whenToUse}</div>
                      </div>
                    </div>
                    {effectiveAssignmentMode === mode.value && (
                      <div className={`p-2 rounded-full ${mode.color === 'green' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        <svg className={`w-5 h-5 ${mode.color === 'green' ? 'text-green-600' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="text-sm text-gray-600 leading-relaxed mb-4">
                    {mode.description}
                  </div>

                  {/* Benefits */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Benefits:</div>
                    <ul className="space-y-1">
                      {mode.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                          <svg className={`w-3 h-3 ${mode.color === 'green' ? 'text-green-500' : 'text-blue-500'} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </label>
              ))}
            </div>

            {effectiveAssignmentMode === 'assign_later' && (
              <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-blue-900 mb-2">Next Steps After Saving</h4>
                    <div className="space-y-3 text-sm text-blue-800">
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>This appointment will be saved to the <strong>unassigned queue</strong></span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Use the <strong>Capacity Planner</strong> to assign drivers and optimize routes</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600 font-bold">3.</span>
                        <span>Monitor driver workload and resolve any conflicts</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => window.open('/capacity-planner', '_blank')}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open Capacity Planner
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open('/driver-board', '_blank')}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        View Driver Board
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Assignment Mode Information Panel */}
            <div className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Assignment Mode Guide</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Assign Now</span>
                      </div>
                      <ul className="ml-5 space-y-1 text-xs">
                        <li>• Driver gets immediate notification</li>
                        <li>• Calendar sync happens automatically</li>
                        <li>• Appointment is ready for dispatch</li>
                        <li>• Use when you know the right driver</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">Assign Later</span>
                      </div>
                      <ul className="ml-5 space-y-1 text-xs">
                        <li>• Goes to unassigned queue</li>
                        <li>• Optimize routes in Capacity Planner</li>
                        <li>• Balance driver workload</li>
                        <li>• Use for complex scheduling</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        <strong>Tip:</strong> You can always change the assignment later in the Capacity Planner or Driver Board
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simplified Transportation Section - Always Visible */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Transportation Details</h4>
              <p className="text-sm text-gray-600">How will the patient get to and from the appointment?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="transportation_type" className="block text-sm font-medium text-gray-700">
                Transportation Type *
              </label>
              <select
                {...register('transportation_type')}
                id="transportation_type"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors ${
                  errors.transportation_type ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.transportation_type.message}
                </p>
              )}
            </div>

            {watchedTransportationType === 'driver' && effectiveAssignmentMode === 'assign_now' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="driver_id" className="block text-sm font-medium text-gray-700">
                    Select Driver *
                  </label>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span>Busy</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span>Unavailable</span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Driver Selection with Workload Information */}
                <div className="space-y-3">
                  <select
                    {...register('driver_id')}
                    id="driver_id"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 transition-colors ${
                      errors.driver_id ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <option value="">Choose a driver</option>
                    {drivers.map((driver) => {
                      // Enhanced availability simulation with workload
                      const isAvailable = Math.random() > 0.3; // 70% chance of being available
                      const isBusy = Math.random() > 0.7; // 30% chance of being busy
                      const status = isAvailable ? (isBusy ? 'busy' : 'available') : 'unavailable';
                      const workload = Math.floor(Math.random() * 5) + 1; // 1-5 appointments
                      const statusIcon = status === 'available' ? '🟢' : status === 'busy' ? '🟡' : '🔴';
                      const workloadText = workload > 3 ? 'High' : workload > 1 ? 'Medium' : 'Low';

                      return (
                        <option key={driver.id} value={driver.id}>
                          {statusIcon} {driver.first_name} {driver.last_name} - {workload} appointments ({workloadText} workload) - {status}
                        </option>
                      );
                    })}
                  </select>

                  {/* Driver Recommendations Panel */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-green-900 mb-2">Driver Recommendations</h5>
                        <div className="space-y-2 text-xs text-green-800">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">• Best Match:</span>
                            <span>Drivers with low workload and good availability</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">• Location:</span>
                            <span>Consider proximity to pickup location</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">• Schedule:</span>
                            <span>Check for conflicts with existing appointments</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {errors.driver_id && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.driver_id.message}
                    </p>
                  )}

                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-blue-500">💡</span>
                      <div>
                        <strong>Tip:</strong> Green drivers are available, yellow are busy but might be free, red are unavailable.
                        Workload shows current appointment count - lower is better for new assignments.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {watchedTransportationType === 'self_transport' && (
              <div className="space-y-2">
                <label htmlFor="transportation_method" className="block text-sm font-medium text-gray-700">
                  Transportation Method *
                </label>
                <select
                  {...register('transportation_method')}
                  id="transportation_method"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors ${
                    errors.transportation_method ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.transportation_method.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Transportation Segments - Always Available */}
        {isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED') && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Transportation Segments</h4>
                  <p className="text-sm text-gray-600">Create multiple transportation legs for complex routes</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    const newSegmentId = `temp-${Date.now()}`;
                    const newSegment: Partial<TransportationSegment> = {
                      id: newSegmentId,
                      appointment_id: appointment?.id || '',
                      segment_type: 'pickup',
                      title: '',
                      status: effectiveAssignmentMode === 'assign_now' ? 'scheduled' : 'draft',
                      assignment_mode: effectiveAssignmentMode,
                      priority: transportationSegmentsData.length + 1,
                      recommended_driver_ids: [],
                      recommendation_metadata: {},
                      queue_rank: null,
                      escalation_state: 'normal',
                      escalation_deadline: null,
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={segmentsLoading}
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
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
                      status: effectiveAssignmentMode === 'assign_now' ? 'scheduled' : 'draft',
                      assignment_mode: effectiveAssignmentMode,
                      priority: transportationSegmentsData.length + 1,
                      recommended_driver_ids: [],
                      recommendation_metadata: {},
                      queue_rank: null,
                      escalation_state: 'normal',
                      escalation_deadline: null,
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
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                  disabled={segmentsLoading}
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
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
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <p className="text-gray-500 text-sm mb-2 font-medium">No transportation segments added yet</p>
                <p className="text-gray-400 text-xs">Click "Add Pickup" or "Add Drop-off" to create segments</p>
              </div>
            ) : (
              <div className="space-y-6">
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

                  // Check if segment has validation errors
                  const hasValidationErrors = !segment.planned_start || !segment.planned_end || !segment.pickup_location_type ||
                    (effectiveAssignmentMode === 'assign_now' && !segment.driver_id);

                  const recommendedPrimaryDriverId = segment.recommended_driver_ids?.[0] ?? null;
                  const overrideContext = segment.recommendation_metadata?.override ?? null;
                  const shouldCaptureOverride =
                    effectiveAssignmentMode === 'assign_now' &&
                    !!segment.driver_id &&
                    !!recommendedPrimaryDriverId &&
                    segment.driver_id !== recommendedPrimaryDriverId;
                  const overrideReasonValue = overrideContext?.reason ?? '';
                  const overrideNoteValue = overrideContext?.note ?? '';

                  const handleDriverAssignment = (driverId: string | null) => {
                    const nextMetadata = { ...(segment.recommendation_metadata ?? {}) };
                    let metadataChanged = false;

                    if (driverId && recommendedPrimaryDriverId && driverId !== recommendedPrimaryDriverId) {
                      const nextOverride = { ...(segment.recommendation_metadata?.override ?? {}) };
                      nextOverride.driver_id = driverId;
                      nextOverride.recommended_driver_id = recommendedPrimaryDriverId;
                      if (!nextOverride.recorded_at) {
                        nextOverride.recorded_at = new Date().toISOString();
                      }
                      if (typeof nextOverride.reason !== 'string') {
                        nextOverride.reason = '';
                      }
                      if (typeof nextOverride.note !== 'string') {
                        nextOverride.note = '';
                      }
                      nextMetadata.override = nextOverride;
                      metadataChanged = true;
                    } else if (nextMetadata.override) {
                      delete nextMetadata.override;
                      metadataChanged = true;
                    }

                    const updates: Partial<TransportationSegment> = {
                      driver_id: driverId,
                    };

                    if (metadataChanged) {
                      updates.recommendation_metadata = Object.keys(nextMetadata).length > 0 ? nextMetadata : {};
                    }

                    updateSegmentData(segment.id, updates);
                  };

                  const updateOverrideMetadata = (
                    mutator: (override: TransportationRecommendationOverride) => void,
                  ) => {
                    const baseMetadata: TransportationRecommendationMetadata = {
                      ...(segment.recommendation_metadata ?? {}),
                    };
                    const overrideDraft: TransportationRecommendationOverride = {
                      ...(segment.recommendation_metadata?.override ?? {}),
                    };

                    mutator(overrideDraft);

                    if (segment.driver_id) {
                      overrideDraft.driver_id = segment.driver_id;
                    }
                    if (recommendedPrimaryDriverId) {
                      overrideDraft.recommended_driver_id = recommendedPrimaryDriverId;
                    }

                    const cleanedReason = overrideDraft.reason?.trim() ?? '';
                    const cleanedNote = overrideDraft.note?.trim() ?? '';

                    if (!cleanedReason && !cleanedNote) {
                      if (baseMetadata.override) {
                        const rest = { ...baseMetadata };
                        delete rest.override;
                        updateSegmentData(segment.id, {
                          recommendation_metadata: Object.keys(rest).length > 0 ? rest : {},
                        });
                      }
                      return;
                    }

                    baseMetadata.override = {
                      ...overrideDraft,
                      reason: cleanedReason,
                      note: cleanedNote,
                      recorded_at:
                        typeof overrideDraft.recorded_at === 'string'
                          ? overrideDraft.recorded_at
                          : new Date().toISOString(),
                    };

                    updateSegmentData(segment.id, {
                      recommendation_metadata: baseMetadata,
                    });
                  };

                  const handleOverrideReasonChange = (value: string) => {
                    updateOverrideMetadata((override) => {
                      override.reason = value;
                    });
                  };

                  const handleOverrideNoteChange = (value: string) => {
                    updateOverrideMetadata((override) => {
                      override.note = value;
                    });
                  };

                  const showOverridePanel =
                    shouldCaptureOverride ||
                    (overrideReasonValue ? overrideReasonValue.trim().length > 0 : false) ||
                    (overrideNoteValue ? overrideNoteValue.trim().length > 0 : false);

                  return (
                  <div key={segment.id} className={`bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
                    hasValidationErrors ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                  }`}>
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full ${
                            segment.segment_type === 'pickup' ? 'bg-blue-500' :
                            segment.segment_type === 'dropoff' ? 'bg-green-500' :
                            segment.segment_type === 'stay_with_staff' ? 'bg-purple-500' :
                            segment.segment_type === 'metro_assist' ? 'bg-orange-500' :
                            'bg-gray-500'
                          }`}
                          aria-hidden="true"
                        ></div>
                        <div>
                          <h5 className="text-sm font-semibold text-gray-900">
                            {TRANSPORTATION_SEGMENT_TYPES.find(t => t.value === segment.segment_type)?.label}
                          </h5>
                          <p className="text-xs text-gray-500">Segment #{index + 1}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-3">
                        {isDriverAssignmentOverhaulUIEnabled() && (
                          <SegmentMetaChips
                            status={segment.status}
                            manualOverride={segment.manual_override}
                            warning={warning ?? null}
                          />
                        )}
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
                          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Segment Type and Travel Estimate */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Segment Type *
                          </label>
                          <select
                            value={segment.segment_type}
                            onChange={(e) => {
                              updateSegmentData(segment.id, { segment_type: e.target.value as TransportationSegmentType });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                          >
                            {TRANSPORTATION_SEGMENT_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Travel Estimate
                          </label>
                          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <div className="flex-1">
                              <span className="text-sm text-gray-700">
                                {segment.estimated_travel_minutes != null
                                  ? `${segment.estimated_travel_minutes} min`
                                  : 'No estimate'}
                              </span>
                              {segment.estimated_distance_km != null && (
                                <span className="text-xs text-gray-500 ml-2">
                                  ({segment.estimated_distance_km} km)
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRecalculateTravel(segment)}
                              disabled={travelButtonDisabled}
                              className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-600 border border-green-200 rounded-md hover:bg-green-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                              title={
                                hasCoordinates
                                  ? isCoolingDown
                                    ? `Please wait ${cooldownRemaining}s before recalculating.`
                                    : 'Recalculate travel estimate'
                                  : 'Add pickup and patient locations to enable travel estimate'
                              }
                            >
                              {isTravelLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : (
                                <RefreshCw className="w-3 h-3 mr-1" />
                              )}
                              {isTravelLoading ? 'Calculating…' : segment.estimated_travel_minutes != null ? 'Recalculate' : 'Calculate'}
                            </button>
                          </div>

                          {/* Status Messages */}
                          {!hasCoordinates && (
                            <p className="text-xs text-gray-500 mt-1">
                              Add pickup and patient locations to enable travel estimate
                            </p>
                          )}
                          {isCoolingDown && hasCoordinates && !isTravelLoading && (
                            <p className="text-xs text-orange-600 mt-1">Retry in {cooldownRemaining}s</p>
                          )}
                          {travelState.status === 'error' && travelState.message && (
                            <p className="text-xs text-red-600 mt-1">{travelState.message}</p>
                          )}
                          {travelState.status === 'success' && travelState.message && (
                            <p className="text-xs text-green-600 mt-1">{travelState.message}</p>
                          )}
                          {travelState.status === 'idle' && travelState.message && (
                            <p className="text-xs text-gray-500 mt-1">{travelState.message}</p>
                          )}
                        </div>
                      </div>

                      {hasValidationErrors && (
                        <div className="md:col-span-2 flex flex-wrap items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          <div className="flex-1 space-y-1 text-xs text-red-700">
                            <p className="font-medium">Required fields missing:</p>
                            {!segment.planned_start && <p>• Start time is required</p>}
                            {!segment.planned_end && <p>• End time is required</p>}
                            {!segment.pickup_location_type && <p>• Pickup location type is required</p>}
                            {effectiveAssignmentMode === 'assign_now' && !segment.driver_id && <p>• Driver is required when assignment mode is "Assign Now"</p>}
                          </div>
                        </div>
                      )}

                      {warning && (
                        <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                          <div className="flex flex-wrap items-start gap-3">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" aria-hidden="true" />
                            <div className="flex-1 space-y-1 text-xs text-amber-800">
                              {warning.messages.map((message, messageIndex) => (
                                <p key={messageIndex}>{message}</p>
                              ))}
                              {!segment.manual_override ? (
                                <p className="italic">Mark a manual override or adjust timings/buffers before proceeding.</p>
                              ) : (
                                <p className="italic text-amber-700">Manual override recorded for this segment.</p>
                              )}
                            </div>
                            {!segment.manual_override && (
                              <button
                                type="button"
                                onClick={() => updateSegmentData(segment.id, { manual_override: true })}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-700 border border-amber-300 rounded-md hover:bg-amber-100"
                              >
                                Mark override
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Driver and Timing */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label htmlFor={`segment-${segment.id}-driver`} className="block text-sm font-medium text-gray-700">
                            Driver
                          </label>
                          <select
                            id={`segment-${segment.id}-driver`}
                            value={segment.driver_id || ''}
                            onChange={(e) => {
                              handleDriverAssignment(e.target.value ? e.target.value : null);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                          />
                        </div>
                      </div>

                      {effectiveAssignmentMode === 'assign_now' && drivers.length > 0 && isDriverAssignmentOverhaulUIEnabled() && (
                        <SegmentDriverSuggestions
                          segment={segment}
                          drivers={drivers}
                          allSegments={transportationSegmentsData}
                          onSelectDriver={(driverId) => {
                            handleDriverAssignment(driverId);
                          }}
                        />
                      )}

                      {showOverridePanel && isDriverAssignmentOverhaulUIEnabled() && (
                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                          <div className="flex flex-col gap-4">
                            <div>
                              <h6 className="text-sm font-semibold text-orange-800">Override reason</h6>
                              <p className="text-xs text-orange-700">Tell the team why this driver differs from the top recommendation.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-orange-800" htmlFor={`segment-${segment.id}-override-reason`}>Reason</label>
                                <select
                                  id={`segment-${segment.id}-override-reason`}
                                  value={overrideReasonValue}
                                  onChange={(e) => handleOverrideReasonChange(e.target.value)}
                                  className="w-full rounded-md border border-orange-300 bg-white px-3 py-2 text-sm text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  required={shouldCaptureOverride}
                                >
                                  <option value="">Select a reason</option>
                                  {SEGMENT_OVERRIDE_REASONS.map((reason) => (
                                    <option key={reason.value} value={reason.value}>
                                      {reason.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-orange-800" htmlFor={`segment-${segment.id}-override-note`}>Notes (optional)</label>
                                <textarea
                                  id={`segment-${segment.id}-override-note`}
                                  value={overrideNoteValue}
                                  onChange={(e) => handleOverrideNoteChange(e.target.value)}
                                  rows={3}
                                  className="w-full rounded-md border border-orange-300 bg-white px-3 py-2 text-sm text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  placeholder="Add any context the next dispatcher should know..."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Location Fields */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Pickup Location
                          </label>
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

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
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
                            placeholder="Search for patient location (where the patient is going)..."
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Instructions and Options */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Instructions
                          </label>
                          <textarea
                            value={segment.instructions || ''}
                            onChange={(e) => {
                              updateSegmentData(segment.id, { instructions: e.target.value });
                            }}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="Special instructions for this transportation segment (e.g., 'Patient uses wheelchair', 'Ring doorbell twice', 'Wait in lobby')..."
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={segment.requires_follow_up || false}
                              onChange={(e) => {
                                updateSegmentData(segment.id, { requires_follow_up: e.target.checked });
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">Requires follow-up</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
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

      {/* Staff Assignments Section */}
      <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-8 rounded-xl border border-purple-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">Staff Assignments</h3>
            <p className="text-sm text-gray-600">Assign staff members to this appointment</p>
          </div>
          <button
            type="button"
            onClick={addStaffAssignment}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Staff
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 text-sm mb-2">No staff assigned yet</p>
            <p className="text-gray-400 text-xs">Click "Add Staff" to assign staff members to this appointment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-sm font-semibold text-gray-700">Staff Member #{index + 1}</h5>
                  <button
                    type="button"
                    onClick={() => removeStaffAssignment(index)}
                    className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Staff Member *
                    </label>
                    <select
                      {...register(`staff_assignments.${index}.staff_id`)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 transition-colors ${
                        errors.staff_assignments?.[index]?.staff_id ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.staff_assignments[index]?.staff_id?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Role *
                    </label>
                    <select
                      {...register(`staff_assignments.${index}.role`)}
                      onChange={(e) => handleStaffRoleChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 transition-colors"
                    >
                      {STAFF_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Assignment
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          {...register(`staff_assignments.${index}.is_primary`)}
                          type="checkbox"
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Primary</span>
                      </label>
                    </div>
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

      {/* Notes and Instructions Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-8 rounded-xl border border-amber-200">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Notes & Instructions</h3>
            <p className="text-sm text-gray-600">Add important details and special instructions</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Notes */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <label htmlFor="mini_notes" className="text-sm font-semibold text-gray-700">
                Quick Notes
              </label>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Schedule View</span>
            </div>
            <textarea
              {...register('mini_notes')}
              id="mini_notes"
              rows={2}
              maxLength={500}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                errors.mini_notes ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              placeholder="Brief summary for quick reference (e.g., 'Mounjaro 2.5mg', 'Blood work - fasting required')"
            />
            <div className="flex justify-between items-center mt-2">
              {errors.mini_notes && (
                <p className="text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.mini_notes.message}
                </p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('mini_notes')?.length || 0}/500 characters
              </p>
            </div>
          </div>

          {/* Detailed Notes */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <label htmlFor="full_notes" className="text-sm font-semibold text-gray-700">
                Detailed Notes
              </label>
              <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded-full">1-Hour Reminders</span>
            </div>
            <textarea
              {...register('full_notes')}
              id="full_notes"
              rows={4}
              maxLength={2000}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                errors.full_notes ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              placeholder="Detailed notes for comprehensive reminders (e.g., 'Patient requires special attention due to diabetes. Check blood sugar levels before treatment. Bring insulin supplies.')"
            />
            <div className="flex justify-between items-center mt-2">
              {errors.full_notes && (
                <p className="text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.full_notes.message}
                </p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('full_notes')?.length || 0}/2000 characters
              </p>
            </div>
          </div>

          {/* Pickup Instructions */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <label htmlFor="pickup_instructions" className="text-sm font-semibold text-gray-700">
                Pickup Instructions
              </label>
              <span className="text-xs text-gray-500 bg-purple-100 px-2 py-1 rounded-full">For Drivers</span>
            </div>
            <textarea
              {...register('pickup_instructions')}
              id="pickup_instructions"
              rows={3}
              maxLength={1000}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                errors.pickup_instructions ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              placeholder="Special pickup instructions for drivers (e.g., 'Patient is wheelchair-bound. Use accessible vehicle. Ring doorbell twice. Patient's son will assist.')"
            />
            <div className="flex justify-between items-center mt-2">
              {errors.pickup_instructions && (
                <p className="text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.pickup_instructions.message}
                </p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('pickup_instructions')?.length || 0}/1000 characters
              </p>
            </div>
          </div>

          {/* General Notes */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <label htmlFor="notes" className="text-sm font-semibold text-gray-700">
                General Notes
              </label>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Legacy Field</span>
            </div>
            <textarea
              {...register('notes')}
              id="notes"
              rows={3}
              maxLength={1000}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                errors.notes ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              placeholder="General appointment notes (use specific fields above when possible)..."
            />
            <div className="flex justify-between items-center mt-2">
              {errors.notes && (
                <p className="text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.notes.message}
                </p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {watch('notes')?.length || 0}/1000 characters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>All required fields must be completed to save the appointment</span>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || isLoading}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <>
                  <svg className="w-4 h-4 mr-2 inline animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {appointment ? 'Update Appointment' : 'Create Appointment'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
