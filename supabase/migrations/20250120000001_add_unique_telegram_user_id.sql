-- Add unique constraint to telegram_user_id to prevent duplicates
-- This ensures that each Telegram User ID can only be assigned to one staff member

-- First, remove any existing duplicate telegram_user_id values (keep the first one)
WITH duplicates AS (
  SELECT
    id,
    telegram_user_id,
    ROW_NUMBER() OVER (PARTITION BY telegram_user_id ORDER BY created_at) as rn
  FROM staff
  WHERE telegram_user_id IS NOT NULL
)
UPDATE staff
SET telegram_user_id = NULL, telegram_verified = false
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint
ALTER TABLE staff ADD CONSTRAINT staff_telegram_user_id_unique UNIQUE (telegram_user_id);

-- Add comment
COMMENT ON CONSTRAINT staff_telegram_user_id_unique ON staff IS 'Ensures each Telegram User ID is unique across all staff members';
