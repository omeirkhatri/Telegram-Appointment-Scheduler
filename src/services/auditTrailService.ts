import { supabase } from '@/lib/supabase';
import type {
    AppointmentCopyAuditDetail,
    AppointmentCopyAuditTrail,
    AppointmentCopyStatistics,
    AuditTrailOperationResult,
    CreateAuditDetailRequest,
    CreateAuditTrailRequest,
    GetAuditStatisticsRequest,
    GetAuditStatisticsResponse,
    GetAuditTrailRequest,
    GetAuditTrailResponse,
    IAuditTrailService,
    UpdateAuditTrailRequest,
} from '@/types/auditTrail';

export class AuditTrailService implements IAuditTrailService {
  /**
   * Create a new audit trail record
   */
  async createAuditTrail(request: CreateAuditTrailRequest): Promise<AuditTrailOperationResult> {
    try {
      const { data, error } = await supabase
        .from('appointment_copy_audit_trail')
        .insert({
          operation_id: request.operation_id,
          operation_type: request.operation_type,
          source_appointment_id: request.source_appointment_id,
          user_id: request.user_id,
          copy_config: request.copy_config || {},
          staff_assignments: request.staff_assignments || [],
          override_conflicts: request.override_conflicts || false,
          metadata: request.metadata || {},
          notes: request.notes,
          operation_status: 'pending',
          total_requested: 0,
          total_created: 0,
          total_conflicts: 0,
          total_errors: 0,
          created_appointment_ids: [],
          conflict_details: [],
          error_details: [],
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating audit trail:', error);
        return {
          success: false,
          audit_trail_id: '',
          error: error.message,
        };
      }

      return {
        success: true,
        audit_trail_id: data.id,
      };
    } catch (error) {
      console.error('Error creating audit trail:', error);
      return {
        success: false,
        audit_trail_id: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing audit trail record
   */
  async updateAuditTrail(
    audit_trail_id: string,
    request: UpdateAuditTrailRequest,
  ): Promise<AuditTrailOperationResult> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Add fields that are provided
      if (request.operation_status !== undefined) {
        updateData.operation_status = request.operation_status;
      }
      if (request.total_requested !== undefined) {
        updateData.total_requested = request.total_requested;
      }
      if (request.total_created !== undefined) {
        updateData.total_created = request.total_created;
      }
      if (request.total_conflicts !== undefined) {
        updateData.total_conflicts = request.total_conflicts;
      }
      if (request.total_errors !== undefined) {
        updateData.total_errors = request.total_errors;
      }
      if (request.created_appointment_ids !== undefined) {
        updateData.created_appointment_ids = request.created_appointment_ids;
      }
      if (request.conflict_details !== undefined) {
        updateData.conflict_details = request.conflict_details;
      }
      if (request.error_details !== undefined) {
        updateData.error_details = request.error_details;
      }
      if (request.completed_at !== undefined) {
        updateData.completed_at = request.completed_at;
      }
      if (request.duration_ms !== undefined) {
        updateData.duration_ms = request.duration_ms;
      }
      if (request.notes !== undefined) {
        updateData.notes = request.notes;
      }

      const { error } = await supabase
        .from('appointment_copy_audit_trail')
        .update(updateData)
        .eq('id', audit_trail_id);

      if (error) {
        console.error('Error updating audit trail:', error);
        return {
          success: false,
          audit_trail_id,
          error: error.message,
        };
      }

      return {
        success: true,
        audit_trail_id,
      };
    } catch (error) {
      console.error('Error updating audit trail:', error);
      return {
        success: false,
        audit_trail_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create an audit detail record
   */
  async createAuditDetail(request: CreateAuditDetailRequest): Promise<AuditTrailOperationResult> {
    try {
      const { data, error } = await supabase
        .from('appointment_copy_audit_details')
        .insert({
          audit_trail_id: request.audit_trail_id,
          target_appointment_id: request.target_appointment_id,
          target_date: request.target_date,
          target_time: request.target_time,
          operation_status: request.operation_status || 'pending',
          conflict_detected: request.conflict_detected || false,
          error_occurred: request.error_occurred || false,
          conflict_reason: request.conflict_reason,
          error_message: request.error_message,
          error_code: request.error_code,
          assigned_staff: request.assigned_staff || [],
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating audit detail:', error);
        return {
          success: false,
          audit_trail_id: request.audit_trail_id,
          error: error.message,
        };
      }

      return {
        success: true,
        audit_trail_id: request.audit_trail_id,
      };
    } catch (error) {
      console.error('Error creating audit detail:', error);
      return {
        success: false,
        audit_trail_id: request.audit_trail_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get audit trail for an appointment
   */
  async getAuditTrail(request: GetAuditTrailRequest): Promise<GetAuditTrailResponse> {
    try {
      const limit = request.limit || 50;
      const offset = request.offset || 0;

      // Get total count
      const { count, error: countError } = await supabase
        .from('appointment_copy_audit_trail')
        .select('*', { count: 'exact', head: true })
        .eq('source_appointment_id', request.appointment_id);

      if (countError) {
        console.error('Error getting audit trail count:', countError);
        return {
          success: false,
          data: {
            audit_trail: [],
            total_count: 0,
            has_more: false,
          },
          error: countError.message,
        };
      }

      // Get audit trail records
      const { data, error } = await supabase
        .from('appointment_copy_audit_trail')
        .select('*')
        .eq('source_appointment_id', request.appointment_id)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting audit trail:', error);
        return {
          success: false,
          data: {
            audit_trail: [],
            total_count: 0,
            has_more: false,
          },
          error: error.message,
        };
      }

      return {
        success: true,
        data: {
          audit_trail: data as AppointmentCopyAuditTrail[],
          total_count: count || 0,
          has_more: (offset + limit) < (count || 0),
        },
      };
    } catch (error) {
      console.error('Error getting audit trail:', error);
      return {
        success: false,
        data: {
          audit_trail: [],
          total_count: 0,
          has_more: false,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(request: GetAuditStatisticsRequest): Promise<GetAuditStatisticsResponse> {
    try {
      let query = supabase
        .from('appointment_copy_statistics')
        .select('*')
        .gte('date', request.start_date)
        .lte('date', request.end_date)
        .order('date', { ascending: false });

      if (request.operation_type) {
        query = query.eq('operation_type', request.operation_type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting audit statistics:', error);
        return {
          success: false,
          data: {
            statistics: [],
          },
          error: error.message,
        };
      }

      return {
        success: true,
        data: {
          statistics: data as AppointmentCopyStatistics[],
        },
      };
    } catch (error) {
      console.error('Error getting audit statistics:', error);
      return {
        success: false,
        data: {
          statistics: [],
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get audit trail by ID
   */
  async getAuditTrailById(audit_trail_id: string): Promise<AppointmentCopyAuditTrail | null> {
    try {
      const { data, error } = await supabase
        .from('appointment_copy_audit_trail')
        .select('*')
        .eq('id', audit_trail_id)
        .single();

      if (error) {
        console.error('Error getting audit trail by ID:', error);
        return null;
      }

      return data as AppointmentCopyAuditTrail;
    } catch (error) {
      console.error('Error getting audit trail by ID:', error);
      return null;
    }
  }

  /**
   * Get audit details for an audit trail
   */
  async getAuditDetails(audit_trail_id: string): Promise<AppointmentCopyAuditDetail[]> {
    try {
      const { data, error } = await supabase
        .from('appointment_copy_audit_details')
        .select('*')
        .eq('audit_trail_id', audit_trail_id)
        .order('processed_at', { ascending: true });

      if (error) {
        console.error('Error getting audit details:', error);
        return [];
      }

      return data as AppointmentCopyAuditDetail[];
    } catch (error) {
      console.error('Error getting audit details:', error);
      return [];
    }
  }

  /**
   * Generate a unique operation ID
   */
  generateOperationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `copy_${timestamp}_${random}`;
  }

  /**
   * Calculate operation duration
   */
  calculateDuration(startTime: string, endTime?: string): number {
    if (!endTime) return 0;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return end - start;
  }

  /**
   * Log copy operation start
   */
  async logCopyOperationStart(
    operationType: 'single_copy' | 'bulk_copy',
    sourceAppointmentId: string,
    context?: {
      user_id?: string;
      copy_config?: Record<string, any>;
      staff_assignments?: Array<{
        staff_id: string;
        role: string;
        is_primary: boolean;
      }>;
      override_conflicts?: boolean;
      metadata?: Record<string, any>;
      notes?: string;
    },
  ): Promise<string> {
    const operationId = this.generateOperationId();

    const result = await this.createAuditTrail({
      operation_id: operationId,
      operation_type: operationType,
      source_appointment_id: sourceAppointmentId,
      user_id: context?.user_id,
      copy_config: context?.copy_config,
      staff_assignments: context?.staff_assignments,
      override_conflicts: context?.override_conflicts,
      metadata: context?.metadata,
      notes: context?.notes,
    });

    if (!result.success) {
      throw new Error(`Failed to create audit trail: ${result.error}`);
    }

    return result.audit_trail_id;
  }

  /**
   * Log copy operation completion
   */
  async logCopyOperationComplete(
    auditTrailId: string,
    results: {
      total_requested: number;
      total_created: number;
      total_conflicts: number;
      total_errors: number;
      created_appointment_ids: string[];
      conflict_details: Array<{
        date: string;
        conflicts: any[];
      }>;
      error_details: Array<{
        date: string;
        error: string;
      }>;
      notes?: string;
    },
  ): Promise<void> {
    const completedAt = new Date().toISOString();

    // Get the audit trail to calculate duration
    const auditTrail = await this.getAuditTrailById(auditTrailId);
    const durationMs = auditTrail ? this.calculateDuration(auditTrail.started_at, completedAt) : 0;

    // Determine operation status
    let operationStatus: 'completed' | 'failed' | 'partially_completed' = 'completed';
    if (results.total_errors > 0 && results.total_created === 0) {
      operationStatus = 'failed';
    } else if (results.total_errors > 0 || results.total_conflicts > 0) {
      operationStatus = 'partially_completed';
    }

    await this.updateAuditTrail(auditTrailId, {
      operation_status: operationStatus,
      total_requested: results.total_requested,
      total_created: results.total_created,
      total_conflicts: results.total_conflicts,
      total_errors: results.total_errors,
      created_appointment_ids: results.created_appointment_ids,
      conflict_details: results.conflict_details,
      error_details: results.error_details,
      completed_at: completedAt,
      duration_ms: durationMs,
      notes: results.notes,
    });
  }
}

// Export singleton instance
export const auditTrailService = new AuditTrailService();
