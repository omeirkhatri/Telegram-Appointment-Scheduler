/**
 * Jest Configuration for Transportation Segments Testing
 *
 * This configuration file sets up Jest for testing transportation segments
 * with appropriate test environments, coverage settings, and performance testing.
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Test environment setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/performance/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/e2e/**/*.test.{js,jsx,ts,tsx}',
  ],

  // Test environment
  testEnvironment: 'jsdom',

  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Transportation segments specific thresholds
    'src/services/transportationSegmentService.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/app/api/transportation-segments/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'src/components/features/appointments/TransportationSegmentsDisplay.tsx': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test timeout configuration
  testTimeout: 30000, // 30 seconds for integration tests

  // Performance testing configuration
  maxWorkers: 4, // Limit workers for performance tests

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',

  // Test suites
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration-setup.js'],
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/performance-setup.js'],
      testTimeout: 300000, // 5 minutes for performance tests
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.{js,jsx,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e-setup.js'],
      testTimeout: 60000, // 1 minute for e2e tests
    },
  ],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],

  // Verbose output for debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Test result processor (removed - file doesn't exist)
};

// Create and export the Jest configuration
module.exports = createJestConfig(customJestConfig);
