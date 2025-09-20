'use client';

import type {
    Coordinates,
    MapBounds,
    MapCluster,
    MapError,
    MapMarker
} from '@/types/map';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseMapClusteringOptions {
  enableClustering?: boolean;
  maxZoom?: number;
  gridSize?: number;
  styles?: ClusterStyle[];
  algorithm?: 'grid' | 'kmeans' | 'hierarchical';
  maxMarkersPerCluster?: number;
  enableClusterExpansion?: boolean;
  enableClusterInfo?: boolean;
  onClusterClick?: (cluster: MapCluster) => void;
  onClusterHover?: (cluster: MapCluster | null) => void;
  onError?: (error: MapError) => void;
}

export interface ClusterStyle {
  url?: string;
  height?: number;
  width?: number;
  anchor?: [number, number];
  textColor?: string;
  textSize?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fontFamily?: string;
  fontWeight?: string;
}

export interface ClusteringState {
  clusters: MapCluster[];
  isClustering: boolean;
  clusterCount: number;
  averageClusterSize: number;
  largestCluster: MapCluster | null;
  smallestCluster: MapCluster | null;
  error: MapError | null;
}

export interface UseMapClusteringReturn {
  // State
  state: ClusteringState;

  // Clustering operations
  clusterMarkers: (markers: MapMarker[]) => MapCluster[];
  updateClusters: (markers: MapMarker[]) => void;
  clearClusters: () => void;

  // Cluster management
  expandCluster: (clusterId: string) => MapMarker[];
  collapseCluster: (clusterId: string) => void;
  getClusterById: (clusterId: string) => MapCluster | null;
  getClustersInBounds: (bounds: MapBounds) => MapCluster[];

  // Configuration
  setClusteringEnabled: (enabled: boolean) => void;
  updateClusteringOptions: (options: Partial<UseMapClusteringOptions>) => void;

  // Statistics
  getClusteringStats: () => {
    totalClusters: number;
    totalMarkers: number;
    averageClusterSize: number;
    largestClusterSize: number;
    smallestClusterSize: number;
    clusteringEfficiency: number; // 0-1, higher means better clustering
  };

  // Utility functions
  calculateClusterCenter: (markers: MapMarker[]) => Coordinates;
  calculateClusterBounds: (markers: MapMarker[]) => MapBounds;
  getClusterStyle: (cluster: MapCluster) => ClusterStyle;

  // Reset
  reset: () => void;
}

/**
 * Custom hook for map marker clustering
 *
 * This hook provides comprehensive clustering functionality for map markers
 * with multiple algorithms, customizable styles, and performance optimization.
 */
export function useMapClustering(options: UseMapClusteringOptions = {}): UseMapClusteringReturn {
  const [state, setState] = useState<ClusteringState>({
    clusters: [],
    isClustering: false,
    clusterCount: 0,
    averageClusterSize: 0,
    largestCluster: null,
    smallestCluster: null,
    error: null,
  });

  const clustersRef = useRef<MapCluster[]>([]);
  const clusteringOptionsRef = useRef<UseMapClusteringOptions>({
    enableClustering: true,
    maxZoom: 15,
    gridSize: 60,
    styles: [],
    algorithm: 'grid',
    maxMarkersPerCluster: 50,
    enableClusterExpansion: true,
    enableClusterInfo: true,
    ...options
  });
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update clustering options
  useEffect(() => {
    clusteringOptionsRef.current = {
      ...clusteringOptionsRef.current,
      ...options
    };
  }, [options]);

  /**
   * Cluster markers using the configured algorithm
   */
  const clusterMarkers = useCallback((markers: MapMarker[]): MapCluster[] => {
    if (!isMountedRef.current || !clusteringOptionsRef.current.enableClustering) {
      return [];
    }

    try {
      const algorithm = clusteringOptionsRef.current.algorithm || 'grid';

      switch (algorithm) {
        case 'grid':
          return performGridClustering(markers);
        case 'kmeans':
          return performKMeansClustering(markers);
        case 'hierarchical':
          return performHierarchicalClustering(markers);
        default:
          return performGridClustering(markers);
      }
    } catch (error) {
      const mapError: MapError = {
        code: 'CLUSTERING_ERROR',
        message: 'Failed to cluster markers',
        details: error,
        timestamp: Date.now(),
        context: {
          component: 'useMapClustering',
          action: 'clusterMarkers'
        }
      };

      if (isMountedRef.current) {
        setState(prev => ({ ...prev, error: mapError }));
        clusteringOptionsRef.current.onError?.(mapError);
      }

      return [];
    }
  }, []);

  /**
   * Update clusters with new markers
   */
  const updateClusters = useCallback((markers: MapMarker[]) => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, isClustering: true, error: null }));

    try {
      const clusters = clusterMarkers(markers);
      clustersRef.current = clusters;

      // Calculate statistics
      const stats = calculateClusteringStats(clusters);

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          clusters,
          isClustering: false,
          clusterCount: clusters.length,
          averageClusterSize: stats.averageClusterSize,
          largestCluster: stats.largestCluster,
          smallestCluster: stats.smallestCluster,
        }));
      }
    } catch (error) {
      const mapError: MapError = {
        code: 'CLUSTERING_UPDATE_ERROR',
        message: 'Failed to update clusters',
        details: error,
        timestamp: Date.now(),
        context: {
          component: 'useMapClustering',
          action: 'updateClusters'
        }
      };

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isClustering: false,
          error: mapError
        }));
        clusteringOptionsRef.current.onError?.(mapError);
      }
    }
  }, [clusterMarkers]);

  /**
   * Clear all clusters
   */
  const clearClusters = useCallback(() => {
    if (!isMountedRef.current) return;

    setState(prev => ({
      ...prev,
      clusters: [],
      clusterCount: 0,
      averageClusterSize: 0,
      largestCluster: null,
      smallestCluster: null,
    }));

    clustersRef.current = [];
  }, []);

  /**
   * Expand a cluster to show individual markers
   */
  const expandCluster = useCallback((clusterId: string): MapMarker[] => {
    const cluster = clustersRef.current.find(c => c.id === clusterId);
    if (!cluster) return [];

    // Remove cluster and add individual markers
    const newClusters = clustersRef.current.filter(c => c.id !== clusterId);
    clustersRef.current = newClusters;

    setState(prev => ({
      ...prev,
      clusters: newClusters,
      clusterCount: newClusters.length,
    }));

    return cluster.markers;
  }, []);

  /**
   * Collapse markers back into a cluster
   */
  const collapseCluster = useCallback((clusterId: string) => {
    // This would require the original markers to be available
    // For now, we'll just update the clusters
    updateClusters([]);
  }, [updateClusters]);

  /**
   * Get cluster by ID
   */
  const getClusterById = useCallback((clusterId: string): MapCluster | null => {
    return clustersRef.current.find(cluster => cluster.id === clusterId) || null;
  }, []);

  /**
   * Get clusters within bounds
   */
  const getClustersInBounds = useCallback((bounds: MapBounds): MapCluster[] => {
    return clustersRef.current.filter(cluster => {
      const { lat, lng } = cluster.position;
      return lat >= bounds.southwest.lat &&
             lat <= bounds.northeast.lat &&
             lng >= bounds.southwest.lng &&
             lng <= bounds.northeast.lng;
    });
  }, []);

  /**
   * Set clustering enabled state
   */
  const setClusteringEnabled = useCallback((enabled: boolean) => {
    clusteringOptionsRef.current.enableClustering = enabled;

    if (!enabled) {
      clearClusters();
    }
  }, [clearClusters]);

  /**
   * Update clustering options
   */
  const updateClusteringOptions = useCallback((newOptions: Partial<UseMapClusteringOptions>) => {
    clusteringOptionsRef.current = {
      ...clusteringOptionsRef.current,
      ...newOptions
    };
  }, []);

  /**
   * Get clustering statistics
   */
  const getClusteringStats = useCallback(() => {
    const clusters = clustersRef.current;
    const totalClusters = clusters.length;
    const totalMarkers = clusters.reduce((sum, cluster) => sum + cluster.count, 0);
    const averageClusterSize = totalClusters > 0 ? totalMarkers / totalClusters : 0;

    const clusterSizes = clusters.map(cluster => cluster.count);
    const largestClusterSize = clusterSizes.length > 0 ? Math.max(...clusterSizes) : 0;
    const smallestClusterSize = clusterSizes.length > 0 ? Math.min(...clusterSizes) : 0;

    // Calculate clustering efficiency (0-1, higher means better clustering)
    const clusteringEfficiency = totalMarkers > 0 ?
      Math.min(totalClusters / totalMarkers, 1) : 0;

    return {
      totalClusters,
      totalMarkers,
      averageClusterSize,
      largestClusterSize,
      smallestClusterSize,
      clusteringEfficiency
    };
  }, []);

  /**
   * Calculate cluster center from markers
   */
  const calculateClusterCenter = useCallback((markers: MapMarker[]): Coordinates => {
    if (markers.length === 0) {
      return { lat: 0, lng: 0 };
    }

    const totalLat = markers.reduce((sum, marker) => sum + marker.position.lat, 0);
    const totalLng = markers.reduce((sum, marker) => sum + marker.position.lng, 0);

    return {
      lat: totalLat / markers.length,
      lng: totalLng / markers.length
    };
  }, []);

  /**
   * Calculate cluster bounds from markers
   */
  const calculateClusterBounds = useCallback((markers: MapMarker[]): MapBounds => {
    if (markers.length === 0) {
      return {
        northeast: { lat: 0, lng: 0 },
        southwest: { lat: 0, lng: 0 }
      };
    }

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
   * Get cluster style based on size
   */
  const getClusterStyle = useCallback((cluster: MapCluster): ClusterStyle => {
    const styles = clusteringOptionsRef.current.styles || [];
    const count = cluster.count;

    // Find appropriate style based on cluster size
    let selectedStyle: ClusterStyle = {
      backgroundColor: '#4285F4',
      textColor: '#FFFFFF',
      textSize: 12,
      width: 40,
      height: 40,
      borderColor: '#FFFFFF',
      borderWidth: 2,
    };

    if (styles.length > 0) {
      // Use custom styles if provided
      if (count <= 10 && styles[0]) {
        selectedStyle = { ...selectedStyle, ...styles[0] };
      } else if (count <= 50 && styles[1]) {
        selectedStyle = { ...selectedStyle, ...styles[1] };
      } else if (styles[2]) {
        selectedStyle = { ...selectedStyle, ...styles[2] };
      }
    }

    return selectedStyle;
  }, []);

  /**
   * Reset clustering state
   */
  const reset = useCallback(() => {
    if (!isMountedRef.current) return;

    setState({
      clusters: [],
      isClustering: false,
      clusterCount: 0,
      averageClusterSize: 0,
      largestCluster: null,
      smallestCluster: null,
      error: null,
    });

    clustersRef.current = [];
  }, []);

  /**
   * Perform grid-based clustering
   */
  const performGridClustering = (markers: MapMarker[]): MapCluster[] => {
    if (markers.length === 0) return [];

    const gridSize = clusteringOptionsRef.current.gridSize || 60;
    const maxMarkersPerCluster = clusteringOptionsRef.current.maxMarkersPerCluster || 50;
    const clusters: MapCluster[] = [];
    const processedMarkers = new Set<string>();

    markers.forEach(marker => {
      if (processedMarkers.has(marker.id)) return;

      const clusterMarkers = [marker];
      processedMarkers.add(marker.id);

      // Find nearby markers within grid size
      markers.forEach(otherMarker => {
        if (processedMarkers.has(otherMarker.id)) return;
        if (clusterMarkers.length >= maxMarkersPerCluster) return;

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
   * Perform K-means clustering
   */
  const performKMeansClustering = (markers: MapMarker[]): MapCluster[] => {
    if (markers.length === 0) return [];

    const k = Math.min(Math.ceil(markers.length / 10), 20); // Max 20 clusters
    const maxIterations = 100;
    const tolerance = 0.001;

    // Initialize centroids randomly
    const centroids: Coordinates[] = [];
    for (let i = 0; i < k; i++) {
      const randomMarker = markers[Math.floor(Math.random() * markers.length)];
      centroids.push({ ...randomMarker.position });
    }

    let clusters: MapCluster[] = [];
    let iterations = 0;
    let converged = false;

    while (!converged && iterations < maxIterations) {
      // Assign markers to nearest centroid
      const assignments: MapMarker[][] = Array(k).fill(null).map(() => []);

      markers.forEach(marker => {
        let minDistance = Infinity;
        let nearestCentroid = 0;

        centroids.forEach((centroid, index) => {
          const distance = calculateDistance(marker.position, centroid);
          if (distance < minDistance) {
            minDistance = distance;
            nearestCentroid = index;
          }
        });

        assignments[nearestCentroid].push(marker);
      });

      // Update centroids
      const newCentroids: Coordinates[] = [];
      let maxMovement = 0;

      assignments.forEach((clusterMarkers, index) => {
        if (clusterMarkers.length > 0) {
          const newCentroid = calculateClusterCenter(clusterMarkers);
          const movement = calculateDistance(centroids[index], newCentroid);
          maxMovement = Math.max(maxMovement, movement);
          newCentroids.push(newCentroid);
        } else {
          newCentroids.push(centroids[index]);
        }
      });

      // Check convergence
      converged = maxMovement < tolerance;
      centroids.splice(0, centroids.length, ...newCentroids);
      iterations++;
    }

    // Create clusters from final assignments
    assignments.forEach((clusterMarkers, index) => {
      if (clusterMarkers.length > 1) {
        const clusterId = `kmeans_cluster_${index}`;
        const clusterPosition = centroids[index];
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
   * Perform hierarchical clustering
   */
  const performHierarchicalClustering = (markers: MapMarker[]): MapCluster[] => {
    if (markers.length === 0) return [];

    const maxDistance = clusteringOptionsRef.current.gridSize || 60;
    const clusters: MapCluster[] = [];
    const markerClusters: MapMarker[][] = markers.map(marker => [marker]);

    // Build distance matrix
    const distances: number[][] = [];
    for (let i = 0; i < markers.length; i++) {
      distances[i] = [];
      for (let j = 0; j < markers.length; j++) {
        if (i === j) {
          distances[i][j] = 0;
        } else {
          distances[i][j] = calculateDistance(markers[i].position, markers[j].position);
        }
      }
    }

    // Merge clusters until no more can be merged
    let merged = true;
    while (merged) {
      merged = false;
      let minDistance = Infinity;
      let mergeI = -1;
      let mergeJ = -1;

      // Find closest clusters
      for (let i = 0; i < markerClusters.length; i++) {
        for (let j = i + 1; j < markerClusters.length; j++) {
          const distance = calculateClusterDistance(markerClusters[i], markerClusters[j], distances);
          if (distance < minDistance) {
            minDistance = distance;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // Merge if distance is within threshold
      if (minDistance <= maxDistance && mergeI !== -1 && mergeJ !== -1) {
        markerClusters[mergeI] = [...markerClusters[mergeI], ...markerClusters[mergeJ]];
        markerClusters.splice(mergeJ, 1);
        merged = true;
      }
    }

    // Create final clusters
    markerClusters.forEach((clusterMarkers, index) => {
      if (clusterMarkers.length > 1) {
        const clusterId = `hierarchical_cluster_${index}`;
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
   * Calculate distance between two clusters
   */
  const calculateClusterDistance = (cluster1: MapMarker[], cluster2: MapMarker[], distances: number[][]): number => {
    let minDistance = Infinity;

    cluster1.forEach(marker1 => {
      cluster2.forEach(marker2 => {
        const marker1Index = markers.indexOf(marker1);
        const marker2Index = markers.indexOf(marker2);
        const distance = distances[marker1Index][marker2Index];
        minDistance = Math.min(minDistance, distance);
      });
    });

    return minDistance;
  };

  /**
   * Calculate clustering statistics
   */
  const calculateClusteringStats = (clusters: MapCluster[]) => {
    if (clusters.length === 0) {
      return {
        averageClusterSize: 0,
        largestCluster: null,
        smallestCluster: null
      };
    }

    const clusterSizes = clusters.map(cluster => cluster.count);
    const averageClusterSize = clusterSizes.reduce((sum, size) => sum + size, 0) / clusterSizes.length;

    const largestCluster = clusters.reduce((largest, cluster) =>
      cluster.count > largest.count ? cluster : largest
    );

    const smallestCluster = clusters.reduce((smallest, cluster) =>
      cluster.count < smallest.count ? cluster : smallest
    );

    return {
      averageClusterSize,
      largestCluster,
      smallestCluster
    };
  };

  return {
    // State
    state,

    // Clustering operations
    clusterMarkers,
    updateClusters,
    clearClusters,

    // Cluster management
    expandCluster,
    collapseCluster,
    getClusterById,
    getClustersInBounds,

    // Configuration
    setClusteringEnabled,
    updateClusteringOptions,

    // Statistics
    getClusteringStats,

    // Utility functions
    calculateClusterCenter,
    calculateClusterBounds,
    getClusterStyle,

    // Reset
    reset,
  };
}

/**
 * Hook for map clustering with default configuration
 */
export function useMapClusteringWithDefaults(): UseMapClusteringReturn {
  return useMapClustering({
    enableClustering: true,
    maxZoom: 15,
    gridSize: 60,
    algorithm: 'grid',
    maxMarkersPerCluster: 50,
    enableClusterExpansion: true,
    enableClusterInfo: true,
  });
}

/**
 * Hook for map clustering with custom algorithm
 */
export function useMapClusteringWithAlgorithm(algorithm: 'grid' | 'kmeans' | 'hierarchical'): UseMapClusteringReturn {
  return useMapClustering({
    enableClustering: true,
    algorithm,
    maxZoom: 15,
    gridSize: 60,
    maxMarkersPerCluster: 50,
    enableClusterExpansion: true,
    enableClusterInfo: true,
  });
}

export default useMapClustering;
