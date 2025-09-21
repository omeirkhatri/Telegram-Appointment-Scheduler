import { render, screen } from '@testing-library/react';
import { AppointmentDetailsDrawer } from '@/components/features/appointments/AppointmentDetailsDrawer';
import type { Appointment, Patient, Staff } from '@/types';

// Mock the environment variable
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock data
const mockAppointment: Appointment = {
  id: '1',
  patient_id: '1',
  appointment_type: 'doctor_on_call',
  appointment_date: '2024-01-15',
  start_time: '09:00',
  duration_minutes: 60,
  status: 'scheduled',
  custom_fields: {},
  gc_event_id: 'event123',
  gc_sync_status: 'synced',
  gc_last_synced_at: '2024-01-01T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAppointmentNotSynced: Appointment = {
  ...mockAppointment,
  id: '2',
  gc_event_id: undefined,
  gc_sync_status: 'pending',
  gc_last_synced_at: undefined,
};

const mockPatient: Patient = {
  id: '1',
  name: 'Patient One',
  phone: '+1234567892',
  date_of_birth: '1990-01-01',
  address: '123 Main St',
  emergency_contact: 'Emergency Contact',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockStaff: Staff[] = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    staff_type: 'doctor',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('AppointmentDetailsDrawer Google Calendar Status', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    appointment: mockAppointment,
    patient: mockPatient,
    staff: mockStaff,
  };

  it('should show Google Calendar sync section when feature is enabled', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<AppointmentDetailsDrawer {...mockProps} />);
    
    expect(screen.getByText('Google Calendar Sync')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('should not show Google Calendar sync section when feature is disabled', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'false';
    
    render(<AppointmentDetailsDrawer {...mockProps} />);
    
    expect(screen.queryByText('Google Calendar Sync')).not.toBeInTheDocument();
  });

  it('should show synced status for synced appointment', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<AppointmentDetailsDrawer {...mockProps} />);
    
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByText('event123')).toBeInTheDocument();
  });

  it('should show pending status for non-synced appointment', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<AppointmentDetailsDrawer {...mockProps} appointment={mockAppointmentNotSynced} />);
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('No Google Calendar Event')).toBeInTheDocument();
  });

  it('should show re-sync button for synced appointments', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<AppointmentDetailsDrawer {...mockProps} />);
    
    expect(screen.getByText('Re-sync')).toBeInTheDocument();
  });

  it('should not show re-sync button for disabled sync', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    const disabledAppointment = {
      ...mockAppointment,
      gc_sync_status: 'disabled' as const,
    };
    
    render(<AppointmentDetailsDrawer {...mockProps} appointment={disabledAppointment} />);
    
    expect(screen.queryByText('Re-sync')).not.toBeInTheDocument();
  });
});
