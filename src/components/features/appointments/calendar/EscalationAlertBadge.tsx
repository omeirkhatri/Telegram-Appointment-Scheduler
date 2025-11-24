'use client';

import { Badge } from '@/components/ui/Badge';
import type { EscalationAlert } from '@/services/escalationAlertService';
import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';

interface EscalationAlertBadgeProps {
  alerts: EscalationAlert[];
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function EscalationAlertBadge({ alerts, className = '', onClick }: EscalationAlertBadgeProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Find the highest severity alert
  const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  const highestSeverityAlert = alerts.reduce((highest, current) => {
    return severityOrder[current.severity] > severityOrder[highest.severity] ? current : highest;
  }, alerts[0]);

  const getSeverityConfig = (severity: EscalationAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          variant: 'destructive' as const,
          icon: AlertCircle,
          text: 'CRITICAL',
          className: 'bg-red-600 text-white border-red-600 animate-pulse'
        };
      case 'high':
        return {
          variant: 'destructive' as const,
          icon: AlertTriangle,
          text: 'HIGH',
          className: 'bg-orange-600 text-white border-orange-600'
        };
      case 'medium':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: 'MEDIUM',
          className: 'bg-yellow-500 text-white border-yellow-500'
        };
      case 'low':
        return {
          variant: 'outline' as const,
          icon: Clock,
          text: 'LOW',
          className: 'bg-blue-100 text-blue-800 border-blue-300'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Clock,
          text: 'UNKNOWN',
          className: 'bg-gray-100 text-gray-800 border-gray-300'
        };
    }
  };

  const config = getSeverityConfig(highestSeverityAlert.severity);
  const Icon = config.icon;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Badge
        variant={config.variant}
        className={`text-xs font-semibold cursor-pointer ${config.className}`}
        title={`${alerts.length} escalation alert${alerts.length > 1 ? 's' : ''}: ${alerts.map(a => a.alert_type).join(', ')}`}
        onClick={onClick}
      >
        <Icon className="w-3 h-3 mr-1" data-testid={`${config.text.toLowerCase()}-icon`} />
        {config.text}
      </Badge>
      {alerts.length > 1 && (
        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
          +{alerts.length - 1}
        </Badge>
      )}
    </div>
  );
}
