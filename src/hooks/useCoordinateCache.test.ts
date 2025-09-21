import { CoordinateCacheService } from '@/services/coordinateCacheService';
import { act, renderHook } from '@testing-library/react';
import { useCoordinateCache, useCoordinateCacheAggressive, useCoordinateCacheMinimal, useCoordinateCacheOptimized } from './useCoordinateCache';

// Mock the coordinate cache service
jest.mock('@/services/coordinateCacheService');
const MockedCoordinateCacheService = CoordinateCacheService as jest.Mocked<typeof CoordinateCacheService>;

describe('useCoordinateCache', () => {
  let mockCacheService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock cache service instance
    mockCacheService = {
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      cacheMapBounds: jest.fn(),
      cacheMarkerClusters: jest.fn(),
      cacheCoordinateValidation: jest.fn(),
      cacheDistance: jest.fn(),
      invalidateByTags: jest.fn(),
      getByTags: jest.fn(),
      getStats: jest.fn(),
      size: jest.fn(),
    };

    MockedCoordinateCacheService.getInstance.mockReturnValue(mockCacheService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCoordinateCache());

      expect(result.current.isEnabled).toBe(true);
      expect(MockedCoordinateCacheService.getInstance).toHaveBeenCalled();
    });

    it('should initialize with custom options', () => {
      const options = { maxSize: 1000, defaultTtl: 10000 };
      renderHook(() => useCoordinateCache(options));

      expect(MockedCoordinateCacheService.getInstance).toHaveBeenCalledWith(options);
    });

    it('should handle initialization error', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      MockedCoordinateCacheService.getInstance.mockImplementation(() => {
        throw new Error('Cache initialization failed');
      });

      const { result } = renderHook(() => useCoordinateCache());

      expect(result.current.isEnabled).toBe(false);
      expect(consoleError).toHaveBeenCalledWith('Failed to initialize coordinate cache:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('Basic Cache Operations', () => {
    it('should set cache entries', () => {
      const { result } = renderHook(() => useCoordinateCache());

      act(() => {
        result.current.set('test-key', { data: 'test-value' });
      });

      expect(mockCacheService.set).toHaveBeenCalledWith('test-key', { data: 'test-value' }, undefined, undefined);
    });

    it('should set cache entries with TTL and tags', () => {
      const { result } = renderHook(() => useCoordinateCache());

      act(() => {
        result.current.set('test-key', { data: 'test-value' }, 5000, ['bounds']);
      });

      expect(mockCacheService.set).toHaveBeenCalledWith('test-key', { data: 'test-value' }, 5000, ['bounds']);
    });

    it('should get cache entries', () => {
      const { result } = renderHook(() => useCoordinateCache());
      mockCacheService.get.mockReturnValue({ data: 'test-value' });

      let cachedValue;
      act(() => {
        cachedValue = result.current.get('test-key');
      });

      expect(mockCacheService.get).toHaveBeenCalledWith('test-key');
      expect(cachedValue).toEqual({ data: 'test-value' });
    });

    it('should check if key exists', () => {
      const { result } = renderHook(() => useCoordinateCache());
      mockCacheService.has.mockReturnValue(true);

      let exists;
      act(() => {
        exists = result.current.has('test-key');
      });

      expect(mockCacheService.has).toHaveBeenCalledWith('test-key');
      expect(exists).toBe(true);
    });

    it('should delete cache entries', () => {
      const { result } = renderHook(() => useCoordinateCache());
      mockCacheService.delete.mockReturnValue(true);

      let deleted;
      act(() => {
        deleted = result.current.delete('test-key');
      });

      expect(mockCacheService.delete).toHaveBeenCalledWith('test-key');
      expect(deleted).toBe(true);
    });

    it('should clear cache', () => {
      const { result } = renderHook(() => useCoordinateCache());

      act(() => {
        result.current.clear();
      });

      expect(mockCacheService.clear).toHaveBeenCalled();
    });
  });

  describe('Coordinate-Specific Operations', () => {
    it('should cache map bounds', () => {
      const { result } = renderHook(() => useCoordinateCache());
      const markers = [
        { lat: 25.2048, lng: 55.2708 },
        { lat: 25.2049, lng: 55.2709 }
      ];
      const expectedBounds = {
        northeast: { lat: 25.2049, lng: 55.2709 },
        southwest: { lat: 25.2048, lng: 55.2708 }
      };
      mockCacheService.cacheMapBounds.mockReturnValue(expectedBounds);

      let bounds;
      act(() => {
        bounds = result.current.cacheMapBounds(markers, { padding: 10 });
      });

      expect(mockCacheService.cacheMapBounds).toHaveBeenCalledWith(markers, { padding: 10 });
      expect(bounds).toEqual(expectedBounds);
    });

    it('should cache marker clusters', () => {
      const { result } = renderHook(() => useCoordinateCache());
      const markers = [
        { id: '1', lat: 25.2048, lng: 55.2708, data: {} },
        { id: '2', lat: 25.2049, lng: 55.2709, data: {} }
      ];
      const expectedClusters = {
        bounds: { northeast: { lat: 25.2049, lng: 55.2709 }, southwest: { lat: 25.2048, lng: 55.2708 } },
        center: { lat: 25.20485, lng: 55.27085 },
        zoom: 15,
        markers: [],
        clusters: []
      };
      mockCacheService.cacheMarkerClusters.mockReturnValue(expectedClusters);

      let clusters;
      act(() => {
        clusters = result.current.cacheMarkerClusters(markers, { maxZoom: 15 });
      });

      expect(mockCacheService.cacheMarkerClusters).toHaveBeenCalledWith(markers, { maxZoom: 15 });
      expect(clusters).toEqual(expectedClusters);
    });

    it('should cache coordinate validation', () => {
      const { result } = renderHook(() => useCoordinateCache());
      const validation = { isValid: true, reason: 'Valid coordinates' };
      mockCacheService.cacheCoordinateValidation.mockReturnValue(validation);

      let result_validation;
      act(() => {
        result_validation = result.current.cacheCoordinateValidation(25.2048, 55.2708, validation);
      });

      expect(mockCacheService.cacheCoordinateValidation).toHaveBeenCalledWith(25.2048, 55.2708, validation);
      expect(result_validation).toEqual(validation);
    });

    it('should cache distance calculations', () => {
      const { result } = renderHook(() => useCoordinateCache());
      const from = { lat: 25.2048, lng: 55.2708 };
      const to = { lat: 25.2049, lng: 55.2709 };
      const distance = 100.5;
      mockCacheService.cacheDistance.mockReturnValue(distance);

      let cachedDistance;
      act(() => {
        cachedDistance = result.current.cacheDistance(from, to, distance);
      });

      expect(mockCacheService.cacheDistance).toHaveBeenCalledWith(from, to, distance);
      expect(cachedDistance).toBe(distance);
    });
  });

  describe('Tag Operations', () => {
    it('should invalidate by tags', () => {
      const { result } = renderHook(() => useCoordinateCache());
      mockCacheService.invalidateByTags.mockReturnValue(3);

      let invalidated;
      act(() => {
        invalidated = result.current.invalidateByTags(['bounds', 'clusters']);
      });

      expect(mockCacheService.invalidateByTags).toHaveBeenCalledWith(['bounds', 'clusters']);
      expect(invalidated).toBe(3);
    });

    it('should get entries by tags', () => {
      const { result } = renderHook(() => useCoordinateCache());
      const expectedEntries = [
        { key: 'key1', data: { bounds: 'data1' } },
        { key: 'key2', data: { bounds: 'data2' } }
      ];
      mockCacheService.getByTags.mockReturnValue(expectedEntries);

      let entries;
      act(() => {
        entries = result.current.getByTags(['bounds']);
      });

      expect(mockCacheService.getByTags).toHaveBeenCalledWith(['bounds']);
      expect(entries).toEqual(expectedEntries);
    });
  });

  describe('Statistics and Info', () => {
    it('should get cache statistics', () => {
      const { result } = renderHook(() => useCoordinateCache());
      const expectedStats = {
        hits: 10,
        misses: 5,
        evictions: 2,
        size: 100,
        hitRate: 0.67,
        averageAccessTime: 50
      };
      mockCacheService.getStats.mockReturnValue(expectedStats);

      let stats;
      act(() => {
        stats = result.current.getStats();
      });

      expect(mockCacheService.getStats).toHaveBeenCalled();
      expect(stats).toEqual(expectedStats);
    });

    it('should get cache size', () => {
      const { result } = renderHook(() => useCoordinateCache());
      mockCacheService.size.mockReturnValue(150);

      let size;
      act(() => {
        size = result.current.size();
      });

      expect(mockCacheService.size).toHaveBeenCalled();
      expect(size).toBe(150);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache operation errors gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useCoordinateCache());

      mockCacheService.set.mockImplementation(() => {
        throw new Error('Cache set failed');
      });

      act(() => {
        result.current.set('test-key', 'test-value');
      });

      expect(consoleError).toHaveBeenCalledWith('Failed to set cache entry:', expect.any(Error));

      consoleError.mockRestore();
    });

    it('should return null for get operations when disabled', () => {
      const { result } = renderHook(() => useCoordinateCache());

      // Simulate disabled state by mocking the service to be null
      mockCacheService.get.mockReturnValue(null);

      let value;
      act(() => {
        value = result.current.get('test-key');
      });

      expect(value).toBeNull();
    });
  });

  describe('Auto Cleanup', () => {
    it('should set up automatic cleanup', () => {
      renderHook(() => useCoordinateCache({ enableAutoCleanup: true, cleanupInterval: 30000 }));

      // Fast-forward to trigger cleanup
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockCacheService.getStats).toHaveBeenCalled();
    });

    it('should not set up cleanup when disabled', () => {
      renderHook(() => useCoordinateCache({ enableAutoCleanup: false }));

      // Fast-forward
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockCacheService.getStats).not.toHaveBeenCalled();
    });

    it('should clean up interval on unmount', () => {
      const { unmount } = renderHook(() => useCoordinateCache({ enableAutoCleanup: true }));

      unmount();

      // Fast-forward - should not trigger cleanup
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockCacheService.getStats).not.toHaveBeenCalled();
    });
  });

  describe('Optimized Variants', () => {
    it('should use optimized options', () => {
      renderHook(() => useCoordinateCacheOptimized());

      expect(MockedCoordinateCacheService.getInstance).toHaveBeenCalledWith({
        maxSize: 2000,
        defaultTtl: 5 * 60 * 1000,
        enablePersistence: true,
        enableCompression: false,
        enableStats: true,
        enableAutoCleanup: true,
        cleanupInterval: 60000,
      });
    });

    it('should use aggressive options', () => {
      renderHook(() => useCoordinateCacheAggressive());

      expect(MockedCoordinateCacheService.getInstance).toHaveBeenCalledWith({
        maxSize: 5000,
        defaultTtl: 10 * 60 * 1000,
        enablePersistence: true,
        enableCompression: true,
        enableStats: true,
        enableAutoCleanup: true,
        cleanupInterval: 30000,
      });
    });

    it('should use minimal options', () => {
      renderHook(() => useCoordinateCacheMinimal());

      expect(MockedCoordinateCacheService.getInstance).toHaveBeenCalledWith({
        maxSize: 500,
        defaultTtl: 2 * 60 * 1000,
        enablePersistence: false,
        enableCompression: false,
        enableStats: false,
        enableAutoCleanup: true,
        cleanupInterval: 120000,
      });
    });
  });
});
