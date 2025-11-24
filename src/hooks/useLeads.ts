'use client';

import type { CreateLead, Lead, LeadFilters as LeadFiltersType, UpdateLead } from '@/types/lead';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Mock data for development
const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    name: 'John Smith',
    phone: '+971501234567',
    email: 'john.smith@email.com',
    stage: 'new',
    status: 'active',
    source: 'google_sheets',
    service_interested_in: 'Physiotherapy',
    flat_villa_no: 'Villa 123',
    building_street: 'Al Wasl Road',
    area: 'Jumeirah',
    city: 'Dubai',
    google_maps_link: 'https://maps.google.com/example',
    has_whatsapp: true,
    whatsapp_number: '+971501234567',
    assigned_to_user_id: 'user1',
    assigned_to_user: {
      id: 'user1',
      full_name: 'Dr. Sarah Johnson',
      email: 'sarah@clinic.com'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_contacted_at: null,
    priority: 'medium',
    tags: ['urgent', 'follow-up'],
    rejection_reason: null,
    next_follow_up_at: null,
    response_time_minutes: null,
    conversion_probability: 75,
    automation_metadata: {},
    notes_count: 2,
    quotes_count: 1
  },
  {
    id: '2',
    name: 'Maria Garcia',
    phone: '+971502345678',
    email: 'maria.garcia@email.com',
    stage: 'contacted',
    status: 'active',
    source: 'manual',
    service_interested_in: 'Nursing Care',
    flat_villa_no: 'Apt 456',
    building_street: 'Sheikh Zayed Road',
    area: 'Downtown',
    city: 'Dubai',
    google_maps_link: null,
    has_whatsapp: false,
    whatsapp_number: null,
    assigned_to_user_id: 'user2',
    assigned_to_user: {
      id: 'user2',
      full_name: 'Nurse Ahmed',
      email: 'ahmed@clinic.com'
    },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    last_contacted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    tags: ['elderly-care'],
    rejection_reason: null,
    next_follow_up_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    response_time_minutes: 15,
    conversion_probability: 85,
    automation_metadata: { last_automation: 'welcome_email_sent' },
    notes_count: 3,
    quotes_count: 0
  },
  {
    id: '3',
    name: 'David Wilson',
    phone: '+971503456789',
    email: 'david.wilson@email.com',
    stage: 'quoted',
    status: 'active',
    source: 'google_sheets',
    service_interested_in: 'Caregiver',
    flat_villa_no: 'Villa 789',
    building_street: 'Palm Jumeirah',
    area: 'Palm Jumeirah',
    city: 'Dubai',
    google_maps_link: 'https://maps.google.com/palm',
    has_whatsapp: true,
    whatsapp_number: '+971503456789',
    assigned_to_user_id: 'user1',
    assigned_to_user: {
      id: 'user1',
      full_name: 'Dr. Sarah Johnson',
      email: 'sarah@clinic.com'
    },
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    last_contacted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'urgent',
    tags: ['immediate-need'],
    rejection_reason: null,
    next_follow_up_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    response_time_minutes: 5,
    conversion_probability: 90,
    automation_metadata: { quote_sent: true },
    notes_count: 5,
    quotes_count: 2
  }
];

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load leads on mount
  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLeads(MOCK_LEADS);
        setError(null);
      } catch (err) {
        setError('Failed to load leads');
        console.error('Error loading leads:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, []);

  // Create lead
  const createLead = useCallback(async (leadData: CreateLead): Promise<Lead> => {
    try {
      const newLead: Lead = {
        id: Date.now().toString(),
        ...leadData,
        stage: leadData.stage || 'new',
        status: leadData.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_contacted_at: null,
        priority: leadData.priority || 'medium',
        tags: leadData.tags || [],
        rejection_reason: null,
        next_follow_up_at: leadData.next_follow_up_at || null,
        response_time_minutes: null,
        conversion_probability: 50,
        automation_metadata: {},
        notes_count: 0,
        quotes_count: 0
      };

      setLeads(prev => [newLead, ...prev]);
      return newLead;
    } catch (err) {
      console.error('Error creating lead:', err);
      throw err;
    }
  }, []);

  // Update lead
  const updateLead = useCallback(async (leadId: string, updates: UpdateLead): Promise<Lead> => {
    try {
      const updatedLead = leads.find(lead => lead.id === leadId);
      if (!updatedLead) {
        throw new Error('Lead not found');
      }

      const newLead: Lead = {
        ...updatedLead,
        ...updates,
        updated_at: new Date().toISOString()
      };

      setLeads(prev => prev.map(lead => lead.id === leadId ? newLead : lead));
      return newLead;
    } catch (err) {
      console.error('Error updating lead:', err);
      throw err;
    }
  }, [leads]);

  // Delete lead
  const deleteLead = useCallback(async (leadId: string): Promise<void> => {
    try {
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
    } catch (err) {
      console.error('Error deleting lead:', err);
      throw err;
    }
  }, []);

  // Update lead stage
  const updateLeadStage = useCallback(async (leadId: string, newStage: string): Promise<Lead> => {
    return updateLead(leadId, { stage: newStage as any });
  }, [updateLead]);

  // Filter leads
  const filterLeads = useCallback((filters: LeadFiltersType): Lead[] => {
    return leads.filter(lead => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch =
          lead.name.toLowerCase().includes(searchTerm) ||
          lead.phone.includes(searchTerm) ||
          lead.email?.toLowerCase().includes(searchTerm) ||
          lead.service_interested_in?.toLowerCase().includes(searchTerm);

        if (!matchesSearch) return false;
      }

      // Stage filter
      if (filters.stage && filters.stage.length > 0) {
        if (!filters.stage.includes(lead.stage)) return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(lead.status)) return false;
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(lead.priority)) return false;
      }

      // Assigned user filter
      if (filters.assigned_to_user_id) {
        if (filters.assigned_to_user_id === 'unassigned') {
          if (lead.assigned_to_user_id) return false;
        } else {
          if (lead.assigned_to_user_id !== filters.assigned_to_user_id) return false;
        }
      }

      // Source filter
      if (filters.source) {
        if (lead.source !== filters.source) return false;
      }

      // Date filters
      if (filters.created_after) {
        const createdDate = new Date(lead.created_at);
        const filterDate = new Date(filters.created_after);
        if (createdDate < filterDate) return false;
      }

      if (filters.created_before) {
        const createdDate = new Date(lead.created_at);
        const filterDate = new Date(filters.created_before);
        if (createdDate > filterDate) return false;
      }

      // Last contacted filters
      if (filters.last_contacted_after && lead.last_contacted_at) {
        const lastContactedDate = new Date(lead.last_contacted_at);
        const filterDate = new Date(filters.last_contacted_after);
        if (lastContactedDate < filterDate) return false;
      }

      if (filters.last_contacted_before && lead.last_contacted_at) {
        const lastContactedDate = new Date(lead.last_contacted_at);
        const filterDate = new Date(filters.last_contacted_before);
        if (lastContactedDate > filterDate) return false;
      }

      // Conversion probability filters
      if (filters.conversion_probability_min !== undefined) {
        if (lead.conversion_probability < filters.conversion_probability_min) return false;
      }

      if (filters.conversion_probability_max !== undefined) {
        if (lead.conversion_probability > filters.conversion_probability_max) return false;
      }

      // Special filters
      if (filters.stale_leads) {
        const daysSinceContact = lead.last_contacted_at
          ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceContact < 7) return false;
      }

      if (filters.lost_leads) {
        const daysSinceContact = lead.last_contacted_at
          ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceContact < 30) return false;
      }

      return true;
    });
  }, [leads]);

  // Memoized statistics
  const statistics = useMemo(() => {
    const total = leads.length;
    const converted = leads.filter(lead => lead.stage === 'converted').length;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;
    const staleLeads = leads.filter(lead => {
      const daysSinceContact = lead.last_contacted_at
        ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceContact >= 7;
    }).length;

    return {
      total,
      converted,
      conversionRate,
      staleLeads
    };
  }, [leads]);

  return {
    leads,
    loading,
    error,
    createLead,
    updateLead,
    deleteLead,
    updateLeadStage,
    filterLeads,
    statistics
  };
}
