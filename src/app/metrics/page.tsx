'use client';

import { MetricsDashboard } from '@/components/features/appointments/calendar/MetricsDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { isDriverAssignmentOverhaulAnalyticsEnabled } from '@/lib/featureFlags';
import {
    Activity,
    BarChart3,
    Download,
    FileText,
    Target,
    TrendingUp
} from 'lucide-react';
import { useState } from 'react';

export default function MetricsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'last7days' | 'last30days'>('last7days');
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  // Check if analytics is enabled
  const isAnalyticsEnabled = isDriverAssignmentOverhaulAnalyticsEnabled();

  // If feature is disabled, show access denied message
  if (!isAnalyticsEnabled) {
    return (
      <>
        <PageHeader
          title="Driver Capacity Analytics"
          description="Comprehensive metrics and performance insights for driver assignment operations"
        />
        <main className="px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="text-center py-12">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Unavailable</h1>
              <p className="text-gray-600 mb-6">
                The Analytics and Metrics feature is currently disabled. Please contact your administrator to enable this feature.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  <strong>Feature Flag:</strong> DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS
                </p>
              </div>
            </Card>
          </div>
        </main>
      </>
    );
  }

  const handleExportMetrics = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/metrics?period=${selectedPeriod}&format=${exportFormat}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = exportFormat === 'csv' ? 'csv' : 'json';
      a.download = `driver-capacity-metrics-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.${extension}`;
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

  const periodLabels = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7days: 'Last 7 Days',
    last30days: 'Last 30 Days'
  };

  return (
    <>
      <PageHeader
        title="Driver Capacity Analytics"
        description="Comprehensive metrics and performance insights for driver assignment operations"
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
                {Object.entries(periodLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label htmlFor="format-select" className="text-sm font-medium text-gray-700">
                Format:
              </label>
              <select
                id="format-select"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
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

        {/* Key Performance Indicators */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Key Performance Indicators</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">≥90%</div>
                  <div className="text-sm text-gray-600">Appointments Saved Without Forced Driver</div>
                  <Badge variant="outline" className="mt-2">Target</Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">≤5%</div>
                  <div className="text-sm text-gray-600">Post-Assignment Conflicts</div>
                  <Badge variant="outline" className="mt-2">Target</Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">30%</div>
                  <div className="text-sm text-gray-600">Driver Hours Reduction via Public Transport</div>
                  <Badge variant="outline" className="mt-2">Target</Badge>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">≥4/5</div>
                  <div className="text-sm text-gray-600">Dispatcher Satisfaction</div>
                  <Badge variant="outline" className="mt-2">Target</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Metrics Dashboard */}
        <MetricsDashboard
          period={selectedPeriod}
          refreshInterval={300000} // 5 minutes
          className="mb-8"
        />

        {/* Additional Analytics Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* System Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>System Health Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Assignment Engine</span>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Operational</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Notification System</span>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Calendar Sync</span>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Synchronized</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Escalation Monitoring</span>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Monitoring</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operational Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Operational Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Assignment Efficiency</h4>
                  <p className="text-sm text-blue-700">
                    Real-time assignment recommendations help dispatchers make informed decisions
                    and reduce manual override rates.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">Capacity Optimization</h4>
                  <p className="text-sm text-orange-700">
                    Multi-mode transportation support enables better resource utilization
                    and cost savings through public transport integration.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Escalation Management</h4>
                  <p className="text-sm text-purple-700">
                    Automated escalation alerts ensure critical assignments receive
                    timely attention and prevent service disruptions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Sources and Methodology */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Data Sources & Methodology</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Data Sources</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Transportation Segments Database</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Escalation Alerts System</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Override Analytics Service</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Driver Assignment History</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Calculation Methods</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Assignment Latency: Time from creation to assignment</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Override Rate: Manual overrides / Total recommendations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Escalation Volume: Segments escalated within time window</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Backlog Counts: Unassigned segments by priority</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
