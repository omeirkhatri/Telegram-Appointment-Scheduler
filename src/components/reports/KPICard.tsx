'use client';

import type { KPI } from '@/types/reports';
import { formatKPIValue } from '@/types/reports';
import {
    Activity,
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Mail,
    Minus,
    TrendingDown,
    TrendingUp,
    Users,
    XCircle
} from 'lucide-react';

interface KPICardProps {
  kpi: KPI;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showTrend?: boolean;
}

export function KPICard({
  kpi,
  className = '',
  size = 'medium',
  showTrend = true
}: KPICardProps) {
  const getIcon = (iconName?: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      activity: Activity,
      users: Users,
      calendar: Calendar,
      mail: Mail,
      clock: Clock,
      check: CheckCircle,
      alert: AlertCircle,
      error: XCircle,
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

// Predefined KPI cards for common metrics
export function AppointmentKPICard({
  total,
  today,
  completionRate,
  averageDuration,
  className = ''
}: {
  total: number;
  today: number;
  completionRate: number;
  averageDuration: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      <KPICard
        kpi={{
          id: 'total-appointments',
          title: 'Total Appointments',
          value: total,
          icon: 'calendar',
          description: 'All time appointments'
        }}
      />

      <KPICard
        kpi={{
          id: 'today-appointments',
          title: 'Today\'s Appointments',
          value: today,
          icon: 'calendar',
          description: 'Scheduled for today'
        }}
      />

      <KPICard
        kpi={{
          id: 'completion-rate',
          title: 'Completion Rate',
          value: completionRate,
          unit: 'percentage',
          icon: 'check',
          description: 'Successfully completed'
        }}
      />

      <KPICard
        kpi={{
          id: 'average-duration',
          title: 'Average Duration',
          value: averageDuration,
          unit: 'minutes',
          icon: 'clock',
          description: 'Per appointment'
        }}
      />
    </div>
  );
}

export function PatientKPICard({
  total,
  newThisMonth,
  activePatients,
  className = ''
}: {
  total: number;
  newThisMonth: number;
  activePatients: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      <KPICard
        kpi={{
          id: 'total-patients',
          title: 'Total Patients',
          value: total,
          icon: 'users',
          description: 'All registered patients'
        }}
      />

      <KPICard
        kpi={{
          id: 'new-patients',
          title: 'New This Month',
          value: newThisMonth,
          icon: 'users',
          description: 'Recently registered'
        }}
      />

      <KPICard
        kpi={{
          id: 'active-patients',
          title: 'Active Patients',
          value: activePatients,
          icon: 'users',
          description: 'With recent appointments'
        }}
      />
    </div>
  );
}

export function StaffKPICard({
  total,
  active,
  utilizationRate,
  averageWorkload,
  className = ''
}: {
  total: number;
  active: number;
  utilizationRate: number;
  averageWorkload: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      <KPICard
        kpi={{
          id: 'total-staff',
          title: 'Total Staff',
          value: total,
          icon: 'users',
          description: 'All staff members'
        }}
      />

      <KPICard
        kpi={{
          id: 'active-staff',
          title: 'Active Staff',
          value: active,
          icon: 'users',
          description: 'Currently working'
        }}
      />

      <KPICard
        kpi={{
          id: 'utilization-rate',
          title: 'Utilization Rate',
          value: utilizationRate,
          unit: 'percentage',
          icon: 'activity',
          description: 'Staff efficiency'
        }}
      />

      <KPICard
        kpi={{
          id: 'average-workload',
          title: 'Average Workload',
          value: averageWorkload,
          icon: 'clock',
          description: 'Appointments per staff'
        }}
      />
    </div>
  );
}

export function EmailKPICard({
  totalSent,
  successRate,
  failureRate,
  averageDeliveryTime,
  className = ''
}: {
  totalSent: number;
  successRate: number;
  failureRate: number;
  averageDeliveryTime: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      <KPICard
        kpi={{
          id: 'total-emails',
          title: 'Total Emails Sent',
          value: totalSent,
          icon: 'mail',
          description: 'All time emails'
        }}
      />

      <KPICard
        kpi={{
          id: 'success-rate',
          title: 'Success Rate',
          value: successRate,
          unit: 'percentage',
          icon: 'check',
          description: 'Successfully delivered'
        }}
      />

      <KPICard
        kpi={{
          id: 'failure-rate',
          title: 'Failure Rate',
          value: failureRate,
          unit: 'percentage',
          icon: 'error',
          description: 'Failed deliveries'
        }}
      />

      <KPICard
        kpi={{
          id: 'delivery-time',
          title: 'Avg Delivery Time',
          value: averageDeliveryTime,
          unit: 'ms',
          icon: 'clock',
          description: 'Time to deliver'
        }}
      />
    </div>
  );
}
