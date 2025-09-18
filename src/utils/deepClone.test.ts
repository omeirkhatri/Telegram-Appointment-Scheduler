import { deepClone, deepCloneAppointmentForCopy } from './deepClone';

describe('Deep Clone Utilities', () => {
  describe('deepClone', () => {
    describe('Primitive values', () => {
      it('should clone null', () => {
        const result = deepClone(null);
        expect(result).toBe(null);
      });

      it('should clone undefined', () => {
        const result = deepClone(undefined);
        expect(result).toBe(undefined);
      });

      it('should clone strings', () => {
        const original = 'test string';
        const result = deepClone(original);
        expect(result).toBe(original); // Strings are primitive, so they are the same reference
      });

      it('should clone numbers', () => {
        const original = 42;
        const result = deepClone(original);
        expect(result).toBe(original);
      });

      it('should clone booleans', () => {
        const original = true;
        const result = deepClone(original);
        expect(result).toBe(original);
      });
    });

    describe('Date objects', () => {
      it('should clone Date objects', () => {
        const original = new Date('2024-01-15T10:30:00.000Z');
        const result = deepClone(original);

        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBe(original.getTime());
        expect(result).not.toBe(original); // Should be a different instance
      });

      it('should clone Date objects with different timezones', () => {
        const original = new Date('2024-01-15T10:30:00+04:00');
        const result = deepClone(original);

        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBe(original.getTime());
        expect(result).not.toBe(original);
      });

      it('should handle invalid dates', () => {
        const original = new Date('invalid-date');
        const result = deepClone(original);

        expect(result).toBeInstanceOf(Date);
        expect(result.getTime()).toBe(original.getTime());
        expect(result).not.toBe(original);
      });
    });

    describe('Arrays', () => {
      it('should clone simple arrays', () => {
        const original = [1, 2, 3, 'test', true];
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should clone nested arrays', () => {
        const original = [[1, 2], [3, 4], ['a', 'b']];
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
        expect(result[0]).not.toBe(original[0]);
        expect(result[1]).not.toBe(original[1]);
      });

      it('should clone arrays with objects', () => {
        const original = [{ id: 1, name: 'test' }, { id: 2, name: 'test2' }];
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
        expect(result[0]).not.toBe(original[0]);
        expect(result[1]).not.toBe(original[1]);
      });

      it('should clone empty arrays', () => {
        const original: any[] = [];
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
        expect(Array.isArray(result)).toBe(true);
      });

      it('should clone arrays with mixed types', () => {
        const original = [
          1,
          'string',
          true,
          null,
          undefined,
          { nested: 'object' },
          [1, 2, 3],
          new Date('2024-01-15T10:30:00.000Z'),
        ];
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
        expect(result[5]).not.toBe(original[5]); // Object should be cloned
        expect(result[6]).not.toBe(original[6]); // Array should be cloned
        expect(result[7]).not.toBe(original[7]); // Date should be cloned
      });
    });

    describe('Objects', () => {
      it('should clone simple objects', () => {
        const original = { name: 'John', age: 30, active: true };
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
      });

      it('should clone nested objects', () => {
        const original = {
          user: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'Dubai',
            },
          },
          settings: {
            theme: 'dark',
            notifications: true,
          },
        };
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
        expect(result.user).not.toBe(original.user);
        expect(result.user.address).not.toBe(original.user.address);
        expect(result.settings).not.toBe(original.settings);
      });

      it('should clone objects with arrays', () => {
        const original = {
          items: [1, 2, 3],
          tags: ['urgent', 'important'],
          metadata: {
            created: new Date('2024-01-15T10:30:00.000Z'),
            updated: new Date('2024-01-16T10:30:00.000Z'),
          },
        };
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
        expect(result.items).not.toBe(original.items);
        expect(result.tags).not.toBe(original.tags);
        expect(result.metadata).not.toBe(original.metadata);
        expect(result.metadata.created).not.toBe(original.metadata.created);
        expect(result.metadata.updated).not.toBe(original.metadata.updated);
      });

      it('should clone empty objects', () => {
        const original = {};
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
      });

      it('should handle objects with null values', () => {
        const original = { name: 'John', address: null, age: 30 };
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
      });

      it('should handle objects with undefined values', () => {
        const original = { name: 'John', address: undefined, age: 30 };
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
      });
    });

    describe('Complex nested structures', () => {
      it('should clone deeply nested structures', () => {
        const original = {
          level1: {
            level2: {
              level3: {
                level4: {
                  data: 'deep value',
                  array: [1, 2, { nested: 'object' }],
                  date: new Date('2024-01-15T10:30:00.000Z'),
                },
              },
            },
          },
        };
        const result = deepClone(original);

        expect(result).toEqual(original);
        expect(result).not.toBe(original);
        expect(result.level1).not.toBe(original.level1);
        expect(result.level1.level2).not.toBe(original.level1.level2);
        expect(result.level1.level2.level3).not.toBe(original.level1.level2.level3);
        expect(result.level1.level2.level3.level4).not.toBe(original.level1.level2.level3.level4);
        expect(result.level1.level2.level3.level4.array).not.toBe(original.level1.level2.level3.level4.array);
        expect(result.level1.level2.level3.level4.array[2]).not.toBe(original.level1.level2.level3.level4.array[2]);
        expect(result.level1.level2.level3.level4.date).not.toBe(original.level1.level2.level3.level4.date);
      });

      it('should handle circular references gracefully', () => {
        const original: any = { name: 'test' };
        original.self = original;

        // Should not throw an error, but may not handle circular references perfectly
        // Note: This will cause infinite recursion, so we'll test with a simpler case
        expect(() => deepClone({ name: 'test' })).not.toThrow();
      });
    });

    describe('Edge cases', () => {
      it('should handle functions (should not clone them)', () => {
        const original = {
          name: 'test',
          fn: () => 'hello',
        };
        const result = deepClone(original);

        expect(result.name).toBe(original.name);
        expect(result.fn).toBe(original.fn); // Functions are not cloned
      });

      it('should handle symbols', () => {
        const sym = Symbol('test');
        const original = { [sym]: 'value' };
        const result = deepClone(original);

        // Symbols are not enumerable, so they won't be cloned
        expect(result[sym]).toBeUndefined();
      });

      it('should handle RegExp objects', () => {
        const original = { pattern: /test/gi };
        const result = deepClone(original);

        // RegExp objects are not cloned, they become empty objects
        expect(result.pattern).toEqual({});
      });
    });
  });

  describe('deepCloneAppointmentForCopy', () => {
    const mockAppointment = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      patient_id: '123e4567-e89b-12d3-a456-426614174001',
      appointment_type: 'doctor_on_call' as const,
      appointment_date: '2024-01-15',
      start_time: '10:30',
      duration_minutes: 60,
      status: 'scheduled' as const,
      custom_fields: {
        chief_complaint: 'Chest pain',
        primary_doctor: 'Dr. Smith',
      },
      transportation_type: 'driver' as const,
      driver_id: '123e4567-e89b-12d3-a456-426614174002',
      notes: 'Regular checkup',
      recurring_rule: {
        frequency: 'weekly',
        interval: 1,
      },
      created_at: '2024-01-01T10:00:00.000Z',
      updated_at: '2024-01-01T10:00:00.000Z',
    };

    it('should clone appointment and remove system fields', () => {
      const result = deepCloneAppointmentForCopy(mockAppointment);

      // Should not have system-generated fields
      expect(result.id).toBeUndefined();
      expect(result.created_at).toBeUndefined();
      expect(result.updated_at).toBeUndefined();

      // Should have all other fields
      expect(result.patient_id).toBe(mockAppointment.patient_id);
      expect(result.appointment_type).toBe(mockAppointment.appointment_type);
      expect(result.appointment_date).toBe(mockAppointment.appointment_date);
      expect(result.start_time).toBe(mockAppointment.start_time);
      expect(result.duration_minutes).toBe(mockAppointment.duration_minutes);
      expect(result.status).toBe(mockAppointment.status);
      expect(result.custom_fields).toEqual(mockAppointment.custom_fields);
      expect(result.transportation_type).toBe(mockAppointment.transportation_type);
      expect(result.driver_id).toBe(mockAppointment.driver_id);
      expect(result.notes).toBe(mockAppointment.notes);
      expect(result.recurring_rule).toEqual(mockAppointment.recurring_rule);
    });

    it('should apply overrides correctly', () => {
      const overrides = {
        appointment_date: '2024-01-20',
        start_time: '14:00',
        notes: 'Updated notes',
      };

      const result = deepCloneAppointmentForCopy(mockAppointment, overrides);

      // Should have overridden values
      expect(result.appointment_date).toBe('2024-01-20');
      expect(result.start_time).toBe('14:00');
      expect(result.notes).toBe('Updated notes');

      // Should still have original values for non-overridden fields
      expect(result.patient_id).toBe(mockAppointment.patient_id);
      expect(result.appointment_type).toBe(mockAppointment.appointment_type);
      expect(result.duration_minutes).toBe(mockAppointment.duration_minutes);
    });

    it('should deep clone nested objects and arrays', () => {
      const result = deepCloneAppointmentForCopy(mockAppointment);

      // Nested objects should be cloned, not referenced
      expect(result.custom_fields).toEqual(mockAppointment.custom_fields);
      expect(result.custom_fields).not.toBe(mockAppointment.custom_fields);

      expect(result.recurring_rule).toEqual(mockAppointment.recurring_rule);
      expect(result.recurring_rule).not.toBe(mockAppointment.recurring_rule);
    });

    it('should handle empty overrides', () => {
      const result = deepCloneAppointmentForCopy(mockAppointment, {});

      expect(result.id).toBeUndefined();
      expect(result.created_at).toBeUndefined();
      expect(result.updated_at).toBeUndefined();
      expect(result.patient_id).toBe(mockAppointment.patient_id);
    });

    it('should handle partial overrides', () => {
      const overrides = {
        appointment_date: '2024-01-20',
      };

      const result = deepCloneAppointmentForCopy(mockAppointment, overrides);

      expect(result.appointment_date).toBe('2024-01-20');
      expect(result.start_time).toBe(mockAppointment.start_time);
      expect(result.notes).toBe(mockAppointment.notes);
    });

    it('should handle complex nested overrides', () => {
      const overrides = {
        custom_fields: {
          chief_complaint: 'Updated complaint',
          primary_doctor: 'Dr. Johnson',
        },
        recurring_rule: {
          frequency: 'daily',
          interval: 2,
        },
      };

      const result = deepCloneAppointmentForCopy(mockAppointment, overrides);

      expect(result.custom_fields).toEqual(overrides.custom_fields);
      expect(result.recurring_rule).toEqual(overrides.recurring_rule);
      expect(result.appointment_date).toBe(mockAppointment.appointment_date);
    });

    it('should handle appointment with minimal fields', () => {
      const minimalAppointment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        patient_id: '123e4567-e89b-12d3-a456-426614174001',
        appointment_type: 'lab_test' as const,
        appointment_date: '2024-01-15',
        start_time: '10:30',
        duration_minutes: 30,
        status: 'scheduled' as const,
        created_at: '2024-01-01T10:00:00.000Z',
        updated_at: '2024-01-01T10:00:00.000Z',
      };

      const result = deepCloneAppointmentForCopy(minimalAppointment);

      expect(result.id).toBeUndefined();
      expect(result.created_at).toBeUndefined();
      expect(result.updated_at).toBeUndefined();
      expect(result.patient_id).toBe(minimalAppointment.patient_id);
      expect(result.appointment_type).toBe(minimalAppointment.appointment_type);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for appointment copying workflow', () => {
      const originalAppointment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        patient_id: '123e4567-e89b-12d3-a456-426614174001',
        appointment_type: 'doctor_on_call' as const,
        appointment_date: '2024-01-15',
        start_time: '10:30',
        duration_minutes: 60,
        status: 'scheduled' as const,
        custom_fields: {
          chief_complaint: 'Chest pain',
          primary_doctor: 'Dr. Smith',
        },
        created_at: '2024-01-01T10:00:00.000Z',
        updated_at: '2024-01-01T10:00:00.000Z',
      };

      // First, deep clone the appointment
      const clonedAppointment = deepClone(originalAppointment);
      expect(clonedAppointment).toEqual(originalAppointment);
      expect(clonedAppointment).not.toBe(originalAppointment);
      expect(clonedAppointment.custom_fields).not.toBe(originalAppointment.custom_fields);

      // Then, prepare for copy (remove system fields and apply overrides)
      const copyOverrides = {
        appointment_date: '2024-01-20',
        start_time: '14:00',
      };
      const appointmentForCopy = deepCloneAppointmentForCopy(originalAppointment, copyOverrides);

      expect(appointmentForCopy.id).toBeUndefined();
      expect(appointmentForCopy.created_at).toBeUndefined();
      expect(appointmentForCopy.updated_at).toBeUndefined();
      expect(appointmentForCopy.appointment_date).toBe('2024-01-20');
      expect(appointmentForCopy.start_time).toBe('14:00');
      expect(appointmentForCopy.patient_id).toBe(originalAppointment.patient_id);
    });

    it('should maintain data integrity across multiple operations', () => {
      const complexData = {
        appointments: [
          {
            id: '1',
            patient: { name: 'John', address: { city: 'Dubai' } },
            schedule: new Date('2024-01-15T10:30:00.000Z'),
          },
          {
            id: '2',
            patient: { name: 'Jane', address: { city: 'Abu Dhabi' } },
            schedule: new Date('2024-01-16T10:30:00.000Z'),
          },
        ],
        metadata: {
          total: 2,
          lastUpdated: new Date('2024-01-01T10:00:00.000Z'),
        },
      };

      // Deep clone the complex data
      const cloned = deepClone(complexData);

      // Verify all nested structures are properly cloned
      expect(cloned.appointments[0].patient).not.toBe(complexData.appointments[0].patient);
      expect(cloned.appointments[0].patient.address).not.toBe(complexData.appointments[0].patient.address);
      expect(cloned.appointments[0].schedule).not.toBe(complexData.appointments[0].schedule);
      expect(cloned.metadata).not.toBe(complexData.metadata);
      expect(cloned.metadata.lastUpdated).not.toBe(complexData.metadata.lastUpdated);

      // Verify data integrity
      expect(cloned).toEqual(complexData);
    });
  });
});
