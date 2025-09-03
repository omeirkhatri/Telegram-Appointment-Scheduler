import { expect, test } from '@playwright/test';
import {
    assertAccessibilityCompliance,
    generateAccessibilityReport,
    runAccessibilityAudit,
} from './utils/accessibility-helpers';

test.describe('Accessibility Audit Tests', () => {

  test('should pass accessibility audit for dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Dashboard Page');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Dashboard Page');
    console.log('Dashboard Accessibility Report:', report);
  });

  test('should pass accessibility audit for patients page', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Patients Page');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Patients Page');
    console.log('Patients Accessibility Report:', report);
  });

  test('should pass accessibility audit for staff page', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Staff Page');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Staff Page');
    console.log('Staff Accessibility Report:', report);
  });

  test('should pass accessibility audit for appointments page', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Appointments Page');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Appointments Page');
    console.log('Appointments Accessibility Report:', report);
  });

  test('should pass accessibility audit for settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Settings Page');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Settings Page');
    console.log('Settings Accessibility Report:', report);
  });

  test('should pass accessibility audit for patient form modal', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Patient Form Modal');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Patient Form Modal');
    console.log('Patient Form Modal Accessibility Report:', report);
  });

  test('should pass accessibility audit for staff form modal', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');

    // Open staff form modal
    await page.click('[data-testid="new-staff-button"]');
    await page.waitForSelector('[data-testid="staff-modal"]');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Staff Form Modal');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Staff Form Modal');
    console.log('Staff Form Modal Accessibility Report:', report);
  });

  test('should pass accessibility audit for appointment form modal', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    // Open appointment form modal
    await page.click('[data-testid="new-appointment-button"]');
    await page.waitForSelector('[data-testid="appointment-modal"]');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Appointment Form Modal');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Appointment Form Modal');
    console.log('Appointment Form Modal Accessibility Report:', report);
  });

  test('should pass accessibility audit for copy appointment modal', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    // Create an appointment first
    await page.click('[data-testid="new-appointment-button"]');
    await page.waitForSelector('[data-testid="appointment-modal"]');

    // Fill and submit appointment form
    await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
    await page.fill('[data-testid="appointment-date"]', '2024-12-25');
    await page.fill('[data-testid="appointment-start-time"]', '10:00');
    await page.click('[data-testid="appointment-submit"]');

    // Wait for appointment to be created and open copy modal
    await page.waitForSelector('[data-testid="calendar-event"]');
    await page.click('[data-testid="calendar-event"]', { button: 'right' });
    await page.click('[data-testid="context-menu-copy"]');
    await page.waitForSelector('[data-testid="copy-appointment-modal"]');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Copy Appointment Modal');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Copy Appointment Modal');
    console.log('Copy Appointment Modal Accessibility Report:', report);
  });

  test('should pass accessibility audit for calendar context menu', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    // Create an appointment first
    await page.click('[data-testid="new-appointment-button"]');
    await page.waitForSelector('[data-testid="appointment-modal"]');

    // Fill and submit appointment form
    await page.selectOption('[data-testid="appointment-type"]', 'Lab Test');
    await page.fill('[data-testid="appointment-date"]', '2024-12-26');
    await page.fill('[data-testid="appointment-start-time"]', '11:00');
    await page.click('[data-testid="appointment-submit"]');

    // Wait for appointment to be created and open context menu
    await page.waitForSelector('[data-testid="calendar-event"]');
    await page.click('[data-testid="calendar-event"]', { button: 'right' });
    await page.waitForSelector('[data-testid="calendar-context-menu"]');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Calendar Context Menu');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Calendar Context Menu');
    console.log('Calendar Context Menu Accessibility Report:', report);
  });

  test('should pass accessibility audit for appointment filters', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    // Open appointment filters
    await page.click('[data-testid="appointment-filters-toggle"]');
    await page.waitForSelector('[data-testid="appointment-filters"]');

    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Appointment Filters');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Appointment Filters');
    console.log('Appointment Filters Accessibility Report:', report);
  });

  test('should pass comprehensive accessibility audit across all pages', async ({ page }) => {
    const pages = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Patients', url: '/patients' },
      { name: 'Staff', url: '/staff' },
      { name: 'Appointments', url: '/appointments' },
      { name: 'Settings', url: '/settings' },
    ];

    const comprehensiveReport = {
      timestamp: new Date().toISOString(),
      pages: [],
      summary: {
        totalPages: pages.length,
        passedPages: 0,
        failedPages: 0,
        totalViolations: 0,
        criticalViolations: 0,
        seriousViolations: 0,
        moderateViolations: 0,
        minorViolations: 0,
      },
    };

    for (const pageInfo of pages) {
      console.log(`Running accessibility audit for ${pageInfo.name}...`);

      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');

      const results = await runAccessibilityAudit(page);

      const pageReport = {
        name: pageInfo.name,
        url: pageInfo.url,
        violations: results.violations.length,
        criticalViolations: results.violations.filter(v => v.impact === 'critical').length,
        seriousViolations: results.violations.filter(v => v.impact === 'serious').length,
        moderateViolations: results.violations.filter(v => v.impact === 'moderate').length,
        minorViolations: results.violations.filter(v => v.impact === 'minor').length,
        status: results.violations.filter(v => ['critical', 'serious', 'moderate'].includes(v.impact)).length === 0 ? 'PASS' : 'FAIL',
      };

      comprehensiveReport.pages.push(pageReport);

      if (pageReport.status === 'PASS') {
        comprehensiveReport.summary.passedPages++;
      } else {
        comprehensiveReport.summary.failedPages++;
      }

      comprehensiveReport.summary.totalViolations += pageReport.violations;
      comprehensiveReport.summary.criticalViolations += pageReport.criticalViolations;
      comprehensiveReport.summary.seriousViolations += pageReport.seriousViolations;
      comprehensiveReport.summary.moderateViolations += pageReport.moderateViolations;
      comprehensiveReport.summary.minorViolations += pageReport.minorViolations;
    }

    console.log('Comprehensive Accessibility Report:', JSON.stringify(comprehensiveReport, null, 2));

    // Assert overall accessibility compliance
    expect(comprehensiveReport.summary.failedPages, 'All pages should pass accessibility audit').toBe(0);
    expect(comprehensiveReport.summary.criticalViolations, 'No critical accessibility violations should be found').toBe(0);
    expect(comprehensiveReport.summary.seriousViolations, 'No serious accessibility violations should be found').toBe(0);
    expect(comprehensiveReport.summary.moderateViolations, 'No moderate accessibility violations should be found').toBe(0);
  });
});
