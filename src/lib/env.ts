import { z } from 'zod';

// Environment variable schema for validation
const envSchema = z.object({
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

  // Google Calendar API (for future use)
  GOOGLE_CALENDAR_CLIENT_ID: z.string().optional(),
  GOOGLE_CALENDAR_CLIENT_SECRET: z.string().optional(),

  // Email Configuration (for future use)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Application Configuration
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Timezone Configuration
  TZ: z.string().default('Asia/Dubai'),
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
    clientId: env.GOOGLE_CALENDAR_CLIENT_ID,
    clientSecret: env.GOOGLE_CALENDAR_CLIENT_SECRET,

    // Runtime validation helpers
    isConfigured: () => {
      return !!(env.GOOGLE_CALENDAR_CLIENT_ID && env.GOOGLE_CALENDAR_CLIENT_SECRET);
    },

    validateConfig: () => {
      if (!env.GOOGLE_CALENDAR_CLIENT_ID || !env.GOOGLE_CALENDAR_CLIENT_SECRET) {
        throw new Error('Google Calendar configuration is incomplete');
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

  // App configuration with validation
  app: {
    url: env.NEXT_PUBLIC_APP_URL,
    timezone: env.TZ,

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

    // Log configuration status
    console.log('✅ Environment validation passed');
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`🌐 App URL: ${config.app.url}`);
    console.log(`⏰ Timezone: ${config.app.timezone}`);
    console.log(`🗄️  Supabase: ${config.supabase.isLocal() ? 'Local' : 'Cloud'}`);
    console.log(`📅 Google Calendar: ${config.googleCalendar.isConfigured() ? 'Configured' : 'Not configured'}`);
    console.log(`📧 Email: ${config.email.isConfigured() ? 'Configured' : 'Not configured'}`);

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
