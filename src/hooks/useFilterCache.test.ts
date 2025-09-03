import { act, renderHook } from '@testing-library/react';
import { useFilterCache, useSearchFilterCache } from './useFilterCache';

describe('useFilterCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should cache and retrieve data', () => {
    const { result } = renderHook(() => useFilterCache<string>());

    act(() => {
      result.current.setCachedData('key1', 'value1');
    });

    expect(result.current.getCachedData('key1')).toBe('value1');
    expect(result.current.getCachedData('nonexistent')).toBeNull();
  });

  it('should respect TTL and expire entries', () => {
    const { result } = renderHook(() => useFilterCache<string>({ ttl: 1000 }));

    act(() => {
      result.current.setCachedData('key1', 'value1');
    });

    expect(result.current.getCachedData('key1')).toBe('value1');

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(1001);
    });

    expect(result.current.getCachedData('key1')).toBeNull();
  });

  it('should respect max size and remove oldest entries', () => {
    const { result } = renderHook(() => useFilterCache<string>({ maxSize: 2 }));

    act(() => {
      result.current.setCachedData('key1', 'value1');
      result.current.setCachedData('key2', 'value2');
      result.current.setCachedData('key3', 'value3');
    });

    expect(result.current.getCachedData('key1')).toBeNull(); // Oldest, should be removed
    expect(result.current.getCachedData('key2')).toBe('value2');
    expect(result.current.getCachedData('key3')).toBe('value3');
  });

  it('should clear all cache entries', () => {
    const { result } = renderHook(() => useFilterCache<string>());

    act(() => {
      result.current.setCachedData('key1', 'value1');
      result.current.setCachedData('key2', 'value2');
    });

    expect(result.current.getCachedData('key1')).toBe('value1');
    expect(result.current.getCachedData('key2')).toBe('value2');

    act(() => {
      result.current.clearCache();
    });

    expect(result.current.getCachedData('key1')).toBeNull();
    expect(result.current.getCachedData('key2')).toBeNull();
  });

  it('should clear expired entries', () => {
    const { result } = renderHook(() => useFilterCache<string>({ ttl: 1000 }));

    act(() => {
      result.current.setCachedData('key1', 'value1');
    });

    // Fast forward time for key1
    act(() => {
      jest.advanceTimersByTime(1001);
    });

    act(() => {
      result.current.setCachedData('key2', 'value2');
    });

    act(() => {
      result.current.clearExpiredEntries();
    });

    expect(result.current.getCachedData('key1')).toBeNull();
    expect(result.current.getCachedData('key2')).toBe('value2');
  });

  it('should provide cache statistics', () => {
    const { result } = renderHook(() => useFilterCache<string>());

    act(() => {
      result.current.setCachedData('key1', 'value1');
      result.current.setCachedData('key2', 'value2');
    });

    const stats = result.current.getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.keys).toEqual(['key1', 'key2']);
  });
});

describe('useSearchFilterCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should generate consistent cache keys', () => {
    const { result } = renderHook(() => useSearchFilterCache<string>());

    const key1 = result.current.generateCacheKey({ type: 'doctor', status: 'active' }, 'john');
    const key2 = result.current.generateCacheKey({ status: 'active', type: 'doctor' }, 'john');
    const key3 = result.current.generateCacheKey({ type: 'doctor', status: 'active' }, 'jane');

    expect(key1).toBe(key2); // Same filters, same search term
    expect(key1).not.toBe(key3); // Different search term
  });

  it('should cache and retrieve search results', () => {
    const { result } = renderHook(() => useSearchFilterCache<string>());

    act(() => {
      result.current.setCachedResults({ type: 'doctor' }, 'john', 'search results');
    });

    // Fast forward debounce time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.getCachedResults({ type: 'doctor' }, 'john')).toBe('search results');
  });

  it('should debounce cache updates', () => {
    const { result } = renderHook(() => useSearchFilterCache<string>({ debounceMs: 500 }));

    act(() => {
      result.current.setCachedResults({ type: 'doctor' }, 'john', 'result1');
      result.current.setCachedResults({ type: 'doctor' }, 'john', 'result2');
    });

    // Before debounce time
    expect(result.current.getCachedResults({ type: 'doctor' }, 'john')).toBeNull();

    // After debounce time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.getCachedResults({ type: 'doctor' }, 'john')).toBe('result2');
  });

  it('should handle empty filters and search terms', () => {
    const { result } = renderHook(() => useSearchFilterCache<string>());

    act(() => {
      result.current.setCachedResults({}, undefined, 'empty results');
    });

    // Fast forward debounce time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.getCachedResults({}, undefined)).toBe('empty results');
  });

  it('should filter out empty values from cache keys', () => {
    const { result } = renderHook(() => useSearchFilterCache<string>());

    const key1 = result.current.generateCacheKey({ type: 'doctor', status: '', city: undefined }, 'john');
    const key2 = result.current.generateCacheKey({ type: 'doctor' }, 'john');

    expect(key1).toBe(key2); // Empty values should be filtered out
  });
});
