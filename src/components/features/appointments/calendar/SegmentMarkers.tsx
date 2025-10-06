'use client';

import type { Coordinates, MapMarker } from '@/types/map';
import type { TransportationSegment } from '@/types/transportationSegment';
import { getTransportationSegmentStatusLabel, getTransportationSegmentTypeLabel } from '@/types/transportationSegment';
import { formatTimeToHHMM } from '@/utils/timezone';
import { Car, MapPin, Navigation, User } from 'lucide-react';

interface SegmentMarkersProps {
  segments: TransportationSegment[];
  onSegmentClick?: (segment: TransportationSegment) => void;
  onDriverClick?: (driverId: string, driverName: string) => void;
  showOrigins?: boolean;
  showDestinations?: boolean;
  showOnlyPickupDropoff?: boolean;
}

export function SegmentMarkers({
  segments,
  onSegmentClick,
  onDriverClick,
  showOrigins = true,
  showDestinations = true,
  showOnlyPickupDropoff = false
}: SegmentMarkersProps) {

  const getSegmentIcon = (segment: TransportationSegment, isOrigin: boolean) => {
    const baseColor = isOrigin ? 'green' : 'red';
    const iconColor = getSegmentStatusColor(segment.status);

    switch (segment.segment_type) {
      case 'pickup':
        return {
          icon: Car,
          color: isOrigin ? 'text-green-600' : 'text-green-400',
          bgColor: isOrigin ? 'bg-green-100' : 'bg-green-50',
          borderColor: 'border-green-300'
        };
      case 'dropoff':
        return {
          icon: Car,
          color: isOrigin ? 'text-red-600' : 'text-red-400',
          bgColor: isOrigin ? 'bg-red-100' : 'bg-red-50',
          borderColor: 'border-red-300'
        };
      case 'stay_with_staff':
        return {
          icon: User,
          color: isOrigin ? 'text-blue-600' : 'text-blue-400',
          bgColor: isOrigin ? 'bg-blue-100' : 'bg-blue-50',
          borderColor: 'border-blue-300'
        };
      case 'metro_assist':
        return {
          icon: Navigation,
          color: isOrigin ? 'text-purple-600' : 'text-purple-400',
          bgColor: isOrigin ? 'bg-purple-100' : 'bg-purple-50',
          borderColor: 'border-purple-300'
        };
      default:
        return {
          icon: MapPin,
          color: isOrigin ? 'text-gray-600' : 'text-gray-400',
          bgColor: isOrigin ? 'bg-gray-100' : 'bg-gray-50',
          borderColor: 'border-gray-300'
        };
    }
  };

  const getSegmentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'scheduled':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatLocation = (location: any) => {
    if (!location) return 'Not specified';
    if (location.address) return location.address;
    if (location.landmark) return location.landmark;
    return `${location.lat?.toFixed(4)}, ${location.lng?.toFixed(4)}`;
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not scheduled';
    try {
      const date = new Date(timeString);
      return formatTimeToHHMM(date.toTimeString().slice(0, 5));
    } catch {
      return timeString;
    }
  };

  const createSegmentMarker = (segment: TransportationSegment, location: any, isOrigin: boolean): MapMarker => {
    const iconInfo = getSegmentIcon(segment, isOrigin);
    const position: Coordinates = {
      lat: location.lat,
      lng: location.lng
    };

    return {
      id: `${segment.id}-${isOrigin ? 'origin' : 'destination'}`,
      position,
      title: `${getTransportationSegmentTypeLabel(segment.segment_type)} - ${isOrigin ? 'Origin' : 'Destination'}`,
      description: formatLocation(location),
      segment_id: segment.id,
      appointment_id: segment.appointment_id,
      segment_type: segment.segment_type,
      segment_status: segment.status,
      is_origin: isOrigin,
      driver_name: segment.driver ? `${segment.driver.first_name} ${segment.driver.last_name}` : undefined,
      driver_id: segment.driver?.id,
      planned_start: segment.planned_start,
      planned_end: segment.planned_end,
      travel_mode: segment.travel_mode,
      instructions: segment.instructions,
      estimated_travel_minutes: segment.estimated_travel_minutes,
      estimated_distance_km: segment.estimated_distance_km,
      manual_override: segment.manual_override,
      requires_follow_up: segment.requires_follow_up
    };
  };

  const createSegmentMarkers = (): MapMarker[] => {
    const markers: MapMarker[] = [];

    segments.forEach(segment => {
      // Filter segments if only pickup/dropoff requested
      if (showOnlyPickupDropoff && !['pickup', 'dropoff'].includes(segment.segment_type)) {
        return;
      }

      // Add pickup location marker if available and requested
      if (showOrigins && segment.pickup_location) {
        markers.push(createSegmentMarker(segment, segment.pickup_location, true));
      }

      // Add patient location marker if available and requested
      if (showDestinations && segment.patient_location) {
        markers.push(createSegmentMarker(segment, segment.patient_location, false));
      }
    });

    return markers;
  };

  const createSegmentInfoWindowContent = (marker: MapMarker) => {
    const segment = segments.find(s => s.id === marker.segment_id);
    if (!segment) return '';

    const iconInfo = getSegmentIcon(segment, marker.is_origin);
    const IconComponent = iconInfo.icon;

    return `
      <div class="p-4 max-w-sm">
        <div class="flex items-center space-x-2 mb-3">
          <div class="p-2 rounded-full ${iconInfo.bgColor} ${iconInfo.borderColor} border">
            <svg class="w-4 h-4 ${iconInfo.color}" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L3 7v11h14V7l-7-5z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">${getTransportationSegmentTypeLabel(segment.segment_type)}</h3>
            <p class="text-sm text-gray-600">${marker.is_origin ? 'Pickup Location (where driver picks up patient)' : 'Patient Location (where patient is going)'}</p>
          </div>
        </div>

        <div class="space-y-2 text-sm">
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
            </svg>
            <span class="text-gray-700">${marker.description}</span>
          </div>

          ${segment.driver ? `
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
              <span class="text-gray-700">${segment.driver.first_name} ${segment.driver.last_name}</span>
            </div>
          ` : ''}

          ${segment.planned_start ? `
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-700">${formatTime(segment.planned_start)}</span>
            </div>
          ` : ''}

          ${segment.travel_mode ? `
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
              </svg>
              <span class="text-gray-700 capitalize">${segment.travel_mode.replace('_', ' ')}</span>
            </div>
          ` : ''}

          ${segment.estimated_travel_minutes ? `
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
              </svg>
              <span class="text-gray-700">${segment.estimated_travel_minutes} min travel</span>
            </div>
          ` : ''}

          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSegmentStatusColor(segment.status)} bg-opacity-10">
              ${getTransportationSegmentStatusLabel(segment.status)}
            </span>
            ${segment.manual_override ? `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-orange-800 bg-orange-100">
                Override
              </span>
            ` : ''}
            ${segment.requires_follow_up ? `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-yellow-800 bg-yellow-100">
                Follow-up
              </span>
            ` : ''}
          </div>

          ${segment.instructions ? `
            <div class="mt-2 p-2 bg-gray-50 rounded">
              <p class="text-xs text-gray-600">${segment.instructions}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  return {
    createSegmentMarkers,
    createSegmentInfoWindowContent,
    getSegmentIcon,
    getSegmentStatusColor
  };
}
