'use client';

import type { PickupLocationType } from '@/types/transportationSegment';
import { getPickupLocationTypeLabel } from '@/types/transportationSegment';
import { Building2, MapPin, Navigation, User } from 'lucide-react';
import { useState } from 'react';

interface PickupLocationTypeSelectorProps {
  value: PickupLocationType;
  onChange: (type: PickupLocationType) => void;
  disabled?: boolean;
  className?: string;
}

const PICKUP_LOCATION_TYPES: Array<{
  value: PickupLocationType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    value: 'office',
    label: 'From Office',
    description: 'Driver starts from the main office location. Use for first appointments of the day or when driver begins their shift.',
    icon: Building2,
    color: 'text-blue-600',
  },
  {
    value: 'previous_appointment',
    label: 'From Previous Appointment',
    description: 'Driver continues from a previous appointment\'s patient location. Reduces travel time and improves efficiency.',
    icon: User,
    color: 'text-green-600',
  },
  {
    value: 'metro_station',
    label: 'From Metro Station',
    description: 'Driver picks up from a designated metro/subway station. Use when patients use public transportation.',
    icon: Navigation,
    color: 'text-purple-600',
  },
  {
    value: 'custom',
    label: 'From Custom Location',
    description: 'Driver picks up from any custom address or location. Use for patient homes, landmarks, or special locations.',
    icon: MapPin,
    color: 'text-orange-600',
  },
];

export function PickupLocationTypeSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: PickupLocationTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<PickupLocationType | null>(null);

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Pickup Location Type *
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PICKUP_LOCATION_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;
          const isHovered = hoveredType === type.value;

          return (
            <label
              key={type.value}
              className={`
                relative flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : isHovered
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
              `}
              onMouseEnter={() => !disabled && setHoveredType(type.value)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <input
                type="radio"
                name="pickup_location_type"
                value={type.value}
                checked={isSelected}
                onChange={(e) => !disabled && onChange(e.target.value as PickupLocationType)}
                disabled={disabled}
                className="sr-only"
              />

              <div className="flex-shrink-0">
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                  ${isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                  }
                `}>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Icon className={`w-4 h-4 ${type.color}`} />
                  <span className="text-sm font-medium text-gray-900">
                    {type.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {type.description}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                </div>
              )}
            </label>
          );
        })}
      </div>

      {value && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-sm font-medium text-blue-800">
              Selected: {getPickupLocationTypeLabel(value)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
