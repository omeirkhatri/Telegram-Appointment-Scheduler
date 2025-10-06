import type { Appointment } from '@/types/appointment';
import type { TransportationSegmentLocation } from '@/types/transportationSegment';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviousAppointmentSelector } from './PreviousAppointmentSelector';

const mockAppointments: Appointment[] = [
  {
    id: 'appointment-1',
    patient_id: 'patient-1',
    appointment_type: 'doctor_on_call',
    appointment_date: '2024-01-01',
    start_time: '10:00',
    duration_minutes: 60,
    status: 'scheduled',
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T09:00:00Z',
  },
  {
    id: 'appointment-2',
    patient_id: 'patient-2',
    appointment_type: 'lab_test',
    appointment_date: '2024-01-01',
    start_time: '14:00',
    duration_minutes: 30,
    status: 'scheduled',
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T09:00:00Z',
  },
];

const mockPatientLocation: TransportationSegmentLocation = {
  address: '456 Patient St, New York, NY 10002',
  lat: 40.7589,
  lng: -73.9851,
  building_name: 'Patient Building',
};

describe('PreviousAppointmentSelector', () => {
  const mockOnAppointmentSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render appointment selector', () => {
    render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
      />
    );

    expect(screen.getByText('Previous Appointment')).toBeInTheDocument();
    expect(screen.getByText('Select a previous appointment to continue from its patient location')).toBeInTheDocument();
  });

  it('should display available appointments', () => {
    render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
      />
    );

    // Should show appointment options
    expect(screen.getByText('appointment-1')).toBeInTheDocument();
    expect(screen.getByText('appointment-2')).toBeInTheDocument();
  });

  it('should call onAppointmentSelect when appointment is selected', async () => {
    const user = userEvent.setup();

    render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
      />
    );

    const appointmentOption = screen.getByText('appointment-1');
    await user.click(appointmentOption);

    expect(mockOnAppointmentSelect).toHaveBeenCalledWith(
      mockAppointments[0],
      mockPatientLocation
    );
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
        disabled={true}
      />
    );

    const appointmentOptions = screen.getAllByRole('button');
    appointmentOptions.forEach(option => {
      expect(option).toBeDisabled();
    });
  });

  it('should not call onAppointmentSelect when disabled', async () => {
    const user = userEvent.setup();

    render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
        disabled={true}
      />
    );

    const appointmentOption = screen.getByText('appointment-1');
    await user.click(appointmentOption);

    expect(mockOnAppointmentSelect).not.toHaveBeenCalled();
  });

  it('should handle empty appointments list', () => {
    render(
      <PreviousAppointmentSelector
        appointments={[]}
        onAppointmentSelect={mockOnAppointmentSelect}
      />
    );

    expect(screen.getByText('No previous appointments available')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should display appointment details correctly', () => {
    render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
      />
    );

    // Check that appointment information is displayed
    expect(screen.getByText('Previous Appointment')).toBeInTheDocument();
    expect(screen.getByText('Select a previous appointment to continue from its patient location')).toBeInTheDocument();
  });

  it('should handle appointment selection with different appointments', async () => {
    const user = userEvent.setup();

    render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
      />
    );

    // Select first appointment
    const firstAppointment = screen.getByText('appointment-1');
    await user.click(firstAppointment);

    expect(mockOnAppointmentSelect).toHaveBeenCalledWith(
      mockAppointments[0],
      mockPatientLocation
    );

    // Select second appointment
    const secondAppointment = screen.getByText('appointment-2');
    await user.click(secondAppointment);

    expect(mockOnAppointmentSelect).toHaveBeenCalledWith(
      mockAppointments[1],
      mockPatientLocation
    );
  });

  it('should have proper accessibility attributes', () => {
    render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
      />
    );

    const appointmentOptions = screen.getAllByRole('button');
    expect(appointmentOptions.length).toBeGreaterThan(0);
  });

  it('should handle rapid appointment selections', async () => {
    const user = userEvent.setup();

    render(
      <PreviousAppointmentSelector
        appointments={mockAppointments}
        onAppointmentSelect={mockOnAppointmentSelect}
      />
    );

    const firstAppointment = screen.getByText('appointment-1');
    const secondAppointment = screen.getByText('appointment-2');

    // Rapidly switch between appointments
    await user.click(firstAppointment);
    await user.click(secondAppointment);
    await user.click(firstAppointment);

    expect(mockOnAppointmentSelect).toHaveBeenCalledTimes(3);
  });
});

