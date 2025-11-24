// Lead management types based on database schema

// Lead stage type
export type LeadStage = 'new' | 'contacted' | 'quoted' | 'qualified' | 'not_qualified' | 'converted';

// Lead status type
export type LeadStatus = 'active' | 'inactive' | 'converted';

// Lead priority type
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

// Lead activity type
export type LeadActivityType = 'created' | 'stage_changed' | 'assigned' | 'note_added' | 'quote_sent' | 'field_updated' | 'converted';

// Quote status type
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

// Sync status type
export type SyncStatus = 'running' | 'completed' | 'failed';

// Main Lead interface
export interface Lead {
  id: string;
  name: string;
  phone: string;
  whatsapp_number?: string;
  has_whatsapp: boolean;
  email?: string;
  service_interested_in?: string;
  flat_villa_no?: string;
  building_street?: string;
  area?: string;
  city?: string;
  google_maps_link?: string;
  stage: LeadStage;
  status: LeadStatus;
  source: string;
  google_sheet_row_id?: string;
  assigned_to_user_id?: string;
  converted_patient_id?: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  // New enhanced fields
  last_contacted_at?: string;
  priority: LeadPriority;
  tags: string[];
  rejection_reason?: string;
  next_follow_up_at?: string;
  response_time_minutes?: number;
  conversion_probability: number;
  automation_metadata: Record<string, unknown>;
  // Populated fields
  assigned_to_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  // Counts for UI
  notes_count?: number;
  quotes_count?: number;
  activities_count?: number;
  new_notes_count?: number;
  new_quotes_count?: number;
}

// Lead creation type
export interface CreateLead {
  name: string;
  phone: string;
  whatsapp_number?: string;
  has_whatsapp?: boolean;
  email?: string;
  service_interested_in?: string;
  flat_villa_no?: string;
  building_street?: string;
  area?: string;
  city?: string;
  google_maps_link?: string;
  stage?: LeadStage;
  status?: LeadStatus;
  source?: string;
  google_sheet_row_id?: string;
  assigned_to_user_id?: string;
  priority?: LeadPriority;
  tags?: string[];
  next_follow_up_at?: string;
}

// Lead update type
export interface UpdateLead {
  name?: string;
  phone?: string;
  whatsapp_number?: string;
  has_whatsapp?: boolean;
  email?: string;
  service_interested_in?: string;
  flat_villa_no?: string;
  building_street?: string;
  area?: string;
  city?: string;
  google_maps_link?: string;
  stage?: LeadStage;
  status?: LeadStatus;
  assigned_to_user_id?: string;
  priority?: LeadPriority;
  tags?: string[];
  rejection_reason?: string;
  next_follow_up_at?: string;
  conversion_probability?: number;
}

// Lead filters for search
export interface LeadFilters {
  stage?: LeadStage[];
  status?: LeadStatus[];
  assigned_to_user_id?: string;
  search?: string; // Search in name, phone, email
  created_after?: string;
  created_before?: string;
  source?: string;
  priority?: LeadPriority[];
  tags?: string[];
  last_contacted_after?: string;
  last_contacted_before?: string;
  next_follow_up_after?: string;
  next_follow_up_before?: string;
  conversion_probability_min?: number;
  conversion_probability_max?: number;
  stale_leads?: boolean; // Leads not contacted in 7+ days
  lost_leads?: boolean; // Leads inactive 30+ days
}

// Lead Activity interface
export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  activity_type: LeadActivityType;
  description: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Create lead activity type
export interface CreateLeadActivity {
  lead_id: string;
  user_id: string;
  user_name: string;
  activity_type: LeadActivityType;
  description: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Lead Note interface
export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string;
  user_name: string;
  note: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// Create lead note type
export interface CreateLeadNote {
  lead_id: string;
  user_id: string;
  user_name: string;
  note: string;
  is_pinned?: boolean;
}

// Update lead note type
export interface UpdateLeadNote {
  note?: string;
  is_pinned?: boolean;
}

// Lead Quote interface
export interface LeadQuote {
  id: string;
  lead_id: string;
  service_type: string;
  description?: string;
  amount?: number;
  currency: string;
  status: QuoteStatus;
  sent_at?: string;
  sent_by_user_id?: string;
  sent_by_user_name?: string;
  created_at: string;
  updated_at: string;
}

// Create lead quote type
export interface CreateLeadQuote {
  lead_id: string;
  service_type: string;
  description?: string;
  amount?: number;
  currency?: string;
  status?: QuoteStatus;
}

// Update lead quote type
export interface UpdateLeadQuote {
  service_type?: string;
  description?: string;
  amount?: number;
  currency?: string;
  status?: QuoteStatus;
}

// Google Sheets Sync Log interface
export interface GoogleSheetsSyncLog {
  id: string;
  sync_started_at: string;
  sync_completed_at?: string;
  rows_processed: number;
  new_leads_created: number;
  errors?: Record<string, unknown>;
  status: SyncStatus;
  created_at: string;
}

// Lead conversion result
export interface LeadConversionResult {
  lead: Lead;
  patient: {
    id: string;
    name: string;
    phone: string;
    // Other patient fields
  };
}

// Lead statistics
export interface LeadStatistics {
  total_leads: number;
  leads_by_stage: Record<LeadStage, number>;
  leads_by_status: Record<LeadStatus, number>;
  conversion_rate: number;
  avg_time_in_stage: Record<LeadStage, number>;
  recent_activities: LeadActivity[];
}

// Helper functions
export function getLeadFullAddress(lead: Lead): string {
  if (!lead.flat_villa_no || !lead.building_street || !lead.area || !lead.city) {
    return '';
  }
  return `${lead.flat_villa_no}, ${lead.building_street}, ${lead.area}, ${lead.city}`;
}

export function getLeadDisplayPhone(lead: Lead): string {
  return lead.whatsapp_number || lead.phone;
}

export function getLeadStageColor(stage: LeadStage): string {
  const colors = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    quoted: 'bg-purple-100 text-purple-800',
    qualified: 'bg-green-100 text-green-800',
    not_qualified: 'bg-red-100 text-red-800',
    converted: 'bg-gray-100 text-gray-800',
  };
  return colors[stage];
}

export function getQuoteStatusColor(status: QuoteStatus): string {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status];
}

export function getActivityTypeIcon(activityType: LeadActivityType): string {
  const icons = {
    created: 'Plus',
    stage_changed: 'ArrowRight',
    assigned: 'UserPlus',
    note_added: 'MessageSquare',
    quote_sent: 'Send',
    field_updated: 'Edit',
    converted: 'CheckCircle',
  };
  return icons[activityType];
}

export function getLeadPriorityColor(priority: LeadPriority): string {
  const colors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };
  return colors[priority];
}

export function getLeadPriorityIcon(priority: LeadPriority): string {
  const icons = {
    low: '⬇️',
    medium: '➡️',
    high: '⬆️',
    urgent: '🚨',
  };
  return icons[priority];
}

export function getDaysSinceLastContact(lead: Lead): number {
  const lastContact = lead.last_contacted_at || lead.created_at;
  const now = new Date();
  const lastContactDate = new Date(lastContact);
  const diffTime = Math.abs(now.getTime() - lastContactDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isStaleLead(lead: Lead, daysThreshold: number = 7): boolean {
  return getDaysSinceLastContact(lead) >= daysThreshold;
}

export function isLostLead(lead: Lead, daysThreshold: number = 30): boolean {
  return getDaysSinceLastContact(lead) >= daysThreshold &&
         (lead.stage === 'not_qualified' || lead.status === 'inactive');
}

export function getConversionProbabilityColor(probability: number): string {
  if (probability >= 80) return 'bg-green-100 text-green-800';
  if (probability >= 60) return 'bg-blue-100 text-blue-800';
  if (probability >= 40) return 'bg-yellow-100 text-yellow-800';
  if (probability >= 20) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

export function getServiceTypeIcon(serviceType?: string): string {
  if (!serviceType) return '🏥';

  const service = serviceType.toLowerCase();
  if (service.includes('physio') || service.includes('therapy')) return '🏃‍♂️';
  if (service.includes('nanny') || service.includes('baby')) return '👶';
  if (service.includes('caregiver') || service.includes('elderly')) return '👴';
  if (service.includes('nurse') || service.includes('medical')) return '👩‍⚕️';
  if (service.includes('post') || service.includes('surgery')) return '🏥';

  return '🏥';
}

// Validation helpers
export function validateLeadData(data: CreateLead): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Name is required');
  }

  if (!data.phone?.trim()) {
    errors.push('Phone number is required');
  } else if (!/^[+]?[0-9\s\-\(\)]+$/.test(data.phone)) {
    errors.push('Invalid phone number format');
  }

  if (data.whatsapp_number && !/^[+]?[0-9\s\-\(\)]+$/.test(data.whatsapp_number)) {
    errors.push('Invalid WhatsApp number format');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  return errors;
}

export function validateQuoteData(data: CreateLeadQuote): string[] {
  const errors: string[] = [];

  if (!data.service_type?.trim()) {
    errors.push('Service type is required');
  }

  if (data.amount !== undefined && data.amount < 0) {
    errors.push('Amount cannot be negative');
  }

  return errors;
}
