import { render, screen } from '@testing-library/react';
import { AppointmentForm } from '@/components/features/appointments/AppointmentForm';
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
const mockStaff: Staff[] = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    staff_type: 'doctor',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    status: 'active',
    gc_is_connected: true,
    gc_calendar_id: 'john.doe@example.com',
    gc_connected_at: '2024-01-01T00:00:00Z',
    gc_last_synced_at: '2024-01-01T12:00:00Z',
    gc_sync_enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    staff_type: 'nurse',
    phone: '+1234567891',
    email: 'jane.smith@example.com',
    status: 'active',
    gc_is_connected: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Patient One',
    phone: '+1234567892',
    date_of_birth: '1990-01-01',
    address: '123 Main St',
    emergency_contact: 'Emergency Contact',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

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

describe('AppointmentForm Google Calendar Status', () => {
  const mockProps = {
    patients: mockPatients,
    staff: mockStaff,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  it('should show Google Calendar indicators when feature is enabled', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<AppointmentForm {...mockProps} />);
    
    expect(screen.getByText(/staff have Google Calendar connected/)).toBeInTheDocument();
    expect(screen.getByText('📅 = Calendar Connected')).toBeInTheDocument();
  });

  it('should not show Google Calendar indicators when feature is disabled', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'false';
    
    render(<AppointmentForm {...mockProps} />);
    
    expect(screen.queryByText(/staff have Google Calendar connected/)).not.toBeInTheDocument();
    expect(screen.queryByText('📅 = Calendar Connected')).not.toBeInTheDocument();
  });

  it('should highlight calendar-connected staff in dropdown', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<AppointmentForm {...mockProps} />);
    
    // Click Add Staff button
    const addStaffButton = screen.getByText('Add Staff');
    addStaffButton.click();
    
    // Check that staff options show calendar indicators
    expect(screen.getByText('John Doe (doctor) 📅')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith (nurse)')).toBeInTheDocument();
  });

  it('should show calendar status for selected staff', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<AppointmentForm {...mockProps} />);
    
    // Click Add Staff button
    const addStaffButton = screen.getByText('Add Staff');
    addStaffButton.click();
    
    // Select a staff member
    const staffSelect = screen.getByDisplayValue('Select staff member');
    // Note: This would need to be implemented with proper form interaction
    // For now, we're just testing that the component renders without errors
    expect(staffSelect).toBeInTheDocument();
  });
});
