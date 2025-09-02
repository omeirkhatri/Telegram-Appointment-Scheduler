import { z } from 'zod';

// Base validation schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^[+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format');
export const timeSchema = z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)');
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

// Patient validation schemas
export const patientInsertSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  phone: phoneSchema,
  id_document_url: z.string().url().nullable().optional(),
  id_document_filename: z.string().nullable().optional(),
  flat_villa_no: z.string().min(1, 'Flat/Villa number is required'),
  building_street: z.string().min(1, 'Building/Street is required'),
  area: z.string().min(1, 'Area is required'),
  city: z.string().min(1, 'City is required'),
  google_maps_link: z.string().url().nullable().optional(),
  medical_notes: z.string().nullable().optional(),
  emergency_contact: z.string().nullable().optional(),
  preferred_transport: z.string().nullable().optional(),
});

export const patientUpdateSchema = patientInsertSchema.partial();

// Staff validation schemas
export const staffInsertSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(255, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(255, 'Last name too long'),
  staff_type: z.enum(['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician'] as const),
  specialization: z.string().nullable().optional(),
  phone: phoneSchema,
  email: emailSchema,
  google_calendar_id: z.string().nullable().optional(),
  available_days: z.array(z.number().int().min(1).max(7)).min(1, 'At least one available day required'),
  working_hours_start: timeSchema,
  working_hours_end: timeSchema,
  status: z.enum(['active', 'inactive'] as const).default('active'),
  email_notifications_enabled: z.boolean().default(true),
}).refine(
  (data) => data.working_hours_start < data.working_hours_end,
  { message: 'Working hours start must be before end', path: ['working_hours_end'] }
);

export const staffUpdateSchema = staffInsertSchema.partial();

// Appointment validation schemas
export const appointmentInsertSchema = z.object({
  patient_id: uuidSchema,
  appointment_type: z.enum(['doctor_on_call', 'lab_test', 'teleconsultation', 'physiotherapy', 'caregiver', 'iv_therapy'] as const),
  appointment_date: dateSchema,
  start_time: timeSchema,
  duration_minutes: z.number().int().min(1).max(1440, 'Duration must be between 1 minute and 24 hours'),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled'] as const).default('scheduled'),
  custom_fields: z.record(z.unknown()).default({}),
  transportation_type: z.enum(['driver', 'self_transport'] as const).nullable().optional(),
  transportation_method: z.string().nullable().optional(),
  driver_id: uuidSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  recurring_rule: z.record(z.unknown()).nullable().optional(),
  google_event_ids: z.record(z.string()).default({}),
}).refine(
  (data) => {
    if (data.transportation_type === 'driver') {
      return data.driver_id != null;
    }
    if (data.transportation_type === 'self_transport') {
      return data.transportation_method != null;
    }
    return true;
  },
  { message: 'Driver ID required when transportation type is driver, or method required for self-transport', path: ['transportation_type'] }
).refine(
  (data) => {
    if (data.recurring_rule) {
      return data.recurring_rule.frequency && data.recurring_rule.interval;
    }
    return true;
  },
  { message: 'Recurring rule must include frequency and interval', path: ['recurring_rule'] }
);

export const appointmentUpdateSchema = appointmentInsertSchema.partial();

// Appointment staff validation schemas
export const appointmentStaffInsertSchema = z.object({
  appointment_id: uuidSchema,
  staff_id: uuidSchema,
  role: z.enum(['primary', 'assistant'] as const).default('assistant'),
  is_primary: z.boolean().default(false),
  google_event_id: z.string().nullable().optional(),
});

export const appointmentStaffUpdateSchema = appointmentStaffInsertSchema.partial();

// Query validation schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  ...paginationSchema.shape,
});

export const dateRangeSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
}).refine(
  (data) => data.start_date <= data.end_date,
  { message: 'Start date must be before or equal to end date', path: ['end_date'] }
);

// Filter schemas
export const appointmentFiltersSchema = z.object({
  patient_id: uuidSchema.optional(),
  staff_id: uuidSchema.optional(),
  appointment_type: z.enum(['doctor_on_call', 'lab_test', 'teleconsultation', 'physiotherapy', 'caregiver', 'iv_therapy'] as const).optional(),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled'] as const).optional(),
  transportation_type: z.enum(['driver', 'self_transport'] as const).optional(),
  ...dateRangeSchema.shape,
  ...paginationSchema.shape,
});

export const staffFiltersSchema = z.object({
  staff_type: z.enum(['doctor', 'nurse', 'physiotherapist', 'caregiver', 'driver', 'lab_technician'] as const).optional(),
  status: z.enum(['active', 'inactive'] as const).optional(),
  specialization: z.string().optional(),
  ...paginationSchema.shape,
});

export const patientFiltersSchema = z.object({
  area: z.string().optional(),
  city: z.string().optional(),
  ...paginationSchema.shape,
});

// Response validation schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    totalPages: z.number().int().min(0),
  });

// Export all schemas
export const schemas = {
  patient: { insert: patientInsertSchema, update: patientUpdateSchema },
  staff: { insert: staffInsertSchema, update: staffUpdateSchema },
  appointment: { insert: appointmentInsertSchema, update: appointmentUpdateSchema },
  appointmentStaff: { insert: appointmentStaffInsertSchema, update: appointmentStaffUpdateSchema },
  query: { pagination: paginationSchema, search: searchSchema, dateRange: dateRangeSchema },
  filters: { appointment: appointmentFiltersSchema, staff: staffFiltersSchema, patient: patientFiltersSchema },
  response: { api: apiResponseSchema, paginated: paginatedResponseSchema },
} as const;
