'use client';

import type {
    Coordinates,
    MapBounds,
    MapCluster,
    MapError,
    MapMarker,
    MapPerformanceMetrics,
    MapSearchFilters,
    MapStatistics
} from '@/types/map';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeocoding } from './useGeocoding';

export interface UseMapMarkersOptions {
  enableClustering?: boolean;
  clusterOptions?: {
    maxZoom?: number;
    gridSize?: number;
    styles?: unknown[];
  };
  enableGeocoding?: boolean;
  geocodingOptions?: {
    enableCaching?: boolean;
    cacheTTL?: number;
    maxCacheSize?: number;
  };
  enableStatistics?: boolean;
  enablePerformanceMonitoring?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  onClusterClick?: (cluster: MapCluster) => void;
  onError?: (error: MapError) => void;
}

export interface MapMarkersState {
  markers: MapMarker[];
  clusters: MapCluster[];
  selectedMarker: MapMarker | null;
  selectedCluster: MapCluster | null;
  statistics: MapStatistics | null;
  performanceMetrics: MapPerformanceMetrics | null;
  isLoading: boolean;
  error: MapError | null;
}

export interface UseMapMarkersReturn {
  // State
  state: MapMarkersState;

  // Marker management
  addMarker: (marker: MapMarker) => void;
  updateMarker: (id: string, updates: Partial<MapMarker>) => void;
  removeMarker: (id: string) => void;
  clearMarkers: () => void;
  setMarkers: (markers: MapMarker[]) => void;

  // Selection management
  selectMarker: (marker: MapMarker | null) => void;
  selectCluster: (cluster: MapCluster | null) => void;

  // Clustering
  updateClusters: () => void;
  setClusteringEnabled: (enabled: boolean) => void;

  // Filtering and search
  filterMarkers: (filters: MapSearchFilters) => MapMarker[];
  searchMarkers: (query: string) => MapMarker[];

  // Geocoding
  geocodeMarkers: (markers: MapMarker[]) => Promise<MapMarker[]>;

  // Statistics and performance
  calculateStatistics: () => MapStatistics;
  getPerformanceMetrics: () => MapPerformanceMetrics;

  // Utility functions
  getMarkerById: (id: string) => MapMarker | null;
  getMarkersByType: (type: string) => MapMarker[];
  getMarkersByStatus: (status: string) => MapMarker[];
  getMarkersInBounds: (bounds: MapBounds) => MapMarker[];
  calculateBounds: () => MapBounds | null;

  // Reset
  reset: () => void;
}

/**
 * Custom hook for managing map markers with clustering, geocoding, and statistics
 *
 * This hook provides comprehensive marker management functionality including
 * clustering, geocoding, filtering, and performance monitoring.
 */
export function useMapMarkers(options: UseMapMarkersOptions = {}): UseMapMarkersReturn {
  const [state, setState] = useState<MapMarkersState>({
    markers: [],
    clusters: [],
    selectedMarker: null,
    selectedCluster: null,
    statistics: null,
    performanceMetrics: null,
    isLoading: false,
    error: null,
  });

  const markersRef = useRef<MapMarker[]>([]);
  const clustersRef = useRef<MapCluster[]>([]);
  const performanceStartTime = useRef<number>(0);
  const isMountedRef = useRef(true);

  // Use geocoding hook if enabled
  const { geocode, geocodeBatch, state: geocodingState } = useGeocoding({
    enableCaching: options.geocodingOptions?.enableCaching ?? true,
    cacheTTL: options.geocodingOptions?.cacheTTL ?? 24 * 60 * 60 * 1000,
    maxCacheSize: options.geocodingOptions?.maxCacheSize ?? 1000,
    autoInitialize: options.enableGeocoding ?? true,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update clusters when markers change
  useEffect(() => {
    if (options.enableClustering !== false) {
      updateClusters();
    }
  }, [state.markers, options.enableClustering]);

  // Calculate statistics when markers change
  useEffect(() => {
    if (options.enableStatistics !== false) {
      const stats = calculateStatistics();
      setState(prev => ({ ...prev, statistics: stats }));
    }
  }, [state.markers, options.enableStatistics]);

  // Update performance metrics
  useEffect(() => {
    if (options.enablePerformanceMonitoring !== false) {
      const metrics = getPerformanceMetrics();
      setState(prev => ({ ...prev, performanceMetrics: metrics }));
    }
  }, [state.markers, state.clusters, options.enablePerformanceMonitoring]);

  /**
   * Add a marker to the map
   */
  const addMarker = useCallback((marker: MapMarker) => {
    if (!isMountedRef.current) return;

    setState(prev => {
      const existingIndex = prev.markers.findIndex(m => m.id === marker.id);
      let newMarkers: MapMarker[];

      if (existingIndex >= 0) {
        // Update existing marker
        newMarkers = [...prev.markers];
        newMarkers[existingIndex] = { ...newMarkers[existingIndex], ...marker };
      } else {
        // Add new marker
        newMarkers = [...prev.markers, marker];
      }

      markersRef.current = newMarkers;
      return { ...prev, markers: newMarkers };
    });
  }, []);

  /**
   * Update a marker by ID
   */
  const updateMarker = useCallback((id: string, updates: Partial<MapMarker>) => {
    if (!isMountedRef.current) return;

    setState(prev => {
      const newMarkers = prev.markers.map(marker =>
        marker.id === id ? { ...marker, ...updates } : marker
      );

      markersRef.current = newMarkers;
      return { ...prev, markers: newMarkers };
    });
  }, []);

  /**
   * Remove a marker by ID
   */
  const removeMarker = useCallback((id: string) => {
    if (!isMountedRef.current) return;

    setState(prev => {
      const newMarkers = prev.markers.filter(marker => marker.id !== id);
      markersRef.current = newMarkers;

      // Clear selection if removed marker was selected
      const newSelectedMarker = prev.selectedMarker?.id === id ? null : prev.selectedMarker;

      return {
        ...prev,
        markers: newMarkers,
        selectedMarker: newSelectedMarker
      };
    });
  }, []);

  /**
   * Clear all markers
   */
  const clearMarkers = useCallback(() => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      markers: [],
      clusters: [],
      selectedMarker: null,
      selectedCluster: null,
    }));

    markersRef.current = [];
    clustersRef.current = [];
  }, []);

  /**
   * Set all markers at once
   */
  const setMarkers = useCallback((markers: MapMarker[]) => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      markers,
      selectedMarker: null,
      selectedCluster: null,
    }));

    markersRef.current = markers;
  }, []);

  /**
   * Select a marker
   */
  const selectMarker = useCallback((marker: MapMarker | null) => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      selectedMarker: marker,
      selectedCluster: null, // Clear cluster selection when selecting marker
    }));

    if (marker) {
      options.onMarkerClick?.(marker);
    }
  }, [options.onMarkerClick]);

  /**
   * Select a cluster
   */
  const selectCluster = useCallback((cluster: MapCluster | null) => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      selectedCluster: cluster,
      selectedMarker: null, // Clear marker selection when selecting cluster
    }));

    if (cluster) {
      options.onClusterClick?.(cluster);
    }
  }, [options.onClusterClick]);

  /**
   * Update clusters based on current markers
   */
  const updateClusters = useCallback(() => {
    if (!isMountedRef.current || options.enableClustering === false) return;

    const startTime = performance.now();

    try {
      const clusters = performClustering(markersRef.current, options.clusterOptions);
      clustersRef.current = clusters;

      setState(prev => ({ ...prev, clusters }));

      if (options.enablePerformanceMonitoring !== false) {
        const clusterTime = performance.now() - startTime;
        setState(prev => ({
          ...prev,
          performanceMetrics: {
            ...prev.performanceMetrics,
            render_time: clusterTime,
            cluster_count: clusters.length,
          } as MapPerformanceMetrics
        }));
      }
    } catch (error) {
      const mapError: MapError = {
        code: 'CLUSTERING_ERROR',
        message: 'Failed to update clusters',
        details: error,
        timestamp: Date.now(),
        context: {
          component: 'useMapMarkers',
          action: 'updateClusters'
        }
      };

      setState(prev => ({ ...prev, error: mapError }));
      options.onError?.(mapError);
    }
  }, [options.enableClustering, options.clusterOptions, options.enablePerformanceMonitoring, options.onError]);

  /**
   * Set clustering enabled state
   */
  const setClusteringEnabled = useCallback((enabled: boolean) => {
    if (enabled && options.enableClustering !== false) {
      updateClusters();
    } else {
      setState(prev => ({ ...prev, clusters: [] }));
      clustersRef.current = [];
    }
  }, [updateClusters, options.enableClustering]);

  /**
   * Filter markers based on search filters
   */
  const filterMarkers = useCallback((filters: MapSearchFilters): MapMarker[] => {
    return markersRef.current.filter(marker => {
      // Filter by appointment type
      if (filters.appointment_types && filters.appointment_types.length > 0) {
        if (!filters.appointment_types.includes(marker.appointment_type)) {
          return false;
        }
      }

      // Filter by status
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(marker.status)) {
          return false;
        }
      }

      // Filter by date range
      if (filters.date_range) {
        const markerDate = new Date(marker.appointment_date);
        const startDate = new Date(filters.date_range.start_date);
        const endDate = new Date(filters.date_range.end_date);

        if (markerDate < startDate || markerDate > endDate) {
          return false;
        }
      }

      // Filter by time range
      if (filters.time_range) {
        const markerTime = marker.start_time;
        if (markerTime < filters.time_range.start_time || markerTime > filters.time_range.end_time) {
          return false;
        }
      }

      // Filter by transportation type
      if (filters.transportation_type && filters.transportation_type.length > 0) {
        if (!marker.transportation_type || !filters.transportation_type.includes(marker.transportation_type)) {
          return false;
        }
      }

      // Filter by areas
      if (filters.areas && filters.areas.length > 0) {
        const markerArea = marker.address.split(',')[1]?.trim(); // Extract area from address
        if (!markerArea || !filters.areas.includes(markerArea)) {
          return false;
        }
      }

      // Filter by cities
      if (filters.cities && filters.cities.length > 0) {
        const markerCity = marker.address.split(',').pop()?.trim(); // Extract city from address
        if (!markerCity || !filters.cities.includes(markerCity)) {
          return false;
        }
      }

      // Filter by search query
      if (filters.search_query) {
        const query = filters.search_query.toLowerCase();
        const searchableText = [
          marker.patient_name,
          marker.address,
          marker.notes || '',
          marker.appointment_type,
          marker.status
        ].join(' ').toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, []);

  /**
   * Search markers by query string
   */
  const searchMarkers = useCallback((query: string): MapMarker[] => {
    if (!query.trim()) return markersRef.current;

    const searchQuery = query.toLowerCase();
    return markersRef.current.filter(marker => {
      const searchableText = [
        marker.patient_name,
        marker.address,
        marker.notes || '',
        marker.appointment_type,
        marker.status,
        marker.patient_phone
      ].join(' ').toLowerCase();

      return searchableText.includes(searchQuery);
    });
  }, []);

  /**
   * Geocode markers that don't have coordinates
   */
  const geocodeMarkers = useCallback(async (markers: MapMarker[]): Promise<MapMarker[]> => {
    if (!options.enableGeocoding || geocodingState.isLoading) {
      return markers;
    }

    const markersToGeocode = markers.filter(marker =>
      !marker.position || (marker.position.lat === 0 && marker.position.lng === 0)
    );

    if (markersToGeocode.length === 0) {
      return markers;
    }

    try {
      const addresses = markersToGeocode.map(marker => marker.address);
      const geocodingResults = await geocodeBatch(addresses);

      const geocodedMarkers = markers.map(marker => {
        const geocodingResult = geocodingResults.find(result =>
          result.address.toLowerCase() === marker.address.toLowerCase()
        );

        if (geocodingResult) {
          return {
            ...marker,
            position: geocodingResult.coordinates
          };
        }

        return marker;
      });

      return geocodedMarkers;
    } catch (error) {
      const mapError: MapError = {
        code: 'GEOCODING_ERROR',
        message: 'Failed to geocode markers',
        details: error,
        timestamp: Date.now(),
        context: {
          component: 'useMapMarkers',
          action: 'geocodeMarkers'
        }
      };

      setState(prev => ({ ...prev, error: mapError }));
      options.onError?.(mapError);

      return markers;
    }
  }, [options.enableGeocoding, geocodingState.isLoading, geocodeBatch, options.onError]);

  /**
   * Calculate statistics for current markers
   */
  const calculateStatistics = useCallback((): MapStatistics => {
    const markers = markersRef.current;
    const totalAppointments = markers.length;

    // Calculate statistics by type
    const appointmentsByType: Record<string, number> = {};
    const appointmentsByStatus: Record<string, number> = {};
    const appointmentsByArea: Record<string, number> = {};
    const appointmentsByCity: Record<string, number> = {};

    let totalPatients = 0;
    const uniquePatients = new Set<string>();

    markers.forEach(marker => {
      // Count by type
      appointmentsByType[marker.appointment_type] = (appointmentsByType[marker.appointment_type] || 0) + 1;

      // Count by status
      appointmentsByStatus[marker.status] = (appointmentsByStatus[marker.status] || 0) + 1;

      // Count by area
      const area = marker.address.split(',')[1]?.trim() || 'Unknown';
      appointmentsByArea[area] = (appointmentsByArea[area] || 0) + 1;

      // Count by city
      const city = marker.address.split(',').pop()?.trim() || 'Unknown';
      appointmentsByCity[city] = (appointmentsByCity[city] || 0) + 1;

      // Count unique patients
      uniquePatients.add(marker.patient_id);
    });

    totalPatients = uniquePatients.size;

    // Calculate coverage area
    const coverageArea = calculateBounds();

    // Calculate density score (0-1, higher means more clustered)
    const densityScore = calculateDensityScore(markers);

    return {
      total_appointments: totalAppointments,
      appointments_by_type: appointmentsByType,
      appointments_by_status: appointmentsByStatus,
      appointments_by_area: appointmentsByArea,
      appointments_by_city: appointmentsByCity,
      total_patients: totalPatients,
      coverage_area: coverageArea || {
        northeast: { lat: 0, lng: 0 },
        southwest: { lat: 0, lng: 0 }
      },
      density_score: densityScore
    };
  }, []);

  /**
   * Get current performance metrics
   */
  const getPerformanceMetrics = useCallback((): MapPerformanceMetrics => {
    const currentTime = performance.now();
    const loadTime = performanceStartTime.current > 0 ? currentTime - performanceStartTime.current : 0;

    return {
      load_time: loadTime,
      render_time: state.performanceMetrics?.render_time || 0,
      marker_count: markersRef.current.length,
      cluster_count: clustersRef.current.length,
      memory_usage: 0, // Would need performance.memory API
      api_calls: geocodingState.cacheStats?.size || 0,
      errors: state.error ? 1 : 0
    };
  }, [state.performanceMetrics, geocodingState.cacheStats, state.error]);

  /**
   * Get marker by ID
   */
  const getMarkerById = useCallback((id: string): MapMarker | null => {
    return markersRef.current.find(marker => marker.id === id) || null;
  }, []);

  /**
   * Get markers by appointment type
   */
  const getMarkersByType = useCallback((type: string): MapMarker[] => {
    return markersRef.current.filter(marker => marker.appointment_type === type);
  }, []);

  /**
   * Get markers by status
   */
  const getMarkersByStatus = useCallback((status: string): MapMarker[] => {
    return markersRef.current.filter(marker => marker.status === status);
  }, []);

  /**
   * Get markers within bounds
   */
  const getMarkersInBounds = useCallback((bounds: MapBounds): MapMarker[] => {
    return markersRef.current.filter(marker => {
      const { lat, lng } = marker.position;
      return lat >= bounds.southwest.lat &&
             lat <= bounds.northeast.lat &&
             lng >= bounds.southwest.lng &&
             lng <= bounds.northeast.lng;
    });
  }, []);

  /**
   * Calculate bounds for all markers
   */
  const calculateBounds = useCallback((): MapBounds | null => {
    const markers = markersRef.current;
    if (markers.length === 0) return null;

    let minLat = markers[0].position.lat;
    let maxLat = markers[0].position.lat;
    let minLng = markers[0].position.lng;
    let maxLng = markers[0].position.lng;

    markers.forEach(marker => {
      const { lat, lng } = marker.position;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    return {
      northeast: { lat: maxLat, lng: maxLng },
      southwest: { lat: minLat, lng: minLng }
    };
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setState({
      markers: [],
      clusters: [],
      selectedMarker: null,
      selectedCluster: null,
      statistics: null,
      performanceMetrics: null,
      isLoading: false,
      error: null,
    });

    markersRef.current = [];
    clustersRef.current = [];
    performanceStartTime.current = 0;
  }, []);

  /**
   * Perform clustering on markers
   */
  const performClustering = (markers: MapMarker[], clusterOptions?: {
    maxZoom?: number;
    gridSize?: number;
    styles?: unknown[];
  }): MapCluster[] => {
    if (markers.length === 0) return [];

    const maxZoom = clusterOptions?.maxZoom ?? 15;
    const gridSize = clusterOptions?.gridSize ?? 60;

    // Simple grid-based clustering
    const clusters: MapCluster[] = [];
    const processedMarkers = new Set<string>();

    markers.forEach(marker => {
      if (processedMarkers.has(marker.id)) return;

      const clusterMarkers = [marker];
      processedMarkers.add(marker.id);

      // Find nearby markers
      markers.forEach(otherMarker => {
        if (processedMarkers.has(otherMarker.id)) return;

        const distance = calculateDistance(marker.position, otherMarker.position);
        if (distance <= gridSize) {
          clusterMarkers.push(otherMarker);
          processedMarkers.add(otherMarker.id);
        }
      });

      if (clusterMarkers.length > 1) {
        // Create cluster
        const clusterId = `cluster_${marker.id}`;
        const clusterPosition = calculateClusterCenter(clusterMarkers);
        const clusterBounds = calculateClusterBounds(clusterMarkers);

        clusters.push({
          id: clusterId,
          position: clusterPosition,
          count: clusterMarkers.length,
          markers: clusterMarkers,
          bounds: clusterBounds
        });
      }
    });

    return clusters;
  };

  /**
   * Calculate distance between two coordinates
   */
  const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.lat * Math.PI / 180;
    const φ2 = coord2.lat * Math.PI / 180;
    const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
    const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  /**
   * Calculate center of cluster
   */
  const calculateClusterCenter = (markers: MapMarker[]): Coordinates => {
    const totalLat = markers.reduce((sum, marker) => sum + marker.position.lat, 0);
    const totalLng = markers.reduce((sum, marker) => sum + marker.position.lng, 0);

    return {
      lat: totalLat / markers.length,
      lng: totalLng / markers.length
    };
  };

  /**
   * Calculate bounds of cluster
   */
  const calculateClusterBounds = (markers: MapMarker[]): MapBounds => {
    let minLat = markers[0].position.lat;
    let maxLat = markers[0].position.lat;
    let minLng = markers[0].position.lng;
    let maxLng = markers[0].position.lng;

    markers.forEach(marker => {
      const { lat, lng } = marker.position;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    return {
      northeast: { lat: maxLat, lng: maxLng },
      southwest: { lat: minLat, lng: minLng }
    };
  };

  /**
   * Calculate density score for markers
   */
  const calculateDensityScore = (markers: MapMarker[]): number => {
    if (markers.length <= 1) return 0;

    const bounds = calculateBounds();
    if (!bounds) return 0;

    const area = (bounds.northeast.lat - bounds.southwest.lat) *
                 (bounds.northeast.lng - bounds.southwest.lng);

    if (area === 0) return 1;

    const density = markers.length / area;
    return Math.min(density, 1); // Cap at 1
  };

  return {
    // State
    state,

    // Marker management
    addMarker,
    updateMarker,
    removeMarker,
    clearMarkers,
    setMarkers,

    // Selection management
    selectMarker,
    selectCluster,

    // Clustering
    updateClusters,
    setClusteringEnabled,

    // Filtering and search
    filterMarkers,
    searchMarkers,

    // Geocoding
    geocodeMarkers,

    // Statistics and performance
    calculateStatistics,
    getPerformanceMetrics,

    // Utility functions
    getMarkerById,
    getMarkersByType,
    getMarkersByStatus,
    getMarkersInBounds,
    calculateBounds,

    // Reset
    reset,
  };
}

/**
 * Hook for map markers with default configuration
 */
export function useMapMarkersWithDefaults(): UseMapMarkersReturn {
  return useMapMarkers({
    enableClustering: true,
    enableGeocoding: true,
    enableStatistics: true,
    enablePerformanceMonitoring: true,
  });
}

export default useMapMarkers;
