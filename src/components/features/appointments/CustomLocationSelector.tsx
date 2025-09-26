'use client';

import { PlacesAutocomplete, type PlaceResult } from '@/components/ui/PlacesAutocomplete';
import type { TransportationSegmentLocation } from '@/types/transportationSegment';
import { AlertCircle, MapPin, Search } from 'lucide-react';
import { useState } from 'react';

interface CustomLocationSelectorProps {
  onLocationSelect: (location: TransportationSegmentLocation) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function CustomLocationSelector({
  onLocationSelect,
  disabled = false,
  className = '',
  placeholder = 'Search for pickup location...',
}: CustomLocationSelectorProps) {
  const [searchValue, setSearchValue] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<TransportationSegmentLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceSelect = (place: PlaceResult) => {
    try {
      const location: TransportationSegmentLocation = {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        address: place.formatted_address,
        formatted_address: place.formatted_address,
        city: place.address_components?.find(comp =>
          comp.types.includes('locality') || comp.types.includes('administrative_area_level_1')
        )?.long_name || '',
        area: place.address_components?.find(comp =>
          comp.types.includes('sublocality') || comp.types.includes('neighborhood')
        )?.long_name || '',
        building_name: place.name,
        place_id: place.place_id,
        landmark: place.name,
      };

      setSelectedLocation(location);
      setSearchValue(place.formatted_address);
      setError(null);
      onLocationSelect(location);
    } catch (err) {
      setError('Failed to process selected location');
      console.error('Error processing place selection:', err);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (value === '') {
      setSelectedLocation(null);
      setError(null);
    }
  };

  const handleSearchStart = () => {
    setIsSearching(true);
    setError(null);
  };

  const handleSearchEnd = () => {
    setIsSearching(false);
  };

  const clearSelection = () => {
    setSearchValue('');
    setSelectedLocation(null);
    setError(null);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Pickup Location
        </label>
        <div className="relative">
          <PlacesAutocomplete
            value={searchValue}
            onChange={handleSearchChange}
            onPlaceSelect={handlePlaceSelect}
            onSearchStart={handleSearchStart}
            onSearchEnd={handleSearchEnd}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {selectedLocation && (
        <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-sm font-medium text-orange-900">
                  Custom Location Selected
                </h4>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Custom
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-orange-900 font-medium">Address</div>
                    <div className="text-sm text-orange-800">{selectedLocation.formatted_address}</div>
                  </div>
                </div>

                {selectedLocation.building_name && (
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-orange-900 font-medium">Place Name</div>
                      <div className="text-sm text-orange-800">{selectedLocation.building_name}</div>
                    </div>
                  </div>
                )}

                {selectedLocation.city && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-orange-900 font-medium">City</div>
                      <div className="text-sm text-orange-800">{selectedLocation.city}</div>
                    </div>
                  </div>
                )}

                {selectedLocation.area && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-orange-900 font-medium">Area</div>
                      <div className="text-sm text-orange-800">{selectedLocation.area}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 p-2 bg-orange-100 rounded border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-xs font-medium text-orange-800">
                      Custom pickup location selected
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs text-orange-600 hover:text-orange-800 underline"
                  >
                    Change location
                  </button>
                </div>
                <div className="text-xs text-orange-700 mt-1">
                  Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
                {selectedLocation.place_id && (
                  <div className="text-xs text-orange-700">
                    Place ID: {selectedLocation.place_id}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedLocation && searchValue && (
        <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              Select a location from the search results above
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
