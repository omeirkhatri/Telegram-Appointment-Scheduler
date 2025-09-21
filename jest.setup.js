import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js server-side APIs
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this._body = init.body;
    }

    async json() {
      if (this._body) {
        return JSON.parse(this._body);
      }
      return {};
    }

    async text() {
      return this._body || '';
    }

    async formData() {
      return new FormData();
    }
  },
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      json: () => Promise.resolve(data),
      status: init.status || 200,
      headers: new Map(Object.entries(init.headers || {})),
    })),
    text: jest.fn((text, init = {}) => ({
      text: () => Promise.resolve(text),
      status: init.status || 200,
      headers: new Map(Object.entries(init.headers || {})),
    })),
  },
}));

// Mock Supabase with comprehensive query builder support
const { mockSupabaseClient, resetMockSupabase } = require('./src/utils/supabase-mocks');
const { LEGACY_TIMEZONE, isValidTimezone } = require('./src/utils/timezone');

// Initialize mock data
resetMockSupabase();

jest.mock('./src/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  getServiceRoleClient: jest.fn(() => mockSupabaseClient),
  checkConnection: jest.fn(() => Promise.resolve(true)),
  executeQuery: jest.fn((queryFn) => queryFn()),
}));

// Mock Google Maps Service
const mockGoogleMaps = {
  Map: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    getCenter: jest.fn(() => ({ lat: () => 25.2048, lng: () => 55.2708 })),
    getZoom: jest.fn(() => 10)
  })),
  AdvancedMarkerElement: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    setMap: jest.fn(),
    setPosition: jest.fn(),
    setTitle: jest.fn(),
    setContent: jest.fn()
  }))
};

jest.mock('./src/services/googleMapsService', () => ({
  GoogleMapsService: {
    getInstance: jest.fn(() => ({
      isApiInitialized: jest.fn(() => false),
      initialize: jest.fn(() => Promise.resolve()),
      getLoader: jest.fn(() => ({
        importLibrary: jest.fn((library) => {
          if (library === 'maps') {
            return Promise.resolve({ Map: mockGoogleMaps.Map });
          }
          if (library === 'marker') {
            return Promise.resolve({ AdvancedMarkerElement: mockGoogleMaps.AdvancedMarkerElement });
          }
          return Promise.resolve({});
        })
      })),
      validateApiKey: jest.fn((key) => key === 'test-api-key')
    })),
    validateApiKey: jest.fn((key) => key === 'test-api-key'),
    getDefaultConfig: jest.fn(() => ({
      libraries: ['places', 'geometry'],
      language: 'en',
      region: 'AE',
      version: 'weekly'
    }))
  },
  getGoogleMapsService: jest.fn(() => ({
    isApiInitialized: jest.fn(() => false),
    initialize: jest.fn(() => Promise.resolve()),
    getLoader: jest.fn(() => ({
      importLibrary: jest.fn((library) => {
        if (library === 'maps') {
          return Promise.resolve({ Map: mockGoogleMaps.Map });
        }
        if (library === 'marker') {
          return Promise.resolve({ AdvancedMarkerElement: mockGoogleMaps.AdvancedMarkerElement });
        }
        return Promise.resolve({});
      })
    })),
    validateApiKey: jest.fn((key) => key === 'test-api-key')
  })),
  initializeGoogleMaps: jest.fn(() => Promise.resolve())
}));

// Mock Telegram Service
jest.mock('./src/services/telegramService', () => ({
  telegramService: {
    sendMessage: jest.fn(() => Promise.resolve({ success: true })),
    verifyWebhookSecret: jest.fn((secret) => secret === 'test-webhook-secret'),
    sendMessageToStaff: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

// Note: Telegram Validation Service mocking is handled in individual test files

// Set NODE_ENV to test for proper environment detection
process.env.NODE_ENV = 'test';

// Mock Google Maps configuration to use test environment
jest.mock('./src/config/googleMapsConfig', () => ({
  getGoogleMapsConfig: jest.fn(() => ({
    apiKey: 'test-api-key',
    libraries: ['places', 'geometry'],
    language: 'en',
    region: 'AE',
    version: 'weekly',
    enableLogging: false,
    enableErrorReporting: false,
    quotaWarningThreshold: 0.5,
    maxRetries: 1,
    retryDelay: 100,
    cacheTimeout: 1000,
    enableCaching: false
  })),
  getCurrentEnvironment: jest.fn(() => 'test'),
  getEnvironmentConfig: jest.fn(() => ({
    apiKey: 'test-api-key',
    libraries: ['places', 'geometry'],
    language: 'en',
    region: 'AE',
    version: 'weekly',
    enableLogging: false,
    enableErrorReporting: false,
    quotaWarningThreshold: 0.5,
    maxRetries: 1,
    retryDelay: 100,
    cacheTimeout: 1000,
    enableCaching: false
  }))
}));

// Mock environment configuration
jest.mock('./src/lib/env', () => {
  const timezoneFallbacks = [LEGACY_TIMEZONE];

  return {
    config: {
      isDevelopment: true,
      isProduction: false,
      isTest: true,
      supabase: {
        url: 'http://localhost:54321',
        anonKey: 'test-anon-key',
        serviceRoleKey: 'test-service-role-key',
      },
      telegram: {
        botToken: 'test-bot-token',
        webhookSecret: 'test-webhook-secret',
        isConfigured: () => true,
        validateConfig: () => true,
      },
      app: {
        url: 'http://localhost:3000',
        timezone: LEGACY_TIMEZONE,
      },
      timezone: {
        legacy: LEGACY_TIMEZONE,
        environmentFallbacks: timezoneFallbacks,
        getEnvironmentFallbacks: () => [...timezoneFallbacks],
        validateEnvironmentFallbacks: () => timezoneFallbacks.every(isValidTimezone),
        buildResolverContext: (context = {}) => ({
          ...context,
          fallbackTimezone: context.fallbackTimezone ?? LEGACY_TIMEZONE,
          preferLegacyFallback: context.preferLegacyFallback ?? true,
        }),
      },
    },
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      TELEGRAM_BOT_TOKEN: 'test-bot-token',
      TELEGRAM_WEBHOOK_SECRET: 'test-webhook-secret',
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-api-key',
    },
  };
});

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock MarkerClusterer
const mockMarkerClusterer = jest.fn().mockImplementation(() => ({
  addMarker: jest.fn(),
  addMarkers: jest.fn(),
  clearMarkers: jest.fn(),
  removeMarker: jest.fn(),
  removeMarkers: jest.fn(),
  render: jest.fn(),
  setMap: jest.fn()
}));

jest.mock('@googlemaps/markerclusterer', () => ({
  MarkerClusterer: mockMarkerClusterer
}));

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
