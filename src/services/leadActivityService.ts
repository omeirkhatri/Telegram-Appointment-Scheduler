import { supabase } from '@/lib/supabase';
import type { LeadActivity, LeadActivityType } from '@/types/lead';

export class LeadActivityService {
  /**
   * Log activity for a lead
   */
  static async logActivity(
    leadId: string,
    userId: string,
    activityType: LeadActivityType,
    data: {
      description: string;
      old_value?: Record<string, unknown>;
      new_value?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }
  ): Promise<LeadActivity> {
    // Get user name for denormalization
    const { data: user } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        user_id: userId,
        user_name: user?.full_name || 'Unknown User',
        activity_type: activityType,
        description: data.description,
        old_value: data.old_value,
        new_value: data.new_value,
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log activity: ${error.message}`);
    }

    return activity;
  }

  /**
   * Get activities for a lead
   */
  static async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get lead activities: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get recent activities across all leads
   */
  static async getRecentActivities(limit: number = 50): Promise<LeadActivity[]> {
    const { data, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent activities: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get activities by user
   */
  static async getUserActivities(userId: string, limit: number = 100): Promise<LeadActivity[]> {
    const { data, error } = await supabase
      .from('lead_activities')
      .select(`
        *,
        lead:leads(id, name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user activities: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Helper: Log stage change
   */
  static async logStageChange(
    leadId: string,
    userId: string,
    oldStage: string,
    newStage: string,
    reason?: string
  ): Promise<LeadActivity> {
    return this.logActivity(leadId, userId, 'stage_changed', {
      description: `Stage changed from ${oldStage} to ${newStage}${reason ? `: ${reason}` : ''}`,
      old_value: { stage: oldStage },
      new_value: { stage: newStage },
      metadata: { reason },
    });
  }

  /**
   * Helper: Log assignment
   */
  static async logAssignment(
    leadId: string,
    userId: string,
    oldAssigneeId: string | null,
    newAssigneeId: string,
    assigneeName: string,
    reason?: string
  ): Promise<LeadActivity> {
    return this.logActivity(leadId, userId, 'assigned', {
      description: `Assigned to ${assigneeName}${reason ? `: ${reason}` : ''}`,
      old_value: { assigned_to_user_id: oldAssigneeId },
      new_value: { assigned_to_user_id: newAssigneeId },
      metadata: { reason, assignee_name: assigneeName },
    });
  }

  /**
   * Helper: Log field update
   */
  static async logFieldUpdate(
    leadId: string,
    userId: string,
    fieldName: string,
    oldValue: unknown,
    newValue: unknown,
    description?: string
  ): Promise<LeadActivity> {
    return this.logActivity(leadId, userId, 'field_updated', {
      description: description || `Updated ${fieldName}`,
      old_value: { [fieldName]: oldValue },
      new_value: { [fieldName]: newValue },
      metadata: { field_name: fieldName },
    });
  }

  /**
   * Helper: Log note addition
   */
  static async logNoteAdded(
    leadId: string,
    userId: string,
    noteId: string,
    notePreview: string
  ): Promise<LeadActivity> {
    return this.logActivity(leadId, userId, 'note_added', {
      description: `Added note: ${notePreview.substring(0, 50)}${notePreview.length > 50 ? '...' : ''}`,
      new_value: { note_id: noteId },
      metadata: { note_preview: notePreview },
    });
  }

  /**
   * Helper: Log quote sent
   */
  static async logQuoteSent(
    leadId: string,
    userId: string,
    quoteId: string,
    serviceType: string,
    amount?: number
  ): Promise<LeadActivity> {
    return this.logActivity(leadId, userId, 'quote_sent', {
      description: `Quote sent for ${serviceType}${amount ? ` (${amount} AED)` : ''}`,
      new_value: { quote_id: quoteId },
      metadata: { service_type: serviceType, amount },
    });
  }

  /**
   * Helper: Log conversion
   */
  static async logConversion(
    leadId: string,
    userId: string,
    patientId: string,
    patientName: string
  ): Promise<LeadActivity> {
    return this.logActivity(leadId, userId, 'converted', {
      description: `Lead converted to patient: ${patientName}`,
      new_value: { converted_patient_id: patientId },
      metadata: { patient_name: patientName, patient_id: patientId },
    });
  }

  /**
   * Get activity statistics
   */
  static async getActivityStatistics(): Promise<{
    total_activities: number;
    activities_by_type: Record<string, number>;
    recent_activity_count: number;
  }> {
    const { data: activities, error } = await supabase
      .from('lead_activities')
      .select('activity_type, created_at');

    if (error) {
      throw new Error(`Failed to get activity statistics: ${error.message}`);
    }

    const total_activities = activities.length;
    const activities_by_type = activities.reduce((acc, activity) => {
      acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count activities from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent_activity_count = activities.filter(
      activity => activity.created_at > oneDayAgo
    ).length;

    return {
      total_activities,
      activities_by_type,
      recent_activity_count,
    };
  }
}



