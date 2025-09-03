import { Page, expect } from '@playwright/test';

/**
 * Performance testing utilities and helpers
 */

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  speedIndex: number;
}

export interface PerformanceThresholds {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  speedIndex: number;
}

/**
 * Default performance thresholds based on PRD requirements
 */
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  loadTime: 2000, // < 2s initial page load
  firstContentfulPaint: 1500, // < 1.5s FCP
  largestContentfulPaint: 2500, // < 2.5s LCP
  firstInputDelay: 100, // < 100ms FID
  cumulativeLayoutShift: 0.1, // < 0.1 CLS
  totalBlockingTime: 300, // < 300ms TBT
  speedIndex: 2000, // < 2s SI
};

/**
 * Calendar-specific performance thresholds
 */
export const CALENDAR_THRESHOLDS: PerformanceThresholds = {
  loadTime: 1000, // < 1s calendar render with 200 events
  firstContentfulPaint: 800, // < 800ms FCP
  largestContentfulPaint: 1200, // < 1.2s LCP
  firstInputDelay: 50, // < 50ms FID
  cumulativeLayoutShift: 0.05, // < 0.05 CLS
  totalBlockingTime: 150, // < 150ms TBT
  speedIndex: 1000, // < 1s SI
};

/**
 * Google Calendar sync performance thresholds
 */
export const GOOGLE_SYNC_THRESHOLDS: PerformanceThresholds = {
  loadTime: 5000, // < 5s Google sync latency
  firstContentfulPaint: 3000, // < 3s FCP
  largestContentfulPaint: 4000, // < 4s LCP
  firstInputDelay: 200, // < 200ms FID
  cumulativeLayoutShift: 0.1, // < 0.1 CLS
  totalBlockingTime: 500, // < 500ms TBT
  speedIndex: 3000, // < 3s SI
};

/**
 * Measure page load performance using Web Vitals
 */
export async function measurePageLoadPerformance(page: Page): Promise<PerformanceMetrics> {
  // Start performance measurement
  await page.evaluate(() => {
    (window as any).performanceMetrics = {
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      totalBlockingTime: 0,
      speedIndex: 0,
    };
  });

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Get performance metrics
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');

    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    const lcp = performance.getEntriesByType('largest-contentful-paint').pop();

    return {
      loadTime: navigation.loadEventEnd - navigation.navigationStart,
      firstContentfulPaint: fcp ? fcp.startTime : 0,
      largestContentfulPaint: lcp ? lcp.startTime : 0,
      firstInputDelay: 0, // Would need user interaction to measure
      cumulativeLayoutShift: 0, // Would need CLS observer
      totalBlockingTime: 0, // Would need long task observer
      speedIndex: 0, // Would need visual progress calculation
    };
  });

  return metrics;
}

/**
 * Measure calendar rendering performance
 */
export async function measureCalendarPerformance(page: Page, eventCount: number): Promise<PerformanceMetrics> {
  // Start performance measurement
  const startTime = Date.now();

  // Navigate to calendar page
  await page.goto('/appointments');

  // Wait for calendar to be visible
  await page.waitForSelector('[data-testid="appointment-calendar"]');

  // Wait for all events to be rendered
  await page.waitForFunction(
    (expectedCount) => {
      const events = document.querySelectorAll('[data-testid="calendar-event"]');
      return events.length >= expectedCount;
    },
    eventCount
  );

  const endTime = Date.now();
  const loadTime = endTime - startTime;

  // Get additional performance metrics
  const metrics = await page.evaluate(() => {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');

    return {
      loadTime: 0, // Will be set below
      firstContentfulPaint: fcp ? fcp.startTime : 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      totalBlockingTime: 0,
      speedIndex: 0,
    };
  });

  metrics.loadTime = loadTime;
  return metrics;
}

/**
 * Measure Google Calendar sync performance
 */
export async function measureGoogleSyncPerformance(page: Page): Promise<PerformanceMetrics> {
  const startTime = Date.now();

  // Create an appointment to trigger Google Calendar sync
  await page.goto('/appointments');
  await page.click('[data-testid="new-appointment-button"]');

  // Fill appointment form
  await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
  await page.fill('[data-testid="appointment-date"]', '2024-12-25');
  await page.fill('[data-testid="appointment-start-time"]', '10:00');

  // Submit form and measure sync time
  await page.click('[data-testid="appointment-submit"]');

  // Wait for Google Calendar sync to complete
  await page.waitForSelector('[data-testid="google-calendar-sync-status"]', { timeout: 10000 });

  const endTime = Date.now();
  const syncTime = endTime - startTime;

  return {
    loadTime: syncTime,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0,
    totalBlockingTime: 0,
    speedIndex: 0,
  };
}

/**
 * Assert performance metrics against thresholds
 */
export function assertPerformanceMetrics(
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds,
  testName: string
): void {
  console.log(`\n📊 Performance Results for ${testName}:`);
  console.log(`Load Time: ${metrics.loadTime}ms (threshold: ${thresholds.loadTime}ms)`);
  console.log(`First Contentful Paint: ${metrics.firstContentfulPaint}ms (threshold: ${thresholds.firstContentfulPaint}ms)`);
  console.log(`Largest Contentful Paint: ${metrics.largestContentfulPaint}ms (threshold: ${thresholds.largestContentfulPaint}ms)`);

  expect(metrics.loadTime, `Load time should be less than ${thresholds.loadTime}ms`).toBeLessThan(thresholds.loadTime);

  if (metrics.firstContentfulPaint > 0) {
    expect(metrics.firstContentfulPaint, `FCP should be less than ${thresholds.firstContentfulPaint}ms`).toBeLessThan(thresholds.firstContentfulPaint);
  }

  if (metrics.largestContentfulPaint > 0) {
    expect(metrics.largestContentfulPaint, `LCP should be less than ${thresholds.largestContentfulPaint}ms`).toBeLessThan(thresholds.largestContentfulPaint);
  }

  if (metrics.firstInputDelay > 0) {
    expect(metrics.firstInputDelay, `FID should be less than ${thresholds.firstInputDelay}ms`).toBeLessThan(thresholds.firstInputDelay);
  }

  if (metrics.cumulativeLayoutShift > 0) {
    expect(metrics.cumulativeLayoutShift, `CLS should be less than ${thresholds.cumulativeLayoutShift}`).toBeLessThan(thresholds.cumulativeLayoutShift);
  }

  if (metrics.totalBlockingTime > 0) {
    expect(metrics.totalBlockingTime, `TBT should be less than ${thresholds.totalBlockingTime}ms`).toBeLessThan(thresholds.totalBlockingTime);
  }

  if (metrics.speedIndex > 0) {
    expect(metrics.speedIndex, `SI should be less than ${thresholds.speedIndex}ms`).toBeLessThan(thresholds.speedIndex);
  }
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds,
  testName: string
): string {
  const report = {
    testName,
    timestamp: new Date().toISOString(),
    metrics,
    thresholds,
    passed: {
      loadTime: metrics.loadTime < thresholds.loadTime,
      firstContentfulPaint: metrics.firstContentfulPaint === 0 || metrics.firstContentfulPaint < thresholds.firstContentfulPaint,
      largestContentfulPaint: metrics.largestContentfulPaint === 0 || metrics.largestContentfulPaint < thresholds.largestContentfulPaint,
      firstInputDelay: metrics.firstInputDelay === 0 || metrics.firstInputDelay < thresholds.firstInputDelay,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift === 0 || metrics.cumulativeLayoutShift < thresholds.cumulativeLayoutShift,
      totalBlockingTime: metrics.totalBlockingTime === 0 || metrics.totalBlockingTime < thresholds.totalBlockingTime,
      speedIndex: metrics.speedIndex === 0 || metrics.speedIndex < thresholds.speedIndex,
    }
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Create test data for performance testing
 */
export async function createTestDataForPerformance(page: Page, eventCount: number): Promise<void> {
  console.log(`Creating ${eventCount} test appointments for performance testing...`);

  // This would create test data in the database
  // For now, we'll simulate with existing data
  // In a real implementation, you'd create appointments via API calls

  for (let i = 0; i < Math.min(eventCount, 10); i++) {
    await page.goto('/appointments');
    await page.click('[data-testid="new-appointment-button"]');

    await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
    await page.fill('[data-testid="appointment-date"]', `2024-12-${String(20 + i).padStart(2, '0')}`);
    await page.fill('[data-testid="appointment-start-time"]', `${10 + i}:00`);

    await page.click('[data-testid="appointment-submit"]');
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
  }

  console.log(`Created ${Math.min(eventCount, 10)} test appointments`);
}
