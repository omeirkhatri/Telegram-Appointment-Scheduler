'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ComprehensiveMetrics } from '@/services/metricsCollectionService';
import {
    AlertTriangle,
    BarChart3,
    CheckCircle,
    Clock,
    Download,
    RefreshCw,
    Target,
    TrendingUp,
    Users
} from 'lucide-react';
import { useState } from 'react';

interface LeadershipSummaryProps {
  metrics?: ComprehensiveMetrics | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  className?: string;
}

interface KPITarget {
  name: string;
  current: number | string;
  target: string;
  status: 'good' | 'warning' | 'critical';
  description: string;
  icon: React.ReactNode;
}

export function LeadershipSummary({
  metrics,
  isLoading = false,
  onRefresh,
  onExport,
  className = ''
}: LeadershipSummaryProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!onExport) return;
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate KPI status based on metrics
  const getKPIStatus = (value: number, thresholds: { good: number; warning: number }): 'good' | 'warning' | 'critical' => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.warning) return 'warning';
    return 'critical';
  };

  // Generate KPIs based on available metrics
  const generateKPIs = (): KPITarget[] => {
    if (!metrics) return [];

    const kpis: KPITarget[] = [
      {
        name: 'Assignment Backlog',
        current: metrics.backlog.totalPending,
        target: '≤50',
        status: getKPIStatus(metrics.backlog.totalPending, { good: 25, warning: 50 }),
        description: 'Total pending driver assignments',
        icon: <Users className="w-5 h-5" />
      },
      {
        name: 'Critical Escalations',
        current: metrics.backlog.criticalCount + metrics.escalationVolume.criticalEscalations,
        target: '≤5',
        status: getKPIStatus(metrics.backlog.criticalCount + metrics.escalationVolume.criticalEscalations, { good: 2, warning: 5 }),
        description: 'Critical escalations requiring immediate attention',
        icon: <AlertTriangle className="w-5 h-5" />
      },
      {
        name: 'Assignment Latency',
        current: `${Math.round(metrics.assignmentLatency.averageLatencyMinutes)}m`,
        target: '≤30m',
        status: getKPIStatus(metrics.assignmentLatency.averageLatencyMinutes, { good: 15, warning: 30 }),
        description: 'Average time from creation to assignment',
        icon: <Clock className="w-5 h-5" />
      },
      {
        name: 'Override Rate',
        current: `${metrics.overrideFrequency.overrideRate.toFixed(1)}%`,
        target: '≤20%',
        status: getKPIStatus(metrics.overrideFrequency.overrideRate, { good: 10, warning: 20 }),
        description: 'Manual overrides vs system recommendations',
        icon: <TrendingUp className="w-5 h-5" />
      }
    ];

    return kpis;
  };

  const kpis = generateKPIs();

  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':
        return 'On Target';
      case 'warning':
        return 'Needs Attention';
      case 'critical':
        return 'Critical';
    }
  };

  // Calculate overall system health
  const overallHealth = kpis.length > 0
    ? kpis.every(kpi => kpi.status === 'good')
      ? 'excellent'
      : kpis.some(kpi => kpi.status === 'critical')
        ? 'critical'
        : 'moderate'
    : 'unknown';

  const getOverallHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOverallHealthText = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'Excellent Performance';
      case 'moderate':
        return 'Moderate Performance';
      case 'critical':
        return 'Critical Issues Detected';
      default:
        return 'Status Unknown';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-6 h-6" />
                <span>Leadership Dashboard Summary</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Key performance indicators and system health overview
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="ml-2">Refresh</span>
                </Button>
              )}
              {onExport && (
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="ml-2">{isExporting ? 'Exporting...' : 'Export'}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overall System Health */}
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-gray-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">Overall System Health</h3>
                  <p className="text-sm text-gray-600">Based on key performance indicators</p>
                </div>
              </div>
              <Badge className={`px-3 py-1 ${getOverallHealthColor(overallHealth)}`}>
                {getOverallHealthText(overallHealth)}
              </Badge>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-gray-600">{kpi.icon}</div>
                    <h4 className="font-medium text-gray-900">{kpi.name}</h4>
                  </div>
                  <Badge className={`px-2 py-1 text-xs ${getStatusColor(kpi.status)}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(kpi.status)}
                      <span>{getStatusText(kpi.status)}</span>
                    </div>
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-gray-900">{kpi.current}</span>
                    <span className="text-sm text-gray-500">/ {kpi.target}</span>
                  </div>
                  <p className="text-xs text-gray-600">{kpi.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Targets */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Performance Targets</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-800">Appointments w/o Forced Driver</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">Target: ≥90%</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-green-800">Post-Assignment Conflicts</span>
                <Badge variant="outline" className="bg-green-100 text-green-800">Target: ≤5%</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-purple-800">Driver Hours Reduction</span>
                <Badge variant="outline" className="bg-purple-100 text-purple-800">Target: 30%</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-orange-800">Dispatcher Satisfaction</span>
                <Badge variant="outline" className="bg-orange-100 text-orange-800">Target: ≥4/5</Badge>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {metrics && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Key Insights & Recommendations</h4>
              <div className="space-y-3">
                {metrics.backlog.totalPending > 50 && (
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">High Assignment Backlog</p>
                      <p className="text-xs text-yellow-700">
                        Consider increasing driver capacity or optimizing assignment algorithms to reduce pending assignments.
                      </p>
                    </div>
                  </div>
                )}
                {metrics.overrideFrequency.overrideRate > 30 && (
                  <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800">High Override Rate</p>
                      <p className="text-xs text-orange-700">
                        Assignment recommendations may need refinement. Review common override reasons and adjust algorithms.
                      </p>
                    </div>
                  </div>
                )}
                {metrics.escalationVolume.criticalEscalations > 5 && (
                  <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Multiple Critical Escalations</p>
                      <p className="text-xs text-red-700">
                        Review escalation thresholds and response procedures to prevent service disruptions.
                      </p>
                    </div>
                  </div>
                )}
                {kpis.every(kpi => kpi.status === 'good') && (
                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Excellent Performance</p>
                      <p className="text-xs text-green-700">
                        All key performance indicators are within target ranges. System is operating optimally.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LeadershipSummary;
