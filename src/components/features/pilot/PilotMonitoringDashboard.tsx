import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle,
    Clock,
    LineChart,
    PieChart,
    RefreshCw,
    Target,
    TrendingDown,
    TrendingUp,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface PilotMetrics {
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  userAdoption: {
    activeUsers: number;
    featureUsage: Record<string, number>;
    satisfaction: number;
    adoptionRate: number;
  };
  businessImpact: {
    assignmentEfficiency: number;
    driverUtilization: number;
    costSavings: number;
    escalationRate: number;
  };
  feedback: {
    totalResponses: number;
    averageRating: number;
    positiveSentiment: number;
    criticalIssues: number;
  };
}

interface PilotMonitoringDashboardProps {
  className?: string;
}

export const PilotMonitoringDashboard: React.FC<PilotMonitoringDashboardProps> = ({
  className = ''
}) => {
  const [metrics, setMetrics] = useState<PilotMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call - replace with actual endpoint
      const response = await fetch('/api/pilot-metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch pilot metrics');
      }

      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  if (loading && !metrics) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading pilot metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load pilot metrics: {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={fetchMetrics}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`p-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No pilot metrics available. Please check your configuration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pilot Monitoring Dashboard</h1>
          <p className="text-gray-600">
            Real-time monitoring of Driver Assignment Overhaul pilot
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="users">User Adoption</TabsTrigger>
          <TabsTrigger value="business">Business Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(metrics.systemHealth.status)}>
                    {getStatusIcon(metrics.systemHealth.status)}
                    <span className="ml-1 capitalize">{metrics.systemHealth.status}</span>
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Uptime: {formatPercentage(metrics.systemHealth.uptime)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(metrics.userAdoption.activeUsers)}</div>
                <p className="text-xs text-muted-foreground">
                  Adoption: {formatPercentage(metrics.userAdoption.adoptionRate)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.userAdoption.satisfaction.toFixed(1)}/5.0</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(metrics.feedback.totalResponses)} responses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assignment Efficiency</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.businessImpact.assignmentEfficiency)}</div>
                <p className="text-xs text-muted-foreground">
                  Improvement vs baseline
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Response Time</span>
                    <span>{metrics.systemHealth.responseTime}ms</span>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - (metrics.systemHealth.responseTime / 10))}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Error Rate</span>
                    <span>{formatPercentage(metrics.systemHealth.errorRate)}</span>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - (metrics.systemHealth.errorRate * 1000))}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Feature Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(metrics.userAdoption.featureUsage).map(([feature, usage]) => (
                  <div key={feature}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                      <span>{formatPercentage(usage)}</span>
                    </div>
                    <Progress value={usage * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Uptime</span>
                  <Badge className={getStatusColor(metrics.systemHealth.status)}>
                    {formatPercentage(metrics.systemHealth.uptime)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Response Time</span>
                  <span className="text-sm font-medium">{metrics.systemHealth.responseTime}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Error Rate</span>
                  <span className="text-sm font-medium">{formatPercentage(metrics.systemHealth.errorRate)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-gray-500 py-8">
                  Performance trend charts would be displayed here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Alerts & Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Critical Issues</span>
                    <Badge variant="destructive">{metrics.feedback.criticalIssues}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Status</span>
                    <Badge className={getStatusColor(metrics.systemHealth.status)}>
                      {metrics.systemHealth.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  User Adoption
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Users</span>
                  <span className="text-sm font-medium">{formatNumber(metrics.userAdoption.activeUsers)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Adoption Rate</span>
                  <span className="text-sm font-medium">{formatPercentage(metrics.userAdoption.adoptionRate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Satisfaction</span>
                  <span className="text-sm font-medium">{metrics.userAdoption.satisfaction.toFixed(1)}/5.0</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Feature Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(metrics.userAdoption.featureUsage).map(([feature, usage]) => (
                  <div key={feature}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                      <span>{formatPercentage(usage)}</span>
                    </div>
                    <Progress value={usage * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  User Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Responses</span>
                  <span className="text-sm font-medium">{formatNumber(metrics.feedback.totalResponses)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average Rating</span>
                  <span className="text-sm font-medium">{metrics.feedback.averageRating.toFixed(1)}/5.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Positive Sentiment</span>
                  <span className="text-sm font-medium">{formatPercentage(metrics.feedback.positiveSentiment)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Assignment Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.businessImpact.assignmentEfficiency)}</div>
                <p className="text-xs text-muted-foreground">
                  Improvement vs baseline
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Driver Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.businessImpact.driverUtilization)}</div>
                <p className="text-xs text-muted-foreground">
                  Utilization improvement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Cost Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.businessImpact.costSavings)}</div>
                <p className="text-xs text-muted-foreground">
                  Transportation cost reduction
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2" />
                  Escalation Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.businessImpact.escalationRate)}</div>
                <p className="text-xs text-muted-foreground">
                  Reduction in escalations
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Business Impact Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                Business impact trend charts would be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PilotMonitoringDashboard;

