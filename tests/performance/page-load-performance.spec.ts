import { expect, test } from '@playwright/test';
import {
    assertPerformanceMetrics,
    DEFAULT_THRESHOLDS,
    generatePerformanceReport,
    measurePageLoadPerformance
} from './utils/performance-helpers';

test.describe('Page Load Performance Tests', () => {

  test('should load dashboard page within 2 seconds', async ({ page }) => {
    const metrics = await measurePageLoadPerformance(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    const dashboardMetrics = await measurePageLoadPerformance(page);

    assertPerformanceMetrics(dashboardMetrics, DEFAULT_THRESHOLDS, 'Dashboard Page Load');

    // Generate and log performance report
    const report = generatePerformanceReport(dashboardMetrics, DEFAULT_THRESHOLDS, 'Dashboard Page Load');
    console.log('Dashboard Performance Report:', report);
  });

  test('should load patients page within 2 seconds', async ({ page }) => {
    const metrics = await measurePageLoadPerformance(page);

    // Navigate to patients page
    await page.goto('/patients');
    const patientsMetrics = await measurePageLoadPerformance(page);

    assertPerformanceMetrics(patientsMetrics, DEFAULT_THRESHOLDS, 'Patients Page Load');

    // Generate and log performance report
    const report = generatePerformanceReport(patientsMetrics, DEFAULT_THRESHOLDS, 'Patients Page Load');
    console.log('Patients Performance Report:', report);
  });

  test('should load staff page within 2 seconds', async ({ page }) => {
    const metrics = await measurePageLoadPerformance(page);

    // Navigate to staff page
    await page.goto('/staff');
    const staffMetrics = await measurePageLoadPerformance(page);

    assertPerformanceMetrics(staffMetrics, DEFAULT_THRESHOLDS, 'Staff Page Load');

    // Generate and log performance report
    const report = generatePerformanceReport(staffMetrics, DEFAULT_THRESHOLDS, 'Staff Page Load');
    console.log('Staff Performance Report:', report);
  });

  test('should load appointments page within 2 seconds', async ({ page }) => {
    const metrics = await measurePageLoadPerformance(page);

    // Navigate to appointments page
    await page.goto('/appointments');
    const appointmentsMetrics = await measurePageLoadPerformance(page);

    assertPerformanceMetrics(appointmentsMetrics, DEFAULT_THRESHOLDS, 'Appointments Page Load');

    // Generate and log performance report
    const report = generatePerformanceReport(appointmentsMetrics, DEFAULT_THRESHOLDS, 'Appointments Page Load');
    console.log('Appointments Performance Report:', report);
  });

  test('should load settings page within 2 seconds', async ({ page }) => {
    const metrics = await measurePageLoadPerformance(page);

    // Navigate to settings page
    await page.goto('/settings');
    const settingsMetrics = await measurePageLoadPerformance(page);

    assertPerformanceMetrics(settingsMetrics, DEFAULT_THRESHOLDS, 'Settings Page Load');

    // Generate and log performance report
    const report = generatePerformanceReport(settingsMetrics, DEFAULT_THRESHOLDS, 'Settings Page Load');
    console.log('Settings Performance Report:', report);
  });

  test('should handle navigation between pages efficiently', async ({ page }) => {
    const startTime = Date.now();

    // Navigate through all main pages
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    await page.goto('/staff');
    await page.waitForLoadState('networkidle');

    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const endTime = Date.now();
    const totalNavigationTime = endTime - startTime;

    console.log(`Total navigation time: ${totalNavigationTime}ms`);

    // Each page should load within 2 seconds, so 5 pages should take less than 10 seconds
    expect(totalNavigationTime, 'Total navigation time should be less than 10 seconds').toBeLessThan(10000);
  });

  test('should maintain performance with cached resources', async ({ page }) => {
    // First load (cold cache)
    const startTime1 = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const coldLoadTime = Date.now() - startTime1;

    // Second load (warm cache)
    const startTime2 = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const warmLoadTime = Date.now() - startTime2;

    console.log(`Cold load time: ${coldLoadTime}ms`);
    console.log(`Warm load time: ${warmLoadTime}ms`);

    // Warm load should be significantly faster
    expect(warmLoadTime, 'Warm load should be faster than cold load').toBeLessThan(coldLoadTime);
    expect(warmLoadTime, 'Warm load should be less than 1 second').toBeLessThan(1000);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Test with a page that might have large datasets
    const startTime = Date.now();

    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Wait for any data loading to complete
    await page.waitForSelector('[data-testid="patient-list"]', { timeout: 10000 });

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    console.log(`Patients page load time with data: ${loadTime}ms`);

    // Should still load within 2 seconds even with data
    expect(loadTime, 'Patients page should load within 2 seconds even with data').toBeLessThan(2000);
  });

  test('should handle concurrent page loads efficiently', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);

    const pages = await Promise.all(contexts.map(context => context.newPage()));

    const startTime = Date.now();

    // Load different pages concurrently
    await Promise.all([
      pages[0].goto('/dashboard'),
      pages[1].goto('/patients'),
      pages[2].goto('/staff'),
    ]);

    // Wait for all pages to be ready
    await Promise.all(pages.map(page => page.waitForLoadState('networkidle')));

    const endTime = Date.now();
    const concurrentLoadTime = endTime - startTime;

    console.log(`Concurrent load time: ${concurrentLoadTime}ms`);

    // Concurrent loads should still be efficient
    expect(concurrentLoadTime, 'Concurrent page loads should complete within 5 seconds').toBeLessThan(5000);

    // Clean up
    await Promise.all(contexts.map(context => context.close()));
  });
});
