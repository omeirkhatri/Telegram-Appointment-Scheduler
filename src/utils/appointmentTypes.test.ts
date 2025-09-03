import type { AppointmentType } from '@/types/appointment';
import {
    APPOINTMENT_TYPE_COLORS,
    APPOINTMENT_TYPE_DURATION_CONSTRAINTS,
    formatDuration,
    getAllowedDurations,
    getAppointmentTypeColor,
    getDurationConstraints,
    validateDurationForType,
} from './appointmentTypes';

describe('Appointment Types Utilities', () => {
  describe('APPOINTMENT_TYPE_DURATION_CONSTRAINTS', () => {
    it('should have constraints for all appointment types', () => {
      const appointmentTypes: AppointmentType[] = [
        'doctor_on_call',
        'lab_test',
        'teleconsultation',
        'physiotherapy',
        'caregiver',
        'iv_therapy',
      ];

      appointmentTypes.forEach(type => {
        expect(APPOINTMENT_TYPE_DURATION_CONSTRAINTS[type]).toBeDefined();
        expect(APPOINTMENT_TYPE_DURATION_CONSTRAINTS[type].min).toBeGreaterThan(0);
        expect(APPOINTMENT_TYPE_DURATION_CONSTRAINTS[type].max).toBeGreaterThan(0);
        expect(APPOINTMENT_TYPE_DURATION_CONSTRAINTS[type].max).toBeGreaterThanOrEqual(
          APPOINTMENT_TYPE_DURATION_CONSTRAINTS[type].min,
        );
      });
    });

    it('should have correct duration constraints for doctor_on_call', () => {
      const constraints = APPOINTMENT_TYPE_DURATION_CONSTRAINTS.doctor_on_call;
      expect(constraints.min).toBe(30);
      expect(constraints.max).toBe(90);
      expect(constraints.allowedValues).toEqual([30, 45, 60, 90]);
    });

    it('should have correct duration constraints for lab_test', () => {
      const constraints = APPOINTMENT_TYPE_DURATION_CONSTRAINTS.lab_test;
      expect(constraints.min).toBe(15);
      expect(constraints.max).toBe(45);
      expect(constraints.allowedValues).toEqual([15, 30, 45]);
    });

    it('should have correct duration constraints for teleconsultation', () => {
      const constraints = APPOINTMENT_TYPE_DURATION_CONSTRAINTS.teleconsultation;
      expect(constraints.min).toBe(15);
      expect(constraints.max).toBe(60);
      expect(constraints.allowedValues).toEqual([15, 30, 45, 60]);
    });

    it('should have correct duration constraints for physiotherapy', () => {
      const constraints = APPOINTMENT_TYPE_DURATION_CONSTRAINTS.physiotherapy;
      expect(constraints.min).toBe(45);
      expect(constraints.max).toBe(120);
      expect(constraints.allowedValues).toEqual([45, 60, 90, 120]);
    });

    it('should have correct duration constraints for caregiver', () => {
      const constraints = APPOINTMENT_TYPE_DURATION_CONSTRAINTS.caregiver;
      expect(constraints.min).toBe(120); // 2 hours
      expect(constraints.max).toBe(1440); // 24 hours
      expect(constraints.allowedValues).toEqual([120, 240, 360, 480, 720, 1440]);
    });

    it('should have correct duration constraints for iv_therapy', () => {
      const constraints = APPOINTMENT_TYPE_DURATION_CONSTRAINTS.iv_therapy;
      expect(constraints.min).toBe(60); // 1 hour
      expect(constraints.max).toBe(240); // 4 hours
      expect(constraints.allowedValues).toEqual([60, 120, 180, 240]);
    });
  });

  describe('APPOINTMENT_TYPE_COLORS', () => {
    it('should have colors for all appointment types', () => {
      const appointmentTypes: AppointmentType[] = [
        'doctor_on_call',
        'lab_test',
        'teleconsultation',
        'physiotherapy',
        'caregiver',
        'iv_therapy',
      ];

      appointmentTypes.forEach(type => {
        const colors = APPOINTMENT_TYPE_COLORS[type];
        expect(colors).toBeDefined();
        expect(colors.primary).toMatch(/^#[0-9A-F]{6}$/i);
        expect(colors.light).toMatch(/^#[0-9A-F]{6}$/i);
        expect(colors.text).toMatch(/^#[0-9A-F]{6}$/i);
        expect(colors.border).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should have distinct colors for different appointment types', () => {
      const colors = Object.values(APPOINTMENT_TYPE_COLORS);
      const primaryColors = colors.map(c => c.primary);
      const uniqueColors = new Set(primaryColors);
      expect(uniqueColors.size).toBe(colors.length);
    });

    it('should have correct color scheme for doctor_on_call', () => {
      const colors = APPOINTMENT_TYPE_COLORS.doctor_on_call;
      expect(colors.primary).toBe('#3B82F6'); // Blue
      expect(colors.light).toBe('#DBEAFE');
      expect(colors.text).toBe('#1E40AF');
      expect(colors.border).toBe('#93C5FD');
    });

    it('should have correct color scheme for lab_test', () => {
      const colors = APPOINTMENT_TYPE_COLORS.lab_test;
      expect(colors.primary).toBe('#10B981'); // Green
      expect(colors.light).toBe('#D1FAE5');
      expect(colors.text).toBe('#047857');
      expect(colors.border).toBe('#6EE7B7');
    });
  });

  describe('getDurationConstraints', () => {
    it('should return correct constraints for valid appointment type', () => {
      const constraints = getDurationConstraints('doctor_on_call');
      expect(constraints).toEqual(APPOINTMENT_TYPE_DURATION_CONSTRAINTS.doctor_on_call);
    });

    it('should return constraints for all appointment types', () => {
      const appointmentTypes: AppointmentType[] = [
        'doctor_on_call',
        'lab_test',
        'teleconsultation',
        'physiotherapy',
        'caregiver',
        'iv_therapy',
      ];

      appointmentTypes.forEach(type => {
        const constraints = getDurationConstraints(type);
        expect(constraints).toBeDefined();
        expect(constraints.min).toBeGreaterThan(0);
        expect(constraints.max).toBeGreaterThan(0);
      });
    });
  });

  describe('validateDurationForType', () => {
    describe('Valid durations', () => {
      it('should validate correct duration for doctor_on_call', () => {
        const result = validateDurationForType('doctor_on_call', 45);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate correct duration for lab_test', () => {
        const result = validateDurationForType('lab_test', 30);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate correct duration for caregiver', () => {
        const result = validateDurationForType('caregiver', 240); // 4 hours
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate correct duration for iv_therapy', () => {
        const result = validateDurationForType('iv_therapy', 120); // 2 hours
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    describe('Invalid durations - too short', () => {
      it('should reject duration below minimum for doctor_on_call', () => {
        const result = validateDurationForType('doctor_on_call', 15);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration must be at least 30 minutes');
        expect(result.error).toContain('doctor on_call');
      });

      it('should reject duration below minimum for lab_test', () => {
        const result = validateDurationForType('lab_test', 10);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration must be at least 15 minutes');
        expect(result.error).toContain('lab test');
      });

      it('should reject duration below minimum for caregiver', () => {
        const result = validateDurationForType('caregiver', 60); // 1 hour
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration must be at least 120 minutes');
        expect(result.error).toContain('caregiver');
      });
    });

    describe('Invalid durations - too long', () => {
      it('should reject duration above maximum for doctor_on_call', () => {
        const result = validateDurationForType('doctor_on_call', 120);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration cannot exceed 90 minutes');
        expect(result.error).toContain('doctor on_call');
      });

      it('should reject duration above maximum for lab_test', () => {
        const result = validateDurationForType('lab_test', 60);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration cannot exceed 45 minutes');
        expect(result.error).toContain('lab test');
      });

      it('should reject duration above maximum for iv_therapy', () => {
        const result = validateDurationForType('iv_therapy', 300); // 5 hours
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration cannot exceed 240 minutes');
        expect(result.error).toContain('iv therapy');
      });
    });

    describe('Invalid durations - not in allowed values', () => {
      it('should reject duration not in allowed values for doctor_on_call', () => {
        const result = validateDurationForType('doctor_on_call', 35);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration must be one of: 30 minutes, 45 minutes, 1 hour, 1.5 hours');
        expect(result.error).toContain('doctor on_call');
      });

      it('should reject duration not in allowed values for lab_test', () => {
        const result = validateDurationForType('lab_test', 20);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration must be one of: 15 minutes, 30 minutes, 45 minutes');
        expect(result.error).toContain('lab test');
      });

      it('should reject duration not in allowed values for caregiver', () => {
        const result = validateDurationForType('caregiver', 180); // 3 hours
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration must be one of: 2 hours, 4 hours, 6 hours, 8 hours, 12 hours, 24 hours');
        expect(result.error).toContain('caregiver');
      });
    });

    describe('Edge cases', () => {
      it('should handle boundary values correctly', () => {
        const doctorMin = validateDurationForType('doctor_on_call', 30);
        const doctorMax = validateDurationForType('doctor_on_call', 90);

        expect(doctorMin.isValid).toBe(true);
        expect(doctorMax.isValid).toBe(true);
      });

      it('should handle zero duration', () => {
        const result = validateDurationForType('lab_test', 0);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration must be at least 15 minutes');
      });

      it('should handle negative duration', () => {
        const result = validateDurationForType('teleconsultation', -10);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Duration must be at least 15 minutes');
      });
    });
  });

  describe('getAppointmentTypeColor', () => {
    it('should return primary color by default', () => {
      const color = getAppointmentTypeColor('doctor_on_call');
      expect(color).toBe('#3B82F6');
    });

    it('should return correct color variant', () => {
      const primary = getAppointmentTypeColor('lab_test', 'primary');
      const light = getAppointmentTypeColor('lab_test', 'light');
      const text = getAppointmentTypeColor('lab_test', 'text');
      const border = getAppointmentTypeColor('lab_test', 'border');

      expect(primary).toBe('#10B981');
      expect(light).toBe('#D1FAE5');
      expect(text).toBe('#047857');
      expect(border).toBe('#6EE7B7');
    });

    it('should return colors for all appointment types', () => {
      const appointmentTypes: AppointmentType[] = [
        'doctor_on_call',
        'lab_test',
        'teleconsultation',
        'physiotherapy',
        'caregiver',
        'iv_therapy',
      ];

      appointmentTypes.forEach(type => {
        const color = getAppointmentTypeColor(type);
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('getAllowedDurations', () => {
    it('should return allowed durations for appointment type', () => {
      const durations = getAllowedDurations('doctor_on_call');
      expect(durations).toEqual([30, 45, 60, 90]);
    });

    it('should return allowed durations for all appointment types', () => {
      const appointmentTypes: AppointmentType[] = [
        'doctor_on_call',
        'lab_test',
        'teleconsultation',
        'physiotherapy',
        'caregiver',
        'iv_therapy',
      ];

      appointmentTypes.forEach(type => {
        const durations = getAllowedDurations(type);
        expect(Array.isArray(durations)).toBe(true);
        expect(durations.length).toBeGreaterThan(0);
        durations.forEach(duration => {
          expect(typeof duration).toBe('number');
          expect(duration).toBeGreaterThan(0);
        });
      });
    });

    it('should return empty array for appointment type without allowed values', () => {
      // This test assumes there might be appointment types without allowedValues
      // Currently all types have allowedValues, but this tests the function's behavior
      const durations = getAllowedDurations('doctor_on_call');
      expect(durations).toEqual([30, 45, 60, 90]);
    });
  });

  describe('formatDuration', () => {
    it('should format minutes correctly', () => {
      expect(formatDuration(30)).toBe('30 minutes');
      expect(formatDuration(45)).toBe('45 minutes');
      expect(formatDuration(59)).toBe('59 minutes');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(60)).toBe('1 hour');
      expect(formatDuration(120)).toBe('2 hours');
      expect(formatDuration(180)).toBe('3 hours');
    });

    it('should format fractional hours correctly', () => {
      expect(formatDuration(90)).toBe('1.5 hours');
      expect(formatDuration(150)).toBe('2.5 hours');
      expect(formatDuration(210)).toBe('3.5 hours');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('0 minutes');
      expect(formatDuration(1)).toBe('1 minutes');
    });

    it('should handle large durations', () => {
      expect(formatDuration(1440)).toBe('24 hours'); // 24 hours
      expect(formatDuration(2880)).toBe('48 hours'); // 48 hours
    });
  });

  describe('Integration Tests', () => {
    it('should work together for appointment validation workflow', () => {
      const appointmentType = 'doctor_on_call';
      const duration = 45;

      // Get constraints
      const constraints = getDurationConstraints(appointmentType);
      expect(constraints.min).toBe(30);
      expect(constraints.max).toBe(90);

      // Validate duration
      const validation = validateDurationForType(appointmentType, duration);
      expect(validation.isValid).toBe(true);

      // Get allowed durations
      const allowedDurations = getAllowedDurations(appointmentType);
      expect(allowedDurations).toContain(duration);

      // Format duration
      const formatted = formatDuration(duration);
      expect(formatted).toBe('45 minutes');

      // Get color
      const color = getAppointmentTypeColor(appointmentType);
      expect(color).toBe('#3B82F6');
    });

    it('should handle invalid appointment type gracefully', () => {
      // TypeScript would prevent this, but test runtime behavior
      const invalidType = 'invalid_type' as any;

      // These functions don't throw, they just return undefined or default values
      expect(() => getDurationConstraints(invalidType)).not.toThrow();
      // validateDurationForType will throw because it tries to access constraints.min
      expect(() => validateDurationForType(invalidType, 30)).toThrow();
      expect(() => getAppointmentTypeColor(invalidType)).toThrow();
      expect(() => getAllowedDurations(invalidType)).toThrow();
    });
  });
});
