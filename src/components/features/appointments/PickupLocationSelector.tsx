'use client';

import type { Appointment, TransportationSegmentLocation } from '@/types';
import type { PickupLocationType } from '@/types/transportationSegment';
import { useEffect, useState } from 'react';
import { CustomLocationSelector } from './CustomLocationSelector';
import { MetroStationSelector } from './MetroStationSelector';
import { OfficeLocationSelector } from './OfficeLocationSelector';
import { PickupLocationTypeSelector } from './PickupLocationTypeSelector';
import { PreviousAppointmentSelector } from './PreviousAppointmentSelector';

interface PickupLocationSelectorProps {
  pickupLocationType: PickupLocationType;
  pickupLocationReference?: string | null;
  pickupLocation?: TransportationSegmentLocation | null;
  onTypeChange: (type: PickupLocationType) => void;
  onLocationChange: (location: TransportationSegmentLocation | null) => void;
  onReferenceChange: (reference: string | null) => void;
  appointments?: Appointment[];
  currentAppointmentId?: string;
  disabled?: boolean;
  className?: string;
}

export function PickupLocationSelector({
  pickupLocationType,
  pickupLocationReference,
  pickupLocation,
  onTypeChange,
  onLocationChange,
  onReferenceChange,
  appointments = [],
  currentAppointmentId,
  disabled = false,
  className = '',
}: PickupLocationSelectorProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with default type if not set
  useEffect(() => {
    if (!isInitialized && !pickupLocationType) {
      onTypeChange('office'); // Default to office
      setIsInitialized(true);
    }
  }, [isInitialized, pickupLocationType, onTypeChange]);

  const handleTypeChange = (type: PickupLocationType) => {
    onTypeChange(type);

    // Clear location and reference when type changes
    onLocationChange(null);
    onReferenceChange(null);
  };

  const handleOfficeLocationSelect = (location: TransportationSegmentLocation) => {
    onLocationChange(location);
    onReferenceChange('office_location');
  };

  const handlePreviousAppointmentSelect = (appointment: Appointment, location: TransportationSegmentLocation) => {
    onLocationChange(location);
    onReferenceChange(appointment.id);
  };

  const handleMetroStationSelect = (station: any, location: TransportationSegmentLocation) => {
    onLocationChange(location);
    onReferenceChange(station.id);
  };

  const handleCustomLocationSelect = (location: TransportationSegmentLocation) => {
    onLocationChange(location);
    onReferenceChange(null); // Custom locations don't need a reference
  };

  const renderLocationSelector = () => {
    switch (pickupLocationType) {
      case 'office':
        return (
          <OfficeLocationSelector
            onLocationSelect={handleOfficeLocationSelect}
            disabled={disabled}
            className="mt-4"
          />
        );

      case 'previous_appointment':
        return (
          <PreviousAppointmentSelector
            appointments={appointments}
            onAppointmentSelect={handlePreviousAppointmentSelect}
            currentAppointmentId={currentAppointmentId}
            disabled={disabled}
            className="mt-4"
          />
        );

      case 'metro_station':
        return (
          <MetroStationSelector
            onStationSelect={handleMetroStationSelect}
            disabled={disabled}
            className="mt-4"
          />
        );

      case 'custom':
        return (
          <CustomLocationSelector
            onLocationSelect={handleCustomLocationSelect}
            disabled={disabled}
            className="mt-4"
            placeholder="Search for custom pickup location..."
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Pickup Location Type Selector */}
      <PickupLocationTypeSelector
        value={pickupLocationType}
        onChange={handleTypeChange}
        disabled={disabled}
      />

      {/* Conditional Location Selector */}
      {renderLocationSelector()}

      {/* Current Selection Summary */}
      {pickupLocation && (
        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-gray-900">
              Pickup location configured
            </span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {pickupLocation.formatted_address || pickupLocation.address}
          </div>
          {pickupLocationReference && (
            <div className="text-xs text-gray-500 mt-1">
              Reference: {pickupLocationReference}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
