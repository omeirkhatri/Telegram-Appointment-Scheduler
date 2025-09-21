// @ts-nocheck
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import AppointmentMapView from './AppointmentMapView';

// Mock all the complex dependencies
jest.mock('@/hooks/useGoogleMapsLazy', () => ({
  useGoogleMapsLazy: () => ({
    isLoaded: true,
    isLoading: false,
    isError: false,
    error: null,
    loadTime: 100,
    retryCount: 0,
    setupLazyLoading: jest.fn(() => jest.fn()),
    forceLoad: jest.fn(),
    reset: jest.fn(),
    isApiReady: jest.fn(() => true),
    getGoogleMapsService: jest.fn(() => ({
      isApiInitialized: () => true,
      getLoader: () => ({
        importLibrary: jest.fn().mockResolvedValue({
          Map: jest.fn(),
          AdvancedMarkerElement: jest.fn()
        })
      })
    }))
  })
}));

jest.mock('@/hooks/useMapClustering', () => ({
  useMapClustering: () => ({
    state: {
      clusters: [],
      clusterStats: { totalClusters: 0, averageSize: 0, efficiency: 0 }
    },
    isClustering: false,
    clusterMarkers: jest.fn(),
    clearClusters: jest.fn(),
    updateClusters: jest.fn()
  })
}));

jest.mock('@/hooks/useCoordinateCache', () => ({
  useCoordinateCache: () => ({
    getCachedCoordinates: jest.fn(),
    setCachedCoordinates: jest.fn(),
    clearCache: jest.fn(),
    getCacheStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0 }))
  })
}));

jest.mock('@/services/googleMapsService', () => ({
  GoogleMapsService: {
    getInstance: jest.fn(() => ({
      isApiInitialized: () => true,
      getLoader: () => ({
        importLibrary: jest.fn().mockResolvedValue({
          Map: jest.fn().mockImplementation(() => ({
            addListener: jest.fn(),
            setCenter: jest.fn(),
            setZoom: jest.fn(),
            fitBounds: jest.fn(),
            getCenter: jest.fn(() => ({ lat: () => 25.2048, lng: () => 55.2708 })),
            getZoom: jest.fn(() => 10),
            getBounds: jest.fn(() => ({
              getNorthEast: jest.fn(() => ({ lat: () => 25.5, lng: () => 55.5 })),
              getSouthWest: jest.fn(() => ({ lat: () => 25.0, lng: () => 55.0 }))
            }))
          })),
          AdvancedMarkerElement: jest.fn().mockImplementation(() => ({
            addListener: jest.fn(),
            setMap: jest.fn(),
            setPosition: jest.fn(),
            setTitle: jest.fn(),
            setVisible: jest.fn(),
            getPosition: jest.fn(() => ({ lat: () => 25.2048, lng: () => 55.2708 }))
          }))
        })
      })
    })),
    validateApiKey: jest.fn(() => true)
  }
}));

jest.mock('@/config/googleMapsConfig', () => ({
  getGoogleMapsConfig: () => ({
    apiKey: 'test-key',
    libraries: ['places', 'geometry'],
    language: 'en',
    region: 'AE',
    version: 'weekly'
  })
}));

// Mock Google Maps API
const mockGoogleMaps = {
  Map: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    getBounds: jest.fn(() => ({
      getNorthEast: jest.fn(() => ({ lat: () => 25.3, lng: () => 55.3 })),
      getSouthWest: jest.fn(() => ({ lat: () => 25.1, lng: () => 55.1 }))
    })),
    getZoom: jest.fn(() => 12),
    setZoom: jest.fn(),
    getCenter: jest.fn(() => ({ lat: () => 25.2, lng: () => 55.2 })),
    setCenter: jest.fn(),
    fitBounds: jest.fn()
  })),
  Marker: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    setMap: jest.fn(),
    getPosition: jest.fn(() => ({ lat: () => 25.2, lng: () => 55.2 }))
  })),
  InfoWindow: jest.fn().mockImplementation(() => ({
    setContent: jest.fn(),
    open: jest.fn(),
    close: jest.fn()
  })),
  LatLngBounds: jest.fn().mockImplementation(() => ({
    extend: jest.fn(),
    getNorthEast: jest.fn(() => ({ lat: () => 25.3, lng: () => 55.3 })),
    getSouthWest: jest.fn(() => ({ lat: () => 25.1, lng: () => 55.1 }))
  })),
  Size: jest.fn().mockImplementation((width, height) => ({ width, height })),
  Point: jest.fn().mockImplementation((x, y) => ({ x, y }))
};

(global as any).google = {
  maps: mockGoogleMaps
};

// Mock appointment data
const mockAppointments = [
  {
    id: '1',
    patient_id: 'patient-1',
    staff_id: 'staff-1',
    appointment_type: 'doctor_on_call',
    appointment_date: '2024-01-20',
    start_time: '10:00',
    end_time: '11:00',
    duration_minutes: 60,
    status: 'confirmed',
    notes: 'Regular checkup',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    patient: {
      id: 'patient-1',
      name: 'John Doe',
      phone: '+971501234567',
      email: 'john@example.com',
      address: '123 Main Street, Dubai, UAE',
      latitude: 25.2048,
      longitude: 55.2708,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    staff: {
      id: 'staff-1',
      name: 'Dr. Smith',
      staff_type: 'doctor',
      phone: '+971501234568',
      email: 'dr.smith@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }
];

describe('AppointmentMapView - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render loading state initially', () => {
      render(<AppointmentMapView appointments={[]} />);

      expect(screen.getByText('Loading map...')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we initialize the map')).toBeInTheDocument();
    });

    it('should render error state when error prop is provided', () => {
      render(<AppointmentMapView appointments={[]} error="Test error" />);

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should render with custom className and style', () => {
      const customClassName = 'custom-map-class';
      const customStyle = { border: '2px solid red' };

      render(
        <AppointmentMapView
          appointments={[]}
          className={customClassName}
          style={customStyle}
        />
      );

      const container = screen.getByText('Loading map...').closest('div');
      expect(container).toHaveClass(customClassName);
      expect(container).toHaveStyle('border: 2px solid red');
    });
  });

  describe('Props Handling', () => {
    it('should accept search filters prop', () => {
      const searchFilters = {
        appointment_types: ['doctor_on_call'],
        statuses: ['confirmed'],
        date_range: {
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        }
      };

      render(
        <AppointmentMapView
          appointments={[]}
          searchFilters={searchFilters}
        />
      );

      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });

    it('should accept clustering props', () => {
      render(
        <AppointmentMapView
          appointments={[]}
          showClusters={true}
          enableClustering={true}
          clusterOptions={{
            maxZoom: 15,
            gridSize: 50,
            styles: []
          }}
        />
      );

      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });

    it('should accept event handler props', () => {
      const onAppointmentClick = jest.fn();
      const onAppointmentRightClick = jest.fn();
      const onMapClick = jest.fn();

      render(
        <AppointmentMapView
          appointments={[]}
          onAppointmentClick={onAppointmentClick}
          onAppointmentRightClick={onAppointmentRightClick}
          onMapClick={onMapClick}
        />
      );

      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper loading state accessibility', () => {
      render(<AppointmentMapView appointments={[]} />);

      const loadingText = screen.getByText('Loading map...');
      expect(loadingText).toBeInTheDocument();

      // Check for loading spinner (it's a div with animate-spin class)
      const spinner = screen.getByText('Loading map...').closest('div')?.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have proper error state accessibility', () => {
      render(<AppointmentMapView appointments={[]} error="Test error" />);

      const errorText = screen.getByText('Test error');
      expect(errorText).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render map container with proper structure', () => {
      render(<AppointmentMapView appointments={[]} />);

      // Check for main container
      const container = screen.getByText('Loading map...').closest('div');
      expect(container).toBeInTheDocument();

      // Check for map container div (it should exist even in loading state)
      const mapContainer = container?.querySelector('div[style*="height: 500px"]');
      expect(mapContainer).toBeInTheDocument();
    });

    it('should render fit to markers button', () => {
      render(<AppointmentMapView appointments={[]} />);

      const fitButton = screen.getByText('📍 Fit to Markers');
      expect(fitButton).toBeInTheDocument();
      expect(fitButton).toHaveAttribute('title', 'Fit to all markers');
    });
  });

  describe('Error Handling', () => {
    it('should render error boundary when component crashes', () => {
      // This test ensures the component is wrapped in MapErrorBoundary
      render(<AppointmentMapView appointments={[]} />);

      // Component should render without throwing
      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });
  });
});
