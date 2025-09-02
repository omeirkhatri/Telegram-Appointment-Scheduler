import { z } from 'zod';

// Patient form validation schema
export const patientFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),

  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format')
    .min(8, 'Phone number must be at least 8 digits')
    .max(20, 'Phone number must be less than 20 characters'),

  flat_villa_no: z
    .string()
    .min(1, 'Flat/Villa number is required')
    .max(50, 'Flat/Villa number must be less than 50 characters'),

  building_street: z
    .string()
    .min(1, 'Building/Street is required')
    .max(200, 'Building/Street must be less than 200 characters'),

  area: z
    .string()
    .min(1, 'Area is required')
    .max(100, 'Area must be less than 100 characters'),

  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be less than 100 characters'),

  google_maps_link: z
    .string()
    .url('Invalid Google Maps URL')
    .optional()
    .or(z.literal('')),

  medical_notes: z
    .string()
    .max(1000, 'Medical notes must be less than 1000 characters')
    .optional()
    .or(z.literal('')),

  emergency_contact: z
    .string()
    .max(200, 'Emergency contact must be less than 200 characters')
    .optional()
    .or(z.literal('')),

  preferred_transport: z
    .string()
    .max(100, 'Preferred transport must be less than 100 characters')
    .optional()
    .or(z.literal('')),

  id_document: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'image/webp'].includes(file.type),
      'File must be JPEG, PNG, GIF, PDF, or WebP'
    )
    .optional(),
});

// Patient update form schema (all fields optional)
export const patientUpdateFormSchema = patientFormSchema.partial();

// Patient search form schema
export const patientSearchFormSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  has_id_document: z.boolean().optional(),
});

// Patient filter form schema
export const patientFilterFormSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  has_id_document: z.boolean().optional(),
});

// Type exports
export type PatientFormData = z.infer<typeof patientFormSchema>;
export type PatientUpdateFormData = z.infer<typeof patientUpdateFormSchema>;
export type PatientSearchFormData = z.infer<typeof patientSearchFormSchema>;
export type PatientFilterFormData = z.infer<typeof patientFilterFormSchema>;
