// Appointment types based on database schema
export type AppointmentType = 'doctor_on_call' | 'lab_test' | 'teleconsultation' | 'physiotherapy' | 'caregiver' | 'iv_therapy';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
export type TransportationType = 'driver' | 'self_transport';

export interface Appointment {
  id: string;
  patient_id: string;
  appointment_type: AppointmentType;
  appointment_date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM format
  duration_minutes: number;
  status: AppointmentStatus;
  custom_fields: Record<string, unknown>;
  transportation_type?: TransportationType;
  transportation_method?: string;
  driver_id?: string;
  notes?: string;
  mini_notes?: string;
  full_notes?: string;
  pickup_instructions?: string;
  recurring_rule?: RecurringRule;
  recurring_group_id?: string;
  is_recurring_base?: boolean;
  recurring_occurrence_number?: number;
  created_at: string;
  updated_at: string;
  // Patient data (populated when fetching appointments)
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
    address?: string;
  };
  // Staff assignments (populated when fetching appointments)
  appointment_staff?: Array<{
    id: string;
    staff_id: string;
    role: string;
    is_primary: boolean;
    staff: {
      id: string;
      first_name: string;
      last_name: string;
      staff_type: string;
      specialization?: string;
      phone: string;
      email: string;
    };
  }>;
  // Pre-processed staff information (added by appointmentService)
  staff_name?: string;
  all_staff_names?: string;
}

// Appointment creation type (without id and timestamps)
export interface CreateAppointment {
  patient_id: string;
  appointment_type: AppointmentType;
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status?: AppointmentStatus;
  custom_fields?: Record<string, unknown>;
  transportation_type?: TransportationType;
  transportation_method?: string;
  driver_id?: string;
  notes?: string;
  mini_notes?: string;
  full_notes?: string;
  pickup_instructions?: string;
  recurring_rule?: RecurringRule;
  recurring_group_id?: string;
  is_recurring_base?: boolean;
  recurring_occurrence_number?: number;
}

// Appointment update type (all fields optional except id)
export interface UpdateAppointment {
  id: string;
  patient_id?: string;
  appointment_type?: AppointmentType;
  appointment_date?: string;
  start_time?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  custom_fields?: Record<string, unknown>;
  transportation_type?: TransportationType;
  transportation_method?: string;
  driver_id?: string;
  notes?: string;
  mini_notes?: string;
  full_notes?: string;
  pickup_instructions?: string;
  recurring_rule?: RecurringRule;
  recurring_group_id?: string;
  is_recurring_base?: boolean;
  recurring_occurrence_number?: number;
}

// Appointment search/filter options
export interface AppointmentFilters {
  patient_id?: string;
  appointment_type?: AppointmentType;
  status?: AppointmentStatus;
  appointment_date?: string;
  date_from?: string;
  date_to?: string;
  driver_id?: string;
  transportation_type?: TransportationType;
  has_recurring_rule?: boolean;
}

// Recurring rule structure
export interface RecurringRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every X days/weeks/months/years
  end_date?: string; // Optional end date
  end_occurrences?: number; // Optional number of occurrences
  days_of_week?: number[]; // For weekly recurrence (1-7, Monday-Sunday)
  day_of_month?: number; // For monthly recurrence (1-31)
  month_of_year?: number; // For yearly recurrence (1-12)
}

// Custom fields for different appointment types
export interface DoctorOnCallFields {
  chief_complaint: string;
  primary_doctor_id: string;
  assisting_nurse_id?: string;
}

export interface LabTestFields {
  test_list: string;
  lab_name: 'AVM' | 'Forte' | 'Lifenity' | 'Other';
  sample_types: string[];
  nurse_id: string;
  fasting_required: boolean;
}

export interface TeleconsultationFields {
  platform: 'Zoom' | 'Google Meet' | 'WhatsApp Video' | 'Phone Call';
  doctor_id: string;
  consultation_type: 'Follow-up' | 'New' | 'Emergency';
}

export interface PhysiotherapyFields {
  physiotherapist_id: string;
  condition_injury: string;
  session_type: 'Assessment' | 'Treatment' | 'Follow-up';
}

export interface CaregiverFields {
  primary_caregiver_id: string;
  backup_caregiver_id?: string;
}

export interface IVTherapyFields {
  nurse_id: string;
  doctor_id?: string;
  iv_type: string;
  iv_company: 'Revitalife' | 'Magenta' | 'Centric' | 'Self';
}

// Transportation method options
export const TRANSPORTATION_METHODS = {
  self_transport: [
    'Won\'t work',
    'Family member',
    'Taxi',
    'Public transport',
    'Walking',
  ] as const,
};

export type SelfTransportMethod = typeof TRANSPORTATION_METHODS.self_transport[number];

// Helper function to get appointment end time
export function getAppointmentEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return end.toTimeString().slice(0, 5); // HH:MM format
}

// Helper function to validate appointment date
export function isValidAppointmentDate(date: string): boolean {
  const appointmentDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return appointmentDate >= today;
}

// Helper function to validate appointment time
export function isValidAppointmentTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

// Helper function to validate duration
export function isValidDuration(minutes: number): boolean {
  return minutes > 0 && minutes <= 1440; // Max 24 hours
}

// Helper function to validate recurring rule
export function isValidRecurringRule(rule: RecurringRule): boolean {
  if (!rule.frequency || !rule.interval) {
    return false;
  }

  if (rule.interval < 1) {
    return false;
  }

  // Validate frequency-specific fields
  switch (rule.frequency) {
    case 'weekly':
      if (rule.days_of_week && !rule.days_of_week.every(day => day >= 1 && day <= 7)) {
        return false;
      }
      break;
    case 'monthly':
      if (rule.day_of_month && (rule.day_of_month < 1 || rule.day_of_month > 31)) {
        return false;
      }
      break;
    case 'yearly':
      if (rule.month_of_year && (rule.month_of_year < 1 || rule.month_of_year > 12)) {
        return false;
      }
      break;
  }

  return true;
}

// Helper function to validate required fields
export function validateAppointmentData(data: CreateAppointment): string[] {
  const errors: string[] = [];

  if (!data.patient_id) {
    errors.push('Patient ID is required');
  }

  if (!data.appointment_date) {
    errors.push('Appointment date is required');
  } else if (!isValidAppointmentDate(data.appointment_date)) {
    errors.push('Appointment date must be today or in the future');
  }

  if (!data.start_time) {
    errors.push('Start time is required');
  } else if (!isValidAppointmentTime(data.start_time)) {
    errors.push('Invalid start time format (HH:MM)');
  }

  if (!data.duration_minutes) {
    errors.push('Duration is required');
  } else if (!isValidDuration(data.duration_minutes)) {
    errors.push('Duration must be between 1 and 1440 minutes');
  }

  if (data.transportation_type === 'driver' && !data.driver_id) {
    errors.push('Driver ID is required when transportation type is driver');
  }

  if (data.transportation_type === 'self_transport' && !data.transportation_method) {
    errors.push('Transportation method is required when transportation type is self-transport');
  }

  if (data.recurring_rule && !isValidRecurringRule(data.recurring_rule)) {
    errors.push('Invalid recurring rule');
  }

  return errors;
}

// Helper function to get appointment type display name
export function getAppointmentTypeDisplayName(type: AppointmentType): string {
  const displayNames: Record<AppointmentType, string> = {
    doctor_on_call: 'Doctor on Call',
    lab_test: 'Lab Test',
    teleconsultation: 'Teleconsultation',
    physiotherapy: 'Physiotherapy',
    caregiver: 'Caregiver',
    iv_therapy: 'IV Therapy',
  };
  return displayNames[type];
}

// Helper function to get appointment status display name
export function getAppointmentStatusDisplayName(status: AppointmentStatus): string {
  const displayNames: Record<AppointmentStatus, string> = {
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return displayNames[status];
}

// Helper function to check if appointment is recurring
export function isRecurringAppointment(appointment: Appointment): boolean {
  return appointment.recurring_rule !== undefined && appointment.recurring_rule !== null;
}

// Helper function to get next occurrence date for recurring appointment
export function getNextOccurrenceDate(
  baseDate: string,
  recurringRule: RecurringRule,
  currentOccurrence: number = 0,
): string {
  const date = new Date(baseDate);

  switch (recurringRule.frequency) {
    case 'daily':
      date.setDate(date.getDate() + (recurringRule.interval * currentOccurrence));
      break;
    case 'weekly':
      date.setDate(date.getDate() + (recurringRule.interval * 7 * currentOccurrence));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + (recurringRule.interval * currentOccurrence));
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + (recurringRule.interval * currentOccurrence));
      break;
  }

  return date.toISOString().split('T')[0];
}

// External edit indicator helper functions
export function hasExternalEdits(appointment: Appointment): boolean {
  // Check if appointment has external edit indicators
  return !!(appointment.custom_fields?.external_edit_source ||
           appointment.custom_fields?.last_external_edit);
}

export function isLastEditExternal(appointment: Appointment): boolean {
  // Check if the last edit was from an external source
  return !!(appointment.custom_fields?.last_external_edit &&
           appointment.custom_fields?.external_edit_source);
}

export function getEditSourceDisplayName(appointment: Appointment): string {
  const source = appointment.custom_fields?.external_edit_source as string;
  if (!source) return 'Unknown';

  switch (source) {
    case 'telegram':
      return 'Telegram Bot';
    case 'api':
      return 'API';
    case 'webhook':
      return 'Webhook';
    case 'mobile':
      return 'Mobile App';
    default:
      return source.charAt(0).toUpperCase() + source.slice(1);
  }
}

export function getTimeSinceLastExternalEdit(appointment: Appointment): string {
  const lastEdit = appointment.custom_fields?.last_external_edit as string;
  if (!lastEdit) return 'Unknown';

  try {
    const editDate = new Date(lastEdit);
    const now = new Date();
    const diffMs = now.getTime() - editDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  } catch {
    return 'Unknown';
  }
}
