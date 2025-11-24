import type { CreateLead, Lead, LeadFilters, UpdateLead } from '@/types/lead';
import { MockLeadDetailService } from './mockLeadDetailService';

// Mock data for demonstration
const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'John Smith',
    phone: '+971501234567',
    whatsapp_number: '+971501234567',
    has_whatsapp: true,
    email: 'john.smith@email.com',
    service_interested_in: 'Baby Care',
    flat_villa_no: 'Villa 123',
    building_street: 'Al Wasl Road',
    area: 'Jumeirah',
    city: 'Dubai',
    google_maps_link: 'https://maps.google.com/example',
    stage: 'new',
    status: 'active',
    source: 'google_sheets',
    google_sheet_row_id: 'row_1',
    assigned_to_user_id: null,
    converted_patient_id: null,
    created_by_user_id: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    phone: '+971509876543',
    whatsapp_number: '+971509876543',
    has_whatsapp: true,
    email: 'sarah.j@email.com',
    service_interested_in: 'Elderly Care',
    flat_villa_no: 'Apt 456',
    building_street: 'Sheikh Zayed Road',
    area: 'Downtown',
    city: 'Dubai',
    google_maps_link: null,
    stage: 'contacted',
    status: 'active',
    source: 'google_sheets',
    google_sheet_row_id: 'row_2',
    assigned_to_user_id: 'mock-user',
    converted_patient_id: null,
    created_by_user_id: 'mock-user',
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    name: 'Ahmed Al-Rashid',
    phone: '+971501112223',
    whatsapp_number: '+971501112223',
    has_whatsapp: true,
    email: 'ahmed.rashid@email.com',
    service_interested_in: 'Post-Surgery Care',
    flat_villa_no: 'Villa 789',
    building_street: 'Al Barsha',
    area: 'Al Barsha',
    city: 'Dubai',
    google_maps_link: null,
    stage: 'quoted',
    status: 'active',
    source: 'google_sheets',
    google_sheet_row_id: 'row_3',
    assigned_to_user_id: 'mock-user',
    converted_patient_id: null,
    created_by_user_id: 'mock-user',
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '4',
    name: 'Maria Garcia',
    phone: '+971504445556',
    whatsapp_number: '+971504445556',
    has_whatsapp: true,
    email: 'maria.garcia@email.com',
    service_interested_in: 'Baby Care',
    flat_villa_no: 'Apt 101',
    building_street: 'Marina Walk',
    area: 'Dubai Marina',
    city: 'Dubai',
    google_maps_link: null,
    stage: 'qualified',
    status: 'active',
    source: 'google_sheets',
    google_sheet_row_id: 'row_4',
    assigned_to_user_id: 'mock-user',
    converted_patient_id: null,
    created_by_user_id: 'mock-user',
    created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: '5',
    name: 'David Wilson',
    phone: '+971507778889',
    whatsapp_number: '+971507778889',
    has_whatsapp: false,
    email: 'david.wilson@email.com',
    service_interested_in: 'Elderly Care',
    flat_villa_no: 'Villa 202',
    building_street: 'Palm Jumeirah',
    area: 'Palm Jumeirah',
    city: 'Dubai',
    google_maps_link: null,
    stage: 'not_qualified',
    status: 'active',
    source: 'google_sheets',
    google_sheet_row_id: 'row_5',
    assigned_to_user_id: null,
    converted_patient_id: null,
    created_by_user_id: 'mock-user',
    created_at: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    updated_at: new Date(Date.now() - 345600000).toISOString(),
  },
];

export class MockLeadService {
  static async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    let filteredLeads = [...mockLeads];

    if (filters) {
      if (filters.stage && filters.stage.length > 0) {
        filteredLeads = filteredLeads.filter(lead =>
          filters.stage!.includes(lead.stage)
        );
      }

      if (filters.status && filters.status.length > 0) {
        filteredLeads = filteredLeads.filter(lead =>
          filters.status!.includes(lead.status)
        );
      }

      if (filters.assigned_to_user_id) {
        filteredLeads = filteredLeads.filter(lead =>
          lead.assigned_to_user_id === filters.assigned_to_user_id
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredLeads = filteredLeads.filter(lead =>
          lead.name.toLowerCase().includes(searchTerm) ||
          lead.phone.includes(searchTerm) ||
          lead.email?.toLowerCase().includes(searchTerm) ||
          lead.service_interested_in?.toLowerCase().includes(searchTerm)
        );
      }
    }

    return filteredLeads.map(lead => {
      const counts = MockLeadDetailService.getLeadCounts(lead.id);
      return {
        ...lead,
        notes_count: counts.notes,
        quotes_count: counts.quotes,
        activities_count: counts.activities,
        new_notes_count: counts.newNotes,
        new_quotes_count: counts.newQuotes,
      };
    });
  }

  static async getLeadById(id: string): Promise<Lead> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const lead = mockLeads.find(l => l.id === id);
    if (!lead) {
      throw new Error('Lead not found');
    }
    const counts = MockLeadDetailService.getLeadCounts(lead.id);
    return {
      ...lead,
      notes_count: counts.notes,
      quotes_count: counts.quotes,
      activities_count: counts.activities,
      new_notes_count: counts.newNotes,
      new_quotes_count: counts.newQuotes,
    };
  }

  static async createLead(data: CreateLead, userId: string): Promise<Lead> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const newLead: Lead = {
      id: (mockLeads.length + 1).toString(),
      ...data,
      created_by_user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockLeads.unshift(newLead);
    MockLeadDetailService.initializeLead(newLead.id);

    return {
      ...newLead,
      notes_count: 0,
      quotes_count: 0,
      activities_count: 0,
      new_notes_count: 0,
      new_quotes_count: 0,
    };
  }

  static async updateLead(id: string, data: UpdateLead, userId: string): Promise<Lead> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const leadIndex = mockLeads.findIndex(l => l.id === id);
    if (leadIndex === -1) {
      throw new Error('Lead not found');
    }

    mockLeads[leadIndex] = {
      ...mockLeads[leadIndex],
      ...data,
      updated_at: new Date().toISOString(),
    };

    const counts = MockLeadDetailService.getLeadCounts(id);

    return {
      ...mockLeads[leadIndex],
      notes_count: counts.notes,
      quotes_count: counts.quotes,
      activities_count: counts.activities,
      new_notes_count: counts.newNotes,
      new_quotes_count: counts.newQuotes,
    };
  }

  static async updateLeadStage(id: string, newStage: string, userId: string, reason?: string): Promise<Lead> {
    return this.updateLead(id, { stage: newStage as any }, userId);
  }

  static async assignLead(id: string, assignToUserId: string, assignedBy: string, reason?: string): Promise<Lead> {
    return this.updateLead(id, { assigned_to_user_id: assignToUserId }, assignedBy);
  }

  static async deleteLead(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const leadIndex = mockLeads.findIndex(l => l.id === id);
    if (leadIndex === -1) {
      throw new Error('Lead not found');
    }

    mockLeads.splice(leadIndex, 1);
    MockLeadDetailService.removeLead(id);
  }

  static async convertLeadToPatient(leadId: string, userId: string, patientData?: any): Promise<{ lead: Lead; patient: any }> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const lead = await this.getLeadById(leadId);

    // Mock patient creation
    const patient = {
      id: `patient-${leadId}`,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      address: `${lead.flat_villa_no}, ${lead.building_street}, ${lead.area}, ${lead.city}`,
      created_at: new Date().toISOString(),
    };

    // Update lead to converted status
    const updatedLead = await this.updateLead(leadId, {
      stage: 'converted',
      status: 'converted',
      converted_patient_id: patient.id
    }, userId);

    return { lead: updatedLead, patient };
  }
}


