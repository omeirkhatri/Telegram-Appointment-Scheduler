'use client';

import MapPerformanceMonitoringService, { type MapPerformanceConfig, type MapPerformanceEvent, type MapPerformanceMetrics } from '@/services/mapPerformanceMonitoringService';
import type { MapError } from '@/types/map';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseMapPerformanceMonitoringOptions {
  enableMonitoring?: boolean;
  enableMemoryTracking?: boolean;
  enableErrorTracking?: boolean;
  enablePerformanceScoring?: boolean;
  enableLocalStorage?: boolean;
  enableConsoleLogging?: boolean;
  enablePerformanceAPI?: boolean;
  samplingRate?: number;
  maxEventsInMemory?: number;
  localStorageKey?: string;
  debounceDelay?: number;
  autoStart?: boolean;
  onPerformanceChange?: (metrics: MapPerformanceMetrics) => void;
  onError?: (error: MapError) => void;
  onThresholdExceeded?: (threshold: string, value: number, limit: number) => void;
}

export interface UseMapPerformanceMonitoringReturn {
  // State
  isMonitoring: boolean;
  metrics: MapPerformanceMetrics;
  events: MapPerformanceEvent[];

  // Control functions
  startMonitoring: () => void;
  stopMonitoring: () => void;
  reset: () => void;

  // Tracking functions
  trackMapInitialization: (duration: number) => void;
  trackMapLoad: (duration: number) => void;
  trackApiLoad: (duration: number) => void;
  trackMarkerCreation: (duration: number, count?: number) => void;
  trackMarkerUpdate: (duration: number, count?: number) => void;
  trackMarkerDeletion: (duration: number, count?: number) => void;
  trackClustering: (duration: number, algorithm: string, clusters: number, markersPerCluster: number) => void;
  trackNavigation: (duration: number, operation: 'bounds' | 'zoom' | 'center' | 'general') => void;
  trackFiltering: (duration: number, filtered: number, total: number) => void;
  trackError: (error: MapError) => void;

  // Utility functions
  getPerformanceReport: () => string;
  getPerformanceStatus: () => 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  isThresholdExceeded: (threshold: keyof MapPerformanceMetrics) => boolean;

  // Configuration
  updateConfig: (config: Partial<MapPerformanceConfig>) => void;
}

/**
 * Custom hook for map performance monitoring
 *
 * This hook provides easy integration with the MapPerformanceMonitoringService
 * and includes React-specific features like automatic cleanup and state management.
 */
export function useMapPerformanceMonitoring(
  options: UseMapPerformanceMonitoringOptions = {}
): UseMapPerformanceMonitoringReturn {
  const {
    enableMonitoring = true,
    enableMemoryTracking = true,
    enableErrorTracking = true,
    enablePerformanceScoring = true,
    enableLocalStorage = true,
    enableConsoleLogging = false,
    enablePerformanceAPI = true,
    samplingRate = 1.0,
    maxEventsInMemory = 1000,
    localStorageKey = 'map_performance_metrics',
    debounceDelay = 300,
    autoStart = true,
    onPerformanceChange,
    onError,
    onThresholdExceeded,
  } = options;

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics, setMetrics] = useState<MapPerformanceMetrics>(() =>
    MapPerformanceMonitoringService.getInstance().getMetrics()
  );
  const [events, setEvents] = useState<MapPerformanceEvent[]>([]);

  const serviceRef = useRef<MapPerformanceMonitoringService | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousMetricsRef = useRef<MapPerformanceMetrics | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = MapPerformanceMonitoringService.getInstance({
      enableMonitoring,
      enableMemoryTracking,
      enableErrorTracking,
      enablePerformanceScoring,
      enableLocalStorage,
      enableConsoleLogging,
      enablePerformanceAPI,
      samplingRate,
      maxEventsInMemory,
      localStorageKey,
    });

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [
    enableMonitoring,
    enableMemoryTracking,
    enableErrorTracking,
    enablePerformanceScoring,
    enableLocalStorage,
    enableConsoleLogging,
    enablePerformanceAPI,
    samplingRate,
    maxEventsInMemory,
    localStorageKey,
  ]);

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart && serviceRef.current && !isMonitoring) {
      startMonitoring();
    }
  }, [autoStart, isMonitoring]);

  // Update metrics periodically
  useEffect(() => {
    if (!isMonitoring || !serviceRef.current) return;

    const updateMetrics = () => {
      if (!serviceRef.current) return;

      const newMetrics = serviceRef.current.getMetrics();
      const newEvents = serviceRef.current.getEvents();

      // Check for threshold violations
      if (previousMetricsRef.current) {
        checkThresholdViolations(previousMetricsRef.current, newMetrics);
      }

      setMetrics(newMetrics);
      setEvents(newEvents);
      previousMetricsRef.current = newMetrics;

      // Notify parent component of performance changes
      if (onPerformanceChange) {
        onPerformanceChange(newMetrics);
      }

      // Schedule next update
      updateTimeoutRef.current = setTimeout(updateMetrics, 1000);
    };

    updateMetrics();

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [isMonitoring, onPerformanceChange]);

  const checkThresholdViolations = (previous: MapPerformanceMetrics, current: MapPerformanceMetrics) => {
    if (!onThresholdExceeded) return;

    const thresholds = {
      mapInitializationTime: 2000,
      mapLoadTime: 3000,
      markerCreationTime: 100,
      clusteringTime: 500,
      navigationTime: 200,
      filteringTime: 100,
      memoryUsage: 100,
      memoryPeak: 150,
      totalErrors: 10,
    };

    Object.entries(thresholds).forEach(([key, limit]) => {
      const currentValue = current[key as keyof MapPerformanceMetrics] as number;
      const previousValue = previous[key as keyof MapPerformanceMetrics] as number;

      if (currentValue > limit && previousValue <= limit) {
        onThresholdExceeded(key, currentValue, limit);
      }
    });
  };

  const startMonitoring = useCallback(() => {
    if (!serviceRef.current || isMonitoring) return;

    serviceRef.current.startMonitoring();
    setIsMonitoring(true);
  }, [isMonitoring]);

  const stopMonitoring = useCallback(() => {
    if (!serviceRef.current || !isMonitoring) return;

    serviceRef.current.stopMonitoring();
    setIsMonitoring(false);
  }, [isMonitoring]);

  const reset = useCallback(() => {
    if (!serviceRef.current) return;

    serviceRef.current.reset();
    setMetrics(serviceRef.current.getMetrics());
    setEvents(serviceRef.current.getEvents());
    previousMetricsRef.current = null;
  }, []);

  const trackMapInitialization = useCallback((duration: number) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackMapInitialization(duration);
  }, [isMonitoring]);

  const trackMapLoad = useCallback((duration: number) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackMapLoad(duration);
  }, [isMonitoring]);

  const trackApiLoad = useCallback((duration: number) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackApiLoad(duration);
  }, [isMonitoring]);

  const trackMarkerCreation = useCallback((duration: number, count: number = 1) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackMarkerCreation(duration, count);
  }, [isMonitoring]);

  const trackMarkerUpdate = useCallback((duration: number, count: number = 1) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackMarkerUpdate(duration, count);
  }, [isMonitoring]);

  const trackMarkerDeletion = useCallback((duration: number, count: number = 1) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackMarkerDeletion(duration, count);
  }, [isMonitoring]);

  const trackClustering = useCallback((
    duration: number,
    algorithm: string,
    clusters: number,
    markersPerCluster: number
  ) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackClustering(duration, algorithm, clusters, markersPerCluster);
  }, [isMonitoring]);

  const trackNavigation = useCallback((
    duration: number,
    operation: 'bounds' | 'zoom' | 'center' | 'general'
  ) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackNavigation(duration, operation);
  }, [isMonitoring]);

  const trackFiltering = useCallback((duration: number, filtered: number, total: number) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackFiltering(duration, filtered, total);
  }, [isMonitoring]);

  const trackError = useCallback((error: MapError) => {
    if (!serviceRef.current || !isMonitoring) return;
    serviceRef.current.trackError(error);

    if (onError) {
      onError(error);
    }
  }, [isMonitoring, onError]);

  const getPerformanceReport = useCallback((): string => {
    if (!serviceRef.current) return '';
    return serviceRef.current.getPerformanceReport();
  }, []);

  const getPerformanceStatus = useCallback((): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' => {
    const score = metrics.overallScore;

    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 50) return 'poor';
    return 'critical';
  }, [metrics.overallScore]);

  const isThresholdExceeded = useCallback((threshold: keyof MapPerformanceMetrics): boolean => {
    const value = metrics[threshold] as number;

    const limits: Record<string, number> = {
      mapInitializationTime: 2000,
      mapLoadTime: 3000,
      markerCreationTime: 100,
      clusteringTime: 500,
      navigationTime: 200,
      filteringTime: 100,
      memoryUsage: 100,
      memoryPeak: 150,
      totalErrors: 10,
    };

    const limit = limits[threshold];
    return limit !== undefined && value > limit;
  }, [metrics]);

  const updateConfig = useCallback((config: Partial<MapPerformanceConfig>) => {
    if (!serviceRef.current) return;
    serviceRef.current.updateConfig(config);
  }, []);

  return {
    // State
    isMonitoring,
    metrics,
    events,

    // Control functions
    startMonitoring,
    stopMonitoring,
    reset,

    // Tracking functions
    trackMapInitialization,
    trackMapLoad,
    trackApiLoad,
    trackMarkerCreation,
    trackMarkerUpdate,
    trackMarkerDeletion,
    trackClustering,
    trackNavigation,
    trackFiltering,
    trackError,

    // Utility functions
    getPerformanceReport,
    getPerformanceStatus,
    isThresholdExceeded,

    // Configuration
    updateConfig,
  };
}

/**
 * Hook for map performance monitoring with default configuration
 */
export function useMapPerformanceMonitoringWithDefaults(): UseMapPerformanceMonitoringReturn {
  return useMapPerformanceMonitoring({
    enableMonitoring: true,
    enableMemoryTracking: true,
    enableErrorTracking: true,
    enablePerformanceScoring: true,
    enableLocalStorage: true,
    enableConsoleLogging: false,
    enablePerformanceAPI: true,
    samplingRate: 1.0,
    maxEventsInMemory: 1000,
    autoStart: true,
  });
}

/**
 * Hook for map performance monitoring with minimal configuration
 */
export function useMapPerformanceMonitoringMinimal(): UseMapPerformanceMonitoringReturn {
  return useMapPerformanceMonitoring({
    enableMonitoring: true,
    enableMemoryTracking: false,
    enableErrorTracking: true,
    enablePerformanceScoring: false,
    enableLocalStorage: false,
    enableConsoleLogging: false,
    enablePerformanceAPI: false,
    samplingRate: 0.1,
    maxEventsInMemory: 100,
    autoStart: true,
  });
}

export default useMapPerformanceMonitoring;
