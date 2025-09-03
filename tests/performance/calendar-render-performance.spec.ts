import { expect, test } from '@playwright/test';
import {
    assertPerformanceMetrics,
    CALENDAR_THRESHOLDS,
    createTestDataForPerformance,
    generatePerformanceReport,
    measureCalendarPerformance,
} from './utils/performance-helpers';

test.describe('Calendar Render Performance Tests', () => {

  test('should render calendar with 10 events within 1 second', async ({ page }) => {
    // Create test data
    await createTestDataForPerformance(page, 10);

    const metrics = await measureCalendarPerformance(page, 10);

    assertPerformanceMetrics(metrics, CALENDAR_THRESHOLDS, 'Calendar with 10 Events');

    // Generate and log performance report
    const report = generatePerformanceReport(metrics, CALENDAR_THRESHOLDS, 'Calendar with 10 Events');
    console.log('Calendar 10 Events Performance Report:', report);
  });

  test('should render calendar with 50 events within 1 second', async ({ page }) => {
    // Create test data
    await createTestDataForPerformance(page, 50);

    const metrics = await measureCalendarPerformance(page, 50);

    assertPerformanceMetrics(metrics, CALENDAR_THRESHOLDS, 'Calendar with 50 Events');

    // Generate and log performance report
    const report = generatePerformanceReport(metrics, CALENDAR_THRESHOLDS, 'Calendar with 50 Events');
    console.log('Calendar 50 Events Performance Report:', report);
  });

  test('should render calendar with 100 events within 1 second', async ({ page }) => {
    // Create test data
    await createTestDataForPerformance(page, 100);

    const metrics = await measureCalendarPerformance(page, 100);

    assertPerformanceMetrics(metrics, CALENDAR_THRESHOLDS, 'Calendar with 100 Events');

    // Generate and log performance report
    const report = generatePerformanceReport(metrics, CALENDAR_THRESHOLDS, 'Calendar with 100 Events');
    console.log('Calendar 100 Events Performance Report:', report);
  });

  test('should render calendar with 200 events within 1 second (PRD requirement)', async ({ page }) => {
    // Create test data
    await createTestDataForPerformance(page, 200);

    const metrics = await measureCalendarPerformance(page, 200);

    assertPerformanceMetrics(metrics, CALENDAR_THRESHOLDS, 'Calendar with 200 Events (PRD Requirement)');

    // Generate and log performance report
    const report = generatePerformanceReport(metrics, CALENDAR_THRESHOLDS, 'Calendar with 200 Events (PRD Requirement)');
    console.log('Calendar 200 Events Performance Report:', report);
  });

  test('should handle calendar view switching efficiently', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForSelector('[data-testid="appointment-calendar"]');

    const views = ['day', 'week', 'month', 'agenda'];
    const viewSwitchTimes: number[] = [];

    for (const view of views) {
      const startTime = Date.now();

      // Switch to view
      await page.click(`[data-testid="calendar-view-${view}"]`);
      await page.waitForSelector(`[data-testid="calendar-${view}-view"]`);

      const endTime = Date.now();
      const switchTime = endTime - startTime;
      viewSwitchTimes.push(switchTime);

      console.log(`Switched to ${view} view in ${switchTime}ms`);

      // Each view switch should be fast
      expect(switchTime, `${view} view switch should be less than 500ms`).toBeLessThan(500);
    }

    const averageSwitchTime = viewSwitchTimes.reduce((a, b) => a + b, 0) / viewSwitchTimes.length;
    console.log(`Average view switch time: ${averageSwitchTime}ms`);

    expect(averageSwitchTime, 'Average view switch time should be less than 300ms').toBeLessThan(300);
  });

  test('should handle calendar filtering efficiently', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForSelector('[data-testid="appointment-calendar"]');

    // Test different filter combinations
    const filterTests = [
      { name: 'Staff Filter', selector: '[data-testid="staff-filter"]', value: 'doctor' },
      { name: 'Type Filter', selector: '[data-testid="type-filter"]', value: 'Doctor on Call' },
      { name: 'Status Filter', selector: '[data-testid="status-filter"]', value: 'scheduled' },
    ];

    for (const filterTest of filterTests) {
      const startTime = Date.now();

      // Apply filter
      await page.selectOption(filterTest.selector, filterTest.value);
      await page.waitForSelector('[data-testid="calendar-event"]', { timeout: 5000 });

      const endTime = Date.now();
      const filterTime = endTime - startTime;

      console.log(`${filterTest.name} applied in ${filterTime}ms`);

      // Filtering should be fast
      expect(filterTime, `${filterTest.name} should apply within 500ms`).toBeLessThan(500);

      // Clear filter
      await page.selectOption(filterTest.selector, '');
    }
  });

  test('should handle calendar scrolling efficiently', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForSelector('[data-testid="appointment-calendar"]');

    // Switch to month view for scrolling test
    await page.click('[data-testid="calendar-view-month"]');
    await page.waitForSelector('[data-testid="calendar-month-view"]');

    const scrollTests = [
      { direction: 'next', selector: '[data-testid="calendar-next-month"]' },
      { direction: 'previous', selector: '[data-testid="calendar-prev-month"]' },
    ];

    for (const scrollTest of scrollTests) {
      const startTime = Date.now();

      // Scroll to next/previous month
      await page.click(scrollTest.selector);
      await page.waitForSelector('[data-testid="calendar-month-view"]');

      const endTime = Date.now();
      const scrollTime = endTime - startTime;

      console.log(`Scrolled ${scrollTest.direction} month in ${scrollTime}ms`);

      // Scrolling should be fast
      expect(scrollTime, `Scrolling ${scrollTest.direction} should be less than 300ms`).toBeLessThan(300);
    }
  });

  test('should handle calendar event interactions efficiently', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForSelector('[data-testid="appointment-calendar"]');

    // Test event interactions
    const interactionTests = [
      { name: 'Event Click', action: async () => {
        await page.click('[data-testid="calendar-event"]');
        await page.waitForSelector('[data-testid="appointment-modal"]');
      }},
      { name: 'Event Right Click', action: async () => {
        await page.click('[data-testid="calendar-event"]', { button: 'right' });
        await page.waitForSelector('[data-testid="calendar-context-menu"]');
      }},
      { name: 'Event Drag Start', action: async () => {
        const event = page.locator('[data-testid="calendar-event"]').first();
        await event.dragTo(event, { targetPosition: { x: 10, y: 10 } });
      }},
    ];

    for (const interactionTest of interactionTests) {
      const startTime = Date.now();

      await interactionTest.action();

      const endTime = Date.now();
      const interactionTime = endTime - startTime;

      console.log(`${interactionTest.name} completed in ${interactionTime}ms`);

      // Interactions should be responsive
      expect(interactionTime, `${interactionTest.name} should complete within 200ms`).toBeLessThan(200);

      // Close any opened modals/menus
      await page.keyboard.press('Escape');
    }
  });

  test('should maintain performance with multiple calendar instances', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);

    const pages = await Promise.all(contexts.map(context => context.newPage()));

    const startTime = Date.now();

    // Load calendar on multiple pages concurrently
    await Promise.all(pages.map(page => page.goto('/appointments')));
    await Promise.all(pages.map(page => page.waitForSelector('[data-testid="appointment-calendar"]')));

    const endTime = Date.now();
    const concurrentLoadTime = endTime - startTime;

    console.log(`Concurrent calendar load time: ${concurrentLoadTime}ms`);

    // Concurrent calendar loads should still be efficient
    expect(concurrentLoadTime, 'Concurrent calendar loads should complete within 2 seconds').toBeLessThan(2000);

    // Clean up
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should handle calendar with mixed appointment types efficiently', async ({ page }) => {
    // Create appointments of different types
    const appointmentTypes = ['Doctor on Call', 'Lab Test', 'Teleconsultation', 'Physiotherapy', 'Caregiver', 'IV Therapy'];

    for (let i = 0; i < appointmentTypes.length; i++) {
      await page.goto('/appointments');
      await page.click('[data-testid="new-appointment-button"]');

      await page.selectOption('[data-testid="appointment-type"]', appointmentTypes[i]);
      await page.fill('[data-testid="appointment-date"]', `2024-12-${String(20 + i).padStart(2, '0')}`);
      await page.fill('[data-testid="appointment-start-time"]', `${10 + i}:00`);

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
    }

    // Measure calendar performance with mixed types
    const metrics = await measureCalendarPerformance(page, appointmentTypes.length);

    assertPerformanceMetrics(metrics, CALENDAR_THRESHOLDS, 'Calendar with Mixed Appointment Types');

    // Generate and log performance report
    const report = generatePerformanceReport(metrics, CALENDAR_THRESHOLDS, 'Calendar with Mixed Appointment Types');
    console.log('Mixed Types Calendar Performance Report:', report);
  });
});
