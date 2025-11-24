'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { isDriverAssignmentOverhaulCapacityPlannerEnabled } from '@/lib/featureFlags';
import { overrideAnalyticsService } from '@/services/overrideAnalyticsService';
import type { Staff } from '@/types/staff';
import type { TransportationSegment } from '@/types/transportationSegment';
import {
    AlertTriangle,
    BarChart3,
    Clock,
    DollarSign,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface InsightsPanelProps {
  segments: TransportationSegment[];
  drivers: Staff[];
  timeWindow: '12h' | '24h' | '48h' | '72h' | '7d';
  selectedDate?: string;
  className?: string;
}

interface InsightsMetrics {
  // Utilization metrics
  totalDriverHours: number;
  bookedHours: number;
  freeHours: number;
  utilizationPercentage: number;

  // Backlog metrics
  totalBacklog: number;
  criticalBacklog: number;
  highPriorityBacklog: number;
  escalatedBacklog: number;

  // Override metrics
  totalOverrides: number;
  overrideRate: number;
  commonOverrideReasons: Array<{ reason: string; count: number; percentage: number }>;

  // Cost metrics (placeholder)
  estimatedCostSavings: number;
  publicTransportUsage: number;
  averageCostPerTrip: number;

  // Efficiency metrics
  averageAssignmentTime: number;
  segmentsAssignedToday: number;
  segmentsPendingAssignment: number;
}

export function InsightsPanel({
  segments,
  drivers,
  timeWindow,
  selectedDate,
  className = ''
}: InsightsPanelProps) {
  // Check if capacity planner is enabled
  const isCapacityPlannerEnabled = isDriverAssignmentOverhaulCapacityPlannerEnabled();
  const [overrideAnalytics, setOverrideAnalytics] = useState<{
    totalOverrides: number;
    overridesByReason: Record<string, number>;
    overridesByOperation: Record<string, number>;
    requiresFollowUpCount: number;
    averageOverridesPerDay: number;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Fetch override analytics when component mounts or time window changes
  useEffect(() => {
    const fetchOverrideAnalytics = async () => {
      if (!selectedDate) return;

      setAnalyticsLoading(true);
      try {
        const dateFrom = new Date(selectedDate);
        const dateTo = new Date(selectedDate);

        // Adjust date range based on time window
        switch (timeWindow) {
          case '12h':
            dateTo.setHours(dateTo.getHours() + 12);
            break;
          case '24h':
            dateTo.setDate(dateTo.getDate() + 1);
            break;
          case '48h':
            dateTo.setDate(dateTo.getDate() + 2);
            break;
          case '72h':
            dateTo.setDate(dateTo.getDate() + 3);
            break;
          case '7d':
            dateTo.setDate(dateTo.getDate() + 7);
            break;
        }

        const analytics = await overrideAnalyticsService.getOverrideAnalyticsSummary(
          dateFrom.toISOString().split('T')[0],
          dateTo.toISOString().split('T')[0]
        );

        setOverrideAnalytics(analytics);
      } catch (error) {
        console.error('Failed to fetch override analytics:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchOverrideAnalytics();
  }, [selectedDate, timeWindow]);

  // Calculate comprehensive insights metrics
  const insightsMetrics = useMemo((): InsightsMetrics => {
    const activeDrivers = drivers.filter(driver => driver.status === 'active');
    const assignedSegments = segments.filter(segment => segment.driver_id);
    const unassignedSegments = segments.filter(segment => !segment.driver_id && segment.status === 'draft');
    const escalatedSegments = segments.filter(segment => segment.escalation_state === 'escalated');

    // Calculate time window in hours
    const timeWindowHours = {
      '12h': 12,
      '24h': 24,
      '48h': 48,
      '72h': 72,
      '7d': 168
    }[timeWindow];

    // Utilization calculations
    const totalDriverHours = activeDrivers.length * timeWindowHours;
    const bookedHours = assignedSegments.reduce((total, segment) => {
      if (segment.planned_start && segment.planned_end) {
        const start = new Date(segment.planned_start);
        const end = new Date(segment.planned_end);
        return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
      return total;
    }, 0);
    const freeHours = Math.max(0, totalDriverHours - bookedHours);
    const utilizationPercentage = totalDriverHours > 0 ? (bookedHours / totalDriverHours) * 100 : 0;

    // Backlog calculations
    const totalBacklog = unassignedSegments.length;
    const criticalBacklog = unassignedSegments.filter(segment =>
      segment.priority === 'critical' || segment.escalation_state === 'escalated'
    ).length;
    const highPriorityBacklog = unassignedSegments.filter(segment =>
      segment.priority === 'high'
    ).length;
    const escalatedBacklog = escalatedSegments.length;

    // Override calculations - use real analytics data if available, fallback to segment data
    const totalOverrides = overrideAnalytics?.totalOverrides ?? segments.filter(segment =>
      segment.recommendation_metadata?.override?.reason
    ).length;
    const overrideRate = segments.length > 0 ? (totalOverrides / segments.length) * 100 : 0;

    // Common override reasons - use real analytics data if available
    const commonOverrideReasons = overrideAnalytics?.overridesByReason
      ? Object.entries(overrideAnalytics.overridesByReason)
          .map(([reason, count]) => ({
            reason: reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            count,
            percentage: totalOverrides > 0 ? Math.round((count / totalOverrides) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4)
      : [
          { reason: 'Schedule Conflict', count: Math.floor(totalOverrides * 0.4), percentage: 40 },
          { reason: 'Patient Preference', count: Math.floor(totalOverrides * 0.25), percentage: 25 },
          { reason: 'Public Transport Chosen', count: Math.floor(totalOverrides * 0.2), percentage: 20 },
          { reason: 'Vehicle Mismatch', count: Math.floor(totalOverrides * 0.15), percentage: 15 }
        ].filter(item => item.count > 0);

    // Cost metrics (placeholder calculations)
    const publicTransportSegments = segments.filter(segment =>
      segment.transport_mode === 'public_transport'
    );
    const publicTransportUsage = publicTransportSegments.length;
    const estimatedCostSavings = publicTransportSegments.length * 45; // AED 45 per public transport trip
    const averageCostPerTrip = segments.length > 0 ? estimatedCostSavings / segments.length : 0;

    // Efficiency metrics (placeholder)
    const segmentsAssignedToday = assignedSegments.filter(segment => {
      if (!segment.updated_at) return false;
      const today = new Date();
      const segmentDate = new Date(segment.updated_at);
      return segmentDate.toDateString() === today.toDateString();
    }).length;
    const segmentsPendingAssignment = unassignedSegments.length;
    const averageAssignmentTime = 2.5; // Placeholder: 2.5 hours average

    return {
      totalDriverHours: Math.round(totalDriverHours),
      bookedHours: Math.round(bookedHours),
      freeHours: Math.round(freeHours),
      utilizationPercentage: Math.round(utilizationPercentage),
      totalBacklog,
      criticalBacklog,
      highPriorityBacklog,
      escalatedBacklog,
      totalOverrides,
      overrideRate: Math.round(overrideRate),
      commonOverrideReasons,
      estimatedCostSavings: Math.round(estimatedCostSavings),
      publicTransportUsage,
      averageCostPerTrip: Math.round(averageCostPerTrip),
      averageAssignmentTime,
      segmentsAssignedToday,
      segmentsPendingAssignment
    };
  }, [segments, drivers, timeWindow, overrideAnalytics]);

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getBacklogColor = (count: number) => {
    if (count >= 10) return 'text-red-600 bg-red-50';
    if (count >= 5) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  // If capacity planner is not enabled, return a disabled state
  if (!isCapacityPlannerEnabled) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Capacity Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">Feature Disabled</p>
            <p className="text-sm mt-1">Insights panel is part of the Capacity Planner feature</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5" />
          <span>Capacity Insights</span>
          <Badge variant="outline">{timeWindow} view</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Utilization Overview */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Driver Utilization
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className={`text-center p-3 rounded-lg ${getUtilizationColor(insightsMetrics.utilizationPercentage)}`}>
              <div className="text-2xl font-bold">
                {insightsMetrics.utilizationPercentage}%
              </div>
              <div className="text-xs">Utilization</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {insightsMetrics.freeHours}h
              </div>
              <div className="text-xs text-blue-600">Free Hours</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {insightsMetrics.bookedHours}h booked of {insightsMetrics.totalDriverHours}h total
          </div>
        </div>

        {/* Backlog Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Assignment Backlog
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className={`text-center p-3 rounded-lg ${getBacklogColor(insightsMetrics.totalBacklog)}`}>
              <div className="text-2xl font-bold">
                {insightsMetrics.totalBacklog}
              </div>
              <div className="text-xs">Total Pending</div>
            </div>
            <div className={`text-center p-3 rounded-lg ${getBacklogColor(insightsMetrics.criticalBacklog)}`}>
              <div className="text-2xl font-bold">
                {insightsMetrics.criticalBacklog}
              </div>
              <div className="text-xs">Critical</div>
            </div>
          </div>
          {insightsMetrics.escalatedBacklog > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              {insightsMetrics.escalatedBacklog} segments escalated
            </div>
          )}
        </div>

        {/* Override Analytics */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Override Analytics
            {analyticsLoading && (
              <div className="ml-2 w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            )}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Override Rate</span>
              <Badge variant={insightsMetrics.overrideRate > 20 ? 'destructive' : 'secondary'}>
                {insightsMetrics.overrideRate}%
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-600">Top Reasons:</div>
              {insightsMetrics.commonOverrideReasons.length > 0 ? (
                insightsMetrics.commonOverrideReasons.slice(0, 3).map((reason, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="truncate">{reason.reason}</span>
                    <span className="text-gray-500">{reason.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">No overrides recorded</div>
              )}
            </div>
            {overrideAnalytics?.requiresFollowUpCount > 0 && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {overrideAnalytics.requiresFollowUpCount} overrides require follow-up
              </div>
            )}
          </div>
        </div>

        {/* Cost & Efficiency */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <DollarSign className="w-4 h-4 mr-2" />
            Cost & Efficiency
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                AED {insightsMetrics.estimatedCostSavings}
              </div>
              <div className="text-xs text-green-600">Cost Savings</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {insightsMetrics.publicTransportUsage}
              </div>
              <div className="text-xs text-blue-600">Public Transport</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Avg assignment time: {insightsMetrics.averageAssignmentTime}h
          </div>
        </div>

        {/* Quick Actions Summary */}
        <div className="pt-3 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Today's Activity</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
              {insightsMetrics.segmentsAssignedToday} assigned
            </div>
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1 text-yellow-600" />
              {insightsMetrics.segmentsPendingAssignment} pending
            </div>
          </div>
        </div>

        {/* Placeholder for future KPIs */}
        <div className="pt-3 border-t border-dashed">
          <div className="text-xs text-gray-500 text-center">
            Additional KPIs coming soon: travel optimization, driver satisfaction,
            patient wait times, and route efficiency metrics.
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
