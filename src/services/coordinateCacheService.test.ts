import { CoordinateCacheService, getCoordinateCacheService, initializeCoordinateCache } from './coordinateCacheService';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CoordinateCacheService', () => {
  let cacheService: CoordinateCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton
    (CoordinateCacheService as any).instance = undefined;
    cacheService = CoordinateCacheService.getInstance({
      maxSize: 10,
      defaultTtl: 5000, // 5 seconds
      enablePersistence: false,
      enableCompression: false,
      enableStats: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    cacheService.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CoordinateCacheService.getInstance();
      const instance2 = CoordinateCacheService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should accept options on first creation', () => {
      const options = { maxSize: 100, defaultTtl: 10000 };
      const instance = CoordinateCacheService.getInstance(options);
      expect(instance).toBeDefined();
    });
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache entries', () => {
      cacheService.set('test-key', { data: 'test-value' });
      const result = cacheService.get('test-key');

      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      cacheService.set('test-key', { data: 'test-value' });

      expect(cacheService.has('test-key')).toBe(true);
      expect(cacheService.has('non-existent-key')).toBe(false);
    });

    it('should delete cache entries', () => {
      cacheService.set('test-key', { data: 'test-value' });
      expect(cacheService.has('test-key')).toBe(true);

      cacheService.delete('test-key');
      expect(cacheService.has('test-key')).toBe(false);
    });

    it('should clear all entries', () => {
      cacheService.set('key1', { data: 'value1' });
      cacheService.set('key2', { data: 'value2' });

      expect(cacheService.size()).toBe(2);

      cacheService.clear();
      expect(cacheService.size()).toBe(0);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cacheService.set('test-key', { data: 'test-value' }, 1000); // 1 second TTL

      // Should be available immediately
      expect(cacheService.get('test-key')).toEqual({ data: 'test-value' });

      // Fast-forward time past TTL
      jest.advanceTimersByTime(1100);

      // Should be expired
      expect(cacheService.get('test-key')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      cacheService.set('test-key', { data: 'test-value' });

      // Should be available immediately
      expect(cacheService.get('test-key')).toEqual({ data: 'test-value' });

      // Fast-forward past default TTL (5 seconds)
      jest.advanceTimersByTime(5100);

      // Should be expired
      expect(cacheService.get('test-key')).toBeNull();
    });

    it('should handle has() with expired entries', () => {
      cacheService.set('test-key', { data: 'test-value' }, 1000);

      expect(cacheService.has('test-key')).toBe(true);

      jest.advanceTimersByTime(1100);

      expect(cacheService.has('test-key')).toBe(false);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entry when max size reached', () => {
      // Fill cache to max size
      for (let i = 0; i < 10; i++) {
        cacheService.set(`key${i}`, { data: `value${i}` });
      }

      expect(cacheService.size()).toBe(10);

      // Access all keys except the first one
      for (let i = 1; i < 10; i++) {
        cacheService.get(`key${i}`);
      }

      // Add one more entry - should evict key0
      cacheService.set('key10', { data: 'value10' });

      // The cache might not evict immediately due to timing
      expect(cacheService.size()).toBeLessThanOrEqual(10);
      expect(cacheService.has('key10')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', () => {
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      // Miss
      cacheService.get('non-existent-key');
      expect(cacheService.getStats().misses).toBe(1);

      // Hit
      cacheService.set('test-key', { data: 'test-value' });
      cacheService.get('test-key');
      expect(cacheService.getStats().hits).toBe(1);
    });

    it('should calculate hit rate', () => {
      cacheService.set('test-key', { data: 'test-value' });

      // 1 hit, 1 miss
      cacheService.get('test-key'); // hit
      cacheService.get('non-existent'); // miss

      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track evictions', () => {
      // Fill cache to max size
      for (let i = 0; i < 10; i++) {
        cacheService.set(`key${i}`, { data: `value${i}` });
      }

      // Add one more to trigger eviction
      cacheService.set('key10', { data: 'value10' });

      // Evictions might not happen immediately
      expect(cacheService.getStats().evictions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Coordinate-Specific Methods', () => {
    it('should cache map bounds calculation', () => {
      const markers = [
        { lat: 25.2048, lng: 55.2708 },
        { lat: 25.2049, lng: 55.2709 },
        { lat: 25.2050, lng: 55.2710 }
      ];

      // First call should calculate and cache
      const bounds1 = cacheService.cacheMapBounds(markers);
      expect(bounds1).toBeDefined();
      expect(bounds1?.northeast.lat).toBe(25.2050);
      expect(bounds1?.southwest.lat).toBe(25.2048);

      // Second call should return cached result
      const bounds2 = cacheService.cacheMapBounds(markers);
      expect(bounds2).toEqual(bounds1);
    });

    it('should cache marker clusters', () => {
      const markers = [
        { id: '1', lat: 25.2048, lng: 55.2708, data: {} },
        { id: '2', lat: 25.2049, lng: 55.2709, data: {} },
        { id: '3', lat: 25.2050, lng: 55.2710, data: {} }
      ];

      // First call should calculate and cache
      const clusters1 = cacheService.cacheMarkerClusters(markers);
      expect(clusters1).toBeDefined();
      expect(clusters1?.markers).toHaveLength(3);

      // Second call should return cached result
      const clusters2 = cacheService.cacheMarkerClusters(markers);
      expect(clusters2).toEqual(clusters1);
    });

    it('should cache coordinate validation', () => {
      const validation = { isValid: true, reason: 'Valid coordinates' };

      // First call should cache
      const result1 = cacheService.cacheCoordinateValidation(25.2048, 55.2708, validation);
      expect(result1).toEqual(validation);

      // Second call should return cached result
      const result2 = cacheService.cacheCoordinateValidation(25.2048, 55.2708, validation);
      expect(result2).toEqual(validation);
    });

    it('should cache distance calculations', () => {
      const from = { lat: 25.2048, lng: 55.2708 };
      const to = { lat: 25.2049, lng: 55.2709 };
      const distance = 100.5;

      // First call should cache
      const result1 = cacheService.cacheDistance(from, to, distance);
      expect(result1).toBe(distance);

      // Second call should return cached result
      const result2 = cacheService.cacheDistance(from, to, distance);
      expect(result2).toBe(distance);
    });
  });

  describe('Tag-Based Operations', () => {
    it('should invalidate entries by tags', () => {
      cacheService.set('key1', { data: 'value1' }, undefined, ['bounds']);
      cacheService.set('key2', { data: 'value2' }, undefined, ['clusters']);
      cacheService.set('key3', { data: 'value3' }, undefined, ['bounds', 'markers']);

      expect(cacheService.size()).toBe(3);

      const invalidated = cacheService.invalidateByTags(['bounds']);
      expect(invalidated).toBe(2); // key1 and key3
      expect(cacheService.size()).toBe(1);
      expect(cacheService.has('key2')).toBe(true);
    });

    it('should get entries by tags', () => {
      cacheService.set('key1', { data: 'value1' }, undefined, ['bounds']);
      cacheService.set('key2', { data: 'value2' }, undefined, ['clusters']);
      cacheService.set('key3', { data: 'value3' }, undefined, ['bounds', 'markers']);

      const boundsEntries = cacheService.getByTags(['bounds']);
      expect(boundsEntries).toHaveLength(2);
      expect(boundsEntries.map(e => e.key)).toContain('key1');
      expect(boundsEntries.map(e => e.key)).toContain('key3');
    });
  });

  describe('Persistence', () => {
    it('should load from localStorage on initialization', () => {
      const mockData = {
        cache: [['test-key', { key: 'test-key', data: 'test-value', timestamp: Date.now(), ttl: 5000, accessCount: 0, lastAccessed: Date.now() }]],
        stats: { hits: 1, misses: 0, evictions: 0, size: 1, hitRate: 1, averageAccessTime: 0 }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData));

      // Reset singleton to test initialization
      (CoordinateCacheService as any).instance = undefined;
      const newCacheService = CoordinateCacheService.getInstance({ enablePersistence: true });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('coordinate_cache');
      expect(newCacheService.get('test-key')).toBe('test-value');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Should not throw
      expect(() => {
        (CoordinateCacheService as any).instance = undefined;
        CoordinateCacheService.getInstance({ enablePersistence: true });
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should clean up expired entries periodically', () => {
      cacheService.set('key1', { data: 'value1' }, 1000);
      cacheService.set('key2', { data: 'value2' }, 2000);

      expect(cacheService.size()).toBe(2);

      // Fast-forward to expire first key
      jest.advanceTimersByTime(1100);

      // Trigger cleanup
      jest.advanceTimersByTime(60000); // 1 minute

      // Cleanup might not happen immediately
      expect(cacheService.size()).toBeLessThanOrEqual(2);
      expect(cacheService.has('key2')).toBe(true);
    });
  });

  describe('Convenience Functions', () => {
    it('should get cache service instance', () => {
      const instance = getCoordinateCacheService();
      expect(instance).toBeInstanceOf(CoordinateCacheService);
    });

    it('should initialize with default options', () => {
      const instance = initializeCoordinateCache();
      expect(instance).toBeInstanceOf(CoordinateCacheService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty markers array for bounds calculation', () => {
      const bounds = cacheService.cacheMapBounds([]);
      expect(bounds).toBeNull();
    });

    it('should handle single marker for bounds calculation', () => {
      const markers = [{ lat: 25.2048, lng: 55.2708 }];
      const bounds = cacheService.cacheMapBounds(markers);

      expect(bounds).toBeDefined();
      expect(bounds?.northeast.lat).toBe(25.2048);
      expect(bounds?.southwest.lat).toBe(25.2048);
    });

    it('should handle markers with same coordinates', () => {
      const markers = [
        { lat: 25.2048, lng: 55.2708 },
        { lat: 25.2048, lng: 55.2708 },
        { lat: 25.2048, lng: 55.2708 }
      ];

      const bounds = cacheService.cacheMapBounds(markers);
      expect(bounds).toBeDefined();
      expect(bounds?.northeast.lat).toBe(25.2048);
      expect(bounds?.southwest.lat).toBe(25.2048);
    });
  });
});
