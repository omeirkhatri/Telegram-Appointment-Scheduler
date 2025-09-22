// Staff types based on database schema
export type StaffType = 'doctor' | 'nurse' | 'physiotherapist' | 'caregiver' | 'driver' | 'lab_technician';
export type StaffStatus = 'active' | 'inactive';
export type CalendarVerificationStatus = 'pending' | 'verified' | 'failed' | 'not_required';

export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  staff_type: StaffType;
  specialization?: string;
  phone: string;
  email: string;
  status: StaffStatus;
  telegram_user_id?: string;
  telegram_verified?: boolean;
  available_days?: number[];
  working_hours_start?: string;
  working_hours_end?: string;
  google_calendar_id?: string;
  calendar_verification_status?: CalendarVerificationStatus;
  calendar_verification_date?: string;
  calendar_error_code?: string;
  created_at: string;
  updated_at: string;
}

// Staff creation type (without id and timestamps)
export interface CreateStaff {
  first_name: string;
  last_name: string;
  staff_type: StaffType;
  specialization?: string;
  phone: string;
  email: string;
  status?: StaffStatus;
  available_days?: number[];
  working_hours_start?: string;
  working_hours_end?: string;
  google_calendar_id?: string;
  calendar_verification_status?: CalendarVerificationStatus;
  calendar_verification_date?: string;
  calendar_error_code?: string;
}

// Staff update type (all fields optional)
export interface UpdateStaff {
  first_name?: string;
  last_name?: string;
  staff_type?: StaffType;
  specialization?: string;
  phone?: string;
  email?: string;
  status?: StaffStatus;
  telegram_user_id?: string;
  telegram_verified?: boolean;
  available_days?: number[];
  working_hours_start?: string;
  working_hours_end?: string;
  google_calendar_id?: string;
  calendar_verification_status?: CalendarVerificationStatus;
  calendar_verification_date?: string;
  calendar_error_code?: string;
}

// Staff search/filter options
export interface StaffFilters {
  first_name?: string;
  last_name?: string;
  staff_type?: StaffType;
  status?: StaffStatus;
  available_on_day?: number; // 1-7
}

// Staff name type for convenience
export interface StaffName {
  first_name: string;
  last_name: string;
}

// Helper function to get full name
export function getStaffFullName(staff: Staff | StaffName): string {
  return `${staff.first_name} ${staff.last_name}`;
}

// Helper function to validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

// Helper function to validate phone number
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[+]?[0-9\s\-\(\)]+$/;
  return phoneRegex.test(phone);
}

// Helper function to validate available days
export function isValidAvailableDays(days: number[]): boolean {
  return days.every(day => day >= 1 && day <= 7);
}

// Helper function to validate working hours
export function isValidWorkingHours(start: string, end: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(start) || !timeRegex.test(end)) {
    return false;
  }

  const startTime = new Date(`2000-01-01T${start}:00`);
  const endTime = new Date(`2000-01-01T${end}:00`);

  return startTime < endTime;
}

// Helper function to validate required fields
export function validateStaffData(data: CreateStaff): string[] {
  const errors: string[] = [];

  if (!data.first_name?.trim()) {
    errors.push('First name is required');
  }

  if (!data.last_name?.trim()) {
    errors.push('Last name is required');
  }

  if (!data.phone?.trim()) {
    errors.push('Phone number is required');
  } else if (!isValidPhoneNumber(data.phone)) {
    errors.push('Invalid phone number format');
  }

  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (data.available_days && !isValidAvailableDays(data.available_days)) {
    errors.push('Invalid available days (must be 1-7)');
  }

  if (data.working_hours_start && data.working_hours_end) {
    if (!isValidWorkingHours(data.working_hours_start, data.working_hours_end)) {
      errors.push('Invalid working hours (start must be before end)');
    }
  }

  return errors;
}

// Helper function to check if staff is available on a specific day
export function isStaffAvailableOnDay(staff: Staff, day: number): boolean {
  return staff.available_days.includes(day);
}

// Helper function to get staff working hours as formatted string
export function getStaffWorkingHours(staff: Staff): string {
  return `${staff.working_hours_start} - ${staff.working_hours_end}`;
}

// Helper function to get available days as readable string
export function getAvailableDaysString(days: number[]): string {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(day => dayNames[day - 1]).join(', ');
}
