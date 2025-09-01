import { z } from 'zod';

// Staff form validation schema
export const staffFormSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
  
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),
  
  staff_type: z.enum(['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician'], {
    required_error: 'Staff type is required',
  }),
  
  specialization: z
    .string()
    .max(100, 'Specialization must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format')
    .min(8, 'Phone number must be at least 8 digits')
    .max(20, 'Phone number must be less than 20 characters'),
  
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(100, 'Email must be less than 100 characters'),
  
  google_calendar_id: z
    .string()
    .email('Invalid Google Calendar ID format')
    .optional()
    .or(z.literal('')),
  
  available_days: z
    .array(z.number().min(1).max(7))
    .min(1, 'At least one available day is required')
    .max(7, 'Cannot select more than 7 days'),
  
  working_hours_start: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  
  working_hours_end: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  
  status: z.enum(['active', 'inactive'], {
    required_error: 'Status is required',
  }),
  
  email_notifications_enabled: z.boolean().default(true),
}).refine(
  (data) => {
    const startTime = new Date(`2000-01-01T${data.working_hours_start}:00`);
    const endTime = new Date(`2000-01-01T${data.working_hours_end}:00`);
    return startTime < endTime;
  },
  {
    message: 'Working hours start must be before end time',
    path: ['working_hours_end'],
  }
);

// Staff update form schema (all fields optional)
export const staffUpdateFormSchema = staffFormSchema.partial().refine(
  (data) => {
    if (data.working_hours_start && data.working_hours_end) {
      const startTime = new Date(`2000-01-01T${data.working_hours_start}:00`);
      const endTime = new Date(`2000-01-01T${data.working_hours_end}:00`);
      return startTime < endTime;
    }
    return true;
  },
  {
    message: 'Working hours start must be before end time',
    path: ['working_hours_end'],
  }
);

// Staff search form schema
export const staffSearchFormSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  staff_type: z.enum(['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  has_google_calendar: z.boolean().optional(),
  available_on_day: z.number().min(1).max(7).optional(),
});

// Staff filter form schema
export const staffFilterFormSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  staff_type: z.enum(['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  has_google_calendar: z.boolean().optional(),
  available_on_day: z.number().min(1).max(7).optional(),
});

// Google Calendar validation schema
export const googleCalendarValidationSchema = z.object({
  calendar_id: z
    .string()
    .min(1, 'Calendar ID is required')
    .email('Invalid Google Calendar ID format'),
});

// Type exports
export type StaffFormData = z.infer<typeof staffFormSchema>;
export type StaffUpdateFormData = z.infer<typeof staffUpdateFormSchema>;
export type StaffSearchFormData = z.infer<typeof staffSearchFormSchema>;
export type StaffFilterFormData = z.infer<typeof staffFilterFormSchema>;
export type GoogleCalendarValidationData = z.infer<typeof googleCalendarValidationSchema>;
