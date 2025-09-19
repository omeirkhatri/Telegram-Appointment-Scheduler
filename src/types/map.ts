// Map-related TypeScript types for Google Maps integration

// Basic coordinate interface
export interface Coordinates {
  lat: number;
  lng: number;
}

// Extended coordinates with additional metadata
export interface MapCoordinates extends Coordinates {
  accuracy?: number; // GPS accuracy in meters
  altitude?: number; // Altitude in meters
  heading?: number; // Direction in degrees
  speed?: number; // Speed in m/s
  timestamp?: number; // Unix timestamp
}

// Geocoding result from Google Maps API
export interface GeocodingResult {
  address: string;
  coordinates: Coordinates;
  formatted_address: string;
  place_id?: string;
  types: string[]; // e.g., ['street_address', 'premise']
  address_components: AddressComponent[];
  geometry: {
    location: Coordinates;
    location_type: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
    viewport: {
      northeast: Coordinates;
      southwest: Coordinates;
    };
    bounds?: {
      northeast: Coordinates;
      southwest: Coordinates;
    };
  };
  partial_match?: boolean;
  postcode_localities?: string[];
}

// Address component from geocoding
export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

// Map marker for appointments
export interface MapMarker {
  id: string;
  position: Coordinates;
  title: string;
  description?: string;
  appointment_id: string;
  patient_id: string;
  appointment_type: 'doctor_on_call' | 'lab_test' | 'teleconsultation' | 'physiotherapy' | 'caregiver' | 'iv_therapy';
  appointment_date: string;
  start_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  patient_name: string;
  patient_phone: string;
  address: string;
  is_clustered?: boolean;
  cluster_id?: string;
  custom_fields?: Record<string, unknown>;
  notes?: string;
  transportation_type?: 'driver' | 'self_transport';
  driver_id?: string;
  pickup_instructions?: string;
}

// Map cluster for grouping nearby markers
export interface MapCluster {
  id: string;
  position: Coordinates;
  count: number;
  markers: MapMarker[];
  bounds: {
    northeast: Coordinates;
    southwest: Coordinates;
  };
}

// Map view configuration
export interface MapViewConfig {
  center: Coordinates;
  zoom: number;
  mapTypeId: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  mapTypeControl?: boolean;
  scaleControl?: boolean;
  streetViewControl?: boolean;
  rotateControl?: boolean;
  fullscreenControl?: boolean;
  gestureHandling?: 'auto' | 'cooperative' | 'greedy' | 'none';
  restriction?: {
    latLngBounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    strictBounds?: boolean;
  };
}

// Map bounds for fitting markers
export interface MapBounds {
  northeast: Coordinates;
  southwest: Coordinates;
}

// Map event types
export interface MapClickEvent {
  latLng: Coordinates;
  placeId?: string;
  stop?: () => void;
}

export interface MapMarkerClickEvent {
  marker: MapMarker;
  latLng: Coordinates;
  stop?: () => void;
}

export interface MapClusterClickEvent {
  cluster: MapCluster;
  latLng: Coordinates;
  stop?: () => void;
}

// Geocoding service response
export interface GeocodingResponse {
  results: GeocodingResult[];
  status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  error_message?: string;
}

// Reverse geocoding result
export interface ReverseGeocodingResult {
  address: string;
  coordinates: Coordinates;
  formatted_address: string;
  place_id?: string;
  types: string[];
  address_components: AddressComponent[];
}

// Map search filters
export interface MapSearchFilters {
  appointment_types?: ('doctor_on_call' | 'lab_test' | 'teleconsultation' | 'physiotherapy' | 'caregiver' | 'iv_therapy')[];
  statuses?: ('scheduled' | 'confirmed' | 'completed' | 'cancelled')[];
  date_range?: {
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
  };
  time_range?: {
    start_time: string; // HH:MM
    end_time: string; // HH:MM
  };
  transportation_type?: ('driver' | 'self_transport')[];
  areas?: string[];
  cities?: string[];
  search_query?: string;
}

// Map statistics
export interface MapStatistics {
  total_appointments: number;
  appointments_by_type: Record<string, number>;
  appointments_by_status: Record<string, number>;
  appointments_by_area: Record<string, number>;
  appointments_by_city: Record<string, number>;
  total_patients: number;
  coverage_area: MapBounds;
  density_score: number; // 0-1, higher means more clustered
}

// Map performance metrics
export interface MapPerformanceMetrics {
  load_time: number; // milliseconds
  render_time: number; // milliseconds
  marker_count: number;
  cluster_count: number;
  memory_usage: number; // bytes
  api_calls: number;
  errors: number;
}

// Map error types
export interface MapError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: number;
  context?: {
    component?: string;
    action?: string;
    data?: unknown;
  };
}

// Map state management
export interface MapState {
  is_loading: boolean;
  is_initialized: boolean;
  error: MapError | null;
  markers: MapMarker[];
  clusters: MapCluster[];
  selected_marker: MapMarker | null;
  selected_cluster: MapCluster | null;
  view_config: MapViewConfig;
  search_filters: MapSearchFilters;
  statistics: MapStatistics | null;
  performance_metrics: MapPerformanceMetrics | null;
}

// Map action types for state management
export type MapAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: MapError | null }
  | { type: 'SET_MARKERS'; payload: MapMarker[] }
  | { type: 'ADD_MARKER'; payload: MapMarker }
  | { type: 'UPDATE_MARKER'; payload: { id: string; updates: Partial<MapMarker> } }
  | { type: 'REMOVE_MARKER'; payload: string }
  | { type: 'SET_CLUSTERS'; payload: MapCluster[] }
  | { type: 'SET_SELECTED_MARKER'; payload: MapMarker | null }
  | { type: 'SET_SELECTED_CLUSTER'; payload: MapCluster | null }
  | { type: 'UPDATE_VIEW_CONFIG'; payload: Partial<MapViewConfig> }
  | { type: 'UPDATE_SEARCH_FILTERS'; payload: Partial<MapSearchFilters> }
  | { type: 'SET_STATISTICS'; payload: MapStatistics }
  | { type: 'UPDATE_PERFORMANCE_METRICS'; payload: Partial<MapPerformanceMetrics> }
  | { type: 'RESET_MAP_STATE' };

// Utility types for map operations
export type MapMarkerId = string;
export type MapClusterId = string;
export type PlaceId = string;

// Map component props
export interface MapComponentProps {
  appointments: MapMarker[];
  onMarkerClick?: (event: MapMarkerClickEvent) => void;
  onClusterClick?: (event: MapClusterClickEvent) => void;
  onMapClick?: (event: MapClickEvent) => void;
  onBoundsChanged?: (bounds: MapBounds) => void;
  onZoomChanged?: (zoom: number) => void;
  onCenterChanged?: (center: Coordinates) => void;
  searchFilters?: MapSearchFilters;
  showClusters?: boolean;
  enableClustering?: boolean;
  clusterOptions?: {
    maxZoom?: number;
    gridSize?: number;
    styles?: unknown[];
  };
  className?: string;
  style?: React.CSSProperties;
}

// Map service interfaces
export interface MapService {
  initialize(): Promise<void>;
  geocodeAddress(address: string): Promise<GeocodingResult[]>;
  reverseGeocode(coordinates: Coordinates): Promise<ReverseGeocodingResult[]>;
  calculateDistance(from: Coordinates, to: Coordinates): number;
  calculateBounds(markers: MapMarker[]): MapBounds | null;
  fitBounds(bounds: MapBounds): void;
  addMarker(marker: MapMarker): void;
  removeMarker(markerId: string): void;
  updateMarker(markerId: string, updates: Partial<MapMarker>): void;
  clearMarkers(): void;
  destroy(): void;
}

// Map hook return type
export interface UseMapReturn {
  mapState: MapState;
  mapService: MapService | null;
  actions: {
    setMarkers: (markers: MapMarker[]) => void;
    addMarker: (marker: MapMarker) => void;
    updateMarker: (markerId: string, updates: Partial<MapMarker>) => void;
    removeMarker: (markerId: string) => void;
    clearMarkers: () => void;
    setSelectedMarker: (marker: MapMarker | null) => void;
    setSelectedCluster: (cluster: MapCluster | null) => void;
    updateViewConfig: (config: Partial<MapViewConfig>) => void;
    updateSearchFilters: (filters: Partial<MapSearchFilters>) => void;
    geocodeAddress: (address: string) => Promise<GeocodingResult[]>;
    reverseGeocode: (coordinates: Coordinates) => Promise<ReverseGeocodingResult[]>;
    calculateDistance: (from: Coordinates, to: Coordinates) => number;
    fitBounds: (bounds: MapBounds) => void;
    resetMap: () => void;
  };
  isLoading: boolean;
  error: MapError | null;
}

// Constants for map configuration
export const MAP_CONSTANTS = {
  DEFAULT_ZOOM: 12,
  MIN_ZOOM: 1,
  MAX_ZOOM: 20,
  DEFAULT_CENTER: {
    lat: 25.2048, // Dubai coordinates
    lng: 55.2708
  } as Coordinates,
  CLUSTER_GRID_SIZE: 60,
  CLUSTER_MAX_ZOOM: 15,
  MARKER_ANIMATION_DURATION: 300,
  BOUNDS_PADDING: 0.1,
  SEARCH_RADIUS: 50000, // 50km in meters
  MAX_MARKERS_WITHOUT_CLUSTERING: 100
} as const;

// Map type guards
export function isCoordinates(obj: unknown): obj is Coordinates {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Coordinates).lat === 'number' &&
    typeof (obj as Coordinates).lng === 'number'
  );
}

export function isMapMarker(obj: unknown): obj is MapMarker {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as MapMarker).id === 'string' &&
    isCoordinates((obj as MapMarker).position) &&
    typeof (obj as MapMarker).appointment_id === 'string' &&
    typeof (obj as MapMarker).patient_id === 'string'
  );
}

export function isGeocodingResult(obj: unknown): obj is GeocodingResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as GeocodingResult).address === 'string' &&
    isCoordinates((obj as GeocodingResult).coordinates) &&
    typeof (obj as GeocodingResult).formatted_address === 'string'
  );
}
