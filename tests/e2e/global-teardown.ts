import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');
  
  try {
    // Add any cleanup tasks here, such as:
    // - Cleaning up test data
    // - Resetting database state
    // - Cleaning up external resources
    
    console.log('✅ E2E test global teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here to avoid masking test failures
  }
}

export default globalTeardown;
