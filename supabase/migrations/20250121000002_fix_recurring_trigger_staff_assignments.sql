-- Fix recurring appointments trigger to handle staff assignments
-- This migration updates the generate_recurring_appointments function to also copy staff assignments

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_generate_recurring_appointments ON appointments;
DROP FUNCTION IF EXISTS generate_recurring_appointments();

-- Create updated function that also handles staff assignments
CREATE OR REPLACE FUNCTION generate_recurring_appointments()
RETURNS TRIGGER AS $$
DECLARE
    base_appointment RECORD;
    current_appointment_date DATE;
    next_appointment_date DATE;
    occurrence_count INTEGER := 1;
    max_occurrences INTEGER;
    interval_days INTEGER;
    end_date DATE;
    new_appointment_id UUID;
    staff_assignment RECORD;
BEGIN
    -- Only process if this is a new recurring base appointment
    IF NEW.is_recurring_base = TRUE AND NEW.recurring_rule IS NOT NULL THEN
        -- Get the base appointment details
        base_appointment := NEW;

        -- Calculate max occurrences based on the rule
        IF base_appointment.recurring_rule->>'end_occurrences' IS NOT NULL THEN
            max_occurrences := (base_appointment.recurring_rule->>'end_occurrences')::INTEGER;
        ELSE
            max_occurrences := 365; -- Default to 1 year of daily appointments
        END IF;

        -- Calculate end date
        IF base_appointment.recurring_rule->>'end_date' IS NOT NULL THEN
            end_date := (base_appointment.recurring_rule->>'end_date')::DATE;
        ELSE
            end_date := base_appointment.appointment_date + INTERVAL '1 year';
        END IF;

        -- Calculate interval based on frequency
        CASE base_appointment.recurring_rule->>'frequency'
            WHEN 'daily' THEN
                interval_days := COALESCE((base_appointment.recurring_rule->>'interval')::INTEGER, 1);
            WHEN 'weekly' THEN
                interval_days := COALESCE((base_appointment.recurring_rule->>'interval')::INTEGER, 1) * 7;
            WHEN 'monthly' THEN
                interval_days := COALESCE((base_appointment.recurring_rule->>'interval')::INTEGER, 1) * 30;
            WHEN 'yearly' THEN
                interval_days := COALESCE((base_appointment.recurring_rule->>'interval')::INTEGER, 1) * 365;
            ELSE
                interval_days := 1;
        END CASE;

        -- Generate recurring appointments
        current_appointment_date := base_appointment.appointment_date + (interval_days || ' days')::INTERVAL;

        WHILE occurrence_count < max_occurrences AND current_appointment_date <= end_date LOOP
            -- Insert the recurring appointment occurrence
            INSERT INTO appointments (
                patient_id,
                appointment_type,
                appointment_date,
                start_time,
                duration_minutes,
                status,
                custom_fields,
                transportation_type,
                transportation_method,
                driver_id,
                notes,
                mini_notes,
                full_notes,
                pickup_instructions,
                recurring_group_id,
                is_recurring_base,
                recurring_occurrence_number,
                created_at,
                updated_at
            ) VALUES (
                base_appointment.patient_id,
                base_appointment.appointment_type,
                current_appointment_date,
                base_appointment.start_time,
                base_appointment.duration_minutes,
                base_appointment.status,
                base_appointment.custom_fields,
                base_appointment.transportation_type,
                base_appointment.transportation_method,
                base_appointment.driver_id,
                base_appointment.notes,
                base_appointment.mini_notes,
                base_appointment.full_notes,
                base_appointment.pickup_instructions,
                base_appointment.id, -- Use base appointment ID as group ID
                FALSE, -- Not the base appointment
                occurrence_count,
                NOW(),
                NOW()
            ) RETURNING id INTO new_appointment_id;

            -- Copy staff assignments from base appointment to recurring appointment
            FOR staff_assignment IN
                SELECT * FROM appointment_staff
                WHERE appointment_id = base_appointment.id
            LOOP
                INSERT INTO appointment_staff (
                    appointment_id,
                    staff_id,
                    role,
                    is_primary,
                    created_at,
                    updated_at
                ) VALUES (
                    new_appointment_id,
                    staff_assignment.staff_id,
                    staff_assignment.role,
                    staff_assignment.is_primary,
                    NOW(),
                    NOW()
                );
            END LOOP;

            -- Move to next occurrence
            current_appointment_date := current_appointment_date + (interval_days || ' days')::INTERVAL;
            occurrence_count := occurrence_count + 1;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_generate_recurring_appointments
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION generate_recurring_appointments();
