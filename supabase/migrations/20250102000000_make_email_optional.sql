-- Make email field optional in staff table
ALTER TABLE staff ALTER COLUMN email DROP NOT NULL;

-- Remove the email constraint that requires a valid email format
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_email_check;

-- Add a new constraint that only validates email format if email is provided
ALTER TABLE staff ADD CONSTRAINT staff_email_check
CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
