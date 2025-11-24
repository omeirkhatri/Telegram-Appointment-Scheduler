'use client';

import { Card } from '@/components/ui/Card';
import type { Lead, LeadStage } from '@/types/lead';
import {
    getServiceTypeIcon,
    isLostLead,
    isStaleLead
} from '@/types/lead';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Calendar,
    Clock,
    PieChart,
    Target,
    TrendingDown,
    TrendingUp,
    Users
} from 'lucide-react';
import { useMemo } from 'react';

interface LeadAnalyticsProps {
  leads: Lead[];
  className?: string;
}

interface AnalyticsData {
  totalLeads: number;
  leadsByStage: Record<LeadStage, number>;
  leadsByService: Record<string, number>;
  conversionRate: number;
  avgTimeToConvert: number;
  staleLeadsCount: number;
  lostLeadsCount: number;
  responseTimeAvg: number;
  weeklyTrend: number;
  monthlyTrend: number;
}

export function LeadAnalytics({ leads, className = '' }: LeadAnalyticsProps) {
  const analytics = useMemo((): AnalyticsData => {
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(lead => lead.stage === 'converted');
    const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;

    // Calculate average time to conversion
    const convertedWithDates = convertedLeads.filter(lead => lead.created_at);
    const avgTimeToConvert = convertedWithDates.length > 0
      ? convertedWithDates.reduce((sum, lead) => {
          const created = new Date(lead.created_at);
          const converted = new Date(lead.updated_at);
          return sum + (converted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / convertedWithDates.length
      : 0;

    // Group by stage
    const leadsByStage = leads.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1;
      return acc;
    }, {} as Record<LeadStage, number>);

    // Group by service
    const leadsByService = leads.reduce((acc, lead) => {
      const service = lead.service_interested_in || 'General';
      acc[service] = (acc[service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate stale and lost leads
    const staleLeadsCount = leads.filter(lead => isStaleLead(lead)).length;
    const lostLeadsCount = leads.filter(lead => isLostLead(lead)).length;

    // Calculate average response time
    const leadsWithResponseTime = leads.filter(lead => lead.response_time_minutes);
    const responseTimeAvg = leadsWithResponseTime.length > 0
      ? leadsWithResponseTime.reduce((sum, lead) => sum + (lead.response_time_minutes || 0), 0) / leadsWithResponseTime.length
      : 0;

    // Calculate trends (simplified - would need historical data for real trends)
    const thisWeek = leads.filter(lead => {
      const created = new Date(lead.created_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return created >= weekAgo;
    }).length;

    const lastWeek = Math.max(0, totalLeads - thisWeek);
    const weeklyTrend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;

    const thisMonth = leads.filter(lead => {
      const created = new Date(lead.created_at);
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return created >= monthAgo;
    }).length;

    const lastMonth = Math.max(0, totalLeads - thisMonth);
    const monthlyTrend = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    return {
      totalLeads,
      leadsByStage,
      leadsByService,
      conversionRate,
      avgTimeToConvert,
      staleLeadsCount,
      lostLeadsCount,
      responseTimeAvg,
      weeklyTrend,
      monthlyTrend,
    };
  }, [leads]);

  const formatTrend = (trend: number) => {
    const isPositive = trend > 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const icon = isPositive ? TrendingUp : TrendingDown;
    const Icon = icon;

    return (
      <div className={`flex items-center space-x-1 ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">
          {Math.abs(trend).toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalLeads}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            {formatTrend(analytics.weeklyTrend)}
            <p className="text-xs text-gray-500 mt-1">vs last week</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.conversionRate.toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(analytics.conversionRate, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: 25%</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Time to Convert</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.avgTimeToConvert.toFixed(0)}d</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">Days from lead to conversion</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stale Leads</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.staleLeadsCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">Need follow-up (7+ days)</p>
          </div>
        </Card>
      </div>

      {/* Pipeline Funnel */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Pipeline Funnel</h3>
        </div>

        <div className="space-y-4">
          {Object.entries(analytics.leadsByStage).map(([stage, count]) => {
            const percentage = analytics.totalLeads > 0 ? (count / analytics.totalLeads) * 100 : 0;
            const stageLabels: Record<string, string> = {
              'new': 'New',
              'contacted': 'Contacted',
              'quoted': 'Quoted',
              'qualified': 'Qualified',
              'not_qualified': 'Not Qualified',
              'converted': 'Converted'
            };

            return (
              <div key={stage} className="flex items-center space-x-4">
                <div className="w-24 text-sm font-medium text-gray-600">
                  {stageLabels[stage]}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-blue-600 h-6 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                    style={{ width: `${percentage}%` }}
                  >
                    {count > 0 && (
                      <span className="text-xs font-medium text-white">{count}</span>
                    )}
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Service Breakdown */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <PieChart className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Leads by Service</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(analytics.leadsByService)
            .sort(([,a], [,b]) => b - a)
            .map(([service, count]) => {
              const percentage = analytics.totalLeads > 0 ? (count / analytics.totalLeads) * 100 : 0;

              return (
                <div key={service} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-lg">{getServiceTypeIcon(service)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{service}</span>
                      <span className="text-sm text-gray-600">{count}</span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Response Time</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Response Time</span>
              <span className="text-lg font-semibold text-gray-900">
                {analytics.responseTimeAvg > 0 ? `${analytics.responseTimeAvg.toFixed(0)} min` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Lost Leads</span>
              <span className="text-lg font-semibold text-red-600">{analytics.lostLeadsCount}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Trends</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Week</span>
              {formatTrend(analytics.weeklyTrend)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Month</span>
              {formatTrend(analytics.monthlyTrend)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
