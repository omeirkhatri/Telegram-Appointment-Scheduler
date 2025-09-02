import type { Patient } from '@/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PatientForm } from './PatientForm';

// Mock the form validation
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(),
}));

const mockUseForm = require('react-hook-form').useForm;

describe('PatientForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const mockPatient: Patient = {
    id: '1',
    name: 'John Doe',
    phone: '+971501234567',
    flat_villa_no: 'Villa 123',
    building_street: 'Sheikh Zayed Road',
    area: 'Dubai Marina',
    city: 'Dubai',
    google_maps_link: 'https://maps.google.com/...',
    medical_notes: 'Allergic to penicillin',
    emergency_contact: 'Jane Doe - +971501234568',
    preferred_transport: 'Taxi',
    id_document_url: 'https://example.com/document.pdf',
    id_document_filename: 'document.pdf',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create patient form correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn(),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Address Information')).toBeInTheDocument();
    expect(screen.getByText('Medical Information')).toBeInTheDocument();
    expect(screen.getByText('Transportation Preferences')).toBeInTheDocument();
    expect(screen.getByText('ID Document')).toBeInTheDocument();
    expect(screen.getByText('Create Patient')).toBeInTheDocument();
  });

  it('renders update patient form correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn(),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <PatientForm
        patient={mockPatient}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText('Update Patient')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: true },
      watch: jest.fn(),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeDisabled();
  });

  it('handles file upload correctly', async () => {
    const mockSetValue = jest.fn();
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn(),
      setValue: mockSetValue,
      reset: jest.fn(),
    });

    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const fileInput = screen.getByLabelText(/Upload ID Document/i);
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith('id_document', file);
    });
  });

  it('handles file validation errors', async () => {
    const mockSetValue = jest.fn();
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn(),
      setValue: mockSetValue,
      reset: jest.fn(),
    });

    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const fileInput = screen.getByLabelText(/Upload ID Document/i);
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('File must be JPEG, PNG, GIF, PDF, or WebP')).toBeInTheDocument();
    });
  });

  it('handles cancel button click', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn(),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('displays form validation errors', () => {
    const mockErrors = {
      name: { message: 'Name is required' },
      phone: { message: 'Invalid phone number format' },
    };

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: mockErrors, isSubmitting: false },
      watch: jest.fn(),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid phone number format')).toBeInTheDocument();
  });

  it('renders all required form sections', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn(),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    // Check for all form sections
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Address Information')).toBeInTheDocument();
    expect(screen.getByText('Medical Information')).toBeInTheDocument();
    expect(screen.getByText('Transportation Preferences')).toBeInTheDocument();
    expect(screen.getByText('ID Document')).toBeInTheDocument();

    // Check for required field labels
    expect(screen.getByText('Full Name *')).toBeInTheDocument();
    expect(screen.getByText('Phone Number *')).toBeInTheDocument();
    expect(screen.getByText('Flat/Villa Number *')).toBeInTheDocument();
    expect(screen.getByText('Building/Street *')).toBeInTheDocument();
    expect(screen.getByText('Area *')).toBeInTheDocument();
    expect(screen.getByText('City *')).toBeInTheDocument();
  });

  it('renders transportation method options', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {}, isSubmitting: false },
      watch: jest.fn(),
      setValue: jest.fn(),
      reset: jest.fn(),
    });

    render(
      <PatientForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    );

    const transportSelect = screen.getByLabelText(/Preferred Transportation Method/i);
    expect(transportSelect).toBeInTheDocument();

    // Check for transportation options
    expect(screen.getByText("Won't work")).toBeInTheDocument();
    expect(screen.getByText('Family member')).toBeInTheDocument();
    expect(screen.getByText('Taxi')).toBeInTheDocument();
    expect(screen.getByText('Public transport')).toBeInTheDocument();
    expect(screen.getByText('Walking')).toBeInTheDocument();
  });
});
