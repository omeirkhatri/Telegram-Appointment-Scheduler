import { supabase } from '@/lib/supabase';
import type {
    CreateLead,
    Lead,
    LeadConversionResult,
    LeadFilters,
    LeadStage,
    UpdateLead
} from '@/types/lead';
import type { CreatePatient } from '@/types/patient';
import { LeadActivityService } from './leadActivityService';

export class LeadService {
  /**
   * Get leads with optional filters
   */
  static async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    let query = supabase
      .from('leads')
      .select(`
        *,
        assigned_to_user:user_profiles!assigned_to_user_id(id, full_name, email),
        created_by_user:user_profiles!created_by_user_id(id, full_name, email)
      `);

    if (filters?.stage && filters.stage.length > 0) {
      query = query.in('stage', filters.stage);
    }

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.assigned_to_user_id) {
      query = query.eq('assigned_to_user_id', filters.assigned_to_user_id);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters?.created_after) {
      query = query.gte('created_at', filters.created_after);
    }

    if (filters?.created_before) {
      query = query.lte('created_at', filters.created_before);
    }

    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get leads: ${error.message}`);
    }

    // Get counts for each lead
    const leadsWithCounts = await Promise.all(
      (data || []).map(async (lead) => {
        const [notesCount, quotesCount, activitiesCount] = await Promise.all([
          supabase.from('lead_notes').select('id', { count: 'exact' }).eq('lead_id', lead.id),
          supabase.from('lead_quotes').select('id', { count: 'exact' }).eq('lead_id', lead.id),
          supabase.from('lead_activities').select('id', { count: 'exact' }).eq('lead_id', lead.id),
        ]);

        return {
          ...lead,
          notes_count: notesCount.count || 0,
          quotes_count: quotesCount.count || 0,
          activities_count: activitiesCount.count || 0,
        };
      })
    );

    return leadsWithCounts;
  }

  /**
   * Get lead by ID
   */
  static async getLeadById(id: string): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_to_user:user_profiles!assigned_to_user_id(id, full_name, email),
        created_by_user:user_profiles!created_by_user_id(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get lead: ${error.message}`);
    }

    // Get counts
    const [notesCount, quotesCount, activitiesCount] = await Promise.all([
      supabase.from('lead_notes').select('id', { count: 'exact' }).eq('lead_id', id),
      supabase.from('lead_quotes').select('id', { count: 'exact' }).eq('lead_id', id),
      supabase.from('lead_activities').select('id', { count: 'exact' }).eq('lead_id', id),
    ]);

    return {
      ...data,
      notes_count: notesCount.count || 0,
      quotes_count: quotesCount.count || 0,
      activities_count: activitiesCount.count || 0,
    };
  }

  /**
   * Create new lead
   */
  static async createLead(data: CreateLead, userId: string): Promise<Lead> {
    // Get user info for activity logging
    const { data: user } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        ...data,
        created_by_user_id: userId,
        has_whatsapp: data.has_whatsapp ?? true,
        stage: data.stage || 'new',
        status: data.status || 'active',
        source: data.source || 'manual',
      })
      .select(`
        *,
        assigned_to_user:user_profiles!assigned_to_user_id(id, full_name, email),
        created_by_user:user_profiles!created_by_user_id(id, full_name, email)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create lead: ${error.message}`);
    }

    // Log creation activity
    await LeadActivityService.logActivity(
      lead.id,
      userId,
      'created',
      {
        description: `Lead created`,
        metadata: { source: data.source || 'manual' }
      }
    );

    return {
      ...lead,
      notes_count: 0,
      quotes_count: 0,
      activities_count: 1,
    };
  }

  /**
   * Update lead
   */
  static async updateLead(id: string, data: UpdateLead, userId: string): Promise<Lead> {
    // Get current lead data for comparison
    const currentLead = await this.getLeadById(id);

    const { data: lead, error } = await supabase
      .from('leads')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        assigned_to_user:user_profiles!assigned_to_user_id(id, full_name, email),
        created_by_user:user_profiles!created_by_user_id(id, full_name, email)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }

    // Log field updates
    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(data).forEach(key => {
      if (data[key as keyof UpdateLead] !== currentLead[key as keyof Lead]) {
        changes[key] = {
          old: currentLead[key as keyof Lead],
          new: data[key as keyof UpdateLead],
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      await LeadActivityService.logActivity(
        id,
        userId,
        'field_updated',
        {
          description: `Updated fields: ${Object.keys(changes).join(', ')}`,
          old_value: changes,
          new_value: data,
        }
      );
    }

    return {
      ...lead,
      notes_count: currentLead.notes_count,
      quotes_count: currentLead.quotes_count,
      activities_count: currentLead.activities_count,
    };
  }

  /**
   * Update lead stage
   */
  static async updateLeadStage(id: string, newStage: LeadStage, userId: string, reason?: string): Promise<Lead> {
    const currentLead = await this.getLeadById(id);

    const { data: lead, error } = await supabase
      .from('leads')
      .update({
        stage: newStage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        assigned_to_user:user_profiles!assigned_to_user_id(id, full_name, email),
        created_by_user:user_profiles!created_by_user_id(id, full_name, email)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update lead stage: ${error.message}`);
    }

    // Log stage change activity
    await LeadActivityService.logActivity(
      id,
      userId,
      'stage_changed',
      {
        description: `Stage changed from ${currentLead.stage} to ${newStage}${reason ? `: ${reason}` : ''}`,
        old_value: { stage: currentLead.stage },
        new_value: { stage: newStage },
        metadata: { reason },
      }
    );

    return {
      ...lead,
      notes_count: currentLead.notes_count,
      quotes_count: currentLead.quotes_count,
      activities_count: currentLead.activities_count,
    };
  }

  /**
   * Assign lead to user
   */
  static async assignLead(id: string, assignToUserId: string, assignedBy: string, reason?: string): Promise<Lead> {
    const currentLead = await this.getLeadById(id);

    // Get assignee info
    const { data: assignee } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', assignToUserId)
      .single();

    const { data: lead, error } = await supabase
      .from('leads')
      .update({
        assigned_to_user_id: assignToUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        assigned_to_user:user_profiles!assigned_to_user_id(id, full_name, email),
        created_by_user:user_profiles!created_by_user_id(id, full_name, email)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to assign lead: ${error.message}`);
    }

    // Log assignment activity
    await LeadActivityService.logActivity(
      id,
      assignedBy,
      'assigned',
      {
        description: `Assigned to ${assignee?.full_name || 'Unknown User'}${reason ? `: ${reason}` : ''}`,
        old_value: { assigned_to_user_id: currentLead.assigned_to_user_id },
        new_value: { assigned_to_user_id: assignToUserId },
        metadata: { reason, assignee_name: assignee?.full_name },
      }
    );

    return {
      ...lead,
      notes_count: currentLead.notes_count,
      quotes_count: currentLead.quotes_count,
      activities_count: currentLead.activities_count,
    };
  }

  /**
   * Convert lead to patient
   */
  static async convertLeadToPatient(leadId: string, userId: string, patientData?: Partial<CreatePatient>): Promise<LeadConversionResult> {
    const lead = await this.getLeadById(leadId);

    // Create patient from lead data
    const createPatientData: CreatePatient = {
      name: lead.name,
      phone: lead.phone,
      flat_villa_no: patientData?.flat_villa_no || lead.flat_villa_no || '',
      building_street: patientData?.building_street || lead.building_street || '',
      area: patientData?.area || lead.area || '',
      city: patientData?.city || lead.city || '',
      google_maps_link: lead.google_maps_link,
      medical_notes: patientData?.medical_notes || `Converted from lead. Original service interest: ${lead.service_interested_in || 'Not specified'}`,
      emergency_contact: patientData?.emergency_contact,
      preferred_transport: patientData?.preferred_transport,
      ...patientData,
    };

    // Create patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert(createPatientData)
      .select()
      .single();

    if (patientError) {
      throw new Error(`Failed to create patient: ${patientError.message}`);
    }

    // Update lead status
    const { data: updatedLead, error: leadError } = await supabase
      .from('leads')
      .update({
        status: 'converted',
        stage: 'converted',
        converted_patient_id: patient.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select(`
        *,
        assigned_to_user:user_profiles!assigned_to_user_id(id, full_name, email),
        created_by_user:user_profiles!created_by_user_id(id, full_name, email)
      `)
      .single();

    if (leadError) {
      throw new Error(`Failed to update lead: ${leadError.message}`);
    }

    // Log conversion activity
    await LeadActivityService.logActivity(
      leadId,
      userId,
      'converted',
      {
        description: `Lead converted to patient`,
        new_value: { converted_patient_id: patient.id },
        metadata: { patient_name: patient.name, patient_id: patient.id },
      }
    );

    return {
      lead: {
        ...updatedLead,
        notes_count: lead.notes_count,
        quotes_count: lead.quotes_count,
        activities_count: lead.activities_count,
      },
      patient,
    };
  }

  /**
   * Delete lead (admin only)
   */
  static async deleteLead(id: string): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete lead: ${error.message}`);
    }
  }

  /**
   * Get lead statistics
   */
  static async getLeadStatistics(): Promise<{
    total_leads: number;
    leads_by_stage: Record<string, number>;
    leads_by_status: Record<string, number>;
    conversion_rate: number;
  }> {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('stage, status');

    if (error) {
      throw new Error(`Failed to get lead statistics: ${error.message}`);
    }

    const total_leads = leads.length;
    const converted_leads = leads.filter(lead => lead.status === 'converted').length;
    const conversion_rate = total_leads > 0 ? (converted_leads / total_leads) * 100 : 0;

    const leads_by_stage = leads.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const leads_by_status = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_leads,
      leads_by_stage,
      leads_by_status,
      conversion_rate,
    };
  }
}
