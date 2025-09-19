import { Loader } from '@googlemaps/js-api-loader';
import { GoogleMapsService, initializeGoogleMaps } from './googleMapsService';

// Mock the Google Maps Loader
jest.mock('@googlemaps/js-api-loader');
const MockedLoader = Loader as jest.MockedClass<typeof Loader>;

describe('GoogleMapsService', () => {
  let service: GoogleMapsService;
  let mockLoaderInstance: jest.Mocked<Loader>;

  beforeEach(() => {
    // Reset the singleton instance
    service = GoogleMapsService.getInstance();
    service.reset();

    // Create mock loader instance
    mockLoaderInstance = {
      load: jest.fn()
    } as any;

    MockedLoader.mockImplementation(() => mockLoaderInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GoogleMapsService.getInstance();
      const instance2 = GoogleMapsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  const validConfig = {
    apiKey: 'AIzaSyBvOkBwv90yBk4g8zUzUzUzUzUzUzUzUzUzU',
    libraries: ['places', 'geometry']
  };

  describe('initialize', () => {

    it('should initialize successfully with valid config', async () => {
      mockLoaderInstance.load.mockResolvedValue(undefined);

      await service.initialize(validConfig);

      expect(MockedLoader).toHaveBeenCalledWith({
        apiKey: validConfig.apiKey,
        version: 'weekly',
        libraries: validConfig.libraries,
        language: 'en',
        region: 'AE'
      });
      expect(mockLoaderInstance.load).toHaveBeenCalled();
      expect(service.isApiInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockLoaderInstance.load.mockResolvedValue(undefined);

      await service.initialize(validConfig);
      await service.initialize(validConfig);

      expect(MockedLoader).toHaveBeenCalledTimes(1);
      expect(mockLoaderInstance.load).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('InvalidKeyMapError');
      mockLoaderInstance.load.mockRejectedValue(error);

      await expect(service.initialize(validConfig)).rejects.toMatchObject({
        code: 'INVALID_API_KEY',
        message: 'Invalid Google Maps API key. Please check your API key configuration.'
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockLoaderInstance.load.mockRejectedValue(error);

      await expect(service.initialize(validConfig)).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Network error occurred while loading Google Maps API. Please check your internet connection.'
      });
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key format', () => {
      expect(GoogleMapsService.validateApiKey('AIzaSyBvOkBwv90yBk4g8zUzUzUzUzUzUzUzUzUzU')).toBe(true);
    });

    it('should reject invalid API key formats', () => {
      expect(GoogleMapsService.validateApiKey('')).toBe(false);
      expect(GoogleMapsService.validateApiKey('short')).toBe(false);
      expect(GoogleMapsService.validateApiKey('123456789012345678901234567890123456789')).toBe(false);
      expect(GoogleMapsService.validateApiKey(null as any)).toBe(false);
      expect(GoogleMapsService.validateApiKey(undefined as any)).toBe(false);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = GoogleMapsService.getDefaultConfig();
      expect(config).toEqual({
        libraries: ['places', 'geometry'],
        language: 'en',
        region: 'AE',
        version: 'weekly'
      });
    });
  });

  describe('getLoader', () => {
    it('should throw error if not initialized', () => {
      expect(() => service.getLoader()).toThrow('Google Maps API not initialized. Call initialize() first.');
    });

    it('should return loader if initialized', async () => {
      mockLoaderInstance.load.mockResolvedValue(undefined);
      await service.initialize(validConfig);

      expect(service.getLoader()).toBe(mockLoaderInstance);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      mockLoaderInstance.load.mockResolvedValue(undefined);
      await service.initialize(validConfig);

      service.reset();

      expect(service.isApiInitialized()).toBe(false);
      expect(service.getConfig()).toBe(null);
      expect(() => service.getLoader()).toThrow();
    });
  });
});

describe('initializeGoogleMaps', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  });

  it('should throw error if API key not set', async () => {
    await expect(initializeGoogleMaps()).rejects.toThrow('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable is not set');
  });

  it('should initialize with environment API key', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIzaSyBvOkBwv90yBk4g8zUzUzUzUzUzUzUzUzUzU';

    const mockLoad = jest.fn().mockResolvedValue(undefined);
    MockedLoader.mockImplementation(() => ({ load: mockLoad }) as any);

    await initializeGoogleMaps();

    expect(MockedLoader).toHaveBeenCalledWith({
      apiKey: 'AIzaSyBvOkBwv90yBk4g8zUzUzUzUzUzUzUzUzUzU',
      version: 'weekly',
      libraries: ['places', 'geometry'],
      language: 'en',
      region: 'AE'
    });
  });
});
