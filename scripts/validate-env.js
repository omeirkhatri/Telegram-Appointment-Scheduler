#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * This script validates the environment configuration for the MediCare Scheduler application.
 * It checks for required environment variables, validates their formats, and provides
 * helpful suggestions for common configuration issues.
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

// Load environment variables from .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  try {
    // Simple .env file parser (without external dependencies)
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=');
          // Remove surrounding quotes
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.log('⚠️  Could not load .env.local file. Using system environment variables.');
  }
} else {
  console.log('⚠️  No .env.local file found. Using system environment variables.');
}

// Environment validation schema
const envSchema = z.object({
  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  TZ: z.string().default('Asia/Dubai'),

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

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

// Validation results
const results = {
  valid: true,
  errors: [],
  warnings: [],
  suggestions: [],
  summary: {
    total: 0,
    configured: 0,
    missing: 0,
    invalid: 0
  }
};

// Helper functions
function addError(message, variable = null) {
  results.errors.push({ message, variable });
  results.valid = false;
  results.summary.invalid++;
}

function addWarning(message, variable = null) {
  results.warnings.push({ message, variable });
}

function addSuggestion(message) {
  results.suggestions.push(message);
}

function isConfigured(value) {
  return value !== undefined && value !== null && value !== '';
}

function validateGoogleCalendarConfig(env) {
  const hasServiceAccount = isConfigured(env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL) &&
                           isConfigured(env.GOOGLE_CALENDAR_PRIVATE_KEY) &&
                           isConfigured(env.GOOGLE_CALENDAR_PROJECT_ID);
  
  const hasOAuth = isConfigured(env.GOOGLE_CALENDAR_CLIENT_ID) &&
                  isConfigured(env.GOOGLE_CALENDAR_CLIENT_SECRET);

  if (!hasServiceAccount && !hasOAuth) {
    addWarning('Google Calendar API is not configured. Calendar integration will not work.', 'GOOGLE_CALENDAR_*');
    addSuggestion('Configure either service account authentication or OAuth2 client authentication for Google Calendar integration.');
  } else if (hasServiceAccount && hasOAuth) {
    addWarning('Both service account and OAuth2 authentication are configured. Service account will be used by default.');
  }
}

function validateEmailConfig(env) {
  const hasEmailConfig = isConfigured(env.SMTP_HOST) &&
                        isConfigured(env.SMTP_PORT) &&
                        isConfigured(env.SMTP_USER) &&
                        isConfigured(env.SMTP_PASS);

  if (!hasEmailConfig) {
    addWarning('Email configuration is incomplete. Daily agenda emails and notifications will not work.', 'SMTP_*');
    addSuggestion('Configure SMTP settings for email functionality.');
  }
}

function validateSecurityConfig(env) {
  if (env.NODE_ENV === 'production' && !isConfigured(env.JWT_SECRET)) {
    addError('JWT_SECRET is required in production environment.', 'JWT_SECRET');
  }

  if (!isConfigured(env.GOOGLE_CALENDAR_WEBHOOK_SECRET)) {
    addWarning('Google Calendar webhook secret is not configured. Webhook security may be compromised.', 'GOOGLE_CALENDAR_WEBHOOK_SECRET');
    addSuggestion('Generate a secure random string for webhook validation.');
  }
}

function validateSupabaseConfig(env) {
  const isLocal = env.NEXT_PUBLIC_SUPABASE_URL.includes('127.0.0.1') || 
                  env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost');

  if (isLocal && env.NODE_ENV === 'production') {
    addError('Local Supabase URL detected in production environment.', 'NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!isLocal && env.NODE_ENV === 'development') {
    addWarning('Using cloud Supabase in development. Consider using local Supabase for development.', 'NEXT_PUBLIC_SUPABASE_URL');
  }
}

// Main validation function
function validateEnvironment() {
  console.log('🔍 Validating environment configuration...\n');

  try {
    // Parse and validate environment variables
    const envParseResult = envSchema.safeParse(process.env);
    
    if (!envParseResult.success) {
      console.log('❌ Environment validation failed:\n');
      
      if (envParseResult.error.errors) {
        envParseResult.error.errors.forEach(error => {
          const path = error.path.join('.');
          const message = `${path}: ${error.message}`;
          addError(message, path);
          console.log(`  • ${message}`);
        });
      } else {
        console.log(`  • ${envParseResult.error.message}`);
        addError(envParseResult.error.message);
      }

      console.log('\n💡 Suggestions:');
      console.log('  • Copy env.example to .env.local and fill in the required values');
      console.log('  • Check the documentation in docs/environment-setup.md');
      console.log('  • Ensure all required environment variables are set');
      
      return false;
    }

    const env = envParseResult.data;
    results.summary.total = Object.keys(envSchema.shape).length;

    // Count configured variables
    Object.entries(env).forEach(([key, value]) => {
      if (isConfigured(value)) {
        results.summary.configured++;
      } else {
        results.summary.missing++;
      }
    });

    // Additional validations
    validateGoogleCalendarConfig(env);
    validateEmailConfig(env);
    validateSecurityConfig(env);
    validateSupabaseConfig(env);

    // Display results
    console.log('✅ Environment validation completed\n');
    
    // Configuration summary
    console.log('📊 Configuration Summary:');
    console.log(`  • Total variables: ${results.summary.total}`);
    console.log(`  • Configured: ${results.summary.configured}`);
    console.log(`  • Missing: ${results.summary.missing}`);
    console.log(`  • Invalid: ${results.summary.invalid}\n`);

    // Environment info
    console.log('🌍 Environment Information:');
    console.log(`  • Environment: ${env.NODE_ENV}`);
    console.log(`  • App URL: ${env.NEXT_PUBLIC_APP_URL}`);
    console.log(`  • Timezone: ${env.TZ}`);
    console.log(`  • Port: ${env.PORT}\n`);

    // Service status
    console.log('🔧 Service Configuration Status:');
    
    const supabaseStatus = env.NEXT_PUBLIC_SUPABASE_URL.includes('127.0.0.1') ? 'Local' : 'Cloud';
    console.log(`  • Supabase: ${supabaseStatus}`);
    
    const googleCalendarStatus = (isConfigured(env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL) || 
                                 isConfigured(env.GOOGLE_CALENDAR_CLIENT_ID)) ? 'Configured' : 'Not configured';
    console.log(`  • Google Calendar: ${googleCalendarStatus}`);
    
    const emailStatus = (isConfigured(env.SMTP_HOST) && isConfigured(env.SMTP_PORT) && 
                        isConfigured(env.SMTP_USER) && isConfigured(env.SMTP_PASS)) ? 'Configured' : 'Not configured';
    console.log(`  • Email (SMTP): ${emailStatus}`);
    
    const jwtStatus = isConfigured(env.JWT_SECRET) ? 'Configured' : 'Not configured';
    console.log(`  • JWT Secret: ${jwtStatus}`);
    
    const sentryStatus = isConfigured(env.SENTRY_DSN) ? 'Configured' : 'Not configured';
    console.log(`  • Sentry: ${sentryStatus}\n`);

    // Display warnings
    if (results.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      results.warnings.forEach(warning => {
        console.log(`  • ${warning.message}`);
      });
      console.log('');
    }

    // Display suggestions
    if (results.suggestions.length > 0) {
      console.log('💡 Suggestions:');
      results.suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion}`);
      });
      console.log('');
    }

    // Final status
    if (results.valid) {
      console.log('🎉 Environment configuration is valid!');
      if (results.warnings.length > 0) {
        console.log('   Some optional features may not be available due to missing configuration.');
      }
    } else {
      console.log('❌ Environment configuration has errors that must be fixed.');
    }

    return results.valid;

  } catch (error) {
    console.error('💥 Validation script error:', error.message);
    return false;
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const isValid = validateEnvironment();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateEnvironment, results };
