import { GoogleMapsLazyLoader, getGoogleMapsLazyLoader, initializeLazyLoader } from './googleMapsLazyLoader';
import { GoogleMapsService } from './googleMapsService';

// Mock Google Maps service
jest.mock('./googleMapsService');
const MockedGoogleMapsService = GoogleMapsService as jest.Mocked<typeof GoogleMapsService>;

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
(global as any).IntersectionObserver = mockIntersectionObserver;

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

describe('GoogleMapsLazyLoader', () => {
  let lazyLoader: GoogleMapsLazyLoader;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockConfig = {
      apiKey: 'test-api-key',
      libraries: ['places', 'geometry'],
      language: 'en',
      region: 'AE',
      version: 'weekly'
    };

    // Reset singleton
    (GoogleMapsLazyLoader as any).instance = undefined;
    lazyLoader = GoogleMapsLazyLoader.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
    lazyLoader.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GoogleMapsLazyLoader.getInstance();
      const instance2 = GoogleMapsLazyLoader.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should accept options on first creation', () => {
      const options = { rootMargin: '100px', threshold: 0.2 };
      const instance = GoogleMapsLazyLoader.getInstance(options);
      expect(instance).toBeDefined();
    });
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      lazyLoader.initialize(mockConfig);
      expect(lazyLoader.getState().isLoaded).toBe(false);
    });

    it('should throw error if setupLazyLoading called without initialization', () => {
      const mockElement = document.createElement('div');
      expect(() => {
        lazyLoader.setupLazyLoading(mockElement);
      }).toThrow('Lazy loader not initialized');
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      lazyLoader.initialize(mockConfig);
    });

    it('should return initial state', () => {
      const state = lazyLoader.getState();
      expect(state).toEqual({
        isLoading: false,
        isLoaded: false,
        isError: false,
        error: null,
        loadTime: null,
        retryCount: 0
      });
    });

    it('should check if loaded', () => {
      expect(lazyLoader.isLoaded()).toBe(false);
    });
  });

  describe('Force Load', () => {
    beforeEach(() => {
      lazyLoader.initialize(mockConfig);
      MockedGoogleMapsService.getInstance.mockReturnValue({
        initialize: jest.fn().mockResolvedValue(undefined),
        isApiInitialized: jest.fn().mockReturnValue(true)
      } as any);
    });

    it('should force load successfully', async () => {
      const promise = lazyLoader.forceLoad();
      expect(lazyLoader.getState().isLoading).toBe(true);

      await promise;

      expect(lazyLoader.getState().isLoaded).toBe(true);
      expect(lazyLoader.getState().isLoading).toBe(false);
      expect(lazyLoader.getState().isError).toBe(false);
    });

    it('should handle load timeout', async () => {
      MockedGoogleMapsService.getInstance.mockReturnValue({
        initialize: jest.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 15000))
        ),
        isApiInitialized: jest.fn().mockReturnValue(false)
      } as any);

      const promise = lazyLoader.forceLoad();

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(11000);

      await expect(promise).rejects.toThrow('Google Maps API load timeout');
      expect(lazyLoader.getState().isError).toBe(true);
    }, 10000);

    it('should retry on failure', async () => {
      let callCount = 0;
      MockedGoogleMapsService.getInstance.mockReturnValue({
        initialize: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Network error');
          }
          return Promise.resolve();
        }),
        isApiInitialized: jest.fn().mockReturnValue(true)
      } as any);

      await lazyLoader.forceLoad();

      expect(callCount).toBe(3); // Initial + 2 retries
      expect(lazyLoader.getState().isLoaded).toBe(true);
    }, 10000);

    it('should fail after max retries', async () => {
      MockedGoogleMapsService.getInstance.mockReturnValue({
        initialize: jest.fn().mockRejectedValue(new Error('Persistent error')),
        isApiInitialized: jest.fn().mockReturnValue(false)
      } as any);

      await expect(lazyLoader.forceLoad()).rejects.toThrow('Persistent error');
      expect(lazyLoader.getState().isError).toBe(true);
      expect(lazyLoader.getState().retryCount).toBe(3);
    }, 10000);
  });

  describe('Intersection Observer Setup', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      lazyLoader.initialize(mockConfig);
      mockElement = document.createElement('div');
      MockedGoogleMapsService.getInstance.mockReturnValue({
        initialize: jest.fn().mockResolvedValue(undefined),
        isApiInitialized: jest.fn().mockReturnValue(true)
      } as any);
    });

    it('should set up intersection observer', () => {
      const cleanup = lazyLoader.setupLazyLoading(mockElement);
      expect(mockIntersectionObserver).toHaveBeenCalled();
      expect(cleanup).toBeInstanceOf(Function);
    });

    it('should load when element comes into view', () => {
      const cleanup = lazyLoader.setupLazyLoading(mockElement);

      // Simulate intersection observer callback
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      const mockEntry = {
        isIntersecting: true,
        target: mockElement
      };

      observerCallback([mockEntry]);

      expect(lazyLoader.getState().isLoading).toBe(true);
      cleanup();
    });

    it('should not load when element is not intersecting', () => {
      const cleanup = lazyLoader.setupLazyLoading(mockElement);

      // Simulate intersection observer callback
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      const mockEntry = {
        isIntersecting: false,
        target: mockElement
      };

      observerCallback([mockEntry]);

      expect(lazyLoader.getState().isLoading).toBe(false);
      cleanup();
    });

    it('should fallback to immediate load if IntersectionObserver not available', () => {
      // Remove IntersectionObserver
      delete (global as any).IntersectionObserver;

      const cleanup = lazyLoader.setupLazyLoading(mockElement);

      // Should start loading immediately
      expect(lazyLoader.getState().isLoading).toBe(true);
      cleanup();

      // Restore IntersectionObserver
      (global as any).IntersectionObserver = mockIntersectionObserver;
    });
  });

  describe('Hover Preloading', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      lazyLoader.initialize(mockConfig);
      mockElement = document.createElement('div');
      MockedGoogleMapsService.getInstance.mockReturnValue({
        initialize: jest.fn().mockResolvedValue(undefined),
        isApiInitialized: jest.fn().mockReturnValue(true)
      } as any);
    });

    it('should set up hover preloading', () => {
      const cleanup = lazyLoader.setupLazyLoading(mockElement);

      // Simulate mouse enter
      const mouseEnterEvent = new Event('mouseenter');
      mockElement.dispatchEvent(mouseEnterEvent);

      // Should not load immediately due to delay
      expect(lazyLoader.getState().isLoading).toBe(false);

      // Fast-forward past delay
      jest.advanceTimersByTime(600);

      expect(lazyLoader.getState().isLoading).toBe(true);
      cleanup();
    });

    it('should cancel preload on mouse leave', () => {
      const cleanup = lazyLoader.setupLazyLoading(mockElement);

      // Simulate mouse enter
      const mouseEnterEvent = new Event('mouseenter');
      mockElement.dispatchEvent(mouseEnterEvent);

      // Simulate mouse leave before delay
      const mouseLeaveEvent = new Event('mouseleave');
      mockElement.dispatchEvent(mouseLeaveEvent);

      // Fast-forward past delay
      jest.advanceTimersByTime(600);

      // Should not have started loading
      expect(lazyLoader.getState().isLoading).toBe(false);
      cleanup();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on reset', () => {
      lazyLoader.initialize(mockConfig);
      const mockElement = document.createElement('div');
      const cleanup = lazyLoader.setupLazyLoading(mockElement);

      // Set up some state
      (lazyLoader as any).state.isLoading = true;

      lazyLoader.reset();

      expect(lazyLoader.getState().isLoading).toBe(false);
      expect(lazyLoader.getState().isLoaded).toBe(false);
    });

    it('should clean up on cleanup function call', () => {
      lazyLoader.initialize(mockConfig);
      const mockElement = document.createElement('div');
      const cleanup = lazyLoader.setupLazyLoading(mockElement);

      // Should not throw
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('Convenience Functions', () => {
    it('should get lazy loader instance', () => {
      const instance = getGoogleMapsLazyLoader();
      expect(instance).toBeInstanceOf(GoogleMapsLazyLoader);
    });

    it('should initialize with environment config', () => {
      const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';

      const instance = initializeLazyLoader();
      expect(instance).toBeInstanceOf(GoogleMapsLazyLoader);

      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalEnv;
    });

    it('should throw error if API key not set', () => {
      const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      expect(() => initializeLazyLoader()).toThrow('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is not set');

      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalEnv;
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      lazyLoader.initialize(mockConfig);
      MockedGoogleMapsService.getInstance.mockReturnValue({
        initialize: jest.fn().mockResolvedValue(undefined),
        isApiInitialized: jest.fn().mockReturnValue(true)
      } as any);
    });

    it('should track load time', async () => {
      const mockPerformanceNow = jest.fn()
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time

      Object.defineProperty(global, 'performance', {
        value: { now: mockPerformanceNow },
        writable: true,
      });

      await lazyLoader.forceLoad();

      expect(lazyLoader.getState().loadTime).toBe(500);
    });
  });
});
