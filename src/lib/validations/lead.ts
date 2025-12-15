import { z } from 'zod';

// Lead stage schema
export const leadStageSchema = z.enum(['new', 'contacted', 'quoted', 'qualified', 'not_qualified', 'converted']);

// Lead status schema
export const leadStatusSchema = z.enum(['active', 'inactive', 'converted']);

// Quote status schema
export const quoteStatusSchema = z.enum(['draft', 'sent', 'accepted', 'rejected']);

// Lead form schema for create/edit
export const leadFormSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .min(1, 'Phone number is required')
    .regex(/^[+]?[0-9\s\-\(\)]+$/, 'Invalid phone number format'),
  whatsapp_number: z
    .string()
    .regex(/^[+]?[0-9\s\-\(\)]+$/, 'Invalid WhatsApp number format')
    .optional()
    .or(z.literal('')),
  has_whatsapp: z.boolean().default(true),
  email: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  service_interested_in: z
    .string()
    .max(255, 'Service must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  flat_villa_no: z
    .string()
    .max(100, 'Flat/Villa number must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  building_street: z
    .string()
    .max(255, 'Building/Street must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  area: z
    .string()
    .max(100, 'Area must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .max(100, 'City must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  google_maps_link: z
    .string()
    .url('Invalid Google Maps link')
    .optional()
    .or(z.literal('')),
  stage: leadStageSchema.default('new'),
  status: leadStatusSchema.default('active'),
  assigned_to_user_id: z.string().uuid('Invalid user ID').optional().or(z.literal('')),
});

// Lead update schema (all fields optional)
export const leadUpdateSchema = leadFormSchema.partial();

// Update lead stage schema
export const updateLeadStageSchema = z.object({
  stage: leadStageSchema,
  reason: z.string().optional(),
});

// Assign lead schema
export const assignLeadSchema = z.object({
  assigned_to_user_id: z.string().uuid('Invalid user ID'),
  reason: z.string().optional(),
});

// Convert lead schema
export const convertLeadSchema = z.object({
  include_notes: z.boolean().default(true),
  include_quotes: z.boolean().default(true),
  patient_data: z.object({
    // Required patient fields that might be missing from lead
    flat_villa_no: z.string().min(1, 'Flat/Villa number is required'),
    building_street: z.string().min(1, 'Building/Street is required'),
    area: z.string().min(1, 'Area is required'),
    city: z.string().min(1, 'City is required'),
    medical_notes: z.string().optional(),
    emergency_contact: z.string().optional(),
    preferred_transport: z.string().optional(),
  }),
});

// Lead filters schema
export const leadFiltersSchema = z.object({
  stage: z.array(leadStageSchema).optional(),
  status: z.array(leadStatusSchema).optional(),
  assigned_to_user_id: z.string().uuid().optional(),
  search: z.string().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  source: z.string().optional(),
});

// Lead note schema
export const leadNoteSchema = z.object({
  note: z
    .string({ required_error: 'Note is required' })
    .min(1, 'Note is required')
    .max(1000, 'Note must be less than 1000 characters'),
  is_pinned: z.boolean().default(false),
});

// Lead quote form schema
export const leadQuoteFormSchema = z.object({
  service_type: z
    .string({ required_error: 'Service type is required' })
    .min(1, 'Service type is required')
    .max(255, 'Service type must be less than 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  amount: z
    .number()
    .min(0, 'Amount cannot be negative')
    .optional(),
  currency: z.string().default('AED'),
  status: quoteStatusSchema.default('draft'),
});

// Update quote status schema
export const updateQuoteStatusSchema = z.object({
  status: quoteStatusSchema,
  reason: z.string().optional(),
});

// Google Sheets sync schema
export const googleSheetsSyncSchema = z.object({
  sheet_id: z.string().min(1, 'Sheet ID is required'),
  range: z.string().default('Sheet1!A:F'),
  force_sync: z.boolean().default(false),
});

// Type exports
export type LeadFormData = z.infer<typeof leadFormSchema>;
export type LeadUpdateData = z.infer<typeof leadUpdateSchema>;
export type UpdateLeadStageData = z.infer<typeof updateLeadStageSchema>;
export type AssignLeadData = z.infer<typeof assignLeadSchema>;
export type ConvertLeadData = z.infer<typeof convertLeadSchema>;
export type LeadFiltersData = z.infer<typeof leadFiltersSchema>;
export type LeadNoteData = z.infer<typeof leadNoteSchema>;
export type LeadQuoteFormData = z.infer<typeof leadQuoteFormSchema>;
export type UpdateQuoteStatusData = z.infer<typeof updateQuoteStatusSchema>;
export type GoogleSheetsSyncData = z.infer<typeof googleSheetsSyncSchema>;
