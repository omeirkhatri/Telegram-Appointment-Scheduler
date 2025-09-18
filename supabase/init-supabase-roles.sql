-- Initialize Supabase roles and schemas
-- This script sets up the required Supabase infrastructure

-- Create Supabase roles
CREATE ROLE supabase_admin;
CREATE ROLE supabase_auth_admin;
CREATE ROLE supabase_storage_admin;
CREATE ROLE supabase_realtime_admin;
CREATE ROLE authenticator;
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;

-- Grant permissions to supabase_admin
GRANT ALL ON SCHEMA public TO supabase_admin;
GRANT ALL ON SCHEMA auth TO supabase_admin;
GRANT ALL ON SCHEMA storage TO supabase_admin;
GRANT ALL ON SCHEMA realtime TO supabase_admin;
GRANT ALL ON SCHEMA graphql_public TO supabase_admin;

-- Grant permissions to supabase_auth_admin
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA public TO supabase_auth_admin;

-- Grant permissions to supabase_storage_admin
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA public TO supabase_storage_admin;

-- Grant permissions to supabase_realtime_admin
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;
GRANT ALL ON SCHEMA public TO supabase_realtime_admin;

-- Grant permissions to authenticator
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA auth TO authenticator;
GRANT USAGE ON SCHEMA storage TO authenticator;
GRANT USAGE ON SCHEMA realtime TO authenticator;

-- Grant permissions to anon
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA realtime TO anon;

-- Grant permissions to authenticated
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA realtime TO authenticated;

-- Grant permissions to service_role
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA realtime TO service_role;

-- Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS graphql_public;

-- Set up RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO supabase_admin;

-- Enable RLS on public schema
ALTER SCHEMA public OWNER TO supabase_admin;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";
CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "wrappers";
