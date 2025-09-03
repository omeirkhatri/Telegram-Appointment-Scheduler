import { test, expect } from '@playwright/test';
import { 
  measureGoogleSyncPerformance, 
  assertPerformanceMetrics, 
  GOOGLE_SYNC_THRESHOLDS,
  generatePerformanceReport 
} from './utils/performance-helpers';

test.describe('Google Calendar Sync Performance Tests', () => {
  
  test('should sync appointment creation within 5 seconds (PRD requirement)', async ({ page }) => {
    const metrics = await measureGoogleSyncPerformance(page);
    
    assertPerformanceMetrics(metrics, GOOGLE_SYNC_THRESHOLDS, 'Google Calendar Sync - Appointment Creation');
    
    // Generate and log performance report
    const report = generatePerformanceReport(metrics, GOOGLE_SYNC_THRESHOLDS, 'Google Calendar Sync - Appointment Creation');
    console.log('Google Sync Performance Report:', report);
  });

  test('should handle multiple concurrent sync operations efficiently', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    
    const startTime = Date.now();
    
    // Create appointments concurrently to test sync performance
    const syncPromises = pages.map(async (page, index) => {
      await page.goto('/appointments');
      await page.click('[data-testid="new-appointment-button"]');
      
      await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
      await page.fill('[data-testid="appointment-date"]', `2024-12-${String(25 + index).padStart(2, '0')}`);
      await page.fill('[data-testid="appointment-start-time"]', `${10 + index}:00`);
      
      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="google-calendar-sync-status"]', { timeout: 10000 });
    });
    
    await Promise.all(syncPromises);
    
    const endTime = Date.now();
    const concurrentSyncTime = endTime - startTime;
    
    console.log(`Concurrent sync operations completed in ${concurrentSyncTime}ms`);
    
    // Concurrent syncs should complete within reasonable time
    expect(concurrentSyncTime, 'Concurrent sync operations should complete within 15 seconds').toBeLessThan(15000);
    
    // Clean up
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should handle sync retry scenarios efficiently', async ({ page }) => {
    // Mock Google Calendar API to return errors initially
    await page.route('**/api/google-calendar/**', route => {
      // First call fails, subsequent calls succeed
      if (route.request().url().includes('retry')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Temporary failure' })
        });
      }
    });
    
    const startTime = Date.now();
    
    // Create appointment that will initially fail sync
    await page.goto('/appointments');
    await page.click('[data-testid="new-appointment-button"]');
    
    await page.selectOption('[data-testid="appointment-type"]', 'Lab Test');
    await page.fill('[data-testid="appointment-date"]', '2024-12-26');
    await page.fill('[data-testid="appointment-start-time"]', '11:00');
    
    await page.click('[data-testid="appointment-submit"]');
    
    // Wait for retry to succeed
    await page.waitForSelector('[data-testid="google-calendar-sync-status"]', { timeout: 15000 });
    
    const endTime = Date.now();
    const retrySyncTime = endTime - startTime;
    
    console.log(`Sync with retry completed in ${retrySyncTime}ms`);
    
    // Retry sync should still complete within reasonable time
    expect(retrySyncTime, 'Sync with retry should complete within 10 seconds').toBeLessThan(10000);
  });

  test('should handle bulk appointment sync efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    // Create multiple appointments in sequence
    const appointmentCount = 5;
    const syncTimes: number[] = [];
    
    for (let i = 0; i < appointmentCount; i++) {
      const appointmentStartTime = Date.now();
      
      await page.goto('/appointments');
      await page.click('[data-testid="new-appointment-button"]');
      
      await page.selectOption('[data-testid="appointment-type"]', 'Physiotherapy');
      await page.fill('[data-testid="appointment-date"]', `2024-12-${String(27 + i).padStart(2, '0')}`);
      await page.fill('[data-testid="appointment-start-time"]', `${14 + i}:00`);
      
      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="google-calendar-sync-status"]', { timeout: 10000 });
      
      const appointmentEndTime = Date.now();
      const syncTime = appointmentEndTime - appointmentStartTime;
      syncTimes.push(syncTime);
      
      console.log(`Appointment ${i + 1} synced in ${syncTime}ms`);
    }
    
    const endTime = Date.now();
    const totalBulkSyncTime = endTime - startTime;
    const averageSyncTime = syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length;
    
    console.log(`Bulk sync total time: ${totalBulkSyncTime}ms`);
    console.log(`Average sync time: ${averageSyncTime}ms`);
    
    // Each individual sync should meet the 5-second requirement
    syncTimes.forEach((syncTime, index) => {
      expect(syncTime, `Appointment ${index + 1} sync should complete within 5 seconds`).toBeLessThan(5000);
    });
    
    // Average sync time should be reasonable
    expect(averageSyncTime, 'Average sync time should be less than 3 seconds').toBeLessThan(3000);
  });

  test('should handle sync with different appointment types efficiently', async ({ page }) => {
    const appointmentTypes = ['Doctor on Call', 'Lab Test', 'Teleconsultation', 'Physiotherapy', 'Caregiver', 'IV Therapy'];
    const syncTimes: number[] = [];
    
    for (let i = 0; i < appointmentTypes.length; i++) {
      const startTime = Date.now();
      
      await page.goto('/appointments');
      await page.click('[data-testid="new-appointment-button"]');
      
      await page.selectOption('[data-testid="appointment-type"]', appointmentTypes[i]);
      await page.fill('[data-testid="appointment-date"]', `2024-12-${String(28 + i).padStart(2, '0')}`);
      await page.fill('[data-testid="appointment-start-time"]', `${15 + i}:00`);
      
      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="google-calendar-sync-status"]', { timeout: 10000 });
      
      const endTime = Date.now();
      const syncTime = endTime - startTime;
      syncTimes.push(syncTime);
      
      console.log(`${appointmentTypes[i]} appointment synced in ${syncTime}ms`);
      
      // Each appointment type should sync within 5 seconds
      expect(syncTime, `${appointmentTypes[i]} sync should complete within 5 seconds`).toBeLessThan(5000);
    }
    
    const averageSyncTime = syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length;
    console.log(`Average sync time across all appointment types: ${averageSyncTime}ms`);
    
    expect(averageSyncTime, 'Average sync time should be less than 3 seconds').toBeLessThan(3000);
  });

  test('should handle sync with multiple staff members efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    // Create appointment with multiple staff members
    await page.goto('/appointments');
    await page.click('[data-testid="new-appointment-button"]');
    
    await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
    await page.fill('[data-testid="appointment-date"]', '2024-12-29');
    await page.fill('[data-testid="appointment-start-time"]', '16:00');
    
    // Add multiple staff members
    await page.click('[data-testid="add-staff-member"]');
    await page.selectOption('[data-testid="additional-staff-select"]', 'nurse');
    
    await page.click('[data-testid="add-staff-member"]');
    await page.selectOption('[data-testid="additional-staff-select"]', 'driver');
    
    await page.click('[data-testid="appointment-submit"]');
    await page.waitForSelector('[data-testid="google-calendar-sync-status"]', { timeout: 10000 });
    
    const endTime = Date.now();
    const multiStaffSyncTime = endTime - startTime;
    
    console.log(`Multi-staff appointment sync completed in ${multiStaffSyncTime}ms`);
    
    // Multi-staff sync should still complete within 5 seconds
    expect(multiStaffSyncTime, 'Multi-staff sync should complete within 5 seconds').toBeLessThan(5000);
  });

  test('should handle sync failure and recovery efficiently', async ({ page }) => {
    // Mock Google Calendar API to fail initially
    let callCount = 0;
    await page.route('**/api/google-calendar/**', route => {
      callCount++;
      if (callCount <= 2) {
        // First two calls fail
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service temporarily unavailable' })
        });
      } else {
        // Subsequent calls succeed
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
    
    const startTime = Date.now();
    
    // Create appointment that will fail sync initially
    await page.goto('/appointments');
    await page.click('[data-testid="new-appointment-button"]');
    
    await page.selectOption('[data-testid="appointment-type"]', 'IV Therapy');
    await page.fill('[data-testid="appointment-date"]', '2024-12-30');
    await page.fill('[data-testid="appointment-start-time"]', '17:00');
    
    await page.click('[data-testid="appointment-submit"]');
    
    // Wait for sync to eventually succeed
    await page.waitForSelector('[data-testid="google-calendar-sync-status"]', { timeout: 20000 });
    
    const endTime = Date.now();
    const failureRecoveryTime = endTime - startTime;
    
    console.log(`Sync failure and recovery completed in ${failureRecoveryTime}ms`);
    console.log(`Total API calls made: ${callCount}`);
    
    // Even with failures, sync should eventually complete within reasonable time
    expect(failureRecoveryTime, 'Sync failure and recovery should complete within 15 seconds').toBeLessThan(15000);
  });

  test('should handle webhook processing efficiently', async ({ page }) => {
    const startTime = Date.now();
    
    // Simulate webhook processing
    await page.goto('/api/webhooks/calendar');
    
    // Mock webhook payload
    const webhookPayload = {
      resourceId: 'test-resource-id',
      resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/test@example.com/events',
      token: 'test-token',
      type: 'sync',
      headers: {
        'X-Goog-Channel-ID': 'test-channel',
        'X-Goog-Resource-ID': 'test-resource',
        'X-Goog-Resource-State': 'exists',
        'X-Goog-Resource-URI': 'https://www.googleapis.com/calendar/v3/calendars/test@example.com/events',
      }
    };
    
    const response = await page.request.post('/api/webhooks/calendar', {
      data: webhookPayload,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const endTime = Date.now();
    const webhookProcessingTime = endTime - startTime;
    
    console.log(`Webhook processing completed in ${webhookProcessingTime}ms`);
    
    // Webhook processing should be fast
    expect(webhookProcessingTime, 'Webhook processing should complete within 2 seconds').toBeLessThan(2000);
    expect(response.status(), 'Webhook should return success status').toBe(200);
  });
});
