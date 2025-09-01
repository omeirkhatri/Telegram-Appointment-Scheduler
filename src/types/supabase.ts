// Supabase database types based on current schema
export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          name: string;
          phone: string;
          id_document_url: string | null;
          id_document_filename: string | null;
          flat_villa_no: string;
          building_street: string;
          area: string;
          city: string;
          google_maps_link: string | null;
          medical_notes: string | null;
          emergency_contact: string | null;
          preferred_transport: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          id_document_url?: string | null;
          id_document_filename?: string | null;
          flat_villa_no: string;
          building_street: string;
          area: string;
          city: string;
          google_maps_link?: string | null;
          medical_notes?: string | null;
          emergency_contact?: string | null;
          preferred_transport?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          id_document_url?: string | null;
          id_document_filename?: string | null;
          flat_villa_no?: string;
          building_street?: string;
          area?: string;
          city?: string;
          google_maps_link?: string | null;
          medical_notes?: string | null;
          emergency_contact?: string | null;
          preferred_transport?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          staff_type: 'doctor' | 'nurse' | 'physiotherapist' | 'caregiver' | 'driver' | 'lab_technician';
          specialization: string | null;
          phone: string;
          email: string;
          google_calendar_id: string | null;
          available_days: number[];
          working_hours_start: string;
          working_hours_end: string;
          status: 'active' | 'inactive';
          email_notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          staff_type: 'doctor' | 'nurse' | 'physiotherapist' | 'caregiver' | 'driver' | 'lab_technician';
          specialization?: string | null;
          phone: string;
          email: string;
          google_calendar_id?: string | null;
          available_days?: number[];
          working_hours_start?: string;
          working_hours_end?: string;
          status?: 'active' | 'inactive';
          email_notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          staff_type?: 'doctor' | 'nurse' | 'physiotherapist' | 'caregiver' | 'driver' | 'lab_technician';
          specialization?: string | null;
          phone?: string;
          email?: string;
          google_calendar_id?: string | null;
          available_days?: number[];
          working_hours_start?: string;
          working_hours_end?: string;
          status?: 'active' | 'inactive';
          email_notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          appointment_type: 'doctor_on_call' | 'lab_test' | 'teleconsultation' | 'physiotherapy' | 'caregiver' | 'iv_therapy';
          appointment_date: string;
          start_time: string;
          duration_minutes: number;
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
          custom_fields: Record<string, unknown>;
          transportation_type: 'driver' | 'self_transport' | null;
          transportation_method: string | null;
          driver_id: string | null;
          notes: string | null;
          recurring_rule: Record<string, unknown> | null;
          google_event_ids: Record<string, string>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          appointment_type: 'doctor_on_call' | 'lab_test' | 'teleconsultation' | 'physiotherapy' | 'caregiver' | 'iv_therapy';
          appointment_date: string;
          start_time: string;
          duration_minutes: number;
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
          custom_fields?: Record<string, unknown>;
          transportation_type?: 'driver' | 'self_transport' | null;
          transportation_method?: string | null;
          driver_id?: string | null;
          notes?: string | null;
          recurring_rule?: Record<string, unknown> | null;
          google_event_ids?: Record<string, string>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          appointment_type?: 'doctor_on_call' | 'lab_test' | 'teleconsultation' | 'physiotherapy' | 'caregiver' | 'iv_therapy';
          appointment_date?: string;
          start_time?: string;
          duration_minutes?: number;
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
          custom_fields?: Record<string, unknown>;
          transportation_type?: 'driver' | 'self_transport' | null;
          transportation_method?: string | null;
          driver_id?: string | null;
          notes?: string | null;
          recurring_rule?: Record<string, unknown> | null;
          google_event_ids?: Record<string, string>;
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
          is_primary: boolean;
          google_event_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          staff_id: string;
          role?: 'primary' | 'assistant';
          is_primary?: boolean;
          google_event_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          staff_id?: string;
          role?: 'primary' | 'assistant';
          is_primary?: boolean;
          google_event_id?: string | null;
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
      staff_type_enum: 'doctor' | 'nurse' | 'physiotherapist' | 'caregiver' | 'driver' | 'lab_technician';
      staff_status_enum: 'active' | 'inactive';
      appointment_type_enum: 'doctor_on_call' | 'lab_test' | 'teleconsultation' | 'physiotherapy' | 'caregiver' | 'iv_therapy';
      appointment_status_enum: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
      transportation_type_enum: 'driver' | 'self_transport';
    };
  };
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Specific table types
export type Patient = Tables<'patients'>;
export type PatientInsert = Inserts<'patients'>;
export type PatientUpdate = Updates<'patients'>;

export type Staff = Tables<'staff'>;
export type StaffInsert = Inserts<'staff'>;
export type StaffUpdate = Updates<'staff'>;

export type Appointment = Tables<'appointments'>;
export type AppointmentInsert = Inserts<'appointments'>;
export type AppointmentUpdate = Updates<'appointments'>;

export type AppointmentStaff = Tables<'appointment_staff'>;
export type AppointmentStaffInsert = Inserts<'appointment_staff'>;
export type AppointmentStaffUpdate = Updates<'appointment_staff'>;

// Enum types
export type StaffType = Database['public']['Enums']['staff_type_enum'];
export type StaffStatus = Database['public']['Enums']['staff_status_enum'];
export type AppointmentType = Database['public']['Enums']['appointment_type_enum'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status_enum'];
export type TransportationType = Database['public']['Enums']['transportation_type_enum'];
