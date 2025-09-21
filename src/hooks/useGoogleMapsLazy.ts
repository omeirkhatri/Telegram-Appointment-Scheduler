'use client';

import { GoogleMapsLazyLoader, type LazyLoadOptions } from '@/services/googleMapsLazyLoader';
import { GoogleMapsService, type GoogleMapsConfig } from '@/services/googleMapsService';
import type { MapError } from '@/types/map';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseGoogleMapsLazyOptions extends LazyLoadOptions {
  // Additional hook-specific options
  autoSetup?: boolean;
  onLoad?: () => void;
  onError?: (error: MapError) => void;
}

export interface UseGoogleMapsLazyReturn {
  // State
  isLoaded: boolean;
  isLoading: boolean;
  isError: boolean;
  error: MapError | null;
  loadTime: number | null;
  retryCount: number;
  isInitialized: boolean;

  // Actions
  setupLazyLoading: (containerElement: HTMLElement) => () => void;
  forceLoad: () => Promise<void>;
  reset: () => void;

  // Utilities
  isApiReady: () => boolean;
  getGoogleMapsService: () => GoogleMapsService | null;
}

/**
 * Custom hook for lazy loading Google Maps API
 *
 * This hook provides a React-friendly interface for lazy loading the Google Maps API
 * with viewport-based and hover-based loading triggers.
 */
export function useGoogleMapsLazy(options: UseGoogleMapsLazyOptions = {}): UseGoogleMapsLazyReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<MapError | null>(null);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const lazyLoaderRef = useRef<GoogleMapsLazyLoader | null>(null);
  const googleMapsServiceRef = useRef<GoogleMapsService | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize lazy loader
  useEffect(() => {
    if (!lazyLoaderRef.current) {
      try {
        lazyLoaderRef.current = GoogleMapsLazyLoader.getInstance(options);

        // Initialize with environment configuration
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

        lazyLoaderRef.current.initialize(config);
        setIsInitialized(true);
      } catch (err) {
        const mapError = convertToMapError(err);
        if (isMountedRef.current) {
          setError(mapError);
          setIsError(true);
          options.onError?.(mapError);
        }
      }
    }
  }, [options]);

  // Set up lazy loading for a container element
  const setupLazyLoading = useCallback((containerElement: HTMLElement): (() => void) => {
    // If lazy loader is not initialized yet, return a no-op cleanup function
    // The component will need to call setupLazyLoading again after the lazy loader is ready
    if (!lazyLoaderRef.current) {
      return () => {};
    }

    const handleLoad = () => {
      if (isMountedRef.current) {
        setIsLoaded(true);
        setIsLoading(false);
        setIsError(false);
        setError(null);

        // Get the Google Maps service instance
        googleMapsServiceRef.current = GoogleMapsService.getInstance();

        options.onLoad?.();
      }
    };

    const handleError = (err: Error) => {
      if (isMountedRef.current) {
        const mapError = convertToMapError(err);
        setError(mapError);
        setIsError(true);
        setIsLoading(false);
        options.onError?.(mapError);
      }
    };

    // Update state based on current lazy loader state
    const currentState = lazyLoaderRef.current.getState();
    if (isMountedRef.current) {
      setIsLoaded(currentState.isLoaded);
      setIsLoading(currentState.isLoading);
      setIsError(currentState.isError);
      setError(currentState.error ? convertToMapError(currentState.error) : null);
      setLoadTime(currentState.loadTime);
      setRetryCount(currentState.retryCount);
    }

    return lazyLoaderRef.current.setupLazyLoading(containerElement, handleLoad, handleError);
  }, [options]);

  // Force load the Google Maps API
  const forceLoad = useCallback(async (): Promise<void> => {
    if (!lazyLoaderRef.current) {
      throw new Error('Lazy loader not initialized');
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      await lazyLoaderRef.current.forceLoad();

      if (isMountedRef.current) {
        setIsLoaded(true);
        setIsLoading(false);
        googleMapsServiceRef.current = GoogleMapsService.getInstance();
        options.onLoad?.();
      }
    } catch (err) {
      if (isMountedRef.current) {
        const mapError = convertToMapError(err);
        setError(mapError);
        setIsError(true);
        setIsLoading(false);
        options.onError?.(mapError);
      }
      throw err;
    }
  }, [options]);

  // Reset the lazy loader
  const reset = useCallback(() => {
    if (lazyLoaderRef.current) {
      lazyLoaderRef.current.reset();
    }

    if (isMountedRef.current) {
      setIsLoaded(false);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      setLoadTime(null);
      setRetryCount(0);
      googleMapsServiceRef.current = null;
    }
  }, []);

  // Check if Google Maps API is ready
  const isApiReady = useCallback((): boolean => {
    return googleMapsServiceRef.current?.isApiInitialized() ?? false;
  }, []);

  // Get Google Maps service instance
  const getGoogleMapsService = useCallback((): GoogleMapsService | null => {
    return googleMapsServiceRef.current;
  }, []);

  // Convert error to Map error format
  const convertToMapError = (err: unknown): MapError => {
    if (err instanceof Error) {
      return {
        code: 'LAZY_LOAD_ERROR',
        message: err.message,
        details: err,
        timestamp: Date.now(),
        context: {
          component: 'useGoogleMapsLazy',
          action: 'load'
        }
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred during lazy loading',
      details: err,
      timestamp: Date.now(),
      context: {
        component: 'useGoogleMapsLazy',
        action: 'load'
      }
    };
  };

  return {
    // State
    isLoaded,
    isLoading,
    isError,
    error,
    loadTime,
    retryCount,
    isInitialized,

    // Actions
    setupLazyLoading,
    forceLoad,
    reset,

    // Utilities
    isApiReady,
    getGoogleMapsService,
  };
}

/**
 * Hook for lazy loading with default options optimized for performance
 */
export function useGoogleMapsLazyOptimized(): UseGoogleMapsLazyReturn {
  return useGoogleMapsLazy({
    rootMargin: '100px', // Start loading when element is 100px away from viewport
    threshold: 0.1,
    loadTimeout: 15000, // 15 seconds timeout
    retryAttempts: 2, // Fewer retries for faster failure
    retryDelay: 2000, // 2 second delay between retries
    preloadOnHover: true,
    preloadDelay: 300, // Faster preload on hover
    enableLogging: process.env.NODE_ENV === 'development',
  });
}

/**
 * Hook for lazy loading with aggressive preloading for better UX
 */
export function useGoogleMapsLazyAggressive(): UseGoogleMapsLazyReturn {
  return useGoogleMapsLazy({
    rootMargin: '200px', // Start loading when element is 200px away
    threshold: 0.05, // Load even when barely visible
    loadTimeout: 20000, // 20 seconds timeout
    retryAttempts: 3,
    retryDelay: 1000,
    preloadOnHover: true,
    preloadDelay: 100, // Very fast preload on hover
    enableLogging: process.env.NODE_ENV === 'development',
  });
}

export default useGoogleMapsLazy;
