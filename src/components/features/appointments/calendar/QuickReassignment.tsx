'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Staff } from '@/types/staff';
import type { TransportationSegment } from '@/types/transportationSegment';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Edit,
    Phone,
    Play,
    RefreshCw,
    User,
    UserPlus,
    X
} from 'lucide-react';
import { useState } from 'react';

interface QuickReassignmentProps {
  segment: TransportationSegment;
  drivers: Staff[];
  onReassign?: (segmentId: string, newDriverId: string) => void;
  onStatusUpdate?: (segmentId: string, status: string) => void;
  onCallDriver?: (driver: Staff) => void;
  onEditSegment?: (segment: TransportationSegment) => void;
  className?: string;
}

export function QuickReassignment({
  segment,
  drivers,
  onReassign,
  onStatusUpdate,
  onCallDriver,
  onEditSegment,
  className = ''
}: QuickReassignmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  const getDriverAvailability = (driver: Staff) => {
    // Simulate driver availability - in real app this would come from API
    const isAvailable = Math.random() > 0.3;
    const isBusy = Math.random() > 0.7;
    const workload = Math.floor(Math.random() * 5) + 1;

    return {
      isAvailable,
      isBusy,
      workload,
      status: isAvailable ? (isBusy ? 'busy' : 'available') : 'unavailable'
    };
  };

  const handleReassign = async (newDriverId: string) => {
    if (!onReassign) return;

    setIsReassigning(true);
    try {
      await onReassign(segment.id, newDriverId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to reassign segment:', error);
    } finally {
      setIsReassigning(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onStatusUpdate) return;

    setIsUpdatingStatus(true);
    try {
      await onStatusUpdate(segment.id, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCallDriver = (driver: Staff) => {
    if (onCallDriver) {
      onCallDriver(driver);
    }
  };

  const handleEditSegment = () => {
    if (onEditSegment) {
      onEditSegment(segment);
    }
  };

  const getNextStatus = () => {
    switch (segment.status) {
      case 'scheduled': return 'in_progress';
      case 'in_progress': return 'completed';
      default: return null;
    }
  };

  const nextStatus = getNextStatus();

  return (
    <div className={`relative ${className}`}>
      {/* Quick Actions Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full"
        aria-label="Quick reassignment options"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Quick Actions
      </Button>

      {/* Quick Actions Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Quick Actions</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              aria-label="Close quick actions"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Segment Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">{segment.title}</span>
              <Badge className={getStatusColor(segment.status)}>
                {segment.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{formatTime(segment.planned_start)} - {formatTime(segment.planned_end)}</span>
            </div>
          </div>

          {/* Status Update */}
          {nextStatus && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Status Update</h5>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate(nextStatus)}
                disabled={isUpdatingStatus}
                className="w-full"
              >
                {isUpdatingStatus ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : nextStatus === 'in_progress' ? (
                  <Play className="w-4 h-4 mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {nextStatus === 'in_progress' ? 'Start Segment' : 'Complete Segment'}
              </Button>
            </div>
          )}

          {/* Driver Reassignment */}
          {onReassign && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Reassign Driver</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {drivers.map((driver) => {
                  const availability = getDriverAvailability(driver);
                  const isCurrentDriver = segment.driver_id === driver.id;

                  return (
                    <div
                      key={driver.id}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        isCurrentDriver
                          ? 'border-blue-300 bg-blue-50'
                          : availability.isAvailable
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center
                          ${isCurrentDriver
                            ? 'bg-blue-100 text-blue-600'
                            : availability.isAvailable
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600'
                          }
                        `}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {driver.first_name} {driver.last_name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {availability.workload} appointments • {availability.status}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {onCallDriver && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCallDriver(driver)}
                            className="p-1"
                            aria-label={`Call ${driver.first_name} ${driver.last_name}`}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}

                        {!isCurrentDriver && availability.isAvailable && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReassign(driver.id)}
                            disabled={isReassigning}
                            className="text-xs"
                          >
                            {isReassigning ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <UserPlus className="w-3 h-3" />
                            )}
                          </Button>
                        )}

                        {isCurrentDriver && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Edit Segment */}
          {onEditSegment && (
            <div className="mb-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditSegment}
                className="w-full"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Segment Details
              </Button>
            </div>
          )}

          {/* Conflict Warning */}
          {segment.manual_override && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2 text-orange-700">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Manual Override</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                This segment has been manually overridden. Changes may affect the original assignment.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}



