import {
  validatePatient,
  validateStaff,
  validateAppointment,
  safeValidatePatient,
  safeValidateStaff,
  safeValidateAppointment,
  formatValidationErrors,
  patientSchema,
  staffSchema,
  appointmentSchema,
} from './validation';

describe('Validation Utilities', () => {
  describe('Patient Validation', () => {
    const validPatientData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+971501234567',
      date_of_birth: '1990-01-01',
      address: '123 Healthcare Street, Dubai, UAE',
      emergency_contact: '+971509876543',
      medical_history: 'No known allergies',
    };

    it('should validate correct patient data', () => {
      const result = validatePatient(validPatientData);
      expect(result).toEqual(validPatientData);
    });

    it('should throw error for invalid email', () => {
      const invalidData = { ...validPatientData, email: 'invalid-email' };
      expect(() => validatePatient(invalidData)).toThrow();
    });

    it('should throw error for invalid phone', () => {
      const invalidData = { ...validPatientData, phone: '123' };
      expect(() => validatePatient(invalidData)).toThrow();
    });

    it('should throw error for invalid date of birth', () => {
      const invalidData = {
        ...validPatientData,
        date_of_birth: 'invalid-date',
      };
      expect(() => validatePatient(invalidData)).toThrow();
    });

    it('should throw error for future date of birth', () => {
      const invalidData = { ...validPatientData, date_of_birth: '2030-01-01' };
      expect(() => validatePatient(invalidData)).toThrow();
    });

    it('should throw error for short address', () => {
      const invalidData = { ...validPatientData, address: 'Short' };
      expect(() => validatePatient(invalidData)).toThrow();
    });

    it('should return success for safe validation', () => {
      const result = safeValidatePatient(validPatientData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPatientData);
      }
    });

    it('should return error for safe validation with invalid data', () => {
      const invalidData = { ...validPatientData, email: 'invalid-email' };
      const result = safeValidatePatient(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe('Staff Validation', () => {
    const validStaffData = {
      name: 'Dr. Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+971501234568',
      staff_type: 'medical' as const,
      google_calendar_id: 'test-calendar-id',
      is_active: true,
    };

    it('should validate correct staff data', () => {
      const result = validateStaff(validStaffData);
      expect(result).toEqual(validStaffData);
    });

    it('should accept driver staff type', () => {
      const driverData = { ...validStaffData, staff_type: 'driver' as const };
      const result = validateStaff(driverData);
      expect(result.staff_type).toBe('driver');
    });

    it('should throw error for invalid staff type', () => {
      const invalidData = { ...validStaffData, staff_type: 'invalid' as any };
      expect(() => validateStaff(invalidData)).toThrow();
    });

    it('should return success for safe validation', () => {
      const result = safeValidateStaff(validStaffData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validStaffData);
      }
    });
  });

  describe('Appointment Validation', () => {
    const validAppointmentData = {
      patient_id: '123e4567-e89b-12d3-a456-426614174000',
      appointment_type: 'consultation' as const,
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T11:00:00Z',
      notes: 'Regular checkup',
      staff_ids: ['123e4567-e89b-12d3-a456-426614174001'],
      custom_fields: {},
      recurring_rule: {},
    };

    it('should validate correct appointment data', () => {
      const result = validateAppointment(validAppointmentData);
      expect(result).toEqual(validAppointmentData);
    });

    it('should throw error for invalid patient ID', () => {
      const invalidData = { ...validAppointmentData, patient_id: 'invalid-id' };
      expect(() => validateAppointment(invalidData)).toThrow();
    });

    it('should throw error for invalid appointment type', () => {
      const invalidData = {
        ...validAppointmentData,
        appointment_type: 'invalid' as any,
      };
      expect(() => validateAppointment(invalidData)).toThrow();
    });

    it('should throw error when end time is before start time', () => {
      const invalidData = {
        ...validAppointmentData,
        start_time: '2024-01-01T11:00:00Z',
        end_time: '2024-01-01T10:00:00Z',
      };
      expect(() => validateAppointment(invalidData)).toThrow();
    });

    it('should throw error for empty staff_ids', () => {
      const invalidData = { ...validAppointmentData, staff_ids: [] };
      expect(() => validateAppointment(invalidData)).toThrow();
    });

    it('should throw error for invalid staff ID', () => {
      const invalidData = {
        ...validAppointmentData,
        staff_ids: ['invalid-id'],
      };
      expect(() => validateAppointment(invalidData)).toThrow();
    });

    it('should return success for safe validation', () => {
      const result = safeValidateAppointment(validAppointmentData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validAppointmentData);
      }
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const mockError = {
        issues: [
          { path: ['email'], message: 'Invalid email' },
          { path: ['phone'], message: 'Invalid phone' },
        ],
      } as any;

      const result = formatValidationErrors(mockError);
      expect(result).toEqual({
        email: 'Invalid email',
        phone: 'Invalid phone',
      });
    });

    it('should handle nested paths', () => {
      const mockError = {
        issues: [{ path: ['user', 'email'], message: 'Invalid email' }],
      } as any;

      const result = formatValidationErrors(mockError);
      expect(result).toEqual({
        'user.email': 'Invalid email',
      });
    });
  });

  describe('Schema Exports', () => {
    it('should export patient schema', () => {
      expect(patientSchema).toBeDefined();
    });

    it('should export staff schema', () => {
      expect(staffSchema).toBeDefined();
    });

    it('should export appointment schema', () => {
      expect(appointmentSchema).toBeDefined();
    });
  });
});
