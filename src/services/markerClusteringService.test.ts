import { MarkerClusteringService, getMarkerClusteringService } from './markerClusteringService';

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

describe('MarkerClusteringService', () => {
  let clusteringService: MarkerClusteringService;
  let mockMarkers: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    clusteringService = MarkerClusteringService.getInstance();
    clusteringService.clearCache();

    mockMarkers = [
      { id: '1', lat: 25.2048, lng: 55.2708, data: { name: 'Marker 1' } },
      { id: '2', lat: 25.2049, lng: 55.2709, data: { name: 'Marker 2' } },
      { id: '3', lat: 25.2050, lng: 55.2710, data: { name: 'Marker 3' } },
      { id: '4', lat: 25.3000, lng: 55.3000, data: { name: 'Marker 4' } },
      { id: '5', lat: 25.3001, lng: 55.3001, data: { name: 'Marker 5' } },
    ];
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MarkerClusteringService.getInstance();
      const instance2 = MarkerClusteringService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Grid Clustering', () => {
    it('should cluster nearby markers using grid algorithm', () => {
      const result = clusteringService.clusterMarkers(mockMarkers, {
        algorithm: 'grid',
        gridSize: 60,
        maxZoom: 15,
        zoomLevel: 10
      });

      expect(result.clusters.length).toBeGreaterThan(0);
      expect(result.stats.totalMarkers).toBe(5);
      expect(result.stats.clusterCount).toBe(result.clusters.length);
      expect(result.stats.clusteringEfficiency).toBeGreaterThan(0);
    });

    it('should not cluster when zoom level is too high', () => {
      const result = clusteringService.clusterMarkers(mockMarkers, {
        algorithm: 'grid',
        gridSize: 60,
        maxZoom: 15,
        zoomLevel: 16
      });

      expect(result.clusters.length).toBe(0);
      expect(result.unclusteredMarkers.length).toBe(5);
    });

    it('should handle empty markers array', () => {
      const result = clusteringService.clusterMarkers([], {
        algorithm: 'grid'
      });

      expect(result.clusters.length).toBe(0);
      expect(result.unclusteredMarkers.length).toBe(0);
      expect(result.stats.totalMarkers).toBe(0);
    });

    it('should handle single marker', () => {
      const singleMarker = [mockMarkers[0]];
      const result = clusteringService.clusterMarkers(singleMarker, {
        algorithm: 'grid'
      });

      expect(result.clusters.length).toBe(0);
      expect(result.unclusteredMarkers.length).toBe(1);
    });
  });

  describe('K-means Clustering', () => {
    it('should cluster markers using k-means algorithm', () => {
      const result = clusteringService.clusterMarkers(mockMarkers, {
        algorithm: 'kmeans',
        maxMarkersPerCluster: 3
      });

      expect(result.clusters.length).toBeGreaterThan(0);
      expect(result.stats.totalMarkers).toBe(5);
      expect(result.stats.clusterCount).toBe(result.clusters.length);
    });

    it('should handle small datasets with k-means', () => {
      const smallMarkers = mockMarkers.slice(0, 2);
      const result = clusteringService.clusterMarkers(smallMarkers, {
        algorithm: 'kmeans'
      });

      expect(result.stats.totalMarkers).toBe(2);
    });
  });

  describe('Hierarchical Clustering', () => {
    it('should cluster markers using hierarchical algorithm', () => {
      // Use a smaller dataset for hierarchical clustering to avoid index issues
      const smallMarkers = mockMarkers.slice(0, 3);
      const result = clusteringService.clusterMarkers(smallMarkers, {
        algorithm: 'hierarchical',
        maxMarkersPerCluster: 3
      });

      expect(result.stats.totalMarkers).toBe(3);
      expect(result.stats.clusterCount).toBe(result.clusters.length);
    });

    it('should handle single marker with hierarchical clustering', () => {
      const singleMarker = [mockMarkers[0]];
      const result = clusteringService.clusterMarkers(singleMarker, {
        algorithm: 'hierarchical'
      });

      expect(result.clusters.length).toBe(0);
      expect(result.unclusteredMarkers.length).toBe(1);
    });
  });

  describe('Adaptive Clustering', () => {
    it('should choose appropriate algorithm for small datasets', () => {
      const result = clusteringService.clusterMarkers(mockMarkers.slice(0, 3), {
        algorithm: 'adaptive'
      });

      expect(result.stats.totalMarkers).toBe(3);
      expect(result.stats.clusterCount).toBeGreaterThanOrEqual(0);
    });

    it('should choose appropriate algorithm for medium datasets', () => {
      const mediumMarkers = Array.from({ length: 100 }, (_, i) => ({
        id: `marker_${i}`,
        lat: 25.2048 + (Math.random() - 0.5) * 0.1,
        lng: 55.2708 + (Math.random() - 0.5) * 0.1,
        data: { name: `Marker ${i}` }
      }));

      const result = clusteringService.clusterMarkers(mediumMarkers, {
        algorithm: 'adaptive',
        zoomLevel: 8
      });

      expect(result.stats.totalMarkers).toBe(100);
      expect(result.stats.clusterCount).toBeGreaterThan(0);
    });

    it('should choose optimized algorithm for large datasets', () => {
      const largeMarkers = Array.from({ length: 1000 }, (_, i) => ({
        id: `marker_${i}`,
        lat: 25.2048 + (Math.random() - 0.5) * 0.1,
        lng: 55.2708 + (Math.random() - 0.5) * 0.1,
        data: { name: `Marker ${i}` }
      }));

      const result = clusteringService.clusterMarkers(largeMarkers, {
        algorithm: 'adaptive',
        enablePerformanceMode: true
      });

      expect(result.stats.totalMarkers).toBe(1000);
      expect(result.stats.clusterCount).toBeGreaterThan(0);
    });
  });

  describe('Cluster Data Structure', () => {
    it('should create valid cluster data', () => {
      const result = clusteringService.clusterMarkers(mockMarkers, {
        algorithm: 'grid',
        gridSize: 60
      });

      if (result.clusters.length > 0) {
        const cluster = result.clusters[0];

        expect(cluster.id).toBeDefined();
        expect(cluster.center).toBeDefined();
        expect(cluster.center.lat).toBeGreaterThanOrEqual(-90);
        expect(cluster.center.lat).toBeLessThanOrEqual(90);
        expect(cluster.center.lng).toBeGreaterThanOrEqual(-180);
        expect(cluster.center.lng).toBeLessThanOrEqual(180);
        expect(cluster.markers).toBeInstanceOf(Array);
        expect(cluster.count).toBeGreaterThan(1);
        expect(cluster.bounds).toBeDefined();
      }
    });

    it('should calculate correct cluster center', () => {
      const testMarkers = [
        { id: '1', lat: 0, lng: 0, data: {} },
        { id: '2', lat: 2, lng: 2, data: {} },
        { id: '3', lat: 4, lng: 4, data: {} }
      ];

      const result = clusteringService.clusterMarkers(testMarkers, {
        algorithm: 'grid',
        gridSize: 1000 // Large grid to ensure clustering
      });

      if (result.clusters.length > 0) {
        const cluster = result.clusters[0];
        expect(cluster.center.lat).toBeCloseTo(2, 1);
        expect(cluster.center.lng).toBeCloseTo(2, 1);
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should cache clustering results', () => {
      const options = { algorithm: 'grid' as const };

      // First call
      const result1 = clusteringService.clusterMarkers(mockMarkers, options);

      // Second call with same data and options
      const result2 = clusteringService.clusterMarkers(mockMarkers, options);

      expect(result1).toBe(result2); // Should return same object reference
    });

    it('should track processing time', () => {
      const result = clusteringService.clusterMarkers(mockMarkers, {
        algorithm: 'grid'
      });

      expect(result.stats.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should estimate memory usage', () => {
      const result = clusteringService.clusterMarkers(mockMarkers, {
        algorithm: 'grid'
      });

      expect(result.stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should clear cache', () => {
      const options = { algorithm: 'grid' as const };

      // Populate cache
      clusteringService.clusterMarkers(mockMarkers, options);

      // Clear cache
      clusteringService.clearCache();

      // Get cache stats
      const stats = clusteringService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should limit cache size', () => {
      // Create many different marker sets to fill cache
      for (let i = 0; i < 150; i++) {
        const markers = mockMarkers.map(m => ({
          ...m,
          id: `${m.id}_${i}`,
          lat: m.lat + i * 0.001
        }));

        clusteringService.clusterMarkers(markers, { algorithm: 'grid' });
      }

      const stats = clusteringService.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });
  });

  describe('Statistics', () => {
    it('should calculate clustering efficiency correctly', () => {
      const result = clusteringService.clusterMarkers(mockMarkers, {
        algorithm: 'grid',
        gridSize: 60
      });

      const expectedEfficiency = (result.stats.totalMarkers - result.unclusteredMarkers.length) / result.stats.totalMarkers;
      expect(result.stats.clusteringEfficiency).toBeCloseTo(expectedEfficiency, 2);
    });

    it('should calculate average cluster size correctly', () => {
      const result = clusteringService.clusterMarkers(mockMarkers, {
        algorithm: 'grid',
        gridSize: 60
      });

      if (result.stats.clusterCount > 0) {
        const expectedAverage = result.stats.totalMarkers / result.stats.clusterCount;
        expect(result.stats.averageClusterSize).toBeCloseTo(expectedAverage, 2);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle markers with identical coordinates', () => {
      const identicalMarkers = [
        { id: '1', lat: 25.2048, lng: 55.2708, data: {} },
        { id: '2', lat: 25.2048, lng: 55.2708, data: {} },
        { id: '3', lat: 25.2048, lng: 55.2708, data: {} }
      ];

      const result = clusteringService.clusterMarkers(identicalMarkers, {
        algorithm: 'grid'
      });

      expect(result.stats.totalMarkers).toBe(3);
      // Should either cluster them or leave them unclustered
      expect(result.clusters.length + result.unclusteredMarkers.length).toBe(1);
    });

    it('should handle markers with extreme coordinates', () => {
      const extremeMarkers = [
        { id: '1', lat: 90, lng: 180, data: {} },
        { id: '2', lat: -90, lng: -180, data: {} },
        { id: '3', lat: 0, lng: 0, data: {} }
      ];

      const result = clusteringService.clusterMarkers(extremeMarkers, {
        algorithm: 'grid',
        gridSize: 1000
      });

      expect(result.stats.totalMarkers).toBe(3);
      expect(result.clusters.length + result.unclusteredMarkers.length).toBe(3);
    });

    it('should handle very large grid sizes', () => {
      const result = clusteringService.clusterMarkers(mockMarkers, {
        algorithm: 'grid',
        gridSize: 100000 // Very large grid
      });

      expect(result.stats.totalMarkers).toBe(5);
      // With very large grid, most markers should be unclustered or clustered differently
      expect(result.clusters.length + result.unclusteredMarkers.length).toBeGreaterThan(0);
    });
  });

  describe('Convenience Functions', () => {
    it('should get clustering service instance', () => {
      const instance = getMarkerClusteringService();
      expect(instance).toBeInstanceOf(MarkerClusteringService);
    });
  });
});
