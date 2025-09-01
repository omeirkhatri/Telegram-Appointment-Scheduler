// Patient types based on database schema
export interface Patient {
  id: string;
  name: string;
  phone: string;
  id_document_url?: string;
  id_document_filename?: string;
  flat_villa_no: string;
  building_street: string;
  area: string;
  city: string;
  google_maps_link?: string;
  medical_notes?: string;
  emergency_contact?: string;
  preferred_transport?: string;
  created_at: string;
  updated_at: string;
}

// Patient creation type (without id and timestamps)
export interface CreatePatient {
  name: string;
  phone: string;
  id_document_url?: string;
  id_document_filename?: string;
  flat_villa_no: string;
  building_street: string;
  area: string;
  city: string;
  google_maps_link?: string;
  medical_notes?: string;
  emergency_contact?: string;
  preferred_transport?: string;
}

// Patient update type (all fields optional except id)
export interface UpdatePatient {
  id: string;
  name?: string;
  phone?: string;
  id_document_url?: string;
  id_document_filename?: string;
  flat_villa_no?: string;
  building_street?: string;
  area?: string;
  city?: string;
  google_maps_link?: string;
  medical_notes?: string;
  emergency_contact?: string;
  preferred_transport?: string;
}

// Patient search/filter options
export interface PatientFilters {
  name?: string;
  phone?: string;
  area?: string;
  city?: string;
  has_id_document?: boolean;
}

// Patient address type for convenience
export interface PatientAddress {
  flat_villa_no: string;
  building_street: string;
  area: string;
  city: string;
  google_maps_link?: string;
}

// Helper function to get full address
export function getPatientFullAddress(patient: Patient): string {
  return `${patient.flat_villa_no}, ${patient.building_street}, ${patient.area}, ${patient.city}`;
}

// Helper function to validate phone number
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[+]?[0-9\s\-\(\)]+$/;
  return phoneRegex.test(phone);
}

// Helper function to validate required fields
export function validatePatientData(data: CreatePatient): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('Name is required');
  }

  if (!data.phone?.trim()) {
    errors.push('Phone number is required');
  } else if (!isValidPhoneNumber(data.phone)) {
    errors.push('Invalid phone number format');
  }

  if (!data.flat_villa_no?.trim()) {
    errors.push('Flat/Villa number is required');
  }

  if (!data.building_street?.trim()) {
    errors.push('Building/Street is required');
  }

  if (!data.area?.trim()) {
    errors.push('Area is required');
  }

  if (!data.city?.trim()) {
    errors.push('City is required');
  }

  return errors;
}
