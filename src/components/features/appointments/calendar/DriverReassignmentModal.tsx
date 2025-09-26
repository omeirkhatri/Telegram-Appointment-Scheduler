'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
// Custom modal implementation - no external dialog/select components needed
import type { Staff } from '@/types/staff';
import type { TransportationSegment, TransportationSegmentStatus } from '@/types/transportationSegment';
import { getTransportationSegmentStatusLabel } from '@/types/transportationSegment';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    MapPin,
    Phone,
    User,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface DriverReassignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: TransportationSegment | null;
  availableDrivers: Staff[];
  onReassign: (segmentId: string, newDriverId: string) => void;
  onStatusUpdate: (segmentId: string, status: TransportationSegmentStatus) => void;
  isLoading?: boolean;
}

export function DriverReassignmentModal({
  isOpen,
  onClose,
  segment,
  availableDrivers,
  onReassign,
  onStatusUpdate,
  isLoading = false
}: DriverReassignmentModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<TransportationSegmentStatus>('scheduled');
  const [showConflicts, setShowConflicts] = useState(false);

  useEffect(() => {
    if (segment) {
      setSelectedDriverId(segment.driver_id || '');
      setSelectedStatus(segment.status);
    }
  }, [segment]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleReassign = () => {
    if (segment && selectedDriverId && selectedDriverId !== segment.driver_id) {
      onReassign(segment.id, selectedDriverId);
    }
  };

  const handleStatusUpdate = () => {
    if (segment && selectedStatus !== segment.status) {
      onStatusUpdate(segment.id, selectedStatus);
    }
  };

  const handleClose = () => {
    setSelectedDriverId('');
    setSelectedStatus('scheduled');
    setShowConflicts(false);
    onClose();
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'TBD';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const getStatusColor = (status: TransportationSegmentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDriverAvailability = (driverId: string) => {
    // This would typically check driver availability based on other segments
    // For now, return mock availability
    const driver = availableDrivers.find(d => d.id === driverId);
    if (!driver) return 'unknown';

    // Mock logic - in real implementation, this would check against other segments
    return 'available';
  };

  const getDriverConflicts = (driverId: string) => {
    // This would check for conflicts with other segments
    // For now, return mock conflicts
    return [];
  };

  if (!segment) return null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[--card] border border-[--border] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[--border]">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <h2 className="text-xl font-bold text-[--foreground]">Reassign Driver & Update Status</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
          {/* Segment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{segment.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Driver */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Driver</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      {segment.driver ?
                        `${segment.driver.first_name} ${segment.driver.last_name}` :
                        'No driver assigned'
                      }
                    </span>
                    {segment.driver && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`tel:${segment.driver?.phone}`)}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Current Status */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Status</label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(segment.status)}>
                      {getTransportationSegmentStatusLabel(segment.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  {formatTime(segment.planned_start)} - {formatTime(segment.planned_end)}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>
                  {segment.pickup_location?.address || 'Pickup Location TBD'} → {segment.patient_location?.address || 'Patient Location TBD'}
                </span>
              </div>

              {/* Instructions */}
              {segment.instructions && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Instructions:</strong> {segment.instructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reassignment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reassign Driver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Select New Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a driver</option>
                  {availableDrivers.map((driver) => {
                    const availability = getDriverAvailability(driver.id);
                    const conflicts = getDriverConflicts(driver.id);
                    const hasConflicts = conflicts.length > 0;

                    return (
                      <option key={driver.id} value={driver.id}>
                        {driver.first_name} {driver.last_name} ({driver.phone}) - {availability}
                        {hasConflicts ? ' - Conflicts' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Driver Details */}
              {selectedDriverId && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  {(() => {
                    const selectedDriver = availableDrivers.find(d => d.id === selectedDriverId);
                    if (!selectedDriver) return null;

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">
                              {selectedDriver.first_name} {selectedDriver.last_name}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${selectedDriver.phone}`)}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600">
                          {selectedDriver.staff_type} • {selectedDriver.phone}
                        </div>
                        {selectedDriver.email && (
                          <div className="text-sm text-gray-600">
                            {selectedDriver.email}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Conflict Warnings */}
              {selectedDriverId && getDriverConflicts(selectedDriverId).length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Potential Conflicts</span>
                  </div>
                  <div className="space-y-1">
                    {getDriverConflicts(selectedDriverId).map((conflict, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        • {conflict}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Update Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium text-gray-700">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as TransportationSegmentStatus)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Status Change Warnings */}
              {selectedStatus === 'cancelled' && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-800">Warning</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Cancelling this segment will notify the driver and may affect other segments.
                  </p>
                </div>
              )}

              {selectedStatus === 'completed' && segment.status !== 'completed' && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">Completion</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Marking this segment as completed will update the driver's schedule.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[--border]">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex space-x-2">
            {selectedDriverId !== segment.driver_id && (
              <Button
                onClick={handleReassign}
                disabled={isLoading || !selectedDriverId}
                variant="outline"
              >
                Reassign Driver
              </Button>
            )}
            {selectedStatus !== segment.status && (
              <Button
                onClick={handleStatusUpdate}
                disabled={isLoading}
                variant="outline"
              >
                Update Status
              </Button>
            )}
            {(selectedDriverId !== segment.driver_id || selectedStatus !== segment.status) && (
              <Button
                onClick={() => {
                  if (selectedDriverId !== segment.driver_id) handleReassign();
                  if (selectedStatus !== segment.status) handleStatusUpdate();
                  handleClose();
                }}
                disabled={isLoading}
              >
                Apply All Changes
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
