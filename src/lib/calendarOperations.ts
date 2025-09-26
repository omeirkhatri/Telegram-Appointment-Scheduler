/**
 * Calendar Operations Logging Utility
 *
 * This utility provides functions for logging calendar operations and errors
 * to the calendar_operations_log table for monitoring and debugging.
 */

import { supabase } from '@/lib/supabase';
import { CalendarErrorCode } from '@/types/calendar';

export interface CalendarOperationLog {
  id?: string;
  staff_id: string;
  operation_type: 'create_calendar' | 'share_calendar' | 'create_event' | 'update_event' | 'delete_event' | 'verify_calendar' | 'delete_calendar';
  operation_status: 'success' | 'failed' | 'pending' | 'retrying';
  error_code?: CalendarErrorCode;
  error_message?: string;
  google_calendar_id?: string;
  google_event_id?: string;
  operation_data?: Record<string, any>;
  retry_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LogCalendarOperationParams {
  staffId: string;
  operationType: CalendarOperationLog['operation_type'];
  operationStatus: CalendarOperationLog['operation_status'];
  errorCode?: CalendarErrorCode;
  errorMessage?: string;
  googleCalendarId?: string;
  googleEventId?: string;
  operationData?: Record<string, any>;
  retryCount?: number;
}

/**
 * Log a calendar operation to the database
 */
export async function logCalendarOperation(params: LogCalendarOperationParams): Promise<void> {
  try {
    const logEntry: Omit<CalendarOperationLog, 'id' | 'created_at' | 'updated_at'> = {
      staff_id: params.staffId,
      operation_type: params.operationType,
      operation_status: params.operationStatus,
      error_code: params.errorCode || null,
      error_message: params.errorMessage || null,
      google_calendar_id: params.googleCalendarId || null,
      google_event_id: params.googleEventId || null,
      operation_data: params.operationData || null,
      retry_count: params.retryCount || 0
    };

    const { error } = await supabase
      .from('calendar_operations_log')
      .insert(logEntry);

    if (error) {
      console.error('❌ Failed to log calendar operation:', error);
      // Don't throw error as logging failure shouldn't break the main operation
    } else {
      console.log(`📝 Logged calendar operation: ${params.operationType} for staff ${params.staffId}`);
    }
  } catch (error) {
    console.error('❌ Error logging calendar operation:', error);
    // Don't throw error as logging failure shouldn't break the main operation
  }
}

/**
 * Get calendar operations for a staff member
 */
export async function getCalendarOperationsForStaff(staffId: string): Promise<CalendarOperationLog[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_operations_log')
      .select('*')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch calendar operations: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ Failed to get calendar operations for staff:', error);
    return [];
  }
}

/**
 * Get recent calendar operations with errors
 */
export async function getRecentCalendarErrors(limit: number = 50): Promise<CalendarOperationLog[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_operations_log')
      .select('*')
      .eq('operation_status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent calendar errors: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ Failed to get recent calendar errors:', error);
    return [];
  }
}

/**
 * Update operation status
 */
export async function updateCalendarOperationStatus(
  operationId: string,
  status: CalendarOperationLog['operation_status'],
  errorCode?: CalendarErrorCode,
  errorMessage?: string,
  retryCount?: number
): Promise<void> {
  try {
    const updates: Partial<CalendarOperationLog> = {
      operation_status: status,
      updated_at: new Date().toISOString()
    };

    if (errorCode) {
      updates.error_code = errorCode;
    }
    if (errorMessage) {
      updates.error_message = errorMessage;
    }
    if (retryCount !== undefined) {
      updates.retry_count = retryCount;
    }

    const { error } = await supabase
      .from('calendar_operations_log')
      .update(updates)
      .eq('id', operationId);

    if (error) {
      console.error('❌ Failed to update calendar operation status:', error);
    }
  } catch (error) {
    console.error('❌ Error updating calendar operation status:', error);
  }
}
