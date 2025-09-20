import { supabase } from '@/lib/supabase';
import type { CreatePatient, Patient, PatientFilters, UpdatePatient } from '@/types';

export class PatientService {
  // Get all patients with optional filtering
  async getPatients(filters?: PatientFilters): Promise<Patient[]> {
    let query = supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.name) {
      query = query.ilike('name', `%${filters.name}%`);
    }

    if (filters?.phone) {
      query = query.ilike('phone', `%${filters.phone}%`);
    }

    if (filters?.area) {
      query = query.eq('area', filters.area);
    }

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.has_id_document !== undefined) {
      if (filters.has_id_document) {
        query = query.not('id_document_url', 'is', null);
      } else {
        query = query.is('id_document_url', null);
      }
    }

    if (filters?.has_coordinates !== undefined) {
      if (filters.has_coordinates) {
        query = query.not('latitude', 'is', null).not('longitude', 'is', null);
      } else {
        query = query.or('latitude.is.null,longitude.is.null');
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }

    return data || [];
  }

  // Get a single patient by ID
  async getPatient(id: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Patient not found
      }
      throw new Error(`Failed to fetch patient: ${error.message}`);
    }

    return data;
  }

  // Create a new patient
  async createPatient(patientData: CreatePatient): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert(patientData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create patient: ${error.message}`);
    }

    return data;
  }

  // Update an existing patient
  async updatePatient(id: string, updates: Partial<UpdatePatient>): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update patient: ${error.message}`);
    }

    return data;
  }

  // Delete a patient
  async deletePatient(id: string): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete patient: ${error.message}`);
    }
  }

  // Get unique areas for filtering
  async getAreas(): Promise<string[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('area')
      .not('area', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch areas: ${error.message}`);
    }

    const areas = [...new Set(data?.map(p => p.area) || [])];
    return areas.sort();
  }

  // Get unique cities for filtering
  async getCities(): Promise<string[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('city')
      .not('city', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch cities: ${error.message}`);
    }

    const cities = [...new Set(data?.map(p => p.city) || [])];
    return cities.sort();
  }

  // Search patients by name or phone
  async searchPatients(searchTerm: string): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search patients: ${error.message}`);
    }

    return data || [];
  }

  // Get patients by area
  async getPatientsByArea(area: string): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('area', area)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch patients by area: ${error.message}`);
    }

    return data || [];
  }

  // Get patients by city
  async getPatientsByCity(city: string): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('city', city)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch patients by city: ${error.message}`);
    }

    return data || [];
  }
}

// Export singleton instance
export const patientService = new PatientService();
export default patientService;
