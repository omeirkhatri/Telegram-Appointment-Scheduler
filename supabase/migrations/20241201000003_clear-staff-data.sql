-- Clear all existing staff data
-- First delete appointment-staff relationships
DELETE FROM appointment_staff;

-- Then delete appointments that reference staff
DELETE FROM appointments;

-- Finally delete staff
DELETE FROM staff;
