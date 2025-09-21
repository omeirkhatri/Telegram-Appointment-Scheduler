// @ts-nocheck
// Temporary placeholder Supabase schema types to unblock type-checking while the
// Prisma-to-PostgREST migration settles. We intentionally expose Database as
// `any` so that Supabase generics do not collapse result sets to `never`.
// Once the schema stabilises we should replace this with generated typings.
export type Database = any;
