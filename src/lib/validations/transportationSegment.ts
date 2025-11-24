import { z } from 'zod';

import { uuidSchema } from './supabase';

export const transportationSegmentTypeSchema = z.enum([
  'pickup',
  'dropoff',
  'stay_with_staff',
  'metro_assist',
  'custom',
] as const);

export const transportationSegmentStatusSchema = z.enum([
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const);

export const transportationSegmentAssignmentModeSchema = z.enum([
  'assign_now',
  'assign_later',
] as const);

export const transportationQueueEscalationStateSchema = z.enum([
  'normal',
  'escalated',
] as const);

const isoDateTimeStringSchema = z
  .string()
  .min(1, 'Timestamp is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO date-time string');

export const transportationSegmentLocationSchema = z.object({
  lat: z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  lng: z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  address: z
    .string()
    .max(255, 'Address must be 255 characters or less')
    .optional()
    .or(z.literal('')),
  landmark: z
    .string()
    .max(255, 'Landmark must be 255 characters or less')
    .optional()
    .or(z.literal('')),
});

const sharedTransportationSegmentFields = {
  title: z
    .string()
    .max(120, 'Title must be 120 characters or less')
    .optional()
    .or(z.literal('')),
  planned_start: isoDateTimeStringSchema.optional(),
  planned_end: isoDateTimeStringSchema.optional(),
  driver_id: z
    .string()
    .uuid('Invalid driver ID')
    .optional()
    .or(z.literal('')),
  travel_mode: z
    .string()
    .max(40, 'Travel mode must be 40 characters or less')
    .optional()
    .or(z.literal('')),
  pickup_location: transportationSegmentLocationSchema.optional(),
  patient_location: transportationSegmentLocationSchema.optional(),
  estimated_travel_minutes: z
    .number()
    .int('Travel minutes must be an integer')
    .min(0, 'Travel minutes cannot be negative')
    .max(1440, 'Travel minutes cannot exceed 24 hours')
    .optional(),
  estimated_distance_km: z
    .number()
    .min(0, 'Distance cannot be negative')
    .max(10000, 'Distance appears too large')
    .optional(),
  buffer_minutes: z
    .number()
    .int('Buffer minutes must be an integer')
    .min(0, 'Buffer cannot be negative')
    .max(360, 'Buffer minutes cannot exceed 6 hours')
    .optional(),
  instructions: z
    .string()
    .max(2000, 'Instructions must be 2000 characters or less')
    .optional()
    .or(z.literal('')),
  requires_follow_up: z.boolean().optional(),
  status: transportationSegmentStatusSchema.optional(),
  manual_override: z.boolean().optional(),
  // New assignment mode fields
  assignment_mode: transportationSegmentAssignmentModeSchema.optional(),
  priority: z
    .number()
    .int('Priority must be an integer')
    .min(0, 'Priority cannot be negative')
    .max(100, 'Priority cannot exceed 100')
    .nullable()
    .optional(),
  recommended_driver_ids: z
    .array(z.string().uuid('Invalid driver ID'))
    .max(10, 'Cannot recommend more than 10 drivers')
    .optional(),
  recommendation_metadata: z
    .record(z.unknown())
    .optional(),
  queue_rank: z
    .number()
    .int('Queue rank must be an integer')
    .min(0, 'Queue rank cannot be negative')
    .nullable()
    .optional(),
  escalation_state: transportationQueueEscalationStateSchema.optional(),
  escalation_deadline: isoDateTimeStringSchema.nullable().optional(),
} as const;

const withTransportationSegmentFormRefinements = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  schema.superRefine((data, ctx) => {
    if (data.planned_start && data.planned_end) {
      const start = Date.parse(data.planned_start);
      const end = Date.parse(data.planned_end);

      if (Number.isNaN(start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid planned start timestamp',
          path: ['planned_start'],
        });
      }

      if (Number.isNaN(end)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid planned end timestamp',
          path: ['planned_end'],
        });
      }

      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Planned end must be after planned start',
          path: ['planned_end'],
        });
      }
    }

    if (data.title && data.title.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Title cannot be empty',
        path: ['title'],
      });
    }

    if (data.travel_mode && data.travel_mode.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Travel mode cannot be empty',
        path: ['travel_mode'],
      });
    }
  });

export const transportationSegmentFormSchema = withTransportationSegmentFormRefinements(
  z.object({
    ...sharedTransportationSegmentFields,
    appointment_id: uuidSchema,
    segment_type: transportationSegmentTypeSchema,
    status: transportationSegmentStatusSchema.default('draft'),
    requires_follow_up: z.boolean().default(false).optional(),
  }),
);

export const transportationSegmentUpdateFormSchema = withTransportationSegmentFormRefinements(
  z.object({
    ...sharedTransportationSegmentFields,
    id: uuidSchema,
    appointment_id: uuidSchema.optional(),
    segment_type: transportationSegmentTypeSchema.optional(),
  }),
);

export const transportationSegmentFiltersSchema = z.object({
  appointment_id: uuidSchema.optional(),
  driver_id: uuidSchema.optional(),
  segment_type: transportationSegmentTypeSchema.optional(),
  status: transportationSegmentStatusSchema.optional(),
  requires_follow_up: z.boolean().optional(),
  // New filter options
  assignment_mode: transportationSegmentAssignmentModeSchema.optional(),
  unassigned_only: z.boolean().optional(),
  start_after: isoDateTimeStringSchema.optional(),
  start_before: isoDateTimeStringSchema.optional(),
});

// Driver capacity API validation schema
export const driverCapacityQuerySchema = z.object({
  start_date: isoDateTimeStringSchema.optional(),
  end_date: isoDateTimeStringSchema.optional(),
  window_hours: z
    .number()
    .int('Window hours must be an integer')
    .min(24, 'Window hours must be at least 24')
    .max(72, 'Window hours cannot exceed 72')
    .default(24),
  include_unassigned: z.boolean().default(false),
  service_line: z.string().max(100, 'Service line name too long').optional(),
});
