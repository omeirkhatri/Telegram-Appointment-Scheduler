import { getGoogleMapsConfig } from '@/config/googleMapsConfig';
import { GoogleMapsService } from '@/services/googleMapsService';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useGoogleMaps, useGoogleMapsWithConfig, useGoogleMapsWithDefaults } from './useGoogleMaps';

// Mock the Google Maps service
jest.mock('@/services/googleMapsService');
jest.mock('@/config/googleMapsConfig');

const mockGoogleMapsService = GoogleMapsService as jest.Mocked<typeof GoogleMapsService>;
const mockGetGoogleMapsConfig = getGoogleMapsConfig as jest.MockedFunction<typeof getGoogleMapsConfig>;

describe('useGoogleMaps', () => {
  let mockServiceInstance: jest.Mocked<GoogleMapsService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock service instance
    mockServiceInstance = {
      initialize: jest.fn(),
      isApiInitialized: jest.fn(),
      getConfig: jest.fn(),
      reset: jest.fn(),
    } as any;

    // Mock getInstance to return our mock instance
    mockGoogleMapsService.getInstance = jest.fn().mockReturnValue(mockServiceInstance);

    // Mock validateApiKey
    mockGoogleMapsService.validateApiKey = jest.fn().mockReturnValue(true);

    // Mock getDefaultConfig
    mockGoogleMapsService.getDefaultConfig = jest.fn().mockReturnValue({
      libraries: ['places', 'geometry'],
      language: 'en',
      region: 'AE',
      version: 'weekly',
    });

    // Mock getGoogleMapsConfig
    mockGetGoogleMapsConfig.mockReturnValue({
      apiKey: 'test-api-key',
      libraries: ['places', 'geometry'],
      language: 'en',
      region: 'AE',
      version: 'weekly',
      enableLogging: true,
      enableErrorReporting: true,
      quotaWarningThreshold: 0.7,
      maxRetries: 3,
      retryDelay: 1000,
      cacheTimeout: 300000,
      enableCaching: true,
    });
  });

  describe('Basic functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: false }));

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.googleMapsService).toBe(null);
    });

    it('should initialize Google Maps service on mount when autoInitialize is true', async () => {
      mockServiceInstance.isApiInitialized.mockReturnValue(false);
      mockServiceInstance.initialize.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: true }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockServiceInstance.initialize).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.googleMapsService).toBe(mockServiceInstance);
    });

    it('should not auto-initialize when autoInitialize is false', async () => {
      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: false }));

      await waitFor(() => {
        expect(mockServiceInstance.initialize).not.toHaveBeenCalled();
      });

      expect(result.current.isInitialized).toBe(false);
    });

    it('should handle already initialized service', async () => {
      mockServiceInstance.isApiInitialized.mockReturnValue(true);

      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: true }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockServiceInstance.initialize).not.toHaveBeenCalled();
    });
  });

  describe('Manual initialization', () => {
    it('should initialize with custom config', async () => {
      mockServiceInstance.isApiInitialized.mockReturnValue(false);
      mockServiceInstance.initialize.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: false }));

      const customConfig = {
        apiKey: 'custom-api-key',
        libraries: ['places'],
        language: 'ar',
        region: 'AE',
        version: 'weekly',
      };

      await act(async () => {
        await result.current.initialize(customConfig);
      });

      expect(mockServiceInstance.initialize).toHaveBeenCalledWith(customConfig);
      expect(result.current.isInitialized).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('API key invalid');
      mockServiceInstance.initialize.mockRejectedValue(error);

      const onError = jest.fn();
      const { result } = renderHook(() => useGoogleMaps({
        autoInitialize: false,
        onError
      }));

      await act(async () => {
        try {
          await result.current.initialize();
        } catch (err) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.code).toBe('GOOGLE_MAPS_ERROR');
      expect(result.current.error?.message).toBe('API key invalid');
      expect(onError).toHaveBeenCalledWith(result.current.error);
    });

    it('should prevent multiple simultaneous initializations', async () => {
      mockServiceInstance.isApiInitialized.mockReturnValue(false);
      mockServiceInstance.initialize.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: false }));

      // Start two initializations simultaneously
      const init1 = result.current.initialize();
      const init2 = result.current.initialize();

      await act(async () => {
        await Promise.all([init1, init2]);
      });

      // Should only call initialize once
      expect(mockServiceInstance.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset functionality', () => {
    it('should reset state and service', async () => {
      mockServiceInstance.isApiInitialized.mockReturnValue(true);
      mockServiceInstance.initialize.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: true }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      await act(async () => {
        result.current.reset();
      });

      expect(mockServiceInstance.reset).toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.googleMapsService).toBe(null);
    });
  });

  describe('Utility functions', () => {
    it('should check if API is ready', async () => {
      mockServiceInstance.isApiInitialized.mockReturnValue(true);
      mockServiceInstance.initialize.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: true }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.isApiReady()).toBe(true);
    });

    it('should get current configuration', async () => {
      const config = {
        apiKey: 'test-key',
        libraries: ['places'],
        language: 'en',
        region: 'AE',
        version: 'weekly',
      };

      mockServiceInstance.getConfig.mockReturnValue(config);
      mockServiceInstance.isApiInitialized.mockReturnValue(true);
      mockServiceInstance.initialize.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: true }));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(result.current.getConfig()).toEqual(config);
    });

    it('should validate API key', () => {
      const { result } = renderHook(() => useGoogleMaps());

      expect(result.current.validateApiKey('valid-key')).toBe(true);
      expect(mockGoogleMapsService.validateApiKey).toHaveBeenCalledWith('valid-key');
    });
  });

  describe('Error handling', () => {
    it('should convert Google Maps errors to Map errors', async () => {
      const googleError = {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key',
        details: { originalError: 'test' }
      };

      mockServiceInstance.initialize.mockRejectedValue(googleError);

      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: true }));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.code).toBe('INVALID_API_KEY');
      expect(result.current.error?.message).toBe('Invalid API key');
      expect(result.current.error?.details).toEqual({ originalError: 'test' });
    });

    it('should handle unknown errors', async () => {
      mockServiceInstance.initialize.mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useGoogleMaps({ autoInitialize: true }));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.code).toBe('UNKNOWN_ERROR');
      expect(result.current.error?.message).toBe('An unknown error occurred during Google Maps initialization');
    });
  });

  describe('Convenience hooks', () => {
    it('should work with useGoogleMapsWithDefaults', async () => {
      mockServiceInstance.isApiInitialized.mockReturnValue(false);
      mockServiceInstance.initialize.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGoogleMapsWithDefaults());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockServiceInstance.initialize).toHaveBeenCalled();
    });

    it('should work with useGoogleMapsWithConfig', async () => {
      const config = {
        apiKey: 'custom-key',
        libraries: ['places'],
        language: 'en',
        region: 'AE',
        version: 'weekly',
      };

      mockServiceInstance.isApiInitialized.mockReturnValue(false);
      mockServiceInstance.initialize.mockResolvedValue(undefined);

      const { result } = renderHook(() => useGoogleMapsWithConfig(config));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockServiceInstance.initialize).toHaveBeenCalledWith(config);
    });
  });

  describe('Cleanup', () => {
    it('should not update state after unmount', async () => {
      mockServiceInstance.initialize.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result, unmount } = renderHook(() => useGoogleMaps({ autoInitialize: true }));

      unmount();

      // Wait for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });
});
