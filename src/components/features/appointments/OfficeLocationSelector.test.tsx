import type { TransportationSegmentLocation } from '@/types/transportationSegment';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfficeLocationSelector } from './OfficeLocationSelector';

// Mock the office location data
const mockOfficeLocation: TransportationSegmentLocation = {
  address: '123 Main Office St, New York, NY 10001',
  lat: 40.7128,
  lng: -74.0060,
  building_name: 'MediCare Headquarters',
};

describe('OfficeLocationSelector', () => {
  const mockOnLocationSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render office location information', () => {
    render(
      <OfficeLocationSelector
        onLocationSelect={mockOnLocationSelect}
      />
    );

    expect(screen.getByText('Office Location')).toBeInTheDocument();
    expect(screen.getByText('123 Main Office St, New York, NY 10001')).toBeInTheDocument();
    expect(screen.getByText('MediCare Headquarters')).toBeInTheDocument();
  });

  it('should call onLocationSelect when confirm button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <OfficeLocationSelector
        onLocationSelect={mockOnLocationSelect}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm office location/i });
    await user.click(confirmButton);

    expect(mockOnLocationSelect).toHaveBeenCalledWith(mockOfficeLocation);
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <OfficeLocationSelector
        onLocationSelect={mockOnLocationSelect}
        disabled={true}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm office location/i });
    expect(confirmButton).toBeDisabled();
  });

  it('should not call onLocationSelect when disabled', async () => {
    const user = userEvent.setup();

    render(
      <OfficeLocationSelector
        onLocationSelect={mockOnLocationSelect}
        disabled={true}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm office location/i });
    await user.click(confirmButton);

    expect(mockOnLocationSelect).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <OfficeLocationSelector
        onLocationSelect={mockOnLocationSelect}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should display office location details correctly', () => {
    render(
      <OfficeLocationSelector
        onLocationSelect={mockOnLocationSelect}
      />
    );

    // Check that all office details are displayed
    expect(screen.getByText('Office Location')).toBeInTheDocument();
    expect(screen.getByText('123 Main Office St, New York, NY 10001')).toBeInTheDocument();
    expect(screen.getByText('MediCare Headquarters')).toBeInTheDocument();
    expect(screen.getByText('Coordinates: 40.7128, -74.0060')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <OfficeLocationSelector
        onLocationSelect={mockOnLocationSelect}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm office location/i });
    expect(confirmButton).toHaveAttribute('type', 'button');
  });

  it('should handle multiple clicks gracefully', async () => {
    const user = userEvent.setup();

    render(
      <OfficeLocationSelector
        onLocationSelect={mockOnLocationSelect}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm office location/i });

    // Click multiple times
    await user.click(confirmButton);
    await user.click(confirmButton);
    await user.click(confirmButton);

    // Should be called for each click
    expect(mockOnLocationSelect).toHaveBeenCalledTimes(3);
  });
});

