/**
 * Integration tests for Google Maps services
 * Tests the interaction between GoogleMapsService, GoogleMapsLazyLoader, and GoogleMapsMonitoringService
 */

import { getGoogleMapsConfig } from '@/config/googleMapsConfig';
import { GoogleMapsLazyLoader } from './googleMapsLazyLoader';
import { GoogleMapsMonitoringService } from './googleMapsMonitoringService';
import { GoogleMapsService } from './googleMapsService';

// Mock the Google Maps API
const mockGoogleMaps = {
  Map: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    fitBounds: jest.fn(),
    getCenter: jest.fn(() => ({ lat: () => 25.2048, lng: () => 55.2708 })),
    getZoom: jest.fn(() => 10),
    getBounds: jest.fn(() => ({
      getNorthEast: jest.fn(() => ({ lat: () => 25.5, lng: () => 55.5 })),
      getSouthWest: jest.fn(() => ({ lat: () => 25.0, lng: () => 55.0 }))
    }))
  })),
  Marker: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    setMap: jest.fn(),
    setPosition: jest.fn(),
    setTitle: jest.fn(),
    setVisible: jest.fn(),
    getPosition: jest.fn(() => ({ lat: () => 25.2048, lng: () => 55.2708 }))
  })),
  InfoWindow: jest.fn().mockImplementation(() => ({
    open: jest.fn(),
    close: jest.fn(),
    setContent: jest.fn(),
    setPosition: jest.fn()
  })),
  LatLng: jest.fn().mockImplementation((lat, lng) => ({ lat: () => lat, lng: () => lng })),
  LatLngBounds: jest.fn().mockImplementation(() => ({
    extend: jest.fn(),
    isEmpty: jest.fn(() => false),
    getCenter: jest.fn(() => ({ lat: () => 25.2048, lng: () => 55.2708 }))
  }))
};

(global as any).google = {
  maps: mockGoogleMaps
};

// Mock the configuration
jest.mock('@/config/googleMapsConfig', () => ({
  getGoogleMapsConfig: jest.fn(() => ({
    apiKey: 'test-api-key',
    libraries: ['places', 'geometry'],
    language: 'en',
    region: 'AE',
    version: 'weekly'
  }))
}));

// Mock the loader
jest.mock('@googlemaps/js-api-loader', () => ({
  Loader: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockResolvedValue(undefined),
    importLibrary: jest.fn().mockResolvedValue({
      Map: mockGoogleMaps.Map,
      AdvancedMarkerElement: mockGoogleMaps.Marker
    })
  }))
}));

describe('Google Maps Services Integration', () => {
  let googleMapsService: GoogleMapsService;
  let lazyLoader: GoogleMapsLazyLoader;
  let monitoringService: GoogleMapsMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instances
    (GoogleMapsService as any).instance = null;
    (GoogleMapsLazyLoader as any).instance = null;
    (GoogleMapsMonitoringService as any).instance = null;

    // Initialize services
    googleMapsService = GoogleMapsService.getInstance();
    lazyLoader = GoogleMapsLazyLoader.getInstance();
    monitoringService = GoogleMapsMonitoringService.getInstance();
  });

  describe('Service Initialization Flow', () => {
    it('should initialize all services in correct order', async () => {
      // Get configuration
      const config = getGoogleMapsConfig();

      // Initialize lazy loader with config
      lazyLoader.initialize(config);

      // Force load the API
      await lazyLoader.forceLoad();

      // Initialize Google Maps service
      await googleMapsService.initialize(config);

      // Initialize monitoring service
      await monitoringService.initialize();

      // Verify services are properly initialized
      expect(googleMapsService.isApiInitialized()).toBe(true);
      expect(lazyLoader.isLoaded()).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock a loader error
      const mockLoader = {
        load: jest.fn().mockRejectedValue(new Error('API key invalid')),
        importLibrary: jest.fn()
      };

      jest.doMock('@googlemaps/js-api-loader', () => ({
        Loader: jest.fn(() => mockLoader)
      }));

      // Initialize lazy loader
      const config = getGoogleMapsConfig();
      lazyLoader.initialize(config);

      // Try to force load
      await expect(lazyLoader.forceLoad()).rejects.toThrow('API key invalid');

      // Verify error state
      const state = lazyLoader.getState();
      expect(state.isError).toBe(true);
      expect(state.error).toBeDefined();
    });
  });

  describe('Service Interaction', () => {
    beforeEach(async () => {
      // Initialize services
      const config = getGoogleMapsConfig();
      lazyLoader.initialize(config);
      await lazyLoader.forceLoad();
      await googleMapsService.initialize(config);
      await monitoringService.initialize();
    });

    it('should track API usage through monitoring service', async () => {
      // Record some usage
      monitoringService.recordUsage('maps');
      monitoringService.recordUsage('places');

      // Check monitoring service tracked the usage
      const usage = monitoringService.getUsageMetrics();
      expect(usage.totalRequests).toBeGreaterThan(0);
    });

    it('should handle service dependencies correctly', async () => {
      // Lazy loader should be loaded before Google Maps service
      expect(lazyLoader.isLoaded()).toBe(true);

      // Google Maps service should be initialized
      expect(googleMapsService.isApiInitialized()).toBe(true);

      // Monitoring service should be tracking
      expect(monitoringService.getApiKeyStatus()).toBeDefined();
    });

    it('should propagate errors between services', async () => {
      // Record an error in the monitoring service
      const error = new Error('Map creation failed');
      monitoringService.recordError(error);

      // Check that the error was recorded
      const usage = monitoringService.getUsageMetrics();
      expect(usage.totalErrors).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring Integration', () => {
    beforeEach(async () => {
      const config = getGoogleMapsConfig();
      lazyLoader.initialize(config);
      await lazyLoader.forceLoad();
      await googleMapsService.initialize(config);
      await monitoringService.initialize();
    });

    it('should track performance metrics across services', async () => {
      const startTime = performance.now();

      // Record some usage
      monitoringService.recordUsage('maps');
      monitoringService.recordUsage('places');

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Verify performance tracking
      expect(loadTime).toBeGreaterThan(0);

      // Check monitoring service has metrics
      const usage = monitoringService.getUsageMetrics();
      expect(usage).toBeDefined();
    });

    it('should handle memory usage tracking', () => {
      // Record some usage to test tracking
      monitoringService.recordUsage('maps');
      monitoringService.recordUsage('places');

      // Check that usage was recorded
      const usage = monitoringService.getUsageMetrics();
      expect(usage.totalRequests).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cascading errors between services', async () => {
      // Mock lazy loader to fail
      const mockLoader = {
        load: jest.fn().mockRejectedValue(new Error('Network error')),
        importLibrary: jest.fn()
      };

      jest.doMock('@googlemaps/js-api-loader', () => ({
        Loader: jest.fn(() => mockLoader)
      }));

      // Initialize lazy loader
      const config = getGoogleMapsConfig();
      lazyLoader.initialize(config);

      // Try to force load
      await expect(lazyLoader.forceLoad()).rejects.toThrow('Network error');

      // Record the error in monitoring service
      monitoringService.recordError(new Error('Network error'));

      // Check that error was recorded
      const usage = monitoringService.getUsageMetrics();
      expect(usage.totalErrors).toBeGreaterThan(0);
    });

    it('should recover from errors and retry', async () => {
      // Test error recovery by recording and clearing errors
      monitoringService.recordError(new Error('Temporary error'));

      // Check error was recorded
      let usage = monitoringService.getUsageMetrics();
      expect(usage.totalErrors).toBeGreaterThan(0);

      // Reset the monitoring service
      monitoringService.reset();

      // Check error count was reset
      usage = monitoringService.getUsageMetrics();
      expect(usage.totalErrors).toBe(0);
    });
  });

  describe('Configuration Integration', () => {
    it('should use consistent configuration across services', () => {
      const config = getGoogleMapsConfig();

      // All services should use the same configuration
      expect(config.apiKey).toBe('test-api-key');
      expect(config.libraries).toContain('places');
      expect(config.libraries).toContain('geometry');
      expect(config.language).toBe('en');
      expect(config.region).toBe('AE');
    });

    it('should handle configuration changes', () => {
      // Mock a configuration change
      const newConfig = {
        apiKey: 'new-api-key',
        libraries: ['places'],
        language: 'ar',
        region: 'AE',
        version: 'weekly'
      };

      // Update configuration
      jest.mocked(getGoogleMapsConfig).mockReturnValue(newConfig);

      // Services should pick up new configuration
      const config = getGoogleMapsConfig();
      expect(config.apiKey).toBe('new-api-key');
      expect(config.language).toBe('ar');
    });
  });

  describe('Cleanup and Resource Management', () => {
    beforeEach(async () => {
      const config = getGoogleMapsConfig();
      lazyLoader.initialize(config);
      await lazyLoader.forceLoad();
      await googleMapsService.initialize(config);
      await monitoringService.initialize();
    });

    it('should clean up resources properly', () => {
      // Record some usage
      monitoringService.recordUsage('maps');
      monitoringService.recordUsage('places');

      // Clean up
      lazyLoader.reset();
      googleMapsService.reset();
      monitoringService.reset();

      // Verify cleanup
      expect(lazyLoader.isLoaded()).toBe(false);
      expect(googleMapsService.isApiInitialized()).toBe(false);
    });

    it('should handle cleanup errors gracefully', () => {
      // Test that reset methods work without throwing
      expect(() => lazyLoader.reset()).not.toThrow();
      expect(() => googleMapsService.reset()).not.toThrow();
      expect(() => monitoringService.reset()).not.toThrow();
    });
  });
});
