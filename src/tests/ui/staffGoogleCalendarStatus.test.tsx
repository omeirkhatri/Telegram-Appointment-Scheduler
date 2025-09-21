import { render, screen } from '@testing-library/react';
import { StaffForm } from '@/components/features/staff/StaffForm';
import type { Staff } from '@/types';

// Mock the environment variable
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock staff data
const mockStaff: Staff = {
  id: '1',
  first_name: 'John',
  last_name: 'Doe',
  staff_type: 'doctor',
  phone: '+1234567890',
  email: 'john.doe@example.com',
  status: 'active',
  telegram_user_id: '123456789',
  telegram_verified: true,
  gc_is_connected: true,
  gc_calendar_id: 'john.doe@example.com',
  gc_connected_at: '2024-01-01T00:00:00Z',
  gc_last_synced_at: '2024-01-01T12:00:00Z',
  gc_sync_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockStaffNotConnected: Staff = {
  ...mockStaff,
  id: '2',
  first_name: 'Jane',
  last_name: 'Smith',
  gc_is_connected: false,
  gc_calendar_id: undefined,
  gc_connected_at: undefined,
  gc_last_synced_at: undefined,
  gc_sync_enabled: false,
};

describe('StaffForm Google Calendar Status', () => {
  const mockProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    onDelete: jest.fn(),
    onFormChange: jest.fn(),
    onVerificationSuccess: jest.fn(),
  };

  it('should show Google Calendar section when feature is enabled and staff exists', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<StaffForm staff={mockStaff} {...mockProps} />);
    
    expect(screen.getByText('Google Calendar Integration')).toBeInTheDocument();
    expect(screen.getByText('Connection Status')).toBeInTheDocument();
  });

  it('should not show Google Calendar section when feature is disabled', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'false';
    
    render(<StaffForm staff={mockStaff} {...mockProps} />);
    
    expect(screen.queryByText('Google Calendar Integration')).not.toBeInTheDocument();
  });

  it('should not show Google Calendar section for new staff', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<StaffForm {...mockProps} />);
    
    expect(screen.queryByText('Google Calendar Integration')).not.toBeInTheDocument();
  });

  it('should show connected status for staff with Google Calendar connected', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<StaffForm staff={mockStaff} {...mockProps} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('should show not connected status for staff without Google Calendar', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<StaffForm staff={mockStaffNotConnected} {...mockProps} />);
    
    expect(screen.getByText('Not Connected')).toBeInTheDocument();
    expect(screen.getByText('Connect Calendar')).toBeInTheDocument();
  });

  it('should show disconnect button for connected staff', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED = 'true';
    
    render(<StaffForm staff={mockStaff} {...mockProps} />);
    
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });
});
