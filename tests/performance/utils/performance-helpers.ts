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

export interface MapPerformanceMetrics {
  mapLoadTime: number;
  markerRenderTime: number;
  clusteringTime: number;
  navigationTime: number;
  filteringTime: number;
  memoryUsage: number;
  totalTime: number;
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

export interface MapPerformanceThresholds {
  mapLoadTime: number;
  markerRenderTime: number;
  clusteringTime: number;
  navigationTime: number;
  filteringTime: number;
  memoryUsage: number;
  totalTime: number;
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
 * Map-specific performance thresholds
 */
export const MAP_PERFORMANCE_THRESHOLDS: MapPerformanceThresholds = {
  mapLoadTime: 5000, // < 5s map initialization
  markerRenderTime: 3000, // < 3s marker rendering
  clusteringTime: 2000, // < 2s clustering calculation
  navigationTime: 1000, // < 1s navigation operations
  filteringTime: 500, // < 500ms filtering operations
  memoryUsage: 100, // < 100MB memory usage
  totalTime: 8000, // < 8s total map operations
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
    eventCount,
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
 * Assert performance metrics against thresholds
 */
export function assertPerformanceMetrics(
  metrics: PerformanceMetrics,
  thresholds: PerformanceThresholds,
  testName: string,
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
  testName: string,
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
    },
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

/**
 * Measure map performance
 */
export async function measureMapPerformance(
  page: Page,
  markerCount: number,
  testName: string,
): Promise<MapPerformanceMetrics> {
  console.log(`Measuring map performance for ${testName}...`);

  const startTime = Date.now();

  // Switch to map view
  await page.click('[data-testid="map-view-option"]');

  // Measure map load time
  const mapLoadStart = Date.now();
  await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });
  await page.waitForSelector('.gm-style', { timeout: 10000 });
  const mapLoadTime = Date.now() - mapLoadStart;

  // Measure marker render time
  const markerRenderStart = Date.now();
  await page.waitForSelector('[data-testid="map-marker"], [data-testid="map-cluster"]', { timeout: 10000 });
  const markerRenderTime = Date.now() - markerRenderStart;

  // Measure clustering time (if applicable)
  const clusteringStart = Date.now();
  const hasClusters = await page.locator('[data-testid="map-cluster"]').count() > 0;
  const clusteringTime = hasClusters ? Date.now() - clusteringStart : 0;

  // Measure navigation performance
  const navigationStart = Date.now();
  await page.click('[data-testid="next-day-button"]');
  await page.waitForTimeout(500);
  await page.click('[data-testid="previous-day-button"]');
  await page.waitForTimeout(500);
  const navigationTime = Date.now() - navigationStart;

  // Measure filtering performance
  const filteringStart = Date.now();
  await page.click('[data-testid="appointment-type-filter"]');
  await page.click('[data-testid="filter-doctor-on-call"]');
  await page.waitForTimeout(500);
  await page.click('[data-testid="appointment-type-filter"]');
  await page.click('[data-testid="filter-driver-on-call"]');
  await page.waitForTimeout(500);
  const filteringTime = Date.now() - filteringStart;

  // Measure memory usage
  const memoryUsage = await page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  });

  const totalTime = Date.now() - startTime;

  const metrics: MapPerformanceMetrics = {
    mapLoadTime,
    markerRenderTime,
    clusteringTime,
    navigationTime,
    filteringTime,
    memoryUsage,
    totalTime,
  };

  console.log(`Map Performance Results for ${testName}:`);
  console.log(`Map Load Time: ${mapLoadTime}ms`);
  console.log(`Marker Render Time: ${markerRenderTime}ms`);
  console.log(`Clustering Time: ${clusteringTime}ms`);
  console.log(`Navigation Time: ${navigationTime}ms`);
  console.log(`Filtering Time: ${filteringTime}ms`);
  console.log(`Memory Usage: ${memoryUsage.toFixed(2)}MB`);
  console.log(`Total Time: ${totalTime}ms`);

  return metrics;
}

/**
 * Assert map performance metrics against thresholds
 */
export function assertMapPerformanceMetrics(
  metrics: MapPerformanceMetrics,
  thresholds: MapPerformanceThresholds,
  testName: string,
): void {
  console.log(`\n🗺️ Map Performance Results for ${testName}:`);
  console.log(`Map Load Time: ${metrics.mapLoadTime}ms (threshold: ${thresholds.mapLoadTime}ms)`);
  console.log(`Marker Render Time: ${metrics.markerRenderTime}ms (threshold: ${thresholds.markerRenderTime}ms)`);
  console.log(`Clustering Time: ${metrics.clusteringTime}ms (threshold: ${thresholds.clusteringTime}ms)`);
  console.log(`Navigation Time: ${metrics.navigationTime}ms (threshold: ${thresholds.navigationTime}ms)`);
  console.log(`Filtering Time: ${metrics.filteringTime}ms (threshold: ${thresholds.filteringTime}ms)`);
  console.log(`Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB (threshold: ${thresholds.memoryUsage}MB)`);
  console.log(`Total Time: ${metrics.totalTime}ms (threshold: ${thresholds.totalTime}ms)`);

  expect(metrics.mapLoadTime, `Map load time should be less than ${thresholds.mapLoadTime}ms`).toBeLessThan(thresholds.mapLoadTime);
  expect(metrics.markerRenderTime, `Marker render time should be less than ${thresholds.markerRenderTime}ms`).toBeLessThan(thresholds.markerRenderTime);

  if (metrics.clusteringTime > 0) {
    expect(metrics.clusteringTime, `Clustering time should be less than ${thresholds.clusteringTime}ms`).toBeLessThan(thresholds.clusteringTime);
  }

  expect(metrics.navigationTime, `Navigation time should be less than ${thresholds.navigationTime}ms`).toBeLessThan(thresholds.navigationTime);
  expect(metrics.filteringTime, `Filtering time should be less than ${thresholds.filteringTime}ms`).toBeLessThan(thresholds.filteringTime);

  if (metrics.memoryUsage > 0) {
    expect(metrics.memoryUsage, `Memory usage should be less than ${thresholds.memoryUsage}MB`).toBeLessThan(thresholds.memoryUsage);
  }

  expect(metrics.totalTime, `Total time should be less than ${thresholds.totalTime}ms`).toBeLessThan(thresholds.totalTime);
}

/**
 * Generate map performance report
 */
export function generateMapPerformanceReport(
  metrics: MapPerformanceMetrics,
  thresholds: MapPerformanceThresholds,
  testName: string,
): string {
  const report = {
    testName,
    timestamp: new Date().toISOString(),
    metrics,
    thresholds,
    passed: {
      mapLoadTime: metrics.mapLoadTime < thresholds.mapLoadTime,
      markerRenderTime: metrics.markerRenderTime < thresholds.markerRenderTime,
      clusteringTime: metrics.clusteringTime === 0 || metrics.clusteringTime < thresholds.clusteringTime,
      navigationTime: metrics.navigationTime < thresholds.navigationTime,
      filteringTime: metrics.filteringTime < thresholds.filteringTime,
      memoryUsage: metrics.memoryUsage === 0 || metrics.memoryUsage < thresholds.memoryUsage,
      totalTime: metrics.totalTime < thresholds.totalTime,
    },
  };

  return JSON.stringify(report, null, 2);
}
