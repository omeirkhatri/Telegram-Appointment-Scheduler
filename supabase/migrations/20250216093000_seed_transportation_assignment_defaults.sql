-- Task 2.3: seed default values for legacy transportation segments and appointments

-- Ensure existing segments align with new assignment metadata
UPDATE transportation_segments
SET assignment_mode = 'assign_now'
WHERE assignment_mode IS DISTINCT FROM 'assign_now';

UPDATE transportation_segments
SET priority = 0
WHERE priority IS NULL;

-- Derive appointment-level driver assignment status from current data
UPDATE appointments
SET driver_assignment_status = CASE
    WHEN transportation_type = 'driver' AND driver_id IS NOT NULL THEN 'assigned'::driver_assignment_status_enum
    WHEN transportation_type = 'driver' AND driver_id IS NULL THEN 'pending'::driver_assignment_status_enum
    ELSE 'not_required'::driver_assignment_status_enum
END;
