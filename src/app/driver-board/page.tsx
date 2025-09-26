'use client';

import { DriverSegmentsBoard } from '@/components/features/appointments/calendar/DriverSegmentsBoard';
import Header from '@/components/layout/Header';
import type { Staff } from '@/types/staff';
import type { TransportationSegment, TransportationSegmentStatus } from '@/types/transportationSegment';
import { Calendar, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function DriverBoardPage() {
  const [segments, setSegments] = useState<TransportationSegment[]>([]);
  const [drivers, setDrivers] = useState<Staff[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch segments and drivers
  const fetchData = useCallback(async () => {
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
      console.error('Error fetching driver board data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load driver board data');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Handle driver calls
  const handleCallDriver = useCallback((driver: Staff) => {
    if (driver.phone) {
      window.open(`tel:${driver.phone}`);
    }
  }, []);

  // Handle segment clicks (for editing)
  const handleSegmentClick = useCallback((segment: TransportationSegment) => {
    // This is now handled by the edit modal in DriverSegmentsBoard
    console.log('Segment clicked for editing:', segment);
  }, []);

  // Handle driver clicks
  const handleDriverClick = useCallback((driver: Staff) => {
    console.log('Driver clicked:', driver);
    // TODO: Implement driver details functionality
  }, []);

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground]">
      <Header currentPage="driver-board" />

      <main className="px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[--foreground]">Driver Board</h1>
            <p className="text-[--muted-foreground] text-lg mt-1">
              Monitor driver segments and schedules
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Date Selector */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[--muted-foreground]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-[--border] rounded-lg bg-[--card] text-[--foreground] focus:ring-2 focus:ring-[--primary] focus:border-transparent"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Driver Segments Board */}
        <DriverSegmentsBoard
          segments={segments}
          drivers={drivers}
          selectedDate={selectedDate}
          onSegmentClick={handleSegmentClick}
          onDriverClick={handleDriverClick}
          onSegmentStatusUpdate={handleSegmentStatusUpdate}
          onSegmentReassign={handleSegmentReassign}
          onSegmentUpdate={handleSegmentUpdate}
          onCallDriver={handleCallDriver}
          onRefresh={fetchData}
          isLoading={isLoading}
          error={error}
        />
      </main>
    </div>
  );
}
