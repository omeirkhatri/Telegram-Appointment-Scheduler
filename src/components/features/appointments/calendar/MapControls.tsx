'use client';

import { Car, Eye, EyeOff, Filter, MapPin, User } from 'lucide-react';
import { useState } from 'react';

interface MapControlsProps {
  showSegmentMarkers: boolean;
  showSegmentOrigins: boolean;
  showSegmentDestinations: boolean;
  showOnlyPickupDropoffSegments: boolean;
  onToggleSegmentMarkers: (enabled: boolean) => void;
  onToggleSegmentOrigins: (enabled: boolean) => void;
  onToggleSegmentDestinations: (enabled: boolean) => void;
  onTogglePickupDropoffOnly: (enabled: boolean) => void;
  onNavigateToDriverBoard?: () => void;
  className?: string;
}

export function MapControls({
  showSegmentMarkers,
  showSegmentOrigins,
  showSegmentDestinations,
  showOnlyPickupDropoffSegments,
  onToggleSegmentMarkers,
  onToggleSegmentOrigins,
  onToggleSegmentDestinations,
  onTogglePickupDropoffOnly,
  onNavigateToDriverBoard,
  className = ''
}: MapControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">Map Controls</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title={isExpanded ? "Collapse controls" : "Expand controls"}
        >
          {isExpanded ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Controls */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Segment Markers Toggle */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSegmentMarkers}
                onChange={(e) => onToggleSegmentMarkers(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Show Segment Markers</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              Display transportation segment origins and destinations on the map
            </p>
          </div>

          {/* Segment Type Filters */}
          {showSegmentMarkers && (
            <div className="space-y-3 pl-4 border-l-2 border-gray-100">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSegmentOrigins}
                    onChange={(e) => onToggleSegmentOrigins(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Show Origins</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Display pickup and segment start locations
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSegmentDestinations}
                    onChange={(e) => onToggleSegmentDestinations(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <MapPin className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">Show Destinations</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Display dropoff and segment end locations
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyPickupDropoffSegments}
                    onChange={(e) => onTogglePickupDropoffOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Car className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Pickup/Dropoff Only</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">
                  Hide metro assist and stay-with-staff segments
                </p>
              </div>
            </div>
          )}

          {/* Driver Board Link */}
          {onNavigateToDriverBoard && (
            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={onNavigateToDriverBoard}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>View Driver Board</span>
              </button>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Open driver-focused view with segment timelines
              </p>
            </div>
          )}

          {/* Legend */}
          {showSegmentMarkers && (
            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Segment Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Pickup segments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">Dropoff segments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Stay with staff</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-gray-600">Metro assist</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full border-2 border-gray-400"></div>
                  <span className="text-gray-600">Origin (O) / Destination (D)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
