import { useCallback, useEffect, useRef, useState } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

interface UseFilterCacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of cache entries
}

interface UseFilterCacheReturn<T> {
  getCachedData: (key: string) => T | null;
  setCachedData: (key: string, data: T) => void;
  clearCache: () => void;
  clearExpiredEntries: () => void;
  getCacheStats: () => { size: number; keys: string[] };
}

export function useFilterCache<T>({
  ttl = 5 * 60 * 1000, // 5 minutes default
  maxSize = 50, // 50 entries default
}: UseFilterCacheOptions = {}): UseFilterCacheReturn<T> {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const [, forceUpdate] = useState({});

  // Generate cache key from filters and search term
  const generateCacheKey = useCallback((filters: Record<string, any>, searchTerm?: string): string => {
    const normalizedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          acc[key] = filters[key];
        }
        return acc;
      }, {} as Record<string, any>);

    const filterString = JSON.stringify(normalizedFilters);
    const searchString = searchTerm ? `search:${searchTerm}` : '';

    return `${filterString}${searchString ? `|${searchString}` : ''}`;
  }, []);

  // Check if cache entry is expired
  const isExpired = useCallback((entry: CacheEntry<T>): boolean => {
    return Date.now() - entry.timestamp > ttl;
  }, [ttl]);

  // Get cached data
  const getCachedData = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);

    if (!entry) {
      return null;
    }

    if (isExpired(entry)) {
      cacheRef.current.delete(key);
      return null;
    }

    return entry.data;
  }, [isExpired]);

  // Set cached data
  const setCachedData = useCallback((key: string, data: T): void => {
    // Remove expired entries before adding new one
    clearExpiredEntries();

    // If cache is at max size, remove oldest entry
    if (cacheRef.current.size >= maxSize) {
      const oldestKey = cacheRef.current.keys().next().value;
      if (oldestKey) {
        cacheRef.current.delete(oldestKey);
      }
    }

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      key,
    });

    // Force re-render to update cache stats
    forceUpdate({});
  }, [maxSize]);

  // Clear all cache entries
  const clearCache = useCallback((): void => {
    cacheRef.current.clear();
    forceUpdate({});
  }, []);

  // Clear expired entries
  const clearExpiredEntries = useCallback((): void => {
    const now = Date.now();
    let hasChanges = false;

    for (const [key, entry] of cacheRef.current.entries()) {
      if (now - entry.timestamp > ttl) {
        cacheRef.current.delete(key);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      forceUpdate({});
    }
  }, [ttl]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      keys: Array.from(cacheRef.current.keys()),
    };
  }, []);

  // Auto-cleanup expired entries every minute
  useEffect(() => {
    const interval = setInterval(clearExpiredEntries, 60 * 1000);
    return () => clearInterval(interval);
  }, [clearExpiredEntries]);

  return {
    getCachedData,
    setCachedData,
    clearCache,
    clearExpiredEntries,
    getCacheStats,
  };
}

// Hook specifically for search and filter caching
interface UseSearchFilterCacheOptions extends UseFilterCacheOptions {
  debounceMs?: number;
}

interface UseSearchFilterCacheReturn<T> {
  getCachedResults: (filters: Record<string, any>, searchTerm?: string) => T | null;
  setCachedResults: (filters: Record<string, any>, searchTerm: string | undefined, data: T) => void;
  clearCache: () => void;
  getCacheStats: () => { size: number; keys: string[] };
  generateCacheKey: (filters: Record<string, any>, searchTerm?: string) => string;
}

export function useSearchFilterCache<T>({
  ttl = 5 * 60 * 1000,
  maxSize = 50,
  debounceMs = 300,
}: UseSearchFilterCacheOptions = {}): UseSearchFilterCacheReturn<T> {
  const cache = useFilterCache<T>({ ttl, maxSize });
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Generate cache key from filters and search term
  const generateCacheKey = useCallback((filters: Record<string, any>, searchTerm?: string): string => {
    const normalizedFilters = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          acc[key] = filters[key];
        }
        return acc;
      }, {} as Record<string, any>);

    const filterString = JSON.stringify(normalizedFilters);
    const searchString = searchTerm ? `search:${searchTerm}` : '';

    return `${filterString}${searchString ? `|${searchString}` : ''}`;
  }, []);

  // Get cached results
  const getCachedResults = useCallback((filters: Record<string, any>, searchTerm?: string): T | null => {
    const key = generateCacheKey(filters, searchTerm);
    return cache.getCachedData(key);
  }, [cache, generateCacheKey]);

  // Set cached results with debouncing
  const setCachedResults = useCallback((filters: Record<string, any>, searchTerm: string | undefined, data: T): void => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      const key = generateCacheKey(filters, searchTerm);
      cache.setCachedData(key, data);
    }, debounceMs);
  }, [cache, generateCacheKey, debounceMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    getCachedResults,
    setCachedResults,
    clearCache: cache.clearCache,
    getCacheStats: cache.getCacheStats,
    generateCacheKey,
  };
}
