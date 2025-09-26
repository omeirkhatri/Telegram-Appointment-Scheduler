// Audit Trail Types for Appointment Copy Operations

export type CopyOperationType = 'single_copy' | 'bulk_copy';
export type CopyOperationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'partially_completed';

// Transportation Segment Override Types
export type OverrideOperationType = 'transportation_segment_override' | 'driver_reassignment_override' | 'timing_override';
export type OverrideReason = 'driver_conflict' | 'timing_conflict' | 'travel_buffer_insufficient' | 'manual_requirement' | 'emergency_override';

// Main audit trail record
export interface AppointmentCopyAuditTrail {
  id: string;
  operation_id: string;
  operation_type: CopyOperationType;
  source_appointment_id: string;
  user_id?: string;
  operation_status: CopyOperationStatus;

  // Operation configuration
  copy_config: Record<string, any>;
  staff_assignments: Array<{
    staff_id: string;
    role: string;
    is_primary: boolean;
  }>;
  override_conflicts: boolean;

  // Results tracking
  total_requested: number;
  total_created: number;
  total_conflicts: number;
  total_errors: number;

  // Target appointments created
  created_appointment_ids: string[];

  // Conflict and error details
  conflict_details: Array<{
    date: string;
    conflicts: any[];
  }>;
  error_details: Array<{
    date: string;
    error: string;
  }>;

  // Timestamps
  started_at: string;
  completed_at?: string;
  duration_ms?: number;

  // Additional metadata
  metadata: Record<string, any>;
  notes?: string;

  created_at: string;
  updated_at: string;
}

// Detailed audit record for individual copies
export interface AppointmentCopyAuditDetail {
  id: string;
  audit_trail_id: string;
  target_appointment_id?: string;
  target_date: string;
  target_time: string;

  // Copy operation details
  operation_status: CopyOperationStatus;
  conflict_detected: boolean;
  error_occurred: boolean;

  // Details
  conflict_reason?: string;
  error_message?: string;
  error_code?: string;

  // Staff assignment details
  assigned_staff: Array<{
    staff_id: string;
    role: string;
    is_primary: boolean;
  }>;

  // Timestamps
  processed_at: string;
  created_at: string;
}

// Copy statistics
export interface AppointmentCopyStatistics {
  id: string;
  date: string;
  operation_type: CopyOperationType;
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  partially_completed_operations: number;
  total_appointments_created: number;
  total_conflicts: number;
  total_errors: number;
  average_operation_duration_ms: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

// Request/Response types for API operations
export interface CreateAuditTrailRequest {
  operation_id: string;
  operation_type: CopyOperationType;
  source_appointment_id: string;
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
}

export interface UpdateAuditTrailRequest {
  operation_status?: CopyOperationStatus;
  total_requested?: number;
  total_created?: number;
  total_conflicts?: number;
  total_errors?: number;
  created_appointment_ids?: string[];
  conflict_details?: Array<{
    date: string;
    conflicts: any[];
  }>;
  error_details?: Array<{
    date: string;
    error: string;
  }>;
  completed_at?: string;
  duration_ms?: number;
  notes?: string;
}

export interface CreateAuditDetailRequest {
  audit_trail_id: string;
  target_appointment_id?: string;
  target_date: string;
  target_time: string;
  operation_status?: CopyOperationStatus;
  conflict_detected?: boolean;
  error_occurred?: boolean;
  conflict_reason?: string;
  error_message?: string;
  error_code?: string;
  assigned_staff?: Array<{
    staff_id: string;
    role: string;
    is_primary: boolean;
  }>;
}

export interface GetAuditTrailRequest {
  appointment_id: string;
  limit?: number;
  offset?: number;
}

export interface GetAuditTrailResponse {
  success: boolean;
  data: {
    audit_trail: AppointmentCopyAuditTrail[];
    total_count: number;
    has_more: boolean;
  };
  error?: string;
}

export interface GetAuditStatisticsRequest {
  start_date: string;
  end_date: string;
  operation_type?: CopyOperationType;
}

export interface GetAuditStatisticsResponse {
  success: boolean;
  data: {
    statistics: AppointmentCopyStatistics[];
  };
  error?: string;
}

// Audit trail operation context
export interface AuditTrailContext {
  operation_id: string;
  operation_type: CopyOperationType;
  source_appointment_id: string;
  user_id?: string;
  user_agent?: string;
  ip_address?: string;
  session_id?: string;
}

// Audit trail operation result
export interface AuditTrailOperationResult {
  success: boolean;
  audit_trail_id: string;
  error?: string;
}

// Audit trail service interface
export interface IAuditTrailService {
  // Create audit trail record
  createAuditTrail(request: CreateAuditTrailRequest): Promise<AuditTrailOperationResult>;

  // Update audit trail record
  updateAuditTrail(audit_trail_id: string, request: UpdateAuditTrailRequest): Promise<AuditTrailOperationResult>;

  // Create audit detail record
  createAuditDetail(request: CreateAuditDetailRequest): Promise<AuditTrailOperationResult>;

  // Get audit trail for an appointment
  getAuditTrail(request: GetAuditTrailRequest): Promise<GetAuditTrailResponse>;

  // Get audit statistics
  getAuditStatistics(request: GetAuditStatisticsRequest): Promise<GetAuditStatisticsResponse>;

  // Get audit trail by ID
  getAuditTrailById(audit_trail_id: string): Promise<AppointmentCopyAuditTrail | null>;

  // Get audit details for an audit trail
  getAuditDetails(audit_trail_id: string): Promise<AppointmentCopyAuditDetail[]>;

  // Transportation segment override methods
  createTransportationSegmentOverride(request: CreateTransportationSegmentOverrideRequest): Promise<AuditTrailOperationResult>;
  getTransportationSegmentOverrides(request: GetTransportationSegmentOverridesRequest): Promise<GetTransportationSegmentOverridesResponse>;
  updateTransportationSegmentOverrideFollowUp(overrideId: string, reminderSent: boolean): Promise<AuditTrailOperationResult>;
  getTransportationSegmentOverridesRequiringFollowUp(): Promise<TransportationSegmentOverrideAudit[]>;
}

// Transportation Segment Override Audit Trail
export interface TransportationSegmentOverrideAudit {
  id: string;
  segment_id: string;
  appointment_id: string;
  operation_type: OverrideOperationType;
  override_reason: OverrideReason;
  user_id: string;
  user_name?: string;

  // Override details
  original_driver_id?: string;
  new_driver_id?: string;
  original_planned_start?: string;
  new_planned_start?: string;
  original_planned_end?: string;
  new_planned_end?: string;

  // Conflict details
  conflict_details: {
    driver_conflicts?: string[];
    timing_conflicts?: string[];
    travel_buffer_issues?: string[];
    warnings_acknowledged: string[];
  };

  // Override justification
  override_justification: string;
  requires_follow_up: boolean;
  follow_up_reminder_sent?: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Additional metadata
  metadata: Record<string, any>;
}

// Request/Response types for transportation segment overrides
export interface CreateTransportationSegmentOverrideRequest {
  segment_id: string;
  appointment_id: string;
  operation_type: OverrideOperationType;
  override_reason: OverrideReason;
  user_id: string;
  user_name?: string;
  original_driver_id?: string;
  new_driver_id?: string;
  original_planned_start?: string;
  new_planned_start?: string;
  original_planned_end?: string;
  new_planned_end?: string;
  conflict_details: {
    driver_conflicts?: string[];
    timing_conflicts?: string[];
    travel_buffer_issues?: string[];
    warnings_acknowledged: string[];
  };
  override_justification: string;
  requires_follow_up?: boolean;
  metadata?: Record<string, any>;
}

export interface GetTransportationSegmentOverridesRequest {
  segment_id?: string;
  appointment_id?: string;
  user_id?: string;
  operation_type?: OverrideOperationType;
  requires_follow_up?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetTransportationSegmentOverridesResponse {
  success: boolean;
  data: {
    overrides: TransportationSegmentOverrideAudit[];
    total_count: number;
    has_more: boolean;
  };
  error?: string;
}
