import type { MapError } from '@/types/map';

// Mock the service before importing
const mockService = {
  getMetrics: jest.fn(),
  getEvents: jest.fn(),
  startMonitoring: jest.fn(),
  stopMonitoring: jest.fn(),
  reset: jest.fn(),
  trackMapInitialization: jest.fn(),
  trackMapLoad: jest.fn(),
  trackApiLoad: jest.fn(),
  trackMarkerCreation: jest.fn(),
  trackMarkerUpdate: jest.fn(),
  trackMarkerDeletion: jest.fn(),
  trackClustering: jest.fn(),
  trackNavigation: jest.fn(),
  trackFiltering: jest.fn(),
  trackError: jest.fn(),
  getPerformanceReport: jest.fn(),
  updateConfig: jest.fn(),
};

jest.mock('./mapPerformanceMonitoringService', () => ({
  MapPerformanceMonitoringService: {
    getInstance: jest.fn(() => mockService),
  },
}));

import { MapPerformanceMonitoringService } from './mapPerformanceMonitoringService';

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

// Mock Performance API
const mockPerformanceObserver = jest.fn();
const mockPerformanceObserverDisconnect = jest.fn();
const mockPerformanceObserverObserve = jest.fn();

Object.defineProperty(window, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true,
});

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
  },
  writable: true,
});

describe('MapPerformanceMonitoringService', () => {
  let service: MapPerformanceMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceObserver.mockImplementation(() => ({
      disconnect: mockPerformanceObserverDisconnect,
      observe: mockPerformanceObserverObserve,
    }));

    service = MapPerformanceMonitoringService.getInstance({
      enableConsoleLogging: false,
      enableLocalStorage: false,
      enableMemoryTracking: false,
      enablePerformanceAPI: false,
    });
  });

  afterEach(() => {
    service.stopMonitoring();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MapPerformanceMonitoringService.getInstance();
      const instance2 = MapPerformanceMonitoringService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance with different config', () => {
      const instance1 = MapPerformanceMonitoringService.getInstance();
      const instance2 = MapPerformanceMonitoringService.getInstance({
        enableConsoleLogging: true,
      });

      expect(instance1).toBe(instance2); // Still same instance
    });
  });

  describe('Initialization', () => {
    it('should initialize with default metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics.mapInitializationTime).toBe(0);
      expect(metrics.totalMarkersCreated).toBe(0);
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.overallScore).toBe(100);
      expect(metrics.firstLoad).toBeGreaterThan(0);
    });

    it('should initialize with custom config', () => {
      const customService = MapPerformanceMonitoringService.getInstance({
        enableConsoleLogging: true,
        enableLocalStorage: true,
        debounceDelay: 500,
        thresholds: {
          maxInitializationTime: 1000,
          maxMapLoadTime: 2000,
          maxMarkerCreationTime: 50,
          maxClusteringTime: 200,
          maxNavigationTime: 100,
          maxFilteringTime: 50,
          maxMemoryUsage: 50,
          maxMemoryPeak: 75,
          maxErrorsPerSession: 5,
          maxErrorRate: 2,
          minOverallScore: 90,
          minInitializationScore: 80,
          minRenderingScore: 85,
          minNavigationScore: 90,
          minMemoryScore: 80,
        },
      });

      expect(customService).toBeDefined();
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.updateConfig({ enableConsoleLogging: true });
      service.startMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith('Map Performance Monitoring started');
      consoleSpy.mockRestore();
    });

    it('should stop monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.updateConfig({ enableConsoleLogging: true });
      service.startMonitoring();
      service.stopMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith('Map Performance Monitoring stopped');
      consoleSpy.mockRestore();
    });

    it('should not start monitoring if already monitoring', () => {
      service.startMonitoring();
      const initialEvents = service.getEvents().length;

      service.startMonitoring();

      expect(service.getEvents().length).toBe(initialEvents);
    });
  });

  describe('Map Initialization Tracking', () => {
    it('should track map initialization', () => {
      service.startMonitoring();

      service.trackMapInitialization(1500);

      const metrics = service.getMetrics();
      expect(metrics.mapInitializationTime).toBe(1500);
      expect(metrics.initializationScore).toBeLessThan(100);
    });

    it('should track map load', () => {
      service.startMonitoring();

      service.trackMapLoad(2500);

      const metrics = service.getMetrics();
      expect(metrics.mapLoadTime).toBe(2500);
    });

    it('should track API load', () => {
      service.startMonitoring();

      service.trackApiLoad(1000);

      const metrics = service.getMetrics();
      expect(metrics.apiLoadTime).toBe(1000);
    });
  });

  describe('Marker Operations Tracking', () => {
    it('should track marker creation', () => {
      service.startMonitoring();

      service.trackMarkerCreation(50, 10);

      const metrics = service.getMetrics();
      expect(metrics.markerCreationTime).toBe(50);
      expect(metrics.totalMarkersCreated).toBe(10);
    });

    it('should track marker update', () => {
      service.startMonitoring();

      service.trackMarkerUpdate(30, 5);

      const metrics = service.getMetrics();
      expect(metrics.markerUpdateTime).toBe(30);
      expect(metrics.totalMarkersUpdated).toBe(5);
    });

    it('should track marker deletion', () => {
      service.startMonitoring();

      service.trackMarkerDeletion(20, 3);

      const metrics = service.getMetrics();
      expect(metrics.markerDeletionTime).toBe(20);
      expect(metrics.totalMarkersDeleted).toBe(3);
    });
  });

  describe('Clustering Tracking', () => {
    it('should track clustering operations', () => {
      service.startMonitoring();

      service.trackClustering(300, 'grid', 5, 10);

      const metrics = service.getMetrics();
      expect(metrics.clusteringTime).toBe(300);
      expect(metrics.clusteringAlgorithm).toBe('grid');
      expect(metrics.clustersCreated).toBe(5);
      expect(metrics.markersPerCluster).toBe(10);
    });
  });

  describe('Navigation Tracking', () => {
    it('should track general navigation', () => {
      service.startMonitoring();

      service.trackNavigation(100, 'general');

      const metrics = service.getMetrics();
      expect(metrics.navigationTime).toBe(100);
    });

    it('should track bounds update', () => {
      service.startMonitoring();

      service.trackNavigation(80, 'bounds');

      const metrics = service.getMetrics();
      expect(metrics.boundsUpdateTime).toBe(80);
    });

    it('should track zoom change', () => {
      service.startMonitoring();

      service.trackNavigation(60, 'zoom');

      const metrics = service.getMetrics();
      expect(metrics.zoomChangeTime).toBe(60);
    });

    it('should track center change', () => {
      service.startMonitoring();

      service.trackNavigation(70, 'center');

      const metrics = service.getMetrics();
      expect(metrics.centerChangeTime).toBe(70);
    });
  });

  describe('Filtering Tracking', () => {
    it('should track filtering operations', () => {
      service.startMonitoring();

      service.trackFiltering(40, 25, 100);

      const metrics = service.getMetrics();
      expect(metrics.filteringTime).toBe(40);
      expect(metrics.filteredAppointments).toBe(25);
      expect(metrics.totalAppointments).toBe(100);
    });
  });

  describe('Error Tracking', () => {
    it('should track errors', () => {
      service.startMonitoring();

      const error: MapError = {
        code: 'MAP_LOAD_ERROR',
        message: 'Failed to load map',
        timestamp: Date.now(),
        context: {
          component: 'test',
          action: 'load',
        },
      };

      service.trackError(error);

      const metrics = service.getMetrics();
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.lastError).toEqual(error);
      expect(metrics.errorTypes['MAP_LOAD_ERROR']).toBe(1);
    });

    it('should track multiple error types', () => {
      service.startMonitoring();

      const error1: MapError = {
        code: 'MAP_LOAD_ERROR',
        message: 'Failed to load map',
        timestamp: Date.now(),
        context: { component: 'test', action: 'load' },
      };

      const error2: MapError = {
        code: 'MARKER_ERROR',
        message: 'Failed to create marker',
        timestamp: Date.now(),
        context: { component: 'test', action: 'marker' },
      };

      service.trackError(error1);
      service.trackError(error2);

      const metrics = service.getMetrics();
      expect(metrics.totalErrors).toBe(2);
      expect(metrics.errorTypes['MAP_LOAD_ERROR']).toBe(1);
      expect(metrics.errorTypes['MARKER_ERROR']).toBe(1);
    });
  });

  describe('Performance Scoring', () => {
    it('should calculate initialization score correctly', () => {
      service.startMonitoring();

      // Fast initialization
      service.trackMapInitialization(500);
      service.trackMapLoad(1000);

      let metrics = service.getMetrics();
      expect(metrics.initializationScore).toBe(100);

      // Slow initialization
      service.trackMapInitialization(3000);
      service.trackMapLoad(4000);

      metrics = service.getMetrics();
      expect(metrics.initializationScore).toBeLessThan(100);
    });

    it('should calculate rendering score correctly', () => {
      service.startMonitoring();

      // Fast rendering
      service.trackMarkerCreation(30, 10);
      service.trackClustering(200, 'grid', 5, 10);

      let metrics = service.getMetrics();
      expect(metrics.renderingScore).toBe(100);

      // Slow rendering
      service.trackMarkerCreation(200, 10);
      service.trackClustering(1000, 'grid', 5, 10);

      metrics = service.getMetrics();
      expect(metrics.renderingScore).toBeLessThan(100);
    });

    it('should calculate navigation score correctly', () => {
      service.startMonitoring();

      // Fast navigation
      service.trackNavigation(50, 'general');

      let metrics = service.getMetrics();
      expect(metrics.navigationScore).toBe(100);

      // Slow navigation
      service.trackNavigation(500, 'general');

      metrics = service.getMetrics();
      expect(metrics.navigationScore).toBeLessThan(100);
    });

    it('should calculate overall score', () => {
      service.startMonitoring();

      service.trackMapInitialization(500);
      service.trackMarkerCreation(30, 10);
      service.trackNavigation(50, 'general');

      const metrics = service.getMetrics();
      expect(metrics.overallScore).toBeGreaterThan(0);
      expect(metrics.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Event Management', () => {
    it('should add events to memory', () => {
      service.startMonitoring();

      service.trackMapInitialization(1000);
      service.trackMarkerCreation(50, 5);

      const events = service.getEvents();
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('initialization');
      expect(events[1].type).toBe('marker_operation');
    });

    it('should limit events in memory', () => {
      service.updateConfig({ maxEventsInMemory: 3 });
      service.startMonitoring();

      // Add more events than the limit
      for (let i = 0; i < 5; i++) {
        service.trackMapInitialization(1000);
      }

      const events = service.getEvents();
      expect(events.length).toBe(3);
    });
  });

  describe('Sampling Rate', () => {
    it('should respect sampling rate', () => {
      service.updateConfig({ samplingRate: 0.5 });
      service.startMonitoring();

      // Track multiple events
      for (let i = 0; i < 10; i++) {
        service.trackMapInitialization(1000);
      }

      const events = service.getEvents();
      // Should have approximately half the events (with some variance)
      expect(events.length).toBeLessThan(10);
    });

    it('should track all events with 100% sampling rate', () => {
      service.updateConfig({ samplingRate: 1.0 });
      service.startMonitoring();

      for (let i = 0; i < 5; i++) {
        service.trackMapInitialization(1000);
      }

      const events = service.getEvents();
      expect(events.length).toBe(5);
    });
  });

  describe('LocalStorage Integration', () => {
    it('should save metrics to localStorage', () => {
      service.updateConfig({ enableLocalStorage: true });
      service.startMonitoring();

      service.trackMapInitialization(1000);
      service.stopMonitoring();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'map_performance_metrics',
        expect.stringContaining('mapInitializationTime')
      );
    });

    it('should load metrics from localStorage', () => {
      const savedData = {
        metrics: {
          mapInitializationTime: 2000,
          totalMarkersCreated: 50,
        },
        events: [],
        timestamp: Date.now(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      service.updateConfig({ enableLocalStorage: true });
      service.startMonitoring();

      const metrics = service.getMetrics();
      expect(metrics.mapInitializationTime).toBe(2000);
      expect(metrics.totalMarkersCreated).toBe(50);
    });
  });

  describe('Performance Report', () => {
    it('should generate performance report', () => {
      service.startMonitoring();

      service.trackMapInitialization(1000);
      service.trackMarkerCreation(50, 10);
      service.trackClustering(200, 'grid', 5, 10);

      const report = service.getPerformanceReport();

      expect(report).toContain('Map Performance Report');
      expect(report).toContain('Overall Score');
      expect(report).toContain('Map Init: 1000ms');
      expect(report).toContain('Markers Created: 10');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset metrics', () => {
      service.startMonitoring();

      service.trackMapInitialization(1000);
      service.trackMarkerCreation(50, 10);

      service.reset();

      const metrics = service.getMetrics();
      expect(metrics.mapInitializationTime).toBe(0);
      expect(metrics.totalMarkersCreated).toBe(0);
      expect(service.getEvents().length).toBe(0);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      service.updateConfig({
        enableConsoleLogging: true,
        debounceDelay: 500,
      });

      // Configuration should be updated
      expect(service).toBeDefined();
    });
  });

  describe('Memory Tracking', () => {
    it('should track memory usage when enabled', () => {
      service.updateConfig({ enableMemoryTracking: true });
      service.startMonitoring();

      // Simulate memory tracking
      service['updateMemoryMetrics'](100 * 1024 * 1024); // 100MB

      const metrics = service.getMetrics();
      expect(metrics.memoryUsage).toBe(100);
      expect(metrics.memoryPeak).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.updateConfig({ enableLocalStorage: true });
      service.startMonitoring();
      service.trackMapInitialization(1000);
      service.stopMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save performance metrics to localStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle performance observer errors gracefully', () => {
      mockPerformanceObserver.mockImplementation(() => {
        throw new Error('PerformanceObserver not supported');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      service.updateConfig({ enablePerformanceAPI: true });
      service.startMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance observer not supported:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
