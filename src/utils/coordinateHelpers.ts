/**
 * Comprehensive coordinate utilities for the appointment scheduler
 * Provides validation, parsing, formatting, and calculation functions
 */

export interface CoordinatePair {
  latitude: number;
  longitude: number;
}

export interface CoordinateBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface CoordinateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates if a coordinate value is within valid ranges
 */
export function isValidCoordinate(value: number, type: 'latitude' | 'longitude'): boolean {
  if (type === 'latitude') {
    return value >= -90 && value <= 90;
  } else {
    return value >= -180 && value <= 180;
  }
}

/**
 * Validates a coordinate pair with detailed error reporting
 */
export function validateCoordinatePair(coords: CoordinatePair): CoordinateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if coordinates are numbers
  if (typeof coords.latitude !== 'number' || isNaN(coords.latitude)) {
    errors.push('Latitude must be a valid number');
  } else if (!isValidCoordinate(coords.latitude, 'latitude')) {
    errors.push('Latitude must be between -90 and 90 degrees');
  }

  if (typeof coords.longitude !== 'number' || isNaN(coords.longitude)) {
    errors.push('Longitude must be a valid number');
  } else if (!isValidCoordinate(coords.longitude, 'longitude')) {
    errors.push('Longitude must be between -180 and 180 degrees');
  }

  // Check for common coordinate issues
  if (coords.latitude === 0 && coords.longitude === 0) {
    warnings.push('Coordinates (0, 0) are in the middle of the Atlantic Ocean - please verify');
  }

  // Check if coordinates are in UAE region (rough bounds)
  if (coords.latitude < 22.5 || coords.latitude > 26.1 || 
      coords.longitude < 51.0 || coords.longitude > 56.4) {
    warnings.push('Coordinates appear to be outside UAE region - please verify');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Parses coordinates from various string formats
 */
export function parseCoordinates(coordinateString: string): CoordinatePair | null {
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

/**
 * Formats coordinates for display with configurable precision
 */
export function formatCoordinates(
  latitude?: number, 
  longitude?: number, 
  precision: number = 6
): string {
  if (latitude === undefined || longitude === undefined) return '';
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

/**
 * Formats coordinates for different use cases
 */
export function formatCoordinatesForDisplay(coords: CoordinatePair): string {
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
}

export function formatCoordinatesForUrl(coords: CoordinatePair): string {
  return `${coords.latitude},${coords.longitude}`;
}

export function formatCoordinatesForGoogleMaps(coords: CoordinatePair): string {
  return `@${coords.latitude},${coords.longitude},15z`;
}

/**
 * Extracts coordinates from Google Maps URLs
 */
export function extractCoordinatesFromGoogleMapsUrl(url: string): CoordinatePair | null {
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

/**
 * Calculates distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(coord1: CoordinatePair, coord2: CoordinatePair): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the center point of multiple coordinates
 */
export function calculateCenter(coordinates: CoordinatePair[]): CoordinatePair | null {
  if (coordinates.length === 0) return null;
  
  const sum = coordinates.reduce(
    (acc, coord) => ({
      latitude: acc.latitude + coord.latitude,
      longitude: acc.longitude + coord.longitude
    }),
    { latitude: 0, longitude: 0 }
  );
  
  return {
    latitude: sum.latitude / coordinates.length,
    longitude: sum.longitude / coordinates.length
  };
}

/**
 * Calculates bounds for a set of coordinates
 */
export function calculateBounds(coordinates: CoordinatePair[]): CoordinateBounds | null {
  if (coordinates.length === 0) return null;
  
  const latitudes = coordinates.map(coord => coord.latitude);
  const longitudes = coordinates.map(coord => coord.longitude);
  
  return {
    north: Math.max(...latitudes),
    south: Math.min(...latitudes),
    east: Math.max(...longitudes),
    west: Math.min(...longitudes)
  };
}

/**
 * Checks if coordinates are within UAE bounds
 */
export function isWithinUAEBounds(coords: CoordinatePair): boolean {
  const uaeBounds: CoordinateBounds = {
    north: 26.1,
    south: 22.5,
    east: 56.4,
    west: 51.0
  };
  
  return coords.latitude >= uaeBounds.south && 
         coords.latitude <= uaeBounds.north &&
         coords.longitude >= uaeBounds.west && 
         coords.longitude <= uaeBounds.east;
}

/**
 * Generates a Google Maps URL for coordinates
 */
export function generateGoogleMapsUrl(coords: CoordinatePair, zoom: number = 15): string {
  return `https://www.google.com/maps/@${coords.latitude},${coords.longitude},${zoom}z`;
}

/**
 * Generates a Google Maps search URL for coordinates
 */
export function generateGoogleMapsSearchUrl(coords: CoordinatePair): string {
  return `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
}

/**
 * Normalizes coordinates to ensure they're within valid ranges
 */
export function normalizeCoordinates(coords: CoordinatePair): CoordinatePair {
  let { latitude, longitude } = coords;
  
  // Normalize latitude
  if (latitude > 90) latitude = 90;
  if (latitude < -90) latitude = -90;
  
  // Normalize longitude to -180 to 180 range
  while (longitude > 180) longitude -= 360;
  while (longitude < -180) longitude += 360;
  
  return { latitude, longitude };
}

/**
 * Checks if two coordinate pairs are approximately equal (within tolerance)
 */
export function areCoordinatesEqual(
  coord1: CoordinatePair, 
  coord2: CoordinatePair, 
  tolerance: number = 0.000001
): boolean {
  return Math.abs(coord1.latitude - coord2.latitude) < tolerance &&
         Math.abs(coord1.longitude - coord2.longitude) < tolerance;
}

/**
 * Converts coordinates to different formats
 */
export function convertToDMS(coords: CoordinatePair): { lat: string; lng: string } {
  const latDMS = convertToDMSFormat(coords.latitude, 'lat');
  const lngDMS = convertToDMSFormat(coords.longitude, 'lng');
  
  return { lat: latDMS, lng: lngDMS };
}

function convertToDMSFormat(decimal: number, type: 'lat' | 'lng'): string {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutes = Math.floor((abs - degrees) * 60);
  const seconds = ((abs - degrees) * 60 - minutes) * 60;
  
  const direction = type === 'lat' 
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  
  return `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}`;
}

/**
 * Parses DMS format coordinates
 */
export function parseDMS(dmsString: string): CoordinatePair | null {
  const dmsPattern = /(\d+)°(\d+)'([\d.]+)"([NSEW])/i;
  const match = dmsString.match(dmsPattern);
  
  if (!match) return null;
  
  const degrees = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseFloat(match[3]);
  const direction = match[4].toUpperCase();
  
  let decimal = degrees + minutes / 60 + seconds / 3600;
  
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  
  const isLatitude = direction === 'N' || direction === 'S';
  const coords: CoordinatePair = isLatitude 
    ? { latitude: decimal, longitude: 0 }
    : { latitude: 0, longitude: decimal };
  
  if (!isValidCoordinate(decimal, isLatitude ? 'latitude' : 'longitude')) {
    return null;
  }
  
  return coords;
}
