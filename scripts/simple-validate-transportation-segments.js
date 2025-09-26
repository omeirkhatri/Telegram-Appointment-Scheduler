#!/usr/bin/env node

/**
 * Simple Transportation Segments Validation
 *
 * This script simply checks if the transportation segments table exists and is accessible.
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function validateTransportationSegments() {
  console.log('🔍 Validating Transportation Segments Setup...\n');

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Test database connection
    console.log('1. Testing database connection...');
    const { data: staffData, error: staffError } = await supabase.from('staff').select('count').limit(1);
    if (staffError) {
      console.error('❌ Database connection failed:', staffError.message);
      return false;
    }
    console.log('✅ Database connection successful');

    // Check transportation segments table
    console.log('\n2. Checking transportation segments table...');
    const { data: segmentsData, error: segmentsError } = await supabase.from('transportation_segments').select('*').limit(1);
    if (segmentsError && segmentsError.code === 'PGRST116') {
      console.log('❌ Transportation segments table does not exist');
      console.log('📋 The table needs to be created via SQL migration');
      console.log('📋 Please run the SQL in Supabase Studio: http://127.0.0.1:54323');
      return false;
    } else if (segmentsError) {
      console.log('❌ Error checking table:', segmentsError.message);
      return false;
    } else {
      console.log('✅ Transportation segments table exists and is accessible!');
      console.log('📊 Table has', segmentsData?.length || 0, 'records');
    }

    console.log('\n🎉 Transportation Segments setup validation completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test the API endpoints');
    console.log('2. Run the test suite: npm run test:transportation-segments');
    console.log('3. Follow the rollout plan in docs/Guides/transportation-segments.md');

    return true;

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
}

// Run validation
if (require.main === module) {
  validateTransportationSegments()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

module.exports = { validateTransportationSegments };
