import type { StaffRole } from './appointmentStaff';

// Bulk copy pattern types
export type BulkCopyPattern = 'daily' | 'weekly' | 'monthly' | 'custom';

// Bulk copy configuration
export interface BulkCopyConfig {
  pattern: BulkCopyPattern;
  interval: number; // Every X days/weeks/months
  occurrences: number; // Number of copies to create
  startDate: string; // Start date for the pattern (ISO date string)
  endDate?: string; // Optional end date
  daysOfWeek?: number[]; // For weekly patterns (1-7, Monday-Sunday)
  customDates?: string[]; // For custom patterns (array of ISO date strings)
}

// Bulk copy request payload
export interface BulkCopyRequest {
  sourceAppointmentId: string;
  config: BulkCopyConfig;
  staffAssignments?: Array<{
    staff_id: string;
    role: StaffRole;
    is_primary: boolean;
  }>;
  overrideConflicts?: boolean;
  user_id?: string;
  notes?: string;
}

// Bulk copy result
export interface BulkCopyResult {
  success: boolean;
  createdAppointments: Array<{
    id: string;
    appointment_date: string;
    start_time: string;
  }>;
  conflicts: Array<{
    date: string;
    conflicts: any[];
  }>;
  errors: Array<{
    date: string;
    error: string;
  }>;
  totalRequested: number;
  totalCreated: number;
  totalConflicts: number;
  totalErrors: number;
}

// Bulk copy progress (for UI)
export interface BulkCopyProgress {
  current: number;
  total: number;
  currentDate: string;
  status: 'preparing' | 'creating' | 'completed' | 'error';
  message: string;
}
