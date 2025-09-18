import type { Staff } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { StaffForm } from './StaffForm';

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(),
}));

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
    telegram_user_id: '123456789',
    telegram_verified: true,
    available_days: [1, 2, 3, 4, 5],
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create staff form correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      reset: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('First Name *')).toBeInTheDocument();
    expect(screen.getByText('Last Name *')).toBeInTheDocument();
    expect(screen.getByText('Staff Type *')).toBeInTheDocument();
    expect(screen.getByText('Phone *')).toBeInTheDocument();
    expect(screen.getByText('Telegram User ID')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Telegram Verified')).toBeInTheDocument();
  });

  it('renders edit staff form correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      reset: jest.fn(),
    });

    render(
      <StaffForm
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('First Name *')).toBeInTheDocument();
    expect(screen.getByText('Last Name *')).toBeInTheDocument();
    expect(screen.getByText('Staff Type *')).toBeInTheDocument();
    expect(screen.getByText('Phone *')).toBeInTheDocument();
    expect(screen.getByText('Telegram User ID')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Telegram Verified')).toBeInTheDocument();
  });

  it('displays validation errors', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: {
        errors: {
          first_name: { message: 'First name is required' },
          phone: { message: 'Invalid phone number format' }
        },
        isSubmitting: false
      },
      reset: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid phone number format')).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', async () => {
    const mockHandleSubmit = jest.fn((fn) => fn);
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: mockHandleSubmit,
      formState: { errors: {}, isSubmitting: false },
      reset: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);

    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      reset: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows delete button for existing staff', () => {
    const mockOnDelete = jest.fn();
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      reset: jest.fn(),
    });

    render(
      <StaffForm
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = jest.fn();
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      reset: jest.fn(),
    });

    render(
      <StaffForm
        staff={mockStaff}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockStaff.id);
  });

  it('disables buttons when loading', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      reset: jest.fn(),
    });

    render(
      <StaffForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });
});
