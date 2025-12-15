-- Rollback Migration: Remove Transportation Segments Feature
-- This migration removes all transportation segments related schema changes
-- to align the database with commit 076572d (before driver scheduler implementation)

-- Step 1: Drop indexes related to driver assignment status
DROP INDEX IF EXISTS idx_appointments_driver_assignment_status_window;
DROP INDEX IF EXISTS idx_appointments_driver_assignment_status;

-- Step 2: Remove driver_assignment_status column from appointments table
ALTER TABLE appointments
  DROP COLUMN IF EXISTS driver_assignment_status;

-- Step 3: Drop the driver_assignment_status enum type
DROP TYPE IF EXISTS driver_assignment_status_enum;

-- Step 4: Drop transportation_segments table (this will cascade to related constraints)
DROP TABLE IF EXISTS transportation_segments CASCADE;

-- Step 5: Drop transportation segment related enums
DROP TYPE IF EXISTS transportation_segment_assignment_mode_enum;
DROP TYPE IF EXISTS transportation_segment_status_enum;
DROP TYPE IF EXISTS transportation_segment_type_enum;

-- Step 6: Remove any remaining indexes or constraints related to transportation segments
-- (These should be dropped automatically with the table, but included for safety)

-- Note: This migration is idempotent - it can be run multiple times safely
-- All DROP statements use IF EXISTS to prevent errors if objects don't exist
