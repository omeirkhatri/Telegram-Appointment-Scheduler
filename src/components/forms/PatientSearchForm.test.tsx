import { fireEvent, render, screen } from '@testing-library/react';
import { PatientSearchForm } from './PatientSearchForm';

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(),
}));

const mockUseForm = require('react-hook-form').useForm;

describe('PatientSearchForm', () => {
  const mockOnSearch = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search form correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Search Patients')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Area/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Has ID Document/i)).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={true}
      />,
    );

    expect(screen.getByText('Searching...')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeDisabled();
    expect(screen.getByText('Searching...')).toBeDisabled();
  });

  it('displays form validation errors', () => {
    const mockErrors = {
      name: { message: 'Invalid name format' },
      phone: { message: 'Invalid phone format' },
    };

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: mockErrors },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Invalid name format')).toBeInTheDocument();
    expect(screen.getByText('Invalid phone format')).toBeInTheDocument();
  });

  it('handles search form submission with data', () => {
    const mockHandleSubmit = jest.fn((callback) => (e) => {
      e.preventDefault();
      callback({
        name: 'John Doe',
        phone: '+971501234567',
        area: 'Dubai Marina',
        city: 'Dubai',
        has_id_document: true,
      });
    });

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: mockHandleSubmit,
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      name: 'John Doe',
      phone: '+971501234567',
      area: 'Dubai Marina',
      city: 'Dubai',
      has_id_document: true,
    });
  });

  it('handles search form submission with empty values filtered out', () => {
    const mockHandleSubmit = jest.fn((callback) => (e) => {
      e.preventDefault();
      callback({
        name: 'John Doe',
        phone: '',
        area: '',
        city: 'Dubai',
        has_id_document: false,
      });
    });

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: mockHandleSubmit,
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      name: 'John Doe',
      city: 'Dubai',
      has_id_document: false,
    });
  });

  it('handles reset button click', () => {
    const mockReset = jest.fn();

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {} },
      reset: mockReset,
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(mockReset).toHaveBeenCalled();
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('renders all search input fields with correct placeholders', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    // Check for input fields with correct placeholders
    expect(screen.getByPlaceholderText('Search by name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by phone')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by area')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by city')).toBeInTheDocument();
  });

  it('renders has ID document checkbox', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const hasIdDocumentCheckbox = screen.getByLabelText(/Has ID Document/i);
    expect(hasIdDocumentCheckbox).toBeInTheDocument();
    expect(hasIdDocumentCheckbox).toHaveAttribute('type', 'checkbox');
  });

  it('applies correct CSS classes for form styling', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const form = screen.getByText('Search Patients').closest('form');
    expect(form).toHaveClass('bg-white', 'p-6', 'rounded-lg', 'shadow-sm', 'border');
  });

  it('applies correct CSS classes for input fields', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const nameInput = screen.getByPlaceholderText('Search by name');
    expect(nameInput).toHaveClass('w-full', 'px-3', 'py-2', 'border', 'rounded-md');
  });

  it('applies error styling when validation errors are present', () => {
    const mockErrors = {
      name: { message: 'Invalid name format' },
    };

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: mockErrors },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const nameInput = screen.getByPlaceholderText('Search by name');
    expect(nameInput).toHaveClass('border-red-500');
  });

  it('applies normal styling when no validation errors are present', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const nameInput = screen.getByPlaceholderText('Search by name');
    expect(nameInput).toHaveClass('border-gray-300');
  });

  it('renders form in responsive grid layout', () => {
    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const formGrid = screen.getByText('Search Patients').closest('form')?.querySelector('.grid');
    expect(formGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
  });

  it('handles form submission with only checkbox filter', () => {
    const mockHandleSubmit = jest.fn((callback) => (e) => {
      e.preventDefault();
      callback({
        name: '',
        phone: '',
        area: '',
        city: '',
        has_id_document: true,
      });
    });

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: mockHandleSubmit,
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      has_id_document: true,
    });
  });

  it('handles form submission with all empty values', () => {
    const mockHandleSubmit = jest.fn((callback) => (e) => {
      e.preventDefault();
      callback({
        name: '',
        phone: '',
        area: '',
        city: '',
        has_id_document: false,
      });
    });

    mockUseForm.mockReturnValue({
      register: jest.fn(),
      handleSubmit: mockHandleSubmit,
      formState: { errors: {} },
      reset: jest.fn(),
    });

    render(
      <PatientSearchForm
        onSearch={mockOnSearch}
        onReset={mockOnReset}
        isLoading={false}
      />,
    );

    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      has_id_document: false,
    });
  });
});
