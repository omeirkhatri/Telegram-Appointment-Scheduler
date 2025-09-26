-- Add soft delete functionality to appointments
-- This migration adds 'deleted' status to appointments

-- Add 'deleted' to the appointment_status_enum
ALTER TYPE appointment_status_enum ADD VALUE 'deleted';
