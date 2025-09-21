import type { GoogleMapsConfig, GoogleMapsError } from '@/services/googleMapsService';
import { GoogleMapsService } from '@/services/googleMapsService';
import { useEffect, useRef, useState } from 'react';

export interface UseGoogleMapsImmediateReturn {
  isLoaded: boolean;
  isLoading: boolean;
  isError: boolean;
  error: GoogleMapsError | null;
  loadTime: number | null;
  getGoogleMapsService: () => GoogleMapsService | null;
}

/**
 * Custom hook for immediate Google Maps API loading
 * This bypasses lazy loading and loads the API immediately
 */
export function useGoogleMapsImmediate(): UseGoogleMapsImmediateReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<GoogleMapsError | null>(null);
  const [loadTime, setLoadTime] = useState<number | null>(null);

  const googleMapsServiceRef = useRef<GoogleMapsService | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load Google Maps API immediately
  useEffect(() => {
    const loadImmediately = async () => {
      if (isLoaded || isLoading) return;

      setIsLoading(true);
      setIsError(false);
      setError(null);

      const startTime = performance.now();

      try {
        console.log('Loading Google Maps API immediately...');

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is not set');
        }

        const config: GoogleMapsConfig = {
          apiKey,
          libraries: ['places', 'geometry'],
          language: 'en',
          region: 'AE',
          version: 'weekly'
        };

        const service = GoogleMapsService.getInstance();
        await service.initialize(config);

        const endTime = performance.now();
        const loadDuration = endTime - startTime;

        if (isMountedRef.current) {
          googleMapsServiceRef.current = service;
          setIsLoaded(true);
          setIsLoading(false);
          setLoadTime(loadDuration);
          console.log(`Google Maps API loaded immediately in ${loadDuration.toFixed(2)}ms`);
        }
      } catch (err) {
        const endTime = performance.now();
        const loadDuration = endTime - startTime;

        if (isMountedRef.current) {
          const mapError = convertToMapError(err);
          setError(mapError);
          setIsError(true);
          setIsLoading(false);
          setLoadTime(loadDuration);
          console.error('Failed to load Google Maps API immediately:', mapError);
        }
      }
    };

    loadImmediately();
  }, [isLoaded, isLoading]);

  // Get Google Maps service instance
  const getGoogleMapsService = (): GoogleMapsService | null => {
    return googleMapsServiceRef.current;
  };

  // Convert error to Map error format
  const convertToMapError = (err: unknown): GoogleMapsError => {
    if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
      return err as GoogleMapsError;
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error occurred',
      details: err
    };
  };

  return {
    isLoaded,
    isLoading,
    isError,
    error,
    loadTime,
    getGoogleMapsService
  };
}
