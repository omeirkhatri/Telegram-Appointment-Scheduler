-- Seed data for testing and development
-- This migration adds sample data to all tables for development and testing

-- Insert sample patients
INSERT INTO patients (
    id,
    name,
    phone,
    flat_villa_no,
    building_street,
    area,
    city,
    google_maps_link,
    medical_notes,
    emergency_contact,
    preferred_transport,
    created_at,
    updated_at
) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Ahmed Al Mansouri',
    '+971501234567',
    'Villa 15',
    'Sheikh Zayed Road',
    'Dubai Marina',
    'Dubai',
    'https://maps.google.com/?q=25.0920,55.1381',
    'Hypertension, Type 2 Diabetes',
    '+971502345678',
    'Driver',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Fatima Hassan',
    '+971507654321',
    'Flat 1203',
    'Burj Khalifa Tower',
    'Downtown Dubai',
    'Dubai',
    'https://maps.google.com/?q=25.1972,55.2744',
    'Asthma, Seasonal allergies',
    '+971508765432',
    'Self Transport',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Mohammed Al Rashid',
    '+971509876543',
    'Villa 8',
    'Palm Jumeirah',
    'Palm Jumeirah',
    'Dubai',
    'https://maps.google.com/?q=25.1124,55.1390',
    'Heart condition, Regular checkups required',
    '+971501111111',
    'Driver',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'Aisha Al Qasimi',
    '+971502222222',
    'Flat 456',
    'Emirates Towers',
    'Sheikh Zayed Road',
    'Dubai',
    'https://maps.google.com/?q=25.2173,55.2844',
    'Pregnancy - 6 months, Regular monitoring',
    '+971503333333',
    'Self Transport',
    NOW(),
    NOW()
),
(
    '550e8400-e29b-41d4-a716-446655440005',
    'Omar Al Falasi',
    '+971504444444',
    'Villa 22',
    'Al Wasl Road',
    'Jumeirah',
    'Dubai',
    'https://maps.google.com/?q=25.2048,55.2708',
    'Post-surgery recovery, Physiotherapy needed',
    '+971505555555',
    'Driver',
    NOW(),
    NOW()
);

-- Insert sample staff members
INSERT INTO staff (
    id,
    first_name,
    last_name,
    staff_type,
    specialization,
    phone,
    email,
    google_calendar_id,
    available_days,
    working_hours_start,
    working_hours_end,
    status,
    email_notifications_enabled,
    created_at,
    updated_at
) VALUES
(
    '660e8400-e29b-41d4-a716-446655440001',
    'Dr. Sarah',
    'Johnson',
    'doctor',
    'General Medicine',
    '+971506666666',
    'dr.sarah@bestdoc.ae',
    'dr.sarah.johnson@bestdoc.ae',
    '{1,2,3,4,5}',
    '09:00',
    '17:00',
    'active',
    true,
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    'Nurse',
    'Maria Santos',
    'nurse',
    'Emergency Care',
    '+971507777777',
    'nurse.maria@bestdoc.ae',
    'nurse.maria@bestdoc.ae',
    '{1,2,3,4,5,6}',
    '08:00',
    '16:00',
    'active',
    true,
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    'Ahmed',
    'Al Zahra',
    'physiotherapist',
    'Sports Rehabilitation',
    '+971508888888',
    'ahmed.physio@bestdoc.ae',
    'ahmed.physio@bestdoc.ae',
    '{1,2,3,4,5}',
    '10:00',
    '18:00',
    'active',
    true,
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440004',
    'Fatima',
    'Al Mansouri',
    'caregiver',
    'Elderly Care',
    '+971509999999',
    'fatima.care@bestdoc.ae',
    'fatima.care@bestdoc.ae',
    '{1,2,3,4,5,6,7}',
    '07:00',
    '19:00',
    'active',
    true,
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440005',
    'Hassan',
    'Al Rashid',
    'driver',
    'Patient Transportation',
    '+971500000000',
    'hassan.driver@bestdoc.ae',
    'hassan.driver@bestdoc.ae',
    '{1,2,3,4,5,6}',
    '06:00',
    '20:00',
    'active',
    true,
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440006',
    'Dr. James',
    'Wilson',
    'doctor',
    'Cardiology',
    '+971501111112',
    'dr.james@bestdoc.ae',
    'dr.james.wilson@bestdoc.ae',
    '{1,2,3,4,5}',
    '08:00',
    '16:00',
    'active',
    true,
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440007',
    'Nurse',
    'Aisha Khan',
    'nurse',
    'IV Therapy',
    '+971502222223',
    'nurse.aisha@bestdoc.ae',
    'nurse.aisha@bestdoc.ae',
    '{1,2,3,4,5}',
    '09:00',
    '17:00',
    'active',
    true,
    NOW(),
    NOW()
),
(
    '660e8400-e29b-41d4-a716-446655440008',
    'Omar',
    'Al Falasi',
    'lab_technician',
    'Blood Tests',
    '+971503333334',
    'omar.lab@bestdoc.ae',
    'omar.lab@bestdoc.ae',
    '{1,2,3,4,5}',
    '07:00',
    '15:00',
    'active',
    true,
    NOW(),
    NOW()
);

-- Insert sample appointments
INSERT INTO appointments (
    id,
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
    created_at,
    updated_at
) VALUES
(
    '770e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'doctor_on_call',
    CURRENT_DATE + INTERVAL '1 day',
    '10:00',
    60,
    'scheduled',
    '{"chief_complaint": "Chest pain and shortness of breath", "blood_pressure": "140/90"}',
    'driver',
    NULL,
    '660e8400-e29b-41d4-a716-446655440005',
    'Patient reports chest pain for the past 2 days',
    NOW(),
    NOW()
),
(
    '770e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'lab_test',
    CURRENT_DATE + INTERVAL '2 days',
    '09:00',
    30,
    'scheduled',
    '{"test_type": "Complete Blood Count", "fasting_required": true}',
    'self_transport',
    'Uber',
    NULL,
    'Routine blood work for annual checkup',
    NOW(),
    NOW()
),
(
    '770e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    'physiotherapy',
    CURRENT_DATE + INTERVAL '3 days',
    '14:00',
    45,
    'scheduled',
    '{"session_type": "Post-surgery rehabilitation", "target_area": "Left knee"}',
    'driver',
    NULL,
    '660e8400-e29b-41d4-a716-446655440005',
    'Follow-up physiotherapy session after knee surgery',
    NOW(),
    NOW()
),
(
    '770e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440004',
    'teleconsultation',
    CURRENT_DATE + INTERVAL '1 day',
    '15:00',
    30,
    'scheduled',
    '{"consultation_type": "Prenatal checkup", "trimester": "2nd"}',
    'self_transport',
    'Video Call',
    NULL,
    'Regular prenatal consultation',
    NOW(),
    NOW()
),
(
    '770e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440005',
    'caregiver',
    CURRENT_DATE + INTERVAL '4 days',
    '08:00',
    480,
    'scheduled',
    '{"care_type": "Daily assistance", "medication_reminder": true}',
    'driver',
    NULL,
    '660e8400-e29b-41d4-a716-446655440005',
    'Daily caregiver visit for elderly patient',
    NOW(),
    NOW()
),
(
    '770e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440001',
    'iv_therapy',
    CURRENT_DATE + INTERVAL '5 days',
    '11:00',
    120,
    'scheduled',
    '{"therapy_type": "Hydration", "medication": "Saline solution"}',
    'driver',
    NULL,
    '660e8400-e29b-41d4-a716-446655440005',
    'IV hydration therapy for dehydration',
    NOW(),
    NOW()
);

-- Insert appointment-staff relationships
INSERT INTO appointment_staff (
    id,
    appointment_id,
    staff_id,
    role,
    is_primary,
    created_at,
    updated_at
) VALUES
-- Doctor on Call appointment
(
    '880e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    'primary',
    true,
    NOW(),
    NOW()
),
(
    '880e8400-e29b-41d4-a716-446655440002',
    '770e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440002',
    'assistant',
    false,
    NOW(),
    NOW()
),
-- Lab Test appointment
(
    '880e8400-e29b-41d4-a716-446655440003',
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    'primary',
    true,
    NOW(),
    NOW()
),
-- Physiotherapy appointment
(
    '880e8400-e29b-41d4-a716-446655440004',
    '770e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440003',
    'primary',
    true,
    NOW(),
    NOW()
),
-- Teleconsultation appointment
(
    '880e8400-e29b-41d4-a716-446655440005',
    '770e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440006',
    'primary',
    true,
    NOW(),
    NOW()
),
-- Caregiver appointment
(
    '880e8400-e29b-41d4-a716-446655440006',
    '770e8400-e29b-41d4-a716-446655440005',
    '660e8400-e29b-41d4-a716-446655440004',
    'primary',
    true,
    NOW(),
    NOW()
),
-- IV Therapy appointment
(
    '880e8400-e29b-41d4-a716-446655440007',
    '770e8400-e29b-41d4-a716-446655440006',
    '660e8400-e29b-41d4-a716-446655440007',
    'primary',
    true,
    NOW(),
    NOW()
),
(
    '880e8400-e29b-41d4-a716-446655440008',
    '770e8400-e29b-41d4-a716-446655440006',
    '660e8400-e29b-41d4-a716-446655440001',
    'assistant',
    false,
    NOW(),
    NOW()
);

-- Add some recurring appointments for testing
INSERT INTO appointments (
    id,
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
    recurring_rule,
    created_at,
    updated_at
) VALUES
(
    '770e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440003',
    'physiotherapy',
    CURRENT_DATE + INTERVAL '7 days',
    '14:00',
    45,
    'scheduled',
    '{"session_type": "Post-surgery rehabilitation", "target_area": "Left knee"}',
    'driver',
    NULL,
    '660e8400-e29b-41d4-a716-446655440005',
    'Weekly physiotherapy session',
    '{"frequency": "weekly", "interval": 1, "end_date": "2024-12-31"}',
    NOW(),
    NOW()
),
(
    '770e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440005',
    'caregiver',
    CURRENT_DATE + INTERVAL '7 days',
    '08:00',
    480,
    'scheduled',
    '{"care_type": "Daily assistance", "medication_reminder": true}',
    'driver',
    NULL,
    '660e8400-e29b-41d4-a716-446655440005',
    'Weekly caregiver visit',
    '{"frequency": "weekly", "interval": 1, "end_date": "2024-12-31"}',
    NOW(),
    NOW()
);

-- Add recurring appointment staff relationships
INSERT INTO appointment_staff (
    id,
    appointment_id,
    staff_id,
    role,
    is_primary,
    created_at,
    updated_at
) VALUES
(
    '880e8400-e29b-41d4-a716-446655440009',
    '770e8400-e29b-41d4-a716-446655440007',
    '660e8400-e29b-41d4-a716-446655440003',
    'primary',
    true,
    NOW(),
    NOW()
),
(
    '880e8400-e29b-41d4-a716-446655440010',
    '770e8400-e29b-41d4-a716-446655440008',
    '660e8400-e29b-41d4-a716-446655440004',
    'primary',
    true,
    NOW(),
    NOW()
);

-- Add comment to document the seed data
COMMENT ON TABLE patients IS 'Sample patients for development and testing';
COMMENT ON TABLE staff IS 'Sample staff members for development and testing';
COMMENT ON TABLE appointments IS 'Sample appointments for development and testing';
COMMENT ON TABLE appointment_staff IS 'Sample appointment-staff relationships for development and testing';
