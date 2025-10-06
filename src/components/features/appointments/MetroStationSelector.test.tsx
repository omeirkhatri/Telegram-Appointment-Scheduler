import type { TransportationSegmentLocation } from '@/types/transportationSegment';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetroStationSelector } from './MetroStationSelector';

const mockMetroStations = [
  {
    id: 'station-1',
    name: 'Central Station',
    address: '123 Central Ave, New York, NY 10001',
    lat: 40.7505,
    lng: -73.9934,
    lines: ['A', 'C', 'E'],
  },
  {
    id: 'station-2',
    name: 'Union Square',
    address: '456 Union St, New York, NY 10003',
    lat: 40.7359,
    lng: -73.9911,
    lines: ['4', '5', '6', 'L'],
  },
];

const mockStationLocation: TransportationSegmentLocation = {
  address: '123 Central Ave, New York, NY 10001',
  lat: 40.7505,
  lng: -73.9934,
  building_name: 'Central Station',
};

describe('MetroStationSelector', () => {
  const mockOnStationSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render metro station selector', () => {
    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    expect(screen.getByText('Metro Station')).toBeInTheDocument();
    expect(screen.getByText('Select a metro station for pickup')).toBeInTheDocument();
  });

  it('should display available metro stations', () => {
    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    // Should show metro station options
    expect(screen.getByText('Central Station')).toBeInTheDocument();
    expect(screen.getByText('Union Square')).toBeInTheDocument();
  });

  it('should call onStationSelect when station is selected', async () => {
    const user = userEvent.setup();

    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    const stationOption = screen.getByText('Central Station');
    await user.click(stationOption);

    expect(mockOnStationSelect).toHaveBeenCalledWith(
      mockMetroStations[0],
      mockStationLocation
    );
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
        disabled={true}
      />
    );

    const stationOptions = screen.getAllByRole('button');
    stationOptions.forEach(option => {
      expect(option).toBeDisabled();
    });
  });

  it('should not call onStationSelect when disabled', async () => {
    const user = userEvent.setup();

    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
        disabled={true}
      />
    );

    const stationOption = screen.getByText('Central Station');
    await user.click(stationOption);

    expect(mockOnStationSelect).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should display station details correctly', () => {
    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    // Check that station information is displayed
    expect(screen.getByText('Metro Station')).toBeInTheDocument();
    expect(screen.getByText('Select a metro station for pickup')).toBeInTheDocument();
    expect(screen.getByText('Central Station')).toBeInTheDocument();
    expect(screen.getByText('Union Square')).toBeInTheDocument();
  });

  it('should display station lines information', () => {
    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    // Check that station lines are displayed
    expect(screen.getByText('Lines: A, C, E')).toBeInTheDocument();
    expect(screen.getByText('Lines: 4, 5, 6, L')).toBeInTheDocument();
  });

  it('should handle station selection with different stations', async () => {
    const user = userEvent.setup();

    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    // Select first station
    const firstStation = screen.getByText('Central Station');
    await user.click(firstStation);

    expect(mockOnStationSelect).toHaveBeenCalledWith(
      mockMetroStations[0],
      mockStationLocation
    );

    // Select second station
    const secondStation = screen.getByText('Union Square');
    await user.click(secondStation);

    expect(mockOnStationSelect).toHaveBeenCalledWith(
      mockMetroStations[1],
      {
        address: '456 Union St, New York, NY 10003',
        lat: 40.7359,
        lng: -73.9911,
        building_name: 'Union Square',
      }
    );
  });

  it('should have proper accessibility attributes', () => {
    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    const stationOptions = screen.getAllByRole('button');
    expect(stationOptions.length).toBeGreaterThan(0);
  });

  it('should handle rapid station selections', async () => {
    const user = userEvent.setup();

    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    const firstStation = screen.getByText('Central Station');
    const secondStation = screen.getByText('Union Square');

    // Rapidly switch between stations
    await user.click(firstStation);
    await user.click(secondStation);
    await user.click(firstStation);

    expect(mockOnStationSelect).toHaveBeenCalledTimes(3);
  });

  it('should display station addresses', () => {
    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    expect(screen.getByText('123 Central Ave, New York, NY 10001')).toBeInTheDocument();
    expect(screen.getByText('456 Union St, New York, NY 10003')).toBeInTheDocument();
  });

  it('should display station coordinates', () => {
    render(
      <MetroStationSelector
        onStationSelect={mockOnStationSelect}
      />
    );

    expect(screen.getByText('Coordinates: 40.7505, -73.9934')).toBeInTheDocument();
    expect(screen.getByText('Coordinates: 40.7359, -73.9911')).toBeInTheDocument();
  });
});

