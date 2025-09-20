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
  latitude?: number;
  longitude?: number;
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
  latitude?: number;
  longitude?: number;
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
  latitude?: number;
  longitude?: number;
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
  has_coordinates?: boolean;
}

// Patient address type for convenience
export interface PatientAddress {
  flat_villa_no: string;
  building_street: string;
  area: string;
  city: string;
  google_maps_link?: string;
  latitude?: number;
  longitude?: number;
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

// Helper function to validate coordinates
export function isValidCoordinate(value: number, type: 'latitude' | 'longitude'): boolean {
  if (type === 'latitude') {
    return value >= -90 && value <= 90;
  } else {
    return value >= -180 && value <= 180;
  }
}

// Helper function to parse coordinates from various formats
export function parseCoordinates(coordinateString: string): { latitude: number; longitude: number } | null {
  if (!coordinateString?.trim()) return null;

  const trimmed = coordinateString.trim();

  // Support multiple separators: comma, semicolon, space, tab
  const separators = [',', ';', ' ', '\t'];
  let parts: string[] = [];

  for (const separator of separators) {
    if (trimmed.includes(separator)) {
      parts = trimmed.split(separator).map(part => part.trim());
      break;
    }
  }

  // If no separator found, try to split by common patterns
  if (parts.length === 0) {
    // Try to match patterns like "25.157134 55.409436" or "25.157134,55.409436"
    const match = trimmed.match(/^(-?\d+\.?\d*)\s*[,;]\s*(-?\d+\.?\d*)$/);
    if (match) {
      parts = [match[1], match[2]];
    } else {
      return null;
    }
  }

  if (parts.length !== 2) return null;

  const latitude = parseFloat(parts[0]);
  const longitude = parseFloat(parts[1]);

  // Check if parsing was successful and coordinates are valid
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (!isValidCoordinate(latitude, 'latitude') || !isValidCoordinate(longitude, 'longitude')) return null;

  return { latitude, longitude };
}

// Helper function to format coordinates for display
export function formatCoordinates(latitude?: number, longitude?: number): string {
  if (latitude === undefined || longitude === undefined) return '';
  return `${latitude}, ${longitude}`;
}

// Helper function to extract coordinates from Google Maps URL
export function extractCoordinatesFromGoogleMapsUrl(url: string): { latitude: number; longitude: number } | null {
  if (!url?.trim()) return null;

  // Pattern 1: @lat,lng,zoom (e.g., @25.157134,55.409436,15z)
  const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const atMatch = url.match(atPattern);
  if (atMatch) {
    const latitude = parseFloat(atMatch[1]);
    const longitude = parseFloat(atMatch[2]);
    if (!isNaN(latitude) && !isNaN(longitude) &&
        isValidCoordinate(latitude, 'latitude') &&
        isValidCoordinate(longitude, 'longitude')) {
      return { latitude, longitude };
    }
  }

  // Pattern 2: q=lat,lng (e.g., q=25.157134,55.409436)
  const qPattern = /q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const qMatch = url.match(qPattern);
  if (qMatch) {
    const latitude = parseFloat(qMatch[1]);
    const longitude = parseFloat(qMatch[2]);
    if (!isNaN(latitude) && !isNaN(longitude) &&
        isValidCoordinate(latitude, 'latitude') &&
        isValidCoordinate(longitude, 'longitude')) {
      return { latitude, longitude };
    }
  }

  // Pattern 3: ll=lat,lng (e.g., ll=25.157134,55.409436)
  const llPattern = /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const llMatch = url.match(llPattern);
  if (llMatch) {
    const latitude = parseFloat(llMatch[1]);
    const longitude = parseFloat(llMatch[2]);
    if (!isNaN(latitude) && !isNaN(longitude) &&
        isValidCoordinate(latitude, 'latitude') &&
        isValidCoordinate(longitude, 'longitude')) {
      return { latitude, longitude };
    }
  }

  return null;
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

  // Validate coordinates if provided
  if (data.latitude !== undefined && !isValidCoordinate(data.latitude, 'latitude')) {
    errors.push('Invalid latitude value (must be between -90 and 90)');
  }

  if (data.longitude !== undefined && !isValidCoordinate(data.longitude, 'longitude')) {
    errors.push('Invalid longitude value (must be between -180 and 180)');
  }

  // If one coordinate is provided, both should be provided
  if ((data.latitude !== undefined) !== (data.longitude !== undefined)) {
    errors.push('Both latitude and longitude must be provided together');
  }

  return errors;
}
