import {
    getEditSourceDisplayName,
    getTimeSinceLastExternalEdit,
    hasExternalEdits,
    isLastEditExternal,
    type Appointment,
    type EditSource,
} from './appointment';

describe('External Edit Tracking Functions', () => {
  const mockAppointment: Appointment = {
    id: 'test-appointment-1',
    patient_id: 'patient-1',
    appointment_type: 'doctor_on_call',
    appointment_date: '2024-01-15',
    start_time: '10:00',
    duration_minutes: 60,
    status: 'scheduled',
    custom_fields: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('hasExternalEdits', () => {
    it('should return false when external_edit_count is 0', () => {
      const appointment = { ...mockAppointment, external_edit_count: 0 };
      expect(hasExternalEdits(appointment)).toBe(false);
    });

    it('should return false when external_edit_count is undefined', () => {
      const appointment = { ...mockAppointment, external_edit_count: undefined };
      expect(hasExternalEdits(appointment)).toBe(false);
    });

    it('should return true when external_edit_count is greater than 0', () => {
      const appointment = { ...mockAppointment, external_edit_count: 1 };
      expect(hasExternalEdits(appointment)).toBe(true);
    });

    it('should return true when external_edit_count is greater than 1', () => {
      const appointment = { ...mockAppointment, external_edit_count: 5 };
      expect(hasExternalEdits(appointment)).toBe(true);
    });
  });

  describe('isLastEditExternal', () => {
    it('should return false when last_edit_source is app', () => {
      const appointment = { ...mockAppointment, last_edit_source: 'app' as EditSource };
      expect(isLastEditExternal(appointment)).toBe(false);
    });

    it('should return false when last_edit_source is manual', () => {
      const appointment = { ...mockAppointment, last_edit_source: 'manual' as EditSource };
      expect(isLastEditExternal(appointment)).toBe(false);
    });

    it('should return true when last_edit_source is webhook', () => {
      const appointment = { ...mockAppointment, last_edit_source: 'webhook' as EditSource };
      expect(isLastEditExternal(appointment)).toBe(true);
    });

    it('should return false when last_edit_source is undefined', () => {
      const appointment = { ...mockAppointment, last_edit_source: undefined };
      expect(isLastEditExternal(appointment)).toBe(false);
    });
  });

  describe('getEditSourceDisplayName', () => {
    it('should return correct display name for app', () => {
      expect(getEditSourceDisplayName('app')).toBe('App');
    });

    it('should return correct display name for webhook', () => {
      expect(getEditSourceDisplayName('webhook')).toBe('Webhook');
    });

    it('should return correct display name for manual', () => {
      expect(getEditSourceDisplayName('manual')).toBe('Manual');
    });
  });

  describe('getTimeSinceLastExternalEdit', () => {
    beforeEach(() => {
      // Mock Date.now() to return a fixed timestamp
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return null when last_external_edit is undefined', () => {
      const appointment = { ...mockAppointment, last_external_edit: undefined };
      expect(getTimeSinceLastExternalEdit(appointment)).toBeNull();
    });

    it('should return minutes ago for recent edits', () => {
      const appointment = {
        ...mockAppointment,
        last_external_edit: '2024-01-15T11:30:00Z' // 30 minutes ago
      };
      expect(getTimeSinceLastExternalEdit(appointment)).toBe('30 minutes ago');
    });

    it('should return singular minute for 1 minute ago', () => {
      const appointment = {
        ...mockAppointment,
        last_external_edit: '2024-01-15T11:59:00Z' // 1 minute ago
      };
      expect(getTimeSinceLastExternalEdit(appointment)).toBe('1 minute ago');
    });

    it('should return hours ago for edits within 24 hours', () => {
      const appointment = {
        ...mockAppointment,
        last_external_edit: '2024-01-15T10:00:00Z' // 2 hours ago
      };
      expect(getTimeSinceLastExternalEdit(appointment)).toBe('2 hours ago');
    });

    it('should return singular hour for 1 hour ago', () => {
      const appointment = {
        ...mockAppointment,
        last_external_edit: '2024-01-15T11:00:00Z' // 1 hour ago
      };
      expect(getTimeSinceLastExternalEdit(appointment)).toBe('1 hour ago');
    });

    it('should return days ago for older edits', () => {
      const appointment = {
        ...mockAppointment,
        last_external_edit: '2024-01-13T12:00:00Z' // 2 days ago
      };
      expect(getTimeSinceLastExternalEdit(appointment)).toBe('2 days ago');
    });

    it('should return singular day for 1 day ago', () => {
      const appointment = {
        ...mockAppointment,
        last_external_edit: '2024-01-14T12:00:00Z' // 1 day ago
      };
      expect(getTimeSinceLastExternalEdit(appointment)).toBe('1 day ago');
    });
  });
});
