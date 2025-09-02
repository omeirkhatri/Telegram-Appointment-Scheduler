import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { config } from './env';

// Enhanced Supabase client with better error handling
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'medicare-scheduler',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);

// Service role client for server-side operations (with enhanced security)
export const getServiceRoleClient = (): SupabaseClient<Database> => {
  if (typeof window !== 'undefined') {
    throw new Error('Service role client cannot be used in browser');
  }

  if (!config.supabase.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient<Database>(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'medicare-scheduler-service',
        },
      },
    },
  );
};

// Enhanced error handling
export class SupabaseError extends Error {
  public readonly code?: string;
  public readonly details?: string;
  public readonly hint?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code?: string,
    details?: string,
    hint?: string,
    retryable: boolean = false,
  ) {
    super(message);
    this.name = 'SupabaseError';
    this.code = code;
    this.details = details;
    this.hint = hint;
    this.retryable = retryable;
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
} as const;

// Exponential backoff with jitter
function calculateDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
    RETRY_CONFIG.maxDelay
  );
  const jitter = Math.random() * 0.1 * delay; // 10% jitter
  return delay + jitter;
}

// Enhanced query wrapper with retry logic
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: {
    retryable?: boolean;
    maxAttempts?: number;
  } = {}
): Promise<T> {
  const { retryable = true, maxAttempts = RETRY_CONFIG.maxAttempts } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await queryFn();

      if (error) {
        throw new SupabaseError(
          error.message || 'Database operation failed',
          error.code,
          error.details,
          error.hint,
          retryable && attempt < maxAttempts
        );
      }

      if (data === null) {
        throw new SupabaseError('No data returned from query', undefined, undefined, undefined, false);
      }

      return data;

    } catch (error) {
      lastError = error;

      // Don't retry non-retryable errors
      if (error instanceof SupabaseError && !error.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Wait before retry
      const delay = calculateDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  throw new SupabaseError(
    `Operation failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`,
    lastError?.code,
    lastError?.details,
    lastError?.hint,
    false
  );
}

// Connection health check
export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('patients').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Export types for convenience
export type { SupabaseClient } from '@supabase/supabase-js';
export type { Database } from '../types/supabase';
