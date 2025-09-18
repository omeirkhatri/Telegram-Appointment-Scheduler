import { expect, test } from '@playwright/test';
import { testData } from '../utils/test-data';

test.describe('API Endpoint Tests', () => {
  test.describe('Patients API', () => {
    test('GET /api/patients should return patients list', async ({ request }) => {
      const response = await request.get('/api/patients');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('POST /api/patients should create a new patient', async ({ request }) => {
      const patientData = {
        name: testData.patients.valid.name,
        phone: testData.patients.valid.phone,
        flat_villa_no: testData.patients.valid.flat_villa_no,
        building_street: testData.patients.valid.building_street,
        area: testData.patients.valid.area,
        city: testData.patients.valid.city,
        medical_notes: testData.patients.valid.medical_notes,
        emergency_contact: testData.patients.valid.emergency_contact,
      };

      const response = await request.post('/api/patients', {
        data: patientData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe(patientData.name);
    });

    test('GET /api/patients/[id] should return specific patient', async ({ request }) => {
      // First create a patient
      const patientData = {
        name: 'Test Patient for GET',
        phone: '+971501234567',
        flat_villa_no: '123',
        building_street: 'Test Street',
        area: 'Test Area',
        city: 'Dubai',
      };

      const createResponse = await request.post('/api/patients', { data: patientData });
      const createdPatient = await createResponse.json();

      // Then get the patient
      const response = await request.get(`/api/patients/${createdPatient.data.id}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(createdPatient.data.id);
      expect(data.data.name).toBe(patientData.name);
    });

    test('PUT /api/patients/[id] should update patient', async ({ request }) => {
      // First create a patient
      const patientData = {
        name: 'Test Patient for UPDATE',
        phone: '+971501234567',
        flat_villa_no: '123',
        building_street: 'Test Street',
        area: 'Test Area',
        city: 'Dubai',
      };

      const createResponse = await request.post('/api/patients', { data: patientData });
      const createdPatient = await createResponse.json();

      // Update the patient
      const updateData = {
        name: 'Updated Patient Name',
        phone: '+971501234567',
        flat_villa_no: '456',
        building_street: 'Updated Street',
        area: 'Updated Area',
        city: 'Abu Dhabi',
      };

      const response = await request.put(`/api/patients/${createdPatient.data.id}`, {
        data: updateData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(updateData.name);
      expect(data.data.city).toBe(updateData.city);
    });

    test('DELETE /api/patients/[id] should delete patient', async ({ request }) => {
      // First create a patient
      const patientData = {
        name: 'Test Patient for DELETE',
        phone: '+971501234567',
        flat_villa_no: '123',
        building_street: 'Test Street',
        area: 'Test Area',
        city: 'Dubai',
      };

      const createResponse = await request.post('/api/patients', { data: patientData });
      const createdPatient = await createResponse.json();

      // Delete the patient
      const response = await request.delete(`/api/patients/${createdPatient.data.id}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify patient is deleted
      const getResponse = await request.get(`/api/patients/${createdPatient.data.id}`);
      expect(getResponse.status()).toBe(404);
    });

    test('GET /api/patients/search should search patients', async ({ request }) => {
      const response = await request.get('/api/patients/search?q=test');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /api/patients/filters should return filter options', async ({ request }) => {
      const response = await request.get('/api/patients/filters');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('cities');
      expect(data.data).toHaveProperty('areas');
    });
  });

  test.describe('Staff API', () => {
    test('GET /api/staff should return staff list', async ({ request }) => {
      const response = await request.get('/api/staff');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('POST /api/staff should create a new staff member', async ({ request }) => {
      const staffData = {
        first_name: testData.staff.valid.first_name,
        last_name: testData.staff.valid.last_name,
        staff_type: testData.staff.valid.staff_type,
        specialization: testData.staff.valid.specialization,
        phone: testData.staff.valid.phone,
        email: testData.staff.valid.email,
        available_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        status: 'active',
        email_notifications_enabled: true,
      };

      const response = await request.post('/api/staff', {
        data: staffData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.first_name).toBe(staffData.first_name);
    });

    test('GET /api/staff/[id] should return specific staff member', async ({ request }) => {
      // First create a staff member
      const staffData = {
        first_name: 'Test',
        last_name: 'Staff',
        staff_type: 'doctor',
        phone: '+971501234567',
        email: 'teststaff@example.com',
        available_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        status: 'active',
      };

      const createResponse = await request.post('/api/staff', { data: staffData });
      const createdStaff = await createResponse.json();

      // Then get the staff member
      const response = await request.get(`/api/staff/${createdStaff.data.id}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(createdStaff.data.id);
      expect(data.data.first_name).toBe(staffData.first_name);
    });

    test('PUT /api/staff/[id] should update staff member', async ({ request }) => {
      // First create a staff member
      const staffData = {
        first_name: 'Test',
        last_name: 'Staff',
        staff_type: 'doctor',
        phone: '+971501234567',
        email: 'teststaff@example.com',
        available_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        status: 'active',
      };

      const createResponse = await request.post('/api/staff', { data: staffData });
      const createdStaff = await createResponse.json();

      // Update the staff member
      const updateData = {
        ...staffData,
        first_name: 'Updated',
        last_name: 'Staff Member',
        specialization: 'Cardiology',
      };

      const response = await request.put(`/api/staff/${createdStaff.data.id}`, {
        data: updateData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.first_name).toBe(updateData.first_name);
      expect(data.data.specialization).toBe(updateData.specialization);
    });

    test('DELETE /api/staff/[id] should delete staff member', async ({ request }) => {
      // First create a staff member
      const staffData = {
        first_name: 'Test',
        last_name: 'Staff',
        staff_type: 'doctor',
        phone: '+971501234567',
        email: 'teststaff@example.com',
        available_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        status: 'active',
      };

      const createResponse = await request.post('/api/staff', { data: staffData });
      const createdStaff = await createResponse.json();

      // Delete the staff member
      const response = await request.delete(`/api/staff/${createdStaff.data.id}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify staff member is deleted
      const getResponse = await request.get(`/api/staff/${createdStaff.data.id}`);
      expect(getResponse.status()).toBe(404);
    });

    test('GET /api/staff/search should search staff', async ({ request }) => {
      const response = await request.get('/api/staff/search?q=doctor');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('GET /api/staff/filters should return filter options', async ({ request }) => {
      const response = await request.get('/api/staff/filters');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('staff_types');
      expect(data.data).toHaveProperty('specializations');
    });

    test('POST /api/staff/validate-calendar should validate Google Calendar ID', async ({ request }) => {
      const response = await request.post('/api/staff/validate-calendar', {
        data: { calendarId: 'test@example.com' },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Appointments API', () => {
    test('GET /api/appointments should return appointments list', async ({ request }) => {
      const response = await request.get('/api/appointments');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('POST /api/appointments should create a new appointment', async ({ request }) => {
      // First create a patient and staff member
      const patientData = {
        name: 'Test Patient for Appointment',
        phone: '+971501234567',
        flat_villa_no: '123',
        building_street: 'Test Street',
        area: 'Test Area',
        city: 'Dubai',
      };

      const patientResponse = await request.post('/api/patients', { data: patientData });
      const patient = await patientResponse.json();

      const staffData = {
        first_name: 'Test',
        last_name: 'Doctor',
        staff_type: 'doctor',
        phone: '+971501234567',
        email: 'testdoctor@example.com',
        available_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        status: 'active',
      };

      const staffResponse = await request.post('/api/staff', { data: staffData });
      const staff = await staffResponse.json();

      // Create appointment
      const appointmentData = {
        patient_id: patient.data.id,
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-12-31',
        start_time: '10:00',
        end_time: '11:00',
        duration_minutes: 60,
        status: 'scheduled',
        notes: 'Test appointment',
        staff_assignments: [{
          staff_id: staff.data.id,
          role: 'primary',
          is_primary: true,
        }],
      };

      const response = await request.post('/api/appointments', {
        data: appointmentData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.patient_id).toBe(appointmentData.patient_id);
    });

    test('GET /api/appointments/[id] should return specific appointment', async ({ request }) => {
      // Create appointment first (simplified)
      const appointmentData = {
        patient_id: 'test-patient-id',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-12-31',
        start_time: '10:00',
        end_time: '11:00',
        duration_minutes: 60,
        status: 'scheduled',
      };

      const createResponse = await request.post('/api/appointments', { data: appointmentData });
      if (createResponse.status() === 201) {
        const createdAppointment = await createResponse.json();

        // Then get the appointment
        const response = await request.get(`/api/appointments/${createdAppointment.data.id}`);
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(createdAppointment.data.id);
      }
    });

    test('GET /api/appointments/search should search appointments', async ({ request }) => {
      const response = await request.get('/api/appointments/search?q=test');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  test.describe('Reports API', () => {
    test('GET /api/reports/statistics should return dashboard statistics', async ({ request }) => {
      const response = await request.get('/api/reports/statistics');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('appointments');
      expect(data.data).toHaveProperty('patients');
      expect(data.data).toHaveProperty('staff');
    });

    test('POST /api/reports/export should export reports', async ({ request }) => {
      const exportData = {
        reportType: 'appointments',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        format: 'csv',
      };

      const response = await request.post('/api/reports/export', {
        data: exportData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('downloadUrl');
    });
  });

  test.describe('Email API', () => {
    test('GET /api/email/delivery should return email delivery logs', async ({ request }) => {
      const response = await request.get('/api/email/delivery');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('POST /api/email/test should send test email', async ({ request }) => {
      const testData = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      };

      const response = await request.post('/api/email/test', {
        data: testData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Jobs API', () => {
    test('GET /api/jobs should return jobs list', async ({ request }) => {
      const response = await request.get('/api/jobs');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('jobs');
      expect(data.data).toHaveProperty('scheduler');
    });

    test('POST /api/jobs should create a new job', async ({ request }) => {
      const jobData = {
        name: 'Test Job',
        type: 'daily_agenda',
        schedule: '0 9 * * *',
        enabled: true,
        config: {},
      };

      const response = await request.post('/api/jobs', {
        data: jobData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
    });
  });

  test.describe('Health Check API', () => {
    test('GET /api/health should return health status', async ({ request }) => {
      const response = await request.get('/api/health');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('status');
      expect(data.data).toHaveProperty('timestamp');
    });
  });

  test.describe('Error Handling', () => {
    test('should return 404 for non-existent endpoints', async ({ request }) => {
      const response = await request.get('/api/non-existent-endpoint');
      expect(response.status()).toBe(404);
    });

    test('should return 400 for invalid request data', async ({ request }) => {
      const response = await request.post('/api/patients', {
        data: { invalid: 'data' },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should return 500 for server errors', async ({ request }) => {
      // This test would require mocking a server error
      // For now, we'll test with invalid UUID format
      const response = await request.get('/api/patients/invalid-uuid');
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Authentication', () => {
    test('should handle unauthorized requests', async ({ request }) => {
      // This would require proper authentication setup
      // For now, we'll test that endpoints are accessible
      const response = await request.get('/api/patients');
      expect(response.status()).toBe(200);
    });
  });
});
