import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');
  
  // Start browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be ready
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check if the app is running
    const title = await page.title();
    console.log(`✅ Application is running with title: ${title}`);
    
    // You can add additional setup tasks here, such as:
    // - Creating test data
    // - Setting up authentication
    // - Configuring test environment
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ E2E test global setup completed');
}

export default globalSetup;
