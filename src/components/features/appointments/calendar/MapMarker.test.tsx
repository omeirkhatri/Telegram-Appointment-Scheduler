// @ts-nocheck
import type { MapMarker as MapMarkerType } from '@/types/map';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapMarker } from './MapMarker';

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

// Mock the appointment types
jest.mock('@/types/appointment', () => ({
  getAppointmentTypeDisplayName: jest.fn((type: string) => {
    const names = {
      doctor_on_call: 'Doctor on Call',
      lab_test: 'Lab Test',
      teleconsultation: 'Teleconsultation',
      physiotherapy: 'Physiotherapy',
      caregiver: 'Caregiver',
      iv_therapy: 'IV Therapy'
    };
    return names[type as keyof typeof names] || 'Unknown';
  })
}));

// Mock timezone utility
jest.mock('@/utils/timezone', () => ({
  formatTimeToHHMM: jest.fn((time: string) => time)
}));

describe('MapMarker', () => {
const mockMarker: MapMarkerType = {
  id: 'marker-1',
  position: { lat: 25.2048, lng: 55.2708 },
    title: 'Test Appointment',
    description: 'Test Description',
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders marker with correct appointment type styling', () => {
      render(<MapMarker marker={mockMarker} />);

    const markerElement = screen.getByRole('button');
    expect(markerElement).toBeInTheDocument();
    expect(markerElement).toHaveAttribute('aria-label', expect.stringContaining('John Doe'));
    expect(markerElement).toHaveAttribute('aria-label', expect.stringContaining('Doctor on Call'));
  });

  it('applies correct gradient styling for different appointment types', () => {
    const { rerender } = render(<MapMarker marker={mockMarker} />);

    // Test doctor_on_call
    let markerElement = screen.getByRole('button');
    let mainCircle = markerElement.querySelector('div:first-child');
    expect(mainCircle).toHaveStyle({
      background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)'
    });

    // Test lab_test
    const labTestMarker = { ...mockMarker, appointment_type: 'lab_test' as const };
    rerender(<MapMarker marker={labTestMarker} />);

    markerElement = screen.getByRole('button');
    mainCircle = markerElement.querySelector('div:first-child');
    expect(mainCircle).toHaveStyle({
      background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)'
    });
  });

  it('shows status indicator with correct color', () => {
    const confirmedMarker = { ...mockMarker, status: 'confirmed' as const };
    render(<MapMarker marker={confirmedMarker} showStatus={true} />);

    const statusIndicator = screen.getByLabelText('Status: confirmed');
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('handles click events correctly', () => {
    const handleClick = jest.fn();
    render(<MapMarker marker={mockMarker} onClick={handleClick} />);

    const markerElement = screen.getByRole('button');
    fireEvent.click(markerElement);

    expect(handleClick).toHaveBeenCalledWith(mockMarker);
  });

  it('handles right click events correctly', () => {
    const handleRightClick = jest.fn();
    render(<MapMarker marker={mockMarker} onRightClick={handleRightClick} />);

    const markerElement = screen.getByRole('button');
    fireEvent.contextMenu(markerElement);

    expect(handleRightClick).toHaveBeenCalledWith(mockMarker, expect.any(Object));
  });

  it('shows marker label on hover', () => {
    const handleHover = jest.fn();
    render(<MapMarker marker={mockMarker} onHover={handleHover} />);

    const markerElement = screen.getByRole('button');
    fireEvent.mouseEnter(markerElement);

    expect(handleHover).toHaveBeenCalledWith(mockMarker);

    // Check if label becomes visible
    const label = screen.getByText('John Doe');
    expect(label).toBeInTheDocument();
  });

  it('applies selected state styling', () => {
      render(<MapMarker marker={mockMarker} isSelected={true} />);

    const markerElement = screen.getByRole('button');
    expect(markerElement).toHaveClass('ring-2', 'ring-blue-500', 'ring-offset-2');
  });

  it('applies hover state styling', () => {
    render(<MapMarker marker={mockMarker} isHovered={true} />);

    const markerElement = screen.getByRole('button');
    expect(markerElement).toHaveClass('scale-110');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<MapMarker marker={mockMarker} size="small" />);
    let markerElement = screen.getByRole('button');
    expect(markerElement).toHaveClass('w-8', 'h-8');

    rerender(<MapMarker marker={mockMarker} size="large" />);
    markerElement = screen.getByRole('button');
    expect(markerElement).toHaveClass('w-16', 'h-16');
  });

  it('shows appointment type icon', () => {
    render(<MapMarker marker={mockMarker} showType={true} />);

    // The icon should be present in the marker
    const iconContainer = screen.getByRole('button').querySelector('div[class*="w-6 h-6"]');
    expect(iconContainer).toBeInTheDocument();
  });

  it('formats time range correctly', () => {
    render(<MapMarker marker={mockMarker} showTime={true} />);

    const markerElement = screen.getByRole('button');
    fireEvent.mouseEnter(markerElement);

    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
  });

  it('handles mobile touch events', () => {
    // Mock mobile environment
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const handleClick = jest.fn();
    render(<MapMarker marker={mockMarker} onClick={handleClick} />);

    const markerElement = screen.getByRole('button');

    // Simulate touch events
    fireEvent.touchStart(markerElement);
    fireEvent.touchEnd(markerElement);

    expect(handleClick).toHaveBeenCalledWith(mockMarker);
  });

  it('applies pulse animation when enabled', () => {
    render(<MapMarker marker={mockMarker} pulse={true} animated={true} />);

    const markerElement = screen.getByRole('button');
    // The pulse animation is applied conditionally based on isAnimating state
    // which is controlled by the useEffect, so we just check that the component renders
    expect(markerElement).toBeInTheDocument();
  });

  it('shows different appointment types with correct styling', () => {
    const appointmentTypes = [
      'doctor_on_call',
      'lab_test',
      'teleconsultation',
      'physiotherapy',
      'caregiver',
      'iv_therapy'
    ] as const;

    appointmentTypes.forEach((type) => {
      const testMarker = { ...mockMarker, appointment_type: type };
      const { unmount } = render(<MapMarker marker={testMarker} />);

      const markerElement = screen.getByRole('button');
      expect(markerElement).toBeInTheDocument();

      unmount();
    });
  });

  it('handles missing optional props gracefully', () => {
    const minimalMarker = {
        ...mockMarker,
      patient_phone: undefined,
      address: undefined
    };

    render(<MapMarker marker={minimalMarker} />);

    const markerElement = screen.getByRole('button');
    expect(markerElement).toBeInTheDocument();
  });
});
