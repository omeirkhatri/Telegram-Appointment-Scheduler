#!/usr/bin/env node

/**
 * Transportation Segments Setup Validation Script
 *
 * This script validates that the transportation segments feature is properly configured
 * and ready for rollout.
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function validateSetup() {
  console.log('🔍 Validating Transportation Segments Setup...\n');

  try {
    // 1. Check environment variables
    console.log('1. Checking environment variables...');
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'TRANSPORTATION_SEGMENTS_ENABLED'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      return false;
    }
    console.log('✅ Environment variables configured');

    // 2. Check transportation segments feature flags
    console.log('\n2. Checking transportation segments feature flags...');
    const transportationSegmentsEnabled = process.env.TRANSPORTATION_SEGMENTS_ENABLED === 'true';
    if (!transportationSegmentsEnabled) {
      console.log('⚠️  Transportation segments feature is disabled');
      console.log('   To enable: TRANSPORTATION_SEGMENTS_ENABLED=true');
    } else {
      console.log('✅ Transportation segments feature is enabled');
    }

    // 3. Test database connection
    console.log('\n3. Testing database connection...');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ Supabase configuration missing');
      return false;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('staff').select('count').limit(1);
    if (error) {
      console.error(`❌ Database connection failed: ${error.message}`);
      return false;
    }
    console.log('✅ Database connection successful');

    // 4. Check database schema
    console.log('\n4. Checking database schema...');
    const { data: tables, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'transportation_segments');

    if (schemaError) {
      console.error(`❌ Schema check failed: ${schemaError.message}`);
      return false;
    }

    if (!tables || tables.length === 0) {
      console.error('❌ Transportation segments table not found. Please run database migrations.');
      return false;
    }
    console.log('✅ Database schema validated');

    // 5. Test API endpoints
    console.log('\n5. Testing API endpoints...');
    const { data: segments, error: apiError } = await supabase
      .from('transportation_segments')
      .select('*')
      .limit(1);

    if (apiError) {
      console.error(`❌ API test failed: ${apiError.message}`);
      return false;
    }
    console.log('✅ API endpoints accessible');

    // 6. Display configuration summary
    console.log('\n6. Configuration Summary:');
    console.log(`Transportation Segments: ${transportationSegmentsEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Database: ${SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`API: ${SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Not configured'}`);

    console.log('\n✅ Transportation Segments setup validation completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Review the configuration summary above');
    console.log('2. Enable features gradually according to the rollout plan');
    console.log('3. Run the test suite: npm run test:transportation-segments');
    console.log('4. Follow the operations guide: docs/Guides/transportation-segments.md');

    return true;

  } catch (error) {
    console.error('❌ Setup validation failed:', error.message);
    return false;
  }
}

// Run validation
if (require.main === module) {
  validateSetup()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

module.exports = { validateSetup };
