-- Add indexes for soft delete functionality
-- This migration adds indexes to improve performance for soft delete queries

-- Add index for deleted status for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_status ON appointments(status) WHERE status = 'deleted';

-- Add index for soft delete queries (non-deleted appointments)
CREATE INDEX IF NOT EXISTS idx_appointments_active_status ON appointments(status) WHERE status != 'deleted';

