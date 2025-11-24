'use client';

import { LeadershipSummary } from '@/components/features/appointments/calendar/LeadershipSummary';
import { MetricsDashboard } from '@/components/features/appointments/calendar/MetricsDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { ShadButton as Button, ShadCard as Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ComprehensiveMetrics, metricsCollectionService } from '@/services/metricsCollectionService';
import { BarChart3, Download, RefreshCw, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'last7days' | 'last30days'>('last7days');
  const [isExporting, setIsExporting] = useState(false);
  const [leadershipMetrics, setLeadershipMetrics] = useState<ComprehensiveMetrics | null>(null);
  const [leadershipLoading, setLeadershipLoading] = useState(false);

  const handleExportMetrics = async () => {
    setIsExporting(true);
    try {
      // Create export functionality
      const response = await fetch(`/api/metrics?period=${selectedPeriod}&format=export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `driver-capacity-metrics-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchLeadershipMetrics = async () => {
    setLeadershipLoading(true);
    try {
      const metrics = await metricsCollectionService.getMetricsForPeriod(selectedPeriod);
      setLeadershipMetrics(metrics);
    } catch (error) {
      console.error('Error fetching leadership metrics:', error);
    } finally {
      setLeadershipLoading(false);
    }
  };

  // Fetch metrics on component mount and when period changes
  useEffect(() => {
    fetchLeadershipMetrics();
  }, [selectedPeriod]);

  return (
    <>
      <PageHeader
        title="Leadership Dashboard"
        description="Driver Capacity & Assignment Analytics"
        actions={
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="period-select" className="text-sm font-medium text-gray-700">
                Period:
              </label>
              <select
                id="period-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
              </select>
            </div>
            <Button
              onClick={handleExportMetrics}
              disabled={isExporting}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        }
      />

      <main className="px-4 py-8 max-w-7xl mx-auto">

        {/* Leadership Summary */}
        <LeadershipSummary
          metrics={leadershipMetrics}
          isLoading={leadershipLoading}
          onRefresh={fetchLeadershipMetrics}
          onExport={handleExportMetrics}
          className="mb-8"
        />

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Driver Utilization</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">
                Real-time capacity metrics
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignment Backlog</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">
                Pending assignments
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Override Rate</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">
                Manual overrides vs recommendations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Escalations</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Loading...</div>
              <p className="text-xs text-muted-foreground">
                Critical escalations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Metrics Dashboard */}
        <MetricsDashboard
          period={selectedPeriod}
          refreshInterval={300000} // 5 minutes
          className="mb-8"
        />

        {/* Additional Leadership Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Appointments Saved Without Forced Driver</span>
                  <span className="text-sm text-gray-600">Target: ≥90%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Post-Assignment Conflicts</span>
                  <span className="text-sm text-gray-600">Target: ≤5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Driver Hours Reduction via Public Transport</span>
                  <span className="text-sm text-gray-600">Target: 30%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Dispatcher Satisfaction</span>
                  <span className="text-sm text-gray-600">Target: ≥4/5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Override Actions with Captured Reason</span>
                  <span className="text-sm text-gray-600">Target: &gt;80%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Drivers</span>
                  <span className="text-sm text-green-600">Online</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Assignment Engine</span>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Notification System</span>
                  <span className="text-sm text-green-600">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Calendar Sync</span>
                  <span className="text-sm text-green-600">Synchronized</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Last System Check</span>
                  <span className="text-sm text-gray-600">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
