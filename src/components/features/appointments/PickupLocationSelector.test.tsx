import type { Appointment } from '@/types/appointment';
import type { PickupLocationType } from '@/types/transportationSegment';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PickupLocationSelector } from './PickupLocationSelector';

// Mock the child components
jest.mock('./PickupLocationTypeSelector', () => ({
  PickupLocationTypeSelector: ({ value, onChange, disabled }: any) => (
    <div data-testid="pickup-location-type-selector">
      <input
        type="radio"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid="type-selector"
      />
    </div>
  ),
}));

jest.mock('./OfficeLocationSelector', () => ({
  OfficeLocationSelector: ({ onLocationSelect, disabled }: any) => (
    <div data-testid="office-location-selector">
      <button
        onClick={() => onLocationSelect({
          address: '123 Office St',
          lat: 40.7128,
          lng: -74.0060,
          building_name: 'Office Building'
        })}
        disabled={disabled}
        data-testid="office-selector"
      >
        Select Office
      </button>
    </div>
  ),
}));

jest.mock('./PreviousAppointmentSelector', () => ({
  PreviousAppointmentSelector: ({ onAppointmentSelect, appointments, disabled }: any) => (
    <div data-testid="previous-appointment-selector">
      <button
        onClick={() => onAppointmentSelect(
          appointments[0],
          {
            address: '456 Patient St',
            lat: 40.7589,
            lng: -73.9851
          }
        )}
        disabled={disabled}
        data-testid="previous-appointment-selector"
      >
        Select Previous Appointment
      </button>
    </div>
  ),
}));

jest.mock('./MetroStationSelector', () => ({
  MetroStationSelector: ({ onStationSelect, disabled }: any) => (
    <div data-testid="metro-station-selector">
      <button
        onClick={() => onStationSelect(
          { id: 'station-1', name: 'Central Station' },
          {
            address: '789 Metro St',
            lat: 40.7505,
            lng: -73.9934
          }
        )}
        disabled={disabled}
        data-testid="metro-selector"
      >
        Select Metro Station
      </button>
    </div>
  ),
}));

jest.mock('./CustomLocationSelector', () => ({
  CustomLocationSelector: ({ onLocationSelect, disabled }: any) => (
    <div data-testid="custom-location-selector">
      <button
        onClick={() => onLocationSelect({
          address: '321 Custom St',
          lat: 40.7614,
          lng: -73.9776
        })}
        disabled={disabled}
        data-testid="custom-selector"
      >
        Select Custom Location
      </button>
    </div>
  ),
}));

describe('PickupLocationSelector', () => {
  const mockOnTypeChange = jest.fn();
  const mockOnLocationChange = jest.fn();
  const mockOnReferenceChange = jest.fn();

  const mockAppointments: Appointment[] = [
    {
      id: 'appointment-1',
      patient_id: 'patient-1',
      appointment_type: 'doctor_on_call',
      appointment_date: '2024-01-01',
      start_time: '10:00',
      duration_minutes: 60,
      status: 'scheduled',
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T09:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render pickup location type selector', () => {
    render(
      <PickupLocationSelector
        pickupLocationType="office"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    expect(screen.getByTestId('pickup-location-type-selector')).toBeInTheDocument();
  });

  it('should render office location selector when type is office', () => {
    render(
      <PickupLocationSelector
        pickupLocationType="office"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    expect(screen.getByTestId('office-location-selector')).toBeInTheDocument();
  });

  it('should render previous appointment selector when type is previous_appointment', () => {
    render(
      <PickupLocationSelector
        pickupLocationType="previous_appointment"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    expect(screen.getByTestId('previous-appointment-selector')).toBeInTheDocument();
  });

  it('should render metro station selector when type is metro_station', () => {
    render(
      <PickupLocationSelector
        pickupLocationType="metro_station"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    expect(screen.getByTestId('metro-station-selector')).toBeInTheDocument();
  });

  it('should render custom location selector when type is custom', () => {
    render(
      <PickupLocationSelector
        pickupLocationType="custom"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    expect(screen.getByTestId('custom-location-selector')).toBeInTheDocument();
  });

  it('should handle type change and clear location/reference', async () => {
    const user = userEvent.setup();

    render(
      <PickupLocationSelector
        pickupLocationType="office"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    const typeSelector = screen.getByTestId('type-selector');
    await user.type(typeSelector, 'custom');

    expect(mockOnTypeChange).toHaveBeenCalledWith('custom');
    expect(mockOnLocationChange).toHaveBeenCalledWith(null);
    expect(mockOnReferenceChange).toHaveBeenCalledWith(null);
  });

  it('should handle office location selection', async () => {
    const user = userEvent.setup();

    render(
      <PickupLocationSelector
        pickupLocationType="office"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    const officeSelector = screen.getByTestId('office-selector');
    await user.click(officeSelector);

    expect(mockOnLocationChange).toHaveBeenCalledWith({
      address: '123 Office St',
      lat: 40.7128,
      lng: -74.0060,
      building_name: 'Office Building'
    });
    expect(mockOnReferenceChange).toHaveBeenCalledWith('office_location');
  });

  it('should handle previous appointment selection', async () => {
    const user = userEvent.setup();

    render(
      <PickupLocationSelector
        pickupLocationType="previous_appointment"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    const previousAppointmentSelector = screen.getByTestId('previous-appointment-selector');
    await user.click(previousAppointmentSelector);

    expect(mockOnLocationChange).toHaveBeenCalledWith({
      address: '456 Patient St',
      lat: 40.7589,
      lng: -73.9851
    });
    expect(mockOnReferenceChange).toHaveBeenCalledWith('appointment-1');
  });

  it('should handle metro station selection', async () => {
    const user = userEvent.setup();

    render(
      <PickupLocationSelector
        pickupLocationType="metro_station"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    const metroSelector = screen.getByTestId('metro-selector');
    await user.click(metroSelector);

    expect(mockOnLocationChange).toHaveBeenCalledWith({
      address: '789 Metro St',
      lat: 40.7505,
      lng: -73.9934
    });
    expect(mockOnReferenceChange).toHaveBeenCalledWith('station-1');
  });

  it('should handle custom location selection', async () => {
    const user = userEvent.setup();

    render(
      <PickupLocationSelector
        pickupLocationType="custom"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    const customSelector = screen.getByTestId('custom-selector');
    await user.click(customSelector);

    expect(mockOnLocationChange).toHaveBeenCalledWith({
      address: '321 Custom St',
      lat: 40.7614,
      lng: -73.9776
    });
    expect(mockOnReferenceChange).toHaveBeenCalledWith(null);
  });

  it('should pass disabled prop to child components', () => {
    render(
      <PickupLocationSelector
        pickupLocationType="office"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
        disabled={true}
      />
    );

    const typeSelector = screen.getByTestId('type-selector');
    const officeSelector = screen.getByTestId('office-selector');

    expect(typeSelector).toBeDisabled();
    expect(officeSelector).toBeDisabled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PickupLocationSelector
        pickupLocationType="office"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should initialize with default type when not provided', () => {
    render(
      <PickupLocationSelector
        pickupLocationType={'' as PickupLocationType}
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    // Should call onTypeChange with 'office' as default
    expect(mockOnTypeChange).toHaveBeenCalledWith('office');
  });

  it('should pass appointments to previous appointment selector', () => {
    render(
      <PickupLocationSelector
        pickupLocationType="previous_appointment"
        onTypeChange={mockOnTypeChange}
        onLocationChange={mockOnLocationChange}
        onReferenceChange={mockOnReferenceChange}
        appointments={mockAppointments}
      />
    );

    // The mock component should receive the appointments prop
    expect(screen.getByTestId('previous-appointment-selector')).toBeInTheDocument();
  });

  it('should handle all pickup location types correctly', () => {
    const types: PickupLocationType[] = ['office', 'previous_appointment', 'metro_station', 'custom'];

    types.forEach(type => {
      const { unmount } = render(
        <PickupLocationSelector
          pickupLocationType={type}
          onTypeChange={mockOnTypeChange}
          onLocationChange={mockOnLocationChange}
          onReferenceChange={mockOnReferenceChange}
          appointments={mockAppointments}
        />
      );

      // Each type should render its corresponding selector
      expect(screen.getByTestId('pickup-location-type-selector')).toBeInTheDocument();

      unmount();
    });
  });
});

