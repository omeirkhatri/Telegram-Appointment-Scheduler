import { ComprehensiveMetrics, metricsCollectionService } from '@/services/metricsCollectionService';
import React, { useEffect, useState } from 'react';

interface MetricsDashboardProps {
  period?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';
  startDate?: string;
  endDate?: string;
  refreshInterval?: number; // in milliseconds
  className?: string;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  period = 'last7days',
  startDate,
  endDate,
  refreshInterval = 300000, // 5 minutes default
  className = ''
}) => {
  const [metrics, setMetrics] = useState<ComprehensiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      let fetchedMetrics: ComprehensiveMetrics;

      if (period === 'custom' && startDate && endDate) {
        fetchedMetrics = await metricsCollectionService.collectComprehensiveMetrics(startDate, endDate);
      } else {
        fetchedMetrics = await metricsCollectionService.getMetricsForPeriod(period, startDate, endDate);
      }

      setMetrics(fetchedMetrics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Set up auto-refresh if interval is specified
    let intervalId: NodeJS.Timeout | null = null;
    if (refreshInterval > 0) {
      intervalId = setInterval(fetchMetrics, refreshInterval);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [period, startDate, endDate, refreshInterval]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading && !metrics) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Error Loading Metrics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className={`p-6 bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Performance Metrics</h2>
          <p className="text-sm text-gray-600">
            Period: {period === 'custom' ? `${startDate} to ${endDate}` : period}
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Backlog Metrics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Backlog</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Pending:</span>
              <span className="font-semibold text-gray-900">{formatNumber(metrics.backlog.totalPending)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Critical:</span>
              <span className="font-semibold text-red-600">{formatNumber(metrics.backlog.criticalCount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">High Priority:</span>
              <span className="font-semibold text-orange-600">{formatNumber(metrics.backlog.highPriorityCount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Escalated:</span>
              <span className="font-semibold text-red-600">{formatNumber(metrics.backlog.escalatedCount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Overdue:</span>
              <span className="font-semibold text-red-600">{formatNumber(metrics.backlog.overdueCount)}</span>
            </div>
          </div>
        </div>

        {/* Assignment Latency Metrics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Assignment Latency</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average:</span>
              <span className="font-semibold text-gray-900">{formatDuration(metrics.assignmentLatency.averageLatencyMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Median:</span>
              <span className="font-semibold text-gray-900">{formatDuration(metrics.assignmentLatency.medianLatencyMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">P95:</span>
              <span className="font-semibold text-gray-900">{formatDuration(metrics.assignmentLatency.p95LatencyMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">P99:</span>
              <span className="font-semibold text-gray-900">{formatDuration(metrics.assignmentLatency.p99LatencyMinutes)}</span>
            </div>
          </div>
        </div>

        {/* Override Frequency Metrics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Override Frequency</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Overrides:</span>
              <span className="font-semibold text-gray-900">{formatNumber(metrics.overrideFrequency.totalOverrides)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Recommendations:</span>
              <span className="font-semibold text-gray-900">{formatNumber(metrics.overrideFrequency.totalRecommendations)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Override Rate:</span>
              <span className="font-semibold text-orange-600">{formatPercentage(metrics.overrideFrequency.overrideRate)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              <div>Top Reasons:</div>
              {Object.entries(metrics.overrideFrequency.byReason)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 2)
                .map(([reason, count]) => (
                  <div key={reason} className="flex justify-between">
                    <span>{reason.replace('_', ' ')}:</span>
                    <span>{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Escalation Volume Metrics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Escalation Volume</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Escalations:</span>
              <span className="font-semibold text-gray-900">{formatNumber(metrics.escalationVolume.totalEscalations)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Critical:</span>
              <span className="font-semibold text-red-600">{formatNumber(metrics.escalationVolume.criticalEscalations)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">High:</span>
              <span className="font-semibold text-orange-600">{formatNumber(metrics.escalationVolume.highEscalations)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Response:</span>
              <span className="font-semibold text-gray-900">{formatDuration(metrics.escalationVolume.averageResponseTimeMinutes)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service Line Breakdown */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Service Line Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Backlog by Service Line</h4>
            <div className="space-y-1">
              {Object.entries(metrics.backlog.byServiceLine)
                .sort(([,a], [,b]) => b - a)
                .map(([serviceLine, count]) => (
                  <div key={serviceLine} className="flex justify-between text-sm">
                    <span className="text-gray-600">{serviceLine.replace('_', ' ')}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Transport Mode Distribution</h4>
            <div className="space-y-1">
              {Object.entries(metrics.backlog.byTransportMode)
                .sort(([,a], [,b]) => b - a)
                .map(([mode, count]) => (
                  <div key={mode} className="flex justify-between text-sm">
                    <span className="text-gray-600">{mode.replace('_', ' ')}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
