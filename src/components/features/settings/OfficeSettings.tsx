'use client';

import { Eye, EyeOff, MapPin, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OfficeLocation {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  phone?: string;
  email?: string;
  icon?: string;
  color?: string;
}

interface OfficeSettingsProps {
  className?: string;
}

export function OfficeSettings({ className = '' }: OfficeSettingsProps) {
  const [officeData, setOfficeData] = useState<OfficeLocation>({
    name: 'Best DOC Office',
    coordinates: {
      lat: 25.2048,
      lng: 55.2708
    },
    address: 'Office Address, Dubai, UAE',
    phone: '+971 XX XXX XXXX',
    email: 'office@bestdoc.ae',
    icon: '🏢',
    color: '#2563eb'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load office settings on component mount
  useEffect(() => {
    loadOfficeSettings();
  }, []);

  const loadOfficeSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/office');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setOfficeData(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading office settings:', error);
      setMessage({ type: 'error', text: 'Failed to load office settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveOfficeSettings = async () => {
    try {
      setIsSaving(true);
      setMessage(null);

      const response = await fetch('/api/settings/office', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(officeData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMessage({ type: 'success', text: 'Office settings saved successfully!' });
          // Reload the page to update the map
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setMessage({ type: 'error', text: result.message || 'Failed to save office settings' });
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to save office settings' });
      }
    } catch (error) {
      console.error('Error saving office settings:', error);
      setMessage({ type: 'error', text: 'Failed to save office settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof OfficeLocation, value: any) => {
    setOfficeData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCoordinatesChange = (value: string) => {
    // Parse coordinates in format: "lat, lng" or "lat lng"
    const coords = value.split(/[,\s]+/).filter(coord => coord.trim());

    if (coords.length >= 2) {
      const parseCoordinate = (coord: string) => {
        // Check if the input is in DMS format (e.g., "25°09'20.3"N")
        const dmsMatch = coord.match(/^(\d+)°(\d+)'([\d.]+)"([NSEW])$/i);

        if (dmsMatch) {
          const [, degrees, minutes, seconds, direction] = dmsMatch;
          const deg = parseFloat(degrees);
          const min = parseFloat(minutes);
          const sec = parseFloat(seconds);

          // Convert DMS to decimal degrees
          let decimalDegrees = deg + (min / 60) + (sec / 3600);

          // Apply direction (negative for South and West)
          if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
            decimalDegrees = -decimalDegrees;
          }

          return decimalDegrees;
        } else {
          // Try to parse as decimal degrees
          return parseFloat(coord);
        }
      };

      const lat = parseCoordinate(coords[0]);
      const lng = parseCoordinate(coords[1]);

      if (!isNaN(lat) && !isNaN(lng)) {
        setOfficeData(prev => ({
          ...prev,
          coordinates: {
            lat: lat,
            lng: lng
          }
        }));
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setOfficeData(prev => ({
            ...prev,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
          setMessage({ type: 'success', text: 'Current location detected!' });
        },
        (error) => {
          setMessage({ type: 'error', text: 'Failed to get current location' });
        }
      );
    } else {
      setMessage({ type: 'error', text: 'Geolocation is not supported by this browser' });
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg ${className}`}>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-[--muted-foreground]" />
          <span className="ml-2 text-[--muted-foreground]">Loading office settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[--card] border border-[--border] rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[--foreground]">Office Location</h3>
            <p className="text-sm text-[--muted-foreground]">Configure your office location for the map</p>
          </div>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-[--border] rounded-lg hover:bg-[--accent] transition-colors"
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-[--foreground]">Basic Information</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-2">
                Office Name
              </label>
              <input
                type="text"
                value={officeData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-[--border] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter office name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-2">
                Icon
              </label>
              <input
                type="text"
                value={officeData.icon}
                onChange={(e) => handleInputChange('icon', e.target.value)}
                className="w-full px-3 py-2 border border-[--border] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="🏢"
                maxLength={2}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">
              Address
            </label>
            <textarea
              value={officeData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-[--border] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Enter full office address"
            />
          </div>
        </div>

        {/* Coordinates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-[--foreground]">Coordinates</h4>
            <button
              onClick={getCurrentLocation}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Use Current Location
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[--foreground] mb-2">
              Coordinates (Latitude, Longitude)
            </label>
            <input
              type="text"
              value={`${officeData.coordinates.lat}, ${officeData.coordinates.lng}`}
              onChange={(e) => handleCoordinatesChange(e.target.value)}
              className="w-full px-3 py-2 border border-[--border] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="25.1556, 55.2485 or 25°09'20.3&quot;N, 55°14'54.6&quot;E"
            />
            <p className="text-xs text-[--muted-foreground] mt-1">
              Supports decimal degrees (25.1556, 55.2485) or DMS format (25°09'20.3"N, 55°14'54.6"E)
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-[--foreground]">Contact Information</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={officeData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-[--border] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+971 XX XXX XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[--foreground] mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={officeData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-[--border] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="office@bestdoc.ae"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-4">
            <h4 className="text-md font-medium text-[--foreground]">Preview</h4>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                  {officeData.icon}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{officeData.name}</div>
                  <div className="text-sm text-gray-600">Our Office Location</div>
                </div>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <div><strong>Address:</strong> {officeData.address}</div>
                <div><strong>Coordinates:</strong> {officeData.coordinates.lat}, {officeData.coordinates.lng}</div>
                {officeData.phone && <div><strong>Phone:</strong> {officeData.phone}</div>}
                {officeData.email && <div><strong>Email:</strong> {officeData.email}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[--border]">
          <button
            onClick={loadOfficeSettings}
            disabled={isLoading}
            className="px-4 py-2 text-sm border border-[--border] rounded-lg hover:bg-[--accent] transition-colors disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={saveOfficeSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OfficeSettings;
