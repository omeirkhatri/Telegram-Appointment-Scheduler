import type { Staff } from '@/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StaffForm } from './StaffForm';

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(),
}));

// Mock fetch for Google Calendar validation
global.fetch = jest.fn();

const mockUseForm = require('react-hook-form').useForm;

describe('StaffForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockStaff: Staff = {
    id: '1',
    first_name: 'Dr. Ahmed',
    last_name: 'Hassan',
    staff_type: 'doctor',
    specialization: 'Cardiology',
    phone: '+971501234570',
    email: 'ahmed@example.com',
    google_calendar_id: 'ahmed@example.com',
    available_days: [1, 2, 3, 4, 5],
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    status: 'active',
    email_notifications_enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders create staff form correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Working Schedule')).toBeInTheDocument();
    expect(screen.getByText('Status and Preferences')).toBeInTheDocument();
    expect(screen.getByText('Create Staff')).toBeInTheDocument();
  });

  it('renders update staff form correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Update Staff')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: true },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />,
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('displays form validation errors', () => {
    const mockErrors = {
      first_name: { message: 'First name is required' },
      last_name: { message: 'Last name is required' },
      email: { message: 'Invalid email format' },
      phone: { message: 'Invalid phone number format' },
    };

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: mockErrors, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    expect(screen.getByText('Invalid phone number format')).toBeInTheDocument();
  });

  it('renders all staff type options', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const staffTypeSelect = screen.getByLabelText(/Staff Type/i);
    expect(staffTypeSelect).toBeInTheDocument();

    // Check for all staff type options
    expect(screen.getByText('Doctor')).toBeInTheDocument();
    expect(screen.getByText('Nurse')).toBeInTheDocument();
    expect(screen.getByText('Physiotherapist')).toBeInTheDocument();
    expect(screen.getByText('Caregiver')).toBeInTheDocument();
    expect(screen.getByText('Driver')).toBeInTheDocument();
    expect(screen.getByText('Lab Technician')).toBeInTheDocument();
  });

  it('renders all days of the week for availability', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue([1, 2, 3, 4, 5]),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    // Check for all days of the week
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Thursday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
    expect(screen.getByText('Sunday')).toBeInTheDocument();
  });

  it('handles day toggle functionality', () => {
    const mockSetValue = jest.fn();
    const mockTrigger = jest.fn();

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue([1, 2, 3, 4, 5]),
      setValue: mockSetValue,
      reset: jest.fn(),
      trigger: mockTrigger,
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const mondayCheckbox = screen.getByLabelText(/Monday/i);
    fireEvent.click(mondayCheckbox);

    expect(mockSetValue).toHaveBeenCalledWith('available_days', [2, 3, 4, 5]);
    expect(mockTrigger).toHaveBeenCalledWith('available_days');
  });

  it('handles Google Calendar validation successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('test@example.com'),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const validateButton = screen.getByText('Validate');
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/staff/validate-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendarId: 'test@example.com' }),
      });
    });
  });

  it('handles Google Calendar validation failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Calendar not found' }),
    });

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('invalid@example.com'),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const validateButton = screen.getByText('Validate');
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(screen.getByText('Calendar not found')).toBeInTheDocument();
    });
  });

  it('handles Google Calendar validation network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('test@example.com'),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const validateButton = screen.getByText('Validate');
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to validate calendar ID')).toBeInTheDocument();
    });
  });

  it('disables validate button when calendar ID is empty', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const validateButton = screen.getByText('Validate');
    expect(validateButton).toBeDisabled();
  });

  it('shows validating state during Google Calendar validation', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        json: async () => ({ success: true }),
      }), 100)),
    );

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue('test@example.com'),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const validateButton = screen.getByText('Validate');
    fireEvent.click(validateButton);

    expect(screen.getByText('Validating...')).toBeInTheDocument();
    expect(validateButton).toBeDisabled();
  });

  it('renders status options', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    // Check for status options
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders email notifications checkbox', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Enable Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Receive email notifications for appointments and schedule changes')).toBeInTheDocument();
  });

  it('handles cancel button click', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('renders all required form sections', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    // Check for all form sections
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Working Schedule')).toBeInTheDocument();
    expect(screen.getByText('Status and Preferences')).toBeInTheDocument();

    // Check for required field labels
    expect(screen.getByText('First Name *')).toBeInTheDocument();
    expect(screen.getByText('Last Name *')).toBeInTheDocument();
    expect(screen.getByText('Staff Type *')).toBeInTheDocument();
    expect(screen.getByText('Phone Number *')).toBeInTheDocument();
    expect(screen.getByText('Email Address *')).toBeInTheDocument();
    expect(screen.getByText('Available Days *')).toBeInTheDocument();
    expect(screen.getByText('Working Hours Start *')).toBeInTheDocument();
    expect(screen.getByText('Working Hours End *')).toBeInTheDocument();
    expect(screen.getByText('Status *')).toBeInTheDocument();
  });

  it('displays Google Calendar ID helper text', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Enter the email address associated with the Google Calendar')).toBeInTheDocument();
  });

  it('shows working hours validation error', () => {
    const mockErrors = {
      working_hours_end: { message: 'Working hours start must be before end time' },
    };

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: mockErrors, isSubmitting: false },
      watch: jest.fn().mockReturnValue(''),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Working hours start must be before end time')).toBeInTheDocument();
  });

  it('shows available days validation error', () => {
    const mockErrors = {
      available_days: { message: 'At least one available day is required' },
    };

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: mockErrors, isSubmitting: false },
      watch: jest.fn().mockReturnValue([]),
      setValue: jest.fn(),
      reset: jest.fn(),
      trigger: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />,
    );

    expect(screen.getByText('At least one available day is required')).toBeInTheDocument();
  });
});
