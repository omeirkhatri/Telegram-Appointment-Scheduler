import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import lighthouse from 'lighthouse';
import { join } from 'path';

test.describe('Lighthouse Performance Tests', () => {

  test('should pass Lighthouse performance audit for dashboard', async ({ page }) => {
    const url = 'http://localhost:3000/dashboard';

    // Run Lighthouse audit
    const result = await lighthouse(url, {
      port: 9222,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['performance'],
    });

    const performanceScore = result?.lhr.categories.performance.score * 100;
    const metrics = result?.lhr.audits;

    console.log(`Lighthouse Performance Score: ${performanceScore}`);
    console.log(`First Contentful Paint: ${metrics?.['first-contentful-paint']?.displayValue}`);
    console.log(`Largest Contentful Paint: ${metrics?.['largest-contentful-paint']?.displayValue}`);
    console.log(`Speed Index: ${metrics?.['speed-index']?.displayValue}`);
    console.log(`Total Blocking Time: ${metrics?.['total-blocking-time']?.displayValue}`);
    console.log(`Cumulative Layout Shift: ${metrics?.['cumulative-layout-shift']?.displayValue}`);

    // Save detailed report
    const reportDir = join(process.cwd(), 'performance-reports');
    mkdirSync(reportDir, { recursive: true });

    const reportPath = join(reportDir, 'lighthouse-dashboard-report.json');
    writeFileSync(reportPath, JSON.stringify(result?.lhr, null, 2));

    console.log(`Lighthouse report saved to: ${reportPath}`);

    // Assert performance score meets requirements
    expect(performanceScore, 'Lighthouse performance score should be at least 90').toBeGreaterThanOrEqual(90);
  });

  test('should pass Lighthouse performance audit for appointments page', async ({ page }) => {
    const url = 'http://localhost:3000/appointments';

    // Run Lighthouse audit
    const result = await lighthouse(url, {
      port: 9222,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['performance'],
    });

    const performanceScore = result?.lhr.categories.performance.score * 100;
    const metrics = result?.lhr.audits;

    console.log(`Lighthouse Performance Score: ${performanceScore}`);
    console.log(`First Contentful Paint: ${metrics?.['first-contentful-paint']?.displayValue}`);
    console.log(`Largest Contentful Paint: ${metrics?.['largest-contentful-paint']?.displayValue}`);
    console.log(`Speed Index: ${metrics?.['speed-index']?.displayValue}`);
    console.log(`Total Blocking Time: ${metrics?.['total-blocking-time']?.displayValue}`);
    console.log(`Cumulative Layout Shift: ${metrics?.['cumulative-layout-shift']?.displayValue}`);

    // Save detailed report
    const reportDir = join(process.cwd(), 'performance-reports');
    mkdirSync(reportDir, { recursive: true });

    const reportPath = join(reportDir, 'lighthouse-appointments-report.json');
    writeFileSync(reportPath, JSON.stringify(result?.lhr, null, 2));

    console.log(`Lighthouse report saved to: ${reportPath}`);

    // Assert performance score meets requirements
    expect(performanceScore, 'Lighthouse performance score should be at least 85').toBeGreaterThanOrEqual(85);
  });

  test('should pass Lighthouse performance audit for patients page', async ({ page }) => {
    const url = 'http://localhost:3000/patients';

    // Run Lighthouse audit
    const result = await lighthouse(url, {
      port: 9222,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['performance'],
    });

    const performanceScore = result?.lhr.categories.performance.score * 100;
    const metrics = result?.lhr.audits;

    console.log(`Lighthouse Performance Score: ${performanceScore}`);
    console.log(`First Contentful Paint: ${metrics?.['first-contentful-paint']?.displayValue}`);
    console.log(`Largest Contentful Paint: ${metrics?.['largest-contentful-paint']?.displayValue}`);
    console.log(`Speed Index: ${metrics?.['speed-index']?.displayValue}`);
    console.log(`Total Blocking Time: ${metrics?.['total-blocking-time']?.displayValue}`);
    console.log(`Cumulative Layout Shift: ${metrics?.['cumulative-layout-shift']?.displayValue}`);

    // Save detailed report
    const reportDir = join(process.cwd(), 'performance-reports');
    mkdirSync(reportDir, { recursive: true });

    const reportPath = join(reportDir, 'lighthouse-patients-report.json');
    writeFileSync(reportPath, JSON.stringify(result?.lhr, null, 2));

    console.log(`Lighthouse report saved to: ${reportPath}`);

    // Assert performance score meets requirements
    expect(performanceScore, 'Lighthouse performance score should be at least 90').toBeGreaterThanOrEqual(90);
  });

  test('should pass Lighthouse performance audit for staff page', async ({ page }) => {
    const url = 'http://localhost:3000/staff';

    // Run Lighthouse audit
    const result = await lighthouse(url, {
      port: 9222,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['performance'],
    });

    const performanceScore = result?.lhr.categories.performance.score * 100;
    const metrics = result?.lhr.audits;

    console.log(`Lighthouse Performance Score: ${performanceScore}`);
    console.log(`First Contentful Paint: ${metrics?.['first-contentful-paint']?.displayValue}`);
    console.log(`Largest Contentful Paint: ${metrics?.['largest-contentful-paint']?.displayValue}`);
    console.log(`Speed Index: ${metrics?.['speed-index']?.displayValue}`);
    console.log(`Total Blocking Time: ${metrics?.['total-blocking-time']?.displayValue}`);
    console.log(`Cumulative Layout Shift: ${metrics?.['cumulative-layout-shift']?.displayValue}`);

    // Save detailed report
    const reportDir = join(process.cwd(), 'performance-reports');
    mkdirSync(reportDir, { recursive: true });

    const reportPath = join(reportDir, 'lighthouse-staff-report.json');
    writeFileSync(reportPath, JSON.stringify(result?.lhr, null, 2));

    console.log(`Lighthouse report saved to: ${reportPath}`);

    // Assert performance score meets requirements
    expect(performanceScore, 'Lighthouse performance score should be at least 90').toBeGreaterThanOrEqual(90);
  });

  test('should pass Lighthouse performance audit for settings page', async ({ page }) => {
    const url = 'http://localhost:3000/settings';

    // Run Lighthouse audit
    const result = await lighthouse(url, {
      port: 9222,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['performance'],
    });

    const performanceScore = result?.lhr.categories.performance.score * 100;
    const metrics = result?.lhr.audits;

    console.log(`Lighthouse Performance Score: ${performanceScore}`);
    console.log(`First Contentful Paint: ${metrics?.['first-contentful-paint']?.displayValue}`);
    console.log(`Largest Contentful Paint: ${metrics?.['largest-contentful-paint']?.displayValue}`);
    console.log(`Speed Index: ${metrics?.['speed-index']?.displayValue}`);
    console.log(`Total Blocking Time: ${metrics?.['total-blocking-time']?.displayValue}`);
    console.log(`Cumulative Layout Shift: ${metrics?.['cumulative-layout-shift']?.displayValue}`);

    // Save detailed report
    const reportDir = join(process.cwd(), 'performance-reports');
    mkdirSync(reportDir, { recursive: true });

    const reportPath = join(reportDir, 'lighthouse-settings-report.json');
    writeFileSync(reportPath, JSON.stringify(result?.lhr, null, 2));

    console.log(`Lighthouse report saved to: ${reportPath}`);

    // Assert performance score meets requirements
    expect(performanceScore, 'Lighthouse performance score should be at least 90').toBeGreaterThanOrEqual(90);
  });

  test('should generate comprehensive Lighthouse report', async ({ page }) => {
    const pages = [
      { name: 'dashboard', url: 'http://localhost:3000/dashboard' },
      { name: 'patients', url: 'http://localhost:3000/patients' },
      { name: 'staff', url: 'http://localhost:3000/staff' },
      { name: 'appointments', url: 'http://localhost:3000/appointments' },
      { name: 'settings', url: 'http://localhost:3000/settings' },
    ];

    const comprehensiveReport = {
      timestamp: new Date().toISOString(),
      pages: [],
      summary: {
        averagePerformanceScore: 0,
        totalPages: pages.length,
        passedPages: 0,
        failedPages: 0,
      },
    };

    for (const pageInfo of pages) {
      console.log(`Running Lighthouse audit for ${pageInfo.name}...`);

      const result = await lighthouse(pageInfo.url, {
        port: 9222,
        output: 'json',
        logLevel: 'info',
        onlyCategories: ['performance'],
      });

      const performanceScore = result?.lhr.categories.performance.score * 100;
      const metrics = result?.lhr.audits;

      const pageReport = {
        name: pageInfo.name,
        url: pageInfo.url,
        performanceScore,
        metrics: {
          firstContentfulPaint: metrics?.['first-contentful-paint']?.numericValue,
          largestContentfulPaint: metrics?.['largest-contentful-paint']?.numericValue,
          speedIndex: metrics?.['speed-index']?.numericValue,
          totalBlockingTime: metrics?.['total-blocking-time']?.numericValue,
          cumulativeLayoutShift: metrics?.['cumulative-layout-shift']?.numericValue,
        },
        status: performanceScore >= 90 ? 'PASS' : 'FAIL',
      };

      comprehensiveReport.pages.push(pageReport);

      if (pageReport.status === 'PASS') {
        comprehensiveReport.summary.passedPages++;
      } else {
        comprehensiveReport.summary.failedPages++;
      }
    }

    // Calculate average performance score
    const totalScore = comprehensiveReport.pages.reduce((sum, page) => sum + page.performanceScore, 0);
    comprehensiveReport.summary.averagePerformanceScore = totalScore / comprehensiveReport.pages.length;

    // Save comprehensive report
    const reportDir = join(process.cwd(), 'performance-reports');
    mkdirSync(reportDir, { recursive: true });

    const reportPath = join(reportDir, 'lighthouse-comprehensive-report.json');
    writeFileSync(reportPath, JSON.stringify(comprehensiveReport, null, 2));

    console.log('Comprehensive Lighthouse Report:', JSON.stringify(comprehensiveReport, null, 2));
    console.log(`Comprehensive report saved to: ${reportPath}`);

    // Assert overall performance
    expect(comprehensiveReport.summary.averagePerformanceScore, 'Average performance score should be at least 90').toBeGreaterThanOrEqual(90);
    expect(comprehensiveReport.summary.failedPages, 'No pages should fail performance audit').toBe(0);
  });
});
