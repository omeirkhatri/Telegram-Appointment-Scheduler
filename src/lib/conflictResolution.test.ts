import {
    detectConflicts,
    detectDuplicateEvents,
    getConflictResolutionStrategy,
    resolveConflicts,
    validateAppointmentForSync,
    type CalendarEvent,
    type ConflictInfo,
} from './conflictResolution';

describe('conflictResolution', () => {
  const mockStaff = {
    id: 'staff-1',
    name: 'Dr. Smith',
    staff_type: 'doctor' as const,
    google_calendar_id: 'calendar-1@group.calendar.google.com',
    email: 'dr.smith@example.com',
  };

  const mockAppointment = {
    id: 'appointment-1',
    patient_name: 'John Doe',
    appointment_type: 'consultation',
    appointment_date: '2024-01-15',
    start_time: '09:00',
    duration_minutes: 60,
    google_event_ids: { 'staff-1': 'event-1' },
  };

  const mockCalendarEvent: CalendarEvent = {
    id: 'event-1',
    summary: '👨‍⚕️ consultation - John Doe',
    description: 'Patient consultation',
    start: { dateTime: '2024-01-15T09:00:00Z', timeZone: 'Asia/Dubai' },
    end: { dateTime: '2024-01-15T10:00:00Z', timeZone: 'Asia/Dubai' },
    location: 'https://maps.google.com',
    attendees: [{ email: 'dr.smith@example.com' }],
    updated: '2024-01-15T08:00:00Z',
    created: '2024-01-15T08:00:00Z',
  };

  describe('detectConflicts', () => {
    it('should detect missing event conflicts', () => {
      const conflicts = detectConflicts(mockAppointment, null, mockStaff);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'missing_event',
        severity: 'high',
        appointmentId: 'appointment-1',
        staffId: 'staff-1',
      });
    });

    it('should detect time conflicts', () => {
      const conflictingEvent: CalendarEvent = {
        ...mockCalendarEvent,
        start: { dateTime: '2024-01-15T09:30:00Z', timeZone: 'Asia/Dubai' },
        end: { dateTime: '2024-01-15T10:30:00Z', timeZone: 'Asia/Dubai' },
      };

      const conflicts = detectConflicts(mockAppointment, conflictingEvent, mockStaff);

      expect(conflicts).toHaveLength(1); // Only time conflict (duration is the same)
      expect(conflicts.some(c => c.type === 'time_conflict')).toBe(true);
    });

    it('should detect data mismatches', () => {
      const mismatchedEvent: CalendarEvent = {
        ...mockCalendarEvent,
        summary: 'Wrong Summary',
      };

      const conflicts = detectConflicts(mockAppointment, mismatchedEvent, mockStaff);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'data_mismatch',
        severity: 'low',
      });
    });

    it('should not detect conflicts for matching data', () => {
      const conflicts = detectConflicts(mockAppointment, mockCalendarEvent, mockStaff);

      expect(conflicts).toHaveLength(0);
    });

    it('should handle small time differences without conflicts', () => {
      const slightlyDifferentEvent: CalendarEvent = {
        ...mockCalendarEvent,
        start: { dateTime: '2024-01-15T09:02:00Z', timeZone: 'Asia/Dubai' },
        end: { dateTime: '2024-01-15T10:02:00Z', timeZone: 'Asia/Dubai' },
      };

      const conflicts = detectConflicts(mockAppointment, slightlyDifferentEvent, mockStaff);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('resolveConflicts', () => {
    it('should resolve no conflicts', () => {
      const resolution = resolveConflicts([], mockAppointment, mockCalendarEvent, mockStaff);

      expect(resolution.resolved).toBe(true);
      expect(resolution.action).toBe('update_calendar');
    });

    it('should resolve missing event conflicts', () => {
      const conflicts: ConflictInfo[] = [{
        type: 'missing_event',
        severity: 'high',
        description: 'No event found',
        appointmentId: 'appointment-1',
        staffId: 'staff-1',
      }];

      const resolution = resolveConflicts(conflicts, mockAppointment, null, mockStaff);

      expect(resolution.resolved).toBe(true);
      expect(resolution.action).toBe('create_event');
    });

    it('should require manual review for time conflicts', () => {
      const conflicts: ConflictInfo[] = [{
        type: 'time_conflict',
        severity: 'medium',
        description: 'Time mismatch',
        appointmentId: 'appointment-1',
        eventId: 'event-1',
        staffId: 'staff-1',
      }];

      const resolution = resolveConflicts(conflicts, mockAppointment, mockCalendarEvent, mockStaff);

      expect(resolution.resolved).toBe(false);
      expect(resolution.action).toBe('manual_review');
    });

    it('should resolve data mismatches automatically', () => {
      const conflicts: ConflictInfo[] = [{
        type: 'data_mismatch',
        severity: 'low',
        description: 'Summary mismatch',
        appointmentId: 'appointment-1',
        eventId: 'event-1',
        staffId: 'staff-1',
      }];

      const resolution = resolveConflicts(conflicts, mockAppointment, mockCalendarEvent, mockStaff);

      expect(resolution.resolved).toBe(true);
      expect(resolution.action).toBe('update_appointment');
    });
  });

  describe('detectDuplicateEvents', () => {
    it('should detect duplicate events', () => {
      const events: CalendarEvent[] = [
        mockCalendarEvent,
        {
          ...mockCalendarEvent,
          id: 'event-2',
          start: { dateTime: '2024-01-15T09:30:00Z', timeZone: 'Asia/Dubai' },
          end: { dateTime: '2024-01-15T10:30:00Z', timeZone: 'Asia/Dubai' },
        },
        {
          ...mockCalendarEvent,
          id: 'event-3',
          start: { dateTime: '2024-01-15T09:15:00Z', timeZone: 'Asia/Dubai' },
          end: { dateTime: '2024-01-15T10:15:00Z', timeZone: 'Asia/Dubai' },
        },
      ];

      const conflicts = detectDuplicateEvents(events, mockAppointment, mockStaff);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'duplicate_event',
        severity: 'high',
      });
    });

    it('should not detect duplicates for non-overlapping events', () => {
      const events: CalendarEvent[] = [
        mockCalendarEvent,
        {
          ...mockCalendarEvent,
          id: 'event-2',
          start: { dateTime: '2024-01-15T11:00:00Z', timeZone: 'Asia/Dubai' },
          end: { dateTime: '2024-01-15T12:00:00Z', timeZone: 'Asia/Dubai' },
        },
      ];

      const conflicts = detectDuplicateEvents(events, mockAppointment, mockStaff);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('validateAppointmentForSync', () => {
    it('should validate complete appointment data', () => {
      const conflicts = validateAppointmentForSync(mockAppointment, mockStaff);

      expect(conflicts).toHaveLength(0);
    });

    it('should detect missing appointment date', () => {
      const invalidAppointment = { ...mockAppointment, appointment_date: '' };
      const conflicts = validateAppointmentForSync(invalidAppointment, mockStaff);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'data_mismatch',
        severity: 'critical',
      });
    });

    it('should detect missing start time', () => {
      const invalidAppointment = { ...mockAppointment, start_time: '' };
      const conflicts = validateAppointmentForSync(invalidAppointment, mockStaff);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'data_mismatch',
        severity: 'critical',
      });
    });

    it('should detect invalid duration', () => {
      const invalidAppointment = { ...mockAppointment, duration_minutes: 0 };
      const conflicts = validateAppointmentForSync(invalidAppointment, mockStaff);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'data_mismatch',
        severity: 'critical',
      });
    });

    it('should detect missing calendar ID', () => {
      const staffWithoutCalendar = { ...mockStaff, google_calendar_id: '' };
      const conflicts = validateAppointmentForSync(mockAppointment, staffWithoutCalendar);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'data_mismatch',
        severity: 'high',
      });
    });
  });

  describe('getConflictResolutionStrategy', () => {
    it('should return automatic strategy for no conflicts', () => {
      const strategy = getConflictResolutionStrategy([]);

      expect(strategy.strategy).toBe('automatic');
      expect(strategy.priority).toBe('low');
    });

    it('should return manual strategy for critical conflicts', () => {
      const conflicts: ConflictInfo[] = [{
        type: 'data_mismatch',
        severity: 'critical',
        description: 'Critical error',
      }];

      const strategy = getConflictResolutionStrategy(conflicts);

      expect(strategy.strategy).toBe('manual');
      expect(strategy.priority).toBe('high');
    });

    it('should return manual strategy for time conflicts', () => {
      const conflicts: ConflictInfo[] = [{
        type: 'time_conflict',
        severity: 'medium',
        description: 'Time conflict',
      }];

      const strategy = getConflictResolutionStrategy(conflicts);

      expect(strategy.strategy).toBe('manual');
      expect(strategy.priority).toBe('medium');
    });

    it('should return automatic strategy for low severity conflicts', () => {
      const conflicts: ConflictInfo[] = [{
        type: 'data_mismatch',
        severity: 'low',
        description: 'Minor mismatch',
      }];

      const strategy = getConflictResolutionStrategy(conflicts);

      expect(strategy.strategy).toBe('automatic');
      expect(strategy.priority).toBe('low');
    });
  });
});
