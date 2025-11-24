'use client';

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import type { TransportationSegment, TransportationSegmentStatus, TransportationSegmentType } from '@/types/transportationSegment';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Edit,
    Loader2,
    MapPin,
    Navigation,
    Save
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface TransportationSegmentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: TransportationSegment | null;
  onSave: (segmentId: string, updates: Partial<TransportationSegment>) => void;
  isLoading?: boolean;
}

export function TransportationSegmentEditModal({
  isOpen,
  onClose,
  segment,
  onSave,
  isLoading = false
}: TransportationSegmentEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    planned_start: '',
    planned_end: '',
    status: 'scheduled' as TransportationSegmentStatus,
    type: 'pickup' as TransportationSegmentType,
    pickup_address: '',
    patient_address: '',
    estimated_duration: '',
    estimated_distance: ''
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  useEffect(() => {
    if (segment) {
      const newFormData = {
        title: segment.title || '',
        instructions: segment.instructions || '',
        planned_start: segment.planned_start ? new Date(segment.planned_start).toISOString().slice(0, 16) : '',
        planned_end: segment.planned_end ? new Date(segment.planned_end).toISOString().slice(0, 16) : '',
        status: segment.status,
        type: segment.type,
        pickup_address: segment.pickup_location?.address || '',
        patient_address: segment.patient_location?.address || '',
        estimated_duration: segment.estimated_duration?.toString() || '',
        estimated_distance: segment.estimated_distance?.toString() || ''
      };
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [segment]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const calculateDistanceAndTime = async () => {
    if (!formData.pickup_address || !formData.patient_address) {
      console.log('Missing addresses for calculation');
      return;
    }

    console.log('Starting calculation for:', formData.pickup_address, '→', formData.patient_address);
    setIsCalculating(true);

    try {
      const response = await fetch('/api/transportation-segments/calculate-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup_location: formData.pickup_address,
          patient_location: formData.patient_address
        }),
      });

      console.log('API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Calculation result:', data);

        setFormData(prev => ({
          ...prev,
          estimated_duration: data.duration?.toString() || prev.estimated_duration,
          estimated_distance: data.distance?.toString() || prev.estimated_distance
        }));
        setHasChanges(true);

        // Show info about mock data if used
        if (data.mock) {
          console.log('Using mock calculation data (Google Maps API not configured)');
          setIsUsingMockData(true);
        } else {
          setIsUsingMockData(false);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to calculate route:', errorData);
        alert(`Failed to calculate route: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      alert(`Error calculating route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = () => {
    if (segment && hasChanges) {
      const updates: Partial<TransportationSegment> = {
        title: formData.title,
        instructions: formData.instructions,
        planned_start: formData.planned_start ? new Date(formData.planned_start).toISOString() : null,
        planned_end: formData.planned_end ? new Date(formData.planned_end).toISOString() : null,
        status: formData.status,
        type: formData.type,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
        estimated_distance: formData.estimated_distance ? parseFloat(formData.estimated_distance) : null
      };

      // Update pickup and patient locations if addresses changed
      if (formData.pickup_address) {
        updates.pickup_location = {
          ...segment.pickup_location,
          address: formData.pickup_address
        };
      }
      if (formData.patient_address) {
        updates.patient_location = {
          ...segment.patient_location,
          address: formData.patient_address
        };
      }

      onSave(segment.id, updates);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
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

  // Auto-calculate when both addresses are provided and different from original
  useEffect(() => {
    if (segment && formData.pickup_address && formData.patient_address) {
      const originalPickup = segment.pickup_location?.address || '';
      const originalPatient = segment.patient_location?.address || '';

      // Only auto-calculate if addresses have changed
      if (formData.pickup_address !== originalPickup || formData.patient_address !== originalPatient) {
        const timeoutId = setTimeout(() => {
          calculateDistanceAndTime();
        }, 1000); // Debounce for 1 second

        return () => clearTimeout(timeoutId);
      }
    }
  }, [formData.pickup_address, formData.patient_address]);

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

  if (!segment) return null;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="w-5 h-5" />
            <span>Edit Transportation Segment</span>
            {hasChanges && (
              <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">
                Unsaved Changes
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter segment title"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pickup">Pickup</option>
                      <option value="dropoff">Drop-off</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Instructions</label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter special instructions for this segment"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Timing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Timing</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Planned Start</label>
                    <input
                      type="datetime-local"
                      value={formData.planned_start}
                      onChange={(e) => handleInputChange('planned_start', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Planned End</label>
                    <input
                      type="datetime-local"
                      value={formData.planned_end}
                      onChange={(e) => handleInputChange('planned_end', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Locations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Locations</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Pickup Location Address</label>
                  <input
                    type="text"
                    value={formData.pickup_address}
                    onChange={(e) => handleInputChange('pickup_address', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter pickup location address"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Patient Location Address</label>
                  <input
                    type="text"
                    value={formData.patient_address}
                    onChange={(e) => handleInputChange('patient_address', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter patient location address"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Estimates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Estimates</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={calculateDistanceAndTime}
                    disabled={isCalculating || !formData.pickup_address || !formData.patient_address}
                    className="flex items-center space-x-2"
                  >
                    {isCalculating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    <span>{isCalculating ? 'Calculating...' : 'Auto Calculate'}</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.estimated_duration}
                      onChange={(e) => handleInputChange('estimated_duration', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter duration in minutes"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Distance (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.estimated_distance}
                      onChange={(e) => handleInputChange('estimated_distance', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter distance in kilometers"
                      min="0"
                    />
                  </div>
                </div>

                {formData.pickup_address && formData.patient_address && (
                  <div className={`text-sm p-3 rounded-lg ${
                    isCalculating
                      ? 'text-blue-600 bg-blue-50'
                      : isUsingMockData
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-600 bg-blue-50'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {isCalculating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <Navigation className="w-4 h-4 text-blue-600" />
                      )}
                      <span>
                        {isCalculating
                          ? 'Calculating route automatically...'
                          : isUsingMockData
                          ? 'Using mock data (Google Maps API not configured) - Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for real calculations'
                          : 'Click "Auto Calculate" to get distance and time estimates from Google Maps'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Change Warnings */}
            {formData.status === 'cancelled' && segment.status !== 'cancelled' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800">Warning</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  Cancelling this segment will notify the driver and may affect other segments.
                </p>
              </div>
            )}

            {formData.status === 'completed' && segment.status !== 'completed' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-800">Completion</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Marking this segment as completed will update the driver's schedule.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[--border]">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex space-x-2">
            <Button
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
