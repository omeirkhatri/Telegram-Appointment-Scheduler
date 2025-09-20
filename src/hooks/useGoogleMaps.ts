'use client';

import { getGoogleMapsConfig } from '@/config/googleMapsConfig';
import { GoogleMapsService, type GoogleMapsError } from '@/services/googleMapsService';
import type {
    GoogleMapsConfig,
    MapError
} from '@/types/map';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseGoogleMapsOptions {
  apiKey?: string;
  libraries?: string[];
  language?: string;
  region?: string;
  version?: string;
  enableLogging?: boolean;
  enableErrorReporting?: boolean;
  autoInitialize?: boolean;
  onInitialized?: () => void;
  onError?: (error: MapError) => void;
}

export interface UseGoogleMapsReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: MapError | null;
  googleMapsService: GoogleMapsService | null;

  // Actions
  initialize: (config?: Partial<GoogleMapsConfig>) => Promise<void>;
  reset: () => void;

  // Utilities
  isApiReady: () => boolean;
  getConfig: () => GoogleMapsConfig | null;
  validateApiKey: (apiKey: string) => boolean;
}

/**
 * Custom hook for Google Maps API initialization and state management
 *
 * This hook provides a React-friendly interface for initializing and managing
 * the Google Maps API service with proper error handling and state management.
 */
export function useGoogleMaps(options: UseGoogleMapsOptions = {}): UseGoogleMapsReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MapError | null>(null);
  const [googleMapsService, setGoogleMapsService] = useState<GoogleMapsService | null>(null);

  const initializationRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-initialize on mount if enabled
  useEffect(() => {
    if (options.autoInitialize !== false && !isInitialized && !isLoading) {
      // Use setTimeout to avoid state updates during render
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          initialize();
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [options.autoInitialize, isInitialized, isLoading]);

  /**
   * Initialize Google Maps API with configuration
   */
  const initialize = useCallback(async (config?: Partial<GoogleMapsConfig>) => {
    // Prevent multiple simultaneous initializations
    if (initializationRef.current) {
      return initializationRef.current;
    }

    setIsLoading(true);
    setError(null);

    const initPromise = (async () => {
      try {
        // Get Google Maps service instance
        const service = GoogleMapsService.getInstance();
        setGoogleMapsService(service);

        // Check if already initialized
        if (service.isApiInitialized()) {
          if (isMountedRef.current) {
            setIsInitialized(true);
            setIsLoading(false);
            options.onInitialized?.();
          }
          return;
        }

        // Get configuration
        const environmentConfig = getGoogleMapsConfig();
        const finalConfig: GoogleMapsConfig = {
          apiKey: config?.apiKey || options.apiKey || environmentConfig.apiKey,
          libraries: config?.libraries || options.libraries || environmentConfig.libraries,
          language: config?.language || options.language || environmentConfig.language,
          region: config?.region || options.region || environmentConfig.region,
          version: config?.version || options.version || environmentConfig.version,
        };

        // Validate API key
        if (!GoogleMapsService.validateApiKey(finalConfig.apiKey)) {
          throw new Error('Invalid Google Maps API key format');
        }

        // Initialize the service
        await service.initialize(finalConfig);

        if (isMountedRef.current) {
          setIsInitialized(true);
          setIsLoading(false);
          options.onInitialized?.();
        }
      } catch (err) {
        const mapError = convertToMapError(err);

        if (isMountedRef.current) {
          setError(mapError);
          setIsLoading(false);
          options.onError?.(mapError);
        }

        throw mapError;
      }
    })();

    initializationRef.current = initPromise;

    try {
      await initPromise;
    } finally {
      initializationRef.current = null;
    }
  }, [options.apiKey, options.libraries, options.language, options.region, options.version, options.onInitialized, options.onError]);

  /**
   * Reset the hook state and service
   */
  const reset = useCallback(() => {
    if (googleMapsService) {
      googleMapsService.reset();
    }

    setIsInitialized(false);
    setIsLoading(false);
    setError(null);
    setGoogleMapsService(null);
    initializationRef.current = null;
  }, [googleMapsService]);

  /**
   * Check if Google Maps API is ready for use
   */
  const isApiReady = useCallback((): boolean => {
    return googleMapsService?.isApiInitialized() ?? false;
  }, [googleMapsService]);

  /**
   * Get current configuration
   */
  const getConfig = useCallback((): GoogleMapsConfig | null => {
    return googleMapsService?.getConfig() ?? null;
  }, [googleMapsService]);

  /**
   * Validate API key format
   */
  const validateApiKey = useCallback((apiKey: string): boolean => {
    return GoogleMapsService.validateApiKey(apiKey);
  }, []);

  /**
   * Convert Google Maps error to Map error format
   */
  const convertToMapError = (err: unknown): MapError => {
    if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
      const googleError = err as GoogleMapsError;
      return {
        code: googleError.code,
        message: googleError.message,
        details: googleError.details,
        timestamp: Date.now(),
        context: {
          component: 'useGoogleMaps',
          action: 'initialize'
        }
      };
    }

    if (err instanceof Error) {
      return {
        code: 'GOOGLE_MAPS_ERROR',
        message: err.message,
        details: err,
        timestamp: Date.now(),
        context: {
          component: 'useGoogleMaps',
          action: 'initialize'
        }
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred during Google Maps initialization',
      details: err,
      timestamp: Date.now(),
      context: {
        component: 'useGoogleMaps',
        action: 'initialize'
      }
    };
  };

  return {
    // State
    isInitialized,
    isLoading,
    error,
    googleMapsService,

    // Actions
    initialize,
    reset,

    // Utilities
    isApiReady,
    getConfig,
    validateApiKey,
  };
}

/**
 * Hook for Google Maps API with default configuration
 *
 * This is a convenience hook that uses environment-based configuration
 * and automatically initializes the API on mount.
 */
export function useGoogleMapsWithDefaults(): UseGoogleMapsReturn {
  return useGoogleMaps({
    autoInitialize: true,
    enableLogging: process.env.NODE_ENV === 'development',
    enableErrorReporting: true,
  });
}

/**
 * Hook for Google Maps API with custom configuration
 *
 * This hook allows full control over the initialization process
 * and configuration.
 */
export function useGoogleMapsWithConfig(config: GoogleMapsConfig): UseGoogleMapsReturn {
  return useGoogleMaps({
    apiKey: config.apiKey,
    libraries: config.libraries,
    language: config.language,
    region: config.region,
    version: config.version,
    autoInitialize: true,
  });
}

export default useGoogleMaps;
