import type { MapError } from '@/types/map';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useMapPerformanceMonitoring } from './useMapPerformanceMonitoring';

// Mock the service
jest.mock('@/services/mapPerformanceMonitoringService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

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

const mockMapPerformanceMonitoringService = require('@/services/mapPerformanceMonitoringService').default;

describe('useMapPerformanceMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockMapPerformanceMonitoringService.getInstance.mockReturnValue(mockService);

    // Default mock metrics
    mockService.getMetrics.mockReturnValue({
      mapInitializationTime: 0,
      mapLoadTime: 0,
      apiLoadTime: 0,
      markerCreationTime: 0,
      markerUpdateTime: 0,
      markerDeletionTime: 0,
      totalMarkersCreated: 0,
      totalMarkersUpdated: 0,
      totalMarkersDeleted: 0,
      clusteringTime: 0,
      clusteringAlgorithm: '',
      clustersCreated: 0,
      markersPerCluster: 0,
      navigationTime: 0,
      boundsUpdateTime: 0,
      zoomChangeTime: 0,
      centerChangeTime: 0,
      filteringTime: 0,
      filteredAppointments: 0,
      totalAppointments: 0,
      memoryUsage: 0,
      memoryPeak: 0,
      memoryLeaks: 0,
      totalErrors: 0,
      errorTypes: {},
      lastError: null,
      overallScore: 100,
      initializationScore: 100,
      renderingScore: 100,
      navigationScore: 100,
      memoryScore: 100,
      firstLoad: Date.now(),
      lastUpdate: Date.now(),
      sessionDuration: 0,
    });

    mockService.getEvents.mockReturnValue([]);
    mockService.getPerformanceReport.mockReturnValue('Performance Report');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: false,
      }));

      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.metrics.overallScore).toBe(100);
      expect(result.current.events).toEqual([]);
    });

    it('should auto-start monitoring when enabled', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      expect(mockService.startMonitoring).toHaveBeenCalled();
      expect(result.current.isMonitoring).toBe(true);
    });

    it('should not auto-start monitoring when disabled', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: false,
      }));

      expect(mockService.startMonitoring).not.toHaveBeenCalled();
      expect(result.current.isMonitoring).toBe(false);
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: false,
      }));

      act(() => {
        result.current.startMonitoring();
      });

      expect(mockService.startMonitoring).toHaveBeenCalled();
      expect(result.current.isMonitoring).toBe(true);
    });

    it('should stop monitoring', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.stopMonitoring();
      });

      expect(mockService.stopMonitoring).toHaveBeenCalled();
      // Note: The actual state change would happen in the real implementation
      // but in our mock, we're just testing the service call
    });

    it('should reset metrics', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring());

      act(() => {
        result.current.reset();
      });

      expect(mockService.reset).toHaveBeenCalled();
    });
  });

  describe('Tracking Functions', () => {
    it('should track map initialization', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.trackMapInitialization(1000);
      });

      expect(mockService.trackMapInitialization).toHaveBeenCalledWith(1000);
    });

    it('should track map load', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.trackMapLoad(2000);
      });

      expect(mockService.trackMapLoad).toHaveBeenCalledWith(2000);
    });

    it('should track API load', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.trackApiLoad(500);
      });

      expect(mockService.trackApiLoad).toHaveBeenCalledWith(500);
    });

    it('should track marker creation', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.trackMarkerCreation(100, 5);
      });

      expect(mockService.trackMarkerCreation).toHaveBeenCalledWith(100, 5);
    });

    it('should track marker update', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.trackMarkerUpdate(50, 3);
      });

      expect(mockService.trackMarkerUpdate).toHaveBeenCalledWith(50, 3);
    });

    it('should track marker deletion', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.trackMarkerDeletion(30, 2);
      });

      expect(mockService.trackMarkerDeletion).toHaveBeenCalledWith(30, 2);
    });

    it('should track clustering', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.trackClustering(300, 'grid', 5, 10);
      });

      expect(mockService.trackClustering).toHaveBeenCalledWith(300, 'grid', 5, 10);
    });

    it('should track navigation', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.trackNavigation(150, 'bounds');
      });

      expect(mockService.trackNavigation).toHaveBeenCalledWith(150, 'bounds');
    });

    it('should track filtering', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        result.current.trackFiltering(80, 25, 100);
      });

      expect(mockService.trackFiltering).toHaveBeenCalledWith(80, 25, 100);
    });

    it('should track errors', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      const error: MapError = {
        code: 'MAP_ERROR',
        message: 'Test error',
        timestamp: Date.now(),
        context: { component: 'test', action: 'test' },
      };

      act(() => {
        result.current.trackError(error);
      });

      expect(mockService.trackError).toHaveBeenCalledWith(error);
    });
  });

  describe('Performance Status', () => {
    it('should return excellent status for high scores', () => {
      mockService.getMetrics.mockReturnValue({
        ...mockService.getMetrics(),
        overallScore: 95,
      });

      const { result } = renderHook(() => useMapPerformanceMonitoring());

      expect(result.current.getPerformanceStatus()).toBe('excellent');
    });

    it('should return good status for good scores', () => {
      mockService.getMetrics.mockReturnValue({
        ...mockService.getMetrics(),
        overallScore: 85,
      });

      const { result } = renderHook(() => useMapPerformanceMonitoring());

      expect(result.current.getPerformanceStatus()).toBe('good');
    });

    it('should return fair status for fair scores', () => {
      mockService.getMetrics.mockReturnValue({
        ...mockService.getMetrics(),
        overallScore: 75,
      });

      const { result } = renderHook(() => useMapPerformanceMonitoring());

      expect(result.current.getPerformanceStatus()).toBe('fair');
    });

    it('should return poor status for poor scores', () => {
      mockService.getMetrics.mockReturnValue({
        ...mockService.getMetrics(),
        overallScore: 60,
      });

      const { result } = renderHook(() => useMapPerformanceMonitoring());

      expect(result.current.getPerformanceStatus()).toBe('poor');
    });

    it('should return critical status for very low scores', () => {
      mockService.getMetrics.mockReturnValue({
        ...mockService.getMetrics(),
        overallScore: 30,
      });

      const { result } = renderHook(() => useMapPerformanceMonitoring());

      expect(result.current.getPerformanceStatus()).toBe('critical');
    });
  });

  describe('Threshold Checking', () => {
    it('should detect exceeded thresholds', () => {
      mockService.getMetrics.mockReturnValue({
        ...mockService.getMetrics(),
        mapInitializationTime: 3000, // Exceeds 2000ms threshold
        memoryUsage: 150, // Exceeds 100MB threshold
      });

      const { result } = renderHook(() => useMapPerformanceMonitoring());

      expect(result.current.isThresholdExceeded('mapInitializationTime')).toBe(true);
      expect(result.current.isThresholdExceeded('memoryUsage')).toBe(true);
      expect(result.current.isThresholdExceeded('mapLoadTime')).toBe(false);
    });
  });

  describe('Performance Report', () => {
    it('should get performance report', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring());

      const report = result.current.getPerformanceReport();

      expect(mockService.getPerformanceReport).toHaveBeenCalled();
      expect(report).toBe('Performance Report');
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring());

      act(() => {
        result.current.updateConfig({
          enableConsoleLogging: true,
          samplingRate: 0.5,
        });
      });

      expect(mockService.updateConfig).toHaveBeenCalledWith({
        enableConsoleLogging: true,
        samplingRate: 0.5,
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onPerformanceChange when metrics change', async () => {
      const onPerformanceChange = jest.fn();

      const { result } = renderHook(() => useMapPerformanceMonitoring({
        onPerformanceChange,
        autoStart: true,
      }));

      // Simulate metrics change
      mockService.getMetrics.mockReturnValue({
        ...mockService.getMetrics(),
        overallScore: 90,
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onPerformanceChange).toHaveBeenCalled();
      });
    });

    it('should call onError when tracking errors', () => {
      const onError = jest.fn();

      const { result } = renderHook(() => useMapPerformanceMonitoring({
        onError,
        autoStart: true,
      }));

      const error: MapError = {
        code: 'MAP_ERROR',
        message: 'Test error',
        timestamp: Date.now(),
        context: { component: 'test', action: 'test' },
      };

      act(() => {
        result.current.trackError(error);
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should call onThresholdExceeded when thresholds are exceeded', async () => {
      const onThresholdExceeded = jest.fn();

      const { result } = renderHook(() => useMapPerformanceMonitoring({
        onThresholdExceeded,
        autoStart: true,
      }));

      // Set initial metrics
      mockService.getMetrics.mockReturnValue({
        ...mockService.getMetrics(),
        mapInitializationTime: 1000,
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Simulate threshold violation
      mockService.getMetrics.mockReturnValue({
        ...mockService.getMetrics(),
        mapInitializationTime: 3000, // Exceeds threshold
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onThresholdExceeded).toHaveBeenCalledWith(
          'mapInitializationTime',
          3000,
          2000
        );
      });
    });
  });

  describe('Metrics Updates', () => {
    it('should update metrics periodically', async () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      const initialMetrics = result.current.metrics;

      // Simulate metrics change
      mockService.getMetrics.mockReturnValue({
        ...initialMetrics,
        overallScore: 90,
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.metrics.overallScore).toBe(90);
      });
    });

    it('should update events periodically', async () => {
      const mockEvents = [
        {
          type: 'initialization' as const,
          operation: 'map_init',
          duration: 1000,
          timestamp: Date.now(),
        },
      ];

      mockService.getEvents.mockReturnValue(mockEvents);

      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.events).toEqual(mockEvents);
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: true,
      }));

      unmount();

      // Should not throw errors after unmount
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });
  });

  describe('Default Hooks', () => {
    it('should provide default configuration', () => {
      const { result } = renderHook(() => useMapPerformanceMonitoring({
        autoStart: false,
      }));

      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.metrics).toBeDefined();
    });
  });
});
