'use client';

import { useOfficeSettings } from '@/hooks/useOfficeSettings';
import type { TransportationSegmentLocation } from '@/types/transportationSegment';
import { Building2, Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OfficeLocationSelectorProps {
  onLocationSelect: (location: TransportationSegmentLocation) => void;
  disabled?: boolean;
  className?: string;
}

export function OfficeLocationSelector({
  onLocationSelect,
  disabled = false,
  className = '',
}: OfficeLocationSelectorProps) {
  const { officeSettings, isLoading, error } = useOfficeSettings();
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    if (officeSettings && !isSelected) {
      const location: TransportationSegmentLocation = {
        lat: officeSettings.coordinates.lat,
        lng: officeSettings.coordinates.lng,
        address: officeSettings.address,
        formatted_address: officeSettings.address,
        city: officeSettings.address.split(',')[1]?.trim() || '',
        area: officeSettings.address.split(',')[0]?.trim() || '',
        building_name: officeSettings.name,
        place_id: 'office_location', // Special identifier for office
      };

      onLocationSelect(location);
      setIsSelected(true);
    }
  }, [officeSettings, onLocationSelect, isSelected]);

  if (isLoading) {
    return (
      <div className={`p-4 border border-gray-200 rounded-lg bg-gray-50 ${className}`}>
        <div className="flex items-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <div>
            <div className="text-sm font-medium text-gray-900">Loading office location...</div>
            <div className="text-xs text-gray-600">Fetching office settings</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <div className="flex items-center space-x-3">
          <Building2 className="w-5 h-5 text-red-600" />
          <div>
            <div className="text-sm font-medium text-red-900">Error loading office location</div>
            <div className="text-xs text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!officeSettings) {
    return (
      <div className={`p-4 border border-yellow-200 rounded-lg bg-yellow-50 ${className}`}>
        <div className="flex items-center space-x-3">
          <Building2 className="w-5 h-5 text-yellow-600" />
          <div>
            <div className="text-sm font-medium text-yellow-900">Office location not configured</div>
            <div className="text-xs text-yellow-700">Please configure office settings first</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border border-blue-200 rounded-lg bg-blue-50 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-blue-900">{officeSettings.name}</h4>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Office Location
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-blue-900 font-medium">Address</div>
                <div className="text-sm text-blue-800">{officeSettings.address}</div>
              </div>
            </div>

            {officeSettings.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div>
                  <div className="text-sm text-blue-900 font-medium">Phone</div>
                  <div className="text-sm text-blue-800">{officeSettings.phone}</div>
                </div>
              </div>
            )}

            {officeSettings.email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div>
                  <div className="text-sm text-blue-900 font-medium">Email</div>
                  <div className="text-sm text-blue-800">{officeSettings.email}</div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-xs font-medium text-blue-800">
                Office location automatically selected
              </span>
            </div>
            <div className="text-xs text-blue-700 mt-1">
              Coordinates: {officeSettings.coordinates.lat.toFixed(6)}, {officeSettings.coordinates.lng.toFixed(6)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
