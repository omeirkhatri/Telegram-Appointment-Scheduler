import { expect, test } from '@playwright/test';
import {
    testKeyboardNavigation,
} from './utils/accessibility-helpers';

test.describe('Keyboard Navigation Tests', () => {

  test('should support keyboard navigation on dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Test common keyboard navigation
    const dashboardSelectors = [
      'a[href="/patients"]',
      'a[href="/staff"]',
      'a[href="/appointments"]',
      'a[href="/settings"]',
      'button',
    ].filter(selector => {
      // Only test selectors that exist on the page
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, dashboardSelectors);
  });

  test('should support keyboard navigation on patients page', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    const patientSelectors = [
      '[data-testid="new-patient-button"]',
      '[data-testid="patient-search"]',
      'a[href="/dashboard"]',
      'a[href="/staff"]',
      'a[href="/appointments"]',
      'a[href="/settings"]',
    ].filter(selector => {
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, patientSelectors);
  });

  test('should support keyboard navigation on staff page', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');

    const staffSelectors = [
      '[data-testid="new-staff-button"]',
      '[data-testid="staff-search"]',
      'a[href="/dashboard"]',
      'a[href="/patients"]',
      'a[href="/appointments"]',
      'a[href="/settings"]',
    ].filter(selector => {
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, staffSelectors);
  });

  test('should support keyboard navigation on appointments page', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    const appointmentSelectors = [
      '[data-testid="new-appointment-button"]',
      '[data-testid="appointment-filters-toggle"]',
      'a[href="/dashboard"]',
      'a[href="/patients"]',
      'a[href="/staff"]',
      'a[href="/settings"]',
    ].filter(selector => {
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, appointmentSelectors);
  });

  test('should support keyboard navigation on settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const settingsSelectors = [
      'a[href="/dashboard"]',
      'a[href="/patients"]',
      'a[href="/staff"]',
      'a[href="/appointments"]',
      'button',
    ].filter(selector => {
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, settingsSelectors);
  });

  test('should support keyboard navigation in patient form modal', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');

    const patientFormSelectors = [
      '[data-testid="patient-name"]',
      '[data-testid="patient-phone"]',
      '[data-testid="patient-flat-villa-no"]',
      '[data-testid="patient-building-street"]',
      '[data-testid="patient-area"]',
      '[data-testid="patient-city"]',
      '[data-testid="patient-google-maps-link"]',
      '[data-testid="patient-medical-notes"]',
      '[data-testid="patient-emergency-contact"]',
      '[data-testid="patient-preferred-transport"]',
      '[data-testid="patient-submit"]',
      '[data-testid="patient-cancel"]',
    ].filter(selector => {
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, patientFormSelectors);
  });

  test('should support keyboard navigation in staff form modal', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');

    // Open staff form modal
    await page.click('[data-testid="new-staff-button"]');
    await page.waitForSelector('[data-testid="staff-modal"]');

    const staffFormSelectors = [
      '[data-testid="staff-first-name"]',
      '[data-testid="staff-last-name"]',
      '[data-testid="staff-type"]',
      '[data-testid="staff-specialization"]',
      '[data-testid="staff-phone"]',
      '[data-testid="staff-email"]',
      '[data-testid="staff-google-calendar-id"]',
      '[data-testid="staff-submit"]',
      '[data-testid="staff-cancel"]',
    ].filter(selector => {
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, staffFormSelectors);
  });

  test('should support keyboard navigation in appointment form modal', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    // Open appointment form modal
    await page.click('[data-testid="new-appointment-button"]');
    await page.waitForSelector('[data-testid="appointment-modal"]');

    const appointmentFormSelectors = [
      '[data-testid="appointment-patient-select"]',
      '[data-testid="appointment-type"]',
      '[data-testid="appointment-date"]',
      '[data-testid="appointment-start-time"]',
      '[data-testid="appointment-duration"]',
      '[data-testid="appointment-transportation-type"]',
      '[data-testid="appointment-notes"]',
      '[data-testid="appointment-submit"]',
      '[data-testid="appointment-cancel"]',
    ].filter(selector => {
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, appointmentFormSelectors);
  });

  test('should support Tab key navigation through forms', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');

    // Test Tab navigation through form fields
    const formFields = [
      '[data-testid="patient-name"]',
      '[data-testid="patient-phone"]',
      '[data-testid="patient-flat-villa-no"]',
      '[data-testid="patient-building-street"]',
      '[data-testid="patient-area"]',
      '[data-testid="patient-city"]',
    ];

    for (let i = 0; i < formFields.length; i++) {
      const currentField = formFields[i];
      const nextField = formFields[i + 1];

      // Focus current field
      await page.focus(currentField);

      // Verify current field is focused
      const isCurrentFocused = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element === document.activeElement;
      }, currentField);

      expect(isCurrentFocused, `Field ${currentField} should be focused`).toBe(true);

      // Press Tab to move to next field
      if (nextField) {
        await page.keyboard.press('Tab');

        // Verify next field is focused
        const isNextFocused = await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          return element === document.activeElement;
        }, nextField);

        expect(isNextFocused, `Field ${nextField} should be focused after Tab`).toBe(true);
      }
    }
  });

  test('should support Shift+Tab for reverse navigation', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');

    // Focus a field in the middle of the form
    await page.focus('[data-testid="patient-area"]');

    // Press Shift+Tab to move backwards
    await page.keyboard.press('Shift+Tab');

    // Verify focus moved to previous field
    const isPreviousFocused = await page.evaluate(() => {
      const element = document.querySelector('[data-testid="patient-building-street"]');
      return element === document.activeElement;
    });

    expect(isPreviousFocused, 'Focus should move to previous field with Shift+Tab').toBe(true);
  });

  test('should support Enter key activation for buttons', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');

    // Focus submit button
    await page.focus('[data-testid="patient-submit"]');

    // Press Enter to activate button
    await page.keyboard.press('Enter');

    // Verify form validation is triggered (button should be activated)
    // Note: This test assumes the form will show validation errors when submitted empty
    await page.waitForTimeout(500); // Wait for validation to process

    // Check if validation errors are shown
    const hasValidationErrors = await page.locator('[data-testid*="error"]').count() > 0;
    expect(hasValidationErrors, 'Enter key should activate button and trigger form validation').toBe(true);
  });

  test('should support Escape key to close modals', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');

    // Press Escape to close modal
    await page.keyboard.press('Escape');

    // Verify modal is closed
    await page.waitForSelector('[data-testid="patient-modal"]', { state: 'hidden' });

    const isModalHidden = await page.locator('[data-testid="patient-modal"]').isHidden();
    expect(isModalHidden, 'Escape key should close modal').toBe(true);
  });

  test('should support arrow key navigation in select elements', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');

    // Focus select element
    await page.focus('[data-testid="patient-preferred-transport"]');

    // Press Enter to open dropdown
    await page.keyboard.press('Enter');

    // Use arrow keys to navigate options
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Press Enter to select option
    await page.keyboard.press('Enter');

    // Verify option was selected
    const selectedValue = await page.evaluate((selector) => {
      const select = document.querySelector(selector) as HTMLSelectElement;
      return select.value;
    }, '[data-testid="patient-preferred-transport"]');

    expect(selectedValue, 'Arrow keys should navigate select options').not.toBe('');
  });

  test('should maintain focus management in dynamic content', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    // Open appointment form modal
    await page.click('[data-testid="new-appointment-button"]');
    await page.waitForSelector('[data-testid="appointment-modal"]');

    // Focus appointment type select
    await page.focus('[data-testid="appointment-type"]');

    // Change appointment type to trigger dynamic content
    await page.selectOption('[data-testid="appointment-type"]', 'Lab Test');

    // Wait for dynamic content to load
    await page.waitForTimeout(500);

    // Verify focus is maintained or moved to appropriate element
    const activeElement = await page.evaluate(() => {
      return document.activeElement?.tagName.toLowerCase();
    });

    expect(['select', 'input', 'button'], 'Focus should be maintained on interactive element after dynamic content change').toContain(activeElement);
  });

  test('should support keyboard navigation in calendar', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    const calendarSelectors = [
      '[data-testid="calendar-view-day"]',
      '[data-testid="calendar-view-week"]',
      '[data-testid="calendar-view-month"]',
      '[data-testid="calendar-view-agenda"]',
      '[data-testid="calendar-next-month"]',
      '[data-testid="calendar-prev-month"]',
    ].filter(selector => {
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, calendarSelectors);
  });

  test('should support keyboard navigation in appointment filters', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    // Open appointment filters
    await page.click('[data-testid="appointment-filters-toggle"]');
    await page.waitForSelector('[data-testid="appointment-filters"]');

    const filterSelectors = [
      '[data-testid="staff-filter"]',
      '[data-testid="type-filter"]',
      '[data-testid="status-filter"]',
      '[data-testid="date-range-start"]',
      '[data-testid="date-range-end"]',
    ].filter(selector => {
      return page.locator(selector).count() > 0;
    });

    await testKeyboardNavigation(page, filterSelectors);
  });
});
