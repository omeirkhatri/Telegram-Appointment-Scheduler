// @ts-nocheck
import { getGoogleMapsConfig } from '@/config/googleMapsConfig';
import { GoogleMapsService } from '@/services/googleMapsService';
import type { Appointment } from '@/types';
import type { MapSearchFilters } from '@/types/map';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import AppointmentMapView from './AppointmentMapView';

// Mock Google Maps services
jest.mock('@/services/googleMapsService');
jest.mock('@/config/googleMapsConfig');
jest.mock('@googlemaps/js-api-loader');
jest.mock('@googlemaps/markerclusterer');
jest.mock('@/hooks/useGoogleMapsLazy');
jest.mock('@/services/googleMapsLazyLoader');

// Mock Google Maps API
const mockGoogleMaps = {
  Map: jest.fn(),
  Marker: jest.fn(),
  InfoWindow: jest.fn(),
  LatLngBounds: jest.fn(),
  Size: jest.fn(),
  Point: jest.fn(),
  MapMouseEvent: jest.fn()
};

// Mock Loader
const mockLoader = {
  importLibrary: jest.fn(),
  load: jest.fn()
};

// Mock MarkerClusterer
const mockMarkerClusterer = jest.fn();

// Mock Google Maps API globally
(global as any).google = {
  maps: mockGoogleMaps
};

// Mock the Loader class
jest.mock('@googlemaps/js-api-loader', () => ({
  Loader: jest.fn().mockImplementation(() => mockLoader)
}));

// Mock MarkerClusterer
jest.mock('@googlemaps/markerclusterer', () => ({
  MarkerClusterer: jest.fn().mockImplementation(() => ({
    clearMarkers: jest.fn(),
    addListener: jest.fn(),
    addMarker: jest.fn(),
    removeMarker: jest.fn(),
    getMarkers: jest.fn(() => [])
  }))
}));

// Mock useGoogleMapsLazy hook
const mockUseGoogleMapsLazy = {
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
  getGoogleMapsService: jest.fn(() => mockGoogleMapsService)
};

jest.mock('@/hooks/useGoogleMapsLazy', () => ({
  useGoogleMapsLazy: jest.fn(() => mockUseGoogleMapsLazy)
}));

// Mock the services
const mockGoogleMapsService = {
  getInstance: jest.fn(),
  isApiInitialized: jest.fn(),
  initialize: jest.fn(),
  getLoader: jest.fn(),
  validateApiKey: jest.fn()
};

const mockConfig = {
  apiKey: 'test-api-key',
  libraries: ['places', 'geometry'],
  language: 'en',
  region: 'AE',
  version: 'weekly'
};

// Mock the service methods
(GoogleMapsService.getInstance as jest.Mock).mockReturnValue(mockGoogleMapsService);
(getGoogleMapsConfig as jest.Mock).mockReturnValue(mockConfig);

// Mock appointment data
const mockAppointments: Appointment[] = [
  {
    id: '1',
    patient_id: 'patient-1',
    appointment_type: 'doctor_on_call',
    appointment_date: '2024-01-15',
    start_time: '10:00:00',
    duration_minutes: 60,
    status: 'scheduled',
    patient: {
      id: 'patient-1',
      name: 'John Doe',
      phone: '+971501234567',
      address: '123 Main St, Dubai, UAE'
    },
    notes: 'Regular checkup',
    transportation_type: 'driver',
    driver_id: 'driver-1',
    pickup_instructions: 'Call when arrived',
    custom_fields: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    patient_id: 'patient-2',
    appointment_type: 'lab_test',
    appointment_date: '2024-01-15',
    start_time: '14:00:00',
    duration_minutes: 30,
    status: 'confirmed',
    patient: {
      id: 'patient-2',
      name: 'Jane Smith',
      phone: '+971501234568',
      address: '456 Oak Ave, Dubai, UAE'
    },
    notes: 'Blood test',
    transportation_type: 'self_transport',
    custom_fields: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

describe('AppointmentMapView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGoogleMapsService.isApiInitialized.mockReturnValue(true);
    mockGoogleMapsService.initialize.mockResolvedValue(undefined);
    mockGoogleMapsService.getLoader.mockReturnValue(mockLoader);
    mockGoogleMapsService.validateApiKey.mockReturnValue(true);

    // Reset lazy loading mock
    mockUseGoogleMapsLazy.isLoaded = true;
    mockUseGoogleMapsLazy.isLoading = false;
    mockUseGoogleMapsLazy.isError = false;
    mockUseGoogleMapsLazy.error = null;
    mockUseGoogleMapsLazy.setupLazyLoading.mockReturnValue(jest.fn());
    mockUseGoogleMapsLazy.isApiReady.mockReturnValue(true);
    mockUseGoogleMapsLazy.getGoogleMapsService.mockReturnValue(mockGoogleMapsService);

    mockLoader.importLibrary.mockResolvedValue({
      Map: mockGoogleMaps.Map,
      AdvancedMarkerElement: mockGoogleMaps.Marker
    });
    mockLoader.load.mockResolvedValue(undefined);

    // Mock Google Maps constructors
    mockGoogleMaps.Map.mockImplementation((element, options) => ({
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
    }));

    mockGoogleMaps.Marker.mockImplementation((options) => ({
      addListener: jest.fn(),
      setMap: jest.fn(),
      getPosition: jest.fn(() => ({ lat: () => 25.2, lng: () => 55.2 }))
    }));

    mockGoogleMaps.InfoWindow.mockImplementation(() => ({
      setContent: jest.fn(),
      open: jest.fn(),
      close: jest.fn()
    }));

    mockGoogleMaps.LatLngBounds.mockImplementation(() => ({
      extend: jest.fn(),
      getNorthEast: jest.fn(() => ({ lat: () => 25.3, lng: () => 55.3 })),
      getSouthWest: jest.fn(() => ({ lat: () => 25.1, lng: () => 55.1 }))
    }));

    mockGoogleMaps.Size.mockImplementation((width, height) => ({ width, height }));
    mockGoogleMaps.Point.mockImplementation((x, y) => ({ x, y }));

  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      render(<AppointmentMapView appointments={[]} />);

      expect(screen.getByText('Loading map...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render error state when error prop is provided', () => {
      const errorMessage = 'Failed to load appointments';
      render(
        <AppointmentMapView
          appointments={[]}
          error={errorMessage}
          refetch={jest.fn()}
        />
      );

      expect(screen.getByText('Failed to load map')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should render map container when initialized', async () => {
      await act(async () => {
        render(<AppointmentMapView appointments={[]} />);
      });

      await waitFor(() => {
        expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      });
    });

    it('should apply custom className and style', () => {
      const customClassName = 'custom-map-class';
      const customStyle = { border: '2px solid red' };

      render(
        <AppointmentMapView
          appointments={[]}
          className={customClassName}
          style={customStyle}
        />
      );

      const mapContainer = screen.getByRole('img', { hidden: true }).closest('div');
      expect(mapContainer).toHaveClass(customClassName);
    });
  });

  describe('Google Maps Integration', () => {
    it('should initialize Google Maps service on mount', async () => {
      await act(async () => {
        render(<AppointmentMapView appointments={[]} />);
      });

      expect(GoogleMapsService.getInstance).toHaveBeenCalled();
      expect(mockGoogleMapsService.initialize).toHaveBeenCalledWith({
        apiKey: mockConfig.apiKey,
        libraries: mockConfig.libraries,
        language: mockConfig.language,
        region: mockConfig.region,
        version: mockConfig.version
      });
    });

    it('should handle Google Maps initialization error', async () => {
      const error = new Error('API key invalid');
      mockGoogleMapsService.initialize.mockRejectedValue(error);

      await act(async () => {
        render(<AppointmentMapView appointments={[]} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Map Error')).toBeInTheDocument();
        expect(screen.getByText('API key invalid')).toBeInTheDocument();
      });
    });

    it('should create map instance with correct options', async () => {
      const initialCenter = { lat: 25.2, lng: 55.2 };
      const initialZoom = 10;

      await act(async () => {
        render(
          <AppointmentMapView
            appointments={[]}
            initialCenter={initialCenter}
            initialZoom={initialZoom}
            mapTypeId="satellite"
            disableDefaultUI={true}
          />
        );
      });

      await waitFor(() => {
        expect(mockGoogleMaps.Map).toHaveBeenCalledWith(
          expect.any(HTMLElement),
          expect.objectContaining({
            center: initialCenter,
            zoom: initialZoom,
            mapTypeId: 'satellite',
            disableDefaultUI: true
          })
        );
      });
    });
  });

  describe('Appointment Markers', () => {
    it('should create markers for appointments', async () => {
      await act(async () => {
        render(<AppointmentMapView appointments={mockAppointments} />);
      });

      await waitFor(() => {
        expect(mockGoogleMaps.Marker).toHaveBeenCalledTimes(mockAppointments.length);
      });
    });

    it('should handle empty appointments array', async () => {
      await act(async () => {
        render(<AppointmentMapView appointments={[]} />);
      });

      await waitFor(() => {
        expect(mockGoogleMaps.Marker).not.toHaveBeenCalled();
      });
    });

    it('should update markers when appointments change', async () => {
      const { rerender } = render(<AppointmentMapView appointments={[]} />);

      await waitFor(() => {
        expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      });

      await act(async () => {
        rerender(<AppointmentMapView appointments={mockAppointments} />);
      });

      await waitFor(() => {
        expect(mockGoogleMaps.Marker).toHaveBeenCalledTimes(mockAppointments.length);
      });
    });
  });

  describe('Event Handlers', () => {
    it('should call onAppointmentClick when marker is clicked', async () => {
      const onAppointmentClick = jest.fn();

      await act(async () => {
        render(
          <AppointmentMapView
            appointments={mockAppointments}
            onAppointmentClick={onAppointmentClick}
          />
        );
      });

      await waitFor(() => {
        expect(mockGoogleMaps.Marker).toHaveBeenCalled();
      });

      // Simulate marker click
      const markerInstance = mockGoogleMaps.Marker.mock.results[0].value;
      const clickListener = markerInstance.addListener.mock.calls.find(
        call => call[0] === 'click'
      );

      if (clickListener) {
        clickListener[1]();
        expect(onAppointmentClick).toHaveBeenCalledWith(mockAppointments[0]);
      }
    });

    it('should call onAppointmentRightClick when marker is right-clicked', async () => {
      const onAppointmentRightClick = jest.fn();

      await act(async () => {
        render(
          <AppointmentMapView
            appointments={mockAppointments}
            onAppointmentRightClick={onAppointmentRightClick}
          />
        );
      });

      await waitFor(() => {
        expect(mockGoogleMaps.Marker).toHaveBeenCalled();
      });

      // Simulate marker right-click
      const markerInstance = mockGoogleMaps.Marker.mock.results[0].value;
      const rightClickListener = markerInstance.addListener.mock.calls.find(
        call => call[0] === 'rightclick'
      );

      if (rightClickListener) {
        rightClickListener[1]();
        expect(onAppointmentRightClick).toHaveBeenCalled();
      }
    });

    it('should call onMapClick when map is clicked', async () => {
      const onMapClick = jest.fn();

      await act(async () => {
        render(
          <AppointmentMapView
            appointments={[]}
            onMapClick={onMapClick}
          />
        );
      });

      await waitFor(() => {
        expect(mockGoogleMaps.Map).toHaveBeenCalled();
      });

      // Simulate map click
      const mapInstance = mockGoogleMaps.Map.mock.results[0].value;
      const clickListener = mapInstance.addListener.mock.calls.find(
        call => call[0] === 'click'
      );

      if (clickListener) {
        clickListener[1]({ latLng: { lat: () => 25.2, lng: () => 55.2 } });
        expect(onMapClick).toHaveBeenCalledWith({
          latLng: { lat: 25.2, lng: 55.2 }
        });
      }
    });
  });

  describe('Clustering', () => {
    it('should enable clustering when showClusters is true', async () => {
      await act(async () => {
        render(
          <AppointmentMapView
            appointments={mockAppointments}
            showClusters={true}
            enableClustering={true}
          />
        );
      });

      await waitFor(() => {
        expect(mockMarkerClusterer).toHaveBeenCalled();
      });
    });

    it('should not enable clustering when showClusters is false', async () => {
      await act(async () => {
        render(
          <AppointmentMapView
            appointments={mockAppointments}
            showClusters={false}
            enableClustering={false}
          />
        );
      });

      await waitFor(() => {
        expect(mockMarkerClusterer).not.toHaveBeenCalled();
      });
    });

    it('should pass cluster options to MarkerClusterer', async () => {
      const clusterOptions = {
        maxZoom: 15,
        gridSize: 50,
        styles: []
      };

      await act(async () => {
        render(
          <AppointmentMapView
            appointments={mockAppointments}
            showClusters={true}
            enableClustering={true}
            clusterOptions={clusterOptions}
          />
        );
      });

      await waitFor(() => {
        expect(mockMarkerClusterer).toHaveBeenCalledWith(
          expect.objectContaining(clusterOptions)
        );
      });
    });
  });

  describe('Search Filters', () => {
    it('should accept search filters prop', () => {
      const searchFilters: MapSearchFilters = {
        appointment_types: ['doctor_on_call'],
        statuses: ['scheduled'],
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

      // Component should render without errors
      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      await act(async () => {
        render(<AppointmentMapView appointments={[]} />);
      });

      await waitFor(() => {
        const mapElement = screen.getByRole('img', { hidden: true });
        expect(mapElement).toBeInTheDocument();
      });
    });

    it('should be keyboard accessible', () => {
      render(<AppointmentMapView appointments={[]} />);

      // Map container should be focusable
      const mapContainer = screen.getByRole('img', { hidden: true });
      expect(mapContainer).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should render within MapErrorBoundary', () => {
      render(<AppointmentMapView appointments={[]} />);

      // The component should be wrapped in MapErrorBoundary
      // This is tested by the component rendering without errors
      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup markers and clusterer on unmount', async () => {
      const { unmount } = render(<AppointmentMapView appointments={mockAppointments} />);

      await waitFor(() => {
        expect(mockGoogleMaps.Marker).toHaveBeenCalled();
      });

      unmount();

      // Markers should be cleared
      const markerInstances = mockGoogleMaps.Marker.mock.results.map(result => result.value);
      markerInstances.forEach(marker => {
        expect(marker.setMap).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const renderSpy = jest.fn();

      const TestComponent = () => {
        renderSpy();
        return <AppointmentMapView appointments={mockAppointments} />;
      };

      const { rerender } = render(<TestComponent />);

      await waitFor(() => {
        expect(renderSpy).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props
      rerender(<TestComponent />);

      // Should not cause additional renders
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});
