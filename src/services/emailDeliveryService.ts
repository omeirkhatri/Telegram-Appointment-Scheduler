import { supabase } from '@/lib/supabase';
import type {
    EmailDeliveryAttempt,
    EmailDeliveryFilters,
    EmailDeliveryLog,
    EmailDeliveryRetryConfig,
    EmailDeliveryStatistics,
    EmailDeliveryService as IEmailDeliveryService,
} from '@/types/email';

export class EmailDeliveryService implements IEmailDeliveryService {
  private readonly retryConfig: EmailDeliveryRetryConfig = {
    maxRetries: 3,
    retryDelayMs: 5000,
    exponentialBackoff: true,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'SMTP_TIMEOUT',
      'SMTP_CONNECTION_ERROR',
      'TEMPORARY_FAILURE',
    ],
    nonRetryableErrors: [
      'INVALID_EMAIL',
      'EMAIL_NOT_FOUND',
      'BLOCKED_RECIPIENT',
      'INVALID_CREDENTIALS',
      'QUOTA_EXCEEDED',
    ],
  };

  /**
   * Log a delivery attempt
   */
  async logDeliveryAttempt(
    logData: Omit<EmailDeliveryLog, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<EmailDeliveryLog> {
    try {
      const { data, error } = await supabase
        .from('email_delivery_logs')
        .insert({
          email_id: logData.emailId,
          staff_id: logData.staffId,
          job_execution_id: logData.jobExecutionId,
          email_type: logData.emailType,
          recipient_email: logData.recipientEmail,
          subject: logData.subject,
          status: logData.status,
          priority: logData.priority,
          sent_at: logData.sentAt?.toISOString(),
          delivered_at: logData.deliveredAt?.toISOString(),
          failed_at: logData.failedAt?.toISOString(),
          retry_count: logData.retryCount,
          max_retries: logData.maxRetries,
          next_retry_at: logData.nextRetryAt?.toISOString(),
          error_message: logData.errorMessage,
          error_code: logData.errorCode,
          smtp_response: logData.smtpResponse,
          delivery_attempts: logData.deliveryAttempts,
          metadata: logData.metadata,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to log delivery attempt: ${error.message}`);
      }

      return this.mapDeliveryLogFromDb(data);
    } catch (error) {
      console.error('Error logging delivery attempt:', error);
      throw error;
    }
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    logId: string,
    status: EmailDeliveryLog['status'],
    error?: string
  ): Promise<EmailDeliveryLog> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Set appropriate timestamp based on status
      switch (status) {
        case 'sent':
          updateData.sent_at = new Date().toISOString();
          break;
        case 'delivered':
          updateData.delivered_at = new Date().toISOString();
          break;
        case 'failed':
          updateData.failed_at = new Date().toISOString();
          if (error) {
            updateData.error_message = error;
          }
          break;
      }

      const { data, error: updateError } = await supabase
        .from('email_delivery_logs')
        .update(updateData)
        .eq('id', logId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update delivery status: ${updateError.message}`);
      }

      return this.mapDeliveryLogFromDb(data);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Add a delivery attempt
   */
  async addDeliveryAttempt(
    logId: string,
    attemptData: Omit<EmailDeliveryAttempt, 'id' | 'deliveryLogId'>
  ): Promise<EmailDeliveryAttempt> {
    try {
      const { data, error } = await supabase
        .from('email_delivery_attempts')
        .insert({
          delivery_log_id: logId,
          attempt_number: attemptData.attemptNumber,
          attempted_at: attemptData.attemptedAt.toISOString(),
          status: attemptData.status,
          error_message: attemptData.errorMessage,
          error_code: attemptData.errorCode,
          smtp_response: attemptData.smtpResponse,
          response_time_ms: attemptData.responseTimeMs,
          retry_after_ms: attemptData.retryAfterMs,
          metadata: attemptData.metadata,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add delivery attempt: ${error.message}`);
      }

      return this.mapDeliveryAttemptFromDb(data);
    } catch (error) {
      console.error('Error adding delivery attempt:', error);
      throw error;
    }
  }

  /**
   * Get failed deliveries that need retry
   */
  async getFailedDeliveriesForRetry(): Promise<EmailDeliveryLog[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_failed_deliveries_for_retry')
        .select('*');

      if (error) {
        throw new Error(`Failed to get failed deliveries: ${error.message}`);
      }

      return (data || []).map(this.mapDeliveryLogFromDb);
    } catch (error) {
      console.error('Error getting failed deliveries:', error);
      throw error;
    }
  }

  /**
   * Retry a failed delivery
   */
  async retryFailedDelivery(logId: string): Promise<EmailDeliveryLog> {
    try {
      // Get the delivery log
      const deliveryLog = await this.getDeliveryLogById(logId);
      if (!deliveryLog) {
        throw new Error(`Delivery log with ID ${logId} not found`);
      }

      if (deliveryLog.status !== 'failed') {
        throw new Error(`Delivery log ${logId} is not in failed status`);
      }

      if (deliveryLog.retryCount >= deliveryLog.maxRetries) {
        throw new Error(`Delivery log ${logId} has exceeded maximum retry attempts`);
      }

      // Calculate next retry time
      const retryDelay = this.calculateRetryDelay(deliveryLog.retryCount);
      const nextRetryAt = new Date(Date.now() + retryDelay);

      // Update the delivery log for retry
      const { data, error } = await supabase
        .from('email_delivery_logs')
        .update({
          status: 'pending',
          retry_count: deliveryLog.retryCount + 1,
          next_retry_at: nextRetryAt.toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', logId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update delivery log for retry: ${error.message}`);
      }

      console.log(`🔄 Scheduled retry for delivery log ${logId} in ${retryDelay}ms`);
      return this.mapDeliveryLogFromDb(data);
    } catch (error) {
      console.error('Error retrying failed delivery:', error);
      throw error;
    }
  }

  /**
   * Retry all failed deliveries
   */
  async retryAllFailedDeliveries(): Promise<{ success: number; failed: number }> {
    try {
      const failedDeliveries = await this.getFailedDeliveriesForRetry();
      let successCount = 0;
      let failedCount = 0;

      for (const delivery of failedDeliveries) {
        try {
          await this.retryFailedDelivery(delivery.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to retry delivery ${delivery.id}:`, error);
          failedCount++;
        }
      }

      console.log(`🔄 Retry operation completed: ${successCount} successful, ${failedCount} failed`);
      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('Error retrying all failed deliveries:', error);
      throw error;
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStatistics(filters?: EmailDeliveryFilters): Promise<EmailDeliveryStatistics[]> {
    try {
      let query = supabase
        .from('email_delivery_statistics')
        .select('*')
        .order('date', { ascending: false });

      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }

      if (filters?.emailType && filters.emailType.length > 0) {
        query = query.in('email_type', filters.emailType);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get delivery statistics: ${error.message}`);
      }

      return (data || []).map(this.mapDeliveryStatisticsFromDb);
    } catch (error) {
      console.error('Error getting delivery statistics:', error);
      throw error;
    }
  }

  /**
   * Get delivery logs with filters
   */
  async getDeliveryLogs(filters?: EmailDeliveryFilters, limit = 100): Promise<EmailDeliveryLog[]> {
    try {
      let query = supabase
        .from('email_delivery_logs')
        .select(`
          *,
          email_delivery_attempts (*)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.emailType && filters.emailType.length > 0) {
        query = query.in('email_type', filters.emailType);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      if (filters?.staffId) {
        query = query.eq('staff_id', filters.staffId);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters?.hasErrors) {
        query = query.not('error_message', 'is', null);
      }

      if (filters?.needsRetry) {
        query = query
          .eq('status', 'failed')
          .lt('retry_count', supabase.raw('max_retries'));
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get delivery logs: ${error.message}`);
      }

      return (data || []).map(this.mapDeliveryLogFromDb);
    } catch (error) {
      console.error('Error getting delivery logs:', error);
      throw error;
    }
  }

  /**
   * Get delivery log by ID
   */
  async getDeliveryLogById(logId: string): Promise<EmailDeliveryLog | null> {
    try {
      const { data, error } = await supabase
        .from('email_delivery_logs')
        .select(`
          *,
          email_delivery_attempts (*)
        `)
        .eq('id', logId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to get delivery log: ${error.message}`);
      }

      return this.mapDeliveryLogFromDb(data);
    } catch (error) {
      console.error('Error getting delivery log by ID:', error);
      throw error;
    }
  }

  /**
   * Cleanup old logs
   */
  async cleanupOldLogs(daysToKeep = 90): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_old_email_delivery_logs');

      if (error) {
        throw new Error(`Failed to cleanup old logs: ${error.message}`);
      }

      console.log(`🗑️ Cleaned up ${data} old email delivery logs`);
      return data;
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      throw error;
    }
  }

  /**
   * Check if an error is retryable
   */
  isRetryableError(error: string): boolean {
    const lowerError = error.toLowerCase();

    // Check non-retryable errors first
    for (const nonRetryableError of this.retryConfig.nonRetryableErrors) {
      if (lowerError.includes(nonRetryableError.toLowerCase())) {
        return false;
      }
    }

    // Check retryable errors
    for (const retryableError of this.retryConfig.retryableErrors) {
      if (lowerError.includes(retryableError.toLowerCase())) {
        return true;
      }
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    if (!this.retryConfig.exponentialBackoff) {
      return this.retryConfig.retryDelayMs;
    }

    // Exponential backoff: delay * (2 ^ retryCount)
    return this.retryConfig.retryDelayMs * Math.pow(2, retryCount);
  }

  /**
   * Map database record to EmailDeliveryLog
   */
  private mapDeliveryLogFromDb(data: any): EmailDeliveryLog {
    return {
      id: data.id,
      emailId: data.email_id,
      staffId: data.staff_id,
      jobExecutionId: data.job_execution_id,
      emailType: data.email_type,
      recipientEmail: data.recipient_email,
      subject: data.subject,
      status: data.status,
      priority: data.priority,
      createdAt: new Date(data.created_at),
      sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
      deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
      failedAt: data.failed_at ? new Date(data.failed_at) : undefined,
      retryCount: data.retry_count,
      maxRetries: data.max_retries,
      nextRetryAt: data.next_retry_at ? new Date(data.next_retry_at) : undefined,
      errorMessage: data.error_message,
      errorCode: data.error_code,
      smtpResponse: data.smtp_response,
      deliveryAttempts: (data.email_delivery_attempts || []).map(this.mapDeliveryAttemptFromDb),
      metadata: data.metadata || {},
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Map database record to EmailDeliveryAttempt
   */
  private mapDeliveryAttemptFromDb(data: any): EmailDeliveryAttempt {
    return {
      id: data.id,
      deliveryLogId: data.delivery_log_id,
      attemptNumber: data.attempt_number,
      attemptedAt: new Date(data.attempted_at),
      status: data.status,
      errorMessage: data.error_message,
      errorCode: data.error_code,
      smtpResponse: data.smtp_response,
      responseTimeMs: data.response_time_ms,
      retryAfterMs: data.retry_after_ms,
      metadata: data.metadata || {},
    };
  }

  /**
   * Map database record to EmailDeliveryStatistics
   */
  private mapDeliveryStatisticsFromDb(data: any): EmailDeliveryStatistics {
    return {
      id: data.id,
      date: data.date,
      emailType: data.email_type,
      totalEmails: data.total_emails,
      successfulDeliveries: data.successful_deliveries,
      failedDeliveries: data.failed_deliveries,
      pendingDeliveries: data.pending_deliveries,
      successRate: data.success_rate,
      averageDeliveryTimeMs: data.average_delivery_time_ms,
      totalRetries: data.total_retries,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

// Export singleton instance
export const emailDeliveryService = new EmailDeliveryService();
