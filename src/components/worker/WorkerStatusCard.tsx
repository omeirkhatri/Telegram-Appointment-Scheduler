'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Activity, AlertTriangle, CheckCircle, Play, RefreshCw, RotateCcw, Square, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WorkerStatus {
  isRunning: boolean;
  uptime: number | null;
  config: any;
  schedulerStatus: boolean;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    scheduler: boolean;
    database: boolean;
    jobs: boolean;
  };
  details: any;
}

interface WorkerData {
  status: WorkerStatus;
  health: HealthStatus;
  timestamp: string;
}

export function WorkerStatusCard() {
  const [data, setData] = useState<WorkerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/worker/status');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch worker status');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string) => {
    try {
      setActionLoading(action);

      const response = await fetch('/api/worker/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh status after action
        await fetchStatus();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} worker`);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthIcon = (status: string) => {
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

  const getHealthColor = (status: string) => {
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

  const formatUptime = (uptime: number | null) => {
    if (!uptime) return 'N/A';

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Worker Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading worker status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Worker Status
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3">
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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={data.status.isRunning ? 'default' : 'secondary'}>
                {data.status.isRunning ? 'Running' : 'Stopped'}
              </Badge>
            </div>

            {/* Health Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Health:</span>
              <div className="flex items-center gap-2">
                {getHealthIcon(data.health.status)}
                <Badge className={getHealthColor(data.health.status)}>
                  {data.health.status}
                </Badge>
              </div>
            </div>

            {/* Uptime */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Uptime:</span>
              <span className="text-sm text-gray-600">
                {formatUptime(data.status.uptime)}
              </span>
            </div>

            {/* Scheduler Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Scheduler:</span>
              <Badge variant={data.status.schedulerStatus ? 'default' : 'secondary'}>
                {data.status.schedulerStatus ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Health Checks */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Health Checks:</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-1">
                  {data.health.checks.scheduler ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-xs">Scheduler</span>
                </div>
                <div className="flex items-center gap-1">
                  {data.health.checks.database ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-xs">Database</span>
                </div>
                <div className="flex items-center gap-1">
                  {data.health.checks.jobs ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span className="text-xs">Jobs</span>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => performAction('start')}
                disabled={data.status.isRunning || actionLoading === 'start'}
              >
                <Play className="h-4 w-4" />
                {actionLoading === 'start' ? 'Starting...' : 'Start'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => performAction('stop')}
                disabled={!data.status.isRunning || actionLoading === 'stop'}
              >
                <Square className="h-4 w-4" />
                {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => performAction('restart')}
                disabled={actionLoading === 'restart'}
              >
                <RotateCcw className="h-4 w-4" />
                {actionLoading === 'restart' ? 'Restarting...' : 'Restart'}
              </Button>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-gray-500">
              Last updated: {new Date(data.timestamp).toLocaleString()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
