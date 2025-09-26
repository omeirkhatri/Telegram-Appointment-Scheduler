'use client';

import type { TransportationSegmentOverrideAudit } from '@/types/auditTrail';
import type { TransportationSegment } from '@/types/transportationSegment';
import {
    getTransportationSegmentStatusLabel,
    getTransportationSegmentTypeLabel
} from '@/types/transportationSegment';
import { formatTimeToHHMM } from '@/utils/timezone';
import { calculateSegmentWarnings } from '@/utils/transportationSegments';
import {
    AlertCircle,
    Car,
    CheckCircle,
    Clock,
    Edit,
    History,
    MapPin,
    Navigation,
    Phone,
    PlayCircle,
    User,
    XCircle
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { TransportationSegmentOverrideHistory } from './TransportationSegmentOverrideHistory';

interface TransportationSegmentsDisplayProps {
  segments: TransportationSegment[];
  onEdit?: (segment: TransportationSegment) => void;
  onCallDriver?: (driverId: string, driverName: string) => void;
  segmentOverrides?: Record<string, TransportationSegmentOverrideAudit[]>;
  onViewOverrideHistory?: (segmentId: string) => void;
}

export function TransportationSegmentsDisplay({
  segments,
  onEdit,
  onCallDriver,
  segmentOverrides = {},
  onViewOverrideHistory
}: TransportationSegmentsDisplayProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [showOverrideHistory, setShowOverrideHistory] = useState<string | null>(null);
  const segmentWarnings = useMemo(() => calculateSegmentWarnings(segments), [segments]);

  if (!segments || segments.length === 0) {
    return (
      <div className="p-3 bg-white rounded-lg border">
        <div className="flex items-center space-x-2 text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span>No transportation segments assigned</span>
        </div>
      </div>
    );
  }

  const toggleSegmentExpansion = (segmentId: string) => {
    setExpandedSegments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(segmentId)) {
        newSet.delete(segmentId);
      } else {
        newSet.add(segmentId);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pickup':
        return <Car className="w-4 h-4 text-green-600" />;
      case 'dropoff':
        return <Car className="w-4 h-4 text-red-600" />;
      case 'stay_with_staff':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'metro_assist':
        return <Navigation className="w-4 h-4 text-purple-600" />;
      default:
        return <Car className="w-4 h-4 text-gray-600" />;
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

  return (
    <div className="space-y-3">
      {segments.map((segment) => {
        const isExpanded = expandedSegments.has(segment.id);
        const hasDriver = !!segment.driver;
        const hasLocations = !!(segment.pickup_location || segment.patient_location);
        const hasTiming = !!(segment.planned_start || segment.planned_end);
        const warning = segmentWarnings[segment.id];
        const hasInstructions = !!segment.instructions;

        return (
          <div key={segment.id} className="p-3 bg-white rounded-lg border">
            {/* Segment Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getTypeIcon(segment.segment_type)}
                  <h4 className="font-medium text-gray-900">
                    {segment.title || getTransportationSegmentTypeLabel(segment.segment_type)}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(segment.status)}`}>
                    {getStatusIcon(segment.status)}
                    <span className="ml-1">{getTransportationSegmentStatusLabel(segment.status)}</span>
                  </span>
                  {segment.manual_override && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Override
                    </span>
                  )}
                  {warning && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Needs attention
                    </span>
                  )}
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  {hasTiming && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatTime(segment.planned_start)} - {formatTime(segment.planned_end)}
                      </span>
                    </div>
                  )}

                  {hasDriver && (
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{segment.driver?.first_name} {segment.driver?.last_name}</span>
                    </div>
                  )}

                  {segment.travel_mode && (
                    <div className="flex items-center space-x-1">
                      <Navigation className="w-3 h-3" />
                      <span className="capitalize">{segment.travel_mode.replace('_', ' ')}</span>
                    </div>
                  )}

                  {(segment.estimated_travel_minutes != null || segment.estimated_distance_km != null) && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {segment.estimated_travel_minutes != null
                          ? `${segment.estimated_travel_minutes} min travel`
                          : 'Travel estimate pending'}
                      </span>
                      {segment.estimated_distance_km != null && (
                        <span className="text-xs text-gray-500">({segment.estimated_distance_km} km)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                {hasDriver && onCallDriver && (
                  <button
                    onClick={() => onCallDriver(segment.driver!.id, `${segment.driver!.first_name} ${segment.driver!.last_name}`)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Call driver"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                )}

                {onEdit && (
                  <button
                    onClick={() => onEdit(segment)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit segment"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}

                {/* Override History Button */}
                {segmentOverrides[segment.id] && segmentOverrides[segment.id].length > 0 && (
                  <button
                    onClick={() => setShowOverrideHistory(segment.id)}
                    className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                    title="View override history"
                  >
                    <History className="w-4 h-4" />
                  </button>
                )}

                {(hasLocations || hasInstructions) && (
                  <button
                    onClick={() => toggleSegmentExpansion(segment.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title={isExpanded ? "Collapse details" : "Expand details"}
                  >
                    {isExpanded ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                {warning && (
                  <div className="flex items-start space-x-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                    <div className="space-y-1 text-xs text-orange-700">
                      {warning.messages.map((message, index) => (
                        <p key={index}>{message}</p>
                      ))}
                      {!segment.manual_override ? (
                        <p className="italic">Manual override is required if continuing without adjusting travel buffers.</p>
                      ) : (
                        <p className="italic text-orange-600">Manual override recorded for this segment.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Locations */}
                {hasLocations && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Locations</h5>
                    <div className="grid grid-cols-1 gap-2">
                      {segment.pickup_location && (
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Pickup Location</div>
                            <div className="text-sm text-gray-600">{formatLocation(segment.pickup_location)}</div>
                          </div>
                        </div>
                      )}

                      {segment.patient_location && (
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Patient Location</div>
                            <div className="text-sm text-gray-600">{formatLocation(segment.patient_location)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Driver Details */}
                {hasDriver && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Driver Details</h5>
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900">
                          {segment.driver?.first_name} {segment.driver?.last_name}
                        </span>
                      </div>
                      {segment.driver?.phone && (
                        <div className="flex items-center space-x-2 mt-1">
                          <Phone className="w-3 h-3 text-gray-600" />
                          <span className="text-sm text-gray-600">{segment.driver.phone}</span>
                        </div>
                      )}
                      {segment.driver?.email && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="w-3 h-3 text-center text-xs text-gray-600">@</span>
                          <span className="text-sm text-gray-600">{segment.driver.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {hasInstructions && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Instructions</h5>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{segment.instructions}</p>
                    </div>
                  </div>
                )}

                {/* Travel Details */}
                {(segment.estimated_travel_minutes != null || segment.estimated_distance_km != null || segment.buffer_minutes != null) && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">Travel Details</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {segment.estimated_travel_minutes != null && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-gray-600" />
                          <span>{segment.estimated_travel_minutes} min travel</span>
                        </div>
                      )}
                      {segment.estimated_distance_km != null && (
                        <div className="flex items-center space-x-1">
                          <Navigation className="w-3 h-3 text-gray-600" />
                          <span>{segment.estimated_distance_km} km</span>
                        </div>
                      )}
                      {segment.buffer_minutes != null && (
                        <div className="flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3 text-gray-600" />
                          <span>{segment.buffer_minutes} min buffer</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Follow-up Flag */}
                {segment.requires_follow_up && (
                  <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">Requires follow-up</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Override History Modal */}
      {showOverrideHistory && segmentOverrides[showOverrideHistory] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <TransportationSegmentOverrideHistory
                overrides={segmentOverrides[showOverrideHistory]}
                onClose={() => setShowOverrideHistory(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
