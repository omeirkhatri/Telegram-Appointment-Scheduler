// AppointmentStaff types based on database schema
export type StaffRole = 'primary' | 'assistant' | 'driver' | 'backup';

export interface AppointmentStaff {
  id: string;
  appointment_id: string;
  staff_id: string;
  role: StaffRole;
  is_primary: boolean;
  google_event_id?: string;
  created_at: string;
  updated_at: string;
}

// AppointmentStaff creation type (without id and timestamps)
export interface CreateAppointmentStaff {
  appointment_id: string;
  staff_id: string;
  role?: StaffRole;
  is_primary?: boolean;
  google_event_id?: string;
}

// AppointmentStaff update type (all fields optional except id)
export interface UpdateAppointmentStaff {
  id: string;
  role?: StaffRole;
  is_primary?: boolean;
  google_event_id?: string;
}

// AppointmentStaff search/filter options
export interface AppointmentStaffFilters {
  appointment_id?: string;
  staff_id?: string;
  role?: StaffRole;
  is_primary?: boolean;
  has_google_event_id?: boolean;
}

// Extended AppointmentStaff with related data
export interface AppointmentStaffWithDetails extends AppointmentStaff {
  appointment?: {
    id: string;
    appointment_type: string;
    appointment_date: string;
    start_time: string;
    duration_minutes: number;
    status: string;
  };
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    staff_type: string;
    specialization?: string;
    phone: string;
    email: string;
  };
}

// Staff assignment for appointment creation
export interface StaffAssignment {
  staff_id: string;
  role: StaffRole;
  is_primary?: boolean;
}

// Helper function to validate staff role
export function isValidStaffRole(role: string): role is StaffRole {
  return ['primary', 'assistant', 'driver', 'backup'].includes(role);
}

// Helper function to validate Google Calendar event ID
export function isValidGoogleEventId(eventId: string): boolean {
  const eventIdRegex = /^[a-zA-Z0-9_-]+$/;
  return eventIdRegex.test(eventId);
}

// Helper function to validate required fields
export function validateAppointmentStaffData(data: CreateAppointmentStaff): string[] {
  const errors: string[] = [];

  if (!data.appointment_id) {
    errors.push('Appointment ID is required');
  }

  if (!data.staff_id) {
    errors.push('Staff ID is required');
  }

  if (data.role && !isValidStaffRole(data.role)) {
    errors.push('Invalid staff role');
  }

  if (data.google_event_id && !isValidGoogleEventId(data.google_event_id)) {
    errors.push('Invalid Google Calendar event ID format');
  }

  // Validate role and is_primary consistency
  if (data.role === 'primary' && data.is_primary === false) {
    errors.push('Primary role must have is_primary set to true');
  }

  if (data.role !== 'primary' && data.is_primary === true) {
    errors.push('Non-primary role cannot have is_primary set to true');
  }

  return errors;
}

// Helper function to get staff role display name
export function getStaffRoleDisplayName(role: StaffRole): string {
  const displayNames: Record<StaffRole, string> = {
    primary: 'Primary',
    assistant: 'Assistant',
    driver: 'Driver',
    backup: 'Backup',
  };
  return displayNames[role];
}

// Helper function to check if staff role is primary
export function isPrimaryRole(role: StaffRole): boolean {
  return role === 'primary';
}

// Helper function to check if staff role is assistant
export function isAssistantRole(role: StaffRole): boolean {
  return role === 'assistant';
}

// Helper function to check if staff role is driver
export function isDriverRole(role: StaffRole): boolean {
  return role === 'driver';
}

// Helper function to check if staff role is backup
export function isBackupRole(role: StaffRole): boolean {
  return role === 'backup';
}

// Helper function to get valid roles for appointment type
export function getValidRolesForAppointmentType(appointmentType: string): StaffRole[] {
  switch (appointmentType) {
    case 'doctor_on_call':
      return ['primary', 'assistant'];
    case 'lab_test':
      return ['primary'];
    case 'teleconsultation':
      return ['primary'];
    case 'physiotherapy':
      return ['primary'];
    case 'caregiver':
      return ['primary', 'backup'];
    case 'iv_therapy':
      return ['primary', 'assistant'];
    default:
      return ['assistant'];
  }
}

// Helper function to get required staff types for appointment type
export function getRequiredStaffTypesForAppointmentType(appointmentType: string): {
  primary: string[];
  assistant?: string[];
  backup?: string[];
} {
  switch (appointmentType) {
    case 'doctor_on_call':
      return {
        primary: ['doctor'],
        assistant: ['nurse'],
      };
    case 'lab_test':
      return {
        primary: ['nurse'],
      };
    case 'teleconsultation':
      return {
        primary: ['doctor'],
      };
    case 'physiotherapy':
      return {
        primary: ['physiotherapist'],
      };
    case 'caregiver':
      return {
        primary: ['caregiver'],
        backup: ['caregiver'],
      };
    case 'iv_therapy':
      return {
        primary: ['nurse'],
        assistant: ['doctor'],
      };
    default:
      return {
        primary: ['doctor', 'nurse', 'physiotherapist', 'caregiver'],
      };
  }
}

// Helper function to validate staff assignment for appointment type
export function validateStaffAssignmentForAppointmentType(
  appointmentType: string,
  staffType: string,
  role: StaffRole,
): boolean {
  const requiredTypes = getRequiredStaffTypesForAppointmentType(appointmentType);

  switch (role) {
    case 'primary':
      return requiredTypes.primary.includes(staffType);
    case 'assistant':
      return requiredTypes.assistant?.includes(staffType) || false;
    case 'backup':
      return requiredTypes.backup?.includes(staffType) || false;
    case 'driver':
      return staffType === 'driver';
    default:
      return false;
  }
}

// Helper function to get appointment staff summary
export function getAppointmentStaffSummary(appointmentStaff: AppointmentStaffWithDetails[]): {
  primary?: AppointmentStaffWithDetails;
  assistants: AppointmentStaffWithDetails[];
  drivers: AppointmentStaffWithDetails[];
  backups: AppointmentStaffWithDetails[];
} {
  const primary = appointmentStaff.find(as => as.is_primary);
  const assistants = appointmentStaff.filter(as => as.role === 'assistant');
  const drivers = appointmentStaff.filter(as => as.role === 'driver');
  const backups = appointmentStaff.filter(as => as.role === 'backup');

  return {
    primary,
    assistants,
    drivers,
    backups,
  };
}
