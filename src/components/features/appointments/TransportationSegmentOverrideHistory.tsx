'use client';

import type { TransportationSegmentOverrideAudit } from '@/types/auditTrail';
import { AlertCircle, CheckCircle, Clock, User, XCircle } from 'lucide-react';
import { useState } from 'react';

interface TransportationSegmentOverrideHistoryProps {
  overrides: TransportationSegmentOverrideAudit[];
  onClose?: () => void;
}

export function TransportationSegmentOverrideHistory({
  overrides,
  onClose
}: TransportationSegmentOverrideHistoryProps) {
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set());

  if (!overrides || overrides.length === 0) {
    return (
      <div className="p-4 bg-white rounded-lg border">
        <div className="flex items-center space-x-2 text-gray-500">
          <CheckCircle className="w-4 h-4" />
          <span>No manual overrides recorded</span>
        </div>
      </div>
    );
  }

  const toggleOverrideExpansion = (overrideId: string) => {
    const newExpanded = new Set(expandedOverrides);
    if (newExpanded.has(overrideId)) {
      newExpanded.delete(overrideId);
    } else {
      newExpanded.add(overrideId);
    }
    setExpandedOverrides(newExpanded);
  };

  const getOverrideReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      driver_conflict: 'Driver Conflict',
      timing_conflict: 'Timing Conflict',
      travel_buffer_insufficient: 'Insufficient Travel Buffer',
      manual_requirement: 'Manual Requirement',
      emergency_override: 'Emergency Override',
    };
    return labels[reason] || reason;
  };

  const getOverrideReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      driver_conflict: 'bg-red-100 text-red-800 border-red-200',
      timing_conflict: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      travel_buffer_insufficient: 'bg-orange-100 text-orange-800 border-orange-200',
      manual_requirement: 'bg-blue-100 text-blue-800 border-blue-200',
      emergency_override: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[reason] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Override History</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {overrides.map((override) => {
        const isExpanded = expandedOverrides.has(override.id);
        const hasFollowUp = override.requires_follow_up;
        const reminderSent = override.follow_up_reminder_sent;

        return (
          <div key={override.id} className="p-3 bg-white rounded-lg border">
            {/* Override Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-gray-900">
                    {getOverrideReasonLabel(override.override_reason)}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getOverrideReasonColor(override.override_reason)}`}>
                    {override.operation_type.replace('_', ' ').toUpperCase()}
                  </span>
                  {hasFollowUp && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                      reminderSent
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      <Clock className="w-3 h-3 mr-1" />
                      {reminderSent ? 'Reminder Sent' : 'Follow-up Required'}
                    </span>
                  )}
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{override.user_name || 'Unknown User'}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(override.created_at)}</span>
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleOverrideExpansion(override.id)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  {isExpanded ? 'Show Less' : 'Show Details'}
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="space-y-3">
                  {/* Justification */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Justification</h4>
                    <p className="text-sm text-gray-600">{override.override_justification}</p>
                  </div>

                  {/* Conflict Details */}
                  {override.conflict_details && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Conflict Details</h4>
                      <div className="space-y-2">
                        {override.conflict_details.driver_conflicts?.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-red-700">Driver Conflicts:</span>
                            <ul className="text-xs text-red-600 ml-2">
                              {override.conflict_details.driver_conflicts.map((conflict, index) => (
                                <li key={index}>• {conflict}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {override.conflict_details.timing_conflicts?.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-yellow-700">Timing Conflicts:</span>
                            <ul className="text-xs text-yellow-600 ml-2">
                              {override.conflict_details.timing_conflicts.map((conflict, index) => (
                                <li key={index}>• {conflict}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {override.conflict_details.travel_buffer_issues?.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-orange-700">Travel Buffer Issues:</span>
                            <ul className="text-xs text-orange-600 ml-2">
                              {override.conflict_details.travel_buffer_issues.map((issue, index) => (
                                <li key={index}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {override.conflict_details.warnings_acknowledged?.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-blue-700">Warnings Acknowledged:</span>
                            <ul className="text-xs text-blue-600 ml-2">
                              {override.conflict_details.warnings_acknowledged.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Changes Made */}
                  {(override.original_driver_id || override.new_driver_id ||
                    override.original_planned_start || override.new_planned_start ||
                    override.original_planned_end || override.new_planned_end) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Changes Made</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        {override.original_driver_id && override.new_driver_id && (
                          <div>Driver: {override.original_driver_id} → {override.new_driver_id}</div>
                        )}
                        {override.original_planned_start && override.new_planned_start && (
                          <div>Start Time: {formatDateTime(override.original_planned_start)} → {formatDateTime(override.new_planned_start)}</div>
                        )}
                        {override.original_planned_end && override.new_planned_end && (
                          <div>End Time: {formatDateTime(override.original_planned_end)} → {formatDateTime(override.new_planned_end)}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
