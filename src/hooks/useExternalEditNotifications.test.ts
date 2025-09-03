import type { Appointment } from '@/types';
import { act, renderHook } from '@testing-library/react';
import { useExternalEditNotification, useExternalEditNotifications } from './useExternalEditNotifications';

const mockAppointment: Appointment = {
  id: 'test-appointment-1',
  patient_id: 'patient-1',
  appointment_type: 'doctor_on_call',
  appointment_date: '2024-01-15',
  start_time: '10:00',
  duration_minutes: 60,
  status: 'scheduled',
  custom_fields: {},
  google_event_ids: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('useExternalEditNotifications', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return empty notifications initially', () => {
    const { result } = renderHook(() =>
      useExternalEditNotifications({
        appointments: [],
      })
    );

    expect(result.current.notifications).toEqual([]);
    expect(result.current.recentExternalEditsCount).toBe(0);
    expect(result.current.hasNotifications).toBe(false);
  });

  it('should detect recent external edits', () => {
    const appointmentsWithExternalEdit: Appointment[] = [
      {
        ...mockAppointment,
        last_edit_source: 'google_calendar',
        last_external_edit: '2024-01-15T11:58:00Z', // 2 minutes ago
        external_edit_count: 1,
      },
    ];

    const { result } = renderHook(() =>
      useExternalEditNotifications({
        appointments: appointmentsWithExternalEdit,
      })
    );

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].appointment.id).toBe('test-appointment-1');
    expect(result.current.recentExternalEditsCount).toBe(1);
    expect(result.current.hasNotifications).toBe(true);
  });

  it('should not detect old external edits', () => {
    const appointmentsWithOldExternalEdit: Appointment[] = [
      {
        ...mockAppointment,
        last_edit_source: 'google_calendar',
        last_external_edit: '2024-01-14T12:00:00Z', // 24 hours ago
        external_edit_count: 1,
      },
    ];

    const { result } = renderHook(() =>
      useExternalEditNotifications({
        appointments: appointmentsWithOldExternalEdit,
      })
    );

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.recentExternalEditsCount).toBe(0);
    expect(result.current.hasNotifications).toBe(false);
  });

  it('should limit notifications to maxNotifications', () => {
    const appointmentsWithMultipleEdits: Appointment[] = Array.from({ length: 10 }, (_, i) => ({
      ...mockAppointment,
      id: `test-appointment-${i}`,
      last_edit_source: 'google_calendar',
      last_external_edit: '2024-01-15T11:58:00Z', // 2 minutes ago
      external_edit_count: 1,
    }));

    const { result } = renderHook(() =>
      useExternalEditNotifications({
        appointments: appointmentsWithMultipleEdits,
        maxNotifications: 3,
      })
    );

    expect(result.current.notifications).toHaveLength(3);
  });

  it('should dismiss individual notifications', () => {
    const appointmentsWithExternalEdit: Appointment[] = [
      {
        ...mockAppointment,
        last_edit_source: 'google_calendar',
        last_external_edit: '2024-01-15T11:58:00Z', // 2 minutes ago
        external_edit_count: 1,
      },
    ];

    const { result } = renderHook(() =>
      useExternalEditNotifications({
        appointments: appointmentsWithExternalEdit,
      })
    );

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.dismissNotification(result.current.notifications[0].id);
    });

    // Should still have the notification but marked as dismissed
    expect(result.current.notifications).toHaveLength(0);
  });

  it('should dismiss all notifications', () => {
    const appointmentsWithMultipleEdits: Appointment[] = [
      {
        ...mockAppointment,
        id: 'test-appointment-1',
        last_edit_source: 'google_calendar',
        last_external_edit: '2024-01-15T11:58:00Z', // 2 minutes ago
        external_edit_count: 1,
      },
      {
        ...mockAppointment,
        id: 'test-appointment-2',
        last_edit_source: 'webhook',
        last_external_edit: '2024-01-15T11:57:00Z', // 3 minutes ago
        external_edit_count: 1,
      },
    ];

    const { result } = renderHook(() =>
      useExternalEditNotifications({
        appointments: appointmentsWithMultipleEdits,
      })
    );

    expect(result.current.notifications).toHaveLength(2);

    act(() => {
      result.current.dismissAllNotifications();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should auto-dismiss notifications after delay', () => {
    const appointmentsWithExternalEdit: Appointment[] = [
      {
        ...mockAppointment,
        last_edit_source: 'google_calendar',
        last_external_edit: '2024-01-15T11:58:00Z', // 2 minutes ago
        external_edit_count: 1,
      },
    ];

    const { result } = renderHook(() =>
      useExternalEditNotifications({
        appointments: appointmentsWithExternalEdit,
        autoDismissDelay: 5000, // 5 seconds
      })
    );

    // Check immediately after notifications are added
    expect(result.current.notifications).toHaveLength(1);

    // Fast-forward past auto-dismiss delay and animation
    act(() => {
      jest.advanceTimersByTime(5300); // 5 seconds + 300ms animation
    });

    // Should be removed after auto-dismiss
    expect(result.current.notifications).toHaveLength(0);
  });

  it('should not process same appointment multiple times', () => {
    const appointmentsWithExternalEdit: Appointment[] = [
      {
        ...mockAppointment,
        last_edit_source: 'google_calendar',
        last_external_edit: '2024-01-15T11:58:00Z', // 2 minutes ago
        external_edit_count: 1,
      },
    ];

    const { result, rerender } = renderHook(() =>
      useExternalEditNotifications({
        appointments: appointmentsWithExternalEdit,
      })
    );

    expect(result.current.notifications).toHaveLength(1);

    // Rerender with same appointments
    rerender();

    // Should still only have 1 notification (not duplicated)
    expect(result.current.notifications).toHaveLength(1);
  });
});

describe('useExternalEditNotification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not show notification for appointments without external edits', () => {
    const { result } = renderHook(() =>
      useExternalEditNotification(mockAppointment)
    );

    expect(result.current.showNotification).toBe(false);
    expect(result.current.timeSinceEdit).toBeNull();
  });

  it('should show notification for recent external edits', () => {
    const appointmentWithRecentEdit: Appointment = {
      ...mockAppointment,
      last_edit_source: 'google_calendar',
      last_external_edit: '2024-01-15T11:58:00Z', // 2 minutes ago
      external_edit_count: 1,
    };

    const { result } = renderHook(() =>
      useExternalEditNotification(appointmentWithRecentEdit)
    );

    // Debug: Check if the appointment has the right data
    expect(appointmentWithRecentEdit.last_edit_source).toBe('google_calendar');
    expect(appointmentWithRecentEdit.last_external_edit).toBe('2024-01-15T11:58:00Z');

    // The notification should show immediately for recent external edits
    expect(result.current.showNotification).toBe(true);
    expect(result.current.timeSinceEdit).toBe('2 minutes ago');
  });

  it('should not show notification for old external edits', () => {
    const appointmentWithOldEdit: Appointment = {
      ...mockAppointment,
      last_edit_source: 'google_calendar',
      last_external_edit: '2024-01-14T12:00:00Z', // 24 hours ago
      external_edit_count: 1,
    };

    const { result } = renderHook(() =>
      useExternalEditNotification(appointmentWithOldEdit)
    );

    expect(result.current.showNotification).toBe(false);
  });

  it('should dismiss notification', () => {
    const appointmentWithRecentEdit: Appointment = {
      ...mockAppointment,
      last_edit_source: 'google_calendar',
      last_external_edit: '2024-01-15T11:58:00Z', // 2 minutes ago
      external_edit_count: 1,
    };

    const { result } = renderHook(() =>
      useExternalEditNotification(appointmentWithRecentEdit)
    );

    expect(result.current.showNotification).toBe(true);

    act(() => {
      result.current.dismissNotification();
    });

    expect(result.current.showNotification).toBe(false);
  });

  it('should not show notification again after dismissing', () => {
    const appointmentWithRecentEdit: Appointment = {
      ...mockAppointment,
      last_edit_source: 'google_calendar',
      last_external_edit: '2024-01-15T11:58:00Z', // 2 minutes ago
      external_edit_count: 1,
    };

    const { result, rerender } = renderHook(() =>
      useExternalEditNotification(appointmentWithRecentEdit)
    );

    expect(result.current.showNotification).toBe(true);

    act(() => {
      result.current.dismissNotification();
    });

    expect(result.current.showNotification).toBe(false);

    // Rerender with same appointment
    rerender();

    expect(result.current.showNotification).toBe(false);
  });
});
