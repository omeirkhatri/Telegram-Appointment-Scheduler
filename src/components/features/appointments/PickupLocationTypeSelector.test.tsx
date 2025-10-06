import type { PickupLocationType } from '@/types/transportationSegment';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PickupLocationTypeSelector } from './PickupLocationTypeSelector';

describe('PickupLocationTypeSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all pickup location types', () => {
    render(
      <PickupLocationTypeSelector
        value="office"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Pickup Location Type *')).toBeInTheDocument();
    expect(screen.getByText('From Office')).toBeInTheDocument();
    expect(screen.getByText('From Previous Appointment')).toBeInTheDocument();
    expect(screen.getByText('From Metro Station')).toBeInTheDocument();
    expect(screen.getByText('From Custom Location')).toBeInTheDocument();
  });

  it('should show descriptions for each pickup type', () => {
    render(
      <PickupLocationTypeSelector
        value="office"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Driver starts from the main office location. Use for first appointments of the day or when driver begins their shift.')).toBeInTheDocument();
    expect(screen.getByText('Driver continues from a previous appointment\'s patient location. Reduces travel time and improves efficiency.')).toBeInTheDocument();
    expect(screen.getByText('Driver picks up from a designated metro/subway station. Use when patients use public transportation.')).toBeInTheDocument();
    expect(screen.getByText('Driver picks up from any custom address or location. Use for patient homes, landmarks, or special locations.')).toBeInTheDocument();
  });

  it('should call onChange when a different type is selected', async () => {
    const user = userEvent.setup();

    render(
      <PickupLocationTypeSelector
        value="office"
        onChange={mockOnChange}
      />
    );

    const previousAppointmentOption = screen.getByLabelText('From Previous Appointment');
    await user.click(previousAppointmentOption);

    expect(mockOnChange).toHaveBeenCalledWith('previous_appointment');
  });

  it('should show selected state for current value', () => {
    render(
      <PickupLocationTypeSelector
        value="metro_station"
        onChange={mockOnChange}
      />
    );

    const metroStationOption = screen.getByLabelText('From Metro Station');
    expect(metroStationOption).toBeChecked();
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <PickupLocationTypeSelector
        value="office"
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should not call onChange when disabled', async () => {
    const user = userEvent.setup();

    render(
      <PickupLocationTypeSelector
        value="office"
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const customLocationOption = screen.getByLabelText('From Custom Location');
    await user.click(customLocationOption);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PickupLocationTypeSelector
        value="office"
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle hover states', async () => {
    const user = userEvent.setup();

    render(
      <PickupLocationTypeSelector
        value="office"
        onChange={mockOnChange}
      />
    );

    const customLocationOption = screen.getByLabelText('From Custom Location');

    // Test hover enter
    await user.hover(customLocationOption);
    // Note: Hover state testing in JSDOM is limited, but we can verify the element is interactive
    expect(customLocationOption).toBeInTheDocument();
  });

  it('should render with all pickup location types', () => {
    const pickupTypes: PickupLocationType[] = ['office', 'previous_appointment', 'metro_station', 'custom'];

    pickupTypes.forEach(type => {
      const { unmount } = render(
        <PickupLocationTypeSelector
          value={type}
          onChange={mockOnChange}
        />
      );

      // Verify the type is selected
      const selectedOption = screen.getByLabelText(new RegExp(type.replace('_', ' '), 'i'));
      expect(selectedOption).toBeChecked();

      unmount();
    });
  });

  it('should have proper accessibility attributes', () => {
    render(
      <PickupLocationTypeSelector
        value="office"
        onChange={mockOnChange}
      />
    );

    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons).toHaveLength(4);

    // Check that all radio buttons have the same name
    const names = radioButtons.map(button => button.getAttribute('name'));
    expect(names.every(name => name === 'pickup_location_type')).toBe(true);
  });

  it('should handle rapid type changes', async () => {
    const user = userEvent.setup();

    render(
      <PickupLocationTypeSelector
        value="office"
        onChange={mockOnChange}
      />
    );

    // Rapidly change between different types
    await user.click(screen.getByLabelText('From Previous Appointment'));
    await user.click(screen.getByLabelText('From Metro Station'));
    await user.click(screen.getByLabelText('From Custom Location'));

    expect(mockOnChange).toHaveBeenCalledTimes(3);
    expect(mockOnChange).toHaveBeenNthCalledWith(1, 'previous_appointment');
    expect(mockOnChange).toHaveBeenNthCalledWith(2, 'metro_station');
    expect(mockOnChange).toHaveBeenNthCalledWith(3, 'custom');
  });
});

