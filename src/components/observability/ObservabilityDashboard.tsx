'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Activity,
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    Database,
    HardDrive,
    Mail,
    MemoryStick,
    RefreshCw,
    Server,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  duration: number;
  lastChecked: string;
  metadata?: Record<string, any>;
}

interface HealthStatus {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: string;
  uptime: number;
  version: string;
}

interface LogStats {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByComponent: Record<string, number>;
  recentErrors: number;
}

interface ErrorStats {
  totalErrors: number;
  errorsBySeverity: Record<string, number>;
  errorsByComponent: Record<string, number>;
  errorsByType: Record<string, number>;
  recentErrors: number;
  unresolvedErrors: number;
}

interface PerformanceStats {
  totalMetrics: number;
  metricsByName: Record<string, any>;
  recentMetrics: number;
  slowestOperations: Array<{
    name: string;
    average: number;
    count: number;
  }>;
}

interface ObservabilityData {
  status: string;
  timestamp: string;
  logging: {
    status: string;
    data: LogStats | null;
    error: string | null;
  };
  errors: {
    status: string;
    data: ErrorStats | null;
    error: string | null;
  };
  performance: {
    status: string;
    data: PerformanceStats | null;
    error: string | null;
  };
  health: {
    status: string;
    data: HealthStatus | null;
    error: string | null;
  };
}

export function ObservabilityDashboard() {
  const [data, setData] = useState<ObservabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/observability/status');
      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch observability data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch observability data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      case 'storage':
        return <HardDrive className="h-4 w-4" />;
      case 'worker':
        return <Server className="h-4 w-4" />;
      case 'memory':
        return <MemoryStick className="h-4 w-4" />;
      case 'disk':
        return <HardDrive className="h-4 w-4" />;
      case 'api':
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Observability Dashboard</h2>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 animate-spin" />
          </Button>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading observability data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Observability Dashboard</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Overall Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(data.status)}
                Overall System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Badge className={getStatusColor(data.status)}>
                    {data.status.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">System Status</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {data.health.data ? formatUptime(data.health.data.uptime) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">Uptime</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {data.health.data?.version || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">Version</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-gray-600">Last Updated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Checks */}
          {data.health.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Health Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.health.data.checks.map((check) => (
                    <div key={check.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {getServiceIcon(check.name)}
                        <span className="font-medium capitalize">{check.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(check.status)}
                        <Badge className={getStatusColor(check.status)}>
                          {check.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logging Stats */}
          {data.logging.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Logging Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{data.logging.data.totalLogs}</p>
                    <p className="text-sm text-gray-600">Total Logs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{data.logging.data.recentErrors}</p>
                    <p className="text-sm text-gray-600">Recent Errors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{Object.keys(data.logging.data.logsByLevel).length}</p>
                    <p className="text-sm text-gray-600">Log Levels</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{Object.keys(data.logging.data.logsByComponent).length}</p>
                    <p className="text-sm text-gray-600">Components</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Statistics */}
          {data.errors.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Error Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{data.errors.data.totalErrors}</p>
                    <p className="text-sm text-gray-600">Total Errors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{data.errors.data.unresolvedErrors}</p>
                    <p className="text-sm text-gray-600">Unresolved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{data.errors.data.recentErrors}</p>
                    <p className="text-sm text-gray-600">Recent (24h)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{Object.keys(data.errors.data.errorsBySeverity).length}</p>
                    <p className="text-sm text-gray-600">Severity Levels</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Statistics */}
          {data.performance.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Performance Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{data.performance.data.totalMetrics}</p>
                    <p className="text-sm text-gray-600">Total Metrics</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{data.performance.data.recentMetrics}</p>
                    <p className="text-sm text-gray-600">Recent Metrics</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{data.performance.data.slowestOperations.length}</p>
                    <p className="text-sm text-gray-600">Slow Operations</p>
                  </div>
                </div>

                {data.performance.data.slowestOperations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Slowest Operations</h4>
                    <div className="space-y-2">
                      {data.performance.data.slowestOperations.slice(0, 5).map((op, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{op.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{op.count} calls</span>
                            <span className="text-sm font-medium">{op.average}ms avg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
