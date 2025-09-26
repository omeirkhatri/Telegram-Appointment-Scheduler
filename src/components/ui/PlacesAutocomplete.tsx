'use client';

import { isFeatureEnabled } from '@/lib/featureFlags';
import { useEffect, useRef, useState } from 'react';

export interface PlaceResult {
  place_id: string;
  formatted_address: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Search for a location...',
  className = '',
  disabled = false,
  error = '',
}: PlacesAutocompleteProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Places API
  useEffect(() => {
    if (!isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED')) {
      return;
    }

    const initializePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();

        // Create a dummy div for PlacesService (required by Google Maps API)
        const dummyDiv = document.createElement('div');
        placesService.current = new window.google.maps.places.PlacesService(dummyDiv);

        setIsLoaded(true);
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initializePlaces();
    } else {
      // Wait for Google Maps to load
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkGoogleMaps);
          initializePlaces();
        }
      }, 100);

      // Cleanup after 10 seconds
      setTimeout(() => clearInterval(checkGoogleMaps), 10000);
    }
  }, []);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    if (!isLoaded || !autocompleteService.current) {
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the search
    timeoutRef.current = setTimeout(() => {
      if (inputValue.length > 2) {
        setIsLoading(true);

        autocompleteService.current!.getPlacePredictions(
          {
            input: inputValue,
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'ae' }, // Restrict to UAE
          },
          (predictions, status) => {
            setIsLoading(false);

            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              setPredictions(predictions);
              setShowPredictions(true);
              setSelectedIndex(-1);
            } else {
              setPredictions([]);
              setShowPredictions(false);
            }
          }
        );
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    }, 300);
  };

  // Handle place selection
  const handlePlaceSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) return;

    setIsLoading(true);
    setShowPredictions(false);

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['place_id', 'formatted_address', 'name', 'geometry'],
      },
      (place, status) => {
        setIsLoading(false);

        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const placeResult: PlaceResult = {
            place_id: place.place_id!,
            formatted_address: place.formatted_address!,
            name: place.name || place.formatted_address!,
            geometry: {
              location: {
                lat: place.geometry!.location!.lat(),
                lng: place.geometry!.location!.lng(),
              },
            },
          };

          onChange(placeResult.formatted_address);
          onPlaceSelect(placeResult);
        }
      }
    );
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPredictions || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handlePlaceSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowPredictions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (predictions.length > 0) {
      setShowPredictions(true);
    }
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay hiding predictions to allow for clicks
    setTimeout(() => {
      setShowPredictions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!isFeatureEnabled('TRANSPORTATION_SEGMENTS_ENABLED')) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
      />
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handlePlaceSelect(prediction)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="font-medium text-gray-900">{prediction.structured_formatting.main_text}</div>
              <div className="text-sm text-gray-600">{prediction.structured_formatting.secondary_text}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
