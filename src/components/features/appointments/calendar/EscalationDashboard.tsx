import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EscalationAlert, type EscalationAlertData } from '@/components/ui/EscalationAlert';
import { AlertTriangle, Filter, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EscalationDashboardProps {
  className?: string;
}

interface EscalationStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  overdue: number;
  acknowledged: number;
  resolved: number;
}

export function EscalationDashboard({ className = '' }: EscalationDashboardProps) {
  const [alerts, setAlerts] = useState<EscalationAlertData[]>([]);
  const [stats, setStats] = useState<EscalationStats>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    overdue: 0,
    acknowledged: 0,
    resolved: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low' | 'overdue'>('all');

  // Fetch escalation alerts
  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/escalation-alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch escalation alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);

      // Calculate stats
      const newStats: EscalationStats = {
        total: data.alerts?.length || 0,
        critical: data.alerts?.filter((a: EscalationAlertData) => a.severity === 'critical').length || 0,
        high: data.alerts?.filter((a: EscalationAlertData) => a.severity === 'high').length || 0,
        medium: data.alerts?.filter((a: EscalationAlertData) => a.severity === 'medium').length || 0,
        low: data.alerts?.filter((a: EscalationAlertData) => a.severity === 'low').length || 0,
        overdue: data.alerts?.filter((a: EscalationAlertData) =>
          a.segment && new Date(a.segment.plannedStart) < new Date()
        ).length || 0,
        acknowledged: data.alerts?.filter((a: EscalationAlertData) => a.acknowledgedAt).length || 0,
        resolved: data.alerts?.filter((a: EscalationAlertData) => a.resolvedAt).length || 0
      };
      setStats(newStats);
    } catch (err) {
      console.error('Error fetching escalation alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle alert actions
  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch(`/api/escalation-alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      await fetchAlerts(); // Refresh data
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      const response = await fetch(`/api/escalation-alerts/${alertId}/resolve`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }

      await fetchAlerts(); // Refresh data
    } catch (err) {
      console.error('Error resolving alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  const handleEscalateToDutyManager = async (alertId: string) => {
    try {
      const response = await fetch(`/api/escalation-alerts/${alertId}/escalate`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to escalate to duty manager');
      }

      await fetchAlerts(); // Refresh data
    } catch (err) {
      console.error('Error escalating to duty manager:', err);
      setError(err instanceof Error ? err.message : 'Failed to escalate alert');
    }
  };

  const handleViewSegment = (segmentId: string) => {
    // Navigate to capacity planner with segment highlighted
    window.open(`/capacity-planner?highlight=${segmentId}`, '_blank');
  };

  // Filter alerts based on selected filter
  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'critical': return alert.severity === 'critical';
      case 'high': return alert.severity === 'high';
      case 'medium': return alert.severity === 'medium';
      case 'low': return alert.severity === 'low';
      case 'overdue': return alert.segment && new Date(alert.segment.plannedStart) < new Date();
      default: return true;
    }
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Escalation Management</h2>
          <p className="text-gray-600">Monitor and resolve scheduling conflicts and deadlines</p>
        </div>
        <Button onClick={fetchAlerts} disabled={isLoading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Alerts</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-red-600">Critical</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <div className="text-sm text-orange-600">High</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
            <div className="text-sm text-yellow-600">Medium</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.low}</div>
            <div className="text-sm text-blue-600">Low</div>
          </CardContent>
        </Card>

        <Card className="border-red-300 bg-red-100">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
            <div className="text-sm text-red-700">Overdue</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.acknowledged}</div>
            <div className="text-sm text-green-600">Acknowledged</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.resolved}</div>
            <div className="text-sm text-gray-600">Resolved</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        {(['all', 'critical', 'high', 'medium', 'low', 'overdue'] as const).map((filterType) => (
          <Button
            key={filterType}
            size="sm"
            variant={filter === filterType ? 'default' : 'outline'}
            onClick={() => setFilter(filterType)}
            className="capitalize"
          >
            {filterType}
          </Button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading escalation alerts...</span>
            </div>
          </CardContent>
        </Card>
      ) : filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center space-y-2">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">No Escalation Alerts</h3>
              <p className="text-gray-600">
                {filter === 'all'
                  ? 'All scheduling conflicts have been resolved!'
                  : `No ${filter} escalation alerts found.`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <EscalationAlert
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              onEscalateToDutyManager={handleEscalateToDutyManager}
              onViewSegment={handleViewSegment}
            />
          ))}
        </div>
      )}
    </div>
  );
}



