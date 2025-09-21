import type { TimezoneResolution } from './timezone';

export interface ApiResponseMetadata {
  timezone?: TimezoneResolution;
  apiVersion?: string;
  generatedAt: string;
  requestId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  metadata?: ApiResponseMetadata;
}

export interface TimezoneAwareAppointment {
  id: string;
  patient_id: string;
  appointment_type: string;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  custom_fields?: Record<string, any>;
  transportation_type?: string;
  transportation_method?: string;
  driver_id?: string;
  notes?: string;
  mini_notes?: string;
  full_notes?: string;
  pickup_instructions?: string;
  recurring_rule?: any;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    name: string;
    phone: string;
    flat_villa_no?: string;
    building_street?: string;
    area?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    google_maps_link?: string;
    address?: string;
  };
  appointment_staff?: Array<{
    id: string;
    role: string;
    is_primary: boolean;
    staff: {
      id: string;
      first_name: string;
      last_name: string;
      staff_type: string;
      specialization?: string;
      phone?: string;
      email?: string;
    };
  }>;
  // Timezone-aware fields
  local_time?: {
    appointment_date: string;
    start_time: string;
    end_time: string;
    timezone: string;
    timezone_abbreviation: string;
    offset_minutes: number;
  };
}

export interface TimezoneAwareReportData {
  headers: string[];
  rows: Record<string, any>[];
  metadata: {
    generatedAt: string;
    timezone?: TimezoneResolution;
    reportType: string;
    dateRange?: {
      from: string;
      to: string;
    };
  };
}

export interface ApiVersionInfo {
  version: string;
  supportedVersions: string[];
  timezoneSupport: boolean;
  features: string[];
}

export interface TimezoneContextQuery {
  timezone?: string;
  location_id?: string;
  organization_id?: string;
  include_timezone_metadata?: boolean;
}

export interface ApiVersionQuery {
  version?: string;
  api_version?: string;
}
