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

  staff_type: z.enum(['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician']),

  specialization: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || val.length <= 100, {
      message: 'Specialization must be less than 100 characters'
    }),

  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format')
    .min(8, 'Phone number must be at least 8 digits')
    .max(20, 'Phone number must be less than 20 characters'),

  email: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
      message: 'Invalid email format'
    })
    .refine((val) => !val || val === '' || val.length <= 255, {
      message: 'Email must be less than 255 characters'
    }),

  telegram_user_id: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || /^\d+$/.test(val), {
      message: 'Telegram user ID must be numeric'
    })
    .refine((val) => !val || val === '' || val.length <= 20, {
      message: 'Telegram user ID must be less than 20 characters'
    }),

  status: z.enum(['active', 'inactive']),

  telegram_verified: z.boolean().default(false),
});

// Staff update form schema (all fields optional)
export const staffUpdateFormSchema = staffFormSchema.partial();

// Staff search form schema
export const staffSearchFormSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  staff_type: z.enum(['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  available_on_day: z.number().min(1).max(7).optional(),
});

// Staff filter form schema
export const staffFilterFormSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  staff_type: z.enum(['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  available_on_day: z.number().min(1).max(7).optional(),
});

// Type exports
export type StaffFormData = z.infer<typeof staffFormSchema>;
export type StaffUpdateFormData = z.infer<typeof staffUpdateFormSchema>;
export type StaffSearchFormData = z.infer<typeof staffSearchFormSchema>;
export type StaffFilterFormData = z.infer<typeof staffFilterFormSchema>;
