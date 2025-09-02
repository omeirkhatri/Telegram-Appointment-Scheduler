'use client';

import { ErrorMessage, LoadingOverlay } from '@/components/ui';
import type { AppointmentCopyAuditTrail } from '@/types/auditTrail';
import { Calendar, Clock, Copy, FileText, Users, X, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AppointmentAuditTrailProps {
  appointmentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AuditTrailData {
  audit_trail: AppointmentCopyAuditTrail[];
  total_count: number;
  has_more: boolean;
}

export function AppointmentAuditTrail({
  appointmentId,
  isOpen,
  onClose,
}: AppointmentAuditTrailProps) {
  const [auditTrail, setAuditTrail] = useState<AuditTrailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fetch audit trail data
  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchAuditTrail();
    }
  }, [isOpen, appointmentId]);

  const fetchAuditTrail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/audit/appointments/${appointmentId}?limit=50&offset=0`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch audit trail');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch audit trail');
      }

      setAuditTrail(result.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch audit trail';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return 'N/A';
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'partially_completed':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'partially_completed':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[--card] border border-[--border] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[--border]">
          <div>
            <h2 className="text-2xl font-bold text-[--foreground] flex items-center">
              <FileText className="w-6 h-6 mr-3" />
              Copy Audit Trail
            </h2>
            <p className="text-[--muted-foreground] mt-1">
              History of copy operations for this appointment
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Loading overlay */}
          {isLoading && (
            <LoadingOverlay message="Loading audit trail..." />
          )}

          {/* Error state */}
          {error && (
            <ErrorMessage
              error={error}
              variant="inline"
            />
          )}

          {/* Audit trail list */}
          {auditTrail && !isLoading && (
            <div className="space-y-4">
              {auditTrail.audit_trail.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-[--muted-foreground] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[--foreground] mb-2">
                    No Copy Operations Found
                  </h3>
                  <p className="text-[--muted-foreground]">
                    This appointment has not been copied yet.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-[--muted-foreground] mb-4">
                    Showing {auditTrail.audit_trail.length} of {auditTrail.total_count} operations
                  </div>
                  
                  {auditTrail.audit_trail.map((item) => (
                    <div
                      key={item.id}
                      className="border border-[--border] rounded-lg p-4 hover:bg-[--muted]/20 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(item.operation_status)}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-[--foreground]">
                                {item.operation_type === 'single_copy' ? 'Single Copy' : 'Bulk Copy'}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(item.operation_status)}`}>
                                {item.operation_status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-sm text-[--muted-foreground]">
                              {formatDate(item.started_at)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="text-[--muted-foreground] hover:text-[--foreground] transition-colors"
                        >
                          {expandedItems.has(item.id) ? '▼' : '▶'}
                        </button>
                      </div>

                      {/* Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-bold text-[--success]">{item.total_created}</div>
                          <div className="text-[--muted-foreground]">Created</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-[--warning]">{item.total_conflicts}</div>
                          <div className="text-[--muted-foreground]">Conflicts</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-[--destructive]">{item.total_errors}</div>
                          <div className="text-[--muted-foreground]">Errors</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-[--foreground]">{item.total_requested}</div>
                          <div className="text-[--muted-foreground]">Requested</div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {expandedItems.has(item.id) && (
                        <div className="mt-4 pt-4 border-t border-[--border] space-y-3">
                          {/* Operation details */}
                          <div>
                            <h4 className="font-medium text-[--foreground] mb-2">Operation Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-[--muted-foreground]">Operation ID:</span>
                                <span className="ml-2 font-mono text-xs">{item.operation_id}</span>
                              </div>
                              <div>
                                <span className="text-[--muted-foreground]">Duration:</span>
                                <span className="ml-2">{formatDuration(item.duration_ms)}</span>
                              </div>
                              <div>
                                <span className="text-[--muted-foreground]">Started:</span>
                                <span className="ml-2">{formatDate(item.started_at)}</span>
                              </div>
                              {item.completed_at && (
                                <div>
                                  <span className="text-[--muted-foreground]">Completed:</span>
                                  <span className="ml-2">{formatDate(item.completed_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Copy configuration for bulk operations */}
                          {item.operation_type === 'bulk_copy' && item.copy_config && (
                            <div>
                              <h4 className="font-medium text-[--foreground] mb-2">Copy Configuration</h4>
                              <div className="bg-[--muted]/30 p-3 rounded-lg text-sm">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(item.copy_config, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Created appointments */}
                          {item.created_appointment_ids.length > 0 && (
                            <div>
                              <h4 className="font-medium text-[--foreground] mb-2">Created Appointments</h4>
                              <div className="space-y-1">
                                {item.created_appointment_ids.map((appointmentId) => (
                                  <div key={appointmentId} className="text-sm font-mono text-[--primary]">
                                    {appointmentId}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Conflict details */}
                          {item.conflict_details.length > 0 && (
                            <div>
                              <h4 className="font-medium text-[--foreground] mb-2">Conflicts</h4>
                              <div className="space-y-2">
                                {item.conflict_details.map((conflict, index) => (
                                  <div key={index} className="bg-[--warning]/10 p-3 rounded-lg text-sm">
                                    <div className="font-medium text-[--warning]">Date: {conflict.date}</div>
                                    <div className="mt-1">
                                      {conflict.conflicts.map((c, i) => (
                                        <div key={i} className="text-[--muted-foreground]">
                                          • {c.description}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Error details */}
                          {item.error_details.length > 0 && (
                            <div>
                              <h4 className="font-medium text-[--foreground] mb-2">Errors</h4>
                              <div className="space-y-2">
                                {item.error_details.map((error, index) => (
                                  <div key={index} className="bg-[--destructive]/10 p-3 rounded-lg text-sm">
                                    <div className="font-medium text-[--destructive]">Date: {error.date}</div>
                                    <div className="mt-1 text-[--muted-foreground]">{error.error}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {item.notes && (
                            <div>
                              <h4 className="font-medium text-[--foreground] mb-2">Notes</h4>
                              <div className="bg-[--muted]/30 p-3 rounded-lg text-sm">
                                {item.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
