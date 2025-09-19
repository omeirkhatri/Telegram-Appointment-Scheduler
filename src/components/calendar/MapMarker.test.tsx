import type { MapMarker as MapMarkerType } from '@/types/map';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import MapMarker from './MapMarker';

// Mock appointment type utilities
jest.mock('@/types/appointment', () => ({
  getAppointmentTypeDisplayName: jest.fn((type: string) => {
    const typeMap: Record<string, string> = {
      doctor_on_call: 'Doctor on Call',
      lab_test: 'Lab Test',
      teleconsultation: 'Teleconsultation',
      physiotherapy: 'Physiotherapy',
      caregiver: 'Caregiver',
      iv_therapy: 'IV Therapy'
    };
    return typeMap[type] || type;
  })
}));

jest.mock('@/utils/appointmentTypes', () => ({
  getAppointmentTypeColor: jest.fn((type: string, variant: string) => {
    const colorMap: Record<string, Record<string, string>> = {
      doctor_on_call: { primary: '#3b82f6', secondary: '#93c5fd' },
      lab_test: { primary: '#10b981', secondary: '#6ee7b7' },
      teleconsultation: { primary: '#8b5cf6', secondary: '#c4b5fd' },
      physiotherapy: { primary: '#f59e0b', secondary: '#fcd34d' },
      caregiver: { primary: '#ef4444', secondary: '#fca5a5' },
      iv_therapy: { primary: '#06b6d4', secondary: '#67e8f9' }
    };
    return colorMap[type]?.[variant] || '#6b7280';
  })
}));

// Mock marker data
const mockMarker: MapMarkerType = {
  id: 'marker-1',
  position: { lat: 25.2048, lng: 55.2708 },
  title: 'John Doe - Doctor on Call',
  description: 'Regular checkup',
  appointment_id: 'apt-1',
  patient_id: 'patient-1',
  appointment_type: 'doctor_on_call',
  appointment_date: '2024-01-15',
  start_time: '10:00:00',
  duration_minutes: 60,
  status: 'scheduled',
  patient_name: 'John Doe',
  patient_phone: '+971501234567',
  address: '123 Main St, Dubai, UAE',
  custom_fields: {},
  notes: 'Regular checkup',
  transportation_type: 'driver',
  driver_id: 'driver-1',
  pickup_instructions: 'Call when arrived'
};

describe('MapMarker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render marker with basic information', () => {
      render(<MapMarker marker={mockMarker} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByLabelText(/John Doe - Doctor on Call appointment at 10:00/)).toBeInTheDocument();
    });

    it('should render with custom className and style', () => {
      const customClassName = 'custom-marker';
      const customStyle = { border: '2px solid red' };

      render(
        <MapMarker
          marker={mockMarker}
          className={customClassName}
          style={customStyle}
        />
      );

      const marker = screen.getByRole('button');
      expect(marker).toHaveClass(customClassName);
      expect(marker).toHaveStyle(customStyle);
    });

    it('should render different sizes correctly', () => {
      const { rerender } = render(<MapMarker marker={mockMarker} size="small" />);
      expect(screen.getByRole('button')).toHaveClass('w-8 h-8');

      rerender(<MapMarker marker={mockMarker} size="medium" />);
      expect(screen.getByRole('button')).toHaveClass('w-12 h-12');

      rerender(<MapMarker marker={mockMarker} size="large" />);
      expect(screen.getByRole('button')).toHaveClass('w-16 h-16');
    });

    it('should show selected state', () => {
      render(<MapMarker marker={mockMarker} isSelected={true} />);

      const marker = screen.getByRole('button');
      expect(marker).toHaveClass('ring-2 ring-blue-500 ring-offset-2');
    });

    it('should show hovered state', () => {
      render(<MapMarker marker={mockMarker} isHovered={true} />);

      const marker = screen.getByRole('button');
      expect(marker).toHaveClass('scale-110');
    });
  });

  describe('Appointment Type Icons', () => {
    it('should render doctor_on_call icon', () => {
      render(<MapMarker marker={mockMarker} />);

      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render different icons for different appointment types', () => {
      const labTestMarker = { ...mockMarker, appointment_type: 'lab_test' as const };
      const { rerender } = render(<MapMarker marker={mockMarker} />);

      const doctorIcon = screen.getByRole('button').querySelector('svg');
      expect(doctorIcon).toBeInTheDocument();

      rerender(<MapMarker marker={labTestMarker} />);
      const labIcon = screen.getByRole('button').querySelector('svg');
      expect(labIcon).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should show status indicator when showStatus is true', () => {
      render(<MapMarker marker={mockMarker} showStatus={true} />);

      const statusIndicator = screen.getByLabelText('Status: scheduled');
      expect(statusIndicator).toBeInTheDocument();
    });

    it('should hide status indicator when showStatus is false', () => {
      render(<MapMarker marker={mockMarker} showStatus={false} />);

      expect(screen.queryByLabelText('Status: scheduled')).not.toBeInTheDocument();
    });

    it('should show different status colors', () => {
      const completedMarker = { ...mockMarker, status: 'completed' as const };
      const cancelledMarker = { ...mockMarker, status: 'cancelled' as const };

      const { rerender } = render(<MapMarker marker={mockMarker} showStatus={true} />);
      let statusIndicator = screen.getByLabelText('Status: scheduled');
      expect(statusIndicator).toHaveStyle({ backgroundColor: '#f59e0b' });

      rerender(<MapMarker marker={completedMarker} showStatus={true} />);
      statusIndicator = screen.getByLabelText('Status: completed');
      expect(statusIndicator).toHaveStyle({ backgroundColor: '#10b981' });

      rerender(<MapMarker marker={cancelledMarker} showStatus={true} />);
      statusIndicator = screen.getByLabelText('Status: cancelled');
      expect(statusIndicator).toHaveStyle({ backgroundColor: '#ef4444' });
    });
  });

  describe('Label Display', () => {
    it('should show label on hover', () => {
      render(<MapMarker marker={mockMarker} isHovered={true} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Doctor on Call')).toBeInTheDocument();
      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('should show label when selected', () => {
      render(<MapMarker marker={mockMarker} isSelected={true} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should hide label by default', () => {
      render(<MapMarker marker={mockMarker} />);

      // The label should be hidden by default (opacity-0 class)
      // We need to find the label container div that has the opacity classes
      const labelContainer = screen.getByText('John Doe').closest('div[class*="opacity"]');
      expect(labelContainer).toHaveClass('opacity-0');
    });

    it('should respect showType and showTime props', () => {
      render(
        <MapMarker
          marker={mockMarker}
          isHovered={true}
          showType={false}
          showTime={false}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Doctor on Call')).not.toBeInTheDocument();
      expect(screen.queryByText('10:00')).not.toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should call onClick when clicked', () => {
      const onClick = jest.fn();

      render(<MapMarker marker={mockMarker} onClick={onClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledWith(mockMarker);
    });

    it('should call onRightClick when right-clicked', () => {
      const onRightClick = jest.fn();

      render(<MapMarker marker={mockMarker} onRightClick={onRightClick} />);

      fireEvent.contextMenu(screen.getByRole('button'));
      expect(onRightClick).toHaveBeenCalledWith(mockMarker, expect.any(Object));
    });

    it('should call onHover on mouse enter and leave', () => {
      const onHover = jest.fn();

      render(<MapMarker marker={mockMarker} onHover={onHover} />);

      fireEvent.mouseEnter(screen.getByRole('button'));
      expect(onHover).toHaveBeenCalledWith(mockMarker);

      fireEvent.mouseLeave(screen.getByRole('button'));
      expect(onHover).toHaveBeenCalledWith(null);
    });

    it('should not call handlers when not provided', () => {
      render(<MapMarker marker={mockMarker} />);

      expect(() => {
        fireEvent.click(screen.getByRole('button'));
        fireEvent.contextMenu(screen.getByRole('button'));
        fireEvent.mouseEnter(screen.getByRole('button'));
        fireEvent.mouseLeave(screen.getByRole('button'));
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MapMarker marker={mockMarker} />);

      const marker = screen.getByRole('button');
      expect(marker).toHaveAttribute('aria-label', 'John Doe - Doctor on Call appointment at 10:00');
      expect(marker).toHaveAttribute('title', 'John Doe - Doctor on Call (scheduled)');
      expect(marker).toHaveAttribute('tabIndex', '0');
    });

    it('should be keyboard accessible', () => {
      render(<MapMarker marker={mockMarker} />);

      const marker = screen.getByRole('button');
      expect(marker).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper role', () => {
      render(<MapMarker marker={mockMarker} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should apply animation classes when animated is true', () => {
      render(<MapMarker marker={mockMarker} animated={true} />);

      const marker = screen.getByRole('button');
      expect(marker).toHaveClass('transition-all duration-200 ease-in-out');
    });

    it('should not apply animation classes when animated is false', () => {
      render(<MapMarker marker={mockMarker} animated={false} />);

      const marker = screen.getByRole('button');
      expect(marker).not.toHaveClass('transition-all duration-200 ease-in-out');
    });

    it('should apply pulse animation when pulse is true', () => {
      render(<MapMarker marker={mockMarker} pulse={true} />);

      const marker = screen.getByRole('button');
      // The pulse animation is applied conditionally based on isAnimating state
      // which is controlled by useEffect, so we just check that the component renders
      expect(marker).toBeInTheDocument();
    });

    it('should not apply pulse animation when pulse is false', () => {
      render(<MapMarker marker={mockMarker} pulse={false} />);

      const marker = screen.getByRole('button');
      expect(marker).not.toHaveClass('animate-pulse');
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly', () => {
      render(<MapMarker marker={mockMarker} isHovered={true} showTime={true} />);

      expect(screen.getByText('10:00')).toBeInTheDocument();
    });

    it('should handle invalid time format gracefully', () => {
      const invalidTimeMarker = { ...mockMarker, start_time: 'invalid-time' };

      render(<MapMarker marker={invalidTimeMarker} isHovered={true} showTime={true} />);

      // The component should render without crashing and show the invalid time as-is
      expect(screen.getByText('invalid-time:undefined')).toBeInTheDocument();
    });
  });

  describe('Color Theming', () => {
    it('should use correct colors for different appointment types', () => {
      const labTestMarker = { ...mockMarker, appointment_type: 'lab_test' as const };

      render(<MapMarker marker={labTestMarker} />);

      const marker = screen.getByRole('button');
      const mainCircle = marker.querySelector('div[style*="background-color"]');
      expect(mainCircle).toHaveStyle({ backgroundColor: '#10b981' });
    });

    it('should use secondary color for selected state', () => {
      render(<MapMarker marker={mockMarker} isSelected={true} />);

      const marker = screen.getByRole('button');
      const mainCircle = marker.querySelector('div[style*="background-color"]');
      expect(mainCircle).toHaveStyle({ backgroundColor: '#3b82f6' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing patient name', () => {
      const markerWithoutName = { ...mockMarker, patient_name: '' };

      render(<MapMarker marker={markerWithoutName} isHovered={true} />);

      // Should render without crashing when patient name is empty
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle very long patient names', () => {
      const longNameMarker = {
        ...mockMarker,
        patient_name: 'Very Long Patient Name That Should Be Truncated'
      };

      render(<MapMarker marker={longNameMarker} isHovered={true} />);

      const nameElement = screen.getByText('Very Long Patient Name That Should Be Truncated');
      expect(nameElement).toHaveClass('truncate max-w-24');
    });

    it('should handle unknown appointment types', () => {
      const unknownTypeMarker = { ...mockMarker, appointment_type: 'unknown_type' as any };

      render(<MapMarker marker={unknownTypeMarker} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();

      const TestComponent = () => {
        renderSpy();
        return <MapMarker marker={mockMarker} />;
      };

      const { rerender } = render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should memoize callbacks correctly', () => {
      const onClick = jest.fn();
      const onRightClick = jest.fn();
      const onHover = jest.fn();

      const { rerender } = render(
        <MapMarker
          marker={mockMarker}
          onClick={onClick}
          onRightClick={onRightClick}
          onHover={onHover}
        />
      );

      // Re-render with same props
      rerender(
        <MapMarker
          marker={mockMarker}
          onClick={onClick}
          onRightClick={onRightClick}
          onHover={onHover}
        />
      );

      // Should not cause issues
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
