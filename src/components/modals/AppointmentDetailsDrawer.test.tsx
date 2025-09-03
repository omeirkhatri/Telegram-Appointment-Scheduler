import type { Appointment, Patient, Staff } from '@/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppointmentDetailsDrawer } from './AppointmentDetailsDrawer';

// Mock the appointment type helper functions
jest.mock('@/types/appointment', () => ({
  getAppointmentTypeDisplayName: (type: string) => {
    const displayNames: Record<string, string> = {
      doctor_on_call: 'Doctor on Call',
      lab_test: 'Lab Test',
      teleconsultation: 'Teleconsultation',
      physiotherapy: 'Physiotherapy',
      caregiver: 'Caregiver',
      iv_therapy: 'IV Therapy',
    };
    return displayNames[type] || type;
  },
  getAppointmentStatusDisplayName: (status: string) => {
    const displayNames: Record<string, string> = {
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return displayNames[status] || status;
  },
}));

const mockAppointment: Appointment = {
  id: 'appointment-1',
  patient_id: 'patient-1',
  appointment_type: 'doctor_on_call',
  appointment_date: '2024-01-15',
  start_time: '10:00',
  duration_minutes: 60,
  status: 'scheduled',
  custom_fields: {
    chief_complaint: 'Chest pain',
    primary_doctor_id: 'doctor-1',
  },
  transportation_type: 'driver',
  driver_id: 'driver-1',
  notes: 'Patient has history of heart disease',
  google_event_ids: {
    'doctor-1': 'google-event-1',
    'driver-1': 'google-event-2',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockPatient: Patient = {
  id: 'patient-1',
  name: 'John Doe',
  phone: '+971501234567',
  flat_villa_no: 'Villa 123',
  building_street: 'Main Street',
  area: 'Downtown',
  city: 'Dubai',
  google_maps_link: 'https://maps.google.com/test',
  medical_notes: 'Allergic to penicillin',
  emergency_contact: '+971501234568',
  preferred_transport: 'driver',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockStaff: Staff[] = [
  {
    id: 'doctor-1',
    first_name: 'Dr. Sarah',
    last_name: 'Ahmed',
    staff_type: 'doctor',
    specialization: 'Cardiology',
    phone: '+971501234569',
    email: 'sarah.ahmed@clinic.com',
    google_calendar_id: 'doctor-calendar-1',
    available_days: [1, 2, 3, 4, 5],
    working_hours_start: '08:00',
    working_hours_end: '17:00',
    status: 'active',
    email_notifications_enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'driver-1',
    first_name: 'Ahmed',
    last_name: 'Hassan',
    staff_type: 'driver',
    specialization: null,
    phone: '+971501234570',
    email: 'ahmed.hassan@clinic.com',
    google_calendar_id: 'driver-calendar-1',
    available_days: [1, 2, 3, 4, 5, 6, 7],
    working_hours_start: '06:00',
    working_hours_end: '22:00',
    status: 'active',
    email_notifications_enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  appointment: mockAppointment,
  patient: mockPatient,
  staff: mockStaff,
  onEdit: jest.fn(),
  onCopy: jest.fn(),
  onDelete: jest.fn(),
  onOpenInGoogleCalendar: jest.fn(),
};

describe('AppointmentDetailsDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open with appointment data', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    // Check for the main heading (h2)
    expect(screen.getByRole('heading', { level: 2, name: 'Appointment Details' })).toBeInTheDocument();
    // Check for the appointment type in the header subtitle
    expect(screen.getByText('Doctor on Call', { selector: 'p' })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Appointment Details')).not.toBeInTheDocument();
  });

  it('displays patient information correctly', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('+971501234567')).toBeInTheDocument();
    expect(screen.getByText('Villa 123, Main Street')).toBeInTheDocument();
    expect(screen.getByText('Downtown, Dubai')).toBeInTheDocument();
  });

  it('displays appointment details correctly', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    expect(screen.getByText('60 minutes')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('displays assigned staff correctly', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    expect(screen.getByText('Dr. Sarah Ahmed')).toBeInTheDocument();
    expect(screen.getByText('doctor - Cardiology')).toBeInTheDocument();
    expect(screen.getByText('+971501234569')).toBeInTheDocument();
  });

  it('displays transportation information correctly', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    // Check for driver in transportation section specifically
    const transportationSection = screen.getByText('Transportation').closest('.bg-gray-50');
    expect(transportationSection).toHaveTextContent('Ahmed Hassan');
    expect(transportationSection).toHaveTextContent('+971501234570');
  });

  it('displays custom fields correctly', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    expect(screen.getByText('chief complaint')).toBeInTheDocument();
    expect(screen.getByText('Chest pain')).toBeInTheDocument();
  });

  it('displays notes correctly', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    expect(screen.getByText('Patient has history of heart disease')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close drawer');
    fireEvent.click(closeButton);

    // Wait for the animation to complete
    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    }, { timeout: 300 });
  });

  it('calls onClose when backdrop is clicked', async () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (backdrop) {
      fireEvent.click(backdrop);
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      }, { timeout: 300 });
    }
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockAppointment);
  });

  it('calls onCopy when copy button is clicked', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    expect(defaultProps.onCopy).toHaveBeenCalledWith(mockAppointment);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockAppointment);
  });

  it('calls onOpenInGoogleCalendar when Google Calendar button is clicked', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    const googleCalendarButton = screen.getByText('Open in Google Calendar');
    fireEvent.click(googleCalendarButton);

    expect(defaultProps.onOpenInGoogleCalendar).toHaveBeenCalledWith(mockAppointment);
  });

  it('handles escape key to close drawer', async () => {
    render(<AppointmentDetailsDrawer {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    }, { timeout: 300 });
  });

  it('displays recurring appointment information when present', () => {
    const recurringAppointment = {
      ...mockAppointment,
      recurring_rule: {
        frequency: 'weekly' as const,
        interval: 2,
        end_date: '2024-12-31',
      },
    };

    render(<AppointmentDetailsDrawer {...defaultProps} appointment={recurringAppointment} />);

    expect(screen.getByText('Recurring Appointment')).toBeInTheDocument();
    // Check for the recurring text with more flexible matching
    expect(screen.getByText(/Repeats every 2 weekly/)).toBeInTheDocument();
    expect(screen.getByText(/until 2024-12-31/)).toBeInTheDocument();
  });

  it('handles missing patient information gracefully', () => {
    render(<AppointmentDetailsDrawer {...defaultProps} patient={null} />);

    expect(screen.getByText('Patient information not available')).toBeInTheDocument();
  });

  it('handles self-transport correctly', () => {
    const selfTransportAppointment = {
      ...mockAppointment,
      transportation_type: 'self_transport' as const,
      transportation_method: 'Taxi',
      driver_id: undefined,
    };

    render(<AppointmentDetailsDrawer {...defaultProps} appointment={selfTransportAppointment} />);

    expect(screen.getByText('Self Transport')).toBeInTheDocument();
    expect(screen.getByText('Taxi')).toBeInTheDocument();
  });

  it('handles appointments without Google Calendar events', () => {
    const appointmentWithoutGoogleEvents = {
      ...mockAppointment,
      google_event_ids: {},
    };

    render(<AppointmentDetailsDrawer {...defaultProps} appointment={appointmentWithoutGoogleEvents} />);

    expect(screen.queryByText('Open in Google Calendar')).not.toBeInTheDocument();
  });
});
