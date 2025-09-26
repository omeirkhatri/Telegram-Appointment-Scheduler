'use client';

import type { KPI } from '@/types/reports';
import { formatKPIValue } from '@/types/reports';
import {
    Activity,
    AlertCircle,
    Car,
    CheckCircle,
    Clock,
    MapPin,
    Minus,
    TrendingDown,
    TrendingUp,
    Users,
    XCircle,
} from 'lucide-react';

interface TransportationSegmentKPICardProps {
  kpi: KPI;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showTrend?: boolean;
}

export function TransportationSegmentKPICard({
  kpi,
  className = '',
  size = 'medium',
  showTrend = true,
}: TransportationSegmentKPICardProps) {
  const getIcon = (iconName?: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      activity: Activity,
      users: Users,
      car: Car,
      clock: Clock,
      check: CheckCircle,
      alert: AlertCircle,
      error: XCircle,
      map: MapPin,
    };

    const IconComponent = iconName ? iconMap[iconName] : Activity;
    return <IconComponent className="w-5 h-5" />;
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'p-4';
      case 'large':
        return 'p-8';
      default:
        return 'p-6';
    }
  };

  const getValueSize = () => {
    switch (size) {
      case 'small':
        return 'text-2xl';
      case 'large':
        return 'text-4xl';
      default:
        return 'text-3xl';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow ${getSizeClasses()} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            {getIcon(kpi.icon)}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-600">{kpi.title}</h3>
            {kpi.description && (
              <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
            )}
          </div>
        </div>

        {showTrend && kpi.trend && (
          <div className="flex items-center space-x-1">
            {getTrendIcon(kpi.trend)}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-4">
        <div className={`font-bold text-gray-900 ${getValueSize()}`}>
          {formatKPIValue(kpi.value, kpi.unit)}
        </div>
      </div>

      {/* Change indicator */}
      {kpi.change !== undefined && (
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getChangeColor(kpi.changeType)}`}>
            {kpi.changeType === 'positive' && <TrendingUp className="w-3 h-3 mr-1" />}
            {kpi.changeType === 'negative' && <TrendingDown className="w-3 h-3 mr-1" />}
            {kpi.changeType === 'neutral' && <Minus className="w-3 h-3 mr-1" />}
            {typeof kpi.change === 'number' ? `${kpi.change > 0 ? '+' : ''}${kpi.change}%` : kpi.change}
          </div>

          {kpi.changeType && (
            <span className="text-xs text-gray-500">
              vs previous period
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Transportation Segment KPI Cards
export function TransportationSegmentKPICards({
  totalSegments,
  segmentsWithDrivers,
  utilizationRate,
  avgTravelTime,
  avgDistance,
  manualOverrides,
  overrideRate,
  className = '',
}: {
  totalSegments: number;
  segmentsWithDrivers: number;
  utilizationRate: number;
  avgTravelTime: number;
  avgDistance: number;
  manualOverrides: number;
  overrideRate: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      <TransportationSegmentKPICard
        kpi={{
          id: 'total-segments',
          title: 'Total Segments',
          value: totalSegments,
          icon: 'car',
          description: 'All transportation segments',
        }}
      />

      <TransportationSegmentKPICard
        kpi={{
          id: 'utilization-rate',
          title: 'Driver Utilization',
          value: utilizationRate,
          unit: 'percentage',
          icon: 'users',
          description: 'Segments with assigned drivers',
        }}
      />

      <TransportationSegmentKPICard
        kpi={{
          id: 'avg-travel-time',
          title: 'Avg Travel Time',
          value: avgTravelTime,
          unit: 'minutes',
          icon: 'clock',
          description: 'Average segment duration',
        }}
      />

      <TransportationSegmentKPICard
        kpi={{
          id: 'manual-overrides',
          title: 'Manual Overrides',
          value: manualOverrides,
          icon: 'alert',
          description: 'Segments requiring manual intervention',
        }}
      />
    </div>
  );
}

// Driver Performance KPI Cards
export function DriverPerformanceKPICards({
  totalDrivers,
  activeDrivers,
  avgCompletionRate,
  avgOverrideRate,
  className = '',
}: {
  totalDrivers: number;
  activeDrivers: number;
  avgCompletionRate: number;
  avgOverrideRate: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      <TransportationSegmentKPICard
        kpi={{
          id: 'total-drivers',
          title: 'Total Drivers',
          value: totalDrivers,
          icon: 'users',
          description: 'All available drivers',
        }}
      />

      <TransportationSegmentKPICard
        kpi={{
          id: 'active-drivers',
          title: 'Active Drivers',
          value: activeDrivers,
          icon: 'activity',
          description: 'Drivers with assigned segments',
        }}
      />

      <TransportationSegmentKPICard
        kpi={{
          id: 'avg-completion-rate',
          title: 'Avg Completion Rate',
          value: avgCompletionRate,
          unit: 'percentage',
          icon: 'check',
          description: 'Successfully completed segments',
        }}
      />

      <TransportationSegmentKPICard
        kpi={{
          id: 'avg-override-rate',
          title: 'Avg Override Rate',
          value: avgOverrideRate,
          unit: 'percentage',
          icon: 'alert',
          description: 'Segments requiring overrides',
        }}
      />
    </div>
  );
}

// Conflict Analysis KPI Cards
export function ConflictAnalysisKPICards({
  totalConflicts,
  manualOverrides,
  overrideRate,
  className = '',
}: {
  totalConflicts: number;
  manualOverrides: number;
  overrideRate: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      <TransportationSegmentKPICard
        kpi={{
          id: 'total-conflicts',
          title: 'Total Conflicts',
          value: totalConflicts,
          icon: 'alert',
          description: 'Scheduling conflicts detected',
        }}
      />

      <TransportationSegmentKPICard
        kpi={{
          id: 'manual-overrides',
          title: 'Manual Overrides',
          value: manualOverrides,
          icon: 'activity',
          description: 'Conflicts resolved manually',
        }}
      />

      <TransportationSegmentKPICard
        kpi={{
          id: 'override-rate',
          title: 'Override Rate',
          value: overrideRate,
          unit: 'percentage',
          icon: 'alert',
          description: 'Percentage of conflicts overridden',
        }}
      />
    </div>
  );
}
