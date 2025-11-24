'use client';

import { CapacityPlannerDashboard } from '@/components/features/appointments/calendar/CapacityPlannerDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { ShadButton as Button, ShadCard as Card, Input } from '@/components/ui';
import { isDriverAssignmentOverhaulCapacityPlannerEnabled } from '@/lib/featureFlags';
import type { Staff } from '@/types/staff';
import type { TransportationSegment, TransportationSegmentStatus } from '@/types/transportationSegment';
import { Calendar, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function CapacityPlannerPage() {
  const [segments, setSegments] = useState<TransportationSegment[]>([]);
  const [drivers, setDrivers] = useState<Staff[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if capacity planner is enabled
  const isCapacityPlannerEnabled = isDriverAssignmentOverhaulCapacityPlannerEnabled();

  // If feature is disabled, show access denied message
  if (!isCapacityPlannerEnabled) {
    return (
      <>
        <PageHeader
          title="Capacity Planner"
          description="Plan driver assignments and manage transportation capacity"
        />
        <main className="px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="text-center py-12">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Capacity Planner Unavailable</h1>
              <p className="text-gray-600 mb-6">
                The Capacity Planner feature is currently disabled. Please contact your administrator to enable this feature.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  <strong>Feature Flag:</strong> DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER
                </p>
              </div>
            </Card>
          </div>
        </main>
      </>
    );
  }

  // Fetch segments and drivers
  const fetchData = useCallback(async () => {
    if (!isCapacityPlannerEnabled) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch transportation segments
      const segmentsResponse = await fetch('/api/transportation-segments');
      if (!segmentsResponse.ok) {
        throw new Error('Failed to fetch transportation segments');
      }
      const segmentsData = await segmentsResponse.json();
      setSegments(segmentsData.data || []);

      // Fetch drivers (staff with staff_type = 'driver')
      const driversResponse = await fetch('/api/staff?staff_type=driver');
      if (!driversResponse.ok) {
        throw new Error('Failed to fetch drivers');
      }
      const driversData = await driversResponse.json();
      setDrivers(driversData.data || []);

    } catch (err) {
      console.error('Error fetching capacity planner data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load capacity planner data');
    } finally {
      setIsLoading(false);
    }
  }, [isCapacityPlannerEnabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle segment status updates
  const handleSegmentStatusUpdate = useCallback(async (segmentId: string, status: TransportationSegmentStatus) => {
    try {
      const response = await fetch(`/api/transportation-segments/${segmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update segment status');
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error updating segment status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update segment status');
    }
  }, [fetchData]);

  // Handle segment reassignment
  const handleSegmentReassign = useCallback(async (segmentId: string, newDriverId: string) => {
    try {
      const response = await fetch(`/api/transportation-segments/${segmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driver_id: newDriverId }),
      });

      if (!response.ok) {
        throw new Error('Failed to reassign segment');
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error reassigning segment:', err);
      setError(err instanceof Error ? err.message : 'Failed to reassign segment');
    }
  }, [fetchData]);

  // Handle segment updates
  const handleSegmentUpdate = useCallback(async (segmentId: string, updates: Partial<TransportationSegment>) => {
    try {
      const response = await fetch(`/api/transportation-segments/${segmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update segment');
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error updating segment:', err);
      setError(err instanceof Error ? err.message : 'Failed to update segment');
    }
  }, [fetchData]);

  // Handle segment assignment
  const handleSegmentAssign = useCallback(async (segmentId: string, driverId: string) => {
    try {
      const response = await fetch(`/api/transportation-segments/${segmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driver_id: driverId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign segment');
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error assigning segment:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign segment');
    }
  }, [fetchData]);

  // Handle segment assignment to vendor
  const handleSegmentAssignToVendor = useCallback(async (segmentId: string, vendorType: string) => {
    try {
      const response = await fetch(`/api/transportation-segments/${segmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_id: null,
          transport_mode: vendorType,
          status: 'scheduled'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign segment to vendor');
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error assigning segment to vendor:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign segment to vendor');
    }
  }, [fetchData]);

  // Handle driver calls
  const handleCallDriver = useCallback((driver: Staff) => {
    if (driver.phone) {
      window.open(`tel:${driver.phone}`);
    }
  }, []);

  // Handle segment clicks (for editing)
  const handleSegmentClick = useCallback((segment: TransportationSegment) => {
    console.log('Segment clicked for editing:', segment);
    // TODO: Implement segment editing functionality
  }, []);

  // Handle driver clicks
  const handleDriverClick = useCallback((driver: Staff) => {
    console.log('Driver clicked:', driver);
    // TODO: Implement driver details functionality
  }, []);

  return (
    <>
      <PageHeader
        title="Capacity Planner"
        description="Plan driver assignments and manage transportation capacity"
        actions={
          <div className="flex items-center space-x-4">
            {/* Date Selector */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[--muted-foreground]" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>

            {/* Refresh Button */}
            <Button
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <main className="px-4 py-8">

        {/* Capacity Planner Dashboard */}
        <CapacityPlannerDashboard
          segments={segments}
          drivers={drivers}
          selectedDate={selectedDate}
          onSegmentClick={handleSegmentClick}
          onDriverClick={handleDriverClick}
          onSegmentStatusUpdate={handleSegmentStatusUpdate}
          onSegmentReassign={handleSegmentReassign}
          onSegmentUpdate={handleSegmentUpdate}
          onSegmentAssign={handleSegmentAssign}
          onSegmentAssignToVendor={handleSegmentAssignToVendor}
          onCallDriver={handleCallDriver}
          onRefresh={fetchData}
          isLoading={isLoading}
          error={error}
        />
      </main>
    </>
  );
}
