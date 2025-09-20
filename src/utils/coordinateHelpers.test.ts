import {
  isValidCoordinate,
  validateCoordinatePair,
  parseCoordinates,
  formatCoordinates,
  formatCoordinatesForDisplay,
  formatCoordinatesForUrl,
  formatCoordinatesForGoogleMaps,
  extractCoordinatesFromGoogleMapsUrl,
  calculateDistance,
  calculateCenter,
  calculateBounds,
  isWithinUAEBounds,
  generateGoogleMapsUrl,
  generateGoogleMapsSearchUrl,
  normalizeCoordinates,
  areCoordinatesEqual,
  convertToDMS,
  parseDMS,
  type CoordinatePair,
  type CoordinateBounds,
  type CoordinateValidationResult
} from './coordinateHelpers';

describe('coordinateHelpers', () => {
  describe('isValidCoordinate', () => {
    it('should validate latitude correctly', () => {
      expect(isValidCoordinate(0, 'latitude')).toBe(true);
      expect(isValidCoordinate(90, 'latitude')).toBe(true);
      expect(isValidCoordinate(-90, 'latitude')).toBe(true);
      expect(isValidCoordinate(91, 'latitude')).toBe(false);
      expect(isValidCoordinate(-91, 'latitude')).toBe(false);
    });

    it('should validate longitude correctly', () => {
      expect(isValidCoordinate(0, 'longitude')).toBe(true);
      expect(isValidCoordinate(180, 'longitude')).toBe(true);
      expect(isValidCoordinate(-180, 'longitude')).toBe(true);
      expect(isValidCoordinate(181, 'longitude')).toBe(false);
      expect(isValidCoordinate(-181, 'longitude')).toBe(false);
    });
  });

  describe('validateCoordinatePair', () => {
    it('should validate valid coordinates', () => {
      const result = validateCoordinatePair({ latitude: 25.157134, longitude: 55.409436 });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid latitude', () => {
      const result = validateCoordinatePair({ latitude: 91, longitude: 55.409436 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Latitude must be between -90 and 90 degrees');
    });

    it('should detect invalid longitude', () => {
      const result = validateCoordinatePair({ latitude: 25.157134, longitude: 181 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Longitude must be between -180 and 180 degrees');
    });

    it('should detect non-numeric coordinates', () => {
      const result = validateCoordinatePair({ latitude: NaN, longitude: 55.409436 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Latitude must be a valid number');
    });

    it('should warn about coordinates at origin', () => {
      const result = validateCoordinatePair({ latitude: 0, longitude: 0 });
      expect(result.warnings).toContain('Coordinates (0, 0) are in the middle of the Atlantic Ocean - please verify');
    });

    it('should warn about coordinates outside UAE', () => {
      const result = validateCoordinatePair({ latitude: 40.7128, longitude: -74.0060 }); // New York
      expect(result.warnings).toContain('Coordinates appear to be outside UAE region - please verify');
    });
  });

  describe('parseCoordinates', () => {
    it('should parse comma-separated coordinates', () => {
      const result = parseCoordinates('25.157134, 55.409436');
      expect(result).toEqual({ latitude: 25.157134, longitude: 55.409436 });
    });

    it('should parse coordinates without spaces', () => {
      const result = parseCoordinates('25.157134,55.409436');
      expect(result).toEqual({ latitude: 25.157134, longitude: 55.409436 });
    });

    it('should parse semicolon-separated coordinates', () => {
      const result = parseCoordinates('25.157134; 55.409436');
      expect(result).toEqual({ latitude: 25.157134, longitude: 55.409436 });
    });

    it('should parse space-separated coordinates', () => {
      const result = parseCoordinates('25.157134 55.409436');
      expect(result).toEqual({ latitude: 25.157134, longitude: 55.409436 });
    });

    it('should parse tab-separated coordinates', () => {
      const result = parseCoordinates('25.157134\t55.409436');
      expect(result).toEqual({ latitude: 25.157134, longitude: 55.409436 });
    });

    it('should return null for invalid input', () => {
      expect(parseCoordinates('')).toBeNull();
      expect(parseCoordinates('invalid')).toBeNull();
      expect(parseCoordinates('25.157134')).toBeNull();
      expect(parseCoordinates('25.157134, 55.409436, extra')).toBeNull();
    });

    it('should return null for invalid coordinates', () => {
      expect(parseCoordinates('91, 55.409436')).toBeNull();
      expect(parseCoordinates('25.157134, 181')).toBeNull();
    });
  });

  describe('formatCoordinates', () => {
    it('should format coordinates with default precision', () => {
      const result = formatCoordinates(25.157134, 55.409436);
      expect(result).toBe('25.157134, 55.409436');
    });

    it('should format coordinates with custom precision', () => {
      const result = formatCoordinates(25.157134, 55.409436, 2);
      expect(result).toBe('25.16, 55.41');
    });

    it('should return empty string for undefined coordinates', () => {
      expect(formatCoordinates(undefined, 55.409436)).toBe('');
      expect(formatCoordinates(25.157134, undefined)).toBe('');
    });
  });

  describe('formatCoordinatesForDisplay', () => {
    it('should format coordinates for display', () => {
      const result = formatCoordinatesForDisplay({ latitude: 25.157134, longitude: 55.409436 });
      expect(result).toBe('25.157134, 55.409436');
    });
  });

  describe('formatCoordinatesForUrl', () => {
    it('should format coordinates for URL', () => {
      const result = formatCoordinatesForUrl({ latitude: 25.157134, longitude: 55.409436 });
      expect(result).toBe('25.157134,55.409436');
    });
  });

  describe('formatCoordinatesForGoogleMaps', () => {
    it('should format coordinates for Google Maps', () => {
      const result = formatCoordinatesForGoogleMaps({ latitude: 25.157134, longitude: 55.409436 });
      expect(result).toBe('@25.157134,55.409436,15z');
    });
  });

  describe('extractCoordinatesFromGoogleMapsUrl', () => {
    it('should extract coordinates from @ format', () => {
      const url = 'https://www.google.com/maps/@25.157134,55.409436,15z';
      const result = extractCoordinatesFromGoogleMapsUrl(url);
      expect(result).toEqual({ latitude: 25.157134, longitude: 55.409436 });
    });

    it('should extract coordinates from q= format', () => {
      const url = 'https://www.google.com/maps/search/?q=25.157134,55.409436';
      const result = extractCoordinatesFromGoogleMapsUrl(url);
      expect(result).toEqual({ latitude: 25.157134, longitude: 55.409436 });
    });

    it('should extract coordinates from ll= format', () => {
      const url = 'https://www.google.com/maps/place/Dubai/@25.157134,55.409436,15z';
      const result = extractCoordinatesFromGoogleMapsUrl(url);
      expect(result).toEqual({ latitude: 25.157134, longitude: 55.409436 });
    });

    it('should return null for invalid URLs', () => {
      expect(extractCoordinatesFromGoogleMapsUrl('')).toBeNull();
      expect(extractCoordinatesFromGoogleMapsUrl('invalid')).toBeNull();
      expect(extractCoordinatesFromGoogleMapsUrl('https://example.com')).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const coord1 = { latitude: 25.157134, longitude: 55.409436 }; // Dubai
      const coord2 = { latitude: 25.2048, longitude: 55.2708 }; // Dubai Marina
      const distance = calculateDistance(coord1, coord2);
      expect(distance).toBeCloseTo(14.9, 1); // Approximately 14.9 km
    });

    it('should return 0 for identical coordinates', () => {
      const coord = { latitude: 25.157134, longitude: 55.409436 };
      const distance = calculateDistance(coord, coord);
      expect(distance).toBe(0);
    });
  });

  describe('calculateCenter', () => {
    it('should calculate center of multiple coordinates', () => {
      const coords = [
        { latitude: 25.0, longitude: 55.0 },
        { latitude: 25.2, longitude: 55.2 },
        { latitude: 25.4, longitude: 55.4 }
      ];
      const center = calculateCenter(coords);
      expect(center?.latitude).toBeCloseTo(25.2, 10);
      expect(center?.longitude).toBeCloseTo(55.2, 10);
    });

    it('should return null for empty array', () => {
      const center = calculateCenter([]);
      expect(center).toBeNull();
    });
  });

  describe('calculateBounds', () => {
    it('should calculate bounds for multiple coordinates', () => {
      const coords = [
        { latitude: 25.0, longitude: 55.0 },
        { latitude: 25.2, longitude: 55.2 },
        { latitude: 25.4, longitude: 55.4 }
      ];
      const bounds = calculateBounds(coords);
      expect(bounds).toEqual({
        north: 25.4,
        south: 25.0,
        east: 55.4,
        west: 55.0
      });
    });

    it('should return null for empty array', () => {
      const bounds = calculateBounds([]);
      expect(bounds).toBeNull();
    });
  });

  describe('isWithinUAEBounds', () => {
    it('should return true for coordinates within UAE', () => {
      const coord = { latitude: 25.157134, longitude: 55.409436 }; // Dubai
      expect(isWithinUAEBounds(coord)).toBe(true);
    });

    it('should return false for coordinates outside UAE', () => {
      const coord = { latitude: 40.7128, longitude: -74.0060 }; // New York
      expect(isWithinUAEBounds(coord)).toBe(false);
    });
  });

  describe('generateGoogleMapsUrl', () => {
    it('should generate Google Maps URL with default zoom', () => {
      const coord = { latitude: 25.157134, longitude: 55.409436 };
      const url = generateGoogleMapsUrl(coord);
      expect(url).toBe('https://www.google.com/maps/@25.157134,55.409436,15z');
    });

    it('should generate Google Maps URL with custom zoom', () => {
      const coord = { latitude: 25.157134, longitude: 55.409436 };
      const url = generateGoogleMapsUrl(coord, 10);
      expect(url).toBe('https://www.google.com/maps/@25.157134,55.409436,10z');
    });
  });

  describe('generateGoogleMapsSearchUrl', () => {
    it('should generate Google Maps search URL', () => {
      const coord = { latitude: 25.157134, longitude: 55.409436 };
      const url = generateGoogleMapsSearchUrl(coord);
      expect(url).toBe('https://www.google.com/maps/search/?api=1&query=25.157134,55.409436');
    });
  });

  describe('normalizeCoordinates', () => {
    it('should normalize coordinates within valid ranges', () => {
      const coord = { latitude: 95, longitude: 185 };
      const normalized = normalizeCoordinates(coord);
      expect(normalized).toEqual({ latitude: 90, longitude: -175 });
    });

    it('should not change valid coordinates', () => {
      const coord = { latitude: 25.157134, longitude: 55.409436 };
      const normalized = normalizeCoordinates(coord);
      expect(normalized).toEqual(coord);
    });
  });

  describe('areCoordinatesEqual', () => {
    it('should return true for identical coordinates', () => {
      const coord1 = { latitude: 25.157134, longitude: 55.409436 };
      const coord2 = { latitude: 25.157134, longitude: 55.409436 };
      expect(areCoordinatesEqual(coord1, coord2)).toBe(true);
    });

    it('should return true for coordinates within tolerance', () => {
      const coord1 = { latitude: 25.157134, longitude: 55.409436 };
      const coord2 = { latitude: 25.157135, longitude: 55.409437 };
      expect(areCoordinatesEqual(coord1, coord2, 0.00001)).toBe(true);
    });

    it('should return false for coordinates outside tolerance', () => {
      const coord1 = { latitude: 25.157134, longitude: 55.409436 };
      const coord2 = { latitude: 25.157144, longitude: 55.409446 };
      expect(areCoordinatesEqual(coord1, coord2, 0.00001)).toBe(false);
    });
  });

  describe('convertToDMS', () => {
    it('should convert coordinates to DMS format', () => {
      const coord = { latitude: 25.157134, longitude: 55.409436 };
      const dms = convertToDMS(coord);
      expect(dms.lat).toMatch(/25°9'25\.\d+"N/);
      expect(dms.lng).toMatch(/55°24'33\.\d+"E/);
    });
  });

  describe('parseDMS', () => {
    it('should parse DMS format coordinates', () => {
      const dmsString = '25°9\'25.68"N 55°24\'33.97"E';
      const result = parseDMS(dmsString);
      expect(result).toBeDefined();
      if (result) {
        expect(result.latitude).toBeCloseTo(25.157134, 3);
        expect(result.longitude).toBeCloseTo(55.409436, 3);
      }
    });

    it('should return null for invalid DMS format', () => {
      expect(parseDMS('invalid')).toBeNull();
      expect(parseDMS('25°9\'25.68"')).toBeNull();
    });
  });
});
