export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'deleted';

export type AppointmentType =
  | 'doctor_on_call'
  | 'lab_test'
  | 'teleconsultation'
  | 'physiotherapy'
  | 'caregiver'
  | 'iv_therapy';

export type TransportationType = 'driver' | 'self_transport';

export type DriverAssignmentStatus =
  | 'not_required'
  | 'pending'
  | 'assigned'
  | 'completed';

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

export type TransportationSegmentAssignmentMode = 'assign_now' | 'assign_later';

export type PickupLocationType =
  | 'office'
  | 'previous_appointment'
  | 'metro_station'
  | 'custom';

export interface AppointmentsRow {
  id: string;
  patient_id: string;
  appointment_type: AppointmentType;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  custom_fields: Json | null;
  transportation_type: TransportationType | null;
  transportation_method: string | null;
  driver_id: string | null;
  notes: string | null;
  mini_notes: string | null;
  full_notes: string | null;
  pickup_instructions: string | null;
  recurring_rule: Json | null;
  recurring_group_id: string | null;
  is_recurring_base: boolean | null;
  recurring_occurrence_number: number | null;
  google_event_ids: Json | null;
  driver_assignment_status: DriverAssignmentStatus;
  created_at: string;
  updated_at: string;
}

export interface AppointmentsInsert {
  id?: string;
  patient_id: string;
  appointment_type: AppointmentType;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status?: AppointmentStatus;
  custom_fields?: Json | null;
  transportation_type?: TransportationType | null;
  transportation_method?: string | null;
  driver_id?: string | null;
  notes?: string | null;
  mini_notes?: string | null;
  full_notes?: string | null;
  pickup_instructions?: string | null;
  recurring_rule?: Json | null;
  recurring_group_id?: string | null;
  is_recurring_base?: boolean | null;
  recurring_occurrence_number?: number | null;
  google_event_ids?: Json | null;
  driver_assignment_status?: DriverAssignmentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentsUpdate {
  id?: string;
  patient_id?: string;
  appointment_type?: AppointmentType;
  appointment_date?: string;
  start_time?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  custom_fields?: Json | null;
  transportation_type?: TransportationType | null;
  transportation_method?: string | null;
  driver_id?: string | null;
  notes?: string | null;
  mini_notes?: string | null;
  full_notes?: string | null;
  pickup_instructions?: string | null;
  recurring_rule?: Json | null;
  recurring_group_id?: string | null;
  is_recurring_base?: boolean | null;
  recurring_occurrence_number?: number | null;
  google_event_ids?: Json | null;
  driver_assignment_status?: DriverAssignmentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface TransportationSegmentsRow {
  id: string;
  appointment_id: string;
  segment_type: TransportationSegmentType;
  title: string | null;
  planned_start: string | null;
  planned_end: string | null;
  driver_id: string | null;
  travel_mode: string | null;
  pickup_location: Json | null;
  patient_location: Json | null;
  pickup_location_type: PickupLocationType;
  pickup_location_reference: string | null;
  estimated_travel_minutes: number | null;
  estimated_distance_km: string | null;
  buffer_minutes: number;
  instructions: string | null;
  requires_follow_up: boolean;
  status: TransportationSegmentStatus;
  manual_override: boolean;
  assignment_mode: TransportationSegmentAssignmentMode;
  priority: number | null;
  recommended_driver_ids: string[];
  recommendation_metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface TransportationSegmentsInsert {
  id?: string;
  appointment_id: string;
  segment_type: TransportationSegmentType;
  title?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  driver_id?: string | null;
  travel_mode?: string | null;
  pickup_location?: Json | null;
  patient_location?: Json | null;
  pickup_location_type?: PickupLocationType;
  pickup_location_reference?: string | null;
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: string | null;
  buffer_minutes?: number;
  instructions?: string | null;
  requires_follow_up?: boolean;
  status?: TransportationSegmentStatus;
  manual_override?: boolean;
  assignment_mode?: TransportationSegmentAssignmentMode;
  priority?: number | null;
  recommended_driver_ids?: string[];
  recommendation_metadata?: Json;
  created_at?: string;
  updated_at?: string;
}

export interface TransportationSegmentsUpdate {
  id?: string;
  appointment_id?: string;
  segment_type?: TransportationSegmentType;
  title?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  driver_id?: string | null;
  travel_mode?: string | null;
  pickup_location?: Json | null;
  patient_location?: Json | null;
  pickup_location_type?: PickupLocationType;
  pickup_location_reference?: string | null;
  estimated_travel_minutes?: number | null;
  estimated_distance_km?: string | null;
  buffer_minutes?: number;
  instructions?: string | null;
  requires_follow_up?: boolean;
  status?: TransportationSegmentStatus;
  manual_override?: boolean;
  assignment_mode?: TransportationSegmentAssignmentMode;
  priority?: number | null;
  recommended_driver_ids?: string[];
  recommendation_metadata?: Json;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: AppointmentsRow;
        Insert: AppointmentsInsert;
        Update: AppointmentsUpdate;
        Relationships: [
          {
            foreignKeyName: 'appointments_driver_id_fkey';
            columns: ['driver_id'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          }
        ];
      };
      transportation_segments: {
        Row: TransportationSegmentsRow;
        Insert: TransportationSegmentsInsert;
        Update: TransportationSegmentsUpdate;
        Relationships: [
          {
            foreignKeyName: 'transportation_segments_appointment_id_fkey';
            columns: ['appointment_id'];
            isOneToOne: false;
            referencedRelation: 'appointments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transportation_segments_driver_id_fkey';
            columns: ['driver_id'];
            isOneToOne: false;
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      appointment_status_enum: AppointmentStatus;
      appointment_type_enum: AppointmentType;
      transportation_type_enum: TransportationType;
      driver_assignment_status_enum: DriverAssignmentStatus;
      transportation_segment_type_enum: TransportationSegmentType;
      transportation_segment_status_enum: TransportationSegmentStatus;
      transportation_segment_assignment_mode_enum: TransportationSegmentAssignmentMode;
      pickup_location_type_enum: PickupLocationType;
    };
    CompositeTypes: Record<string, never>;
  };
}
