-- Insert dummy data for development and testing
-- This script adds 3 staff members, 5 patients, and 10 appointments

-- Insert 3 new staff members
INSERT INTO staff (first_name, last_name, staff_type, specialization, phone, email, available_days, working_hours_start, working_hours_end, status, email_notifications_enabled, whatsapp_number, whatsapp_verified, email_verified) VALUES
('Ahmed', 'Hassan', 'doctor', 'General Medicine', '+971501234567', 'ahmed.hassan@bestdoc.ae', '{1,2,3,4,5}', '09:00:00', '17:00:00', 'active', true, '+971501234567', true, true),
('Fatima', 'Al-Zahra', 'nurse', 'Critical Care', '+971502345678', 'fatima.alzahra@bestdoc.ae', '{1,2,3,4,5,6}', '08:00:00', '20:00:00', 'active', true, '+971502345678', true, true),
('Omar', 'Khalil', 'driver', 'Transportation', '+971503456789', 'omar.khalil@bestdoc.ae', '{1,2,3,4,5,6,7}', '06:00:00', '22:00:00', 'active', true, '+971503456789', true, true);

-- Insert 5 new patients
INSERT INTO patients (name, phone, flat_villa_no, building_street, area, city, google_maps_link, medical_notes, emergency_contact, preferred_transport) VALUES
('Sarah Johnson', '+971504567890', 'Villa 15', 'Al Wasl Road', 'Jumeirah', 'Dubai', 'https://maps.google.com/?q=25.2048,55.2708', 'Diabetes Type 2, Hypertension', 'John Johnson +971504567891', 'ambulance'),
('Mohammed Al-Rashid', '+971505678901', 'Apartment 302', 'Sheikh Zayed Road', 'Downtown', 'Dubai', 'https://maps.google.com/?q=25.1972,55.2744', 'Post-surgery recovery, Physical therapy needed', 'Aisha Al-Rashid +971505678902', 'driver'),
('Emily Chen', '+971506789012', 'Villa 8', 'Al Barsha', 'Al Barsha South', 'Dubai', 'https://maps.google.com/?q=25.1124,55.1390', 'Chronic back pain, Regular physiotherapy', 'David Chen +971506789013', 'self_transport'),
('Ahmed Al-Mansouri', '+971507890123', 'Apartment 1505', 'Marina Walk', 'Dubai Marina', 'Dubai', 'https://maps.google.com/?q=25.0772,55.1309', 'Heart condition, Regular monitoring', 'Khadija Al-Mansouri +971507890124', 'ambulance'),
('Lisa Thompson', '+971508901234', 'Villa 22', 'Palm Jumeirah', 'Palm Jumeirah', 'Dubai', 'https://maps.google.com/?q=25.1124,55.1390', 'Elderly care, Mobility assistance', 'Robert Thompson +971508901235', 'driver');

-- Insert 10 appointments with varied dates (past, present, future)
-- Past appointments (last week)
INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'doctor_on_call',
    CURRENT_DATE - INTERVAL '7 days',
    '10:00:00',
    60,
    'completed',
    'Regular checkup completed successfully',
    'driver',
    'Company car'
FROM patients p WHERE p.name = 'Sarah Johnson';

INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'physiotherapy',
    CURRENT_DATE - INTERVAL '5 days',
    '14:30:00',
    45,
    'completed',
    'Post-surgery physiotherapy session',
    'driver',
    'Company car'
FROM patients p WHERE p.name = 'Mohammed Al-Rashid';

-- Today's appointments
INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'lab_test',
    CURRENT_DATE,
    '09:00:00',
    30,
    'confirmed',
    'Blood work and diabetes monitoring',
    'self_transport',
    'Patient transport'
FROM patients p WHERE p.name = 'Sarah Johnson';

INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'teleconsultation',
    CURRENT_DATE,
    '15:00:00',
    30,
    'scheduled',
    'Follow-up consultation via video call',
    'self_transport',
    'Video call'
FROM patients p WHERE p.name = 'Emily Chen';

-- Future appointments (next week)
INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'doctor_on_call',
    CURRENT_DATE + INTERVAL '2 days',
    '11:00:00',
    60,
    'scheduled',
    'Routine checkup and medication review',
    'driver',
    'Company car'
FROM patients p WHERE p.name = 'Ahmed Al-Mansouri';

INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'physiotherapy',
    CURRENT_DATE + INTERVAL '3 days',
    '16:00:00',
    45,
    'scheduled',
    'Back pain treatment session',
    'driver',
    'Company car'
FROM patients p WHERE p.name = 'Emily Chen';

INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'caregiver',
    CURRENT_DATE + INTERVAL '4 days',
    '10:30:00',
    120,
    'scheduled',
    'Daily care and assistance',
    'driver',
    'Company car'
FROM patients p WHERE p.name = 'Lisa Thompson';

INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'iv_therapy',
    CURRENT_DATE + INTERVAL '5 days',
    '13:00:00',
    90,
    'scheduled',
    'IV therapy session for recovery',
    'ambulance',
    'Medical transport'
FROM patients p WHERE p.name = 'Mohammed Al-Rashid';

INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'lab_test',
    CURRENT_DATE + INTERVAL '6 days',
    '08:30:00',
    30,
    'scheduled',
    'Comprehensive blood panel',
    'self_transport',
    'Patient transport'
FROM patients p WHERE p.name = 'Ahmed Al-Mansouri';

INSERT INTO appointments (patient_id, appointment_type, appointment_date, start_time, duration_minutes, status, notes, transportation_type, transportation_method)
SELECT
    p.id,
    'doctor_on_call',
    CURRENT_DATE + INTERVAL '7 days',
    '14:00:00',
    60,
    'scheduled',
    'Final follow-up appointment',
    'driver',
    'Company car'
FROM patients p WHERE p.name = 'Sarah Johnson';

-- Insert appointment-staff relationships
-- Assign staff to appointments
INSERT INTO appointment_staff (appointment_id, staff_id, role, is_primary)
SELECT
    a.id,
    s.id,
    'primary',
    true
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN staff s ON s.staff_type = 'doctor'
WHERE a.appointment_type = 'doctor_on_call'
AND s.first_name = 'Ahmed' AND s.last_name = 'Hassan';

INSERT INTO appointment_staff (appointment_id, staff_id, role, is_primary)
SELECT
    a.id,
    s.id,
    'primary',
    true
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN staff s ON s.staff_type = 'nurse'
WHERE a.appointment_type IN ('physiotherapy', 'caregiver', 'iv_therapy')
AND s.first_name = 'Fatima' AND s.last_name = 'Al-Zahra';

-- Assign driver to appointments that need transportation
INSERT INTO appointment_staff (appointment_id, staff_id, role, is_primary)
SELECT
    a.id,
    s.id,
    'assistant',
    false
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN staff s ON s.staff_type = 'driver'
WHERE a.transportation_type = 'driver'
AND s.first_name = 'Omar' AND s.last_name = 'Khalil';

-- Update appointments with driver_id for transportation
UPDATE appointments
SET driver_id = (SELECT id FROM staff WHERE first_name = 'Omar' AND last_name = 'Khalil')
WHERE transportation_type = 'driver';

COMMIT;
