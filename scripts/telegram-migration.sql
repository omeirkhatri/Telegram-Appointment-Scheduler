-- Telegram Bot Integration Migration
-- Run this in your Supabase SQL Editor

-- Add Telegram user ID field to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS telegram_user_id TEXT;

-- Add Telegram verification status
ALTER TABLE staff ADD COLUMN IF NOT EXISTS telegram_verified BOOLEAN DEFAULT false;

-- Add index for Telegram user ID lookups
CREATE INDEX IF NOT EXISTS idx_staff_telegram_user_id ON staff(telegram_user_id);

-- Add constraint to ensure Telegram user ID format (numeric string)
ALTER TABLE staff ADD CONSTRAINT IF NOT EXISTS staff_telegram_user_id_check
CHECK (telegram_user_id IS NULL OR telegram_user_id ~ '^\d+$');

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'staff'
AND column_name IN ('telegram_user_id', 'telegram_verified')
ORDER BY column_name;
