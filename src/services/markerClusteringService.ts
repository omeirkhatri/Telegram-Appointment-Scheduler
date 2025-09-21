/**
 * Marker Clustering Service
 *
 * This service provides advanced marker clustering algorithms and performance
 * optimizations for handling large numbers of markers on maps.
 */

export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  data: any;
}

export interface ClusterData {
  id: string;
  center: { lat: number; lng: number };
  markers: string[];
  count: number;
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

export interface ClusteringOptions {
  maxZoom?: number;
  gridSize?: number;
  algorithm?: 'grid' | 'kmeans' | 'hierarchical' | 'adaptive';
  maxMarkersPerCluster?: number;
  enableClusterExpansion?: boolean;
  enableClusterInfo?: boolean;
  enablePerformanceMode?: boolean;
  viewportBounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  zoomLevel?: number;
}

export interface ClusteringStats {
  totalMarkers: number;
  clusterCount: number;
  averageClusterSize: number;
  clusteringEfficiency: number;
  processingTime: number;
  memoryUsage: number;
}

export interface ClusteringResult {
  clusters: ClusterData[];
  unclusteredMarkers: MarkerData[];
  stats: ClusteringStats;
}

export class MarkerClusteringService {
  private static instance: MarkerClusteringService;
  private cache: Map<string, ClusteringResult> = new Map();
  private performanceMode: boolean = false;
  private maxCacheSize: number = 100;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): MarkerClusteringService {
    if (!MarkerClusteringService.instance) {
      MarkerClusteringService.instance = new MarkerClusteringService();
    }
    return MarkerClusteringService.instance;
  }

  /**
   * Cluster markers using the specified algorithm
   */
  public clusterMarkers(
    markers: MarkerData[],
    options: ClusteringOptions = {}
  ): ClusteringResult {
    const startTime = performance.now();

    // Generate cache key
    const cacheKey = this.generateCacheKey(markers, options);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Set performance mode based on marker count
    this.performanceMode = markers.length > 1000 || options.enablePerformanceMode;

    let result: ClusteringResult;

    // Choose clustering algorithm
    switch (options.algorithm || 'adaptive') {
      case 'grid':
        result = this.gridClustering(markers, options);
        break;
      case 'kmeans':
        result = this.kmeansClustering(markers, options);
        break;
      case 'hierarchical':
        result = this.hierarchicalClustering(markers, options);
        break;
      case 'adaptive':
      default:
        result = this.adaptiveClustering(markers, options);
        break;
    }

    // Calculate processing time
    const processingTime = performance.now() - startTime;
    result.stats.processingTime = processingTime;

    // Cache result
    this.cacheResult(cacheKey, result);

    return result;
  }

  /**
   * Grid-based clustering algorithm
   */
  private gridClustering(markers: MarkerData[], options: ClusteringOptions): ClusteringResult {
    const gridSize = options.gridSize || 60;
    const maxZoom = options.maxZoom || 15;
    const currentZoom = options.zoomLevel || 10;

    // Skip clustering if zoom level is too high
    if (currentZoom > maxZoom) {
      return this.createUnclusteredResult(markers);
    }

    const grid: Map<string, MarkerData[]> = new Map();
    const clusters: ClusterData[] = [];
    const unclusteredMarkers: MarkerData[] = [];

    // Group markers by grid cell
    for (const marker of markers) {
      const gridKey = this.getGridKey(marker.lat, marker.lng, gridSize);

      if (!grid.has(gridKey)) {
        grid.set(gridKey, []);
      }
      grid.get(gridKey)!.push(marker);
    }

    // Create clusters from grid cells
    for (const [gridKey, cellMarkers] of grid.entries()) {
      if (cellMarkers.length > 1) {
        const cluster = this.createCluster(cellMarkers, gridKey);
        clusters.push(cluster);
      } else {
        unclusteredMarkers.push(...cellMarkers);
      }
    }

    return this.createResult(clusters, unclusteredMarkers, markers.length);
  }

  /**
   * K-means clustering algorithm
   */
  private kmeansClustering(markers: MarkerData[], options: ClusteringOptions): ClusteringResult {
    const maxClusters = Math.min(
      Math.ceil(markers.length / (options.maxMarkersPerCluster || 10)),
      Math.ceil(markers.length / 2)
    );

    if (maxClusters <= 1) {
      return this.createUnclusteredResult(markers);
    }

    // Initialize cluster centers randomly
    const centers = this.initializeKMeansCenters(markers, maxClusters);
    const clusters: ClusterData[] = [];
    const unclusteredMarkers: MarkerData[] = [];

    // K-means iterations
    for (let iteration = 0; iteration < 10; iteration++) {
      const assignments = this.assignMarkersToCenters(markers, centers);

      // Update centers
      const newCenters = this.updateKMeansCenters(markers, assignments, maxClusters);

      // Check for convergence
      if (this.centersConverged(centers, newCenters)) {
        break;
      }

      centers.splice(0, centers.length, ...newCenters);
    }

    // Create final clusters
    const assignments = this.assignMarkersToCenters(markers, centers);
    const clusterGroups = this.groupMarkersByCluster(markers, assignments, maxClusters);

    for (let i = 0; i < clusterGroups.length; i++) {
      const groupMarkers = clusterGroups[i];
      if (groupMarkers.length > 1) {
        const cluster = this.createCluster(groupMarkers, `kmeans_${i}`);
        clusters.push(cluster);
      } else {
        unclusteredMarkers.push(...groupMarkers);
      }
    }

    return this.createResult(clusters, unclusteredMarkers, markers.length);
  }

  /**
   * Hierarchical clustering algorithm
   */
  private hierarchicalClustering(markers: MarkerData[], options: ClusteringOptions): ClusteringResult {
    if (markers.length <= 1) {
      return this.createUnclusteredResult(markers);
    }

    // Create distance matrix
    const distances = this.calculateDistanceMatrix(markers);

    // Initialize clusters (each marker is its own cluster)
    let clusters = markers.map((marker, index) => ({
      id: `hierarchical_${index}`,
      center: { lat: marker.lat, lng: marker.lng },
      markers: [marker.id],
      count: 1,
      bounds: {
        northeast: { lat: marker.lat, lng: marker.lng },
        southwest: { lat: marker.lat, lng: marker.lng }
      }
    }));

    // Merge clusters until we reach desired number
    const maxClusters = Math.min(
      Math.ceil(markers.length / (options.maxMarkersPerCluster || 10)),
      Math.ceil(markers.length / 2)
    );

    while (clusters.length > maxClusters && clusters.length > 1) {
      const { cluster1Index, cluster2Index } = this.findClosestClusters(clusters, distances);

      if (cluster1Index === -1 || cluster2Index === -1) break;

      // Merge clusters
      const mergedCluster = this.mergeClusters(
        clusters[cluster1Index],
        clusters[cluster2Index],
        `hierarchical_${Date.now()}`
      );

      // Remove old clusters and add merged one
      clusters = clusters.filter((_, index) => index !== cluster1Index && index !== cluster2Index);
      clusters.push(mergedCluster);
    }

    const unclusteredMarkers: MarkerData[] = [];
    const finalClusters = clusters.filter(cluster => cluster.count > 1);

    return this.createResult(finalClusters, unclusteredMarkers, markers.length);
  }

  /**
   * Adaptive clustering that chooses the best algorithm based on data
   */
  private adaptiveClustering(markers: MarkerData[], options: ClusteringOptions): ClusteringResult {
    const markerCount = markers.length;
    const currentZoom = options.zoomLevel || 10;
    const maxZoom = options.maxZoom || 15;

    // Choose algorithm based on marker count and zoom level
    if (markerCount < 50) {
      return this.gridClustering(markers, options);
    } else if (markerCount < 200 && currentZoom < maxZoom - 2) {
      return this.kmeansClustering(markers, options);
    } else if (markerCount < 500) {
      return this.hierarchicalClustering(markers, options);
    } else {
      // For very large datasets, use optimized grid clustering
      return this.optimizedGridClustering(markers, options);
    }
  }

  /**
   * Optimized grid clustering for large datasets
   */
  private optimizedGridClustering(markers: MarkerData[], options: ClusteringOptions): ClusteringResult {
    const gridSize = (options.gridSize || 60) * 2; // Larger grid for performance
    const maxZoom = options.maxZoom || 15;
    const currentZoom = options.zoomLevel || 10;

    if (currentZoom > maxZoom) {
      return this.createUnclusteredResult(markers);
    }

    // Use spatial indexing for better performance
    const spatialIndex = this.createSpatialIndex(markers);
    const clusters: ClusterData[] = [];
    const unclusteredMarkers: MarkerData[] = [];
    const processed = new Set<string>();

    for (const marker of markers) {
      if (processed.has(marker.id)) continue;

      const nearbyMarkers = this.findNearbyMarkers(marker, spatialIndex, gridSize);

      if (nearbyMarkers.length > 1) {
        const cluster = this.createCluster(nearbyMarkers, `optimized_${clusters.length}`);
        clusters.push(cluster);

        // Mark all markers in cluster as processed
        nearbyMarkers.forEach(m => processed.add(m.id));
      } else {
        unclusteredMarkers.push(marker);
        processed.add(marker.id);
      }
    }

    return this.createResult(clusters, unclusteredMarkers, markers.length);
  }

  /**
   * Create a cluster from markers
   */
  private createCluster(markers: MarkerData[], clusterId: string): ClusterData {
    const center = this.calculateCenter(markers);
    const bounds = this.calculateBounds(markers);

    return {
      id: clusterId,
      center,
      markers: markers.map(m => m.id),
      count: markers.length,
      bounds
    };
  }

  /**
   * Calculate center of markers
   */
  private calculateCenter(markers: MarkerData[]): { lat: number; lng: number } {
    const totalLat = markers.reduce((sum, marker) => sum + marker.lat, 0);
    const totalLng = markers.reduce((sum, marker) => sum + marker.lng, 0);

    return {
      lat: totalLat / markers.length,
      lng: totalLng / markers.length
    };
  }

  /**
   * Calculate bounds of markers
   */
  private calculateBounds(markers: MarkerData[]): {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  } {
    const lats = markers.map(m => m.lat);
    const lngs = markers.map(m => m.lng);

    return {
      northeast: {
        lat: Math.max(...lats),
        lng: Math.max(...lngs)
      },
      southwest: {
        lat: Math.min(...lats),
        lng: Math.min(...lngs)
      }
    };
  }

  /**
   * Get grid key for coordinates
   */
  private getGridKey(lat: number, lng: number, gridSize: number): string {
    const gridLat = Math.floor(lat * 1000 / gridSize);
    const gridLng = Math.floor(lng * 1000 / gridSize);
    return `${gridLat}_${gridLng}`;
  }

  /**
   * Initialize K-means centers
   */
  private initializeKMeansCenters(markers: MarkerData[], k: number): { lat: number; lng: number }[] {
    const centers: { lat: number; lng: number }[] = [];

    // Use k-means++ initialization
    const firstCenter = markers[Math.floor(Math.random() * markers.length)];
    centers.push({ lat: firstCenter.lat, lng: firstCenter.lng });

    for (let i = 1; i < k; i++) {
      const distances = markers.map(marker => {
        const minDistance = Math.min(
          ...centers.map(center => this.calculateDistance(marker, center))
        );
        return minDistance * minDistance;
      });

      const totalDistance = distances.reduce((sum, dist) => sum + dist, 0);
      let random = Math.random() * totalDistance;

      for (let j = 0; j < markers.length; j++) {
        random -= distances[j];
        if (random <= 0) {
          centers.push({ lat: markers[j].lat, lng: markers[j].lng });
          break;
        }
      }
    }

    return centers;
  }

  /**
   * Assign markers to nearest centers
   */
  private assignMarkersToCenters(
    markers: MarkerData[],
    centers: { lat: number; lng: number }[]
  ): number[] {
    return markers.map(marker => {
      let minDistance = Infinity;
      let closestCenter = 0;

      for (let i = 0; i < centers.length; i++) {
        const distance = this.calculateDistance(marker, centers[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCenter = i;
        }
      }

      return closestCenter;
    });
  }

  /**
   * Update K-means centers
   */
  private updateKMeansCenters(
    markers: MarkerData[],
    assignments: number[],
    k: number
  ): { lat: number; lng: number }[] {
    const newCenters: { lat: number; lng: number }[] = [];

    for (let i = 0; i < k; i++) {
      const clusterMarkers = markers.filter((_, index) => assignments[index] === i);

      if (clusterMarkers.length > 0) {
        newCenters.push(this.calculateCenter(clusterMarkers));
      } else {
        // Keep old center if no markers assigned
        newCenters.push({ lat: 0, lng: 0 });
      }
    }

    return newCenters;
  }

  /**
   * Check if K-means centers have converged
   */
  private centersConverged(
    oldCenters: { lat: number; lng: number }[],
    newCenters: { lat: number; lng: number }[]
  ): boolean {
    const threshold = 0.001; // 1 meter

    for (let i = 0; i < oldCenters.length; i++) {
      const distance = this.calculateDistance(oldCenters[i], newCenters[i]);
      if (distance > threshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Group markers by cluster assignment
   */
  private groupMarkersByCluster(
    markers: MarkerData[],
    assignments: number[],
    k: number
  ): MarkerData[][] {
    const groups: MarkerData[][] = Array(k).fill(null).map(() => []);

    for (let i = 0; i < markers.length; i++) {
      groups[assignments[i]].push(markers[i]);
    }

    return groups;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Create spatial index for performance
   */
  private createSpatialIndex(markers: MarkerData[]): Map<string, MarkerData[]> {
    const index = new Map<string, MarkerData[]>();
    const gridSize = 0.01; // ~1km grid

    for (const marker of markers) {
      const key = this.getGridKey(marker.lat, marker.lng, gridSize * 1000);

      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key)!.push(marker);
    }

    return index;
  }

  /**
   * Find nearby markers using spatial index
   */
  private findNearbyMarkers(
    marker: MarkerData,
    spatialIndex: Map<string, MarkerData[]>,
    maxDistance: number
  ): MarkerData[] {
    const nearbyMarkers: MarkerData[] = [];
    const gridSize = 0.01;
    const searchRadius = 2; // Search 2 grid cells in each direction

    const centerGridLat = Math.floor(marker.lat / gridSize);
    const centerGridLng = Math.floor(marker.lng / gridSize);

    for (let latOffset = -searchRadius; latOffset <= searchRadius; latOffset++) {
      for (let lngOffset = -searchRadius; lngOffset <= searchRadius; lngOffset++) {
        const key = `${centerGridLat + latOffset}_${centerGridLng + lngOffset}`;
        const cellMarkers = spatialIndex.get(key) || [];

        for (const cellMarker of cellMarkers) {
          if (cellMarker.id !== marker.id) {
            const distance = this.calculateDistance(marker, cellMarker);
            if (distance <= maxDistance / 1000) { // Convert to km
              nearbyMarkers.push(cellMarker);
            }
          }
        }
      }
    }

    return nearbyMarkers;
  }

  /**
   * Calculate distance matrix for hierarchical clustering
   */
  private calculateDistanceMatrix(markers: MarkerData[]): number[][] {
    const matrix: number[][] = [];

    for (let i = 0; i < markers.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < markers.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          matrix[i][j] = this.calculateDistance(markers[i], markers[j]);
        }
      }
    }

    return matrix;
  }

  /**
   * Find closest clusters for hierarchical clustering
   */
  private findClosestClusters(
    clusters: ClusterData[],
    distances: number[][]
  ): { cluster1Index: number; cluster2Index: number } {
    let minDistance = Infinity;
    let cluster1Index = -1;
    let cluster2Index = -1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = this.calculateClusterDistance(clusters[i], clusters[j], distances);
        if (distance < minDistance) {
          minDistance = distance;
          cluster1Index = i;
          cluster2Index = j;
        }
      }
    }

    return { cluster1Index, cluster2Index };
  }

  /**
   * Calculate distance between clusters
   */
  private calculateClusterDistance(
    cluster1: ClusterData,
    cluster2: ClusterData,
    distances: number[][]
  ): number {
    // Use single linkage (minimum distance between any two points)
    let minDistance = Infinity;

    for (const marker1Id of cluster1.markers) {
      for (const marker2Id of cluster2.markers) {
        const marker1Index = parseInt(marker1Id.split('_')[1]);
        const marker2Index = parseInt(marker2Id.split('_')[1]);
        const distance = distances[marker1Index][marker2Index];
        minDistance = Math.min(minDistance, distance);
      }
    }

    return minDistance;
  }

  /**
   * Merge two clusters
   */
  private mergeClusters(
    cluster1: ClusterData,
    cluster2: ClusterData,
    newId: string
  ): ClusterData {
    const allMarkers = [...cluster1.markers, ...cluster2.markers];
    const center = this.calculateCenter([
      ...cluster1.markers.map(id => ({ id, lat: 0, lng: 0, data: {} })), // Simplified for merging
      ...cluster2.markers.map(id => ({ id, lat: 0, lng: 0, data: {} }))
    ]);

    return {
      id: newId,
      center,
      markers: allMarkers,
      count: allMarkers.length,
      bounds: this.mergeBounds(cluster1.bounds, cluster2.bounds)
    };
  }

  /**
   * Merge cluster bounds
   */
  private mergeBounds(
    bounds1?: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } },
    bounds2?: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } }
  ): { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } } | undefined {
    if (!bounds1) return bounds2;
    if (!bounds2) return bounds1;

    return {
      northeast: {
        lat: Math.max(bounds1.northeast.lat, bounds2.northeast.lat),
        lng: Math.max(bounds1.northeast.lng, bounds2.northeast.lng)
      },
      southwest: {
        lat: Math.min(bounds1.southwest.lat, bounds2.southwest.lat),
        lng: Math.min(bounds1.southwest.lng, bounds2.southwest.lng)
      }
    };
  }

  /**
   * Create unclustered result
   */
  private createUnclusteredResult(markers: MarkerData[]): ClusteringResult {
    return {
      clusters: [],
      unclusteredMarkers: markers,
      stats: {
        totalMarkers: markers.length,
        clusterCount: 0,
        averageClusterSize: 0,
        clusteringEfficiency: 0,
        processingTime: 0,
        memoryUsage: 0
      }
    };
  }

  /**
   * Create clustering result
   */
  private createResult(
    clusters: ClusterData[],
    unclusteredMarkers: MarkerData[],
    totalMarkers: number
  ): ClusteringResult {
    const clusterCount = clusters.length;
    const averageClusterSize = clusterCount > 0 ? totalMarkers / clusterCount : 0;
    const clusteringEfficiency = totalMarkers > 0 ? (totalMarkers - unclusteredMarkers.length) / totalMarkers : 0;

    return {
      clusters,
      unclusteredMarkers,
      stats: {
        totalMarkers,
        clusterCount,
        averageClusterSize,
        clusteringEfficiency,
        processingTime: 0, // Will be set by caller
        memoryUsage: this.estimateMemoryUsage(clusters, unclusteredMarkers)
      }
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(clusters: ClusterData[], unclusteredMarkers: MarkerData[]): number {
    const clusterMemory = clusters.length * 200; // Approximate bytes per cluster
    const markerMemory = unclusteredMarkers.length * 100; // Approximate bytes per marker
    return clusterMemory + markerMemory;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(markers: MarkerData[], options: ClusteringOptions): string {
    const markerHashes = markers
      .map(m => `${m.id}_${m.lat.toFixed(6)}_${m.lng.toFixed(6)}`)
      .sort()
      .join('|');

    const optionsHash = JSON.stringify({
      maxZoom: options.maxZoom || 15,
      gridSize: options.gridSize || 60,
      algorithm: options.algorithm || 'adaptive',
      maxMarkersPerCluster: options.maxMarkersPerCluster || 10,
      zoomLevel: options.zoomLevel || 10
    });

    return `clustering_${this.hashString(markerHashes)}_${this.hashString(optionsHash)}`;
  }

  /**
   * Simple hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cache clustering result
   */
  private cacheResult(key: string, result: ClusteringResult): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, result);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}

/**
 * Convenience function to get the clustering service instance
 */
export const getMarkerClusteringService = (): MarkerClusteringService => {
  return MarkerClusteringService.getInstance();
};

export default MarkerClusteringService;
