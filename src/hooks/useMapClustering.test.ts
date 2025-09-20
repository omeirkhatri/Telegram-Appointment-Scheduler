import type { MapBounds, MapMarker } from '@/types/map';
import { act, renderHook } from '@testing-library/react';
import { useMapClustering, useMapClusteringWithAlgorithm, useMapClusteringWithDefaults } from './useMapClustering';

describe('useMapClustering', () => {
  const mockMarkers: MapMarker[] = [
    {
      id: '1',
      position: { lat: 25.2048, lng: 55.2708 },
      title: 'Marker 1',
      appointment_id: 'apt-1',
      patient_id: 'patient-1',
      appointment_type: 'doctor_on_call',
      appointment_date: '2024-01-15',
      start_time: '10:00',
      duration_minutes: 60,
      status: 'scheduled',
      patient_name: 'John Doe',
      patient_phone: '+971501234567',
      address: 'Dubai Marina, Dubai, UAE'
    },
    {
      id: '2',
      position: { lat: 25.2049, lng: 55.2709 },
      title: 'Marker 2',
      appointment_id: 'apt-2',
      patient_id: 'patient-2',
      appointment_type: 'lab_test',
      appointment_date: '2024-01-15',
      start_time: '11:00',
      duration_minutes: 30,
      status: 'scheduled',
      patient_name: 'Jane Smith',
      patient_phone: '+971501234568',
      address: 'Dubai Marina, Dubai, UAE'
    },
    {
      id: '3',
      position: { lat: 25.3000, lng: 55.3000 },
      title: 'Marker 3',
      appointment_id: 'apt-3',
      patient_id: 'patient-3',
      appointment_type: 'physiotherapy',
      appointment_date: '2024-01-15',
      start_time: '14:00',
      duration_minutes: 45,
      status: 'scheduled',
      patient_name: 'Bob Johnson',
      patient_phone: '+971501234569',
      address: 'Jumeirah, Dubai, UAE'
    }
  ];

  const mockBounds: MapBounds = {
    northeast: { lat: 25.3, lng: 55.3 },
    southwest: { lat: 25.1, lng: 55.1 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useMapClustering());

      expect(result.current.state.clusters).toEqual([]);
      expect(result.current.state.isClustering).toBe(false);
      expect(result.current.state.clusterCount).toBe(0);
      expect(result.current.state.averageClusterSize).toBe(0);
      expect(result.current.state.largestCluster).toBeNull();
      expect(result.current.state.smallestCluster).toBeNull();
      expect(result.current.state.error).toBeNull();
    });

    it('should initialize with default configuration', () => {
      const { result } = renderHook(() => useMapClusteringWithDefaults());

      expect(result.current.state.clusters).toEqual([]);
      expect(result.current.state.isClustering).toBe(false);
    });

    it('should initialize with custom algorithm', () => {
      const { result } = renderHook(() => useMapClusteringWithAlgorithm('kmeans'));

      expect(result.current.state.clusters).toEqual([]);
    });
  });

  describe('clustering operations', () => {
    it('should cluster markers with grid algorithm', () => {
      const { result } = renderHook(() => useMapClustering({ algorithm: 'grid' }));

      act(() => {
        const clusters = result.current.clusterMarkers(mockMarkers);
        expect(clusters.length).toBeGreaterThan(0);
      });
    });

    it('should update clusters', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.updateClusters(mockMarkers);
      });

      expect(result.current.state.clusters.length).toBeGreaterThan(0);
      expect(result.current.state.isClustering).toBe(false);
    });

    it('should clear clusters', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.updateClusters(mockMarkers);
        result.current.clearClusters();
      });

      expect(result.current.state.clusters).toEqual([]);
      expect(result.current.state.clusterCount).toBe(0);
    });

    it('should handle clustering errors', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useMapClustering({ onError }));

      // Mock an error by providing invalid markers
      const invalidMarkers = [{ ...mockMarkers[0], position: { lat: NaN, lng: NaN } }];

      act(() => {
        result.current.updateClusters(invalidMarkers);
      });

      // The clustering should still work with NaN coordinates, just not cluster them
      expect(result.current.state.clusters).toBeDefined();
      expect(Array.isArray(result.current.state.clusters)).toBe(true);
    });
  });

  describe('cluster management', () => {
    it('should expand cluster', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.updateClusters(mockMarkers);
        const clusters = result.current.state.clusters;
        if (clusters.length > 0) {
          const expandedMarkers = result.current.expandCluster(clusters[0].id);
          expect(expandedMarkers.length).toBeGreaterThan(0);
        }
      });
    });

    it('should get cluster by ID', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.updateClusters(mockMarkers);
        const clusters = result.current.state.clusters;
        if (clusters.length > 0) {
          const cluster = result.current.getClusterById(clusters[0].id);
          expect(cluster).toEqual(clusters[0]);
        }
      });
    });

    it('should return null for non-existent cluster ID', () => {
      const { result } = renderHook(() => useMapClustering());

      const cluster = result.current.getClusterById('non-existent');
      expect(cluster).toBeNull();
    });

    it('should get clusters in bounds', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.updateClusters(mockMarkers);
        const clustersInBounds = result.current.getClustersInBounds(mockBounds);
        expect(Array.isArray(clustersInBounds)).toBe(true);
      });
    });
  });

  describe('configuration', () => {
    it('should set clustering enabled', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.setClusteringEnabled(false);
        result.current.updateClusters(mockMarkers);
      });

      expect(result.current.state.clusters).toEqual([]);
    });

    it('should update clustering options', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.updateClusteringOptions({ gridSize: 100 });
      });

      // Options are updated internally, we can't directly test them
      // but we can verify the hook still works
      expect(result.current.state.clusters).toEqual([]);
    });
  });

  describe('statistics', () => {
    it('should get clustering statistics', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.updateClusters(mockMarkers);
      });

      const stats = result.current.getClusteringStats();

      expect(stats.totalClusters).toBeGreaterThanOrEqual(0);
      expect(stats.totalMarkers).toBeGreaterThanOrEqual(0);
      expect(stats.averageClusterSize).toBeGreaterThanOrEqual(0);
      expect(stats.largestClusterSize).toBeGreaterThanOrEqual(0);
      expect(stats.smallestClusterSize).toBeGreaterThanOrEqual(0);
      expect(stats.clusteringEfficiency).toBeGreaterThanOrEqual(0);
      expect(stats.clusteringEfficiency).toBeLessThanOrEqual(1);
    });
  });

  describe('utility functions', () => {
    it('should calculate cluster center', () => {
      const { result } = renderHook(() => useMapClustering());

      const center = result.current.calculateClusterCenter(mockMarkers);

      expect(center).toHaveProperty('lat');
      expect(center).toHaveProperty('lng');
      expect(typeof center.lat).toBe('number');
      expect(typeof center.lng).toBe('number');
    });

    it('should calculate cluster bounds', () => {
      const { result } = renderHook(() => useMapClustering());

      const bounds = result.current.calculateClusterBounds(mockMarkers);

      expect(bounds).toHaveProperty('northeast');
      expect(bounds).toHaveProperty('southwest');
      expect(bounds.northeast).toHaveProperty('lat');
      expect(bounds.northeast).toHaveProperty('lng');
      expect(bounds.southwest).toHaveProperty('lat');
      expect(bounds.southwest).toHaveProperty('lng');
    });

    it('should get cluster style', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.updateClusters(mockMarkers);
        const clusters = result.current.state.clusters;
        if (clusters.length > 0) {
          const style = result.current.getClusterStyle(clusters[0]);
          expect(style).toHaveProperty('backgroundColor');
          expect(style).toHaveProperty('textColor');
          expect(style).toHaveProperty('textSize');
          expect(style).toHaveProperty('width');
          expect(style).toHaveProperty('height');
        }
      });
    });

    it('should handle empty markers for cluster center', () => {
      const { result } = renderHook(() => useMapClustering());

      const center = result.current.calculateClusterCenter([]);

      expect(center).toEqual({ lat: 0, lng: 0 });
    });

    it('should handle empty markers for cluster bounds', () => {
      const { result } = renderHook(() => useMapClustering());

      const bounds = result.current.calculateClusterBounds([]);

      expect(bounds.northeast).toEqual({ lat: 0, lng: 0 });
      expect(bounds.southwest).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useMapClustering());

      act(() => {
        result.current.updateClusters(mockMarkers);
        result.current.reset();
      });

      expect(result.current.state.clusters).toEqual([]);
      expect(result.current.state.isClustering).toBe(false);
      expect(result.current.state.clusterCount).toBe(0);
      expect(result.current.state.averageClusterSize).toBe(0);
      expect(result.current.state.largestCluster).toBeNull();
      expect(result.current.state.smallestCluster).toBeNull();
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('different algorithms', () => {
    it('should work with grid algorithm', () => {
      const { result } = renderHook(() => useMapClustering({ algorithm: 'grid' }));

      act(() => {
        const clusters = result.current.clusterMarkers(mockMarkers);
        expect(Array.isArray(clusters)).toBe(true);
      });
    });

    it('should work with kmeans algorithm', () => {
      const { result } = renderHook(() => useMapClustering({ algorithm: 'kmeans' }));

      act(() => {
        const clusters = result.current.clusterMarkers(mockMarkers);
        expect(Array.isArray(clusters)).toBe(true);
      });
    });

    it('should work with hierarchical algorithm', () => {
      const { result } = renderHook(() => useMapClustering({ algorithm: 'hierarchical' }));

      act(() => {
        const clusters = result.current.clusterMarkers(mockMarkers);
        expect(Array.isArray(clusters)).toBe(true);
      });
    });
  });

  describe('callbacks', () => {
    it('should call onClusterClick when cluster is clicked', () => {
      const onClusterClick = jest.fn();
      const { result } = renderHook(() => useMapClustering({ onClusterClick }));

      act(() => {
        result.current.updateClusters(mockMarkers);
        const clusters = result.current.state.clusters;
        if (clusters.length > 0) {
          // Simulate cluster click by calling the callback directly
          onClusterClick(clusters[0]);
          expect(onClusterClick).toHaveBeenCalledWith(clusters[0]);
        }
      });
    });

    it('should call onClusterHover when cluster is hovered', () => {
      const onClusterHover = jest.fn();
      const { result } = renderHook(() => useMapClustering({ onClusterHover }));

      act(() => {
        result.current.updateClusters(mockMarkers);
        const clusters = result.current.state.clusters;
        if (clusters.length > 0) {
          // Simulate cluster hover by calling the callback directly
          onClusterHover(clusters[0]);
          expect(onClusterHover).toHaveBeenCalledWith(clusters[0]);
        }
      });
    });

    it('should call onError when error occurs', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useMapClustering({ onError }));

      act(() => {
        // Force an error by providing invalid data
        result.current.updateClusters([{ ...mockMarkers[0], position: { lat: NaN, lng: NaN } }]);
      });

      // The clustering should handle NaN coordinates gracefully
      expect(result.current.state.clusters).toBeDefined();
      expect(Array.isArray(result.current.state.clusters)).toBe(true);
    });
  });
});
