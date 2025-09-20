/**
 * Google Maps API Environment Configuration
 *
 * This module provides environment-specific configuration for Google Maps API
 * across development, staging, and production environments.
 */

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface GoogleMapsEnvironmentConfig {
  apiKey: string;
  libraries: string[];
  language: string;
  region: string;
  version: string;
  enableLogging: boolean;
  enableErrorReporting: boolean;
  quotaWarningThreshold: number;
  maxRetries: number;
  retryDelay: number;
  cacheTimeout: number;
  enableCaching: boolean;
}

export interface GoogleMapsConfigOptions {
  environment?: Environment;
  customApiKey?: string;
  customLibraries?: string[];
  customLanguage?: string;
  customRegion?: string;
}

/**
 * Default configuration for each environment
 */
const ENVIRONMENT_CONFIGS: Record<Environment, GoogleMapsEnvironmentConfig> = {
  test: {
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
  },
  development: {
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry'],
    language: 'en',
    region: 'AE',
    version: 'weekly',
    enableLogging: true,
    enableErrorReporting: true,
    quotaWarningThreshold: 0.7, // 70% usage warning
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    enableCaching: true
  },
  staging: {
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry'],
    language: 'en',
    region: 'AE',
    version: 'weekly',
    enableLogging: true,
    enableErrorReporting: true,
    quotaWarningThreshold: 0.8, // 80% usage warning
    maxRetries: 2,
    retryDelay: 2000, // 2 seconds
    cacheTimeout: 10 * 60 * 1000, // 10 minutes
    enableCaching: true
  },
  production: {
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'geometry'],
    language: 'en',
    region: 'AE',
    version: 'weekly',
    enableLogging: false,
    enableErrorReporting: true,
    quotaWarningThreshold: 0.9, // 90% usage warning
    maxRetries: 1,
    retryDelay: 3000, // 3 seconds
    cacheTimeout: 30 * 60 * 1000, // 30 minutes
    enableCaching: true
  }
};

/**
 * Get the current environment
 */
export function getCurrentEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV;

  switch (nodeEnv) {
    case 'test':
      return 'test';
    case 'development':
      return 'development';
    case 'staging':
      return 'staging';
    case 'production':
      return 'production';
    default:
      // Default to development for unknown environments
      return 'development';
  }
}

/**
 * Get Google Maps configuration for the current environment
 */
export function getGoogleMapsConfig(options: GoogleMapsConfigOptions = {}): GoogleMapsEnvironmentConfig {
  const environment = options.environment || getCurrentEnvironment();
  const baseConfig = ENVIRONMENT_CONFIGS[environment];

  // Override with custom options if provided
  const config: GoogleMapsEnvironmentConfig = {
    ...baseConfig,
    apiKey: options.customApiKey || baseConfig.apiKey,
    libraries: options.customLibraries || baseConfig.libraries,
    language: options.customLanguage || baseConfig.language,
    region: options.customRegion || baseConfig.region
  };

  // Validate configuration
  validateConfig(config, environment);

  return config;
}

/**
 * Get configuration for a specific environment
 */
export function getEnvironmentConfig(environment: Environment): GoogleMapsEnvironmentConfig {
  return getGoogleMapsConfig({ environment });
}

/**
 * Validate configuration
 */
function validateConfig(config: GoogleMapsEnvironmentConfig, environment: Environment): void {
  if (!config.apiKey) {
    throw new Error(`Google Maps API key is required for ${environment} environment. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file.`);
  }

  // Check for placeholder values
  const placeholderValues = [
    'your-google-maps-api-key-here',
    'your-actual-api-key-here',
    'your-api-key-here',
    'REPLACE_WITH_YOUR_API_KEY',
    'INSERT_YOUR_API_KEY_HERE'
  ];

  if (placeholderValues.some(placeholder =>
    config.apiKey.toLowerCase().includes(placeholder.toLowerCase())
  )) {
    throw new Error(`Google Maps API key is set to placeholder value for ${environment} environment. Please replace with your actual API key from Google Cloud Console.`);
  }

  if (config.libraries.length === 0) {
    throw new Error(`At least one library must be specified for ${environment} environment`);
  }

  if (config.quotaWarningThreshold < 0 || config.quotaWarningThreshold > 1) {
    throw new Error(`Quota warning threshold must be between 0 and 1 for ${environment} environment`);
  }

  if (config.maxRetries < 0) {
    throw new Error(`Max retries must be non-negative for ${environment} environment`);
  }

  if (config.retryDelay < 0) {
    throw new Error(`Retry delay must be non-negative for ${environment} environment`);
  }

  if (config.cacheTimeout < 0) {
    throw new Error(`Cache timeout must be non-negative for ${environment} environment`);
  }
}

/**
 * Get environment-specific API restrictions
 */
export function getApiRestrictions(environment: Environment): {
  allowedDomains: string[];
  allowedIps: string[];
  allowedReferrers: string[];
} {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  switch (environment) {
    case 'development':
      return {
        allowedDomains: ['localhost', '127.0.0.1'],
        allowedIps: ['127.0.0.1', '::1'],
        allowedReferrers: [
          'http://localhost:3000/*',
          'http://127.0.0.1:3000/*',
          'http://localhost:*/*'
        ]
      };

    case 'staging':
      return {
        allowedDomains: ['staging.your-domain.com'],
        allowedIps: [],
        allowedReferrers: [
          'https://staging.your-domain.com/*'
        ]
      };

    case 'production':
      return {
        allowedDomains: ['your-domain.com', 'www.your-domain.com'],
        allowedIps: [],
        allowedReferrers: [
          'https://your-domain.com/*',
          'https://www.your-domain.com/*'
        ]
      };

    default:
      return {
        allowedDomains: ['localhost'],
        allowedIps: ['127.0.0.1'],
        allowedReferrers: ['http://localhost:3000/*']
      };
  }
}

/**
 * Get environment-specific logging configuration
 */
export function getLoggingConfig(environment: Environment): {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
} {
  switch (environment) {
    case 'development':
      return {
        level: 'debug',
        enableConsole: true,
        enableRemote: false
      };

    case 'staging':
      return {
        level: 'info',
        enableConsole: true,
        enableRemote: true,
        remoteEndpoint: 'https://staging-logs.your-domain.com/api/logs'
      };

    case 'production':
      return {
        level: 'error',
        enableConsole: false,
        enableRemote: true,
        remoteEndpoint: 'https://logs.your-domain.com/api/logs'
      };

    default:
      return {
        level: 'info',
        enableConsole: true,
        enableRemote: false
      };
  }
}

/**
 * Get environment-specific performance configuration
 */
export function getPerformanceConfig(environment: Environment): {
  enableLazyLoading: boolean;
  enablePreloading: boolean;
  enableCompression: boolean;
  maxConcurrentRequests: number;
  requestTimeout: number;
} {
  switch (environment) {
    case 'development':
      return {
        enableLazyLoading: false,
        enablePreloading: false,
        enableCompression: false,
        maxConcurrentRequests: 5,
        requestTimeout: 10000 // 10 seconds
      };

    case 'staging':
      return {
        enableLazyLoading: true,
        enablePreloading: true,
        enableCompression: true,
        maxConcurrentRequests: 10,
        requestTimeout: 15000 // 15 seconds
      };

    case 'production':
      return {
        enableLazyLoading: true,
        enablePreloading: true,
        enableCompression: true,
        maxConcurrentRequests: 20,
        requestTimeout: 30000 // 30 seconds
      };

    default:
      return {
        enableLazyLoading: true,
        enablePreloading: false,
        enableCompression: true,
        maxConcurrentRequests: 10,
        requestTimeout: 15000
      };
  }
}

/**
 * Check if current environment is development
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development';
}

/**
 * Check if current environment is staging
 */
export function isStaging(): boolean {
  return getCurrentEnvironment() === 'staging';
}

/**
 * Check if current environment is production
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production';
}

export default {
  getCurrentEnvironment,
  getGoogleMapsConfig,
  getEnvironmentConfig,
  getApiRestrictions,
  getLoggingConfig,
  getPerformanceConfig,
  isDevelopment,
  isStaging,
  isProduction
};
