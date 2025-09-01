import { z } from 'zod';

// Base appointment form validation schema
export const appointmentFormSchema = z.object({
  patient_id: z
    .string()
    .min(1, 'Patient is required')
    .uuid('Invalid patient ID'),
  
  appointment_type: z.enum(['doctor_on_call', 'lab_test', 'teleconsultation', 'physiotherapy', 'caregiver', 'iv_therapy'], {
    required_error: 'Appointment type is required',
  }),
  
  appointment_date: z
    .string()
    .min(1, 'Appointment date is required')
    .refine((date) => {
      const appointmentDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return appointmentDate >= today;
    }, 'Appointment date must be today or in the future'),
  
  start_time: z
    .string()
    .min(1, 'Start time is required')
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  
  duration_minutes: z
    .number()
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration cannot exceed 24 hours'),
  
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).default('scheduled'),
  
  transportation_type: z.enum(['driver', 'self_transport']).optional(),
  
  transportation_method: z.string().optional(),
  
  driver_id: z.string().uuid('Invalid driver ID').optional(),
  
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  
  // Custom fields based on appointment type
  custom_fields: z.record(z.unknown()).optional(),
  
  // Recurring rule
  recurring_rule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1, 'Interval must be at least 1'),
    end_date: z.string().optional(),
    end_occurrences: z.number().min(1).optional(),
    days_of_week: z.array(z.number().min(1).max(7)).optional(),
    day_of_month: z.number().min(1).max(31).optional(),
    month_of_year: z.number().min(1).max(12).optional(),
  }).optional(),
  
  // Staff assignments
  staff_assignments: z.array(z.object({
    staff_id: z.string().uuid('Invalid staff ID'),
    role: z.enum(['primary', 'assistant', 'driver']),
    is_primary: z.boolean().default(false),
  })).optional(),
}).refine(
  (data) => {
    if (data.transportation_type === 'driver' && !data.driver_id) {
      return false;
    }
    return true;
  },
  {
    message: 'Driver ID is required when transportation type is driver',
    path: ['driver_id'],
  }
).refine(
  (data) => {
    if (data.transportation_type === 'self_transport' && !data.transportation_method) {
      return false;
    }
    return true;
  },
  {
    message: 'Transportation method is required when transportation type is self-transport',
    path: ['transportation_method'],
  }
);

// Appointment update form schema (all fields optional)
export const appointmentUpdateFormSchema = appointmentFormSchema.partial().refine(
  (data) => {
    if (data.appointment_date) {
      const appointmentDate = new Date(data.appointment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return appointmentDate >= today;
    }
    return true;
  },
  {
    message: 'Appointment date must be today or in the future',
    path: ['appointment_date'],
  }
).refine(
  (data) => {
    if (data.transportation_type === 'driver' && !data.driver_id) {
      return false;
    }
    return true;
  },
  {
    message: 'Driver ID is required when transportation type is driver',
    path: ['driver_id'],
  }
).refine(
  (data) => {
    if (data.transportation_type === 'self_transport' && !data.transportation_method) {
      return false;
    }
    return true;
  },
  {
    message: 'Transportation method is required when transportation type is self-transport',
    path: ['transportation_method'],
  }
);

// Appointment search form schema
export const appointmentSearchFormSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID').optional(),
  appointment_type: z.enum(['doctor_on_call', 'lab_test', 'teleconsultation', 'physiotherapy', 'caregiver', 'iv_therapy']).optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).optional(),
  appointment_date: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  driver_id: z.string().uuid('Invalid driver ID').optional(),
  transportation_type: z.enum(['driver', 'self_transport']).optional(),
  has_recurring_rule: z.boolean().optional(),
});

// Appointment filter form schema
export const appointmentFilterFormSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID').optional(),
  appointment_type: z.enum(['doctor_on_call', 'lab_test', 'teleconsultation', 'physiotherapy', 'caregiver', 'iv_therapy']).optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).optional(),
  appointment_date: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  driver_id: z.string().uuid('Invalid driver ID').optional(),
  transportation_type: z.enum(['driver', 'self_transport']).optional(),
  has_recurring_rule: z.boolean().optional(),
});

// Staff assignment form schema
export const staffAssignmentFormSchema = z.object({
  staff_assignments: z.array(z.object({
    staff_id: z.string().uuid('Invalid staff ID'),
    role: z.enum(['primary', 'assistant', 'driver']),
    is_primary: z.boolean().default(false),
  })).min(1, 'At least one staff member must be assigned'),
});

// Type exports
export type AppointmentFormData = z.infer<typeof appointmentFormSchema>;
export type AppointmentUpdateFormData = z.infer<typeof appointmentUpdateFormSchema>;
export type AppointmentSearchFormData = z.infer<typeof appointmentSearchFormSchema>;
export type AppointmentFilterFormData = z.infer<typeof appointmentFilterFormSchema>;
export type StaffAssignmentFormData = z.infer<typeof staffAssignmentFormSchema>;
