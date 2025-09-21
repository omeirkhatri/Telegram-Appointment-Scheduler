import { GoogleMapsLazyLoader } from '@/services/googleMapsLazyLoader';
import { GoogleMapsService } from '@/services/googleMapsService';
import { act, renderHook } from '@testing-library/react';
import { useGoogleMapsLazy, useGoogleMapsLazyAggressive, useGoogleMapsLazyOptimized } from './useGoogleMapsLazy';

// Mock the lazy loader service
jest.mock('@/services/googleMapsLazyLoader');
const MockedGoogleMapsLazyLoader = GoogleMapsLazyLoader as jest.Mocked<typeof GoogleMapsLazyLoader>;

// Mock the Google Maps service
jest.mock('@/services/googleMapsService');
const MockedGoogleMapsService = GoogleMapsService as jest.Mocked<typeof GoogleMapsService>;

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
(global as any).IntersectionObserver = mockIntersectionObserver;

describe('useGoogleMapsLazy', () => {
  let mockLazyLoader: any;
  let mockGoogleMapsService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock lazy loader instance
    mockLazyLoader = {
      initialize: jest.fn(),
      setupLazyLoading: jest.fn(),
      forceLoad: jest.fn(),
      reset: jest.fn(),
      getState: jest.fn().mockReturnValue({
        isLoading: false,
        isLoaded: false,
        isError: false,
        error: null,
        loadTime: null,
        retryCount: 0
      }),
      isLoaded: jest.fn().mockReturnValue(false)
    };

    // Mock Google Maps service
    mockGoogleMapsService = {
      isApiInitialized: jest.fn().mockReturnValue(false)
    };

    MockedGoogleMapsLazyLoader.getInstance.mockReturnValue(mockLazyLoader);
    MockedGoogleMapsService.getInstance.mockReturnValue(mockGoogleMapsService);

    // Mock environment variable
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useGoogleMapsLazy());

      expect(result.current.isLoaded).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.loadTime).toBe(null);
      expect(result.current.retryCount).toBe(0);
    });

    it('should initialize lazy loader with environment config', () => {
      renderHook(() => useGoogleMapsLazy());

      expect(MockedGoogleMapsLazyLoader.getInstance).toHaveBeenCalled();
      expect(mockLazyLoader.initialize).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        libraries: ['places', 'geometry'],
        language: 'en',
        region: 'AE',
        version: 'weekly'
      });
    });

    it('should handle initialization error', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const { result } = renderHook(() => useGoogleMapsLazy());

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');

      consoleError.mockRestore();
    });
  });

  describe('Setup Lazy Loading', () => {
    it('should set up lazy loading for container element', () => {
      const { result } = renderHook(() => useGoogleMapsLazy());
      const mockElement = document.createElement('div');
      const mockCleanup = jest.fn();

      mockLazyLoader.setupLazyLoading.mockReturnValue(mockCleanup);

      act(() => {
        const cleanup = result.current.setupLazyLoading(mockElement);
        expect(cleanup).toBe(mockCleanup);
      });

      expect(mockLazyLoader.setupLazyLoading).toHaveBeenCalledWith(
        mockElement,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle load success', () => {
      const onLoad = jest.fn();
      const { result } = renderHook(() => useGoogleMapsLazy({ onLoad }));
      const mockElement = document.createElement('div');

      let loadCallback: (() => void) | undefined;
      let errorCallback: ((error: Error) => void) | undefined;

      mockLazyLoader.setupLazyLoading.mockImplementation((element, onLoadCallback, onErrorCallback) => {
        loadCallback = onLoadCallback;
        errorCallback = onErrorCallback;
        return jest.fn();
      });

      act(() => {
        result.current.setupLazyLoading(mockElement);
      });

      // Simulate successful load
      act(() => {
        loadCallback?.();
      });

      expect(result.current.isLoaded).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(onLoad).toHaveBeenCalled();
    });

    it('should handle load error', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useGoogleMapsLazy({ onError }));
      const mockElement = document.createElement('div');

      let loadCallback: (() => void) | undefined;
      let errorCallback: ((error: Error) => void) | undefined;

      mockLazyLoader.setupLazyLoading.mockImplementation((element, onLoadCallback, onErrorCallback) => {
        loadCallback = onLoadCallback;
        errorCallback = onErrorCallback;
        return jest.fn();
      });

      act(() => {
        result.current.setupLazyLoading(mockElement);
      });

      // Simulate load error
      const testError = new Error('Load failed');
      act(() => {
        errorCallback?.(testError);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'LAZY_LOAD_ERROR',
        message: 'Load failed'
      }));
    });

    it('should update state from lazy loader state', () => {
      const { result } = renderHook(() => useGoogleMapsLazy());
      const mockElement = document.createElement('div');

      mockLazyLoader.getState.mockReturnValue({
        isLoading: true,
        isLoaded: false,
        isError: false,
        error: null,
        loadTime: 1500,
        retryCount: 1
      });

      act(() => {
        result.current.setupLazyLoading(mockElement);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadTime).toBe(1500);
      expect(result.current.retryCount).toBe(1);
    });
  });

  describe('Force Load', () => {
    it('should force load successfully', async () => {
      const onLoad = jest.fn();
      const { result } = renderHook(() => useGoogleMapsLazy({ onLoad }));

      mockLazyLoader.forceLoad.mockResolvedValue(undefined);

      await act(async () => {
        await result.current.forceLoad();
      });

      expect(mockLazyLoader.forceLoad).toHaveBeenCalled();
      expect(result.current.isLoaded).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(onLoad).toHaveBeenCalled();
    });

    it('should handle force load error', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useGoogleMapsLazy({ onError }));

      const testError = new Error('Force load failed');
      mockLazyLoader.forceLoad.mockRejectedValue(testError);

      await act(async () => {
        await expect(result.current.forceLoad()).rejects.toThrow('Force load failed');
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'LAZY_LOAD_ERROR',
        message: 'Force load failed'
      }));
    });

    it('should set loading state during force load', async () => {
      const { result } = renderHook(() => useGoogleMapsLazy());

      let resolveForceLoad: () => void;
      const forceLoadPromise = new Promise<void>((resolve) => {
        resolveForceLoad = resolve;
      });
      mockLazyLoader.forceLoad.mockReturnValue(forceLoadPromise);

      act(() => {
        result.current.forceLoad();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveForceLoad!();
        await forceLoadPromise;
      });

      expect(result.current.isLoaded).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset state', () => {
      const { result } = renderHook(() => useGoogleMapsLazy());

      // Set some state first
      act(() => {
        result.current.forceLoad();
      });

      act(() => {
        result.current.reset();
      });

      expect(mockLazyLoader.reset).toHaveBeenCalled();
      expect(result.current.isLoaded).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.loadTime).toBe(null);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Utilities', () => {
    it('should check if API is ready', () => {
      const { result } = renderHook(() => useGoogleMapsLazy());

      mockGoogleMapsService.isApiInitialized.mockReturnValue(true);

      expect(result.current.isApiReady()).toBe(true);

      mockGoogleMapsService.isApiInitialized.mockReturnValue(false);

      expect(result.current.isApiReady()).toBe(false);
    });

    it('should get Google Maps service', () => {
      const { result } = renderHook(() => useGoogleMapsLazy());

      expect(result.current.getGoogleMapsService()).toBe(mockGoogleMapsService);
    });
  });

  describe('Optimized Variants', () => {
    it('should use optimized options', () => {
      renderHook(() => useGoogleMapsLazyOptimized());

      expect(MockedGoogleMapsLazyLoader.getInstance).toHaveBeenCalledWith({
        rootMargin: '100px',
        threshold: 0.1,
        loadTimeout: 15000,
        retryAttempts: 2,
        retryDelay: 2000,
        preloadOnHover: true,
        preloadDelay: 300,
        enableLogging: false
      });
    });

    it('should use aggressive options', () => {
      renderHook(() => useGoogleMapsLazyAggressive());

      expect(MockedGoogleMapsLazyLoader.getInstance).toHaveBeenCalledWith({
        rootMargin: '200px',
        threshold: 0.05,
        loadTimeout: 20000,
        retryAttempts: 3,
        retryDelay: 1000,
        preloadOnHover: true,
        preloadDelay: 100,
        enableLogging: false
      });
    });
  });

  describe('Cleanup on Unmount', () => {
    it('should not update state after unmount', () => {
      const { result, unmount } = renderHook(() => useGoogleMapsLazy());

      unmount();

      // Try to update state after unmount
      act(() => {
        result.current.forceLoad();
      });

      // State should not change after unmount
      expect(result.current.isLoaded).toBe(false);
    });
  });

  describe('Error Conversion', () => {
    it('should convert Error to MapError', () => {
      const { result } = renderHook(() => useGoogleMapsLazy());
      const mockElement = document.createElement('div');

      let errorCallback: ((error: Error) => void) | undefined;

      mockLazyLoader.setupLazyLoading.mockImplementation((element, onLoadCallback, onErrorCallback) => {
        errorCallback = onErrorCallback;
        return jest.fn();
      });

      act(() => {
        result.current.setupLazyLoading(mockElement);
      });

      const testError = new Error('Test error');
      act(() => {
        errorCallback?.(testError);
      });

      expect(result.current.error).toEqual(expect.objectContaining({
        code: 'LAZY_LOAD_ERROR',
        message: 'Test error',
        details: testError,
        timestamp: expect.any(Number),
        context: {
          component: 'useGoogleMapsLazy',
          action: 'load'
        }
      }));
    });

    it('should convert unknown error to MapError', () => {
      const { result } = renderHook(() => useGoogleMapsLazy());
      const mockElement = document.createElement('div');

      let errorCallback: ((error: Error) => void) | undefined;

      mockLazyLoader.setupLazyLoading.mockImplementation((element, onLoadCallback, onErrorCallback) => {
        errorCallback = onErrorCallback;
        return jest.fn();
      });

      act(() => {
        result.current.setupLazyLoading(mockElement);
      });

      const unknownError = 'Unknown error';
      act(() => {
        errorCallback?.(unknownError as any);
      });

      expect(result.current.error).toEqual(expect.objectContaining({
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred during lazy loading',
        details: unknownError,
        timestamp: expect.any(Number),
        context: {
          component: 'useGoogleMapsLazy',
          action: 'load'
        }
      }));
    });
  });
});
