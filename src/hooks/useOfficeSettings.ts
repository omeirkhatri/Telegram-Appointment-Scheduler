'use client';

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

interface UseOfficeSettingsReturn {
  officeSettings: OfficeLocation | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOfficeSettings(): UseOfficeSettingsReturn {
  const [officeSettings, setOfficeSettings] = useState<OfficeLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficeSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/settings/office');
      if (!response.ok) {
        throw new Error('Failed to fetch office settings');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setOfficeSettings(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch office settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching office settings:', err);

      // Fallback to default settings
      setOfficeSettings({
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficeSettings();
  }, []);

  return {
    officeSettings,
    isLoading,
    error,
    refetch: fetchOfficeSettings
  };
}
