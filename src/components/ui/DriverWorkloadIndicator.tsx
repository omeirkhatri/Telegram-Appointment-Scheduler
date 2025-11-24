import { ConflictDetectionService, type DriverWorkloadInfo } from '@/services/conflictDetectionService';
import type { Staff, TransportationSegment } from '@/types';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react';

interface DriverWorkloadIndicatorProps {
  driver: Staff;
  segments: TransportationSegment[];
  showDetails?: boolean;
  className?: string;
}

export function DriverWorkloadIndicator({
  driver,
  segments,
  showDetails = false,
  className = ''
}: DriverWorkloadIndicatorProps) {
  const workloadInfo: DriverWorkloadInfo = ConflictDetectionService.calculateWorkloadScore(driver, segments);

  const getWorkloadColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-100';
    if (score >= 60) return 'text-orange-600 bg-orange-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getWorkloadIcon = (score: number) => {
    if (score >= 80) return <AlertTriangle className="w-4 h-4" />;
    if (score >= 60) return <TrendingUp className="w-4 h-4" />;
    if (score >= 40) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getWorkloadLabel = (score: number) => {
    if (score >= 80) return 'Overloaded';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Moderate';
    return 'Light';
  };

  const criticalConflicts = workloadInfo.conflicts.filter(c => c.severity === 'critical').length;
  const highConflicts = workloadInfo.conflicts.filter(c => c.severity === 'high').length;
  const totalConflicts = workloadInfo.conflicts.length;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Workload Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getWorkloadIcon(workloadInfo.workloadScore)}
          <span className="text-sm font-medium text-gray-700">Workload</span>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getWorkloadColor(workloadInfo.workloadScore)}`}>
          {getWorkloadLabel(workloadInfo.workloadScore)} ({workloadInfo.workloadScore}%)
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <Users className="w-3 h-3" />
          <span>{workloadInfo.totalSegments} segments</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{workloadInfo.totalHours.toFixed(1)}h</span>
        </div>
        <div className="flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3" />
          <span>{totalConflicts} conflicts</span>
        </div>
      </div>

      {/* Conflict Indicators */}
      {totalConflicts > 0 && (
        <div className="flex space-x-1">
          {criticalConflicts > 0 && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>{criticalConflicts} critical</span>
            </div>
          )}
          {highConflicts > 0 && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>{highConflicts} high</span>
            </div>
          )}
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          {/* Recommendations */}
          {workloadInfo.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Recommendations:</h4>
              <ul className="space-y-1">
                {workloadInfo.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-xs text-gray-600 flex items-start space-x-1">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conflicts */}
          {workloadInfo.conflicts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Conflicts:</h4>
              <div className="space-y-1">
                {workloadInfo.conflicts.slice(0, 3).map((conflict, index) => (
                  <div key={index} className="text-xs p-2 rounded border-l-2 bg-gray-50"
                       style={{ borderLeftColor:
                         conflict.severity === 'critical' ? '#dc2626' :
                         conflict.severity === 'high' ? '#ea580c' :
                         conflict.severity === 'medium' ? '#d97706' : '#65a30d'
                       }}>
                    <div className="font-medium text-gray-800">{conflict.message}</div>
                    {conflict.suggestedAction && (
                      <div className="text-gray-600 mt-1">{conflict.suggestedAction}</div>
                    )}
                  </div>
                ))}
                {workloadInfo.conflicts.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{workloadInfo.conflicts.length - 3} more conflicts
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



