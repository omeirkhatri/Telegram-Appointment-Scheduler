/**
 * Global Test Setup
 *
 * This file sets up the global test environment for transportation segments testing.
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key',
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:54322/postgres',
};

// Global test setup
async function globalSetup() {
  console.log('🚀 Setting up global test environment...');

  try {
    // Initialize Supabase client
    const supabase = createClient(TEST_CONFIG.SUPABASE_URL, TEST_CONFIG.SUPABASE_ANON_KEY);

    // Test database connection
    const { data, error } = await supabase.from('staff').select('count').limit(1);
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    console.log('✅ Database connection established');

    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.TRANSPORTATION_SEGMENTS_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_UI_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_MAPS_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_REPORTING_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_OVERRIDES_ENABLED = 'true';
    process.env.TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED = 'true';

    console.log('✅ Test environment variables configured');

    // Create test database schema if needed
    await setupTestSchema(supabase);

    console.log('✅ Global test setup completed');

  } catch (error) {
    console.error('❌ Global test setup failed:', error.message);
    throw error;
  }
}

// Setup test database schema
async function setupTestSchema(supabase) {
  try {
    // Check if transportation segments table exists
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'transportation_segments');

    if (error) {
      throw new Error(`Schema check failed: ${error.message}`);
    }

    if (!tables || tables.length === 0) {
      console.log('⚠️  Transportation segments table not found. Please run migrations first.');
    } else {
      console.log('✅ Transportation segments table found');
    }

  } catch (error) {
    console.error('❌ Schema setup failed:', error.message);
    throw error;
  }
}

module.exports = globalSetup;
