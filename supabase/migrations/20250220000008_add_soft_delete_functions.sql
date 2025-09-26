-- Add functions for soft delete functionality
-- This migration creates database functions for soft delete operations

-- Create a function to get appointments including deleted ones (for admin purposes)
CREATE OR REPLACE FUNCTION get_all_appointments_including_deleted()
RETURNS TABLE (
    id UUID,
    patient_id UUID,
    appointment_type appointment_type_enum,
    appointment_date DATE,
    start_time TIME,
    duration_minutes INTEGER,
    status appointment_status_enum,
    custom_fields JSONB,
    transportation_type transportation_type_enum,
    transportation_method TEXT,
    driver_id UUID,
    notes TEXT,
    recurring_rule JSONB,
    google_event_ids JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_recurring_base BOOLEAN,
    recurring_group_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.patient_id,
        a.appointment_type,
        a.appointment_date,
        a.start_time,
        a.duration_minutes,
        a.status,
        a.custom_fields,
        a.transportation_type,
        a.transportation_method,
        a.driver_id,
        a.notes,
        a.recurring_rule,
        a.google_event_ids,
        a.created_at,
        a.updated_at,
        a.is_recurring_base,
        a.recurring_group_id
    FROM appointments a
    ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_appointments_including_deleted() TO authenticated;

-- Create a function to soft delete an appointment
CREATE OR REPLACE FUNCTION soft_delete_appointment(appointment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    appointment_record RECORD;
BEGIN
    -- Get the appointment details
    SELECT * INTO appointment_record
    FROM appointments
    WHERE id = appointment_id AND status != 'deleted';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- If it's a recurring base appointment, soft delete all related occurrences
    IF appointment_record.is_recurring_base THEN
        UPDATE appointments
        SET status = 'deleted', updated_at = NOW()
        WHERE recurring_group_id = appointment_id AND status != 'deleted';
    END IF;

    -- Soft delete the main appointment
    UPDATE appointments
    SET status = 'deleted', updated_at = NOW()
    WHERE id = appointment_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION soft_delete_appointment(UUID) TO authenticated;

-- Create a function to restore a soft deleted appointment
CREATE OR REPLACE FUNCTION restore_appointment(appointment_id UUID, new_status appointment_status_enum DEFAULT 'scheduled')
RETURNS BOOLEAN AS $$
DECLARE
    appointment_record RECORD;
BEGIN
    -- Get the appointment details
    SELECT * INTO appointment_record
    FROM appointments
    WHERE id = appointment_id AND status = 'deleted';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Restore the appointment
    UPDATE appointments
    SET status = new_status, updated_at = NOW()
    WHERE id = appointment_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION restore_appointment(UUID, appointment_status_enum) TO authenticated;

