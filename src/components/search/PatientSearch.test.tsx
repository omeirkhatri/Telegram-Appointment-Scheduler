import type { Patient } from '@/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PatientSearch } from './PatientSearch';

// Mock the hooks
jest.mock('@/hooks', () => ({
  usePatients: jest.fn(),
}));

const mockUsePatients = require('@/hooks').usePatients;

describe('PatientSearch', () => {
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

  const mockHookReturn = {
    patients: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: 20,
    setSearchTerm: jest.fn(),
    setFilters: jest.fn(),
    clearFilters: jest.fn(),
    setPage: jest.fn(),
    setPageSize: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePatients.mockReturnValue(mockHookReturn);
  });

  it('renders search input correctly', () => {
    render(<PatientSearch />);

    expect(screen.getByPlaceholderText('Search patients by name, phone, or area...')).toBeInTheDocument();
    expect(screen.getByText('Show Filters')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('handles search input changes', async () => {
    render(<PatientSearch />);

    const searchInput = screen.getByPlaceholderText('Search patients by name, phone, or area...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(mockHookReturn.setSearchTerm).toHaveBeenCalledWith('John');
    });
  });

  it('toggles advanced filters visibility', () => {
    render(<PatientSearch />);

    const toggleButton = screen.getByText('Show Filters');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Hide Filters')).toBeInTheDocument();
  });

  it('displays patients when data is available', () => {
    mockUsePatients.mockReturnValue({
      ...mockHookReturn,
      patients: [mockPatient],
      totalCount: 1,
    });

    render(<PatientSearch />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('+971501234567')).toBeInTheDocument();
    expect(screen.getByText('Dubai Marina')).toBeInTheDocument();
    expect(screen.getByText('Dubai')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    mockUsePatients.mockReturnValue({
      ...mockHookReturn,
      isLoading: true,
    });

    render(<PatientSearch />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    mockUsePatients.mockReturnValue({
      ...mockHookReturn,
      error: 'Failed to fetch patients',
    });

    render(<PatientSearch />);

    expect(screen.getByText('Failed to fetch patients')).toBeInTheDocument();
  });

  it('displays empty state when no patients found', () => {
    render(<PatientSearch />);

    expect(screen.getByText('No patients found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria or filters.')).toBeInTheDocument();
  });

  it('handles patient selection', () => {
    const onPatientSelect = jest.fn();
    mockUsePatients.mockReturnValue({
      ...mockHookReturn,
      patients: [mockPatient],
      totalCount: 1,
    });

    render(<PatientSearch onPatientSelect={onPatientSelect} />);

    const patientRow = screen.getByText('John Doe').closest('tr');
    fireEvent.click(patientRow!);

    expect(onPatientSelect).toHaveBeenCalledWith(mockPatient);
  });

  it('handles refresh button click', () => {
    render(<PatientSearch />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockHookReturn.refresh).toHaveBeenCalled();
  });

  it('handles page size change', () => {
    render(<PatientSearch />);

    const pageSizeSelect = screen.getByDisplayValue('20');
    fireEvent.change(pageSizeSelect, { target: { value: '50' } });

    expect(mockHookReturn.setPageSize).toHaveBeenCalledWith(50);
  });

  it('displays pagination when there are multiple pages', () => {
    mockUsePatients.mockReturnValue({
      ...mockHookReturn,
      patients: [mockPatient],
      totalCount: 25,
      pageSize: 20,
    });

    render(<PatientSearch />);

    expect(screen.getByText('Showing 1 to 20 of 25 patients')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('handles page navigation', () => {
    mockUsePatients.mockReturnValue({
      ...mockHookReturn,
      patients: [mockPatient],
      totalCount: 25,
      pageSize: 20,
    });

    render(<PatientSearch />);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    expect(mockHookReturn.setPage).toHaveBeenCalledWith(2);
  });

  it('displays patient status indicators correctly', () => {
    mockUsePatients.mockReturnValue({
      ...mockHookReturn,
      patients: [mockPatient],
      totalCount: 1,
    });

    render(<PatientSearch />);

    expect(screen.getByText('Uploaded')).toBeInTheDocument();
    expect(screen.getByText('Taxi')).toBeInTheDocument();
  });

  it('displays missing indicators for optional fields', () => {
    const patientWithoutOptionalFields = {
      ...mockPatient,
      preferred_transport: undefined,
      id_document_url: undefined,
    };

    mockUsePatients.mockReturnValue({
      ...mockHookReturn,
      patients: [patientWithoutOptionalFields],
      totalCount: 1,
    });

    render(<PatientSearch />);

    expect(screen.getByText('Not specified')).toBeInTheDocument();
    expect(screen.getByText('Missing')).toBeInTheDocument();
  });

  it('calls onPatientSelect when patient is clicked', () => {
    const onPatientSelect = jest.fn();
    mockUsePatients.mockReturnValue({
      ...mockHookReturn,
      patients: [mockPatient],
      totalCount: 1,
    });

    render(<PatientSearch onPatientSelect={onPatientSelect} />);

    const patientRow = screen.getByText('John Doe').closest('tr');
    fireEvent.click(patientRow!);

    expect(onPatientSelect).toHaveBeenCalledWith(mockPatient);
  });

  it('does not show filters when showFilters is false', () => {
    render(<PatientSearch showFilters={false} />);

    expect(screen.queryByText('Show Filters')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PatientSearch className="custom-class" />);

    const container = screen.getByPlaceholderText('Search patients by name, phone, or area...').closest('div');
    expect(container).toHaveClass('custom-class');
  });
});
