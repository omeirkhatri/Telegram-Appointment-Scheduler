// Transportation segment domain types shared across services and UI
import type { Staff } from './staff';

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

export interface TransportationSegmentLocation {
  lat: number;
  lng: number;
  address?: string;
  landmark?: string;
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
  origin?: TransportationSegmentLocation | null;
  destination?: TransportationSegmentLocation | null;
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: number | null;
  buffer_minutes?: number | null;
  instructions?: string | null;
  requires_follow_up?: boolean | null;
  status: TransportationSegmentStatus;
  manual_override?: boolean | null;
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
  origin?: TransportationSegmentLocation | null;
  destination?: TransportationSegmentLocation | null;
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: number | null;
  buffer_minutes?: number | null;
  instructions?: string | null;
  requires_follow_up?: boolean | null;
  status?: TransportationSegmentStatus;
  manual_override?: boolean | null;
}

export interface UpdateTransportationSegment {
  id: string;
  segment_type?: TransportationSegmentType;
  title?: string;
  planned_start?: string;
  planned_end?: string;
  driver_id?: string | null;
  travel_mode?: string | null;
  origin?: TransportationSegmentLocation | null;
  destination?: TransportationSegmentLocation | null;
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: number | null;
  buffer_minutes?: number | null;
  instructions?: string | null;
  requires_follow_up?: boolean;
  status?: TransportationSegmentStatus;
  manual_override?: boolean;
}

export interface TransportationSegmentFilters {
  appointment_id?: string;
  driver_id?: string;
  segment_type?: TransportationSegmentType;
  status?: TransportationSegmentStatus;
  requires_follow_up?: boolean;
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
