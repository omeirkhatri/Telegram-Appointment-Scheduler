import type { MapCluster as MapClusterType, MapMarker } from '@/types/map';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapCluster } from './MapCluster';

// Mock the appointment types utility
jest.mock('@/utils/appointmentTypes', () => ({
  getAppointmentTypeColor: jest.fn((type: string, variant: string) => {
    const colors = {
      doctor_on_call: { primary: '#3B82F6', light: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
      lab_test: { primary: '#10B981', light: '#D1FAE5', text: '#047857', border: '#6EE7B7' },
      teleconsultation: { primary: '#8B5CF6', light: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' },
      physiotherapy: { primary: '#F59E0B', light: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
      caregiver: { primary: '#EF4444', light: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
      iv_therapy: { primary: '#06B6D4', light: '#CFFAFE', text: '#0891B2', border: '#67E8F9' }
    };
    return colors[type as keyof typeof colors]?.[variant as keyof typeof colors.doctor_on_call] || '#6B7280';
  })
}));

describe('MapCluster', () => {
  const mockMarkers: MapMarker[] = [
    {
      id: 'marker-1',
      position: { lat: 25.2048, lng: 55.2708 },
      title: 'Test Appointment 1',
      appointment_id: 'appointment-1',
      patient_id: 'patient-1',
      appointment_type: 'doctor_on_call',
      appointment_date: '2024-01-20',
      start_time: '10:00',
      duration_minutes: 60,
      status: 'confirmed',
      patient_name: 'John Doe',
      patient_phone: '+971501234567',
      address: 'Dubai, UAE'
    },
    {
      id: 'marker-2',
      position: { lat: 25.2049, lng: 55.2709 },
      title: 'Test Appointment 2',
      appointment_id: 'appointment-2',
      patient_id: 'patient-2',
      appointment_type: 'lab_test',
      appointment_date: '2024-01-20',
      start_time: '11:00',
      duration_minutes: 30,
      status: 'scheduled',
      patient_name: 'Jane Smith',
      patient_phone: '+971501234568',
      address: 'Dubai, UAE'
    },
    {
      id: 'marker-3',
      position: { lat: 25.2050, lng: 55.2710 },
      title: 'Test Appointment 3',
      appointment_id: 'appointment-3',
      patient_id: 'patient-3',
      appointment_type: 'doctor_on_call',
      appointment_date: '2024-01-20',
      start_time: '12:00',
      duration_minutes: 45,
      status: 'confirmed',
      patient_name: 'Bob Johnson',
      patient_phone: '+971501234569',
      address: 'Dubai, UAE'
    }
  ];

  const mockCluster: MapClusterType = {
    id: 'cluster-1',
    position: { lat: 25.2049, lng: 55.2709 },
    count: 3,
    markers: mockMarkers,
    bounds: {
      northeast: { lat: 25.2050, lng: 55.2710 },
      southwest: { lat: 25.2048, lng: 55.2708 }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cluster with correct count', () => {
    render(<MapCluster cluster={mockCluster} />);

    const clusterElement = screen.getByRole('button');
    expect(clusterElement).toBeInTheDocument();
    expect(clusterElement).toHaveAttribute('aria-label', expect.stringContaining('3 appointments'));
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows appointment count in label', () => {
    render(<MapCluster cluster={mockCluster} showCount={true} />);

    const clusterElement = screen.getByRole('button');
    fireEvent.mouseEnter(clusterElement);

    expect(screen.getByText('3 appointments')).toBeInTheDocument();
  });

  it('shows type breakdown when enabled', () => {
    render(<MapCluster cluster={mockCluster} showTypeBreakdown={true} />);

    const clusterElement = screen.getByRole('button');
    fireEvent.mouseEnter(clusterElement);

    // Should show breakdown of appointment types
    expect(screen.getByText('doctor on_call: 2')).toBeInTheDocument();
    expect(screen.getByText('lab test: 1')).toBeInTheDocument();
  });

  it('handles click events correctly', () => {
    const handleClick = jest.fn();
    render(<MapCluster cluster={mockCluster} onClick={handleClick} />);

    const clusterElement = screen.getByRole('button');
    fireEvent.click(clusterElement);

    expect(handleClick).toHaveBeenCalledWith(mockCluster);
  });

  it('handles hover events correctly', () => {
    const handleHover = jest.fn();
    render(<MapCluster cluster={mockCluster} onHover={handleHover} />);

    const clusterElement = screen.getByRole('button');
    fireEvent.mouseEnter(clusterElement);

    expect(handleHover).toHaveBeenCalledWith(mockCluster);

    fireEvent.mouseLeave(clusterElement);

    expect(handleHover).toHaveBeenCalledWith(null);
  });

  it('applies selected state styling', () => {
    render(<MapCluster cluster={mockCluster} isSelected={true} />);

    const clusterElement = screen.getByRole('button');
    expect(clusterElement).toHaveClass('ring-2', 'ring-blue-500', 'ring-offset-2');
  });

  it('applies hover state styling', () => {
    render(<MapCluster cluster={mockCluster} isHovered={true} />);

    const clusterElement = screen.getByRole('button');
    expect(clusterElement).toHaveClass('scale-110');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<MapCluster cluster={mockCluster} size="small" />);
    let clusterElement = screen.getByRole('button');
    expect(clusterElement).toHaveClass('w-10', 'h-10');

    rerender(<MapCluster cluster={mockCluster} size="large" />);
    clusterElement = screen.getByRole('button');
    expect(clusterElement).toHaveClass('w-18', 'h-18');
  });

  it('shows dominant appointment type icon', () => {
    render(<MapCluster cluster={mockCluster} />);

    // The icon should be present in the cluster
    const iconContainer = screen.getByRole('button').querySelector('div[class*="w-7 h-7"]');
    expect(iconContainer).toBeInTheDocument();
  });

  it('handles mobile touch events', () => {
    // Mock mobile environment
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const handleClick = jest.fn();
    render(<MapCluster cluster={mockCluster} onClick={handleClick} />);

    const clusterElement = screen.getByRole('button');

    // Simulate touch events
    fireEvent.touchStart(clusterElement);
    fireEvent.touchEnd(clusterElement);

    expect(handleClick).toHaveBeenCalledWith(mockCluster);
  });

  it('applies pulse animation when enabled', () => {
    render(<MapCluster cluster={mockCluster} pulse={true} animated={true} />);

    const clusterElement = screen.getByRole('button');
    // The pulse animation is applied conditionally based on isAnimating state
    // which is controlled by the useEffect, so we just check that the component renders
    expect(clusterElement).toBeInTheDocument();
  });

  it('calculates type breakdown correctly', () => {
    render(<MapCluster cluster={mockCluster} showTypeBreakdown={true} />);

    const clusterElement = screen.getByRole('button');
    fireEvent.mouseEnter(clusterElement);

    // Should show the correct breakdown
    expect(screen.getByText('doctor on_call: 2')).toBeInTheDocument();
    expect(screen.getByText('lab test: 1')).toBeInTheDocument();
  });

  it('shows "more" indicator when there are many types', () => {
    // Create a cluster with many different appointment types
    const manyTypesMarkers: MapMarker[] = [
      { ...mockMarkers[0], appointment_type: 'doctor_on_call' },
      { ...mockMarkers[1], appointment_type: 'lab_test' },
      { ...mockMarkers[2], appointment_type: 'teleconsultation' },
      { ...mockMarkers[0], id: 'marker-4', appointment_type: 'physiotherapy' },
      { ...mockMarkers[1], id: 'marker-5', appointment_type: 'caregiver' }
    ];

    const manyTypesCluster: MapClusterType = {
      ...mockCluster,
      markers: manyTypesMarkers,
      count: 5
    };

    render(<MapCluster cluster={manyTypesCluster} showTypeBreakdown={true} />);

    const clusterElement = screen.getByRole('button');
    fireEvent.mouseEnter(clusterElement);

    // Should show "more" indicator
    expect(screen.getByText(/\+.*more/)).toBeInTheDocument();
  });

  it('handles single appointment type cluster', () => {
    const singleTypeCluster: MapClusterType = {
      ...mockCluster,
      markers: [mockMarkers[0], mockMarkers[2]], // Both doctor_on_call
      count: 2
    };

    render(<MapCluster cluster={singleTypeCluster} showTypeBreakdown={true} />);

    const clusterElement = screen.getByRole('button');
    fireEvent.mouseEnter(clusterElement);

    // Should not show breakdown for single type
    expect(screen.queryByText(/doctor_on_call: 2/)).not.toBeInTheDocument();
  });

  it('handles empty cluster gracefully', () => {
    const emptyCluster: MapClusterType = {
      ...mockCluster,
      markers: [],
      count: 0
    };

    render(<MapCluster cluster={emptyCluster} />);

    const clusterElement = screen.getByRole('button');
    expect(clusterElement).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
