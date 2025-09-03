import { z } from 'zod';

// Environment variable schema for validation
const envSchema = z.object({
  // Application Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  TZ: z.string().default('Asia/Dubai'),

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .default(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    ),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .default(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5N0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    ),

  // Google Calendar API Configuration
  GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_CALENDAR_PRIVATE_KEY: z.string().optional(),
  GOOGLE_CALENDAR_PROJECT_ID: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_ID: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALENDAR_API_KEY: z.string().optional(),
  GOOGLE_CALENDAR_WEBHOOK_SECRET: z.string().optional(),

  // Email Configuration (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().default('MediCare Scheduler'),
  SMTP_FROM_EMAIL: z.string().email().optional(),

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
  MOCK_GOOGLE_CALENDAR: z.string().transform(val => val === 'true').default(false),
  MOCK_EMAIL_SERVICE: z.string().transform(val => val === 'true').default(false),

  // Deployment Configuration
  PORT: z.string().transform(Number).default(3000),
  HEALTH_CHECK_PATH: z.string().default('/api/health'),
  CORS_ORIGIN: z.string().optional(),
});

// Enhanced environment validation with detailed error reporting
function validateEnvironment(): z.infer<typeof envSchema> {
  const envParseResult = envSchema.safeParse(process.env);

  if (!envParseResult.success) {
    const errors = envParseResult.error.flatten();

    console.error('❌ Environment validation failed:');
    console.error('Field errors:', errors.fieldErrors);
    console.error('Form errors:', errors.formErrors);

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

// Parse and validate environment variables
const env = validateEnvironment();

// Environment-specific configurations with runtime guards
export const config = {
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Supabase configuration with validation
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,

    // Runtime validation helpers
    validateConnection: () => {
      if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration is incomplete');
      }
      return true;
    },

    isLocal: () => env.NEXT_PUBLIC_SUPABASE_URL.includes('127.0.0.1') ||
                    env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost'),
  },

  // Google Calendar configuration with validation
  googleCalendar: {
    serviceAccountEmail: env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GOOGLE_CALENDAR_PRIVATE_KEY,
    projectId: env.GOOGLE_CALENDAR_PROJECT_ID,
    clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
    apiKey: env.GOOGLE_CALENDAR_API_KEY,
    webhookSecret: env.GOOGLE_CALENDAR_WEBHOOK_SECRET,

    // Runtime validation helpers
    isServiceAccountConfigured: () => {
      return !!(env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL && 
                env.GOOGLE_CALENDAR_PRIVATE_KEY && 
                env.GOOGLE_CALENDAR_PROJECT_ID);
    },

    isOAuthConfigured: () => {
      return !!(env.GOOGLE_CALENDAR_CLIENT_ID && env.GOOGLE_CALENDAR_CLIENT_SECRET);
    },

    isConfigured: () => {
      return config.googleCalendar.isServiceAccountConfigured() || 
             config.googleCalendar.isOAuthConfigured();
    },

    validateServiceAccountConfig: () => {
      if (!env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL || 
          !env.GOOGLE_CALENDAR_PRIVATE_KEY || 
          !env.GOOGLE_CALENDAR_PROJECT_ID) {
        throw new Error('Google Calendar service account configuration is incomplete');
      }
      return true;
    },

    validateOAuthConfig: () => {
      if (!env.GOOGLE_CALENDAR_CLIENT_ID || !env.GOOGLE_CALENDAR_CLIENT_SECRET) {
        throw new Error('Google Calendar OAuth configuration is incomplete');
      }
      return true;
    },
  },

  // Email configuration with validation
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    fromName: env.SMTP_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL,

    // Runtime validation helpers
    isConfigured: () => {
      return !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);
    },

    validateConfig: () => {
      if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
        throw new Error('SMTP configuration is incomplete');
      }
      return true;
    },
  },

  // Security configuration
  security: {
    jwtSecret: env.JWT_SECRET,
    rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,

    validateJWTSecret: () => {
      if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required in production');
      }
      return true;
    },
  },

  // Database configuration
  database: {
    poolSize: env.DATABASE_POOL_SIZE,
    poolTimeout: env.DATABASE_POOL_TIMEOUT,
    testUrl: env.TEST_DATABASE_URL,
  },

  // Monitoring & Logging configuration
  monitoring: {
    logLevel: env.LOG_LEVEL,
    sentryDsn: env.SENTRY_DSN,

    isSentryConfigured: () => !!env.SENTRY_DSN,
  },

  // Development & Testing configuration
  development: {
    mockGoogleCalendar: env.MOCK_GOOGLE_CALENDAR,
    mockEmailService: env.MOCK_EMAIL_SERVICE,
  },

  // App configuration with validation
  app: {
    url: env.NEXT_PUBLIC_APP_URL,
    timezone: env.TZ,
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    healthCheckPath: env.HEALTH_CHECK_PATH,
    corsOrigin: env.CORS_ORIGIN,

    // Runtime validation helpers
    validateTimezone: () => {
      const validTimezones = ['Asia/Dubai', 'UTC', 'GMT'];
      if (!validTimezones.includes(env.TZ)) {
        console.warn(`⚠️  Warning: Timezone '${env.TZ}' may not be supported. Consider using: ${validTimezones.join(', ')}`);
      }
      return true;
    },
  },
} as const;

// Runtime environment checks
export function performRuntimeChecks(): void {
  try {
    // Validate Supabase connection
    config.supabase.validateConnection();

    // Validate timezone
    config.app.validateTimezone();

    // Validate security configuration
    config.security.validateJWTSecret();

    // Log configuration status
    console.log('✅ Environment validation passed');
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 App URL: ${config.app.url}`);
    console.log(`⏰ Timezone: ${config.app.timezone}`);
    console.log(`🗄️  Supabase: ${config.supabase.isLocal() ? 'Local' : 'Cloud'}`);
    console.log(`📅 Google Calendar: ${config.googleCalendar.isConfigured() ? 'Configured' : 'Not configured'}`);
    console.log(`📧 Email: ${config.email.isConfigured() ? 'Configured' : 'Not configured'}`);
    console.log(`🔒 JWT Secret: ${config.security.jwtSecret ? 'Configured' : 'Not configured'}`);
    console.log(`📊 Log Level: ${config.monitoring.logLevel}`);
    console.log(`🔍 Sentry: ${config.monitoring.isSentryConfigured() ? 'Configured' : 'Not configured'}`);

    // Development-specific logging
    if (config.isDevelopment) {
      console.log(`🧪 Mock Google Calendar: ${config.development.mockGoogleCalendar ? 'Enabled' : 'Disabled'}`);
      console.log(`🧪 Mock Email Service: ${config.development.mockEmailService ? 'Enabled' : 'Disabled'}`);
    }

  } catch (error) {
    console.error('❌ Runtime environment check failed:', error);
    throw error;
  }
}

// Development-only environment dump (for debugging)
if (env.NODE_ENV === 'development') {
  console.log('🔧 Development mode - Environment variables loaded');
}

// Export validated environment
export { env };

// Type exports
export type Config = typeof config;
export type Env = typeof env;
