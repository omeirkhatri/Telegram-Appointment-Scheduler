import { GoogleMapsMonitoringService, getGoogleMapsMonitoringService } from './googleMapsMonitoringService';
import { GoogleMapsService } from './googleMapsService';

// Mock the Google Maps Service
jest.mock('./googleMapsService');
const MockedGoogleMapsService = GoogleMapsService as jest.MockedClass<typeof GoogleMapsService>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('GoogleMapsMonitoringService', () => {
  let service: GoogleMapsMonitoringService;
  let mockGoogleMapsService: jest.Mocked<GoogleMapsService>;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockClear();

    // Create mock Google Maps service
    mockGoogleMapsService = {
      getInstance: jest.fn(),
      getConfig: jest.fn(),
      isApiInitialized: jest.fn(),
      initialize: jest.fn()
    } as any;

    MockedGoogleMapsService.getInstance.mockReturnValue(mockGoogleMapsService);

    // Get service instance and reset it
    service = GoogleMapsMonitoringService.getInstance();
    service.reset();
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.stopMonitoring();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GoogleMapsMonitoringService.getInstance();
      const instance2 = GoogleMapsMonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      mockGoogleMapsService.getConfig.mockReturnValue({
        apiKey: 'test-key',
        libraries: ['places']
      });
      mockGoogleMapsService.isApiInitialized.mockReturnValue(true);

      await service.initialize();

      expect(mockGoogleMapsService.getConfig).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockGoogleMapsService.getConfig.mockReturnValue(null);

      await service.initialize();

      const status = service.getApiKeyStatus();
      expect(status?.isValid).toBe(false);
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      mockGoogleMapsService.getConfig.mockReturnValue({
        apiKey: 'test-key',
        libraries: ['places']
      });
      mockGoogleMapsService.isApiInitialized.mockReturnValue(true);

      const status = await service.validateApiKey();

      expect(status.isValid).toBe(true);
      expect(status.hasQuota).toBe(true);
      expect(status.quotaInfo).toBeDefined();
    });

    it('should handle validation errors', async () => {
      mockGoogleMapsService.getConfig.mockReturnValue(null);

      const status = await service.validateApiKey();

      expect(status.isValid).toBe(false);
      expect(status.hasQuota).toBe(false);
      expect(status.error).toBeDefined();
    });
  });

  describe('recordUsage', () => {
    it('should record geocoding usage', () => {
      service.recordUsage('geocoding');

      const metrics = service.getUsageMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.geocodingRequests).toBe(1);
      expect(metrics.mapsRequests).toBe(0);
      expect(metrics.placesRequests).toBe(0);
    });

    it('should record maps usage', () => {
      service.recordUsage('maps');

      const metrics = service.getUsageMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.geocodingRequests).toBe(0);
      expect(metrics.mapsRequests).toBe(1);
      expect(metrics.placesRequests).toBe(0);
    });

    it('should record places usage', () => {
      service.recordUsage('places');

      const metrics = service.getUsageMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.geocodingRequests).toBe(0);
      expect(metrics.mapsRequests).toBe(0);
      expect(metrics.placesRequests).toBe(1);
    });

    it('should update daily usage', () => {
      service.recordUsage('geocoding');
      service.recordUsage('geocoding');

      const metrics = service.getUsageMetrics();
      const today = new Date().toISOString().split('T')[0];
      expect(metrics.dailyUsage[today]).toBe(2);
    });
  });

  describe('recordError', () => {
    it('should record errors', () => {
      const error = new Error('Test error');
      service.recordError(error);

      const metrics = service.getUsageMetrics();
      expect(metrics.errors).toBe(1);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage stats for last 7 days', () => {
      const stats = service.getUsageStats(7);

      expect(stats).toHaveLength(7);
      expect(stats[0]).toHaveProperty('date');
      expect(stats[0]).toHaveProperty('requests');
    });

    it('should return usage stats for custom number of days', () => {
      const stats = service.getUsageStats(3);

      expect(stats).toHaveLength(3);
    });
  });

  describe('getQuotaWarningLevel', () => {
    it('should return none for no quota info', () => {
      const level = service.getQuotaWarningLevel();
      expect(level).toBe('none');
    });

    it('should return high for 90%+ usage', () => {
      // Mock API key status with high usage
      const mockStatus = {
        isValid: true,
        hasQuota: true,
        quotaInfo: {
          requestsPerDay: 100,
          requestsPerMinute: 50,
          requestsPerSecond: 10,
          requestsUsed: 95,
          requestsRemaining: 5,
          resetTime: new Date()
        },
        lastChecked: new Date()
      };

      // Use reflection to set private property for testing
      (service as any).apiKeyStatus = mockStatus;

      const level = service.getQuotaWarningLevel();
      expect(level).toBe('high');
    });
  });

  describe('isApiKeyValid', () => {
    it('should return false when no status', () => {
      expect(service.isApiKeyValid()).toBe(false);
    });

    it('should return true when valid and has quota', () => {
      const mockStatus = {
        isValid: true,
        hasQuota: true,
        lastChecked: new Date()
      };

      (service as any).apiKeyStatus = mockStatus;
      expect(service.isApiKeyValid()).toBe(true);
    });

    it('should return false when invalid', () => {
      const mockStatus = {
        isValid: false,
        hasQuota: false,
        lastChecked: new Date()
      };

      (service as any).apiKeyStatus = mockStatus;
      expect(service.isApiKeyValid()).toBe(false);
    });
  });

  describe('resetUsageMetrics', () => {
    it('should reset all metrics', () => {
      // Record some usage first
      service.recordUsage('geocoding');
      service.recordUsage('maps');
      service.recordError(new Error('Test'));

      // Reset
      service.resetUsageMetrics();

      const metrics = service.getUsageMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.geocodingRequests).toBe(0);
      expect(metrics.mapsRequests).toBe(0);
      expect(metrics.placesRequests).toBe(0);
      expect(metrics.errors).toBe(0);
    });
  });

  describe('localStorage integration', () => {
    it('should load metrics from localStorage', () => {
      const mockMetrics = {
        totalRequests: 10,
        geocodingRequests: 5,
        mapsRequests: 3,
        placesRequests: 2,
        errors: 1,
        lastRequestTime: new Date().toISOString(),
        dailyUsage: { '2024-01-01': 5 }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockMetrics));

      // Create a new instance to test localStorage loading
      const newService = new (GoogleMapsMonitoringService as any)();
      const metrics = newService.getUsageMetrics();

      expect(metrics.totalRequests).toBe(10);
      expect(metrics.geocodingRequests).toBe(5);
    });

    it('should save metrics to localStorage', () => {
      service.recordUsage('geocoding');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'google_maps_usage_metrics',
        expect.stringContaining('"totalRequests":1')
      );
    });
  });
});

describe('getGoogleMapsMonitoringService', () => {
  it('should return service instance', () => {
    const service = getGoogleMapsMonitoringService();
    expect(service).toBeInstanceOf(GoogleMapsMonitoringService);
  });
});
