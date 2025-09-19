'use client';

import { getGoogleMapsConfig } from '@/config/googleMapsConfig';
import { GoogleMapsService } from '@/services/googleMapsService';
import type { Appointment } from '@/types';
import { getAppointmentTypeDisplayName } from '@/types/appointment';
import type {
    Coordinates,
    MapBounds,
    MapClickEvent,
    MapError,
    MapMarker,
    MapSearchFilters,
    MapViewConfig
} from '@/types/map';
import { MAP_CONSTANTS } from '@/types/map';
import { getAppointmentTypeColor } from '@/utils/appointmentTypes';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapErrorBoundary } from './MapErrorBoundary';

// Google Maps types
type GoogleMap = google.maps.Map;
type GoogleMarker = google.maps.Marker;
type GoogleInfoWindow = google.maps.InfoWindow;
type GoogleLatLng = google.maps.LatLng;
type GoogleLatLngBounds = google.maps.LatLngBounds;

interface AppointmentMapViewProps {
  appointments: Appointment[];
  isLoading?: boolean;
  error?: string | null;
  refetch?: () => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  onAppointmentRightClick?: (appointment: Appointment, event: React.MouseEvent) => void;
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
  height?: string | number;
  initialCenter?: Coordinates;
  initialZoom?: number;
  mapTypeId?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  mapTypeControl?: boolean;
  scaleControl?: boolean;
  streetViewControl?: boolean;
  rotateControl?: boolean;
  fullscreenControl?: boolean;
  gestureHandling?: 'auto' | 'cooperative' | 'greedy' | 'none';
}

interface MapState {
  isInitialized: boolean;
  isLoading: boolean;
  error: MapError | null;
  markers: MapMarker[];
  selectedMarker: MapMarker | null;
  viewConfig: MapViewConfig;
}

export function AppointmentMapView({
  appointments = [],
  isLoading = false,
  error = null,
  refetch,
  onAppointmentClick,
  onAppointmentRightClick,
  onMapClick,
  onBoundsChanged,
  onZoomChanged,
  onCenterChanged,
  searchFilters = {},
  showClusters = true,
  enableClustering = true,
  clusterOptions = {},
  className = '',
  style = {},
  height = '500px',
  initialCenter = MAP_CONSTANTS.DEFAULT_CENTER,
  initialZoom = MAP_CONSTANTS.DEFAULT_ZOOM,
  mapTypeId = 'roadmap',
  disableDefaultUI = false,
  zoomControl = true,
  mapTypeControl = true,
  scaleControl = true,
  streetViewControl = true,
  rotateControl = true,
  fullscreenControl = true,
  gestureHandling = 'auto'
}: AppointmentMapViewProps) {
  // Mobile detection hook
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Detect mobile/tablet on mount and resize
  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<GoogleInfoWindow | null>(null);
  const googleMapsServiceRef = useRef<GoogleMapsService | null>(null);

  const [mapState, setMapState] = useState<MapState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    markers: [],
    selectedMarker: null,
    viewConfig: {
      center: initialCenter,
      zoom: initialZoom,
      mapTypeId,
      disableDefaultUI,
      zoomControl,
      mapTypeControl,
      scaleControl,
      streetViewControl,
      rotateControl,
      fullscreenControl,
      gestureHandling
    }
  });

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = async () => {
      try {
        setMapState(prev => ({ ...prev, isLoading: true, error: null }));

        // Get Google Maps service instance
        const googleMapsService = GoogleMapsService.getInstance();
        googleMapsServiceRef.current = googleMapsService;

        // Get configuration
        const config = getGoogleMapsConfig();

        // Initialize Google Maps API
        if (!googleMapsService.isApiInitialized()) {
          await googleMapsService.initialize({
            apiKey: config.apiKey,
            libraries: config.libraries,
            language: config.language,
            region: config.region,
            version: config.version
          });
        }

        // Get the loader instance
        const loader = googleMapsService.getLoader();

        // Load Google Maps API
        const { Map } = await loader.importLibrary('maps');
        const { AdvancedMarkerElement } = await loader.importLibrary('marker');

        if (!mapRef.current) {
          throw new Error('Map container not found');
        }

        // Create map instance with mobile-optimized settings
        const mobileOptimizedConfig = {
          center: initialCenter,
          zoom: isMobile ? Math.max(initialZoom - 1, 1) : initialZoom, // Slightly zoomed out on mobile
          mapTypeId,
          disableDefaultUI: isMobile ? true : disableDefaultUI, // Disable UI on mobile for cleaner interface
          zoomControl: isMobile ? true : zoomControl, // Always show zoom control on mobile
          mapTypeControl: isMobile ? false : mapTypeControl, // Hide map type control on mobile
          scaleControl: isMobile ? false : scaleControl, // Hide scale control on mobile
          streetViewControl: isMobile ? false : streetViewControl, // Hide street view on mobile
          rotateControl: isMobile ? false : rotateControl, // Hide rotate control on mobile
          fullscreenControl: isMobile ? false : fullscreenControl, // Hide fullscreen on mobile
          gestureHandling: isMobile ? 'greedy' : gestureHandling, // Greedy gestures for better mobile UX
          // Mobile-specific optimizations
          clickableIcons: !isMobile, // Disable clickable icons on mobile to prevent accidental clicks
          keyboardShortcuts: !isMobile, // Disable keyboard shortcuts on mobile
          // Performance optimizations for mobile
          restriction: isMobile ? {
            latLngBounds: {
              north: 85,
              south: -85,
              west: -180,
              east: 180
            },
            strictBounds: false
          } : undefined
        };

        const map = new Map(mapRef.current, mobileOptimizedConfig);

        mapInstanceRef.current = map;

        // Set up event listeners
        setupMapEventListeners(map);

        // Initialize info window
        infoWindowRef.current = new google.maps.InfoWindow();

        setMapState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          error: null
        }));

      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        setMapState(prev => ({
          ...prev,
          isLoading: false,
          error: {
            code: 'MAP_INITIALIZATION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to initialize map',
            details: error,
            timestamp: Date.now()
          }
        }));
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  // Set up map event listeners
  const setupMapEventListeners = useCallback((map: GoogleMap) => {
    // Map click handler
    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (onMapClick && event.latLng) {
        const clickEvent: MapClickEvent = {
          latLng: {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          }
        };
        onMapClick(clickEvent);
      }
    });

    // Bounds changed handler
    map.addListener('bounds_changed', () => {
      if (onBoundsChanged) {
        const bounds = map.getBounds();
        if (bounds) {
          const northeast = bounds.getNorthEast();
          const southwest = bounds.getSouthWest();
          onBoundsChanged({
            northeast: {
              lat: northeast.lat(),
              lng: northeast.lng()
            },
            southwest: {
              lat: southwest.lat(),
              lng: southwest.lng()
            }
          });
        }
      }
    });

    // Zoom changed handler
    map.addListener('zoom_changed', () => {
      if (onZoomChanged) {
        onZoomChanged(map.getZoom() || MAP_CONSTANTS.DEFAULT_ZOOM);
      }
    });

    // Center changed handler
    map.addListener('center_changed', () => {
      if (onCenterChanged) {
        const center = map.getCenter();
        if (center) {
          onCenterChanged({
            lat: center.lat(),
            lng: center.lng()
          });
        }
      }
    });
  }, [onMapClick, onBoundsChanged, onZoomChanged, onCenterChanged]);

  // Convert appointments to map markers
  const convertAppointmentsToMarkers = useCallback((appointments: Appointment[]): MapMarker[] => {
    return appointments.map((appointment) => {
      // For now, we'll use a default location since we don't have geocoding yet
      // This will be replaced with actual geocoding in future tasks
      const defaultLocation: Coordinates = {
        lat: MAP_CONSTANTS.DEFAULT_CENTER.lat + (Math.random() - 0.5) * 0.1,
        lng: MAP_CONSTANTS.DEFAULT_CENTER.lng + (Math.random() - 0.5) * 0.1
      };

      return {
        id: appointment.id,
        position: defaultLocation,
        title: `${appointment.patient?.name || 'Unknown Patient'} - ${getAppointmentTypeDisplayName(appointment.appointment_type)}`,
        description: appointment.notes || '',
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        appointment_type: appointment.appointment_type,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        duration_minutes: appointment.duration_minutes,
        status: appointment.status,
        patient_name: appointment.patient?.name || 'Unknown Patient',
        patient_phone: appointment.patient?.phone || '',
        address: appointment.patient?.address || '',
        custom_fields: appointment.custom_fields,
        notes: appointment.notes,
        transportation_type: appointment.transportation_type,
        driver_id: appointment.driver_id,
        pickup_instructions: appointment.pickup_instructions
      };
    });
  }, []);

  // Create Google Maps markers with mobile optimization
  const createGoogleMarkers = useCallback((mapMarkers: MapMarker[]): GoogleMarker[] => {
    if (!mapInstanceRef.current) return [];

    // Determine marker size based on device type
    const markerSize = isMobile ? 36 : isTablet ? 38 : 40;
    const anchorPoint = isMobile ? 18 : isTablet ? 19 : 20;

    return mapMarkers.map((markerData) => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        title: markerData.title,
        map: mapInstanceRef.current!,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createMarkerIcon(markerData, isMobile))}`,
          scaledSize: new google.maps.Size(markerSize, markerSize),
          anchor: new google.maps.Point(anchorPoint, markerSize)
        },
        // Mobile optimizations
        optimized: !isMobile, // Use DOM-based markers on mobile for better performance
        clickable: true,
        draggable: false
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onAppointmentClick) {
          // Find the original appointment
          const appointment = appointments.find(apt => apt.id === markerData.appointment_id);
          if (appointment) {
            onAppointmentClick(appointment);
          }
        }

        // Show info window
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(createInfoWindowContent(markerData));
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }

        // Update selected marker
        setMapState(prev => ({ ...prev, selectedMarker: markerData }));
      });

      // Add right-click listener
      marker.addListener('rightclick', (event: google.maps.MapMouseEvent) => {
        if (onAppointmentRightClick) {
          const appointment = appointments.find(apt => apt.id === markerData.appointment_id);
          if (appointment) {
            const reactEvent = {
              ...event,
              preventDefault: () => {},
              stopPropagation: () => {}
            } as React.MouseEvent;
            onAppointmentRightClick(appointment, reactEvent);
          }
        }
      });

      return marker;
    });
  }, [appointments, onAppointmentClick, onAppointmentRightClick, isMobile, isTablet]);

  // Create marker icon SVG with mobile optimization
  const createMarkerIcon = useCallback((markerData: MapMarker, isMobileDevice = false): string => {
    const color = getAppointmentTypeColor(markerData.appointment_type, 'primary');
    const statusColor = markerData.status === 'completed' ? '#10b981' :
                       markerData.status === 'cancelled' ? '#ef4444' :
                       markerData.status === 'confirmed' ? '#3b82f6' : '#f59e0b';

    // Adjust sizes for mobile
    const svgSize = isMobileDevice ? 36 : 40;
    const centerPoint = svgSize / 2;
    const mainRadius = isMobileDevice ? 16 : 18;
    const statusRadius = isMobileDevice ? 5 : 6;
    const fontSize = isMobileDevice ? 7 : 8;
    const textY = isMobileDevice ? 32 : 35;
    const strokeWidth = isMobileDevice ? 1.5 : 2;

    return `
      <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerPoint}" cy="${centerPoint}" r="${mainRadius}" fill="${color}" stroke="white" stroke-width="${strokeWidth}"/>
        <circle cx="${centerPoint}" cy="${centerPoint}" r="${statusRadius}" fill="${statusColor}"/>
        ${!isMobileDevice ? `
        <text x="${centerPoint}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" fill="white" font-weight="bold">
          ${markerData.appointment_type.substring(0, 3).toUpperCase()}
        </text>` : ''}
      </svg>
    `;
  }, []);

  // Create info window content
  const createInfoWindowContent = useCallback((markerData: MapMarker): string => {
    const appointmentType = getAppointmentTypeDisplayName(markerData.appointment_type);
    const time = new Date(`${markerData.appointment_date}T${markerData.start_time}`).toLocaleString('en-AE', {
      timeZone: 'Asia/Dubai',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div style="padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #1f2937;">
          ${markerData.patient_name}
        </h3>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">
          <strong>Type:</strong> ${appointmentType}
        </p>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">
          <strong>Time:</strong> ${time}
        </p>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">
          <strong>Status:</strong> <span style="color: ${markerData.status === 'completed' ? '#10b981' :
                                                      markerData.status === 'cancelled' ? '#ef4444' :
                                                      markerData.status === 'confirmed' ? '#3b82f6' : '#f59e0b'}">
            ${markerData.status.charAt(0).toUpperCase() + markerData.status.slice(1)}
          </span>
        </p>
        ${markerData.address ? `
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">
            <strong>Address:</strong> ${markerData.address}
          </p>
        ` : ''}
        ${markerData.notes ? `
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            <strong>Notes:</strong> ${markerData.notes}
          </p>
        ` : ''}
      </div>
    `;
  }, []);

  // Update markers when appointments change
  useEffect(() => {
    if (!mapState.isInitialized || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    // Convert appointments to map markers
    const mapMarkers = convertAppointmentsToMarkers(appointments);
    setMapState(prev => ({ ...prev, markers: mapMarkers }));

    // Create Google Maps markers
    const googleMarkers = createGoogleMarkers(mapMarkers);
    markersRef.current = googleMarkers;

    // Set up clustering if enabled with mobile optimization
    if (enableClustering && showClusters && googleMarkers.length > 0) {
      // Mobile-optimized clustering options
      const mobileClusterOptions = {
        ...clusterOptions,
        // More aggressive clustering on mobile
        gridSize: isMobile ? 80 : (clusterOptions.gridSize || 60),
        maxZoom: isMobile ? 15 : (clusterOptions.maxZoom || 17),
        // Simplify cluster styles for mobile
        styles: isMobile ? [{
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="white" font-weight="bold">+</text>
            </svg>
          `),
          height: 40,
          width: 40,
          textColor: 'white',
          textSize: 12,
          anchorText: [0, 0],
          anchorIcon: [20, 40]
        }] : clusterOptions.styles
      };

      const clusterer = new MarkerClusterer({
        map: mapInstanceRef.current,
        markers: googleMarkers,
        ...mobileClusterOptions
      });
      clustererRef.current = clusterer;
    }

    // Fit bounds to show all markers with mobile-optimized padding
    if (googleMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      googleMarkers.forEach(marker => {
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }
      });
      
      // Add mobile-optimized padding
      const padding = isMobile ? 20 : isTablet ? 40 : 60;
      mapInstanceRef.current.fitBounds(bounds, padding);
      
      // Ensure minimum zoom level on mobile for readability
      if (isMobile) {
        const currentZoom = mapInstanceRef.current.getZoom();
        if (currentZoom && currentZoom > 16) {
          mapInstanceRef.current.setZoom(16);
        }
      }
    }
  }, [appointments, mapState.isInitialized, enableClustering, showClusters, clusterOptions, convertAppointmentsToMarkers, createGoogleMarkers, isMobile, isTablet]);

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 font-medium">Failed to load map</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          {refetch && (
            <button
              onClick={refetch}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Handle loading state
  if (mapState.isLoading || !mapState.isInitialized) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  // Handle map error
  if (mapState.error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 font-medium">Map Error</p>
          <p className="text-red-500 text-sm mt-1">{mapState.error.message}</p>
          {refetch && (
            <button
              onClick={refetch}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <MapErrorBoundary>
      <div
        className={`
          bg-[--card] rounded-lg shadow-sm border border-[--border]
          ${isMobile ? 'touch-manipulation' : ''}
          ${className}
        `}
        style={style}
      >
        <div
          ref={mapRef}
          style={{ 
            height, 
            width: '100%',
            // Mobile-specific touch optimizations
            touchAction: isMobile ? 'pan-x pan-y' : 'auto',
            WebkitOverflowScrolling: isMobile ? 'touch' : 'auto'
          }}
          className={`
            rounded-lg
            ${isMobile ? 'cursor-grab active:cursor-grabbing' : ''}
          `}
        />
        
        {/* Mobile-specific overlay for better touch feedback */}
        {isMobile && (
          <div 
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background: 'linear-gradient(transparent 0%, transparent 100%)',
              zIndex: 1000
            }}
          />
        )}
      </div>
    </MapErrorBoundary>
  );
}

export default AppointmentMapView;
