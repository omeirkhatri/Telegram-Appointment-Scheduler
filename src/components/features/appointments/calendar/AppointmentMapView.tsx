// @ts-nocheck
'use client';

import { useCoordinateCache } from '@/hooks/useCoordinateCache';
import { useMapClustering } from '@/hooks/useMapClustering';
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
import { formatInResolvedTimezone, formatTimeToHHMM, toLocalTime } from '@/utils/timezone';
import { buildTimezoneArtifacts, getCurrentLocalTime } from '@/lib/timezoneArtifacts';
import { TimezoneBadge } from '@/components/ui/TimezoneBadge';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapErrorBoundary } from './MapErrorBoundary';
import { MapInfoWindow } from './MapInfoWindow';
import { OfficeMarker } from './OfficeMarker';

// Google Maps types
type GoogleMap = google.maps.Map;
type GoogleMarker = google.maps.Marker;
type GoogleInfoWindow = google.maps.InfoWindow;
type GoogleLatLng = google.maps.LatLng;
type GoogleLatLngBounds = google.maps.LatLngBounds;

// Global callback for Google Maps loading
declare global {
  interface Window {
    initGoogleMaps: () => void;
  }
}

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
  resetBounds?: boolean; // New prop to control when bounds should be reset
}

interface MapState {
  isInitialized: boolean;
  isLoading: boolean;
  error: MapError | null;
  markers: MapMarker[];
  selectedMarker: MapMarker | null;
  viewConfig: MapViewConfig;
  showInfoWindow: boolean;
  infoWindowMarker: MapMarker | null;
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
  streetViewControl = false,
  rotateControl = true,
  fullscreenControl = true,
  gestureHandling = 'auto',
  resetBounds = false
}: AppointmentMapViewProps) {
  // Mobile detection hook
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  // Get timezone context for map display
  const timezoneArtifacts = buildTimezoneArtifacts();
  const [isContainerReady, setIsContainerReady] = useState(false);

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

  // Simple Google Maps loading state
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsLoading, setGoogleMapsLoading] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);

  // Load Google Maps API directly - much simpler approach
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setGoogleMapsError('Google Maps API key not found');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      setGoogleMapsLoading(true);
      return;
    }

    setGoogleMapsLoading(true);
    setGoogleMapsError(null);

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    // Set up global callback
    window.initGoogleMaps = () => {
      console.log('Google Maps API loaded successfully');
      setGoogleMapsLoaded(true);
      setGoogleMapsLoading(false);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setGoogleMapsError('Failed to load Google Maps API');
      setGoogleMapsLoading(false);
    };

    document.head.appendChild(script);
  }, []);

  // Create effective loading object
  const effectiveLoading = {
    isLoaded: googleMapsLoaded,
    isLoading: googleMapsLoading,
    isError: !!googleMapsError,
    error: googleMapsError ? { code: 'LOAD_ERROR', message: googleMapsError } : null,
    getGoogleMapsService: () => null // Not needed for direct script loading
  };

  // Initialize coordinate caching for performance optimization
  const coordinateCache = useCoordinateCache({
    maxSize: 2000,
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    enablePersistence: true,
    enableCompression: false,
    enableStats: true,
    enableAutoCleanup: true,
    cleanupInterval: 60000, // 1 minute
  });

  // Callback ref to detect when the map container is attached
  const mapContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      mapRef.current = node;
      setIsContainerReady(true);
    } else {
      // Reset container ready state if node is removed
      setIsContainerReady(false);
    }
  }, []);

  const [mapState, setMapState] = useState<MapState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    markers: [],
    selectedMarker: null,
    showInfoWindow: false,
    infoWindowMarker: null,
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

  const [hasInitialBounds, setHasInitialBounds] = useState(false);

  // Initialize clustering hook
  const clustering = useMapClustering({
    enableClustering: enableClustering && showClusters,
    maxZoom: clusterOptions.maxZoom || 15,
    gridSize: clusterOptions.gridSize || 60,
    algorithm: 'grid',
    maxMarkersPerCluster: 50,
    enableClusterExpansion: true,
    enableClusterInfo: true,
    onClusterClick: (cluster) => {
      // Handle cluster click - could expand cluster or show cluster info
      console.log('Cluster clicked:', cluster);
    },
    onClusterHover: (cluster) => {
      // Handle cluster hover
      console.log('Cluster hovered:', cluster);
    }
  });

  // Fallback: Set container ready after a timeout if callback ref doesn't work
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (!isContainerReady && mapRef.current) {
        setIsContainerReady(true);
      }
    }, 1000);

    return () => clearTimeout(fallbackTimeout);
  }, [isContainerReady]);

  // Handle resetBounds prop - reset bounds when requested
  useEffect(() => {
    if (resetBounds && mapInstanceRef.current && markersRef.current.length > 0) {
      // Get marker positions for bounds calculation
      const markerPositions = markersRef.current
        .map(marker => {
          const position = marker.getPosition();
          return position ? { lat: position.lat(), lng: position.lng() } : null;
        })
        .filter((pos): pos is { lat: number; lng: number } => pos !== null);

      if (markerPositions.length > 0) {
        // Try to get cached bounds first
        const currentIsMobile = window.innerWidth < 768;
        const currentIsTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        const padding = currentIsMobile ? 20 : currentIsTablet ? 40 : 60;

        const cachedBounds = coordinateCache.cacheMapBounds(markerPositions, { padding });

        if (cachedBounds) {
          // Use cached bounds
          const bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(cachedBounds.southwest.lat, cachedBounds.southwest.lng),
            new google.maps.LatLng(cachedBounds.northeast.lat, cachedBounds.northeast.lng)
          );
          mapInstanceRef.current.fitBounds(bounds, padding);
        } else {
          // Fallback to direct calculation
          const bounds = new google.maps.LatLngBounds();
          markerPositions.forEach(pos => {
            bounds.extend(new google.maps.LatLng(pos.lat, pos.lng));
          });
          mapInstanceRef.current.fitBounds(bounds, padding);
        }
      }
    }
  }, [resetBounds, coordinateCache]);


  // Initialize Google Maps with direct script loading
  useEffect(() => {
    if (!isContainerReady || !effectiveLoading.isLoaded) {
      return;
    }

    const initializeMap = async () => {
      try {
        setMapState(prev => ({ ...prev, isLoading: true, error: null }));

        // Map container should be ready at this point due to isContainerReady check
        if (!mapRef.current) {
          throw new Error('Map container not found');
        }

        // Check if Google Maps is available
        if (!window.google || !window.google.maps) {
          throw new Error('Google Maps API not loaded');
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

        const map = new google.maps.Map(mapRef.current, mobileOptimizedConfig);

        mapInstanceRef.current = map;

        // Set up event listeners
        setupMapEventListeners(map);

        // Initialize info window with better positioning options
        infoWindowRef.current = new google.maps.InfoWindow({
          disableAutoPan: true, // Prevent automatic panning
          pixelOffset: new google.maps.Size(0, -10), // Offset to position above marker
          maxWidth: 260, // Match our reduced width
          zIndex: 1000 // Ensure it appears above other elements
        });

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
  }, [isContainerReady, effectiveLoading.isLoaded, initialCenter, initialZoom, mapTypeId, disableDefaultUI, zoomControl, mapTypeControl, scaleControl, streetViewControl, rotateControl, fullscreenControl, gestureHandling, isMobile]);

  // Set up map event listeners
  const setupMapEventListeners = useCallback((map: GoogleMap) => {
    // Map click handler
    map.addListener('click', (event: google.maps.MapMouseEvent) => {
      // Close info window when clicking on map (but not on markers)
      if (event.placeId === undefined) {
        setMapState(prev => ({
          ...prev,
          showInfoWindow: false,
          infoWindowMarker: null
        }));
      }

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

    // Keyboard navigation support
    map.addListener('keydown', (event: KeyboardEvent) => {
      // Handle keyboard navigation for selected marker
      if (mapState.selectedMarker && mapState.showInfoWindow) {
        switch (event.key) {
          case 'Escape':
            // Close info window
            setMapState(prev => ({
              ...prev,
              showInfoWindow: false,
              infoWindowMarker: null
            }));
            break;
          case 'Enter':
          case ' ':
            // Trigger edit action
            if (onAppointmentClick) {
              const appointment = appointments.find(apt => apt.id === mapState.selectedMarker?.appointment_id);
              if (appointment) {
                onAppointmentClick(appointment);
              }
            }
            break;
          case 'Delete':
          case 'Backspace':
            // Trigger delete action
            if (onAppointmentRightClick) {
              const appointment = appointments.find(apt => apt.id === mapState.selectedMarker?.appointment_id);
              if (appointment) {
                const mockEvent = {
                  preventDefault: () => {},
                  stopPropagation: () => {}
                } as React.MouseEvent;
                onAppointmentRightClick(appointment, mockEvent);
              }
            }
            break;
        }
      }
    });

    // Double-click handler to fit bounds to all markers
    map.addListener('dblclick', () => {
      if (markersRef.current.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        markersRef.current.forEach(marker => {
          const position = marker.getPosition();
          if (position) {
            bounds.extend(position);
          }
        });

        if (!bounds.isEmpty()) {
          const currentIsMobile = window.innerWidth < 768;
          const currentIsTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
          const padding = currentIsMobile ? 20 : currentIsTablet ? 40 : 60;
          map.fitBounds(bounds, padding);
        }
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

    // Fullscreen change handler to ensure button remains visible
    const handleFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement !== null;
      const fitButton = document.querySelector('[data-fit-to-map-button]') as HTMLElement;
      const container = fitButton?.parentElement;
      if (fitButton && container) {
        if (isFullscreen) {
          // In fullscreen, position the container to avoid Google Maps controls
          container.style.position = 'fixed';
          container.style.bottom = '20px';
          container.style.left = '20px';
          container.style.zIndex = '999999';
        } else {
          // In normal mode, use absolute positioning within the map container
          container.style.position = 'absolute';
          container.style.bottom = '16px';
          container.style.left = '16px';
          container.style.zIndex = '9999';
        }
      }
    };

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  }, [onMapClick, onBoundsChanged, onZoomChanged, onCenterChanged]);


  // Create marker icon SVG with mobile optimization
  const createMarkerIcon = useCallback((markerData: MapMarker, isMobileDevice = false): string => {
    // Get timezone context for time formatting
    const timezoneArtifacts = buildTimezoneArtifacts();
    
    // Background color indicates status
    const statusColor = markerData.status === 'completed' ? '#10b981' :
                       markerData.status === 'cancelled' ? '#ef4444' :
                       markerData.status === 'confirmed' ? '#3b82f6' : '#f59e0b';

    // Border color indicates appointment type
    const typeColor = getAppointmentTypeColor(markerData.appointment_type, 'primary');

    // Make markers larger
    const svgSize = isMobileDevice ? 44 : 48;
    const centerPoint = svgSize / 2;
    const mainRadius = isMobileDevice ? 20 : 22;
    const fontSize = isMobileDevice ? 11 : 12; // Larger text
    const textY = isMobileDevice ? 28 : 30; // Better centered positioning
    const strokeWidth = isMobileDevice ? 2 : 2.5; // Thicker border for type indication

    // Format start time to HH:MM with timezone awareness
    const startTime = formatTimeToHHMM(markerData.start_time);

    return `
      <svg width="${svgSize}" height="${svgSize + 8}" viewBox="0 0 ${svgSize} ${svgSize + 8}" xmlns="http://www.w3.org/2000/svg">
        <!-- Main marker body - rounded rectangle with status color background -->
        <rect x="4" y="4" width="${svgSize - 8}" height="${svgSize - 8}" rx="${mainRadius - 4}" ry="${mainRadius - 4}" fill="${statusColor}" stroke="${typeColor}" stroke-width="${strokeWidth}"/>
        <!-- Pointer/arrow pointing down from the bottom -->
        <path d="M${centerPoint - 4} ${svgSize - 4} L${centerPoint} ${svgSize + 4} L${centerPoint + 4} ${svgSize - 4} Z" fill="${statusColor}" stroke="${typeColor}" stroke-width="${strokeWidth}"/>
        <!-- Time text - white, large, centered -->
        <text x="${centerPoint}" y="${textY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" fill="white" font-weight="bold" stroke="black" stroke-width="0.3">
          ${startTime}
        </text>
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

    // Get status color and icon
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'completed':
          return { color: '#10b981', icon: '✓', bgColor: '#f0fdf4' };
        case 'cancelled':
          return { color: '#ef4444', icon: '✕', bgColor: '#fef2f2' };
        case 'confirmed':
          return { color: '#3b82f6', icon: '✓', bgColor: '#eff6ff' };
        case 'scheduled':
          return { color: '#f59e0b', icon: '⏰', bgColor: '#fffbeb' };
        default:
          return { color: '#6b7280', icon: '?', bgColor: '#f9fafb' };
      }
    };

    const statusInfo = getStatusInfo(markerData.status);

    // Get appointment type color
    const getAppointmentTypeColor = (type: string) => {
      switch (type) {
        case 'doctor_on_call':
          return '#3b82f6';
        case 'lab_test':
          return '#10b981';
        case 'teleconsultation':
          return '#8b5cf6';
        case 'physiotherapy':
          return '#f59e0b';
        case 'caregiver':
          return '#ef4444';
        case 'iv_therapy':
          return '#06b6d4';
        default:
          return '#6b7280';
      }
    };

    const typeColor = getAppointmentTypeColor(markerData.appointment_type);

    return `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 0;
        min-width: 200px;
        max-width: 240px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        border: 1px solid #e5e7eb;
      ">
        <!-- Header with patient name and status -->
        <div style="
          background: linear-gradient(135deg, ${typeColor}15 0%, ${typeColor}08 100%);
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <h3 style="
              margin: 0;
              font-size: 13px;
              font-weight: 600;
              color: #111827;
              line-height: 1.2;
            ">
              ${markerData.patient_name}
            </h3>
            <div style="
              background: ${statusInfo.bgColor};
              color: ${statusInfo.color};
              padding: 2px 5px;
              border-radius: 3px;
              font-size: 9px;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 2px;
            ">
              <span>${statusInfo.icon}</span>
              ${markerData.status.charAt(0).toUpperCase() + markerData.status.slice(1)}
            </div>
          </div>
          <div style="
            background: ${typeColor};
            color: white;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            display: inline-block;
          ">
            ${appointmentType}
          </div>
        </div>

        <!-- Content -->
        <div style="padding: 8px;">
          <!-- Time -->
          <div style="margin-bottom: 6px;">
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              margin-bottom: 2px;
            ">
              <div style="
                width: 14px;
                height: 14px;
                background: #f3f4f6;
                border-radius: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9px;
              ">🕐</div>
              <span style="font-size: 10px; color: #6b7280; font-weight: 500;">Time</span>
            </div>
            <div style="font-size: 11px; color: #111827; font-weight: 500; margin-left: 18px;">
              ${time}
            </div>
          </div>

          <!-- Staff (placeholder for now) -->
          <div style="margin-bottom: 6px;">
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              margin-bottom: 2px;
            ">
              <div style="
                width: 14px;
                height: 14px;
                background: #f3f4f6;
                border-radius: 2px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9px;
              ">👨‍⚕️</div>
              <span style="font-size: 10px; color: #6b7280; font-weight: 500;">Staff</span>
            </div>
            <div style="font-size: 11px; color: #111827; font-weight: 500; margin-left: 18px; line-height: 1.2;">
              ${markerData.all_staff_names || markerData.staff_name || 'Not assigned'}
            </div>
          </div>

          <!-- Address -->
          ${markerData.address ? `
            <div style="margin-bottom: 6px;">
              <div style="
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 2px;
              ">
                <div style="
                  width: 14px;
                  height: 14px;
                  background: #f3f4f6;
                  border-radius: 2px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 9px;
                ">📍</div>
                <span style="font-size: 10px; color: #6b7280; font-weight: 500;">Address</span>
              </div>
              <div style="font-size: 11px; color: #111827; margin-left: 18px; line-height: 1.2;">
                ${markerData.address}
              </div>
            </div>
          ` : ''}

          <!-- Notes -->
          ${markerData.notes ? `
            <div style="margin-bottom: 0;">
              <div style="
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 2px;
              ">
                <div style="
                  width: 14px;
                  height: 14px;
                  background: #f3f4f6;
                  border-radius: 2px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 9px;
                ">📝</div>
                <span style="font-size: 10px; color: #6b7280; font-weight: 500;">Notes</span>
              </div>
              <div style="font-size: 11px; color: #111827; margin-left: 18px; line-height: 1.2;">
                ${markerData.notes}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }, []);

  // Filter appointments based on searchFilters
  const filteredAppointments = useMemo(() => {
    if (!searchFilters || Object.keys(searchFilters).length === 0) {
      return appointments;
    }

    return appointments.filter((appointment) => {
      // Filter by appointment types
      if (searchFilters.appointment_types && searchFilters.appointment_types.length > 0) {
        if (!searchFilters.appointment_types.includes(appointment.appointment_type)) {
          return false;
        }
      }

      // Filter by statuses
      if (searchFilters.statuses && searchFilters.statuses.length > 0) {
        if (!searchFilters.statuses.includes(appointment.status)) {
          return false;
        }
      }

      // Filter by date range
      if (searchFilters.date_range) {
        const appointmentDate = new Date(appointment.appointment_date);
        const startDate = new Date(searchFilters.date_range.start_date);
        const endDate = new Date(searchFilters.date_range.end_date);

        if (appointmentDate < startDate || appointmentDate > endDate) {
          return false;
        }
      }

      // Filter by time range
      if (searchFilters.time_range) {
        const appointmentTime = appointment.start_time;
        if (appointmentTime < searchFilters.time_range.start_time || appointmentTime > searchFilters.time_range.end_time) {
          return false;
        }
      }

      // Filter by transportation type
      if (searchFilters.transportation_type && searchFilters.transportation_type.length > 0) {
        if (!appointment.transportation_type || !searchFilters.transportation_type.includes(appointment.transportation_type)) {
          return false;
        }
      }

      // Filter by areas (extract from patient address)
      if (searchFilters.areas && searchFilters.areas.length > 0) {
        const patientArea = appointment.patient?.address?.split(',')[1]?.trim();
        if (!patientArea || !searchFilters.areas.includes(patientArea)) {
          return false;
        }
      }

      // Filter by cities (extract from patient address)
      if (searchFilters.cities && searchFilters.cities.length > 0) {
        const patientCity = appointment.patient?.address?.split(',').pop()?.trim();
        if (!patientCity || !searchFilters.cities.includes(patientCity)) {
          return false;
        }
      }

      // Filter by search query
      if (searchFilters.search_query) {
        const query = searchFilters.search_query.toLowerCase();
        const searchableText = [
          appointment.patient?.name || '',
          appointment.patient?.address || '',
          appointment.notes || '',
          appointment.appointment_type,
          appointment.status
        ].join(' ').toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, searchFilters]);

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

    // Convert filtered appointments to map markers (inline to avoid dependency issues)
    const mapMarkers = filteredAppointments.map((appointment) => {
      try {
        // Use stored coordinates if available, otherwise fall back to default location
        let position: Coordinates;

        if (appointment.patient?.latitude && appointment.patient?.longitude) {
          // Use stored coordinates - no geocoding needed!
          position = {
            lat: appointment.patient.latitude,
            lng: appointment.patient.longitude
          };

          // Debug logging for coordinates
          console.log(`Appointment ${appointment.id} - Using stored coordinates:`, {
            patient: appointment.patient.name,
            coordinates: position,
            address: appointment.patient.address
          });
        } else {
          // Fallback to default location with random offset for patients without coordinates
          position = {
            lat: MAP_CONSTANTS.DEFAULT_CENTER.lat + (Math.random() - 0.5) * 0.1,
            lng: MAP_CONSTANTS.DEFAULT_CENTER.lng + (Math.random() - 0.5) * 0.1
          };

          // Debug logging for fallback coordinates
          console.log(`Appointment ${appointment.id} - Using fallback coordinates:`, {
            patient: appointment.patient?.name || 'Unknown',
            coordinates: position,
            reason: 'No stored coordinates available'
          });
        }

      return {
        id: appointment.id,
        position,
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
        // Individual address components for detailed tooltip
        flat_villa_no: appointment.patient?.flat_villa_no,
        building_street: appointment.patient?.building_street,
        area: appointment.patient?.area,
        city: appointment.patient?.city,
        // Staff information from appointment_staff data
        staff_name: appointment.staff_name || (appointment.appointment_staff && appointment.appointment_staff.length > 0
          ? appointment.appointment_staff
              .filter(staff => staff.is_primary)
              .map(staff => `${staff.staff.first_name} ${staff.staff.last_name}`)
              .join(', ') || appointment.appointment_staff[0]?.staff
                ? `${appointment.appointment_staff[0].staff.first_name} ${appointment.appointment_staff[0].staff.last_name}`
                : undefined
          : undefined),
        all_staff_names: appointment.all_staff_names || (appointment.appointment_staff && appointment.appointment_staff.length > 0
          ? appointment.appointment_staff
              .filter(staff => staff.staff)
              .map(staff => {
                const name = `${staff.staff.first_name} ${staff.staff.last_name}`.trim();
                return staff.is_primary ? `${name} (Primary)` : name;
              })
              .join(', ')
          : undefined),
        staff_id: appointment.appointment_staff && appointment.appointment_staff.length > 0
          ? appointment.appointment_staff.find(staff => staff.is_primary)?.staff_id || appointment.appointment_staff[0]?.staff_id
          : undefined,
        custom_fields: appointment.custom_fields,
        notes: appointment.notes,
        transportation_type: appointment.transportation_type,
        driver_id: appointment.driver_id,
        pickup_instructions: appointment.pickup_instructions
      };
      } catch (error) {
        console.error(`Error creating marker for appointment ${appointment.id}:`, error);
        // Return a fallback marker to prevent the entire map from failing
        return {
          id: appointment.id,
          position: MAP_CONSTANTS.DEFAULT_CENTER,
          title: 'Error loading appointment',
          description: 'Failed to load appointment data',
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          appointment_type: appointment.appointment_type,
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          duration_minutes: appointment.duration_minutes,
          status: appointment.status,
          patient_name: 'Error',
          patient_phone: '',
          address: 'Address not available',
          flat_villa_no: undefined,
          building_street: undefined,
          area: undefined,
          city: undefined,
          staff_name: appointment.staff_name || (appointment.appointment_staff && appointment.appointment_staff.length > 0
            ? appointment.appointment_staff
                .filter(staff => staff.is_primary)
                .map(staff => `${staff.staff.first_name} ${staff.staff.last_name}`)
                .join(', ') || appointment.appointment_staff[0]?.staff
                  ? `${appointment.appointment_staff[0].staff.first_name} ${appointment.appointment_staff[0].staff.last_name}`
                  : undefined
            : undefined),
          all_staff_names: appointment.all_staff_names || (appointment.appointment_staff && appointment.appointment_staff.length > 0
            ? appointment.appointment_staff
                .filter(staff => staff.staff)
                .map(staff => {
                  const name = `${staff.staff.first_name} ${staff.staff.last_name}`.trim();
                  return staff.is_primary ? `${name} (Primary)` : name;
                })
                .join(', ')
            : undefined),
          staff_id: appointment.appointment_staff && appointment.appointment_staff.length > 0
            ? appointment.appointment_staff.find(staff => staff.is_primary)?.staff_id || appointment.appointment_staff[0]?.staff_id
            : undefined,
          custom_fields: {},
          notes: 'Error loading appointment data',
          transportation_type: appointment.transportation_type,
          driver_id: appointment.driver_id,
          pickup_instructions: appointment.pickup_instructions
        };
      }
    });

    // Determine device type once for the entire marker creation process
    const currentIsMobile = window.innerWidth < 768;
    const currentIsTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    // Create Google Maps markers (inline to avoid dependency issues)
    const googleMarkers = mapMarkers.map((markerData) => {
      const markerSize = currentIsMobile ? 44 : currentIsTablet ? 46 : 48;
      const anchorPoint = currentIsMobile ? 22 : currentIsTablet ? 23 : 24;
      const anchorY = markerSize + 4; // Anchor at the tip of the pointer

      const marker = new google.maps.Marker({
        position: markerData.position,
        title: markerData.title,
        map: mapInstanceRef.current!,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createMarkerIcon(markerData, currentIsMobile))}`,
          scaledSize: new google.maps.Size(markerSize, markerSize + 8),
          anchor: new google.maps.Point(anchorPoint, anchorY)
        },
        // Mobile optimizations
        optimized: !currentIsMobile, // Use DOM-based markers on mobile for better performance
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

        // Show enhanced info window
        setMapState(prev => ({
          ...prev,
          selectedMarker: markerData,
          showInfoWindow: true,
          infoWindowMarker: markerData
        }));

        // Also show Google Maps info window as fallback
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(createInfoWindowContent(markerData));
          
          // Configure info window options to prevent map panning
          infoWindowRef.current.setOptions({
            disableAutoPan: true, // Prevent automatic panning
            pixelOffset: new google.maps.Size(0, -10), // Offset to position above marker
            maxWidth: 240, // Match our reduced width
            zIndex: 1000 // Ensure it appears above other elements
          });
          
          // Add custom CSS to make close button more compact and visible
          const existingStyle = document.getElementById('appointment-info-window-close-button-style');
          if (existingStyle) {
            existingStyle.remove();
          }
          
          const style = document.createElement('style');
          style.id = 'appointment-info-window-close-button-style';
          style.textContent = `
            .gm-ui-hover-effect {
              padding: 1px !important;
              margin: 0 !important;
              width: 16px !important;
              height: 16px !important;
              top: 2px !important;
              right: 2px !important;
              background: #1f2937 !important;
              border-radius: 50% !important;
              border: 1px solid #000000 !important;
              box-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
              position: absolute !important;
              z-index: 1001 !important;
            }
            .gm-ui-hover-effect img {
              width: 12px !important;
              height: 12px !important;
              filter: invert(1) brightness(2) !important;
            }
            .gm-ui-hover-effect:hover {
              background: #374151 !important;
            }
          `;
          document.head.appendChild(style);
          
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      // Add double-click listener for quick actions
      marker.addListener('dblclick', () => {
        // Find the original appointment
        const appointment = appointments.find(apt => apt.id === markerData.appointment_id);
        if (appointment && onAppointmentClick) {
          // Double-click triggers edit mode
          onAppointmentClick(appointment);
        }

        // Center map on the marker and zoom in
        if (mapInstanceRef.current) {
          const position = new google.maps.LatLng(
            markerData.position.lat,
            markerData.position.lng
          );
          mapInstanceRef.current.setCenter(position);
          mapInstanceRef.current.setZoom(16);
        }
      });

      // Add hover listeners for visual feedback and info display
      let hoverTimeout: NodeJS.Timeout | null = null;
      let isHovering = false;

      marker.addListener('mouseover', () => {
        // Clear any existing timeout
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }

        isHovering = true;

        // Add hover effect to marker
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => {
          marker.setAnimation(null);
        }, 750);

        // Show info window with appointment details on hover
        if (infoWindowRef.current && mapInstanceRef.current) {
          const infoWindowContent = createInfoWindowContent(markerData);
          infoWindowRef.current.setContent(infoWindowContent);
          
          // Configure info window options to prevent map panning
          infoWindowRef.current.setOptions({
            disableAutoPan: true, // Prevent automatic panning
            pixelOffset: new google.maps.Size(0, -10), // Offset to position above marker
            maxWidth: 240, // Match our reduced width
            zIndex: 1000 // Ensure it appears above other elements
          });
          
          infoWindowRef.current.open(mapInstanceRef.current, marker);

          // Update map state to show info window
          setMapState(prev => ({
            ...prev,
            showInfoWindow: true,
            infoWindowMarker: markerData,
            selectedMarker: markerData
          }));

          // Add custom CSS to make close button more compact and visible
          const existingStyle = document.getElementById('appointment-info-window-close-button-style');
          if (existingStyle) {
            existingStyle.remove();
          }
          
          const style = document.createElement('style');
          style.id = 'appointment-info-window-close-button-style';
          style.textContent = `
            .gm-ui-hover-effect {
              padding: 1px !important;
              margin: 0 !important;
              width: 16px !important;
              height: 16px !important;
              top: 2px !important;
              right: 2px !important;
              background: #1f2937 !important;
              border-radius: 50% !important;
              border: 1px solid #000000 !important;
              box-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
              position: absolute !important;
              z-index: 1001 !important;
            }
            .gm-ui-hover-effect img {
              width: 12px !important;
              height: 12px !important;
              filter: invert(1) brightness(2) !important;
            }
            .gm-ui-hover-effect:hover {
              background: #374151 !important;
            }
          `;
          document.head.appendChild(style);

          // Add hover listeners to the info window to prevent flickering
          const infoWindowElement = infoWindowRef.current.getContent();
          if (infoWindowElement && infoWindowElement.addEventListener) {
            const infoWindowDiv = infoWindowElement as HTMLElement;

            // Add mouseenter to info window to keep it open
            infoWindowDiv.addEventListener('mouseenter', () => {
              if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
              }
              isHovering = true;
            });

            // Add mouseleave to info window to close it
            infoWindowDiv.addEventListener('mouseleave', () => {
              isHovering = false;
              hoverTimeout = setTimeout(() => {
                if (!isHovering && infoWindowRef.current) {
                  infoWindowRef.current.close();
                  setMapState(prev => ({
                    ...prev,
                    showInfoWindow: false,
                    infoWindowMarker: null,
                    selectedMarker: null
                  }));
                }
              }, 300);
            });
          } else {
            console.warn('InfoWindow content is not a valid DOM element:', infoWindowElement);
          }
        }

        // Add visual feedback for hover state
        if (marker.getIcon) {
          const currentIcon = marker.getIcon();
          if (typeof currentIcon === 'string') {
            // If it's a string URL, we can't easily modify it
            // But we could set a different icon for hover state
            marker.setIcon({
              url: currentIcon,
              scaledSize: new google.maps.Size(40, 40), // Slightly larger on hover
              anchor: new google.maps.Point(20, 20)
            });
          }
        }
      });

      // Add mouseout listener with longer delay to prevent flickering
      marker.addListener('mouseout', () => {
        isHovering = false;

        // Remove any ongoing animations
        marker.setAnimation(null);

        // Close info window on mouseout with longer delay to prevent flickering
        hoverTimeout = setTimeout(() => {
          if (!isHovering && infoWindowRef.current) {
            infoWindowRef.current.close();
            setMapState(prev => ({
              ...prev,
              showInfoWindow: false,
              infoWindowMarker: null,
              selectedMarker: null
            }));
          }
        }, 500); // Increased delay to 500ms

        // Reset icon size on mouseout
        if (marker.getIcon) {
          const currentIcon = marker.getIcon();
          if (typeof currentIcon === 'string') {
            marker.setIcon({
              url: currentIcon,
              scaledSize: new google.maps.Size(32, 32), // Reset to normal size
              anchor: new google.maps.Point(16, 16)
            });
          }
        }
      });

      // Add touch gesture support for mobile devices
      if (currentIsMobile) {
        // Long press for context menu (right-click equivalent)
        let longPressTimer: NodeJS.Timeout | null = null;
        let touchStartTime = 0;

        marker.addListener('touchstart', () => {
          touchStartTime = Date.now();
          longPressTimer = setTimeout(() => {
            // Long press detected - trigger right-click action
            if (onAppointmentRightClick) {
              const appointment = appointments.find(apt => apt.id === markerData.appointment_id);
              if (appointment) {
                const mockEvent = {
                  preventDefault: () => {},
                  stopPropagation: () => {}
                } as React.MouseEvent;
                onAppointmentRightClick(appointment, mockEvent);
              }
            }
          }, 500); // 500ms for long press
        });

        marker.addListener('touchend', () => {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        });

        marker.addListener('touchcancel', () => {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        });

        // Swipe gestures for quick actions
        let touchStartX = 0;
        let touchStartY = 0;

        marker.addListener('touchstart', (event: any) => {
          if (event.touches && event.touches.length === 1) {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
          }
        });

        marker.addListener('touchend', (event: any) => {
          if (event.changedTouches && event.changedTouches.length === 1) {
            const touchEndX = event.changedTouches[0].clientX;
            const touchEndY = event.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // If it's a swipe (not a tap)
            if (distance > 50) {
              if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 0) {
                  // Swipe right - navigate to location
                  if (mapInstanceRef.current) {
                    const position = new google.maps.LatLng(
                      markerData.position.lat,
                      markerData.position.lng
                    );
                    mapInstanceRef.current.setCenter(position);
                    mapInstanceRef.current.setZoom(16);
                  }
                } else {
                  // Swipe left - show info window
                  setMapState(prev => ({
                    ...prev,
                    selectedMarker: markerData,
                    showInfoWindow: true,
                    infoWindowMarker: markerData
                  }));
                }
              }
            }
          }
        });
      }

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

    markersRef.current = googleMarkers;

    // Update clustering with new markers - use caching for performance
    if (enableClustering && showClusters) {
      // Try to get cached cluster data first
      const clusterCacheOptions = {
        maxZoom: clusterOptions.maxZoom || 15,
        gridSize: clusterOptions.gridSize || 60,
        algorithm: 'grid'
      };

      const cachedClusterData = coordinateCache.cacheMarkerClusters(
        mapMarkers.map(marker => ({
          id: marker.id,
          lat: marker.position.lat,
          lng: marker.position.lng,
          data: marker
        })),
        clusterCacheOptions
      );

      if (cachedClusterData) {
        // Use cached cluster data
        clustering.updateClusters(mapMarkers);
      } else {
        // Fallback to direct clustering
        clustering.updateClusters(mapMarkers);
      }
    }

    // Set up Google Maps clustering if enabled with enhanced styling
    if (enableClustering && showClusters && googleMarkers.length > 0) {
      // Enhanced cluster styles with appointment type theming
      const createClusterStyle = (count: number, isMobileDevice: boolean) => {
        const size = isMobileDevice ? 50 : 45;
        const fontSize = isMobileDevice ? 14 : 12;
        const strokeWidth = isMobileDevice ? 3 : 2.5;

        // Color based on cluster size
        let color = '#3B82F6'; // Blue for small clusters
        if (count >= 10) color = '#10B981'; // Green for medium clusters
        if (count >= 25) color = '#F59E0B'; // Amber for large clusters
        if (count >= 50) color = '#EF4444'; // Red for very large clusters

        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
              <!-- Outer ring -->
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="white" stroke-width="${strokeWidth}"/>
              <!-- Inner circle -->
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 8}" fill="white" opacity="0.2"/>
              <!-- Count text -->
              <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" fill="white" font-weight="bold" stroke="black" stroke-width="0.5">
                ${count}
              </text>
              <!-- Appointment icon overlay -->
              <circle cx="${size/2}" cy="${size/2 - 8}" r="6" fill="white" opacity="0.3"/>
              <text x="${size/2}" y="${size/2 - 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="${color}" font-weight="bold">+</text>
            </svg>
          `),
          height: size,
          width: size,
          textColor: 'white',
          textSize: fontSize,
          anchorText: [0, 0],
          anchorIcon: [size/2, size]
        };
      };

      // Mobile-optimized clustering options with enhanced styles
      const mobileClusterOptions = {
        ...clusterOptions,
        // More aggressive clustering on mobile
        gridSize: currentIsMobile ? 80 : (clusterOptions.gridSize || 60),
        maxZoom: currentIsMobile ? 15 : (clusterOptions.maxZoom || 17),
        // Enhanced cluster styles
        styles: [
          createClusterStyle(2, currentIsMobile),   // Small clusters (2-9)
          createClusterStyle(10, currentIsMobile),  // Medium clusters (10-24)
          createClusterStyle(25, currentIsMobile),  // Large clusters (25-49)
          createClusterStyle(50, currentIsMobile)   // Very large clusters (50+)
        ]
      };

      const clusterer = new MarkerClusterer({
        map: mapInstanceRef.current,
        markers: googleMarkers,
        ...mobileClusterOptions
      });

      // Add cluster click handler
      clusterer.addListener('clusterclick', (event: any) => {
        const cluster = event.cluster;
        const markers = cluster.getMarkers();
        console.log('Cluster clicked with markers:', markers);

        // Optionally expand cluster or show cluster info
        if (markers.length > 1) {
          // Zoom to cluster bounds
          const bounds = new google.maps.LatLngBounds();
          markers.forEach((marker: any) => {
            const position = marker.getPosition();
            if (position) {
              bounds.extend(position);
            }
          });

          if (!bounds.isEmpty()) {
            const padding = currentIsMobile ? 20 : 40;
            mapInstanceRef.current?.fitBounds(bounds, padding);
          }
        }
      });

      clustererRef.current = clusterer;
    }

    // For initial load, just set a reasonable zoom level without bounds fitting
    if (!hasInitialBounds) {
      // Set zoom level to show ~1km scale
      const initialZoom = currentIsMobile ? 11 : 12;
      mapInstanceRef.current.setZoom(initialZoom);
      setHasInitialBounds(true);
    }
  }, [filteredAppointments, mapState.isInitialized, enableClustering, showClusters]);

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

  // Handle loading state - include effective loading state
  const showLoadingOverlay = mapState.isLoading || !mapState.isInitialized || !isContainerReady || effectiveLoading.isLoading || (!effectiveLoading.isLoaded && !effectiveLoading.isError);

  // Debug logging for loading states
  useEffect(() => {
    console.log('🔍 Map loading states:', {
      mapStateIsLoading: mapState.isLoading,
      mapStateIsInitialized: mapState.isInitialized,
      isContainerReady,
      googleMapsLoaded,
      googleMapsLoading,
      showLoadingOverlay
    });
  }, [
    mapState.isLoading,
    mapState.isInitialized,
    isContainerReady,
    googleMapsLoaded,
    googleMapsLoading,
    showLoadingOverlay
  ]);

  // Handle map error
  if (mapState.error) {
    const isApiKeyError = mapState.error.message.includes('API key') ||
                         mapState.error.message.includes('placeholder') ||
                         mapState.error.message.includes('not set');

    return (
      <div className={`flex items-center justify-center h-64 border rounded-lg ${
        isApiKeyError
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="text-center max-w-md mx-4">
          <div className="mb-4">
            {isApiKeyError ? (
              <div className="text-yellow-600 text-4xl mb-2">🗝️</div>
            ) : (
              <div className="text-red-600 text-4xl mb-2">⚠️</div>
            )}
          </div>
          <p className={`font-medium ${
            isApiKeyError ? 'text-yellow-800' : 'text-red-600'
          }`}>
            {isApiKeyError ? 'Google Maps API Key Required' : 'Map Error'}
          </p>
          <p className={`text-sm mt-2 ${
            isApiKeyError ? 'text-yellow-700' : 'text-red-500'
          }`}>
            {mapState.error.message}
          </p>
          {isApiKeyError && (
            <div className="mt-4 p-3 bg-yellow-100 rounded-md text-left text-sm text-yellow-800">
              <p className="font-medium mb-2">To fix this:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Get your API key from <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                <li>Add it to your <code className="bg-yellow-200 px-1 rounded">.env.local</code> file</li>
                <li>Restart your development server</li>
              </ol>
            </div>
          )}
          {refetch && (
            <button
              onClick={refetch}
              className={`mt-4 px-4 py-2 text-white rounded-md transition-colors ${
                isApiKeyError
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Function to fit bounds to all markers
  const fitBoundsToMarkers = useCallback(() => {
    if (mapInstanceRef.current && markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }
      });

      if (!bounds.isEmpty()) {
        const currentIsMobile = window.innerWidth < 768;
        const currentIsTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
        const padding = currentIsMobile ? 20 : currentIsTablet ? 40 : 60;
        mapInstanceRef.current.fitBounds(bounds, padding);
      }
    }
  }, []);

  return (
    <MapErrorBoundary>
      <div
        data-testid="map-container"
        className={`
          relative bg-[--card] rounded-lg shadow-sm border border-[--border]
          ${isMobile ? 'touch-manipulation' : ''}
          ${className}
        `}
        style={style}
      >
        {/* Map Controls */}
        <div className="absolute bottom-4 left-4 z-[9999] flex flex-row gap-2">
          <button
            onClick={fitBoundsToMarkers}
            className="px-3 py-2 bg-white text-gray-700 rounded-lg shadow-lg hover:bg-gray-50 transition-colors text-sm font-medium border border-gray-300"
            title="Fit to map view"
            data-fit-to-map-button
            style={{ 
              zIndex: 9999,
              pointerEvents: 'auto'
            }}
          >
            📍 Fit to Map
          </button>

          {/* Clustering Statistics */}
          {enableClustering && showClusters && clustering.state.clusters.length > 0 && (
            <div className="px-3 py-2 bg-white text-gray-700 rounded-lg shadow-md text-sm font-medium border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Clustering Stats</div>
              <div className="space-y-1">
                <div>Clusters: {clustering.state.clusterCount}</div>
                <div>Avg Size: {clustering.state.averageClusterSize.toFixed(1)}</div>
                <div>Efficiency: {(clustering.getClusteringStats().clusteringEfficiency * 100).toFixed(0)}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Debug Panel - hidden */}
        {false && (
          <div className="absolute bottom-4 left-4 z-10 bg-white bg-opacity-90 rounded-lg shadow-md p-3 text-xs max-w-sm max-h-96 overflow-y-auto">
            <div className="font-medium text-gray-700 mb-2">Map Debug Info</div>
            <div className="space-y-1 text-gray-600">
              <div>Markers: {markersRef.current.length}</div>
              <div>Appointments: {filteredAppointments.length}</div>
              <div>Has Initial Bounds: {hasInitialBounds ? 'Yes' : 'No'}</div>

              {/* Show appointment details with coordinates */}
              <div className="mt-2">
                <div className="font-medium">Appointment Details:</div>
                {filteredAppointments.slice(0, 3).map((appointment, index) => {
                  // Debug logging for each appointment
                  console.log(`Debug - Appointment ${appointment.id}:`, {
                    patient: appointment.patient?.name,
                    hasPatient: !!appointment.patient,
                    latitude: appointment.patient?.latitude,
                    longitude: appointment.patient?.longitude,
                    appointment_date: appointment.appointment_date,
                    start_time: appointment.start_time
                  });

                  return (
                    <div key={appointment.id} className="text-xs mt-1 p-1 bg-gray-50 rounded">
                      <div className="font-medium">{appointment.patient?.name || 'Unknown'}</div>
                      <div>Coords: {appointment.patient?.latitude ? `${appointment.patient.latitude}, ${appointment.patient.longitude}` : 'None'}</div>
                      <div>Address: {appointment.patient?.address || 'None'}</div>
                      <div className="text-xs text-gray-400">Date: {appointment.appointment_date} {appointment.start_time}</div>
                    </div>
                  );
                })}
                {filteredAppointments.length > 3 && (
                  <div className="text-xs text-gray-500">... and {filteredAppointments.length - 3} more</div>
                )}
              </div>

              {/* Show marker positions */}
              {markersRef.current.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium">Marker Positions:</div>
                  {markersRef.current.slice(0, 3).map((marker, index) => {
                    const pos = marker.getPosition();
                    return (
                      <div key={index} className="text-xs">
                        {index + 1}: {pos ? `${pos.lat().toFixed(6)}, ${pos.lng().toFixed(6)}` : 'No position'}
                      </div>
                    );
                  })}
                  {markersRef.current.length > 3 && (
                    <div className="text-xs text-gray-500">... and {markersRef.current.length - 3} more</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          ref={mapContainerRef}
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

        {/* Loading overlay */}
        {showLoadingOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">
                {!isContainerReady ? 'Preparing map container...' :
                 effectiveLoading.isLoading ? 'Loading Google Maps API...' : 'Loading map...'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {!isContainerReady ? 'Setting up map interface' :
                 effectiveLoading.isLoading ? 'Downloading map resources' : 'Please wait while we initialize the map'}
              </p>
            </div>
          </div>
        )}

        {/* Mobile-specific overlay for better touch feedback */}
        {isMobile && !showLoadingOverlay && (
          <div
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background: 'linear-gradient(transparent 0%, transparent 100%)',
              zIndex: 1000
            }}
          />
        )}

        {/* Enhanced Info Window */}
        {mapState.showInfoWindow && mapState.infoWindowMarker && (
          <MapInfoWindow
            marker={mapState.infoWindowMarker}
            isVisible={mapState.showInfoWindow}
            onClose={() => setMapState(prev => ({
              ...prev,
              showInfoWindow: false,
              infoWindowMarker: null
            }))}
            onEdit={(marker) => {
              // Find the original appointment and call the edit handler
              const appointment = appointments.find(apt => apt.id === marker.appointment_id);
              if (appointment && onAppointmentClick) {
                onAppointmentClick(appointment);
              }
              // Close the info window
              setMapState(prev => ({
                ...prev,
                showInfoWindow: false,
                infoWindowMarker: null
              }));
            }}
            onDelete={(marker) => {
              // Find the original appointment and call the delete handler
              const appointment = appointments.find(apt => apt.id === marker.appointment_id);
              if (appointment && onAppointmentRightClick) {
                const mockEvent = {
                  preventDefault: () => {},
                  stopPropagation: () => {}
                } as React.MouseEvent;
                onAppointmentRightClick(appointment, mockEvent);
              }
              // Close the info window
              setMapState(prev => ({
                ...prev,
                showInfoWindow: false,
                infoWindowMarker: null
              }));
            }}
            onNavigate={(marker) => {
              // Navigate to the appointment location
              if (mapInstanceRef.current) {
                const position = new google.maps.LatLng(
                  marker.position.lat,
                  marker.position.lng
                );
                mapInstanceRef.current.setCenter(position);
                mapInstanceRef.current.setZoom(16);
              }
              // Close the info window
              setMapState(prev => ({
                ...prev,
                showInfoWindow: false,
                infoWindowMarker: null
              }));
            }}
            mobile={isMobile}
            compact={isMobile}
            position="top"
            maxWidth={isMobile ? "calc(100vw - 2rem)" : "400px"}
          />
        )}

        {/* Office Marker - Always visible */}
        <OfficeMarker
          map={mapInstanceRef.current}
          isVisible={mapState.isInitialized && !mapState.isLoading}
          onClick={useCallback(() => {
            console.log('Office marker clicked');
          }, [])}
        />
      </div>
    </MapErrorBoundary>
  );
}

export default AppointmentMapView;
