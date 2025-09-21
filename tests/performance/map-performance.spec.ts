import { expect, test } from '@playwright/test';
import {
    assertPerformanceMetrics,
    generatePerformanceReport,
    MAP_PERFORMANCE_THRESHOLDS,
    measureMapPerformance,
} from './utils/performance-helpers';

test.describe('Map Performance Tests', () => {

  test('should load map with 10 markers within performance thresholds', async ({ page }) => {
    // Navigate to appointments page
    await page.goto('/appointments');

    // Create 10 appointments with coordinates
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="new-appointment-button"]');
      await page.waitForSelector('[data-testid="appointment-modal"]');

      // Fill appointment form
      await page.selectOption('[data-testid="appointment-patient-select"]', '1');
      await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
      await page.fill('[data-testid="appointment-date"]', '2024-12-20');
      await page.fill('[data-testid="appointment-start-time"]', `${9 + i}:00`);
      await page.selectOption('[data-testid="appointment-duration"]', '60');
      await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="toast"]');
    }

    // Switch to map view and measure performance
    const metrics = await measureMapPerformance(page, 10, '10 markers');

    assertPerformanceMetrics(metrics, MAP_PERFORMANCE_THRESHOLDS, 'Map with 10 Markers');

    const report = generatePerformanceReport(metrics, MAP_PERFORMANCE_THRESHOLDS, 'Map with 10 Markers');
    console.log('Map 10 Markers Performance Report:', report);
  });

  test('should load map with 50 markers within performance thresholds', async ({ page }) => {
    // Navigate to appointments page
    await page.goto('/appointments');

    // Create 50 appointments with coordinates
    for (let i = 0; i < 50; i++) {
      await page.click('[data-testid="new-appointment-button"]');
      await page.waitForSelector('[data-testid="appointment-modal"]');

      // Fill appointment form
      await page.selectOption('[data-testid="appointment-patient-select"]', '1');
      await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
      await page.fill('[data-testid="appointment-date"]', '2024-12-20');
      await page.fill('[data-testid="appointment-start-time"]', `${8 + (i % 12)}:00`);
      await page.selectOption('[data-testid="appointment-duration"]', '60');
      await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="toast"]');
    }

    // Switch to map view and measure performance
    const metrics = await measureMapPerformance(page, 50, '50 markers');

    assertPerformanceMetrics(metrics, MAP_PERFORMANCE_THRESHOLDS, 'Map with 50 Markers');

    const report = generatePerformanceReport(metrics, MAP_PERFORMANCE_THRESHOLDS, 'Map with 50 Markers');
    console.log('Map 50 Markers Performance Report:', report);
  });

  test('should load map with 100 markers within performance thresholds', async ({ page }) => {
    // Navigate to appointments page
    await page.goto('/appointments');

    // Create 100 appointments with coordinates
    for (let i = 0; i < 100; i++) {
      await page.click('[data-testid="new-appointment-button"]');
      await page.waitForSelector('[data-testid="appointment-modal"]');

      // Fill appointment form
      await page.selectOption('[data-testid="appointment-patient-select"]', '1');
      await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
      await page.fill('[data-testid="appointment-date"]', '2024-12-20');
      await page.fill('[data-testid="appointment-start-time"]', `${8 + (i % 12)}:00`);
      await page.selectOption('[data-testid="appointment-duration"]', '60');
      await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="toast"]');
    }

    // Switch to map view and measure performance
    const metrics = await measureMapPerformance(page, 100, '100 markers');

    assertPerformanceMetrics(metrics, MAP_PERFORMANCE_THRESHOLDS, 'Map with 100 Markers');

    const report = generatePerformanceReport(metrics, MAP_PERFORMANCE_THRESHOLDS, 'Map with 100 Markers');
    console.log('Map 100 Markers Performance Report:', report);
  });

  test('should handle map clustering performance with 200 markers', async ({ page }) => {
    // Navigate to appointments page
    await page.goto('/appointments');

    // Create 200 appointments with coordinates
    for (let i = 0; i < 200; i++) {
      await page.click('[data-testid="new-appointment-button"]');
      await page.waitForSelector('[data-testid="appointment-modal"]');

      // Fill appointment form
      await page.selectOption('[data-testid="appointment-patient-select"]', '1');
      await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
      await page.fill('[data-testid="appointment-date"]', '2024-12-20');
      await page.fill('[data-testid="appointment-start-time"]', `${8 + (i % 12)}:00`);
      await page.selectOption('[data-testid="appointment-duration"]', '60');
      await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="toast"]');
    }

    // Switch to map view and measure clustering performance
    const metrics = await measureMapPerformance(page, 200, '200 markers with clustering');

    // Clustering should improve performance for large marker counts
    const clusteringThresholds = {
      ...MAP_PERFORMANCE_THRESHOLDS,
      mapLoadTime: 8000, // Allow more time for clustering
      markerRenderTime: 5000, // Allow more time for clustering
    };

    assertPerformanceMetrics(metrics, clusteringThresholds, 'Map with 200 Markers and Clustering');

    const report = generatePerformanceReport(metrics, clusteringThresholds, 'Map with 200 Markers and Clustering');
    console.log('Map 200 Markers Clustering Performance Report:', report);
  });

  test('should handle map navigation performance', async ({ page }) => {
    // Navigate to appointments page and create test data
    await page.goto('/appointments');

    // Create appointments for different dates
    const dates = ['2024-12-20', '2024-12-21', '2024-12-22'];
    for (const date of dates) {
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid="new-appointment-button"]');
        await page.waitForSelector('[data-testid="appointment-modal"]');

        await page.selectOption('[data-testid="appointment-patient-select"]', '1');
        await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
        await page.fill('[data-testid="appointment-date"]', date);
        await page.fill('[data-testid="appointment-start-time"]', `${8 + (i % 12)}:00`);
        await page.selectOption('[data-testid="appointment-duration"]', '60');
        await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

        await page.click('[data-testid="appointment-submit"]');
        await page.waitForSelector('[data-testid="toast"]');
      }
    }

    // Switch to map view
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Measure navigation performance
    const startTime = Date.now();

    // Navigate between dates
    await page.click('[data-testid="next-day-button"]');
    await page.waitForTimeout(1000); // Wait for markers to update

    await page.click('[data-testid="next-day-button"]');
    await page.waitForTimeout(1000);

    await page.click('[data-testid="previous-day-button"]');
    await page.waitForTimeout(1000);

    const navigationTime = Date.now() - startTime;

    // Navigation should be fast
    expect(navigationTime).toBeLessThan(3000);

    console.log(`Map navigation performance: ${navigationTime}ms for 3 date changes`);
  });

  test('should handle map filtering performance', async ({ page }) => {
    // Navigate to appointments page and create test data
    await page.goto('/appointments');

    // Create appointments with different types
    const appointmentTypes = ['Doctor on Call', 'Driver on Call', 'Nurse on Call'];
    for (let i = 0; i < 30; i++) {
      await page.click('[data-testid="new-appointment-button"]');
      await page.waitForSelector('[data-testid="appointment-modal"]');

      await page.selectOption('[data-testid="appointment-patient-select"]', '1');
      await page.selectOption('[data-testid="appointment-type"]', appointmentTypes[i % 3]);
      await page.fill('[data-testid="appointment-date"]', '2024-12-20');
      await page.fill('[data-testid="appointment-start-time"]', `${8 + (i % 12)}:00`);
      await page.selectOption('[data-testid="appointment-duration"]', '60');
      await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="toast"]');
    }

    // Switch to map view
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Measure filtering performance
    const startTime = Date.now();

    // Apply filters
    await page.click('[data-testid="appointment-type-filter"]');
    await page.click('[data-testid="filter-doctor-on-call"]');
    await page.waitForTimeout(500); // Wait for markers to update

    await page.click('[data-testid="appointment-type-filter"]');
    await page.click('[data-testid="filter-driver-on-call"]');
    await page.waitForTimeout(500);

    await page.click('[data-testid="appointment-type-filter"]');
    await page.click('[data-testid="filter-nurse-on-call"]');
    await page.waitForTimeout(500);

    const filteringTime = Date.now() - startTime;

    // Filtering should be fast
    expect(filteringTime).toBeLessThan(2000);

    console.log(`Map filtering performance: ${filteringTime}ms for 3 filter changes`);
  });

  test('should handle map zoom and pan performance', async ({ page }) => {
    // Navigate to appointments page and create test data
    await page.goto('/appointments');

    // Create some appointments
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="new-appointment-button"]');
      await page.waitForSelector('[data-testid="appointment-modal"]');

      await page.selectOption('[data-testid="appointment-patient-select"]', '1');
      await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
      await page.fill('[data-testid="appointment-date"]', '2024-12-20');
      await page.fill('[data-testid="appointment-start-time"]', `${8 + (i % 12)}:00`);
      await page.selectOption('[data-testid="appointment-duration"]', '60');
      await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="toast"]');
    }

    // Switch to map view
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Measure zoom and pan performance
    const startTime = Date.now();

    // Test zoom operations
    await page.click('[data-testid="zoom-in-button"]');
    await page.waitForTimeout(200);

    await page.click('[data-testid="zoom-in-button"]');
    await page.waitForTimeout(200);

    await page.click('[data-testid="zoom-out-button"]');
    await page.waitForTimeout(200);

    await page.click('[data-testid="zoom-out-button"]');
    await page.waitForTimeout(200);

    // Test pan operations
    const mapContainer = page.locator('[data-testid="appointment-map-view"]');
    await mapContainer.dragTo(mapContainer, { targetPosition: { x: 100, y: 100 } });
    await page.waitForTimeout(200);

    await mapContainer.dragTo(mapContainer, { targetPosition: { x: -100, y: -100 } });
    await page.waitForTimeout(200);

    const zoomPanTime = Date.now() - startTime;

    // Zoom and pan should be responsive
    expect(zoomPanTime).toBeLessThan(3000);

    console.log(`Map zoom and pan performance: ${zoomPanTime}ms for multiple operations`);
  });

  test('should handle map memory usage efficiently', async ({ page }) => {
    // Navigate to appointments page
    await page.goto('/appointments');

    // Create appointments
    for (let i = 0; i < 50; i++) {
      await page.click('[data-testid="new-appointment-button"]');
      await page.waitForSelector('[data-testid="appointment-modal"]');

      await page.selectOption('[data-testid="appointment-patient-select"]', '1');
      await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
      await page.fill('[data-testid="appointment-date"]', '2024-12-20');
      await page.fill('[data-testid="appointment-start-time"]', `${8 + (i % 12)}:00`);
      await page.selectOption('[data-testid="appointment-duration"]', '60');
      await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="toast"]');
    }

    // Switch to map view
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Measure memory usage
    const memoryMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
      return null;
    });

    if (memoryMetrics) {
      const usedMB = memoryMetrics.usedJSHeapSize / (1024 * 1024);
      const totalMB = memoryMetrics.totalJSHeapSize / (1024 * 1024);

      // Memory usage should be reasonable (less than 100MB for 50 markers)
      expect(usedMB).toBeLessThan(100);

      console.log(`Map memory usage: ${usedMB.toFixed(2)}MB used, ${totalMB.toFixed(2)}MB total`);
    }
  });

  test('should handle map performance with different viewport sizes', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/appointments');

    // Create appointments
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="new-appointment-button"]');
      await page.waitForSelector('[data-testid="appointment-modal"]');

      await page.selectOption('[data-testid="appointment-patient-select"]', '1');
      await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
      await page.fill('[data-testid="appointment-date"]', '2024-12-20');
      await page.fill('[data-testid="appointment-start-time"]', `${8 + (i % 12)}:00`);
      await page.selectOption('[data-testid="appointment-duration"]', '60');
      await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="toast"]');
    }

    // Switch to map view and measure desktop performance
    const desktopMetrics = await measureMapPerformance(page, 20, 'Desktop viewport');

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const tabletMetrics = await measureMapPerformance(page, 20, 'Tablet viewport');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const mobileMetrics = await measureMapPerformance(page, 20, 'Mobile viewport');

    // All viewports should perform within thresholds
    assertPerformanceMetrics(desktopMetrics, MAP_PERFORMANCE_THRESHOLDS, 'Desktop Map Performance');
    assertPerformanceMetrics(tabletMetrics, MAP_PERFORMANCE_THRESHOLDS, 'Tablet Map Performance');
    assertPerformanceMetrics(mobileMetrics, MAP_PERFORMANCE_THRESHOLDS, 'Mobile Map Performance');

    console.log('Viewport Performance Comparison:');
    console.log(`Desktop: ${desktopMetrics.mapLoadTime}ms load, ${desktopMetrics.markerRenderTime}ms render`);
    console.log(`Tablet: ${tabletMetrics.mapLoadTime}ms load, ${tabletMetrics.markerRenderTime}ms render`);
    console.log(`Mobile: ${mobileMetrics.mapLoadTime}ms load, ${mobileMetrics.markerRenderTime}ms render`);
  });
});
