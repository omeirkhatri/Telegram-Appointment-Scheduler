/**
 * Tests for Supabase Mocking Utilities
 *
 * Ensures the mock factory works correctly and provides
 * consistent behavior for all Supabase query patterns.
 */

import {
    clearAllMocks,
    createMockAppointment,
    createMockAppointments,
    createMockAppointmentStaff,
    createMockAuthError,
    createMockError,
    createMockNetworkError,
    createMockPatient,
    createMockPatients,
    createMockStaff,
    createMockStaffMembers,
    MockSupabaseClient,
    MockSupabaseQueryBuilderFactory,
    resetMockSupabase,
    setupMockAppointments,
    setupMockAppointmentStaff,
    setupMockPatients,
    setupMockStaff,
} from './supabase-mocks';

describe('Supabase Mocking Utilities', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe('Mock Data Factories', () => {
    describe('createMockPatient', () => {
      it('should create a patient with default values', () => {
        const patient = createMockPatient();

        expect(patient).toMatchObject({
          id: 'test-patient-id',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: '123',
          building_street: 'Healthcare Street',
          area: 'Downtown',
          city: 'Dubai',
        });
        expect(patient.created_at).toBeDefined();
        expect(patient.updated_at).toBeDefined();
      });

      it('should allow overriding default values', () => {
        const patient = createMockPatient({
          name: 'Jane Doe',
          phone: '+971509876543',
        });

        expect(patient.name).toBe('Jane Doe');
        expect(patient.phone).toBe('+971509876543');
        expect(patient.id).toBe('test-patient-id'); // Default value preserved
      });
    });

    describe('createMockStaff', () => {
      it('should create a staff member with default values', () => {
        const staff = createMockStaff();

        expect(staff).toMatchObject({
          id: 'test-staff-id',
          first_name: 'Jane',
          last_name: 'Smith',
          staff_type: 'doctor',
          specialization: 'General Medicine',
          phone: '+971501234568',
          email: 'jane.smith@example.com',
          status: 'active',
        });
        expect(staff.available_days).toEqual([1, 2, 3, 4, 5]);
      });

      it('should allow overriding default values', () => {
        const staff = createMockStaff({
          staff_type: 'nurse',
          specialization: 'Emergency Care',
        });

        expect(staff.staff_type).toBe('nurse');
        expect(staff.specialization).toBe('Emergency Care');
        expect(staff.first_name).toBe('Jane'); // Default value preserved
      });
    });

    describe('createMockAppointment', () => {
      it('should create an appointment with default values', () => {
        const appointment = createMockAppointment();

        expect(appointment).toMatchObject({
          id: 'test-appointment-id',
          patient_id: 'test-patient-id',
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '10:00',
          duration_minutes: 60,
          status: 'scheduled',
          transportation_type: 'driver',
        });
        expect(appointment.custom_fields).toBeDefined();
        expect(appointment.google_event_ids).toBeDefined();
      });
    });

    describe('createMockAppointmentStaff', () => {
      it('should create an appointment staff assignment with default values', () => {
        const appointmentStaff = createMockAppointmentStaff();

        expect(appointmentStaff).toMatchObject({
          id: 'test-appointment-staff-id',
          appointment_id: 'test-appointment-id',
          staff_id: 'test-staff-id',
          role: 'primary',
          is_primary: true,
          google_event_id: 'test-event-id',
        });
      });
    });

    describe('Collection Factories', () => {
      it('should create multiple patients with unique IDs', () => {
        const patients = createMockPatients(3);

        expect(patients).toHaveLength(3);
        expect(patients[0].id).toBe('patient-1');
        expect(patients[1].id).toBe('patient-2');
        expect(patients[2].id).toBe('patient-3');
        expect(patients[0].name).toBe('Patient 1');
        expect(patients[1].name).toBe('Patient 2');
        expect(patients[2].name).toBe('Patient 3');
      });

      it('should create multiple staff members with unique IDs', () => {
        const staff = createMockStaffMembers(2);

        expect(staff).toHaveLength(2);
        expect(staff[0].id).toBe('staff-1');
        expect(staff[1].id).toBe('staff-2');
        expect(staff[0].first_name).toBe('Staff1');
        expect(staff[1].first_name).toBe('Staff2');
      });

      it('should create multiple appointments with unique IDs', () => {
        const appointments = createMockAppointments(2);

        expect(appointments).toHaveLength(2);
        expect(appointments[0].id).toBe('appointment-1');
        expect(appointments[1].id).toBe('appointment-2');
        expect(appointments[0].appointment_date).toBe('2024-01-15');
        expect(appointments[1].appointment_date).toBe('2024-01-16');
      });
    });
  });

  describe('Error Factories', () => {
    it('should create a custom error', () => {
      const error = createMockError('Custom error', 'CUSTOM_CODE');

      expect(error).toEqual({
        data: null,
        error: {
          message: 'Custom error',
          code: 'CUSTOM_CODE',
          details: null,
          hint: null,
        },
      });
    });

    it('should create a network error', () => {
      const error = createMockNetworkError();

      expect(error.error.message).toBe('Network error');
      expect(error.error.code).toBe('NETWORK_ERROR');
    });

    it('should create an auth error', () => {
      const error = createMockAuthError();

      expect(error.error.message).toBe('Authentication failed');
      expect(error.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('MockSupabaseQueryBuilderFactory', () => {
    let factory: MockSupabaseQueryBuilderFactory<any>;

    beforeEach(() => {
      factory = new MockSupabaseQueryBuilderFactory();
    });

    it('should create a query builder', () => {
      const queryBuilder = factory.create();

      expect(queryBuilder).toBeDefined();
      expect(typeof queryBuilder.select).toBe('function');
      expect(typeof queryBuilder.insert).toBe('function');
      expect(typeof queryBuilder.update).toBe('function');
      expect(typeof queryBuilder.delete).toBe('function');
      expect(typeof queryBuilder.eq).toBe('function');
      expect(typeof queryBuilder.single).toBe('function');
    });

    it('should execute queries and return mock data', async () => {
      const mockData = [createMockPatient(), createMockPatient()];
      factory.withData(mockData);

      const queryBuilder = factory.create();
      const result = await queryBuilder.select('*').then();

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('should handle errors when configured', async () => {
      const mockError = createMockError('Test error');
      factory.withError(mockError.error);

      const queryBuilder = factory.create();
      const result = await queryBuilder.select('*').then();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError.error);
    });

    it('should throw errors when configured to throw', async () => {
      const mockError = createMockError('Test error');
      factory.withError(mockError.error);
      // Manually set shouldThrow to true for this test
      (factory as any).shouldThrow = true;

      const queryBuilder = factory.create();

      await expect(queryBuilder.select('*').then()).rejects.toThrow('Test error');
    });

    it('should handle single() queries correctly', async () => {
      const mockData = [createMockPatient()];
      factory.withData(mockData);

      const queryBuilder = factory.create();
      const result = await queryBuilder.select('*').single();

      expect(result.data).toEqual(mockData[0]);
      expect(result.error).toBeNull();
    });

    it('should return error for single() when no data', async () => {
      factory.withData([]);

      const queryBuilder = factory.create();
      const result = await queryBuilder.select('*').single();

      expect(result.data).toBeNull();
      expect(result.error.message).toBe('No rows found');
    });

    it('should return error for single() when multiple rows', async () => {
      const mockData = [createMockPatient(), createMockPatient()];
      factory.withData(mockData);

      const queryBuilder = factory.create();
      const result = await queryBuilder.select('*').single();

      expect(result.data).toBeNull();
      expect(result.error.message).toBe('Multiple rows found');
    });

    it('should handle maybeSingle() queries correctly', async () => {
      const mockData = [createMockPatient()];
      factory.withData(mockData);

      const queryBuilder = factory.create();
      const result = await queryBuilder.select('*').maybeSingle();

      expect(result.data).toEqual(mockData[0]);
      expect(result.error).toBeNull();
    });

    it('should return null for maybeSingle() when no data', async () => {
      factory.withData([]);

      const queryBuilder = factory.create();
      const result = await queryBuilder.select('*').maybeSingle();

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('MockSupabaseClient', () => {
    let client: MockSupabaseClient;

    beforeEach(() => {
      client = new MockSupabaseClient();
    });

    it('should set and retrieve table data', () => {
      const patients = createMockPatients(2);
      client.setTableData('patients', patients);

      const queryBuilder = client.from('patients');
      expect(queryBuilder).toBeDefined();
    });

    it('should set and retrieve table errors', () => {
      const error = createMockError('Table error');
      client.setTableError('patients', error.error);

      const queryBuilder = client.from('patients');
      expect(queryBuilder).toBeDefined();
    });

    it('should provide auth methods', () => {
      expect(client.auth).toBeDefined();
      expect(typeof client.auth.getUser).toBe('function');
      expect(typeof client.auth.signInWithPassword).toBe('function');
      expect(typeof client.auth.signOut).toBe('function');
    });

    it('should provide storage methods', () => {
      expect(client.storage).toBeDefined();
      expect(typeof client.storage.from).toBe('function');
    });
  });

  describe('Setup Helpers', () => {
    it('should setup mock patients', () => {
      const patients = setupMockPatients(3);

      expect(patients).toHaveLength(3);
      expect(patients[0].id).toBe('patient-1');
    });

    it('should setup mock staff', () => {
      const staff = setupMockStaff(2);

      expect(staff).toHaveLength(2);
      expect(staff[0].id).toBe('staff-1');
    });

    it('should setup mock appointments', () => {
      const appointments = setupMockAppointments(2);

      expect(appointments).toHaveLength(2);
      expect(appointments[0].id).toBe('appointment-1');
    });

    it('should setup mock appointment staff', () => {
      const appointmentStaff = setupMockAppointmentStaff(2);

      expect(appointmentStaff).toHaveLength(2);
      expect(appointmentStaff[0].id).toBe('appointment-staff-1');
    });
  });

  describe('Utility Functions', () => {
    it('should clear all mocks', () => {
      setupMockPatients(3);
      clearAllMocks();

      // After clearing, we should be able to set up new data
      const patients = setupMockPatients(1);
      expect(patients).toHaveLength(1);
    });

    it('should reset to default state', () => {
      resetMockSupabase();

      // Should have default data for all tables
      const patients = setupMockPatients();
      const staff = setupMockStaff();
      const appointments = setupMockAppointments();
      const appointmentStaff = setupMockAppointmentStaff();

      expect(patients.length).toBeGreaterThan(0);
      expect(staff.length).toBeGreaterThan(0);
      expect(appointments.length).toBeGreaterThan(0);
      expect(appointmentStaff.length).toBeGreaterThan(0);
    });
  });
});
