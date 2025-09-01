import { createClient } from '@supabase/supabase-js';
import { config } from './env';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'medicare-scheduler',
      },
    },
  },
);

// Helper function to get the service role client (server-side only)
export const getServiceRoleClient = () => {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Type definitions for database tables
export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          date_of_birth: string;
          address: string;
          emergency_contact: string;
          medical_history: string;
          id_document_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          date_of_birth: string;
          address: string;
          emergency_contact: string;
          medical_history: string;
          id_document_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          date_of_birth?: string;
          address?: string;
          emergency_contact?: string;
          medical_history?: string;
          id_document_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          staff_type: 'driver' | 'medical';
          google_calendar_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          staff_type: 'driver' | 'medical';
          google_calendar_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          staff_type?: 'driver' | 'medical';
          google_calendar_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          appointment_type:
            | 'consultation'
            | 'follow_up'
            | 'emergency'
            | 'routine';
          start_time: string;
          end_time: string;
          status:
            | 'scheduled'
            | 'confirmed'
            | 'in_progress'
            | 'completed'
            | 'cancelled';
          notes: string;
          custom_fields: Record<string, unknown>;
          recurring_rule: Record<string, unknown> | null;
          google_calendar_event_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          appointment_type:
            | 'consultation'
            | 'follow_up'
            | 'emergency'
            | 'routine';
          start_time: string;
          end_time: string;
          status?:
            | 'scheduled'
            | 'confirmed'
            | 'in_progress'
            | 'completed'
            | 'cancelled';
          notes?: string;
          custom_fields?: Record<string, unknown>;
          recurring_rule?: Record<string, unknown> | null;
          google_calendar_event_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          appointment_type?:
            | 'consultation'
            | 'follow_up'
            | 'emergency'
            | 'routine';
          start_time?: string;
          end_time?: string;
          status?:
            | 'scheduled'
            | 'confirmed'
            | 'in_progress'
            | 'completed'
            | 'cancelled';
          notes?: string;
          custom_fields?: Record<string, unknown>;
          recurring_rule?: Record<string, unknown> | null;
          google_calendar_event_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointment_staff: {
        Row: {
          id: string;
          appointment_id: string;
          staff_id: string;
          role: 'primary' | 'assistant';
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          staff_id: string;
          role?: 'primary' | 'assistant';
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          staff_id?: string;
          role?: 'primary' | 'assistant';
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
