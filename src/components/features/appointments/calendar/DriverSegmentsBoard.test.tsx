import type { Staff } from '@/types/staff';
import type { TransportationSegment } from '@/types/transportationSegment';
import { fireEvent, render, screen } from '@testing-library/react';
import { DriverSegmentsBoard } from './DriverSegmentsBoard';

// Mock data
const mockDrivers: Staff[] = [
  {
    id: 'driver-1',
    first_name: 'Ahmed',
    last_name: 'Hassan',
    staff_type: 'driver',
    phone: '+971501234567',
    email: 'ahmed@example.com',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'driver-2',
    first_name: 'Mohammed',
    last_name: 'Ali',
    staff_type: 'driver',
    phone: '+971507654321',
    email: 'mohammed@example.com',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockSegments: TransportationSegment[] = [
  {
    id: 'segment-1',
    appointment_id: 'appointment-1',
    segment_type: 'pickup',
    title: 'Patient Pickup - John Doe',
    planned_start: '2024-01-15T08:00:00Z',
    planned_end: '2024-01-15T08:30:00Z',
    driver_id: 'driver-1',
    travel_mode: 'vehicle',
    origin: {
      lat: 25.2048,
      lng: 55.2708,
      address: 'Dubai Mall, Dubai'
    },
    destination: {
      lat: 25.2048,
      lng: 55.2708,
      address: 'Dubai Hospital, Dubai'
    },
    estimated_travel_minutes: 25,
    estimated_distance_km: 12.5,
    buffer_minutes: 5,
    instructions: 'Patient has mobility issues, bring wheelchair',
    requires_follow_up: false,
    status: 'scheduled',
    manual_override: false,
    created_at: '2024-01-15T07:00:00Z',
    updated_at: '2024-01-15T07:00:00Z',
    driver: mockDrivers[0]
  },
  {
    id: 'segment-2',
    appointment_id: 'appointment-1',
    segment_type: 'dropoff',
    title: 'Patient Drop-off - John Doe',
    planned_start: '2024-01-15T10:00:00Z',
    planned_end: '2024-01-15T10:30:00Z',
    driver_id: 'driver-1',
    travel_mode: 'vehicle',
    origin: {
      lat: 25.2048,
      lng: 55.2708,
      address: 'Dubai Hospital, Dubai'
    },
    destination: {
      lat: 25.2048,
      lng: 55.2708,
      address: 'Dubai Mall, Dubai'
    },
    estimated_travel_minutes: 25,
    estimated_distance_km: 12.5,
    buffer_minutes: 5,
    instructions: 'Return patient home safely',
    requires_follow_up: false,
    status: 'scheduled',
    manual_override: false,
    created_at: '2024-01-15T07:00:00Z',
    updated_at: '2024-01-15T07:00:00Z',
    driver: mockDrivers[0]
  },
  {
    id: 'segment-3',
    appointment_id: 'appointment-2',
    segment_type: 'pickup',
    title: 'Patient Pickup - Jane Smith',
    planned_start: '2024-01-15T09:00:00Z',
    planned_end: '2024-01-15T09:30:00Z',
    driver_id: 'driver-2',
    travel_mode: 'vehicle',
    origin: {
      lat: 25.2048,
      lng: 55.2708,
      address: 'Jumeirah Beach, Dubai'
    },
    destination: {
      lat: 25.2048,
      lng: 55.2708,
      address: 'Dubai Hospital, Dubai'
    },
    estimated_travel_minutes: 30,
    estimated_distance_km: 15.0,
    buffer_minutes: 10,
    instructions: 'Patient is elderly, drive carefully',
    requires_follow_up: true,
    status: 'in_progress',
    manual_override: false,
    created_at: '2024-01-15T07:00:00Z',
    updated_at: '2024-01-15T07:00:00Z',
    driver: mockDrivers[1]
  }
];

describe('DriverSegmentsBoard', () => {
  const defaultProps = {
    segments: mockSegments,
    drivers: mockDrivers,
    selectedDate: '2024-01-15',
    onSegmentClick: jest.fn(),
    onDriverClick: jest.fn(),
    onSegmentStatusUpdate: jest.fn(),
    onSegmentReassign: jest.fn(),
    onCallDriver: jest.fn(),
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders driver segments board with correct title', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    expect(screen.getByText('Driver Segments Board')).toBeInTheDocument();
    expect(screen.getByText('Segments for Jan 15')).toBeInTheDocument();
  });

  it('displays drivers with their segments', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    // Check if drivers are displayed
    expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument();
    expect(screen.getByText('Mohammed Ali')).toBeInTheDocument();

    // Check if segment counts are displayed
    expect(screen.getByText('2 segments')).toBeInTheDocument();
    expect(screen.getByText('1 segments')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<DriverSegmentsBoard {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Loading driver segments...')).toBeInTheDocument();
  });

  it('shows error state when error is provided', () => {
    const errorMessage = 'Failed to load segments';
    render(<DriverSegmentsBoard {...defaultProps} error={errorMessage} />);

    expect(screen.getByText(`Error loading driver segments: ${errorMessage}`)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows empty state when no segments are found', () => {
    render(<DriverSegmentsBoard {...defaultProps} segments={[]} />);

    expect(screen.getByText('No Driver Segments Found')).toBeInTheDocument();
    expect(screen.getByText('No driver segments found for the selected criteria.')).toBeInTheDocument();
  });

  it('allows expanding and collapsing driver details', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    // Initially collapsed
    expect(screen.queryByText('Patient Pickup - John Doe')).not.toBeInTheDocument();

    // Click to expand
    const expandButton = screen.getAllByText('Expand')[0];
    fireEvent.click(expandButton);

    // Should show segment details
    expect(screen.getByText('Patient Pickup - John Doe')).toBeInTheDocument();
    expect(screen.getByText('Patient Drop-off - John Doe')).toBeInTheDocument();
  });

  it('filters segments by search term', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search segments...');
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });

    // Should only show Ahmed Hassan (who has John Doe segments)
    expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument();
    expect(screen.queryByText('Mohammed Ali')).not.toBeInTheDocument();
  });

  it('filters segments by status', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusFilter, { target: { value: 'in_progress' } });

    // Should only show Mohammed Ali (who has in_progress segment)
    expect(screen.getByText('Mohammed Ali')).toBeInTheDocument();
    expect(screen.queryByText('Ahmed Hassan')).not.toBeInTheDocument();
  });

  it('filters segments by type', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    const typeFilter = screen.getByDisplayValue('All Types');
    fireEvent.change(typeFilter, { target: { value: 'pickup' } });

    // Both drivers should be shown as they both have pickup segments
    expect(screen.getByText('Ahmed Hassan')).toBeInTheDocument();
    expect(screen.getByText('Mohammed Ali')).toBeInTheDocument();
  });

  it('shows conflicts only when toggle is enabled', () => {
    // Create segments with conflicts (overlapping times)
    const conflictingSegments: TransportationSegment[] = [
      {
        ...mockSegments[0],
        planned_start: '2024-01-15T08:00:00Z',
        planned_end: '2024-01-15T08:30:00Z'
      },
      {
        ...mockSegments[1],
        planned_start: '2024-01-15T08:15:00Z', // Overlaps with first segment
        planned_end: '2024-01-15T08:45:00Z'
      }
    ];

    render(<DriverSegmentsBoard {...defaultProps} segments={conflictingSegments} />);

    // Enable conflicts only filter
    const conflictsCheckbox = screen.getByLabelText('Show conflicts only');
    fireEvent.click(conflictsCheckbox);

    // Should show conflict indicators
    expect(screen.getByText('1 conflicts')).toBeInTheDocument();
  });

  it('calls onSegmentClick when segment is clicked', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    // Expand driver details first
    const expandButton = screen.getAllByText('Expand')[0];
    fireEvent.click(expandButton);

    // Click on segment edit button
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    expect(defaultProps.onSegmentClick).toHaveBeenCalledWith(mockSegments[0]);
  });

  it('calls onCallDriver when call button is clicked', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    const callButtons = screen.getAllByRole('button', { name: /phone/i });
    fireEvent.click(callButtons[0]);

    expect(defaultProps.onCallDriver).toHaveBeenCalledWith(mockDrivers[0]);
  });

  it('calls onSegmentStatusUpdate when status button is clicked', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    // Expand driver details first
    const expandButton = screen.getAllByText('Expand')[0];
    fireEvent.click(expandButton);

    // Click on start/complete button
    const statusButtons = screen.getAllByRole('button', { name: /start|complete/i });
    fireEvent.click(statusButtons[0]);

    expect(defaultProps.onSegmentStatusUpdate).toHaveBeenCalledWith('segment-1', 'in_progress');
  });

  it('calls onRefresh when refresh button is clicked', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('displays segment details correctly', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    // Expand driver details
    const expandButton = screen.getAllByText('Expand')[0];
    fireEvent.click(expandButton);

    // Check segment details
    expect(screen.getByText('Patient Pickup - John Doe')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Pickup')).toBeInTheDocument();
    expect(screen.getByText('Patient has mobility issues, bring wheelchair')).toBeInTheDocument();
  });

  it('displays driver statistics correctly', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    // Check Ahmed Hassan's stats (2 segments, both scheduled)
    expect(screen.getByText('2 segments')).toBeInTheDocument();
    expect(screen.getByText('0 completed')).toBeInTheDocument();
    expect(screen.getByText('0 in progress')).toBeInTheDocument();
    expect(screen.getByText('2 upcoming')).toBeInTheDocument();

    // Check Mohammed Ali's stats (1 segment, in progress)
    expect(screen.getByText('1 segments')).toBeInTheDocument();
    expect(screen.getByText('0 completed')).toBeInTheDocument();
    expect(screen.getByText('1 in progress')).toBeInTheDocument();
    expect(screen.getByText('0 upcoming')).toBeInTheDocument();
  });

  it('handles segments without drivers gracefully', () => {
    const segmentsWithoutDrivers = mockSegments.map(segment => ({
      ...segment,
      driver_id: null,
      driver: undefined
    }));

    render(<DriverSegmentsBoard {...defaultProps} segments={segmentsWithoutDrivers} />);

    // Should show empty state
    expect(screen.getByText('No Driver Segments Found')).toBeInTheDocument();
  });

  it('displays manual override indicators', () => {
    const segmentsWithOverride = mockSegments.map(segment => ({
      ...segment,
      manual_override: true
    }));

    render(<DriverSegmentsBoard {...defaultProps} segments={segmentsWithOverride} />);

    // Expand to see segments
    const expandButton = screen.getAllByText('Expand')[0];
    fireEvent.click(expandButton);

    expect(screen.getByText('Manual Override')).toBeInTheDocument();
  });

  it('shows travel information when available', () => {
    render(<DriverSegmentsBoard {...defaultProps} />);

    // Expand driver details
    const expandButton = screen.getAllByText('Expand')[0];
    fireEvent.click(expandButton);

    // Check travel info is displayed
    expect(screen.getByText('25 min • 12.5 km')).toBeInTheDocument();
  });

  it('handles missing time information gracefully', () => {
    const segmentsWithoutTimes = mockSegments.map(segment => ({
      ...segment,
      planned_start: undefined,
      planned_end: undefined
    }));

    render(<DriverSegmentsBoard {...defaultProps} segments={segmentsWithoutTimes} />);

    // Expand driver details
    const expandButton = screen.getAllByText('Expand')[0];
    fireEvent.click(expandButton);

    // Should show TBD for missing times
    expect(screen.getByText('TBD - TBD')).toBeInTheDocument();
  });
});
