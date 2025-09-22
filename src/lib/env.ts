import { z } from 'zod';

import { LEGACY_TIMEZONE, TimezoneContext, isValidTimezone } from '@/utils/timezone';

// Client-side environment schema (only public variables)
const clientEnvSchema = z.object({
  // Application Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  TZ: z.string().default('Asia/Dubai'),
  NEXT_PUBLIC_ORGANIZATION_TIMEZONE: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_TIMEZONE: z.string().optional(),
  NEXT_PUBLIC_TZ: z.string().optional(),

  // Supabase Configuration (public only)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1),

  // Optional public variables
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED: z.string().transform(val => val === 'true').optional(),
});

// Full environment schema for server-side validation
const serverEnvSchema = clientEnvSchema.extend({
  // Server-only variables
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1),

  // Telegram Configuration
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // Security & Performance Configuration
  JWT_SECRET: z.string().optional(),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(900000),
  DATABASE_POOL_SIZE: z.string().transform(Number).default(10),
  DATABASE_POOL_TIMEOUT: z.string().transform(Number).default(30000),

  // Monitoring & Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SENTRY_DSN: z.string().url().optional(),

  // Development & Testing
  TEST_DATABASE_URL: z.string().optional(),

  // Google Calendar Service Account Configuration (server-side only)
  GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY: z.string().optional(),
  GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_CALENDAR_API_ENABLED: z.string().transform(val => val === 'true').optional(),
  GOOGLE_CALENDAR_VERIFICATION_ENABLED: z.string().transform(val => val === 'true').optional(),
  GOOGLE_CALENDAR_ORGANIZATION_NAME: z.string().default('BestDOC'),
  GOOGLE_CALENDAR_DEFAULT_TIMEZONE: z.string().default('Asia/Dubai'),
  GOOGLE_CALENDAR_MAX_RETRIES: z.string().transform(Number).default(3),
  GOOGLE_CALENDAR_RETRY_DELAY_MS: z.string().transform(Number).default(1000),
  GOOGLE_CALENDAR_OPERATION_TIMEOUT_MS: z.string().transform(Number).default(30000),
  GOOGLE_CALENDAR_EMAIL_FROM: z.string().email().optional(),
  GOOGLE_CALENDAR_EMAIL_FROM_NAME: z.string().optional(),
  GOOGLE_CALENDAR_SYNC_ENABLED: z.string().transform(val => val === 'true').optional(),

  // Deployment Configuration
  PORT: z.string().transform(Number).default(3000),
  HEALTH_CHECK_PATH: z.string().default('/api/health'),
  CORS_ORIGIN: z.string().optional(),
});

// Use appropriate schema based on environment
const envSchema = typeof window === 'undefined' ? serverEnvSchema : clientEnvSchema;

function collectEnvForValidation(): Record<string, string | undefined> {
  if (typeof window === 'undefined') {
    return process.env;
  }

  // Explicitly reference each client-side environment variable so Next.js
  // inlines the values during compilation. Accessing process.env directly on
  // the client returns an empty object, which caused validation to fail.
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    TZ: process.env.TZ,
    NEXT_PUBLIC_ORGANIZATION_TIMEZONE: process.env.NEXT_PUBLIC_ORGANIZATION_TIMEZONE,
    NEXT_PUBLIC_DEFAULT_TIMEZONE: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE,
    NEXT_PUBLIC_TZ: process.env.NEXT_PUBLIC_TZ,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SYNC_ENABLED,
  };
}

// Enhanced environment validation with detailed error reporting
function validateEnvironment(): z.infer<typeof envSchema> {
  const envSource = collectEnvForValidation();
  const envParseResult = envSchema.safeParse(envSource);

  if (!envParseResult.success) {
    const errors = envParseResult.error.flatten();

    console.error('❌ Environment validation failed:');
    console.error('Field errors:', errors.fieldErrors);
    console.error('Form errors:', errors.formErrors);
    
    // Debug: Log the actual environment variables that are causing issues
    console.error('🔍 Debug - Environment variables:');
    const isServer = typeof window === 'undefined';
    console.error('NEXT_PUBLIC_SUPABASE_URL:', envSource.NEXT_PUBLIC_SUPABASE_URL);
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', envSource.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', isServer
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
        ? 'SET'
        : 'NOT SET'
      : 'UNAVAILABLE IN CLIENT');
    console.error('NODE_ENV:', envSource.NODE_ENV);

    // Provide helpful suggestions for common issues
    const suggestions = [];

    if (errors.fieldErrors.NEXT_PUBLIC_SUPABASE_URL) {
      suggestions.push('Check that NEXT_PUBLIC_SUPABASE_URL is a valid URL');
    }

    if (errors.fieldErrors.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      suggestions.push('Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is set correctly');
    }

    if (errors.fieldErrors.SUPABASE_SERVICE_ROLE_KEY) {
      suggestions.push('Ensure SUPABASE_SERVICE_ROLE_KEY is configured (server-side only)');
    }

    if (suggestions.length > 0) {
      console.error('\n💡 Suggestions:');
      suggestions.forEach(suggestion => console.error(`  - ${suggestion}`));
    }

    throw new Error(`Environment validation failed: ${errors.formErrors.join(', ')}`);
  }

  return envParseResult.data;
}

// Parse and validate environment variables (lazy loading)
let _env: z.infer<typeof envSchema> | null = null;

function getEnv(): z.infer<typeof envSchema> {
  if (!_env) {
    _env = validateEnvironment();
  }
  return _env;
}

// Environment-specific configurations with runtime guards (lazy loading)
let _config: any = null;

function getConfig() {
  if (!_config) {
    const env = getEnv();
    const timezoneFallbackCandidates = Array.from(new Set([
      env.NEXT_PUBLIC_ORGANIZATION_TIMEZONE,
      env.NEXT_PUBLIC_DEFAULT_TIMEZONE,
      env.NEXT_PUBLIC_TZ,
      env.TZ,
    ]
      .map(value => value?.trim())
      .filter((value): value is string => Boolean(value))));

    const firstValidTimezone = timezoneFallbackCandidates.find(candidate => isValidTimezone(candidate));

    _config = {
      isDevelopment: env.NODE_ENV === 'development',
      isProduction: env.NODE_ENV === 'production',
      isTest: env.NODE_ENV === 'test',

      // Supabase configuration with validation
      supabase: {
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceRoleKey: 'SUPABASE_SERVICE_ROLE_KEY' in env ? env.SUPABASE_SERVICE_ROLE_KEY : undefined,

        // Runtime validation helpers
        validateConnection: () => {
          if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            throw new Error('Supabase configuration is incomplete');
          }
          return true;
        },

        isLocal: () => env.NEXT_PUBLIC_SUPABASE_URL.includes('127.0.0.1') ||
                        env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost'),
        
        hasServiceRoleKey: () => 'SUPABASE_SERVICE_ROLE_KEY' in env && !!env.SUPABASE_SERVICE_ROLE_KEY,
      },

      // Telegram configuration with validation (server-side only)
      telegram: {
        botToken: 'TELEGRAM_BOT_TOKEN' in env ? env.TELEGRAM_BOT_TOKEN : undefined,
        webhookSecret: 'TELEGRAM_WEBHOOK_SECRET' in env ? env.TELEGRAM_WEBHOOK_SECRET : undefined,

        // Runtime validation helpers
        isConfigured: () => {
          return 'TELEGRAM_BOT_TOKEN' in env && !!env.TELEGRAM_BOT_TOKEN;
        },

        validateConfig: () => {
          if (!('TELEGRAM_BOT_TOKEN' in env) || !env.TELEGRAM_BOT_TOKEN) {
            throw new Error('TELEGRAM_BOT_TOKEN is required for Telegram integration');
          }
          return true;
        },
      },

      // Google Calendar configuration with validation (server-side only)
      googleCalendar: {
        serviceAccountKey: 'GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY' in env ? env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY : undefined,
        serviceAccountEmail: 'GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL' in env ? env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL : undefined,
        apiEnabled: 'GOOGLE_CALENDAR_API_ENABLED' in env ? env.GOOGLE_CALENDAR_API_ENABLED : false,
        verificationEnabled: 'GOOGLE_CALENDAR_VERIFICATION_ENABLED' in env ? env.GOOGLE_CALENDAR_VERIFICATION_ENABLED : false,
        organizationName: 'GOOGLE_CALENDAR_ORGANIZATION_NAME' in env ? env.GOOGLE_CALENDAR_ORGANIZATION_NAME : 'BestDOC',
        defaultTimezone: 'GOOGLE_CALENDAR_DEFAULT_TIMEZONE' in env ? env.GOOGLE_CALENDAR_DEFAULT_TIMEZONE : 'Asia/Dubai',
        maxRetries: 'GOOGLE_CALENDAR_MAX_RETRIES' in env ? env.GOOGLE_CALENDAR_MAX_RETRIES : 3,
        retryDelayMs: 'GOOGLE_CALENDAR_RETRY_DELAY_MS' in env ? env.GOOGLE_CALENDAR_RETRY_DELAY_MS : 1000,
        operationTimeoutMs: 'GOOGLE_CALENDAR_OPERATION_TIMEOUT_MS' in env ? env.GOOGLE_CALENDAR_OPERATION_TIMEOUT_MS : 30000,
        emailFrom: 'GOOGLE_CALENDAR_EMAIL_FROM' in env ? env.GOOGLE_CALENDAR_EMAIL_FROM : undefined,
        emailFromName: 'GOOGLE_CALENDAR_EMAIL_FROM_NAME' in env ? env.GOOGLE_CALENDAR_EMAIL_FROM_NAME : undefined,
        syncEnabled: 'GOOGLE_CALENDAR_SYNC_ENABLED' in env ? env.GOOGLE_CALENDAR_SYNC_ENABLED : false,

        // Runtime validation helpers
        isConfigured: () => {
          return 'GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY' in env && 
                 !!env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY &&
                 'GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL' in env && 
                 !!env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL;
        },

        validateConfig: () => {
          if (!('GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY' in env) || !env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY) {
            throw new Error('GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY is required for Google Calendar integration');
          }
          if (!('GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL' in env) || !env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL) {
            throw new Error('GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL is required for Google Calendar integration');
          }
          return true;
        },

        // Helper to get service account credentials as JSON
        getServiceAccountCredentials: () => {
          if (!('GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY' in env) || !env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY) {
            throw new Error('Google Calendar service account key not configured');
          }
          try {
            const keyBuffer = Buffer.from(env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_KEY, 'base64');
            return JSON.parse(keyBuffer.toString('utf-8'));
          } catch (error) {
            throw new Error('Invalid Google Calendar service account key format');
          }
        },
      },

      // Security configuration (server-side only)
      security: {
        jwtSecret: 'JWT_SECRET' in env ? env.JWT_SECRET : undefined,
        rateLimitMaxRequests: 'RATE_LIMIT_MAX_REQUESTS' in env ? env.RATE_LIMIT_MAX_REQUESTS : 100,
        rateLimitWindowMs: 'RATE_LIMIT_WINDOW_MS' in env ? env.RATE_LIMIT_WINDOW_MS : 900000,

        validateJWTSecret: () => {
          if (env.NODE_ENV === 'production' && (!('JWT_SECRET' in env) || !env.JWT_SECRET)) {
            throw new Error('JWT_SECRET is required in production');
          }
          return true;
        },
      },

      // Database configuration (server-side only)
      database: {
        poolSize: 'DATABASE_POOL_SIZE' in env ? env.DATABASE_POOL_SIZE : 10,
        poolTimeout: 'DATABASE_POOL_TIMEOUT' in env ? env.DATABASE_POOL_TIMEOUT : 30000,
        testUrl: 'TEST_DATABASE_URL' in env ? env.TEST_DATABASE_URL : undefined,
      },

      // Monitoring & Logging configuration (server-side only)
      monitoring: {
        logLevel: 'LOG_LEVEL' in env ? env.LOG_LEVEL : 'info',
        sentryDsn: 'SENTRY_DSN' in env ? env.SENTRY_DSN : undefined,

        isSentryConfigured: () => 'SENTRY_DSN' in env && !!env.SENTRY_DSN,
      },

      // App configuration with validation
      app: {
        url: env.NEXT_PUBLIC_APP_URL,
        timezone: firstValidTimezone ?? LEGACY_TIMEZONE,
        nodeEnv: env.NODE_ENV,
        port: 'PORT' in env ? env.PORT : 3000,
        healthCheckPath: 'HEALTH_CHECK_PATH' in env ? env.HEALTH_CHECK_PATH : '/api/health',
        corsOrigin: 'CORS_ORIGIN' in env ? env.CORS_ORIGIN : undefined,

        // Runtime validation helpers
        validateTimezone: () => {
          if (env.TZ && !isValidTimezone(env.TZ)) {
            throw new Error(`Environment timezone '${env.TZ}' is not a valid IANA identifier`);
          }
          return true;
        },
      },

      timezone: {
        legacy: LEGACY_TIMEZONE,
        environmentFallbacks: timezoneFallbackCandidates,
        getEnvironmentFallbacks: () => [...timezoneFallbackCandidates],
        validateEnvironmentFallbacks: () => {
          const invalid = timezoneFallbackCandidates.filter(candidate => !isValidTimezone(candidate));
          if (invalid.length > 0) {
            console.warn(`⚠️  Invalid timezone fallback(s) detected: ${invalid.join(', ')}`);
          }
          return invalid.length === 0;
        },
        buildResolverContext: (context: Partial<TimezoneContext> = {}): TimezoneContext => ({
          ...context,
          fallbackTimezone: context.fallbackTimezone ?? firstValidTimezone ?? LEGACY_TIMEZONE,
          preferLegacyFallback: context.preferLegacyFallback ?? true,
        }),
      },
    };
  }
  return _config;
}

export const config = new Proxy({} as any, {
  get(target, prop) {
    return getConfig()[prop];
  }
});

// Runtime environment checks
export function performRuntimeChecks(): void {
  try {
    const env = getEnv();
    const config = getConfig();

    // Validate Supabase connection
    config.supabase.validateConnection();

    // Validate timezone
    config.app.validateTimezone();
    config.timezone.validateEnvironmentFallbacks();

    // Validate security configuration
    config.security.validateJWTSecret();

    // Validate Google Calendar configuration (if enabled)
    if (config.googleCalendar.apiEnabled) {
      config.googleCalendar.validateConfig();
    }

    // Log configuration status
    console.log('✅ Environment validation passed');
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 App URL: ${config.app.url}`);
    console.log(`⏰ Timezone: ${config.app.timezone}`);
    console.log(`🗄️  Supabase: ${config.supabase.isLocal() ? 'Local' : 'Cloud'}`);
    console.log(`📱 Telegram: ${config.telegram.isConfigured() ? 'Configured' : 'Not configured'}`);
    console.log(`📅 Google Calendar: ${config.googleCalendar.isConfigured() ? 'Configured' : 'Not configured'}`);
    console.log(`🔒 JWT Secret: ${config.security.jwtSecret ? 'Configured' : 'Not configured'}`);
    console.log(`📊 Log Level: ${config.monitoring.logLevel}`);
    console.log(`🔍 Sentry: ${config.monitoring.isSentryConfigured() ? 'Configured' : 'Not configured'}`);

  } catch (error) {
    console.error('❌ Runtime environment check failed:', error);
    throw error;
  }
}

// Development-only environment dump (for debugging)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode - Environment variables loaded');
}

// Export validated environment (lazy)
export function getEnvValue() {
  return getEnv();
}

// Type exports
export type Config = ReturnType<typeof getConfig>;
export type Env = ReturnType<typeof getEnv>;
