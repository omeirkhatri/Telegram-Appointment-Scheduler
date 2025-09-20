import type { MapMarker } from '@/types/map';
import { act, renderHook } from '@testing-library/react';
import { useMapMarkers, useMapMarkersWithDefaults } from './useMapMarkers';

// Mock the geocoding hook
jest.mock('./useGeocoding', () => ({
  useGeocoding: () => ({
    geocode: jest.fn(),
    geocodeBatch: jest.fn(),
    state: {
      isLoading: false,
      cacheStats: { size: 0, maxSize: 1000, hitRate: 0 }
    }
  })
}));

describe('useMapMarkers', () => {
  const mockMarker: MapMarker = {
    id: '1',
    position: { lat: 25.2048, lng: 55.2708 },
    title: 'Test Appointment',
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useMapMarkers());

      expect(result.current.state.markers).toEqual([]);
      expect(result.current.state.clusters).toEqual([]);
      expect(result.current.state.selectedMarker).toBeNull();
      expect(result.current.state.selectedCluster).toBeNull();
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should initialize with default options', () => {
      const { result } = renderHook(() => useMapMarkersWithDefaults());

      expect(result.current.state.markers).toEqual([]);
      expect(result.current.state.clusters).toEqual([]);
    });
  });

  describe('marker management', () => {
    it('should add a marker', () => {
      const { result } = renderHook(() => useMapMarkers());

      act(() => {
        result.current.addMarker(mockMarker);
      });

      expect(result.current.state.markers).toHaveLength(1);
      expect(result.current.state.markers[0]).toEqual(mockMarker);
    });

    it('should update an existing marker', () => {
      const { result } = renderHook(() => useMapMarkers());

      act(() => {
        result.current.addMarker(mockMarker);
        result.current.updateMarker('1', { title: 'Updated Title' });
      });

      expect(result.current.state.markers[0].title).toBe('Updated Title');
    });

    it('should remove a marker', () => {
      const { result } = renderHook(() => useMapMarkers());

      act(() => {
        result.current.addMarker(mockMarker);
        result.current.removeMarker('1');
      });

      expect(result.current.state.markers).toHaveLength(0);
    });

    it('should clear all markers', () => {
      const { result } = renderHook(() => useMapMarkers());

      act(() => {
        result.current.addMarker(mockMarker);
        result.current.clearMarkers();
      });

      expect(result.current.state.markers).toHaveLength(0);
      expect(result.current.state.clusters).toHaveLength(0);
    });

    it('should set multiple markers', () => {
      const { result } = renderHook(() => useMapMarkers());
      const markers = [mockMarker, { ...mockMarker, id: '2' }];

      act(() => {
        result.current.setMarkers(markers);
      });

      expect(result.current.state.markers).toHaveLength(2);
    });
  });

  describe('selection management', () => {
    it('should select a marker', () => {
      const { result } = renderHook(() => useMapMarkers());

      act(() => {
        result.current.addMarker(mockMarker);
        result.current.selectMarker(mockMarker);
      });

      expect(result.current.state.selectedMarker).toEqual(mockMarker);
      expect(result.current.state.selectedCluster).toBeNull();
    });

    it('should clear selection when selecting null', () => {
      const { result } = renderHook(() => useMapMarkers());

      act(() => {
        result.current.addMarker(mockMarker);
        result.current.selectMarker(mockMarker);
        result.current.selectMarker(null);
      });

      expect(result.current.state.selectedMarker).toBeNull();
    });
  });

  describe('filtering and search', () => {
    it('should filter markers by appointment type', () => {
      const { result } = renderHook(() => useMapMarkers());
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', appointment_type: 'lab_test' as const }
      ];

      act(() => {
        result.current.setMarkers(markers);
      });

      const filtered = result.current.filterMarkers({
        appointment_types: ['doctor_on_call']
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].appointment_type).toBe('doctor_on_call');
    });

    it('should filter markers by status', () => {
      const { result } = renderHook(() => useMapMarkers());
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', status: 'completed' as const }
      ];

      act(() => {
        result.current.setMarkers(markers);
      });

      const filtered = result.current.filterMarkers({
        statuses: ['scheduled']
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('scheduled');
    });

    it('should filter markers by date range', () => {
      const { result } = renderHook(() => useMapMarkers());
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', appointment_date: '2024-01-20' }
      ];

      act(() => {
        result.current.setMarkers(markers);
      });

      const filtered = result.current.filterMarkers({
        date_range: {
          start_date: '2024-01-15',
          end_date: '2024-01-16'
        }
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].appointment_date).toBe('2024-01-15');
    });

    it('should search markers by query', () => {
      const { result } = renderHook(() => useMapMarkers());
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', patient_name: 'Jane Smith' }
      ];

      act(() => {
        result.current.setMarkers(markers);
      });

      const searchResults = result.current.searchMarkers('John');

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].patient_name).toBe('John Doe');
    });
  });

  describe('utility functions', () => {
    it('should get marker by ID', () => {
      const { result } = renderHook(() => useMapMarkers());

      act(() => {
        result.current.addMarker(mockMarker);
      });

      const foundMarker = result.current.getMarkerById('1');
      expect(foundMarker).toEqual(mockMarker);

      const notFoundMarker = result.current.getMarkerById('2');
      expect(notFoundMarker).toBeNull();
    });

    it('should get markers by type', () => {
      const { result } = renderHook(() => useMapMarkers());
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', appointment_type: 'lab_test' as const }
      ];

      act(() => {
        result.current.setMarkers(markers);
      });

      const doctorMarkers = result.current.getMarkersByType('doctor_on_call');
      expect(doctorMarkers).toHaveLength(1);

      const labMarkers = result.current.getMarkersByType('lab_test');
      expect(labMarkers).toHaveLength(1);
    });

    it('should get markers by status', () => {
      const { result } = renderHook(() => useMapMarkers());
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', status: 'completed' as const }
      ];

      act(() => {
        result.current.setMarkers(markers);
      });

      const scheduledMarkers = result.current.getMarkersByStatus('scheduled');
      expect(scheduledMarkers).toHaveLength(1);

      const completedMarkers = result.current.getMarkersByStatus('completed');
      expect(completedMarkers).toHaveLength(1);
    });

    it('should calculate bounds for markers', () => {
      const { result } = renderHook(() => useMapMarkers());
      const markers = [
        { ...mockMarker, position: { lat: 25.0, lng: 55.0 } },
        { ...mockMarker, id: '2', position: { lat: 25.1, lng: 55.1 } }
      ];

      act(() => {
        result.current.setMarkers(markers);
      });

      const bounds = result.current.calculateBounds();
      expect(bounds).toEqual({
        northeast: { lat: 25.1, lng: 55.1 },
        southwest: { lat: 25.0, lng: 55.0 }
      });
    });

    it('should return null bounds for empty markers', () => {
      const { result } = renderHook(() => useMapMarkers());

      const bounds = result.current.calculateBounds();
      expect(bounds).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should calculate statistics', () => {
      const { result } = renderHook(() => useMapMarkers());
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', appointment_type: 'lab_test' as const },
        { ...mockMarker, id: '3', status: 'completed' as const }
      ];

      act(() => {
        result.current.setMarkers(markers);
      });

      const stats = result.current.calculateStatistics();

      expect(stats.total_appointments).toBe(3);
      expect(stats.appointments_by_type.doctor_on_call).toBe(2);
      expect(stats.appointments_by_type.lab_test).toBe(1);
      expect(stats.appointments_by_status.scheduled).toBe(2);
      expect(stats.appointments_by_status.completed).toBe(1);
      expect(stats.total_patients).toBe(1); // Same patient_id
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useMapMarkers());

      act(() => {
        result.current.addMarker(mockMarker);
        result.current.selectMarker(mockMarker);
        result.current.reset();
      });

      expect(result.current.state.markers).toEqual([]);
      expect(result.current.state.clusters).toEqual([]);
      expect(result.current.state.selectedMarker).toBeNull();
      expect(result.current.state.selectedCluster).toBeNull();
    });
  });
});
