'use client';

import type { TransportationSegment } from '@/types/transportationSegment';
import { useEffect, useState } from 'react';

export interface DriverAvailabilityStatus {
  status: 'available' | 'conflict' | 'tight_schedule' | 'unavailable';
  message: string;
  conflicts?: string[];
  travelGap?: number; // in minutes
}

export function evaluateDriverAvailability(
  driverId: string,
  segment: TransportationSegment,
  allSegments: TransportationSegment[],
): DriverAvailabilityStatus | null {
  if (!driverId || !segment.planned_start || !segment.planned_end) {
    return null;
  }

  try {
    const otherSegments = allSegments.filter(s =>
      s.driver_id === driverId &&
      s.id !== segment.id &&
      s.status !== 'cancelled',
    );

    const segmentStart = new Date(segment.planned_start);
    const segmentEnd = new Date(segment.planned_end);

    const conflicts: string[] = [];
    let minTravelGap = Infinity;

    for (const otherSegment of otherSegments) {
      if (!otherSegment.planned_start || !otherSegment.planned_end) {
        continue;
      }

      const otherStart = new Date(otherSegment.planned_start);
      const otherEnd = new Date(otherSegment.planned_end);

      const overlaps =
        (segmentStart >= otherStart && segmentStart < otherEnd) ||
        (segmentEnd > otherStart && segmentEnd <= otherEnd) ||
        (segmentStart <= otherStart && segmentEnd >= otherEnd);

      if (overlaps) {
        conflicts.push(`Overlaps with ${otherSegment.segment_type} segment`);
      }

      const gapBefore = Math.abs(segmentStart.getTime() - otherEnd.getTime()) / (1000 * 60);
      const gapAfter = Math.abs(otherStart.getTime() - segmentEnd.getTime()) / (1000 * 60);
      const minGap = Math.min(gapBefore, gapAfter);

      if (minGap < minTravelGap) {
        minTravelGap = minGap;
      }
    }

    let status: DriverAvailabilityStatus['status'];
    let message: string;

    if (conflicts.length > 0) {
      status = 'conflict';
      message = `Driver has ${conflicts.length} scheduling conflict${conflicts.length > 1 ? 's' : ''}`;
    } else if (minTravelGap < 30) {
      status = 'tight_schedule';
      message = `Tight schedule - only ${Math.round(minTravelGap)} minutes between segments`;
    } else if (minTravelGap < 60) {
      status = 'available';
      message = `Available with ${Math.round(minTravelGap)} minutes buffer`;
    } else {
      status = 'available';
      message = 'Driver is available';
    }

    return {
      status,
      message,
      conflicts,
      travelGap: Number.isFinite(minTravelGap) ? minTravelGap : undefined,
    };
  } catch (error) {
    console.error('Error checking driver availability:', error);
    return {
      status: 'unavailable',
      message: 'Unable to check availability',
    };
  }
}

interface DriverAvailabilityIndicatorProps {
  driverId: string;
  segment: TransportationSegment;
  allSegments: TransportationSegment[];
  onOverrideConfirm?: (segment: TransportationSegment) => void;
  className?: string;
}

export function DriverAvailabilityIndicator({
  driverId,
  segment,
  allSegments,
  onOverrideConfirm,
  className = '',
}: DriverAvailabilityIndicatorProps) {
  const [availabilityStatus, setAvailabilityStatus] = useState<DriverAvailabilityStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);

  useEffect(() => {
    if (!driverId) {
      setAvailabilityStatus(null);
      return;
    }

    setIsChecking(true);
    const availability = evaluateDriverAvailability(driverId, segment, allSegments);
    setAvailabilityStatus(availability);
    setIsChecking(false);
  }, [driverId, segment, allSegments]);

  const handleOverrideConfirm = () => {
    if (onOverrideConfirm && segment) {
      onOverrideConfirm(segment);
    }
    setShowOverrideDialog(false);
  };

  if (!driverId || !availabilityStatus) {
    return null;
  }

  const getStatusColor = () => {
    switch (availabilityStatus.status) {
      case 'available':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'tight_schedule':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'conflict':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'unavailable':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (availabilityStatus.status) {
      case 'available':
        return '✅';
      case 'tight_schedule':
        return '⚠️';
      case 'conflict':
        return '❌';
      case 'unavailable':
        return '❓';
      default:
        return '❓';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Availability Status */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-md border text-sm ${getStatusColor()}`}>
        {isChecking ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span>Checking availability...</span>
          </>
        ) : (
          <>
            <span>{getStatusIcon()}</span>
            <span className="font-medium">{availabilityStatus.message}</span>
          </>
        )}
      </div>

      {/* Conflict Details */}
      {availabilityStatus.conflicts && availabilityStatus.conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="text-sm font-medium text-red-800 mb-2">Scheduling Conflicts:</div>
          <ul className="text-sm text-red-700 space-y-1">
            {availabilityStatus.conflicts.map((conflict, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>{conflict}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Travel Gap Warning */}
      {availabilityStatus.travelGap !== undefined && availabilityStatus.travelGap < 60 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <div className="text-sm font-medium text-amber-800 mb-1">Travel Time Warning</div>
          <div className="text-sm text-amber-700">
            Only {Math.round(availabilityStatus.travelGap)} minutes between segments.
            Consider adding buffer time for travel.
          </div>
        </div>
      )}

      {/* Manual Override Option */}
      {(availabilityStatus.status === 'conflict' || availabilityStatus.status === 'tight_schedule') && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-orange-800 mb-1">Manual Override Available</div>
              <div className="text-sm text-orange-700">
                You can override this warning if you've confirmed with the driver.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOverrideDialog(true)}
              className="ml-3 px-3 py-1 text-xs font-medium text-orange-800 bg-orange-100 border border-orange-300 rounded hover:bg-orange-200"
            >
              Override
            </button>
          </div>
        </div>
      )}

      {/* Override Confirmation Dialog */}
      {showOverrideDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Manual Override</h3>
              <p className="text-sm text-gray-600">
                You are about to override the scheduling conflict for this segment.
                Please ensure you have confirmed with the driver.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Override Reason
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Explain why this override is necessary..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowOverrideDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOverrideConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
