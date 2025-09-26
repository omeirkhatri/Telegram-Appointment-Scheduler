import { schemas } from './supabase';

describe('Supabase Validation Schemas', () => {
  describe('Patient Schemas', () => {
    const validPatientData = {
      name: 'John Doe',
      phone: '+1234567890',
      flat_villa_no: '123',
      building_street: 'Main Street',
      area: 'Downtown',
      city: 'Dubai',
    };

    describe('patientInsertSchema', () => {
      it('should validate valid patient data', () => {
        const result = schemas.patient.insert.safeParse(validPatientData);
        expect(result.success).toBe(true);
      });

      it('should reject missing required fields', () => {
        const invalidData = { ...validPatientData };
        delete (invalidData as any).name;

        const result = schemas.patient.insert.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid input: expected string, received undefined');
        }
      });

      it('should reject invalid phone format', () => {
        const invalidData = { ...validPatientData, phone: 'invalid-phone' };

        const result = schemas.patient.insert.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid phone number format');
        }
      });

      it('should accept valid optional fields', () => {
        const dataWithOptionals = {
          ...validPatientData,
          id_document_url: 'https://example.com/doc.pdf',
          medical_notes: 'Some medical notes',
          emergency_contact: '+0987654321',
          preferred_transport: 'Taxi',
        };

        const result = schemas.patient.insert.safeParse(dataWithOptionals);
        expect(result.success).toBe(true);
      });
    });

    describe('patientUpdateSchema', () => {
      it('should allow partial updates', () => {
        const partialData = { name: 'Jane Doe' };

        const result = schemas.patient.update.safeParse(partialData);
        expect(result.success).toBe(true);
      });

      it('should validate fields when provided', () => {
        const invalidData = { phone: 'invalid-phone' };

        const result = schemas.patient.update.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid phone number format');
        }
      });
    });
  });

  describe('Staff Schemas', () => {
    const validStaffData = {
      first_name: 'Dr. John',
      last_name: 'Smith',
      staff_type: 'doctor' as const,
      phone: '+1234567890',
      email: 'john.smith@example.com',
      available_days: [1, 2, 3, 4, 5],
      working_hours_start: '09:00',
      working_hours_end: '17:00',
    };

    describe('staffInsertSchema', () => {
      it('should validate valid staff data', () => {
        const result = schemas.staff.insert.safeParse(validStaffData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid staff type', () => {
        const invalidData = { ...validStaffData, staff_type: 'invalid' as any };

        const result = schemas.staff.insert.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid email format', () => {
        const invalidData = { ...validStaffData, email: 'invalid-email' };

        const result = schemas.staff.insert.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid email');
        }
      });

      it('should reject invalid working hours', () => {
        const invalidData = {
          ...validStaffData,
          working_hours_start: '18:00',
          working_hours_end: '09:00',
        };

        const result = schemas.staff.insert.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Working hours start must be before end');
        }
      });

      it('should set default values', () => {
        const dataWithoutDefaults = { ...validStaffData };
        delete (dataWithoutDefaults as any).status;
        const result = schemas.staff.insert.safeParse(dataWithoutDefaults);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('active');
        }
      });
    });
  });

  describe('Appointment Schemas', () => {
    const validAppointmentData = {
      patient_id: '123e4567-e89b-12d3-a456-426614174000',
      appointment_type: 'doctor_on_call' as const,
      appointment_date: '2024-01-15',
      start_time: '10:00',
      duration_minutes: 60,
    };

    describe('appointmentInsertSchema', () => {
      it('should validate valid appointment data', () => {
        const result = schemas.appointment.insert.safeParse(validAppointmentData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid appointment type', () => {
        const invalidData = { ...validAppointmentData, appointment_type: 'invalid' as any };

        const result = schemas.appointment.insert.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid duration', () => {
        const invalidData = { ...validAppointmentData, duration_minutes: 0 };

        const result = schemas.appointment.insert.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Duration must be between 1 minute and 24 hours');
        }
      });

      it('should validate driver transportation', () => {
        const driverData = {
          ...validAppointmentData,
          transportation_type: 'driver' as const,
          driver_id: '123e4567-e89b-12d3-a456-426614174000',
        };

        const result = schemas.appointment.insert.safeParse(driverData);
        expect(result.success).toBe(true);
      });

      it('should reject driver transportation without driver_id', () => {
        const invalidData = {
          ...validAppointmentData,
          transportation_type: 'driver' as const,
          // Missing driver_id
        };

        const result = schemas.appointment.insert.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Driver ID required when transportation type is driver, or method required for self-transport');
        }
      });

      it('should validate self-transport transportation', () => {
        const selfTransportData = {
          ...validAppointmentData,
          transportation_type: 'self_transport' as const,
          transportation_method: 'Taxi',
        };

        const result = schemas.appointment.insert.safeParse(selfTransportData);
        expect(result.success).toBe(true);
      });

      it('should reject self-transport without method', () => {
        const invalidData = {
          ...validAppointmentData,
          transportation_type: 'self_transport' as const,
          // Missing transportation_method
        };

        const result = schemas.appointment.insert.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Driver ID required when transportation type is driver, or method required for self-transport');
        }
      });
    });
  });

  describe('Transportation Segment Schemas', () => {
    const baseSegmentData = {
      appointment_id: '123e4567-e89b-12d3-a456-426614174000',
      segment_type: 'pickup' as const,
      title: 'Patient pickup',
      planned_start: '2025-02-15T08:00:00Z',
      planned_end: '2025-02-15T08:30:00Z',
      driver_id: '923e4567-e89b-12d3-a456-426614174000',
      travel_mode: 'vehicle',
      origin: {
        lat: 25.2048,
        lng: 55.2708,
        address: 'Patient home',
      },
      destination: {
        lat: 25.1972,
        lng: 55.2744,
        address: 'Clinic entrance',
      },
      estimated_travel_minutes: 25,
      estimated_distance_km: 14.2,
      buffer_minutes: 5,
      instructions: 'Bring wheelchair',
      requires_follow_up: true,
      status: 'scheduled' as const,
      manual_override: false,
    };

    describe('transportationSegmentInsertSchema', () => {
      it('should validate a complete segment payload', () => {
        const result = schemas.transportationSegment.insert.safeParse(baseSegmentData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('scheduled');
        }
      });

      it('should default status to draft when omitted', () => {
        const minimalData = {
          appointment_id: baseSegmentData.appointment_id,
          segment_type: baseSegmentData.segment_type,
        };

        const result = schemas.transportationSegment.insert.safeParse(minimalData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('draft');
        }
      });

      it('should reject when planned_end precedes planned_start', () => {
        const invalid = {
          ...baseSegmentData,
          planned_end: '2025-02-15T07:30:00Z',
        };

        const result = schemas.transportationSegment.insert.safeParse(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Planned end must be after planned start');
        }
      });

      it('should reject empty string titles', () => {
        const invalid = {
          ...baseSegmentData,
          title: '   ',
        };

        const result = schemas.transportationSegment.insert.safeParse(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe('transportationSegmentUpdateSchema', () => {
      it('should allow partial updates', () => {
        const partial = {
          id: '223e4567-e89b-12d3-a456-426614174000',
          status: 'completed' as const,
          manual_override: true,
        };

        const result = schemas.transportationSegment.update.safeParse(partial);
        expect(result.success).toBe(true);
      });

      it('should validate driver ids on update when provided', () => {
        const invalid = {
          id: '323e4567-e89b-12d3-a456-426614174000',
          driver_id: 'not-a-uuid',
        };

        const result = schemas.transportationSegment.update.safeParse(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('driver_id');
        }
      });
    });
  });

  describe('Query Schemas', () => {
    describe('paginationSchema', () => {
      it('should set default values', () => {
        const result = schemas.query.pagination.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
        }
      });

      it('should validate page limits', () => {
        const invalidData = { page: 0, limit: 101 };

        const result = schemas.query.pagination.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('dateRangeSchema', () => {
      it('should validate valid date range', () => {
        const validData = {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        };

        const result = schemas.query.dateRange.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid date range', () => {
        const invalidData = {
          start_date: '2024-01-31',
          end_date: '2024-01-01',
        };

        const result = schemas.query.dateRange.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Start date must be before or equal to end date');
        }
      });
    });
  });

  describe('Filter Schemas', () => {
    describe('appointmentFiltersSchema', () => {
      it('should validate valid filters', () => {
        const validFilters = {
          appointment_type: 'doctor_on_call' as const,
          status: 'scheduled' as const,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          page: 1,
          limit: 10,
        };

        const result = schemas.filters.appointment.safeParse(validFilters);
        expect(result.success).toBe(true);
      });
    });

    describe('staffFiltersSchema', () => {
      it('should validate valid filters', () => {
        const validFilters = {
          staff_type: 'doctor' as const,
          status: 'active' as const,
          page: 1,
          limit: 10,
        };

        const result = schemas.filters.staff.safeParse(validFilters);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Response Schemas', () => {
    describe('apiResponseSchema', () => {
      it('should validate success response', () => {
        const successResponse = {
          success: true,
          data: { id: 'test-id' },
          message: 'Operation successful',
        };

        const result = schemas.response.api.safeParse(successResponse);
        expect(result.success).toBe(true);
      });

      it('should validate error response', () => {
        const errorResponse = {
          success: false,
          error: 'Something went wrong',
        };

        const result = schemas.response.api.safeParse(errorResponse);
        expect(result.success).toBe(true);
      });
    });

    describe('paginatedResponseSchema', () => {
      it('should create paginated response schema', () => {
        const itemSchema = schemas.patient.insert;
        const paginatedSchema = schemas.response.paginated(itemSchema);

        const validResponse = {
          items: [{
            name: 'Test Patient',
            phone: '+1234567890',
            flat_villa_no: '123',
            building_street: 'Test St',
            area: 'Test Area',
            city: 'Test City',
          }],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        };

        const result = paginatedSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });
    });
  });
});
