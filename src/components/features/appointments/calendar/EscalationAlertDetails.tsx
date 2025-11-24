'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { EscalationAlert } from '@/services/escalationAlertService';
import { AlertCircle, AlertTriangle, CheckCircle, Clock, User, X } from 'lucide-react';
import { useState } from 'react';

interface EscalationAlertDetailsProps {
  alerts: EscalationAlert[];
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  onClose?: () => void;
  className?: string;
}

export function EscalationAlertDetails({
  alerts,
  onAcknowledge,
  onResolve,
  onClose,
  className = ''
}: EscalationAlertDetailsProps) {
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(prev => new Set(prev).add(alertId));
    try {
      await onAcknowledge?.(alertId);
    } finally {
      setAcknowledging(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const handleResolve = async (alertId: string) => {
    setResolving(prev => new Set(prev).add(alertId));
    try {
      await onResolve?.(alertId);
    } finally {
      setResolving(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const getSeverityConfig = (severity: EscalationAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'medium':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'low':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const getAlertTypeLabel = (alertType: EscalationAlert['alert_type']) => {
    switch (alertType) {
      case 'six_hour_deadline':
        return '6-Hour Deadline';
      case 'critical_escalation':
        return 'Critical Escalation';
      case 'duty_manager_alert':
        return 'Duty Manager Alert';
      default:
        return 'Unknown Alert';
    }
  };

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span>Escalation Alerts</span>
            <Badge variant="outline">{alerts.length}</Badge>
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => {
          const config = getSeverityConfig(alert.severity);
          const Icon = config.icon;
          const isAcknowledged = !!alert.acknowledged_at;
          const isResolved = !!alert.resolved_at;

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {getAlertTypeLabel(alert.alert_type)}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {alert.severity.toUpperCase()}
                  </Badge>
                  {isResolved && (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Resolved
                    </Badge>
                  )}
                  {isAcknowledged && !isResolved && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                      <User className="w-3 h-3 mr-1" />
                      Acknowledged
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {alert.message}
                </p>
              </div>

              {alert.acknowledged_at && (
                <div className="mb-2 text-xs text-gray-600">
                  <strong>Acknowledged:</strong> {new Date(alert.acknowledged_at).toLocaleString()}
                  {alert.acknowledged_by && (
                    <span> by {alert.acknowledged_by}</span>
                  )}
                </div>
              )}

              {alert.resolved_at && (
                <div className="mb-2 text-xs text-gray-600">
                  <strong>Resolved:</strong> {new Date(alert.resolved_at).toLocaleString()}
                  {alert.resolved_by && (
                    <span> by {alert.resolved_by}</span>
                  )}
                </div>
              )}

              {!isResolved && (
                <div className="flex items-center space-x-2">
                  {!isAcknowledged && onAcknowledge && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledging.has(alert.id)}
                      className="text-xs"
                    >
                      <User className="w-3 h-3 mr-1" />
                      {acknowledging.has(alert.id) ? 'Acknowledging...' : 'Acknowledge'}
                    </Button>
                  )}
                  {onResolve && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolving.has(alert.id)}
                      className="text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {resolving.has(alert.id) ? 'Resolving...' : 'Resolve'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
