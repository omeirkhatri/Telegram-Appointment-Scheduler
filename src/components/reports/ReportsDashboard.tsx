'use client';

import type { DashboardStatistics, DateRange } from '@/types/reports';
import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { 
  AppointmentKPICard, 
  PatientKPICard, 
  StaffKPICard, 
  EmailKPICard 
} from './KPICard';
import { ChartsSection } from './ChartsSection';
import { ExportSection } from './ExportSection';

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
    to: new Date().toISOString().split('T')[0]
  });

  const fetchStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        dateFrom: dateRange.from,
        dateTo: dateRange.to
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

  useEffect(() => {
    fetchStatistics();
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
      </div>

      {/* Charts Section */}
      <ChartsSection statistics={statistics} />

      {/* Export Section */}
      <ExportSection />
    </div>
  );
}
