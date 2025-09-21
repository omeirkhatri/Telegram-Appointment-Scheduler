import type { MapMarker } from '@/types/map';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MapInfoWindow } from './MapInfoWindow';

// Mock the appointment type utilities
jest.mock('@/types/appointment', () => ({
  getAppointmentTypeDisplayName: (type: string) => {
    const typeMap: Record<string, string> = {
      'doctor_on_call': 'Doctor on Call',
      'lab_test': 'Lab Test',
      'teleconsultation': 'Teleconsultation',
      'physiotherapy': 'Physiotherapy',
      'caregiver': 'Caregiver',
      'iv_therapy': 'IV Therapy'
    };
    return typeMap[type] || type;
  }
}));

jest.mock('@/utils/appointmentTypes', () => ({
  getAppointmentTypeColor: (type: string, variant: string) => {
    const colorMap: Record<string, Record<string, string>> = {
      'doctor_on_call': {
        primary: '#3B82F6',
        light: '#DBEAFE',
        text: '#1E40AF',
        border: '#3B82F6'
      },
      'lab_test': {
        primary: '#10B981',
        light: '#D1FAE5',
        text: '#047857',
        border: '#10B981'
      }
    };
    return colorMap[type]?.[variant] || '#6B7280';
  }
}));

jest.mock('@/utils/timezone', () => ({
  formatTimeToHHMM: (time: string) => time
}));

// Mock marker data
const mockMarker: MapMarker = {
  id: 'marker-1',
  position: { lat: 25.2048, lng: 55.2708 },
  title: 'John Doe - Doctor on Call',
  description: 'Regular checkup',
  appointment_id: 'apt-1',
  patient_id: 'patient-1',
  appointment_type: 'doctor_on_call',
  appointment_date: '2024-01-20',
  start_time: '10:00',
  duration_minutes: 60,
  status: 'confirmed',
  patient_name: 'John Doe',
  patient_phone: '+971501234567',
  address: '123 Main Street, Dubai, UAE',
  custom_fields: {
    priority: 'high',
    special_requirements: 'wheelchair access'
  },
  notes: 'Patient prefers morning appointments',
  transportation_type: 'driver',
  driver_id: 'driver-123',
  pickup_instructions: 'Ring doorbell twice'
};

describe('MapInfoWindow', () => {
  const defaultProps = {
    marker: mockMarker,
    isVisible: true,
    onClose: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onNavigate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when visible', () => {
    render(<MapInfoWindow {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Doctor on Call')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<MapInfoWindow {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('displays appointment details correctly', () => {
    render(<MapInfoWindow {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Doctor on Call')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('+971501234567')).toBeInTheDocument();
    expect(screen.getByText('123 Main Street, Dubai, UAE')).toBeInTheDocument();
    expect(screen.getByText('Transportation:')).toBeInTheDocument();
    expect(screen.getByText('driver')).toBeInTheDocument();
    expect(screen.getByText('Driver ID:')).toBeInTheDocument();
    expect(screen.getByText('driver-123')).toBeInTheDocument();
    expect(screen.getByText('Pickup Instructions:')).toBeInTheDocument();
    expect(screen.getByText('Ring doorbell twice')).toBeInTheDocument();
    expect(screen.getByText('Notes:')).toBeInTheDocument();
    expect(screen.getByText('Patient prefers morning appointments')).toBeInTheDocument();
  });

  it('displays custom fields when present', () => {
    render(<MapInfoWindow {...defaultProps} />);

    expect(screen.getByText('Custom Fields:')).toBeInTheDocument();
    expect(screen.getByText('priority:')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('special requirements:')).toBeInTheDocument();
    expect(screen.getByText('wheelchair access')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<MapInfoWindow {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close info window');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    }, { timeout: 300 });
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<MapInfoWindow {...defaultProps} />);

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockMarker);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<MapInfoWindow {...defaultProps} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockMarker);
  });

  it('calls onNavigate when navigate button is clicked', () => {
    render(<MapInfoWindow {...defaultProps} />);

    const navigateButton = screen.getByText('Navigate');
    fireEvent.click(navigateButton);

    expect(defaultProps.onNavigate).toHaveBeenCalledWith(mockMarker);
  });

  it('handles escape key to close', async () => {
    render(<MapInfoWindow {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    }, { timeout: 300 });
  });

  it('renders phone number as clickable link', () => {
    render(<MapInfoWindow {...defaultProps} />);

    const phoneLink = screen.getByText('+971501234567');
    expect(phoneLink).toHaveAttribute('href', 'tel:+971501234567');
  });

  it('applies compact styling when compact prop is true', () => {
    const { container } = render(<MapInfoWindow {...defaultProps} compact />);

    const infoWindow = container.firstChild as HTMLElement;
    expect(infoWindow).toHaveClass('p-3');
  });

  it('applies mobile styling when mobile prop is true', () => {
    const { container } = render(<MapInfoWindow {...defaultProps} mobile />);

    const infoWindow = container.firstChild as HTMLElement;
    expect(infoWindow).toHaveClass('mx-4');
  });

  it('hides actions when showActions is false', () => {
    render(<MapInfoWindow {...defaultProps} showActions={false} />);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Navigate')).not.toBeInTheDocument();
  });

  it('hides address when showAddress is false', () => {
    render(<MapInfoWindow {...defaultProps} showAddress={false} />);

    expect(screen.queryByText('123 Main Street, Dubai, UAE')).not.toBeInTheDocument();
  });

  it('hides notes when showNotes is false', () => {
    render(<MapInfoWindow {...defaultProps} showNotes={false} />);

    expect(screen.queryByText('Notes:')).not.toBeInTheDocument();
    expect(screen.queryByText('Patient prefers morning appointments')).not.toBeInTheDocument();
  });

  it('hides custom fields when showCustomFields is false', () => {
    render(<MapInfoWindow {...defaultProps} showCustomFields={false} />);

    expect(screen.queryByText('Custom Fields:')).not.toBeInTheDocument();
    expect(screen.queryByText('Priority: high')).not.toBeInTheDocument();
  });

  it('hides transportation info when showTransportation is false', () => {
    render(<MapInfoWindow {...defaultProps} showTransportation={false} />);

    expect(screen.queryByText('Transportation: driver')).not.toBeInTheDocument();
  });

  it('hides driver info when showDriver is false', () => {
    render(<MapInfoWindow {...defaultProps} showDriver={false} />);

    expect(screen.queryByText('Driver ID: driver-123')).not.toBeInTheDocument();
  });

  it('hides pickup instructions when showPickupInstructions is false', () => {
    render(<MapInfoWindow {...defaultProps} showPickupInstructions={false} />);

    expect(screen.queryByText('Pickup Instructions:')).not.toBeInTheDocument();
    expect(screen.queryByText('Ring doorbell twice')).not.toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', () => {
    const markerWithoutOptionalFields: MapMarker = {
      ...mockMarker,
      patient_phone: '',
      address: '',
      notes: '',
      custom_fields: {},
      transportation_type: undefined,
      driver_id: undefined,
      pickup_instructions: undefined
    };

    render(
      <MapInfoWindow
        {...defaultProps}
        marker={markerWithoutOptionalFields}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('+971501234567')).not.toBeInTheDocument();
    expect(screen.queryByText('123 Main Street, Dubai, UAE')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes:')).not.toBeInTheDocument();
    expect(screen.queryByText('Custom Fields:')).not.toBeInTheDocument();
  });

  it('applies correct position styling', () => {
    const { container: topContainer } = render(
      <MapInfoWindow {...defaultProps} position="top" />
    );
    const topInfoWindow = topContainer.firstChild as HTMLElement;
    // The position styling is applied via the style prop, not the transform
    expect(topInfoWindow.style.transform).toContain('translateY(-10px)'); // Animation overrides position

    const { container: bottomContainer } = render(
      <MapInfoWindow {...defaultProps} position="bottom" />
    );
    const bottomInfoWindow = bottomContainer.firstChild as HTMLElement;
    expect(bottomInfoWindow.style.transform).toContain('translateY(-10px)'); // Animation overrides position
  });

  it('prevents event propagation on click', () => {
    const handleMapClick = jest.fn();
    const { container } = render(
      <div onClick={handleMapClick}>
        <MapInfoWindow {...defaultProps} />
      </div>
    );

    const infoWindow = container.querySelector('[class*="fixed z-50"]') as HTMLElement;
    fireEvent.click(infoWindow);

    expect(handleMapClick).not.toHaveBeenCalled();
  });
});
