'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConflictDetectionService } from '@/services/conflictDetectionService';
// import { ComprehensiveMetrics, metricsCollectionService } from '@/services/metricsCollectionService';
import type { Staff } from '@/types/staff';
import type { TransportationSegment } from '@/types/transportationSegment';
import {
    AlertTriangle,
    BarChart3,
    RefreshCw,
    Users,
    XCircle
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { DriverSegmentsBoard } from './DriverSegmentsBoard';
import { InsightsPanel } from './InsightsPanel';
import { UnassignedQueue } from './UnassignedQueue';

interface CapacityPlannerDashboardProps {
  segments?: TransportationSegment[];
  drivers?: Staff[];
  selectedDate?: string;
  onSegmentClick?: (segment: TransportationSegment) => void;
  onDriverClick?: (driver: Staff) => void;
  onSegmentStatusUpdate?: (segmentId: string, status: any) => void;
  onSegmentReassign?: (segmentId: string, newDriverId: string) => void;
  onSegmentUpdate?: (segmentId: string, updates: Partial<TransportationSegment>) => void;
  onSegmentAssign?: (segmentId: string, driverId: string) => void;
  onSegmentAssignToVendor?: (segmentId: string, vendorType: string) => void;
  onCallDriver?: (driver: Staff) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}



export function CapacityPlannerDashboard({
  segments = [],
  drivers = [],
  selectedDate,
  onSegmentClick,
  onDriverClick,
  onSegmentStatusUpdate,
  onSegmentReassign,
  onSegmentUpdate,
  onSegmentAssign,
  onSegmentAssignToVendor,
  onCallDriver,
  onRefresh,
  isLoading = false,
  error = null,
  className = ''
}: CapacityPlannerDashboardProps) {
  const [viewMode, setViewMode] = useState<'12h' | '24h' | '48h' | '72h' | '7d'>('24h');
  const [showInsights, setShowInsights] = useState(true);
  const [selectedServiceLine, setSelectedServiceLine] = useState<string>('all');
  // const [metrics, setMetrics] = useState<ComprehensiveMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Get active drivers count for display
  const activeDrivers = useMemo(() => {
    return drivers.filter(driver => driver.status === 'active').length;
  }, [drivers]);

  // Filter segments by view mode
  const filteredSegments = useMemo(() => {
    if (!selectedDate) return segments;

    const baseDate = new Date(selectedDate);
    let hours: number;

    switch (viewMode) {
      case '12h':
        hours = 12;
        break;
      case '24h':
        hours = 24;
        break;
      case '48h':
        hours = 48;
        break;
      case '72h':
        hours = 72;
        break;
      case '7d':
        hours = 7 * 24; // 7 days
        break;
      default:
        hours = 24;
    }

    const endDate = new Date(baseDate.getTime() + hours * 60 * 60 * 1000);

    return segments.filter(segment => {
      if (!segment.planned_start) return false;
      const segmentDate = new Date(segment.planned_start);
      return segmentDate >= baseDate && segmentDate <= endDate;
    });
  }, [segments, selectedDate, viewMode]);

  // Calculate conflict summary
  const conflictSummary = useMemo(() => {
    const activeDriversList = drivers.filter(driver => driver.status === 'active');
    return ConflictDetectionService.getConflictSummary(activeDriversList, filteredSegments);
  }, [drivers, filteredSegments]);

  // Fetch metrics for the current time window
  // const fetchMetrics = async () => {
  //   setMetricsLoading(true);
  //   setMetricsError(null);
  //   try {
  //     const period = viewMode === '7d' ? 'last7days' : 'today';
  //     const fetchedMetrics = await metricsCollectionService.getMetricsForPeriod(period);
  //     setMetrics(fetchedMetrics);
  //   } catch (err) {
  //     console.error('Error fetching metrics:', err);
  //     setMetricsError(err instanceof Error ? err.message : 'Failed to fetch metrics');
  //   } finally {
  //     setMetricsLoading(false);
  //   }
  // };

  // Fetch metrics when component mounts or view mode changes
  // useEffect(() => {
  //   fetchMetrics();
  // }, [viewMode]);

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Error loading capacity planner: {error}</p>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Capacity Planner</h1>
          <p className="text-gray-600">
            {selectedDate ? `Planning for ${formatDate(selectedDate)}` : 'Driver capacity and assignment overview'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {(['12h', '24h', '48h', '72h', '7d'] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={viewMode === mode ? 'default' : 'ghost'}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1"
              >
                {mode}
              </Button>
            ))}
          </div>

          {/* Insights Toggle */}
          <Button
            size="sm"
            variant={showInsights ? 'default' : 'outline'}
            onClick={() => setShowInsights(!showInsights)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Insights
          </Button>

          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Real-time Metrics Section - Temporarily disabled due to server-side environment variable issue */}

      {/* Conflict Summary Section */}
      {conflictSummary.totalConflicts > 0 && (
        <div className="mb-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-800">
                <AlertTriangle className="w-5 h-5" />
                <span>Schedule Conflicts Detected</span>
                <Badge variant="destructive">{conflictSummary.totalConflicts} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {conflictSummary.criticalConflicts > 0 && (
                  <div className="flex items-center space-x-2 p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <div>
                      <div className="text-sm font-semibold text-red-800">{conflictSummary.criticalConflicts}</div>
                      <div className="text-xs text-red-600">Critical</div>
                    </div>
                  </div>
                )}
                {conflictSummary.highConflicts > 0 && (
                  <div className="flex items-center space-x-2 p-3 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="text-sm font-semibold text-orange-800">{conflictSummary.highConflicts}</div>
                      <div className="text-xs text-orange-600">High</div>
                    </div>
                  </div>
                )}
                {conflictSummary.mediumConflicts > 0 && (
                  <div className="flex items-center space-x-2 p-3 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <div>
                      <div className="text-sm font-semibold text-yellow-800">{conflictSummary.mediumConflicts}</div>
                      <div className="text-xs text-yellow-600">Medium</div>
                    </div>
                  </div>
                )}
                {conflictSummary.lowConflicts > 0 && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-sm font-semibold text-blue-800">{conflictSummary.lowConflicts}</div>
                      <div className="text-xs text-blue-600">Low</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 text-sm text-orange-700">
                <strong>{conflictSummary.driversWithConflicts}</strong> drivers have conflicts •
                Average workload: <strong>{conflictSummary.averageWorkloadScore.toFixed(0)}%</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Three-Pane Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Driver Lanes - Left Pane */}
        <div className="xl:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Driver Lanes</span>
                <Badge variant="outline">{activeDrivers} active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DriverSegmentsBoard
                segments={filteredSegments}
                drivers={drivers}
                selectedDate={selectedDate}
                timeWindow={viewMode}
                onSegmentClick={onSegmentClick}
                onDriverClick={onDriverClick}
                onSegmentStatusUpdate={onSegmentStatusUpdate}
                onSegmentReassign={onSegmentReassign}
                onSegmentUpdate={onSegmentUpdate}
                onSegmentAssign={onSegmentAssign}
                onSegmentAssignToVendor={onSegmentAssignToVendor}
                onCallDriver={onCallDriver}
                onRefresh={onRefresh}
                onTimeWindowChange={setViewMode}
                isLoading={isLoading}
                error={error}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Pane - Unassigned Queue + Insights */}
        <div className="xl:col-span-4 space-y-6">
          {/* Unassigned Queue */}
          <UnassignedQueue
            segments={segments}
            drivers={drivers}
            onSegmentClick={onSegmentClick}
            onSegmentAssign={onSegmentAssign}
            onSegmentAssignToVendor={onSegmentAssignToVendor}
            onRefresh={onRefresh}
            isLoading={isLoading}
            error={error}
          />

          {/* Insights Panel */}
          {showInsights && (
            <InsightsPanel
              segments={segments}
              drivers={drivers}
              timeWindow={viewMode}
              selectedDate={selectedDate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
