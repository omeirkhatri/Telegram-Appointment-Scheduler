import { expect, test } from '@playwright/test';
import {
    CALENDAR_THRESHOLDS,
    DEFAULT_THRESHOLDS,
    GOOGLE_SYNC_THRESHOLDS,
    measureCalendarPerformance,
    measureGoogleSyncPerformance,
    measurePageLoadPerformance,
} from './utils/performance-helpers';

test.describe('Performance Monitoring and Reporting', () => {

  test('should generate comprehensive performance report', async ({ page }) => {
    const performanceResults = {
      pageLoad: {},
      calendarRender: {},
      googleSync: {},
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
        connection: await page.evaluate(() => (navigator as any).connection?.effectiveType || 'unknown'),
      },
    };

    // Test page load performance
    console.log('Testing page load performance...');
    await page.goto('/dashboard');
    performanceResults.pageLoad = await measurePageLoadPerformance(page);

    // Test calendar render performance
    console.log('Testing calendar render performance...');
    performanceResults.calendarRender = await measureCalendarPerformance(page, 10);

    // Test Google sync performance
    console.log('Testing Google sync performance...');
    performanceResults.googleSync = await measureGoogleSyncPerformance(page);

    // Generate comprehensive report
    const comprehensiveReport = {
      summary: {
        timestamp: performanceResults.timestamp,
        environment: performanceResults.environment,
        overallStatus: 'PASSED', // Will be updated based on results
      },
      results: {
        pageLoad: {
          metrics: performanceResults.pageLoad,
          thresholds: DEFAULT_THRESHOLDS,
          status: 'PASSED',
        },
        calendarRender: {
          metrics: performanceResults.calendarRender,
          thresholds: CALENDAR_THRESHOLDS,
          status: 'PASSED',
        },
        googleSync: {
          metrics: performanceResults.googleSync,
          thresholds: GOOGLE_SYNC_THRESHOLDS,
          status: 'PASSED',
        },
      },
      recommendations: [],
    };

    // Check if any tests failed and update status
    const failedTests = [];
    if (performanceResults.pageLoad.loadTime >= DEFAULT_THRESHOLDS.loadTime) {
      failedTests.push('Page Load');
      comprehensiveReport.results.pageLoad.status = 'FAILED';
    }
    if (performanceResults.calendarRender.loadTime >= CALENDAR_THRESHOLDS.loadTime) {
      failedTests.push('Calendar Render');
      comprehensiveReport.results.calendarRender.status = 'FAILED';
    }
    if (performanceResults.googleSync.loadTime >= GOOGLE_SYNC_THRESHOLDS.loadTime) {
      failedTests.push('Google Sync');
      comprehensiveReport.results.googleSync.status = 'FAILED';
    }

    if (failedTests.length > 0) {
      comprehensiveReport.summary.overallStatus = 'FAILED';
      comprehensiveReport.recommendations.push(`Performance issues detected in: ${failedTests.join(', ')}`);
    }

    // Log comprehensive report
    console.log('Comprehensive Performance Report:', JSON.stringify(comprehensiveReport, null, 2));

    // Assert overall performance
    expect(comprehensiveReport.summary.overallStatus, 'Overall performance should pass all tests').toBe('PASSED');
  });

  test('should monitor performance over time', async ({ page }) => {
    const iterations = 3;
    const performanceHistory = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`Performance monitoring iteration ${i + 1}/${iterations}`);

      const iterationResults = {
        iteration: i + 1,
        timestamp: new Date().toISOString(),
        pageLoad: await measurePageLoadPerformance(page),
        calendarRender: await measureCalendarPerformance(page, 10),
      };

      performanceHistory.push(iterationResults);

      // Small delay between iterations
      await page.waitForTimeout(1000);
    }

    // Analyze performance trends
    const pageLoadTimes = performanceHistory.map(r => r.pageLoad.loadTime);
    const calendarRenderTimes = performanceHistory.map(r => r.calendarRender.loadTime);

    const avgPageLoadTime = pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length;
    const avgCalendarRenderTime = calendarRenderTimes.reduce((a, b) => a + b, 0) / calendarRenderTimes.length;

    const pageLoadVariance = pageLoadTimes.reduce((acc, time) => acc + Math.pow(time - avgPageLoadTime, 2), 0) / pageLoadTimes.length;
    const calendarRenderVariance = calendarRenderTimes.reduce((acc, time) => acc + Math.pow(time - avgCalendarRenderTime, 2), 0) / calendarRenderTimes.length;

    console.log(`Average page load time: ${avgPageLoadTime.toFixed(2)}ms`);
    console.log(`Average calendar render time: ${avgCalendarRenderTime.toFixed(2)}ms`);
    console.log(`Page load variance: ${pageLoadVariance.toFixed(2)}`);
    console.log(`Calendar render variance: ${calendarRenderVariance.toFixed(2)}`);

    // Performance should be consistent
    expect(avgPageLoadTime, 'Average page load time should be less than 2 seconds').toBeLessThan(2000);
    expect(avgCalendarRenderTime, 'Average calendar render time should be less than 1 second').toBeLessThan(1000);
    expect(pageLoadVariance, 'Page load performance should be consistent (low variance)').toBeLessThan(1000000); // 1 second squared
    expect(calendarRenderVariance, 'Calendar render performance should be consistent (low variance)').toBeLessThan(250000); // 0.5 seconds squared
  });

  test('should detect performance regressions', async ({ page }) => {
    // Baseline performance (simulated)
    const baselinePerformance = {
      pageLoad: 1500, // 1.5 seconds
      calendarRender: 800, // 0.8 seconds
      googleSync: 3000, // 3 seconds
    };

    // Current performance
    const currentPerformance = {
      pageLoad: (await measurePageLoadPerformance(page)).loadTime,
      calendarRender: (await measureCalendarPerformance(page, 10)).loadTime,
      googleSync: (await measureGoogleSyncPerformance(page)).loadTime,
    };

    // Calculate regression percentages
    const regressions = {
      pageLoad: ((currentPerformance.pageLoad - baselinePerformance.pageLoad) / baselinePerformance.pageLoad) * 100,
      calendarRender: ((currentPerformance.calendarRender - baselinePerformance.calendarRender) / baselinePerformance.calendarRender) * 100,
      googleSync: ((currentPerformance.googleSync - baselinePerformance.googleSync) / baselinePerformance.googleSync) * 100,
    };

    console.log('Performance Regression Analysis:');
    console.log(`Page Load: ${regressions.pageLoad.toFixed(2)}% change`);
    console.log(`Calendar Render: ${regressions.calendarRender.toFixed(2)}% change`);
    console.log(`Google Sync: ${regressions.googleSync.toFixed(2)}% change`);

    // Detect significant regressions (>20% slower)
    const significantRegressions = Object.entries(regressions)
      .filter(([_, regression]) => regression > 20)
      .map(([metric, _]) => metric);

    if (significantRegressions.length > 0) {
      console.warn(`⚠️ Performance regressions detected in: ${significantRegressions.join(', ')}`);
    }

    // Assert no significant regressions
    expect(significantRegressions.length, 'No significant performance regressions should be detected').toBe(0);
  });

  test('should monitor resource usage', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForSelector('[data-testid="appointment-calendar"]');

    // Get resource usage metrics
    const resourceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');

      const totalResourceSize = resources.reduce((total, resource) => {
        return total + (resource as any).transferSize || 0;
      }, 0);

      const resourceCount = resources.length;
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;

      return {
        totalResourceSize,
        resourceCount,
        loadTime,
        averageResourceSize: totalResourceSize / resourceCount,
      };
    });

    console.log('Resource Usage Metrics:');
    console.log(`Total resource size: ${(resourceMetrics.totalResourceSize / 1024).toFixed(2)} KB`);
    console.log(`Resource count: ${resourceMetrics.resourceCount}`);
    console.log(`Average resource size: ${(resourceMetrics.averageResourceSize / 1024).toFixed(2)} KB`);
    console.log(`Load time: ${resourceMetrics.loadTime}ms`);

    // Assert reasonable resource usage
    expect(resourceMetrics.totalResourceSize, 'Total resource size should be less than 2MB').toBeLessThan(2 * 1024 * 1024);
    expect(resourceMetrics.resourceCount, 'Resource count should be reasonable').toBeLessThan(100);
    expect(resourceMetrics.loadTime, 'Load time should be less than 2 seconds').toBeLessThan(2000);
  });

  test('should monitor memory usage', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForSelector('[data-testid="appointment-calendar"]');

    // Get memory usage metrics
    const memoryMetrics = await page.evaluate(() => {
      const memory = (performance as any).memory;
      if (memory) {
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };
      }
      return null;
    });

    if (memoryMetrics) {
      console.log('Memory Usage Metrics:');
      console.log(`Used JS Heap Size: ${(memoryMetrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Total JS Heap Size: ${(memoryMetrics.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`JS Heap Size Limit: ${(memoryMetrics.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);

      // Assert reasonable memory usage
      expect(memoryMetrics.usedJSHeapSize, 'Used JS heap size should be less than 50MB').toBeLessThan(50 * 1024 * 1024);
      expect(memoryMetrics.totalJSHeapSize, 'Total JS heap size should be less than 100MB').toBeLessThan(100 * 1024 * 1024);
    } else {
      console.log('Memory metrics not available in this browser');
    }
  });

  test('should generate performance budget report', async ({ page }) => {
    const performanceBudget = {
      pageLoad: 2000, // 2 seconds
      calendarRender: 1000, // 1 second
      googleSync: 5000, // 5 seconds
      resourceSize: 2 * 1024 * 1024, // 2MB
      resourceCount: 100,
    };

    const actualPerformance = {
      pageLoad: (await measurePageLoadPerformance(page)).loadTime,
      calendarRender: (await measureCalendarPerformance(page, 10)).loadTime,
      googleSync: (await measureGoogleSyncPerformance(page)).loadTime,
    };

    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const totalResourceSize = resources.reduce((total, resource) => {
        return total + (resource as any).transferSize || 0;
      }, 0);

      return {
        totalResourceSize,
        resourceCount: resources.length,
      };
    });

    const budgetReport = {
      timestamp: new Date().toISOString(),
      budget: performanceBudget,
      actual: {
        ...actualPerformance,
        ...resourceMetrics,
      },
      status: {
        pageLoad: actualPerformance.pageLoad <= performanceBudget.pageLoad ? 'PASS' : 'FAIL',
        calendarRender: actualPerformance.calendarRender <= performanceBudget.calendarRender ? 'PASS' : 'FAIL',
        googleSync: actualPerformance.googleSync <= performanceBudget.googleSync ? 'PASS' : 'FAIL',
        resourceSize: resourceMetrics.totalResourceSize <= performanceBudget.resourceSize ? 'PASS' : 'FAIL',
        resourceCount: resourceMetrics.resourceCount <= performanceBudget.resourceCount ? 'PASS' : 'FAIL',
      },
      utilization: {
        pageLoad: (actualPerformance.pageLoad / performanceBudget.pageLoad) * 100,
        calendarRender: (actualPerformance.calendarRender / performanceBudget.calendarRender) * 100,
        googleSync: (actualPerformance.googleSync / performanceBudget.googleSync) * 100,
        resourceSize: (resourceMetrics.totalResourceSize / performanceBudget.resourceSize) * 100,
        resourceCount: (resourceMetrics.resourceCount / performanceBudget.resourceCount) * 100,
      },
    };

    console.log('Performance Budget Report:', JSON.stringify(budgetReport, null, 2));

    // Assert all budget items pass
    expect(budgetReport.status.pageLoad, 'Page load should be within budget').toBe('PASS');
    expect(budgetReport.status.calendarRender, 'Calendar render should be within budget').toBe('PASS');
    expect(budgetReport.status.googleSync, 'Google sync should be within budget').toBe('PASS');
    expect(budgetReport.status.resourceSize, 'Resource size should be within budget').toBe('PASS');
    expect(budgetReport.status.resourceCount, 'Resource count should be within budget').toBe('PASS');
  });
});
