// Transportation segment domain types shared across services and UI
import type { Staff } from './staff';
import type { TransportationSegmentAssignmentMode } from './supabase';

export interface TransportationRecommendationEntry {
  driver_id: string;
  score?: number;
  reasons?: string[];
  tags?: string[];
  rank?: number;
  eta_minutes?: number;
  conflicts?: string[];
  [key: string]: unknown;
}

export interface TransportationRecommendationOverride {
  driver_id?: string;
  recommended_driver_id?: string;
  reason?: string;
  note?: string;
  recorded_at?: string;
}

export interface TransportationRecommendationMetadata extends Record<string, unknown> {
  generated_at?: string;
  scoring_model?: string;
  factors?: Record<string, unknown>;
  recommendations?: TransportationRecommendationEntry[];
  drivers?: TransportationRecommendationEntry[];
  suggestions?: TransportationRecommendationEntry[];
  override?: TransportationRecommendationOverride | null;
}

export type TransportationQueueEscalationState = 'normal' | 'escalated';

export type TransportationSegmentType =
  | 'pickup'
  | 'dropoff'
  | 'stay_with_staff'
  | 'metro_assist'
  | 'custom';

export type TransportationSegmentStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PickupLocationType =
  | 'office'
  | 'previous_appointment'
  | 'metro_station'
  | 'custom';

export interface TransportationSegmentLocation {
  lat: number;
  lng: number;
  address?: string;
  landmark?: string;
  // Additional fields for enhanced location data
  place_id?: string; // Google Places ID for better location identification
  formatted_address?: string; // Full formatted address from Google Places
  city?: string; // City name
  area?: string; // Area/district name
  building_name?: string; // Building or landmark name
}

export interface TransportationSegment {
  id: string;
  appointment_id: string;
  segment_type: TransportationSegmentType;
  title: string;
  planned_start?: string;
  planned_end?: string;
  driver_id?: string | null;
  travel_mode?: string | null;
  pickup_location?: TransportationSegmentLocation | null;
  patient_location?: TransportationSegmentLocation | null;
  pickup_location_type: PickupLocationType;
  pickup_location_reference?: string | null;
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: number | null;
  buffer_minutes?: number | null;
  instructions?: string | null;
  requires_follow_up?: boolean | null;
  status: TransportationSegmentStatus;
  manual_override?: boolean | null;
  google_event_id?: string | null;
  assignment_mode: TransportationSegmentAssignmentMode;
  priority: number | null;
  recommended_driver_ids: string[];
  recommendation_metadata: TransportationRecommendationMetadata;
  queue_rank?: number | null;
  escalation_state?: TransportationQueueEscalationState;
  escalation_deadline?: string | null;
  created_at: string;
  updated_at: string;
  driver?: Staff;
}

export interface CreateTransportationSegment {
  appointment_id: string;
  segment_type: TransportationSegmentType;
  title?: string;
  planned_start?: string;
  planned_end?: string;
  driver_id?: string | null;
  travel_mode?: string | null;
  pickup_location?: TransportationSegmentLocation | null;
  patient_location?: TransportationSegmentLocation | null;
  pickup_location_type: PickupLocationType;
  pickup_location_reference?: string | null;
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: number | null;
  buffer_minutes?: number | null;
  instructions?: string | null;
  requires_follow_up?: boolean | null;
  status?: TransportationSegmentStatus;
  manual_override?: boolean | null;
  assignment_mode?: TransportationSegmentAssignmentMode;
  priority?: number | null;
  recommended_driver_ids?: string[];
  recommendation_metadata?: TransportationRecommendationMetadata;
}

export interface UpdateTransportationSegment {
  id: string;
  segment_type?: TransportationSegmentType;
  title?: string;
  planned_start?: string;
  planned_end?: string;
  driver_id?: string | null;
  travel_mode?: string | null;
  pickup_location?: TransportationSegmentLocation | null;
  patient_location?: TransportationSegmentLocation | null;
  pickup_location_type?: PickupLocationType;
  pickup_location_reference?: string | null;
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: number | null;
  buffer_minutes?: number | null;
  instructions?: string | null;
  requires_follow_up?: boolean;
  status?: TransportationSegmentStatus;
  manual_override?: boolean;
  assignment_mode?: TransportationSegmentAssignmentMode;
  priority?: number | null;
  recommended_driver_ids?: string[];
  recommendation_metadata?: TransportationRecommendationMetadata;
  queue_rank?: number | null;
  escalation_state?: TransportationQueueEscalationState;
  escalation_deadline?: string | null;
}

export interface TransportationSegmentFilters {
  appointment_id?: string;
  driver_id?: string;
  segment_type?: TransportationSegmentType;
  status?: TransportationSegmentStatus;
  requires_follow_up?: boolean;
  assignment_mode?: TransportationSegmentAssignmentMode;
  unassigned_only?: boolean;
  start_after?: string;
  start_before?: string;
}

export function getTransportationSegmentTypeLabel(type: TransportationSegmentType): string {
  const labels: Record<TransportationSegmentType, string> = {
    pickup: 'Pickup',
    dropoff: 'Drop-off',
    stay_with_staff: 'Stay with Staff',
    metro_assist: 'Metro Assist',
    custom: 'Custom',
  };
  return labels[type];
}

export function getTransportationSegmentStatusLabel(status: TransportationSegmentStatus): string {
  const labels: Record<TransportationSegmentStatus, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

export function isTransportationSegmentActive(status: TransportationSegmentStatus): boolean {
  return status === 'scheduled' || status === 'in_progress';
}

export function isTransportationSegmentCompleted(status: TransportationSegmentStatus): boolean {
  return status === 'completed';
}

export function isTransportationSegmentCancelled(status: TransportationSegmentStatus): boolean {
  return status === 'cancelled';
}

// Helper functions for pickup location types
export function getPickupLocationTypeLabel(type: PickupLocationType): string {
  const labels: Record<PickupLocationType, string> = {
    office: 'From Office',
    previous_appointment: 'From Previous Appointment',
    metro_station: 'From Metro Station',
    custom: 'From Custom Location',
  };
  return labels[type];
}

export function requiresPickupLocationReference(type: PickupLocationType): boolean {
  return type === 'previous_appointment' || type === 'metro_station';
}

export function isValidPickupLocationType(type: string): type is PickupLocationType {
  return ['office', 'previous_appointment', 'metro_station', 'custom'].includes(type);
}
