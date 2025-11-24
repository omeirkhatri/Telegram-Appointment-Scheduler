'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ComprehensiveMetrics, metricsCollectionService } from '@/services/metricsCollectionService';
import type { DashboardStatistics, DateRange } from '@/types/reports';
import {
    AlertCircle,
    AlertTriangle,
    BarChart3,
    Calendar,
    CheckCircle,
    Clock,
    RefreshCw,
    Target,
    TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChartsSection } from './ChartsSection';
import { ExportSection } from './ExportSection';
import {
    AppointmentKPICard,
    EmailKPICard,
    PatientKPICard,
    StaffKPICard,
} from './KPICard';

interface ReportsDashboardProps {
  className?: string;
}

export function ReportsDashboard({ className = '' }: ReportsDashboardProps) {
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [driverMetrics, setDriverMetrics] = useState<ComprehensiveMetrics | null>(null);
  const [driverMetricsLoading, setDriverMetricsLoading] = useState(false);
  const [driverMetricsError, setDriverMetricsError] = useState<string | null>(null);

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      });

      const response = await fetch(`/api/reports/statistics?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch statistics');
      }

      setStatistics(data.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDriverMetrics = async () => {
    setDriverMetricsLoading(true);
    setDriverMetricsError(null);
    try {
      const metrics = await metricsCollectionService.getMetricsForPeriod('last7days');
      setDriverMetrics(metrics);
    } catch (err) {
      console.error('Error fetching driver metrics:', err);
      setDriverMetricsError(err instanceof Error ? err.message : 'Failed to fetch driver metrics');
    } finally {
      setDriverMetricsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
    fetchDriverMetrics();
  }, [dateRange]);

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  const handleRefresh = () => {
    fetchStatistics();
  };

  if (isLoading && !statistics) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-8 ${className}`}>
        <div className="flex items-center justify-center text-red-600">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Error loading dashboard: {error}</span>
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-8 ${className}`}>
        <div className="flex items-center justify-center text-gray-600">
          <span>No data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive analytics and insights for your healthcare scheduling system
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateRangeChange({ ...dateRange, from: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateRangeChange({ ...dateRange, to: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <CheckCircle className="w-4 h-4 mr-1" />
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="space-y-8">
        {/* Appointments KPIs */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Appointments Overview</h2>
          <AppointmentKPICard
            total={statistics.appointments.total}
            today={statistics.appointments.today}
            completionRate={statistics.appointments.completionRate}
            averageDuration={statistics.appointments.averageDuration}
          />
        </div>

        {/* Patients KPIs */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Patients Overview</h2>
          <PatientKPICard
            total={statistics.patients.total}
            newThisMonth={statistics.patients.newThisMonth}
            activePatients={statistics.patients.activePatients}
          />
        </div>

        {/* Staff KPIs */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Overview</h2>
          <StaffKPICard
            total={statistics.staff.total}
            active={statistics.staff.active}
            utilizationRate={statistics.staff.utilizationRate}
            averageWorkload={statistics.staff.averageWorkload}
          />
        </div>

        {/* Email KPIs */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Delivery Overview</h2>
          <EmailKPICard
            totalSent={statistics.emailDelivery.totalSent}
            successRate={statistics.emailDelivery.successRate}
            failureRate={statistics.emailDelivery.failureRate}
            averageDeliveryTime={statistics.emailDelivery.averageDeliveryTime}
          />
        </div>

        {/* Driver Capacity Metrics Section */}
        {driverMetrics && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Driver Capacity & Assignment Metrics</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Real-time Performance Metrics</span>
                  </CardTitle>
                  <Button
                    onClick={fetchDriverMetrics}
                    disabled={driverMetricsLoading}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${driverMetricsLoading ? 'animate-spin' : ''}`} />
                    <span className="ml-2">Refresh</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Assignment Backlog */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Assignment Backlog</span>
                    </div>
                    <div className="text-2xl font-bold text-red-900">{driverMetrics.backlog.totalPending}</div>
                    <div className="text-xs text-red-600">
                      {driverMetrics.backlog.criticalCount} critical, {driverMetrics.backlog.escalatedCount} escalated
                    </div>
                  </div>

                  {/* Assignment Latency */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Avg Assignment Time</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {Math.round(driverMetrics.assignmentLatency.averageLatencyMinutes)}m
                    </div>
                    <div className="text-xs text-blue-600">
                      P95: {Math.round(driverMetrics.assignmentLatency.p95LatencyMinutes)}m
                    </div>
                  </div>

                  {/* Override Rate */}
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">Override Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-900">
                      {driverMetrics.overrideFrequency.overrideRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-orange-600">
                      {driverMetrics.overrideFrequency.totalOverrides} overrides
                    </div>
                  </div>

                  {/* Escalations */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Escalations</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {driverMetrics.escalationVolume.totalEscalations}
                    </div>
                    <div className="text-xs text-purple-600">
                      {driverMetrics.escalationVolume.criticalEscalations} critical
                    </div>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Service Line Distribution:</span>
                      <div className="flex space-x-2">
                        {Object.entries(driverMetrics.backlog.byServiceLine)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 2)
                          .map(([serviceLine, count]) => (
                            <Badge key={serviceLine} variant="outline" className="text-xs">
                              {serviceLine.replace('_', ' ')}: {count}
                            </Badge>
                          ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Transport Mode Mix:</span>
                      <div className="flex space-x-2">
                        {Object.entries(driverMetrics.backlog.byTransportMode)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 2)
                          .map(([mode, count]) => (
                            <Badge key={mode} variant="outline" className="text-xs">
                              {mode.replace('_', ' ')}: {count}
                            </Badge>
                          ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">System Health:</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          driverMetrics.backlog.totalPending < 50
                            ? 'bg-green-100 text-green-800'
                            : driverMetrics.backlog.totalPending < 100
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {driverMetrics.backlog.totalPending < 50
                          ? 'Good'
                          : driverMetrics.backlog.totalPending < 100
                          ? 'Moderate'
                          : 'Needs Attention'
                        }
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <ChartsSection statistics={statistics} />

      {/* Export Section */}
      <ExportSection />
    </div>
  );
}
