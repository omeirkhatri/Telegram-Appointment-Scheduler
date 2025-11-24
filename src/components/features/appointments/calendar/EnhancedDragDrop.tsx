'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Staff } from '@/types/staff';
import type { TransportationSegment } from '@/types/transportationSegment';
import { getTransportationSegmentStatusLabel, getTransportationSegmentTypeLabel } from '@/types/transportationSegment';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle,
    Clock,
    Edit,
    MapPin,
    Play,
    UserPlus
} from 'lucide-react';
import { useState } from 'react';
import { QuickReassignment } from './QuickReassignment';

interface EnhancedDragDropProps {
  segment: TransportationSegment;
  drivers?: Staff[];
  isDragging?: boolean;
  isDragOver?: boolean;
  canDrop?: boolean;
  onDragStart?: (segment: TransportationSegment) => void;
  onDragEnd?: () => void;
  onDrop?: (segment: TransportationSegment) => void;
  onSegmentClick?: (segment: TransportationSegment) => void;
  onSegmentStatusUpdate?: (segmentId: string, status: any) => void;
  onSegmentReassign?: (segmentId: string, newDriverId: string) => void;
  onSegmentUpdate?: (segmentId: string, updates: Partial<TransportationSegment>) => void;
  onEditSegment?: (segment: TransportationSegment) => void;
  onReassignSegment?: (segment: TransportationSegment) => void;
  onCallDriver?: (driver: Staff) => void;
  showActions?: boolean;
  showQuickReassignment?: boolean;
  className?: string;
}

export function EnhancedDragDrop({
  segment,
  drivers = [],
  isDragging = false,
  isDragOver = false,
  canDrop = true,
  onDragStart,
  onDragEnd,
  onDrop,
  onSegmentClick,
  onSegmentStatusUpdate,
  onSegmentReassign,
  onSegmentUpdate,
  onEditSegment,
  onReassignSegment,
  onCallDriver,
  showActions = true,
  showQuickReassignment = true,
  className = ''
}: EnhancedDragDropProps) {

  const [isHovered, setIsHovered] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

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

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', segment.id);
    e.dataTransfer.effectAllowed = 'move';

    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.6';
      e.currentTarget.style.transform = 'rotate(2deg) scale(1.05)';
    }

    onDragStart?.(segment);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '';
      e.currentTarget.style.transform = '';
    }

    onDragEnd?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = canDrop ? 'move' : 'none';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (canDrop) {
      onDrop?.(segment);
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
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowQuickActions(false);
      }}
      onClick={() => onSegmentClick?.(segment)}
      className={`
        relative p-4 border-l-4 rounded-lg transition-all duration-200 cursor-pointer
        ${isDragging
          ? 'opacity-60 transform rotate-1 scale-105 shadow-lg z-50'
          : isDragOver
          ? 'ring-2 ring-blue-500 bg-blue-50 scale-105 shadow-md'
          : 'hover:shadow-md hover:scale-[1.02]'
        }
        ${segment.manual_override
          ? 'border-orange-300 bg-orange-50'
          : getSegmentTypeColor(segment.segment_type)
        }
        ${className}
      `}
      role="article"
      aria-label={`Segment: ${segment.title}`}
    >
      {/* Drag Indicator */}
      {isDragging && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center z-10">
          <ArrowRight className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Drop Zone Indicator */}
      {isDragOver && canDrop && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 rounded-lg flex items-center justify-center">
          <div className="text-blue-600 font-medium text-sm">
            Drop here to assign
          </div>
        </div>
      )}

      {/* Conflict Warning */}
      {segment.manual_override && (
        <div className="absolute -top-1 -left-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-3 h-3 text-white" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={getStatusColor(segment.status)}>
              {getTransportationSegmentStatusLabel(segment.status)}
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              {getSegmentTypeIcon(segment.segment_type)}
              <span>{getTransportationSegmentTypeLabel(segment.segment_type)}</span>
            </Badge>
            {segment.manual_override && (
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                Manual Override
              </Badge>
            )}
          </div>

          <h4 className="font-medium text-gray-900 mb-2 break-words">{segment.title}</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
            {/* Timing */}
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {formatTime(segment.planned_start)} - {formatTime(segment.planned_end)}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="text-xs leading-relaxed">
                <span className="block truncate">
                  {segment.pickup_location?.address || 'Pickup Location TBD'}
                </span>
                <span className="block truncate">
                  → {segment.patient_location?.address || 'Patient Location TBD'}
                </span>
              </span>
            </div>

            {/* Travel Info */}
            {(segment.estimated_travel_minutes || segment.estimated_distance_km) && (
              <div className="flex items-center space-x-2 sm:col-span-2 lg:col-span-1">
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs">
                  {segment.estimated_travel_minutes && `${segment.estimated_travel_minutes} min`}
                  {segment.estimated_distance_km && ` • ${segment.estimated_distance_km} km`}
                </span>
              </div>
            )}
          </div>

          {/* Instructions */}
          {segment.instructions && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
              <strong>Instructions:</strong>
              <span className="block mt-1 break-words">{segment.instructions}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {showActions && (isHovered || showQuickActions) && (
          <div className="flex flex-col sm:flex-row gap-2 lg:ml-4">
            {/* Quick Reassignment Component */}
            {showQuickReassignment && drivers.length > 0 && (
              <QuickReassignment
                segment={segment}
                drivers={drivers}
                onReassign={onSegmentReassign}
                onStatusUpdate={onSegmentStatusUpdate}
                onCallDriver={onCallDriver}
                onEditSegment={onEditSegment}
                className="w-full sm:w-auto"
              />
            )}

            {/* Individual Action Buttons (Fallback) */}
            {!showQuickReassignment && (
              <>
                {/* Status Update */}
                {onSegmentStatusUpdate && (segment.status === 'scheduled' || segment.status === 'in_progress') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newStatus = segment.status === 'scheduled' ? 'in_progress' : 'completed';
                      handleStatusUpdate(segment.id, newStatus);
                    }}
                    className="w-full sm:w-auto"
                    aria-label={`${segment.status === 'scheduled' ? 'Start' : 'Complete'} segment: ${segment.title}`}
                  >
                    {segment.status === 'scheduled' ? (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete
                      </>
                    )}
                  </Button>
                )}

                {/* Reassign Driver */}
                {onSegmentReassign && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReassignSegment(segment);
                    }}
                    className="w-full sm:w-auto"
                    aria-label={`Reassign driver for segment: ${segment.title}`}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Reassign</span>
                    <span className="sm:hidden">Reassign Driver</span>
                  </Button>
                )}

                {/* Edit Segment */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSegment(segment);
                  }}
                  className="w-full sm:w-auto"
                  aria-label={`Edit segment: ${segment.title}`}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                  <span className="sm:hidden">Edit Segment</span>
                </Button>
              </>
            )}
          </div>
        )}

        {/* Quick Actions Toggle */}
        {showActions && !isHovered && (
          <div className="lg:ml-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickActions(!showQuickActions);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Show quick actions"
            >
              <span className="text-xs">•••</span>
            </Button>
          </div>
        )}
      </div>

      {/* Drag Preview Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-20 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none">
          <div className="absolute top-2 right-2 text-blue-600 text-xs font-medium">
            Dragging...
          </div>
        </div>
      )}
    </div>
  );
}
