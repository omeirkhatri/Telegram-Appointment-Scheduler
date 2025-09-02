import type { AppointmentType } from '@/types/appointment';

// Duration constraints by appointment type (in minutes)
export const APPOINTMENT_TYPE_DURATION_CONSTRAINTS: Record<AppointmentType, {
  min: number;
  max: number;
  allowedValues?: number[];
}> = {
  doctor_on_call: {
    min: 30,
    max: 90,
    allowedValues: [30, 45, 60, 90]
  },
  lab_test: {
    min: 15,
    max: 45,
    allowedValues: [15, 30, 45]
  },
  teleconsultation: {
    min: 15,
    max: 60,
    allowedValues: [15, 30, 45, 60]
  },
  physiotherapy: {
    min: 45,
    max: 120,
    allowedValues: [45, 60, 90, 120]
  },
  caregiver: {
    min: 120, // 2 hours
    max: 1440, // 24 hours
    allowedValues: [120, 240, 360, 480, 720, 1440] // 2, 4, 6, 8, 12, 24 hours
  },
  iv_therapy: {
    min: 60, // 1 hour
    max: 240, // 4 hours
    allowedValues: [60, 120, 180, 240] // 1, 2, 3, 4 hours
  }
};

// Color mapping for appointment types (consistent across all components)
export const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, {
  primary: string;
  light: string;
  text: string;
  border: string;
}> = {
  doctor_on_call: {
    primary: '#3B82F6', // Blue
    light: '#DBEAFE',
    text: '#1E40AF',
    border: '#93C5FD'
  },
  lab_test: {
    primary: '#10B981', // Green
    light: '#D1FAE5',
    text: '#047857',
    border: '#6EE7B7'
  },
  teleconsultation: {
    primary: '#8B5CF6', // Purple
    light: '#EDE9FE',
    text: '#6D28D9',
    border: '#C4B5FD'
  },
  physiotherapy: {
    primary: '#F59E0B', // Amber
    light: '#FEF3C7',
    text: '#D97706',
    border: '#FCD34D'
  },
  caregiver: {
    primary: '#EF4444', // Red
    light: '#FEE2E2',
    text: '#DC2626',
    border: '#FCA5A5'
  },
  iv_therapy: {
    primary: '#06B6D4', // Cyan
    light: '#CFFAFE',
    text: '#0891B2',
    border: '#67E8F9'
  }
};

// Helper function to get duration constraints for an appointment type
export function getDurationConstraints(appointmentType: AppointmentType) {
  return APPOINTMENT_TYPE_DURATION_CONSTRAINTS[appointmentType];
}

// Helper function to validate duration for an appointment type
export function validateDurationForType(appointmentType: AppointmentType, durationMinutes: number): {
  isValid: boolean;
  error?: string;
} {
  const constraints = getDurationConstraints(appointmentType);

  if (durationMinutes < constraints.min) {
    return {
      isValid: false,
      error: `Duration must be at least ${constraints.min} minutes for ${appointmentType.replace('_', ' ')} appointments`
    };
  }

  if (durationMinutes > constraints.max) {
    return {
      isValid: false,
      error: `Duration cannot exceed ${constraints.max} minutes for ${appointmentType.replace('_', ' ')} appointments`
    };
  }

  // If allowedValues is specified, check if the duration is in the allowed list
  if (constraints.allowedValues && !constraints.allowedValues.includes(durationMinutes)) {
    const allowedList = constraints.allowedValues.map(min => {
      if (min >= 60) {
        const hours = min / 60;
        return hours === 1 ? '1 hour' : `${hours} hours`;
      }
      return `${min} minutes`;
    }).join(', ');

    return {
      isValid: false,
      error: `Duration must be one of: ${allowedList} for ${appointmentType.replace('_', ' ')} appointments`
    };
  }

  return { isValid: true };
}

// Helper function to get color for an appointment type
export function getAppointmentTypeColor(appointmentType: AppointmentType, variant: 'primary' | 'light' | 'text' | 'border' = 'primary') {
  return APPOINTMENT_TYPE_COLORS[appointmentType][variant];
}

// Helper function to get all allowed duration values for an appointment type
export function getAllowedDurations(appointmentType: AppointmentType): number[] {
  const constraints = getDurationConstraints(appointmentType);
  return constraints.allowedValues || [];
}

// Helper function to format duration for display
export function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${minutes} minutes`;
}
