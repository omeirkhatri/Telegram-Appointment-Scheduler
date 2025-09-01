import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address')
export const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits')
export const nameSchema = z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters')

// Patient validation schema
export const patientSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  date_of_birth: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime()) && parsed < new Date()
  }, 'Invalid date of birth'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  emergency_contact: z.string().min(10, 'Emergency contact must be at least 10 characters'),
  medical_history: z.string().optional(),
  id_document: z.instanceof(File).optional(),
})

// Staff validation schema
export const staffSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  staff_type: z.enum(['driver', 'medical']),
  google_calendar_id: z.string().optional(),
  is_active: z.boolean().default(true),
})

// Appointment validation schema
export const appointmentSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  appointment_type: z.enum(['consultation', 'follow_up', 'emergency', 'routine']),
  start_time: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Invalid start time'),
  end_time: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Invalid end time'),
  notes: z.string().optional(),
  staff_ids: z.array(z.string().uuid('Invalid staff ID')).min(1, 'At least one staff member is required'),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
  recurring_rule: z.record(z.string(), z.unknown()).optional(),
}).refine((data) => {
  const start = new Date(data.start_time)
  const end = new Date(data.end_time)
  return end > start
}, {
  message: 'End time must be after start time',
  path: ['end_time']
})

// Form validation schemas
export const patientFormSchema = patientSchema
export const staffFormSchema = staffSchema
export const appointmentFormSchema = appointmentSchema

// Type exports
export type PatientFormData = z.infer<typeof patientFormSchema>
export type StaffFormData = z.infer<typeof staffFormSchema>
export type AppointmentFormData = z.infer<typeof appointmentFormSchema>

// Validation helper functions
export function validatePatient(data: unknown): PatientFormData {
  return patientFormSchema.parse(data)
}

export function validateStaff(data: unknown): StaffFormData {
  return staffFormSchema.parse(data)
}

export function validateAppointment(data: unknown): AppointmentFormData {
  return appointmentFormSchema.parse(data)
}

// Safe validation functions that return errors instead of throwing
export function safeValidatePatient(data: unknown): { success: true; data: PatientFormData } | { success: false; errors: z.ZodError } {
  const result = patientFormSchema.safeParse(data)
  return result.success 
    ? { success: true, data: result.data }
    : { success: false, errors: result.error }
}

export function safeValidateStaff(data: unknown): { success: true; data: StaffFormData } | { success: false; errors: z.ZodError } {
  const result = staffFormSchema.safeParse(data)
  return result.success 
    ? { success: true, data: result.data }
    : { success: false, errors: result.error }
}

export function safeValidateAppointment(data: unknown): { success: true; data: AppointmentFormData } | { success: false; errors: z.ZodError } {
  const result = appointmentFormSchema.safeParse(data)
  return result.success 
    ? { success: true, data: result.data }
    : { success: false, errors: result.error }
}

// Error formatting helper
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}
  
  error.issues.forEach((err) => {
    const path = err.path.join('.')
    formatted[path] = err.message
  })
  
  return formatted
}
