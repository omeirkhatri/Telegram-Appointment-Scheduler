// @ts-nocheck
import type { MapMarker as MapMarkerType } from '@/types/map';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MapMarker } from '../MapMarker';

// Mock marker data with detailed information
const mockMarker: MapMarkerType = {
  id: '1',
  position: { lat: 25.2048, lng: 55.2708 },
  title: 'Dr. Ahmed - Doctor on Call',
  description: 'Regular checkup',
  appointment_id: 'apt-1',
  patient_id: 'patient-1',
  appointment_type: 'doctor_on_call',
  appointment_date: '2024-12-20',
  start_time: '10:00',
  duration_minutes: 60,
  status: 'scheduled',
  patient_name: 'Ahmed Al-Rashid',
  patient_phone: '+971501234567',
  address: 'Villa 123, Al Wasl Road, Jumeirah, Dubai',
  flat_villa_no: 'Villa 123',
  building_street: 'Al Wasl Road',
  area: 'Jumeirah',
  city: 'Dubai',
  staff_name: 'Dr. Mohammed Al-Ahmad',
  staff_id: 'staff-1',
  notes: 'Patient has diabetes and requires regular monitoring',
  transportation_type: 'driver',
  driver_id: 'driver-1',
  pickup_instructions: 'Ring doorbell twice'
};

describe('MapMarker Hover Tooltip', () => {
  it('should show detailed tooltip on hover when showDetailedTooltip is true', () => {
    const { container } = render(
      <MapMarker
        marker={mockMarker}
        isHovered={true}
        showDetailedTooltip={true}
      />
    );

    // Check if detailed tooltip is visible
    expect(screen.getByText('Ahmed Al-Rashid')).toBeInTheDocument();
    expect(screen.getByText('Doctor on Call')).toBeInTheDocument();
    expect(screen.getByText('Time:')).toBeInTheDocument();
    expect(screen.getByText('Address:')).toBeInTheDocument();
    expect(screen.getByText('Staff:')).toBeInTheDocument();
    expect(screen.getByText('Dr. Mohammed Al-Ahmad')).toBeInTheDocument();
  });

  it('should show simple tooltip when showDetailedTooltip is false', () => {
    const { container } = render(
      <MapMarker
        marker={mockMarker}
        isHovered={true}
        showDetailedTooltip={false}
      />
    );

    // Check if simple tooltip is visible
    expect(screen.getByText('Ahmed Al-Rashid')).toBeInTheDocument();
    expect(screen.getByText('Doctor on Call')).toBeInTheDocument();

    // Detailed tooltip elements should not be present
    expect(screen.queryByText('Time:')).not.toBeInTheDocument();
    expect(screen.queryByText('Address:')).not.toBeInTheDocument();
    expect(screen.queryByText('Staff:')).not.toBeInTheDocument();
  });

  it('should format address correctly from individual components', () => {
    const { container } = render(
      <MapMarker
        marker={mockMarker}
        isHovered={true}
        showDetailedTooltip={true}
      />
    );

    // Check if address is formatted correctly
    expect(screen.getByText('Villa 123, Al Wasl Road, Jumeirah, Dubai')).toBeInTheDocument();
  });

  it('should show staff information when available', () => {
    const { container } = render(
      <MapMarker
        marker={mockMarker}
        isHovered={true}
        showDetailedTooltip={true}
      />
    );

    expect(screen.getByText('Dr. Mohammed Al-Ahmad')).toBeInTheDocument();
  });

  it('should show "Staff not assigned" when staff_name is not available', () => {
    const markerWithoutStaff = {
      ...mockMarker,
      staff_name: undefined
    };

    const { container } = render(
      <MapMarker
        marker={markerWithoutStaff}
        isHovered={true}
        showDetailedTooltip={true}
      />
    );

    expect(screen.getByText('Staff not assigned')).toBeInTheDocument();
  });

  it('should show appointment notes when available', () => {
    const { container } = render(
      <MapMarker
        marker={mockMarker}
        isHovered={true}
        showDetailedTooltip={true}
      />
    );

    expect(screen.getByText('Patient has diabetes and requires regular monitoring')).toBeInTheDocument();
  });

  it('should truncate long notes', () => {
    const markerWithLongNotes = {
      ...mockMarker,
      notes: 'This is a very long note that should be truncated when it exceeds 50 characters to keep the tooltip clean and readable'
    };

    const { container } = render(
      <MapMarker
        marker={markerWithLongNotes}
        isHovered={true}
        showDetailedTooltip={true}
      />
    );

    // Should show truncated notes
    expect(screen.getByText('This is a very long note that should be truncated...')).toBeInTheDocument();
  });

  it('should not show tooltip when not hovered', () => {
    const { container } = render(
      <MapMarker
        marker={mockMarker}
        isHovered={false}
        showDetailedTooltip={true}
      />
    );

    // Tooltip should not be visible
    expect(screen.queryByText('Time:')).not.toBeInTheDocument();
    expect(screen.queryByText('Address:')).not.toBeInTheDocument();
    expect(screen.queryByText('Staff:')).not.toBeInTheDocument();
  });

  it('should show tooltip when selected even if not hovered', () => {
    const { container } = render(
      <MapMarker
        marker={mockMarker}
        isHovered={false}
        isSelected={true}
        showDetailedTooltip={true}
      />
    );

    // Tooltip should be visible when selected
    expect(screen.getByText('Time:')).toBeInTheDocument();
    expect(screen.getByText('Address:')).toBeInTheDocument();
    expect(screen.getByText('Staff:')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    const { container } = render(
      <MapMarker
        marker={mockMarker}
        isHovered={true}
        showDetailedTooltip={true}
      />
    );

    const markerElement = container.querySelector('[role="button"]');
    expect(markerElement).toHaveAttribute('aria-label');
    expect(markerElement).toHaveAttribute('tabIndex', '0');
  });
});
