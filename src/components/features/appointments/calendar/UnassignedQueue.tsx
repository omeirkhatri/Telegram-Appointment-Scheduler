'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { isDriverAssignmentOverhaulCapacityPlannerEnabled } from '@/lib/featureFlags';
// Importing recommendation service is safe (no googleapis). Keep as is.
import type { DriverRecommendation } from '@/services/driverScoringService';
import { escalationAlertClient, type EscalationAlertClientType as EscalationAlert } from '@/services/escalationAlertClient';
import type { Staff } from '@/types/staff';
import type { TransportationSegment } from '@/types/transportationSegment';
import {
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Clock,
    RefreshCw,
    Users
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DriverScoringDisplay } from './DriverScoringDisplay';
import { EscalationAlertBadge } from './EscalationAlertBadge';
import { EscalationAlertDetails } from './EscalationAlertDetails';

interface UnassignedQueueProps {
  segments?: TransportationSegment[];
  drivers?: Staff[];
  onSegmentClick?: (segment: TransportationSegment) => void;
  onSegmentAssign?: (segmentId: string, driverId: string) => void;
  onSegmentAssignToVendor?: (segmentId: string, vendorType: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  showRecommendations?: boolean;
}

export function UnassignedQueue({
  segments = [],
  drivers = [],
  onSegmentClick,
  onSegmentAssign,
  onSegmentAssignToVendor,
  onRefresh,
  isLoading = false,
  error = null,
  className = '',
  showRecommendations = true
}: UnassignedQueueProps) {
  // Check if capacity planner is enabled
  const isCapacityPlannerEnabled = isDriverAssignmentOverhaulCapacityPlannerEnabled();
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [recommendations, setRecommendations] = useState<Map<string, DriverRecommendation[]>>(new Map());
  const [loadingRecommendations, setLoadingRecommendations] = useState<Set<string>>(new Set());
  const [escalationAlerts, setEscalationAlerts] = useState<Map<string, EscalationAlert[]>>(new Map());
  const [loadingAlerts, setLoadingAlerts] = useState<Set<string>>(new Set());
  const [selectedSegmentAlerts, setSelectedSegmentAlerts] = useState<EscalationAlert[] | null>(null);
  // Use client-safe API wrapper

  const unassignedSegments = useMemo(() => {
    return segments.filter(segment => !segment.driver_id && segment.status === 'draft');
  }, [segments]);

  // Load recommendations for segments when they become visible
  useEffect(() => {
    if (!showRecommendations || unassignedSegments.length === 0) return;

    const loadRecommendations = async () => {
      for (const segment of unassignedSegments) {
        if (recommendations.has(segment.id) || loadingRecommendations.has(segment.id)) {
          continue;
        }

        setLoadingRecommendations(prev => new Set(prev).add(segment.id));

        try {
          const res = await fetch(`/api/recommendations?segment_id=${encodeURIComponent(segment.id)}&max=3&includeMetadata=true`);
          if (res.ok) {
            const { data } = await res.json();
            setRecommendations(prev => new Map(prev).set(segment.id, data.recommendations));
          }
        } catch (error) {
          console.error(`Failed to load recommendations for segment ${segment.id}:`, error);
        } finally {
          setLoadingRecommendations(prev => {
            const newSet = new Set(prev);
            newSet.delete(segment.id);
            return newSet;
          });
        }
      }
    };

    loadRecommendations();
  }, [unassignedSegments, showRecommendations, recommendations, loadingRecommendations]);

  // Load escalation alerts for segments
  useEffect(() => {
    if (unassignedSegments.length === 0) return;

    const loadEscalationAlerts = async () => {
      for (const segment of unassignedSegments) {
        if (escalationAlerts.has(segment.id) || loadingAlerts.has(segment.id)) {
          continue;
        }

        setLoadingAlerts(prev => new Set(prev).add(segment.id));

        try {
          const alerts = await escalationAlertClient.getSegmentAlerts(segment.id);
          setEscalationAlerts(prev => new Map(prev).set(segment.id, alerts));
        } catch (error) {
          console.error(`Failed to load escalation alerts for segment ${segment.id}:`, error);
        } finally {
          setLoadingAlerts(prev => {
            const newSet = new Set(prev);
            newSet.delete(segment.id);
            return newSet;
          });
        }
      }
    };

    loadEscalationAlerts();
  }, [unassignedSegments, escalationAlerts, loadingAlerts, escalationAlertClient]);

  const toggleSegmentExpansion = (segmentId: string) => {
    setExpandedSegments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(segmentId)) {
        newSet.delete(segmentId);
      } else {
        newSet.add(segmentId);
      }
      return newSet;
    });
  };

  const handleDriverSelect = (segmentId: string, driverId: string) => {
    onSegmentAssign?.(segmentId, driverId);
  };

  const handleEscalationAlertClick = (segmentId: string) => {
    const alerts = escalationAlerts.get(segmentId) || [];
    setSelectedSegmentAlerts(alerts);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await escalationAlertClient.acknowledgeAlert(alertId, 'current-user'); // TODO: Get actual user ID
      // Refresh alerts for all segments
      setEscalationAlerts(new Map());
      setSelectedSegmentAlerts(null);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await escalationAlertClient.resolveAlert(alertId, 'current-user'); // TODO: Get actual user ID
      // Refresh alerts for all segments
      setEscalationAlerts(new Map());
      setSelectedSegmentAlerts(null);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  // If capacity planner is not enabled, return a disabled state
  if (!isCapacityPlannerEnabled) {
    return (
      <Card className={`h-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Unassigned Queue</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">Feature Disabled</p>
            <p className="text-sm mt-1">Unassigned queue is part of the Capacity Planner feature</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`h-full ${className}`}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>Error loading unassigned queue: {error}</p>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`h-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Unassigned Queue</span>
            <Badge variant="outline">{unassignedSegments.length}</Badge>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500" data-testid="loading">
            Loading queue...
          </div>
        ) : unassignedSegments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" data-testid="check-circle" />
            <p>All segments assigned!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {unassignedSegments.map((segment) => {
              const isExpanded = expandedSegments.has(segment.id);
              const segmentRecommendations = recommendations.get(segment.id) || [];
              const isLoadingRecs = loadingRecommendations.has(segment.id);
              const segmentAlerts = escalationAlerts.get(segment.id) || [];
              const hasEscalationAlerts = segmentAlerts.length > 0;
              const isEscalated = segment.escalation_state === 'escalated';

              // Determine if segment should be highlighted
              const getSegmentHighlightClass = () => {
                if (hasEscalationAlerts) {
                  const criticalAlerts = segmentAlerts.filter(a => a.severity === 'critical');
                  if (criticalAlerts.length > 0) {
                    return 'bg-red-50 border-l-4 border-red-500';
                  }
                  const highAlerts = segmentAlerts.filter(a => a.severity === 'high');
                  if (highAlerts.length > 0) {
                    return 'bg-orange-50 border-l-4 border-orange-500';
                  }
                  return 'bg-yellow-50 border-l-4 border-yellow-500';
                }
                if (isEscalated) {
                  return 'bg-orange-50 border-l-4 border-orange-400';
                }
                return '';
              };

              return (
                <div key={segment.id} className={`border-b border-gray-100 last:border-b-0 ${getSegmentHighlightClass()}`}>
                  <div
                    className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSegmentClick?.(segment)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-gray-900">{segment.title || 'Untitled Segment'}</p>
                        {hasEscalationAlerts && (
                          <EscalationAlertBadge
                            alerts={segmentAlerts}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEscalationAlertClick(segment.id);
                            }}
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {segment.segment_type || 'transport'} - {segment.planned_start ? new Date(segment.planned_start).toLocaleTimeString() : 'No time'}
                        {isEscalated && (
                          <span className="ml-2 text-orange-600 font-medium">• ESCALATED</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{segment.priority || 'normal'}</Badge>
                      {showRecommendations && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSegmentExpansion(segment.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {showRecommendations && isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                      <div className="flex items-center space-x-2 mb-3 mt-3">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Driver Recommendations</span>
                      </div>

                      {isLoadingRecs ? (
                        <div className="text-center text-gray-500 py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p className="text-xs">Loading recommendations...</p>
                        </div>
                      ) : segmentRecommendations.length > 0 ? (
                        <DriverScoringDisplay
                          recommendations={segmentRecommendations}
                          maxDisplay={3}
                          showDetailedScores={false}
                          onDriverSelect={(driverId) => handleDriverSelect(segment.id, driverId)}
                        />
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          <Users className="w-6 h-6 mx-auto mb-2" />
                          <p className="text-xs">No recommendations available</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Escalation Alert Details Modal */}
      {selectedSegmentAlerts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EscalationAlertDetails
              alerts={selectedSegmentAlerts}
              onAcknowledge={handleAcknowledgeAlert}
              onResolve={handleResolveAlert}
              onClose={() => setSelectedSegmentAlerts(null)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
