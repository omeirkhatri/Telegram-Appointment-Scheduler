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

// Initialize mock data
resetMockSupabase();

jest.mock('./src/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  getServiceRoleClient: jest.fn(() => mockSupabaseClient),
  checkConnection: jest.fn(() => Promise.resolve(true)),
  executeQuery: jest.fn((queryFn) => queryFn()),
}));

// Mock environment configuration
jest.mock('./src/lib/env', () => ({
  config: {
    isDevelopment: true,
    isProduction: false,
    isTest: true,
    supabase: {
      url: 'http://localhost:54321',
      anonKey: 'test-anon-key',
      serviceRoleKey: 'test-service-role-key',
    },
    app: {
      url: 'http://localhost:3000',
      timezone: 'Asia/Dubai',
    },
  },
  env: {
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  },
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

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
