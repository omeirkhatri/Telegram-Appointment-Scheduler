-- Disable the recurring appointments database trigger
-- This migration disables the database trigger and relies on application logic instead

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_generate_recurring_appointments ON appointments;

-- Keep the function for potential future use, but don't use it in a trigger
-- The function is still available if needed for manual recurring appointment generation
