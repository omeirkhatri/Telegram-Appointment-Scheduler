'use client';

import { Calendar, Download, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TransportationSegmentCharts } from './TransportationSegmentCharts';
import { TransportationSegmentKPICards } from './TransportationSegmentKPICard';

interface TransportationSegmentDashboardProps {
  className?: string;
}

interface DashboardData {
  utilization: any;
  overrides: any;
  driverPerformance: any;
  conflictAnalysis: any;
}

export function TransportationSegmentDashboard({ className = '' }: TransportationSegmentDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        date_from: dateRange.from,
        date_to: dateRange.to,
        type: 'comprehensive',
      });

      const response = await fetch(`/api/transportation-segments/reports?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch transportation segment data');
      }

      setData(result.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleRefresh = () => {
    fetchData();
  };

  const handleDateRangeChange = (newDateRange: { from: string; to: string }) => {
    setDateRange(newDateRange);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        date_from: dateRange.from,
        date_to: dateRange.to,
        format,
      });

      const response = await fetch(`/api/transportation-segments/export?${params}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transportation-segments-${dateRange.from}-to-${dateRange.to}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (isLoading && !data) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span className="text-gray-600">Loading transportation segment dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-8 ${className}`}>
        <div className="flex items-center justify-center text-center">
          <div>
            <div className="text-red-500 mb-2">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-8 ${className}`}>
        <div className="flex items-center justify-center text-center">
          <div>
            <div className="text-gray-400 mb-2">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">No transportation segment data found for the selected date range.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Transportation Segment Dashboard</h2>
            <p className="text-gray-600">Comprehensive analytics for transportation segment utilization and performance</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateRangeChange({ ...dateRange, from: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateRangeChange({ ...dateRange, to: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport('csv')}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </button>
            </div>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        )}
      </div>

      {/* KPI Cards */}
      <TransportationSegmentKPICards
        totalSegments={data.utilization?.summary?.totalSegments || 0}
        segmentsWithDrivers={data.utilization?.summary?.segmentsWithDrivers || 0}
        utilizationRate={data.utilization?.summary?.utilizationRate || 0}
        avgTravelTime={data.utilization?.summary?.avgTravelTime || 0}
        avgDistance={data.utilization?.summary?.avgDistance || 0}
        manualOverrides={data.utilization?.summary?.manualOverrides || 0}
        overrideRate={data.utilization?.summary?.overrideRate || 0}
      />

      {/* Charts */}
      <TransportationSegmentCharts data={data} />

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Driver Performance Summary */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Performance Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Drivers</span>
              <span className="text-lg font-bold text-gray-900">{data.driverPerformance?.summary?.totalDrivers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Drivers</span>
              <span className="text-lg font-bold text-gray-900">{data.driverPerformance?.summary?.activeDrivers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Completion Rate</span>
              <span className="text-lg font-bold text-green-600">{data.driverPerformance?.summary?.avgCompletionRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Override Rate</span>
              <span className="text-lg font-bold text-orange-600">{data.driverPerformance?.summary?.avgOverrideRate || 0}%</span>
            </div>
          </div>
        </div>

        {/* Conflict Analysis Summary */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conflict Analysis Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Conflicts</span>
              <span className="text-lg font-bold text-gray-900">{data.conflictAnalysis?.summary?.totalConflicts || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Manual Overrides</span>
              <span className="text-lg font-bold text-orange-600">{data.conflictAnalysis?.summary?.manualOverrides || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Override Rate</span>
              <span className="text-lg font-bold text-red-600">{data.conflictAnalysis?.summary?.overrideRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Follow-up Required</span>
              <span className="text-lg font-bold text-yellow-600">{data.overrides?.summary?.requiresFollowUp || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
