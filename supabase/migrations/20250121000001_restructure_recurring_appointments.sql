-- Restructure Recurring Appointments
-- This migration modifies the appointments table to store recurring appointments as individual rows
-- instead of using a single row with recurring_rule JSONB

-- Add new columns for recurring appointment tracking
ALTER TABLE appointments
ADD COLUMN recurring_group_id UUID,
ADD COLUMN is_recurring_base BOOLEAN DEFAULT FALSE,
ADD COLUMN recurring_occurrence_number INTEGER;

-- Add constraints
ALTER TABLE appointments
ADD CONSTRAINT appointments_recurring_occurrence_number_check
CHECK (recurring_occurrence_number IS NULL OR recurring_occurrence_number > 0);

ALTER TABLE appointments
ADD CONSTRAINT appointments_recurring_base_check
CHECK (
    (is_recurring_base = TRUE AND recurring_group_id IS NULL) OR
    (is_recurring_base = FALSE AND recurring_group_id IS NOT NULL) OR
    (is_recurring_base = FALSE AND recurring_group_id IS NULL)
);

-- Create indexes for performance
CREATE INDEX idx_appointments_recurring_group_id ON appointments(recurring_group_id);
CREATE INDEX idx_appointments_is_recurring_base ON appointments(is_recurring_base);
CREATE INDEX idx_appointments_recurring_occurrence ON appointments(recurring_occurrence_number);

-- Create a function to generate recurring appointments
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
            );

            -- Move to next occurrence
            current_appointment_date := current_appointment_date + (interval_days || ' days')::INTERVAL;
            occurrence_count := occurrence_count + 1;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate recurring appointments
CREATE TRIGGER trigger_generate_recurring_appointments
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION generate_recurring_appointments();

-- Create a function to update recurring appointments
CREATE OR REPLACE FUNCTION update_recurring_appointments()
RETURNS TRIGGER AS $$
DECLARE
    base_appointment RECORD;
    occurrence_appointment RECORD;
BEGIN
    -- Only process if this is a recurring base appointment being updated
    IF NEW.is_recurring_base = TRUE AND OLD.is_recurring_base = TRUE THEN
        -- Get the base appointment details
        base_appointment := NEW;

        -- Update all related recurring appointments
        FOR occurrence_appointment IN
            SELECT * FROM appointments
            WHERE recurring_group_id = base_appointment.id
        LOOP
            UPDATE appointments SET
                patient_id = base_appointment.patient_id,
                appointment_type = base_appointment.appointment_type,
                start_time = base_appointment.start_time,
                duration_minutes = base_appointment.duration_minutes,
                status = base_appointment.status,
                custom_fields = base_appointment.custom_fields,
                transportation_type = base_appointment.transportation_type,
                transportation_method = base_appointment.transportation_method,
                driver_id = base_appointment.driver_id,
                notes = base_appointment.notes,
                mini_notes = base_appointment.mini_notes,
                full_notes = base_appointment.full_notes,
                pickup_instructions = base_appointment.pickup_instructions,
                updated_at = NOW()
            WHERE id = occurrence_appointment.id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update recurring appointments when base is updated
CREATE TRIGGER trigger_update_recurring_appointments
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_appointments();

-- Note: Deletion of recurring appointments is handled in the application code
-- to avoid trigger conflicts. The application will delete all related occurrences
-- before deleting the base appointment.

-- Add comments for documentation
COMMENT ON COLUMN appointments.recurring_group_id IS 'UUID of the base recurring appointment that this occurrence belongs to';
COMMENT ON COLUMN appointments.is_recurring_base IS 'TRUE if this is the base recurring appointment, FALSE if it is an occurrence';
COMMENT ON COLUMN appointments.recurring_occurrence_number IS 'The occurrence number (1, 2, 3, etc.) for recurring appointments';
