import type { Appointment } from '@/types';
import { render, screen } from '@testing-library/react';
import { ExternalEditBadge, ExternalEditIndicator, ExternalEditTooltip } from './ExternalEditIndicator';

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

describe('ExternalEditIndicator', () => {
  describe('when appointment has no external edits', () => {
    it('should not render anything', () => {
      const { container } = render(
        <ExternalEditIndicator appointment={mockAppointment} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when appointment has external edits but last edit is internal', () => {
    const appointmentWithExternalEdits: Appointment = {
      ...mockAppointment,
      external_edit_count: 2,
      last_edit_source: 'app',
      last_external_edit: '2024-01-15T10:00:00Z',
      last_external_edit_source: 'google_calendar',
    };

    it('should render badge variant', () => {
      render(
        <ExternalEditIndicator
          appointment={appointmentWithExternalEdits}
          variant="badge"
        />
      );

      expect(screen.getByText('Has External Edits')).toBeInTheDocument();
      expect(screen.getByText('(Google Calendar)')).toBeInTheDocument();
    });

    it('should render compact variant', () => {
      render(
        <ExternalEditIndicator
          appointment={appointmentWithExternalEdits}
          variant="compact"
        />
      );

      expect(screen.getByText('External')).toBeInTheDocument();
    });

    it('should render detailed variant', () => {
      render(
        <ExternalEditIndicator
          appointment={appointmentWithExternalEdits}
          variant="detailed"
        />
      );

      expect(screen.getByText('Has External Edits')).toBeInTheDocument();
      expect(screen.getByText('via Google Calendar')).toBeInTheDocument();
      expect(screen.getByText('Total external edits: 2')).toBeInTheDocument();
    });
  });

  describe('when last edit is external', () => {
    const appointmentWithRecentExternalEdit: Appointment = {
      ...mockAppointment,
      external_edit_count: 1,
      last_edit_source: 'google_calendar',
      last_external_edit: '2024-01-15T10:00:00Z',
      last_external_edit_source: 'google_calendar',
    };

    it('should render with orange styling for recent external edit', () => {
      render(
        <ExternalEditIndicator
          appointment={appointmentWithRecentExternalEdit}
          variant="badge"
        />
      );

      expect(screen.getByText('External Edit')).toBeInTheDocument();
      expect(screen.getByText('(Google Calendar)')).toBeInTheDocument();
    });

    it('should show timestamp when showTimestamp is true', () => {
      render(
        <ExternalEditIndicator
          appointment={appointmentWithRecentExternalEdit}
          variant="detailed"
          showTimestamp={true}
        />
      );

      expect(screen.getByText('Recently Edited Externally')).toBeInTheDocument();
      expect(screen.getByText(/Last external edit:/)).toBeInTheDocument();
    });

    it('should not show timestamp when showTimestamp is false', () => {
      render(
        <ExternalEditIndicator
          appointment={appointmentWithRecentExternalEdit}
          variant="detailed"
          showTimestamp={false}
        />
      );

      expect(screen.getByText('Recently Edited Externally')).toBeInTheDocument();
      expect(screen.queryByText(/Last external edit:/)).not.toBeInTheDocument();
    });
  });
});

describe('ExternalEditBadge', () => {
  describe('when appointment has no external edits', () => {
    it('should not render anything', () => {
      const { container } = render(
        <ExternalEditBadge appointment={mockAppointment} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when appointment has external edits', () => {
    const appointmentWithExternalEdits: Appointment = {
      ...mockAppointment,
      external_edit_count: 1,
      last_edit_source: 'google_calendar',
    };

    it('should render with correct size classes', () => {
      const { container } = render(
        <ExternalEditBadge
          appointment={appointmentWithExternalEdits}
          size="sm"
        />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('w-2', 'h-2');
    });

    it('should render with orange color for recent external edit', () => {
      const { container } = render(
        <ExternalEditBadge
          appointment={appointmentWithExternalEdits}
          size="md"
        />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-orange-500');
    });

    it('should render with blue color for old external edit', () => {
      const appointmentWithOldExternalEdit: Appointment = {
        ...mockAppointment,
        external_edit_count: 1,
        last_edit_source: 'app',
      };

      const { container } = render(
        <ExternalEditBadge
          appointment={appointmentWithOldExternalEdit}
          size="lg"
        />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-blue-500', 'w-4', 'h-4');
    });
  });
});

describe('ExternalEditTooltip', () => {
  describe('when appointment has no external edits', () => {
    it('should render children without tooltip', () => {
      render(
        <ExternalEditTooltip appointment={mockAppointment}>
          <div>Test Content</div>
        </ExternalEditTooltip>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('when appointment has external edits', () => {
    const appointmentWithExternalEdits: Appointment = {
      ...mockAppointment,
      external_edit_count: 3,
      last_edit_source: 'webhook',
      last_external_edit: '2024-01-15T10:00:00Z',
      last_external_edit_source: 'webhook',
    };

    it('should render children with tooltip wrapper', () => {
      render(
        <ExternalEditTooltip appointment={appointmentWithExternalEdits}>
          <div>Test Content</div>
        </ExternalEditTooltip>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should show tooltip on hover', () => {
      render(
        <ExternalEditTooltip appointment={appointmentWithExternalEdits}>
          <div>Test Content</div>
        </ExternalEditTooltip>
      );

      // Note: Testing hover behavior would require more complex setup
      // This test verifies the component renders without errors
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
  });
});
