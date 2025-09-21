'use client';

import { CoordinateCacheService, type CoordinateCacheOptions } from '@/services/coordinateCacheService';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCoordinateCacheOptions extends CoordinateCacheOptions {
  // Additional hook-specific options
  enableAutoCleanup?: boolean;
  cleanupInterval?: number;
}

export interface UseCoordinateCacheReturn {
  // Cache operations
  set: (key: string, data: any, ttl?: number, tags?: string[]) => void;
  get: <T = any>(key: string) => T | null;
  has: (key: string) => boolean;
  delete: (key: string) => boolean;
  clear: () => void;

  // Coordinate-specific operations
  cacheMapBounds: (
    markers: Array<{ lat: number; lng: number }>,
    options?: { padding?: number; maxZoom?: number }
  ) => { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } } | null;

  cacheMarkerClusters: (
    markers: Array<{ id: string; lat: number; lng: number; data: any }>,
    options?: { maxZoom?: number; gridSize?: number; algorithm?: string }
  ) => any;

  cacheCoordinateValidation: (
    lat: number,
    lng: number,
    validationResult: { isValid: boolean; reason?: string }
  ) => { isValid: boolean; reason?: string };

  cacheDistance: (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    distance: number
  ) => number;

  // Tag operations
  invalidateByTags: (tags: string[]) => number;
  getByTags: (tags: string[]) => Array<{ key: string; data: any }>;

  // Statistics and info
  getStats: () => any;
  size: () => number;
  isEnabled: boolean;
}

/**
 * Custom hook for coordinate caching
 *
 * This hook provides a React-friendly interface for the coordinate cache service
 * with automatic cleanup and performance monitoring.
 */
export function useCoordinateCache(options: UseCoordinateCacheOptions = {}): UseCoordinateCacheReturn {
  const [isEnabled, setIsEnabled] = useState(true);
  const cacheServiceRef = useRef<CoordinateCacheService | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize cache service
  useEffect(() => {
    if (!cacheServiceRef.current) {
      try {
        cacheServiceRef.current = CoordinateCacheService.getInstance(options);
        setIsEnabled(true);
      } catch (error) {
        console.error('Failed to initialize coordinate cache:', error);
        setIsEnabled(false);
      }
    }
  }, [options]);

  // Set up automatic cleanup
  useEffect(() => {
    if (options.enableAutoCleanup !== false && cacheServiceRef.current) {
      const interval = options.cleanupInterval || 60000; // 1 minute default

      cleanupIntervalRef.current = setInterval(() => {
        if (cacheServiceRef.current) {
          // The cache service handles its own cleanup, but we can trigger additional cleanup here if needed
          cacheServiceRef.current.getStats(); // This triggers internal cleanup
        }
      }, interval);
    }

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, [options.enableAutoCleanup, options.cleanupInterval]);

  // Basic cache operations
  const set = useCallback((key: string, data: any, ttl?: number, tags?: string[]) => {
    if (!cacheServiceRef.current || !isEnabled) return;

    try {
      cacheServiceRef.current.set(key, data, ttl, tags);
    } catch (error) {
      console.error('Failed to set cache entry:', error);
    }
  }, [isEnabled]);

  const get = useCallback(<T = any>(key: string): T | null => {
    if (!cacheServiceRef.current || !isEnabled) return null;

    try {
      return cacheServiceRef.current.get<T>(key);
    } catch (error) {
      console.error('Failed to get cache entry:', error);
      return null;
    }
  }, [isEnabled]);

  const has = useCallback((key: string): boolean => {
    if (!cacheServiceRef.current || !isEnabled) return false;

    try {
      return cacheServiceRef.current.has(key);
    } catch (error) {
      console.error('Failed to check cache entry:', error);
      return false;
    }
  }, [isEnabled]);

  const deleteEntry = useCallback((key: string): boolean => {
    if (!cacheServiceRef.current || !isEnabled) return false;

    try {
      return cacheServiceRef.current.delete(key);
    } catch (error) {
      console.error('Failed to delete cache entry:', error);
      return false;
    }
  }, [isEnabled]);

  const clear = useCallback(() => {
    if (!cacheServiceRef.current || !isEnabled) return;

    try {
      cacheServiceRef.current.clear();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [isEnabled]);

  // Coordinate-specific operations
  const cacheMapBounds = useCallback((
    markers: Array<{ lat: number; lng: number }>,
    options?: { padding?: number; maxZoom?: number }
  ) => {
    if (!cacheServiceRef.current || !isEnabled) return null;

    try {
      return cacheServiceRef.current.cacheMapBounds(markers, options);
    } catch (error) {
      console.error('Failed to cache map bounds:', error);
      return null;
    }
  }, [isEnabled]);

  const cacheMarkerClusters = useCallback((
    markers: Array<{ id: string; lat: number; lng: number; data: any }>,
    options?: { maxZoom?: number; gridSize?: number; algorithm?: string }
  ) => {
    if (!cacheServiceRef.current || !isEnabled) return null;

    try {
      return cacheServiceRef.current.cacheMarkerClusters(markers, options);
    } catch (error) {
      console.error('Failed to cache marker clusters:', error);
      return null;
    }
  }, [isEnabled]);

  const cacheCoordinateValidation = useCallback((
    lat: number,
    lng: number,
    validationResult: { isValid: boolean; reason?: string }
  ) => {
    if (!cacheServiceRef.current || !isEnabled) return validationResult;

    try {
      return cacheServiceRef.current.cacheCoordinateValidation(lat, lng, validationResult);
    } catch (error) {
      console.error('Failed to cache coordinate validation:', error);
      return validationResult;
    }
  }, [isEnabled]);

  const cacheDistance = useCallback((
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    distance: number
  ) => {
    if (!cacheServiceRef.current || !isEnabled) return distance;

    try {
      return cacheServiceRef.current.cacheDistance(from, to, distance);
    } catch (error) {
      console.error('Failed to cache distance:', error);
      return distance;
    }
  }, [isEnabled]);

  // Tag operations
  const invalidateByTags = useCallback((tags: string[]): number => {
    if (!cacheServiceRef.current || !isEnabled) return 0;

    try {
      return cacheServiceRef.current.invalidateByTags(tags);
    } catch (error) {
      console.error('Failed to invalidate by tags:', error);
      return 0;
    }
  }, [isEnabled]);

  const getByTags = useCallback((tags: string[]): Array<{ key: string; data: any }> => {
    if (!cacheServiceRef.current || !isEnabled) return [];

    try {
      return cacheServiceRef.current.getByTags(tags);
    } catch (error) {
      console.error('Failed to get by tags:', error);
      return [];
    }
  }, [isEnabled]);

  // Statistics and info
  const getStats = useCallback(() => {
    if (!cacheServiceRef.current || !isEnabled) return null;

    try {
      return cacheServiceRef.current.getStats();
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }, [isEnabled]);

  const size = useCallback(() => {
    if (!cacheServiceRef.current || !isEnabled) return 0;

    try {
      return cacheServiceRef.current.size();
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }, [isEnabled]);

  return {
    // Cache operations
    set,
    get,
    has,
    delete: deleteEntry,
    clear,

    // Coordinate-specific operations
    cacheMapBounds,
    cacheMarkerClusters,
    cacheCoordinateValidation,
    cacheDistance,

    // Tag operations
    invalidateByTags,
    getByTags,

    // Statistics and info
    getStats,
    size,
    isEnabled,
  };
}

/**
 * Hook for coordinate caching with performance-optimized settings
 */
export function useCoordinateCacheOptimized(): UseCoordinateCacheReturn {
  return useCoordinateCache({
    maxSize: 2000,
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    enablePersistence: true,
    enableCompression: false,
    enableStats: true,
    enableAutoCleanup: true,
    cleanupInterval: 60000, // 1 minute
  });
}

/**
 * Hook for coordinate caching with aggressive caching for better performance
 */
export function useCoordinateCacheAggressive(): UseCoordinateCacheReturn {
  return useCoordinateCache({
    maxSize: 5000,
    defaultTtl: 10 * 60 * 1000, // 10 minutes
    enablePersistence: true,
    enableCompression: true,
    enableStats: true,
    enableAutoCleanup: true,
    cleanupInterval: 30000, // 30 seconds
  });
}

/**
 * Hook for coordinate caching with minimal memory usage
 */
export function useCoordinateCacheMinimal(): UseCoordinateCacheReturn {
  return useCoordinateCache({
    maxSize: 500,
    defaultTtl: 2 * 60 * 1000, // 2 minutes
    enablePersistence: false,
    enableCompression: false,
    enableStats: false,
    enableAutoCleanup: true,
    cleanupInterval: 120000, // 2 minutes
  });
}

export default useCoordinateCache;
