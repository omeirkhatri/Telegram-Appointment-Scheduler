/**
 * Global Test Teardown
 *
 * This file cleans up the global test environment after all tests complete.
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key',
};

// Global test teardown
async function globalTeardown() {
  console.log('🧹 Cleaning up global test environment...');

  try {
    // Initialize Supabase client
    const supabase = createClient(TEST_CONFIG.SUPABASE_URL, TEST_CONFIG.SUPABASE_ANON_KEY);

    // Clean up test data
    await cleanupTestData(supabase);

    console.log('✅ Global test teardown completed');

  } catch (error) {
    console.error('❌ Global test teardown failed:', error.message);
    // Don't throw error to avoid masking test failures
  }
}

// Clean up test data
async function cleanupTestData(supabase) {
  try {
    // Delete test transportation segments
    const { error: segmentsError } = await supabase
      .from('transportation_segments')
      .delete()
      .like('instructions', 'Test instructions%');

    if (segmentsError) {
      console.warn('⚠️  Failed to clean up test segments:', segmentsError.message);
    } else {
      console.log('✅ Test segments cleaned up');
    }

    // Delete test appointments
    const { error: appointmentsError } = await supabase
      .from('appointments')
      .delete()
      .like('patient_name', 'Test Patient%');

    if (appointmentsError) {
      console.warn('⚠️  Failed to clean up test appointments:', appointmentsError.message);
    } else {
      console.log('✅ Test appointments cleaned up');
    }

    // Delete test staff
    const { error: staffError } = await supabase
      .from('staff')
      .delete()
      .like('name', 'Test Driver%');

    if (staffError) {
      console.warn('⚠️  Failed to clean up test staff:', staffError.message);
    } else {
      console.log('✅ Test staff cleaned up');
    }

  } catch (error) {
    console.error('❌ Test data cleanup failed:', error.message);
  }
}

module.exports = globalTeardown;
