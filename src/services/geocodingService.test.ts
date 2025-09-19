import { GeocodingService } from './geocodingService';
import { GoogleMapsService } from './googleMapsService';
import type { Coordinates, GeocodingResult, GeocodingError } from '@/types/map';

// Mock Google Maps Service
jest.mock('./googleMapsService');
const MockedGoogleMapsService = GoogleMapsService as jest.Mocked<typeof GoogleMapsService>;

// Mock Google Maps API
const mockGeocoder = {
  geocode: jest.fn()
};

const mockGoogleMaps = {
  Geocoder: jest.fn(() => mockGeocoder),
  LatLng: jest.fn((lat: number, lng: number) => ({ lat: () => lat, lng: () => lng }))
};

// Mock the Google Maps loader
const mockLoader = {
  importLibrary: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock global google object
(global as any).google = {
  maps: mockGoogleMaps
};

describe('GeocodingService', () => {
  let geocodingService: GeocodingService;
  let mockGoogleMapsServiceInstance: jest.Mocked<GoogleMapsService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    localStorageMock.clear.mockImplementation(() => {});

    // Setup Google Maps Service mock
    mockGoogleMapsServiceInstance = {
      isApiInitialized: jest.fn().mockReturnValue(true),
      getLoader: jest.fn().mockReturnValue(mockLoader)
    } as any;

    MockedGoogleMapsService.getInstance.mockReturnValue(mockGoogleMapsServiceInstance);

    // Setup loader mock
    mockLoader.importLibrary.mockResolvedValue({ Geocoder: mockGoogleMaps.Geocoder });

    // Create new service instance
    geocodingService = GeocodingService.getInstance();
  });

  afterEach(() => {
    geocodingService.destroy();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GeocodingService.getInstance();
      const instance2 = GeocodingService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should allow configuration on first creation', () => {
      const customConfig = {
        enableCaching: false,
        cacheTTL: 1000
      };
      
      const service = GeocodingService.getInstance(customConfig);
      expect(service).toBeDefined();
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await geocodingService.initialize();
      expect(geocodingService.isInitialized()).toBe(true);
    });

    it('should throw error if Google Maps API not initialized', async () => {
      mockGoogleMapsServiceInstance.isApiInitialized.mockReturnValue(false);
      
      await expect(geocodingService.initialize()).rejects.toThrow('Google Maps API not initialized');
    });

    it('should throw error if geocoding library fails to load', async () => {
      mockLoader.importLibrary.mockRejectedValue(new Error('Library load failed'));
      
      await expect(geocodingService.initialize()).rejects.toThrow('Failed to initialize geocoding service');
    });

    it('should load cache from localStorage on initialization', async () => {
      const cachedData = [
        ['test-address', { result: {}, timestamp: Date.now(), ttl: 1000 }]
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));
      
      await geocodingService.initialize();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('geocoding_cache');
    });
  });

  describe('Geocoding', () => {
    beforeEach(async () => {
      await geocodingService.initialize();
    });

    it('should geocode address successfully', async () => {
      const mockResult = [{
        geometry: {
          location: { lat: () => 25.2048, lng: () => 55.2708 },
          location_type: 'ROOFTOP',
          viewport: {
            getNorthEast: () => ({ lat: () => 25.2068, lng: () => 55.2728 }),
            getSouthWest: () => ({ lat: () => 25.2028, lng: () => 55.2688 })
          }
        },
        formatted_address: 'Dubai, UAE',
        address_components: [
          { long_name: 'Dubai', short_name: 'Dubai', types: ['locality'] },
          { long_name: 'UAE', short_name: 'AE', types: ['country'] }
        ],
        place_id: 'test-place-id',
        types: ['locality', 'political']
      }];

      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback(mockResult, 'OK');
      });

      const result = await geocodingService.geocode('Dubai, UAE');

      expect(result).toMatchObject({
        coordinates: { lat: 25.2048, lng: 55.2708 },
        formattedAddress: 'Dubai, UAE',
        placeId: 'test-place-id',
        types: ['locality', 'political']
      });
    });

    it('should handle geocoding errors', async () => {
      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback([], 'ZERO_RESULTS');
      });

      await expect(geocodingService.geocode('Invalid Address')).rejects.toMatchObject({
        code: 'ZERO_RESULTS',
        message: 'No results found for the given address'
      });
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new (GeocodingService as any)();
      
      await expect(uninitializedService.geocode('Dubai')).rejects.toThrow('GeocodingService not initialized');
    });

    it('should use cached result if available', async () => {
      const address = 'Dubai, UAE';
      const mockResult = {
        coordinates: { lat: 25.2048, lng: 55.2708 },
        formattedAddress: 'Dubai, UAE',
        placeId: 'test-place-id',
        types: ['locality'],
        timestamp: Date.now()
      };

      // Manually add to cache
      (geocodingService as any).cache.set('dubai, uae|{}', {
        result: mockResult,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000
      });

      const result = await geocodingService.geocode(address);
      expect(result).toEqual(mockResult);
      expect(mockGeocoder.geocode).not.toHaveBeenCalled();
    });

    it('should not use expired cached result', async () => {
      const address = 'Dubai, UAE';
      const expiredResult = {
        coordinates: { lat: 25.2048, lng: 55.2708 },
        formattedAddress: 'Dubai, UAE',
        placeId: 'test-place-id',
        types: ['locality'],
        timestamp: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      };

      // Manually add expired result to cache
      (geocodingService as any).cache.set('dubai, uae|{}', {
        result: expiredResult,
        timestamp: Date.now() - 25 * 60 * 60 * 1000,
        ttl: 24 * 60 * 60 * 1000
      });

      const mockResult = [{
        geometry: { location: { lat: () => 25.2048, lng: () => 55.2708 } },
        formatted_address: 'Dubai, UAE',
        address_components: [],
        place_id: 'test-place-id',
        types: ['locality']
      }];

      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback(mockResult, 'OK');
      });

      const result = await geocodingService.geocode(address);
      expect(mockGeocoder.geocode).toHaveBeenCalled();
    });
  });

  describe('Reverse Geocoding', () => {
    beforeEach(async () => {
      await geocodingService.initialize();
    });

    it('should reverse geocode coordinates successfully', async () => {
      const coordinates: Coordinates = { lat: 25.2048, lng: 55.2708 };
      const mockResult = [{
        geometry: {
          location: { lat: () => 25.2048, lng: () => 55.2708 },
          location_type: 'ROOFTOP'
        },
        formatted_address: 'Dubai, UAE',
        address_components: [
          { long_name: 'Dubai', short_name: 'Dubai', types: ['locality'] }
        ],
        place_id: 'test-place-id',
        types: ['locality']
      }];

      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback(mockResult, 'OK');
      });

      const result = await geocodingService.reverseGeocode(coordinates);

      expect(result).toMatchObject({
        coordinates: { lat: 25.2048, lng: 55.2708 },
        formattedAddress: 'Dubai, UAE',
        placeId: 'test-place-id'
      });
    });

    it('should handle reverse geocoding errors', async () => {
      const coordinates: Coordinates = { lat: 0, lng: 0 };
      
      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback([], 'ZERO_RESULTS');
      });

      await expect(geocodingService.reverseGeocode(coordinates)).rejects.toMatchObject({
        code: 'ZERO_RESULTS',
        message: 'No results found for the given coordinates'
      });
    });
  });

  describe('Batch Geocoding', () => {
    beforeEach(async () => {
      await geocodingService.initialize();
    });

    it('should geocode multiple addresses', async () => {
      const addresses = ['Dubai, UAE', 'Abu Dhabi, UAE'];
      const mockResults = [
        [{
          geometry: { location: { lat: () => 25.2048, lng: () => 55.2708 } },
          formatted_address: 'Dubai, UAE',
          address_components: [],
          place_id: 'dubai-id',
          types: ['locality']
        }],
        [{
          geometry: { location: { lat: () => 24.4539, lng: () => 54.3773 } },
          formatted_address: 'Abu Dhabi, UAE',
          address_components: [],
          place_id: 'abu-dhabi-id',
          types: ['locality']
        }]
      ];

      let callCount = 0;
      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback(mockResults[callCount], 'OK');
        callCount++;
      });

      const results = await geocodingService.geocodeBatch(addresses);

      expect(results).toHaveLength(2);
      expect(results[0].coordinates).toEqual({ lat: 25.2048, lng: 55.2708 });
      expect(results[1].coordinates).toEqual({ lat: 24.4539, lng: 54.3773 });
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      await geocodingService.initialize();
    });

    it('should save cache to localStorage', () => {
      const address = 'Dubai, UAE';
      const result = {
        coordinates: { lat: 25.2048, lng: 55.2708 },
        formattedAddress: 'Dubai, UAE',
        placeId: 'test-place-id',
        types: ['locality'],
        timestamp: Date.now()
      };

      (geocodingService as any).cacheResult(address, {}, result);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'geocoding_cache',
        expect.any(String)
      );
    });

    it('should clear cache', () => {
      geocodingService.clearCache();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('geocoding_cache');
    });

    it('should respect cache size limit', async () => {
      const service = GeocodingService.getInstance({ maxCacheSize: 2 });
      await service.initialize();

      // Add more entries than the limit
      for (let i = 0; i < 5; i++) {
        (service as any).cacheResult(`address-${i}`, {}, {
          coordinates: { lat: 0, lng: 0 },
          formattedAddress: `Address ${i}`,
          placeId: `id-${i}`,
          types: [],
          timestamp: Date.now()
        });
      }

      // The cache should be limited to maxCacheSize (2) plus some buffer for the 10% removal logic
      expect((service as any).cache.size).toBeLessThanOrEqual(3);
    });

    it('should return cache stats', () => {
      const stats = geocodingService.getCacheStats();
      
      expect(stats).toMatchObject({
        size: expect.any(Number),
        maxSize: expect.any(Number),
        hitRate: expect.any(Number),
        entries: expect.any(Array)
      });
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        enableCaching: false,
        cacheTTL: 1000,
        maxCacheSize: 100,
        enableBatchGeocoding: false,
        batchDelay: 200,
        retryAttempts: 5,
        retryDelay: 2000
      };

      const service = GeocodingService.getInstance(customConfig);
      expect((service as any).config).toMatchObject(customConfig);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await geocodingService.initialize();
    });

    it('should handle geocoding API errors', async () => {
      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback([], 'OVER_QUERY_LIMIT');
      });

      await expect(geocodingService.geocode('Dubai')).rejects.toMatchObject({
        code: 'GEOCODING_ERROR',
        message: expect.any(String)
      });
    });

    it('should handle network errors', async () => {
      mockGeocoder.geocode.mockImplementation((request, callback) => {
        throw new Error('Network error');
      });

      await expect(geocodingService.geocode('Dubai')).rejects.toThrow('Network error');
    });
  });

  describe('Address Component Parsing', () => {
    beforeEach(async () => {
      await geocodingService.initialize();
    });

    it('should parse address components correctly', async () => {
      const mockResult = [{
        geometry: { location: { lat: () => 25.2048, lng: () => 55.2708 } },
        formatted_address: '123 Main St, Dubai, UAE',
        address_components: [
          { long_name: '123', short_name: '123', types: ['street_number'] },
          { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
          { long_name: 'Dubai', short_name: 'Dubai', types: ['locality'] },
          { long_name: 'Dubai', short_name: 'DU', types: ['administrative_area_level_1'] },
          { long_name: 'United Arab Emirates', short_name: 'AE', types: ['country'] },
          { long_name: '12345', short_name: '12345', types: ['postal_code'] }
        ],
        place_id: 'test-place-id',
        types: ['street_address']
      }];

      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback(mockResult, 'OK');
      });

      const result = await geocodingService.geocode('123 Main St, Dubai, UAE');

      expect(result.addressComponents).toMatchObject({
        streetNumber: '123',
        streetName: 'Main Street',
        city: 'Dubai',
        state: 'Dubai',
        stateCode: 'DU',
        country: 'United Arab Emirates',
        countryCode: 'AE',
        postalCode: '12345'
      });
    });
  });

  describe('Cleanup', () => {
    it('should destroy service properly', () => {
      const service = GeocodingService.getInstance();
      service.destroy();

      expect((service as any).geocoder).toBeNull();
      expect((service as any).googleMapsService).toBeNull();
      expect((service as any).cache.size).toBe(0);
    });
  });
});
