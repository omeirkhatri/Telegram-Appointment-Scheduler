// Re-export database types from Supabase
export type { Database, Tables, Inserts, Updates } from '@/lib/supabase'

// Re-export environment types
export type { Config, Env } from '@/lib/env'

// Application-specific types
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'caregiver'
  created_at: string
}

export interface Patient {
  id: string
  name: string
  email: string
  phone: string
  date_of_birth: string
  address: string
  emergency_contact: string
  medical_history: string
  id_document_url: string | null
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  name: string
  email: string
  phone: string
  staff_type: 'driver' | 'medical'
  google_calendar_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  appointment_type: 'consultation' | 'follow_up' | 'emergency' | 'routine'
  start_time: string
  end_time: string
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  notes: string
  custom_fields: Record<string, unknown>
  recurring_rule: Record<string, unknown> | null
  google_calendar_event_id: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentStaff {
  id: string
  appointment_id: string
  staff_id: string
  role: 'primary' | 'assistant'
  created_at: string
}

// Form types
export interface PatientFormData {
  name: string
  email: string
  phone: string
  date_of_birth: string
  address: string
  emergency_contact: string
  medical_history: string
  id_document?: File
}

export interface StaffFormData {
  name: string
  email: string
  phone: string
  staff_type: 'driver' | 'medical'
  google_calendar_id?: string
  is_active: boolean
}

export interface AppointmentFormData {
  patient_id: string
  appointment_type: 'consultation' | 'follow_up' | 'emergency' | 'routine'
  start_time: string
  end_time: string
  notes?: string
  staff_ids: string[]
  custom_fields?: Record<string, unknown>
  recurring_rule?: Record<string, unknown>
}

// Calendar types
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  color?: string
  appointment?: Appointment
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Utility types
export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface LoadingState {
  status: Status
  error?: string
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeConfig {
  theme: Theme
  systemTheme?: 'light' | 'dark'
}
