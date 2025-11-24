-- Task 2.2: add driver_assignment_status column and supporting indexes on appointments

-- Create enum capturing assignment lifecycle states
CREATE TYPE driver_assignment_status_enum AS ENUM (
  'not_required',
  'pending',
  'assigned',
  'completed'
);

-- Extend appointments table with new status column
ALTER TABLE appointments
  ADD COLUMN driver_assignment_status driver_assignment_status_enum NOT NULL DEFAULT 'not_required';

-- Indexes to support queue lookups and ordering
CREATE INDEX idx_appointments_driver_assignment_status ON appointments(driver_assignment_status);
CREATE INDEX idx_appointments_driver_assignment_status_window
  ON appointments(driver_assignment_status, appointment_date, start_time);

