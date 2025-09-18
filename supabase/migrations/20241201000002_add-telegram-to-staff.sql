-- Add Telegram user ID field to staff table
ALTER TABLE staff ADD COLUMN telegram_user_id TEXT;
ALTER TABLE staff ADD COLUMN telegram_verified BOOLEAN DEFAULT false;

-- Add index for Telegram user ID lookups
CREATE INDEX idx_staff_telegram_user_id ON staff(telegram_user_id);

-- Add constraint to ensure Telegram user ID format (numeric string)
ALTER TABLE staff ADD CONSTRAINT staff_telegram_user_id_check
CHECK (telegram_user_id IS NULL OR telegram_user_id ~ '^\d+$');
