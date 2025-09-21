import {
    Coordinates,
    MAP_CONSTANTS,
    MapAction,
    MapBounds,
    MapClickEvent,
    MapCluster,
    MapCoordinates,
    MapError,
    MapMarker,
    MapMarkerClickEvent,
    MapPerformanceMetrics,
    MapSearchFilters,
    MapState,
    MapStatistics,
    MapViewConfig,
    isCoordinates,
    isMapMarker
} from './map';

describe('Map Types', () => {
  describe('Basic Types', () => {
    it('should create valid Coordinates', () => {
      const coords: Coordinates = { lat: 25.2048, lng: 55.2708 };
      expect(coords.lat).toBe(25.2048);
      expect(coords.lng).toBe(55.2708);
    });

    it('should create valid MapCoordinates with optional fields', () => {
      const coords: MapCoordinates = {
        lat: 25.2048,
        lng: 55.2708,
        accuracy: 10,
        altitude: 100,
        heading: 45,
        speed: 5.5,
        timestamp: Date.now()
      };
      expect(coords.lat).toBe(25.2048);
      expect(coords.accuracy).toBe(10);
      expect(coords.timestamp).toBeDefined();
    });
  });

  // Note: Geocoding types removed - using stored coordinates only

  describe('Map Marker Types', () => {
    it('should create valid MapMarker', () => {
      const marker: MapMarker = {
        id: 'marker-1',
        position: { lat: 25.2048, lng: 55.2708 },
        title: 'Dr. Smith Appointment',
        description: 'Regular checkup',
        appointment_id: 'apt-123',
        patient_id: 'patient-456',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 30,
        status: 'scheduled',
        patient_name: 'John Doe',
        patient_phone: '+971501234567',
        address: '123 Main St, Dubai, UAE',
        custom_fields: { priority: 'high' },
        notes: 'Patient prefers morning appointments',
        transportation_type: 'driver',
        driver_id: 'driver-789',
        pickup_instructions: 'Ring doorbell twice'
      };

      expect(marker.id).toBe('marker-1');
      expect(marker.appointment_type).toBe('doctor_on_call');
      expect(marker.status).toBe('scheduled');
      expect(marker.custom_fields?.priority).toBe('high');
    });

    it('should create valid MapCluster', () => {
      const markers: MapMarker[] = [
        {
          id: 'marker-1',
          position: { lat: 25.2048, lng: 55.2708 },
          title: 'Appointment 1',
          appointment_id: 'apt-1',
          patient_id: 'patient-1',
          appointment_type: 'doctor_on_call',
          appointment_date: '2024-01-15',
          start_time: '10:00',
          duration_minutes: 30,
          status: 'scheduled',
          patient_name: 'John Doe',
          patient_phone: '+971501234567',
          address: '123 Main St, Dubai, UAE'
        },
        {
          id: 'marker-2',
          position: { lat: 25.2050, lng: 55.2710 },
          title: 'Appointment 2',
          appointment_id: 'apt-2',
          patient_id: 'patient-2',
          appointment_type: 'lab_test',
          appointment_date: '2024-01-15',
          start_time: '11:00',
          duration_minutes: 45,
          status: 'confirmed',
          patient_name: 'Jane Smith',
          patient_phone: '+971501234568',
          address: '125 Main St, Dubai, UAE'
        }
      ];

      const cluster: MapCluster = {
        id: 'cluster-1',
        position: { lat: 25.2049, lng: 55.2709 },
        count: 2,
        markers,
        bounds: {
          northeast: { lat: 25.2050, lng: 55.2710 },
          southwest: { lat: 25.2048, lng: 55.2708 }
        }
      };

      expect(cluster.id).toBe('cluster-1');
      expect(cluster.count).toBe(2);
      expect(cluster.markers).toHaveLength(2);
    });
  });

  describe('Map Configuration Types', () => {
    it('should create valid MapViewConfig', () => {
      const config: MapViewConfig = {
        center: { lat: 25.2048, lng: 55.2708 },
        zoom: 12,
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: true,
        fullscreenControl: true,
        gestureHandling: 'auto',
        restriction: {
          latLngBounds: {
            north: 25.5,
            south: 24.9,
            east: 56.0,
            west: 54.5
          },
          strictBounds: true
        }
      };

      expect(config.center.lat).toBe(25.2048);
      expect(config.zoom).toBe(12);
      expect(config.mapTypeId).toBe('roadmap');
    });

    it('should create valid MapBounds', () => {
      const bounds: MapBounds = {
        northeast: { lat: 25.5, lng: 56.0 },
        southwest: { lat: 24.9, lng: 54.5 }
      };

      expect(bounds.northeast.lat).toBe(25.5);
      expect(bounds.southwest.lat).toBe(24.9);
    });
  });

  describe('Map Event Types', () => {
    it('should create valid MapClickEvent', () => {
      const event: MapClickEvent = {
        latLng: { lat: 25.2048, lng: 55.2708 },
        placeId: 'ChIJ123456789',
        stop: jest.fn()
      };

      expect(event.latLng.lat).toBe(25.2048);
      expect(event.placeId).toBe('ChIJ123456789');
      expect(typeof event.stop).toBe('function');
    });

    it('should create valid MapMarkerClickEvent', () => {
      const marker: MapMarker = {
        id: 'marker-1',
        position: { lat: 25.2048, lng: 55.2708 },
        title: 'Test Appointment',
        appointment_id: 'apt-1',
        patient_id: 'patient-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 30,
        status: 'scheduled',
        patient_name: 'John Doe',
        patient_phone: '+971501234567',
        address: '123 Main St, Dubai, UAE'
      };

      const event: MapMarkerClickEvent = {
        marker,
        latLng: { lat: 25.2048, lng: 55.2708 },
        stop: jest.fn()
      };

      expect(event.marker.id).toBe('marker-1');
      expect(event.latLng.lat).toBe(25.2048);
    });
  });

  describe('Search and Filter Types', () => {
    it('should create valid MapSearchFilters', () => {
      const filters: MapSearchFilters = {
        appointment_types: ['doctor_on_call', 'lab_test'],
        statuses: ['scheduled', 'confirmed'],
        date_range: {
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        },
        time_range: {
          start_time: '09:00',
          end_time: '17:00'
        },
        transportation_type: ['driver'],
        areas: ['Downtown', 'Marina'],
        cities: ['Dubai'],
        search_query: 'Dr. Smith'
      };

      expect(filters.appointment_types).toContain('doctor_on_call');
      expect(filters.date_range?.start_date).toBe('2024-01-01');
      expect(filters.areas).toContain('Downtown');
    });
  });

  describe('Statistics and Metrics Types', () => {
    it('should create valid MapStatistics', () => {
      const stats: MapStatistics = {
        total_appointments: 150,
        appointments_by_type: {
          doctor_on_call: 80,
          lab_test: 40,
          physiotherapy: 30
        },
        appointments_by_status: {
          scheduled: 100,
          confirmed: 40,
          completed: 10
        },
        appointments_by_area: {
          Downtown: 60,
          Marina: 50,
          JBR: 40
        },
        appointments_by_city: {
          Dubai: 150
        },
        total_patients: 120,
        coverage_area: {
          northeast: { lat: 25.5, lng: 56.0 },
          southwest: { lat: 24.9, lng: 54.5 }
        },
        density_score: 0.75
      };

      expect(stats.total_appointments).toBe(150);
      expect(stats.appointments_by_type.doctor_on_call).toBe(80);
      expect(stats.density_score).toBe(0.75);
    });

    it('should create valid MapPerformanceMetrics', () => {
      const metrics: MapPerformanceMetrics = {
        load_time: 1200,
        render_time: 800,
        marker_count: 50,
        cluster_count: 5,
        memory_usage: 1024 * 1024 * 10, // 10MB
        api_calls: 25,
        errors: 0
      };

      expect(metrics.load_time).toBe(1200);
      expect(metrics.memory_usage).toBe(1024 * 1024 * 10);
    });
  });

  describe('Error and State Types', () => {
    it('should create valid MapError', () => {
      const error: MapError = {
        code: 'MAP_ERROR',
        message: 'Failed to process map data',
        details: { address: 'Invalid Address' },
        timestamp: Date.now(),
        context: {
          component: 'MapService',
          action: 'processData',
          data: { address: 'Invalid Address' }
        }
      };

      expect(error.code).toBe('MAP_ERROR');
      expect(error.context?.component).toBe('MapService');
    });

    it('should create valid MapState', () => {
      const state: MapState = {
        is_loading: false,
        is_initialized: true,
        error: null,
        markers: [],
        clusters: [],
        selected_marker: null,
        selected_cluster: null,
        view_config: {
          center: { lat: 25.2048, lng: 55.2708 },
          zoom: 12,
          mapTypeId: 'roadmap'
        },
        search_filters: {},
        statistics: null,
        performance_metrics: null
      };

      expect(state.is_loading).toBe(false);
      expect(state.is_initialized).toBe(true);
      expect(state.markers).toHaveLength(0);
    });
  });

  describe('Action Types', () => {
    it('should create valid MapAction for setting markers', () => {
      const action: MapAction = {
        type: 'SET_MARKERS',
        payload: []
      };

      expect(action.type).toBe('SET_MARKERS');
      expect(Array.isArray(action.payload)).toBe(true);
    });

    it('should create valid MapAction for updating view config', () => {
      const action: MapAction = {
        type: 'UPDATE_VIEW_CONFIG',
        payload: { zoom: 15 }
      };

      expect(action.type).toBe('UPDATE_VIEW_CONFIG');
      expect(action.payload.zoom).toBe(15);
    });
  });

  describe('Constants', () => {
    it('should have valid MAP_CONSTANTS', () => {
      expect(MAP_CONSTANTS.DEFAULT_ZOOM).toBe(12);
      expect(MAP_CONSTANTS.MIN_ZOOM).toBe(1);
      expect(MAP_CONSTANTS.MAX_ZOOM).toBe(20);
      expect(MAP_CONSTANTS.DEFAULT_CENTER.lat).toBe(25.2048);
      expect(MAP_CONSTANTS.DEFAULT_CENTER.lng).toBe(55.2708);
      expect(MAP_CONSTANTS.CLUSTER_GRID_SIZE).toBe(60);
      expect(MAP_CONSTANTS.CLUSTER_MAX_ZOOM).toBe(15);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify Coordinates', () => {
      const validCoords = { lat: 25.2048, lng: 55.2708 };
      const invalidCoords = { lat: 'invalid', lng: 55.2708 };
      const nullCoords = null;

      expect(isCoordinates(validCoords)).toBe(true);
      expect(isCoordinates(invalidCoords)).toBe(false);
      expect(isCoordinates(nullCoords)).toBe(false);
    });

    it('should correctly identify MapMarker', () => {
      const validMarker: MapMarker = {
        id: 'marker-1',
        position: { lat: 25.2048, lng: 55.2708 },
        title: 'Test',
        appointment_id: 'apt-1',
        patient_id: 'patient-1',
        appointment_type: 'doctor_on_call',
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 30,
        status: 'scheduled',
        patient_name: 'John Doe',
        patient_phone: '+971501234567',
        address: '123 Main St, Dubai, UAE'
      };

      const invalidMarker = { id: 'marker-1', position: 'invalid' };

      expect(isMapMarker(validMarker)).toBe(true);
      expect(isMapMarker(invalidMarker)).toBe(false);
    });

    // Note: isGeocodingResult test removed - using stored coordinates only
  });

  describe('Complex Type Combinations', () => {
    it('should handle complete appointment to marker conversion', () => {
      const appointment = {
        id: 'apt-123',
        patient_id: 'patient-456',
        appointment_type: 'doctor_on_call' as const,
        appointment_date: '2024-01-15',
        start_time: '10:00',
        duration_minutes: 30,
        status: 'scheduled' as const,
        patient: {
          id: 'patient-456',
          name: 'John Doe',
          phone: '+971501234567',
          flat_villa_no: '123',
          building_street: 'Main Street',
          area: 'Downtown',
          city: 'Dubai'
        }
      };

      const marker: MapMarker = {
        id: `marker-${appointment.id}`,
        position: { lat: 25.2048, lng: 55.2708 }, // Would be geocoded
        title: `${appointment.patient.name} - ${appointment.appointment_type}`,
        description: `${appointment.start_time} (${appointment.duration_minutes}min)`,
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        appointment_type: appointment.appointment_type,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        duration_minutes: appointment.duration_minutes,
        status: appointment.status,
        patient_name: appointment.patient.name,
        patient_phone: appointment.patient.phone,
        address: `${appointment.patient.flat_villa_no}, ${appointment.patient.building_street}, ${appointment.patient.area}, ${appointment.patient.city}`
      };

      expect(marker.appointment_id).toBe(appointment.id);
      expect(marker.patient_name).toBe(appointment.patient.name);
      expect(marker.title).toContain(appointment.patient.name);
    });

    // Note: Geocoding response processing test removed - using stored coordinates only
  });
});
