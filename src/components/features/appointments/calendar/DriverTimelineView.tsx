'use client';

import type { TransportationSegment } from '@/types/transportationSegment';
import {
    AlertTriangle,
    Clock
} from 'lucide-react';
import { EnhancedDragDrop } from './EnhancedDragDrop';

interface DriverTimelineViewProps {
  segments: TransportationSegment[];
  drivers?: Staff[];
  conflicts: Array<{
    severity: 'low' | 'medium' | 'high';
    message: string;
    relatedSegmentId?: string;
  }>;
  onSegmentClick?: (segment: TransportationSegment) => void;
  onSegmentStatusUpdate?: (segmentId: string, status: any) => void;
  onSegmentReassign?: (segmentId: string, newDriverId: string) => void;
  onSegmentUpdate?: (segmentId: string, updates: Partial<TransportationSegment>) => void;
  onEditSegment?: (segment: TransportationSegment) => void;
  onReassignSegment?: (segment: TransportationSegment) => void;
  onCallDriver?: (driver: Staff) => void;
}

export function DriverTimelineView({
  segments,
  drivers = [],
  conflicts,
  onSegmentClick,
  onSegmentStatusUpdate,
  onSegmentReassign,
  onSegmentUpdate,
  onEditSegment,
  onReassignSegment,
  onCallDriver
}: DriverTimelineViewProps) {

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSegmentTypeColor = (type: string) => {
    switch (type) {
      case 'pickup': return 'border-blue-300 bg-blue-50';
      case 'dropoff': return 'border-green-300 bg-green-50';
      case 'stay_with_staff': return 'border-purple-300 bg-purple-50';
      case 'metro_assist': return 'border-orange-300 bg-orange-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getSegmentTypeIcon = (type: string) => {
    switch (type) {
      case 'pickup': return '🚗';
      case 'dropoff': return '🏁';
      case 'stay_with_staff': return '👥';
      case 'metro_assist': return '🚇';
      default: return '📍';
    }
  };

  const getConflictIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'low': return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleStatusUpdate = (segmentId: string, newStatus: string) => {
    if (onSegmentStatusUpdate) {
      onSegmentStatusUpdate(segmentId, newStatus);
    }
  };

  const handleReassignSegment = (segment: TransportationSegment) => {
    if (onReassignSegment) {
      onReassignSegment(segment);
    }
  };

  const handleEditSegment = (segment: TransportationSegment) => {
    if (onEditSegment) {
      onEditSegment(segment);
    }
  };

  return (
    <div className="mb-4">
      <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
        <Clock className="w-4 h-4 mr-2" />
        Timeline View
      </h5>
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

        {/* Timeline Segments */}
        <div className="space-y-4">
          {segments.map((segment, index) => {
            const hasConflict = conflicts.some(c => c.relatedSegmentId === segment.id);
            const isOverlapping = index > 0 &&
              new Date(segment.planned_start) < new Date(segments[index - 1].planned_end);

            return (
              <div key={segment.id} className="relative flex items-start space-x-4">
                {/* Timeline Dot */}
                <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  hasConflict
                    ? 'border-red-500 bg-red-100'
                    : isOverlapping
                    ? 'border-yellow-500 bg-yellow-100'
                    : 'border-blue-500 bg-blue-100'
                }`}>
                  {hasConflict ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : isOverlapping ? (
                    <Clock className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>

                {/* Enhanced Segment Content with Drag & Drop */}
                <div className="flex-1">
                  <EnhancedDragDrop
                    segment={segment}
                    drivers={drivers}
                    onSegmentClick={onSegmentClick}
                    onSegmentStatusUpdate={onSegmentStatusUpdate}
                    onSegmentReassign={onSegmentReassign}
                    onSegmentUpdate={onSegmentUpdate}
                    onEditSegment={onEditSegment}
                    onReassignSegment={onReassignSegment}
                    onCallDriver={onCallDriver}
                    showActions={true}
                    showQuickReassignment={true}
                    className={`
                      ${hasConflict
                        ? 'border-red-300 bg-red-50'
                        : isOverlapping
                        ? 'border-yellow-300 bg-yellow-50'
                        : ''
                      }
                    `}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
