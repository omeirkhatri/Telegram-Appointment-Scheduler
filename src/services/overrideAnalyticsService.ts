/**
 * Override Analytics Service
 *
 * Handles sending override data to the backend for analytics and reporting.
 * This service captures when dispatchers override driver recommendations
 * and sends structured data for leadership insights.
 */

import { auditTrailService } from './auditTrailService';

export interface OverrideAnalyticsData {
  segmentId: string;
  appointmentId: string;
  userId: string;
  userName?: string;
  operationType: 'transportation_segment_override' | 'driver_reassignment_override' | 'timing_override';
  overrideReason: 'driver_conflict' | 'timing_conflict' | 'travel_buffer_insufficient' | 'patient_preference' | 'vehicle_requirement' | 'manual_requirement' | 'emergency_override' | 'other';
  overrideNote?: string;
  originalDriverId?: string;
  newDriverId?: string;
  originalPlannedStart?: string;
  newPlannedStart?: string;
  originalPlannedEnd?: string;
  newPlannedEnd?: string;
  conflictDetails: {
    driver_conflicts?: string[];
    timing_conflicts?: string[];
    travel_buffer_issues?: string[];
    warnings_acknowledged: string[];
  };
  requiresFollowUp?: boolean;
  metadata?: Record<string, any>;
}

export interface OverrideAnalyticsResponse {
  success: boolean;
  overrideId?: string;
  error?: string;
}

export class OverrideAnalyticsService {
  private static instance: OverrideAnalyticsService;

  public static getInstance(): OverrideAnalyticsService {
    if (!OverrideAnalyticsService.instance) {
      OverrideAnalyticsService.instance = new OverrideAnalyticsService();
    }
    return OverrideAnalyticsService.instance;
  }

  /**
   * Send override data to backend for analytics
   */
  async sendOverrideAnalytics(data: OverrideAnalyticsData): Promise<OverrideAnalyticsResponse> {
    try {
      console.log('📊 Sending override analytics:', {
        segmentId: data.segmentId,
        appointmentId: data.appointmentId,
        operationType: data.operationType,
        overrideReason: data.overrideReason,
        hasNote: !!data.overrideNote,
      });

      // Use the existing audit trail service to record the override
      const result = await auditTrailService.createTransportationSegmentOverride({
        segment_id: data.segmentId,
        appointment_id: data.appointmentId,
        operation_type: data.operationType,
        override_reason: data.overrideReason,
        user_id: data.userId,
        user_name: data.userName,
        original_driver_id: data.originalDriverId,
        new_driver_id: data.newDriverId,
        original_planned_start: data.originalPlannedStart,
        new_planned_start: data.newPlannedStart,
        original_planned_end: data.originalPlannedEnd,
        new_planned_end: data.newPlannedEnd,
        conflict_details: data.conflictDetails,
        override_justification: data.overrideNote || '',
        requires_follow_up: data.requiresFollowUp || false,
        metadata: {
          ...data.metadata,
          timestamp: new Date().toISOString(),
          source: 'appointment_form_override',
          analytics_version: '1.0',
        },
      });

      if (result.success) {
        console.log('✅ Override analytics sent successfully:', result.audit_trail_id);
        return {
          success: true,
          overrideId: result.audit_trail_id,
        };
      } else {
        console.error('❌ Failed to send override analytics:', result.error);
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error('❌ Error sending override analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send override analytics via direct API call (alternative method)
   */
  async sendOverrideAnalyticsViaAPI(data: OverrideAnalyticsData): Promise<OverrideAnalyticsResponse> {
    try {
      console.log('📊 Sending override analytics via API:', {
        segmentId: data.segmentId,
        appointmentId: data.appointmentId,
        operationType: data.operationType,
        overrideReason: data.overrideReason,
      });

      const response = await fetch('/api/transportation-segments/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segment_id: data.segmentId,
          appointment_id: data.appointmentId,
          operation_type: data.operationType,
          override_reason: data.overrideReason,
          user_id: data.userId,
          user_name: data.userName,
          original_driver_id: data.originalDriverId,
          new_driver_id: data.newDriverId,
          original_planned_start: data.originalPlannedStart,
          new_planned_start: data.newPlannedStart,
          original_planned_end: data.originalPlannedEnd,
          new_planned_end: data.newPlannedEnd,
          conflict_details: data.conflictDetails,
          override_justification: data.overrideNote || '',
          requires_follow_up: data.requiresFollowUp || false,
          metadata: {
            ...data.metadata,
            timestamp: new Date().toISOString(),
            source: 'appointment_form_override',
            analytics_version: '1.0',
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Override analytics sent via API successfully:', result.data?.override_id);
        return {
          success: true,
          overrideId: result.data?.override_id,
        };
      } else {
        console.error('❌ Failed to send override analytics via API:', result.error);
        return {
          success: false,
          error: result.error || 'API request failed',
        };
      }
    } catch (error) {
      console.error('❌ Error sending override analytics via API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get override analytics summary for insights panel
   */
  async getOverrideAnalyticsSummary(
    dateFrom: string,
    dateTo: string
  ): Promise<{
    totalOverrides: number;
    overridesByReason: Record<string, number>;
    overridesByOperation: Record<string, number>;
    requiresFollowUpCount: number;
    averageOverridesPerDay: number;
  }> {
    try {
      const response = await fetch(
        `/api/transportation-segments/reports?type=overrides&date_from=${dateFrom}&date_to=${dateTo}&format=json`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch override analytics: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch override analytics');
      }

      return result.data;
    } catch (error) {
      console.warn('⚠️ Override analytics API not available, returning mock data:', error);
      return {
        totalOverrides: 0,
        overridesByReason: {},
        overridesByOperation: {},
        requiresFollowUpCount: 0,
        averageOverridesPerDay: 0,
      };
    }
  }

  /**
   * Get override analytics for a specific segment
   */
  async getSegmentOverrideHistory(segmentId: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/transportation-segments/overrides?segment_id=${segmentId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch segment override history: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch segment override history');
      }

      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching segment override history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const overrideAnalyticsService = OverrideAnalyticsService.getInstance();
