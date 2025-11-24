import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { config } from '../env';
import { Database } from '../types/supabase';

// Server-side Supabase client with service role key
export const createServerClient = () => {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be used on the server side');
  }

  if (!config.supabase.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createSupabaseClient<Database>(
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
          'X-Client-Info': 'medicare-scheduler-server',
        },
      },
    },
  );
};
