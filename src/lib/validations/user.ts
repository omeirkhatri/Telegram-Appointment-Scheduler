import { z } from 'zod';

// User role schema
export const userRoleSchema = z.enum(['admin', 'manager']);

// User profile form schema
export const userProfileFormSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  full_name: z
    .string({ required_error: 'Full name is required' })
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  role: userRoleSchema.default('manager'),
  is_active: z.boolean().default(true),
});

// User profile update schema (all fields optional)
export const userProfileUpdateSchema = userProfileFormSchema.partial();

// User filters schema
export const userFiltersSchema = z.object({
  role: z.array(userRoleSchema).optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
});

// Type exports
export type UserProfileFormData = z.infer<typeof userProfileFormSchema>;
export type UserProfileUpdateData = z.infer<typeof userProfileUpdateSchema>;
export type UserFiltersData = z.infer<typeof userFiltersSchema>;



