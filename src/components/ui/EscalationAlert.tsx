import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AlertTriangle, CheckCircle, Phone, User } from 'lucide-react';

export interface EscalationAlertData {
  id: string;
  segmentId: string;
  appointmentId: string;
  alertType: 'six_hour_deadline' | 'critical_escalation' | 'duty_manager_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  dutyManagerNotified?: boolean;
  segment?: {
    id: string;
    segmentType: string;
    plannedStart: string;
    plannedEnd: string;
    patientLocation?: string;
    appointment?: {
      id: string;
      patientName: string;
      appointmentDate: string;
      serviceLine: string;
    };
  };
}

interface EscalationAlertProps {
  alert: EscalationAlertData;
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  onEscalateToDutyManager?: (alertId: string) => void;
  onViewSegment?: (segmentId: string) => void;
  className?: string;
}

export function EscalationAlert({
  alert,
  onAcknowledge,
  onResolve,
  onEscalateToDutyManager,
  onViewSegment,
  className = ''
}: EscalationAlertProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50 text-red-800';
      case 'high': return 'border-orange-500 bg-orange-50 text-orange-800';
      case 'medium': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'low': return 'border-blue-500 bg-blue-50 text-blue-800';
      default: return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low': return <AlertTriangle className="w-5 h-5 text-blue-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTimeUntilDeadline = (plannedStart: string) => {
    const now = new Date();
    const start = new Date(plannedStart);
    const diffMs = start.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      return 'Overdue';
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  const isOverdue = alert.segment && new Date(alert.segment.plannedStart) < new Date();
  const isAcknowledged = !!alert.acknowledgedAt;
  const isResolved = !!alert.resolvedAt;

  return (
    <Card className={`border-2 ${getSeverityColor(alert.severity)} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getSeverityIcon(alert.severity)}
            <div>
              <CardTitle className="text-lg font-semibold">
                {alert.alertType === 'six_hour_deadline' && 'Six-Hour Deadline Alert'}
                {alert.alertType === 'critical_escalation' && 'Critical Escalation'}
                {alert.alertType === 'duty_manager_alert' && 'Duty Manager Alert'}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {alert.severity.toUpperCase()}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    OVERDUE
                  </Badge>
                )}
                {isAcknowledged && (
                  <Badge variant="secondary" className="text-xs">
                    ACKNOWLEDGED
                  </Badge>
                )}
                {isResolved && (
                  <Badge variant="default" className="text-xs">
                    RESOLVED
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {alert.segment && getTimeUntilDeadline(alert.segment.plannedStart)}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(alert.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alert Message */}
        <div className="p-3 bg-white rounded-lg border">
          <p className="text-sm font-medium">{alert.message}</p>
        </div>

        {/* Segment Information */}
        {alert.segment && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Appointment Details</h4>
              <div className="text-sm space-y-1">
                <div><strong>Patient:</strong> {alert.segment.appointment?.patientName}</div>
                <div><strong>Service:</strong> {alert.segment.appointment?.serviceLine}</div>
                <div><strong>Type:</strong> {alert.segment.segmentType}</div>
                <div><strong>Start:</strong> {new Date(alert.segment.plannedStart).toLocaleString()}</div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Location</h4>
              <div className="text-sm">
                {alert.segment.patientLocation || 'Location not specified'}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {onViewSegment && alert.segment && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewSegment(alert.segmentId)}
            >
              <User className="w-4 h-4 mr-1" />
              View Segment
            </Button>
          )}

          {!isAcknowledged && onAcknowledge && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onAcknowledge(alert.id)}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Acknowledge
            </Button>
          )}

          {!isResolved && onResolve && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onResolve(alert.id)}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Mark Resolved
            </Button>
          )}

          {!alert.dutyManagerNotified && onEscalateToDutyManager && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onEscalateToDutyManager(alert.id)}
            >
              <Phone className="w-4 h-4 mr-1" />
              Escalate to Duty Manager
            </Button>
          )}
        </div>

        {/* Status Information */}
        <div className="text-xs text-gray-500 space-y-1">
          {alert.acknowledgedAt && (
            <div>Acknowledged: {new Date(alert.acknowledgedAt).toLocaleString()}</div>
          )}
          {alert.resolvedAt && (
            <div>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</div>
          )}
          {alert.dutyManagerNotified && (
            <div className="text-orange-600">Duty manager has been notified</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}



