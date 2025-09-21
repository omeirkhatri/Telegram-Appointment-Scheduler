import { expect, test } from '@playwright/test';
import {
    assertAccessibilityCompliance,
    generateAccessibilityReport,
    runAccessibilityAudit,
    runKeyboardNavigationTest,
    runScreenReaderTest,
} from './utils/accessibility-helpers';

test.describe('Map Accessibility Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Set up test data with appointments
    await page.goto('/appointments');

    // Create test appointments with coordinates
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="new-appointment-button"]');
      await page.waitForSelector('[data-testid="appointment-modal"]');

      await page.selectOption('[data-testid="appointment-patient-select"]', '1');
      await page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');
      await page.fill('[data-testid="appointment-date"]', '2024-12-20');
      await page.fill('[data-testid="appointment-start-time"]', `${9 + i}:00`);
      await page.selectOption('[data-testid="appointment-duration"]', '60');
      await page.selectOption('[data-testid="appointment-transportation-type"]', 'driver');

      await page.click('[data-testid="appointment-submit"]');
      await page.waitForSelector('[data-testid="toast"]');
    }
  });

  test('should pass accessibility audit for map view', async ({ page }) => {
    // Switch to map view
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Run accessibility audit
    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Map View');

    // Generate and save report
    const report = generateAccessibilityReport(results, 'Map View');
    console.log('Map View Accessibility Report:', report);
  });

  test('should have proper ARIA labels and roles for map components', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Check map container has proper ARIA attributes
    const mapContainer = page.locator('[data-testid="appointment-map-view"]');
    await expect(mapContainer).toHaveAttribute('aria-label');
    await expect(mapContainer).toHaveAttribute('role', 'application');

    // Check zoom controls have proper ARIA attributes
    const zoomIn = page.locator('[data-testid="zoom-in-button"]');
    await expect(zoomIn).toHaveAttribute('aria-label');
    await expect(zoomIn).toHaveAttribute('role', 'button');

    const zoomOut = page.locator('[data-testid="zoom-out-button"]');
    await expect(zoomOut).toHaveAttribute('aria-label');
    await expect(zoomOut).toHaveAttribute('role', 'button');

    // Check date navigation has proper ARIA attributes
    const dateNavigation = page.locator('[data-testid="map-date-navigation"]');
    await expect(dateNavigation).toHaveAttribute('aria-label');

    const nextDay = page.locator('[data-testid="next-day-button"]');
    await expect(nextDay).toHaveAttribute('aria-label');
    await expect(nextDay).toHaveAttribute('role', 'button');

    const previousDay = page.locator('[data-testid="previous-day-button"]');
    await expect(previousDay).toHaveAttribute('aria-label');
    await expect(previousDay).toHaveAttribute('role', 'button');

    const today = page.locator('[data-testid="today-button"]');
    await expect(today).toHaveAttribute('aria-label');
    await expect(today).toHaveAttribute('role', 'button');
  });

  test('should support keyboard navigation for map controls', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Test keyboard navigation
    await runKeyboardNavigationTest(page, [
      {
        selector: '[data-testid="zoom-in-button"]',
        description: 'Zoom in button',
        expectedFocus: true,
      },
      {
        selector: '[data-testid="zoom-out-button"]',
        description: 'Zoom out button',
        expectedFocus: true,
      },
      {
        selector: '[data-testid="next-day-button"]',
        description: 'Next day button',
        expectedFocus: true,
      },
      {
        selector: '[data-testid="previous-day-button"]',
        description: 'Previous day button',
        expectedFocus: true,
      },
      {
        selector: '[data-testid="today-button"]',
        description: 'Today button',
        expectedFocus: true,
      },
    ]);
  });

  test('should support keyboard navigation for map markers', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="map-marker"]', { timeout: 5000 });

    // Test keyboard navigation to markers
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check if focus is on a marker
    const focusedMarker = page.locator('[data-testid="map-marker"]:focus');
    await expect(focusedMarker).toBeVisible();

    // Test marker interaction with keyboard
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="map-info-window"]')).toBeVisible();

    // Test closing info window with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="map-info-window"]')).toBeHidden();
  });

  test('should have proper focus management for map interactions', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Test focus management when switching views
    await page.click('[data-testid="calendar-view-option"]');
    await page.waitForSelector('[data-testid="appointment-calendar"]');

    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]');

    // Focus should be properly managed
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper color contrast for map markers', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="map-marker"]', { timeout: 5000 });

    // Check color contrast for different marker types
    const markers = page.locator('[data-testid="map-marker"]');
    const markerCount = await markers.count();

    for (let i = 0; i < markerCount; i++) {
      const marker = markers.nth(i);

      // Check if marker has proper contrast
      const markerStyles = await marker.evaluate((el) => {
        const computedStyle = window.getComputedStyle(el);
        return {
          backgroundColor: computedStyle.backgroundColor,
          color: computedStyle.color,
          borderColor: computedStyle.borderColor,
        };
      });

      // Verify marker has visible styling
      expect(markerStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(markerStyles.color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('should have proper text alternatives for map elements', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Check that all interactive elements have text alternatives
    const interactiveElements = [
      '[data-testid="zoom-in-button"]',
      '[data-testid="zoom-out-button"]',
      '[data-testid="next-day-button"]',
      '[data-testid="previous-day-button"]',
      '[data-testid="today-button"]',
      '[data-testid="satellite-view-button"]',
      '[data-testid="street-view-button"]',
    ];

    for (const selector of interactiveElements) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await expect(element).toHaveAttribute('aria-label');
        const ariaLabel = await element.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(0);
      }
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Test screen reader compatibility
    const results = await runScreenReaderTest(page, [
      {
        selector: '[data-testid="appointment-map-view"]',
        description: 'Map container',
        expectedAnnouncement: 'Map',
      },
      {
        selector: '[data-testid="zoom-in-button"]',
        description: 'Zoom in button',
        expectedAnnouncement: 'Zoom in',
      },
      {
        selector: '[data-testid="zoom-out-button"]',
        description: 'Zoom out button',
        expectedAnnouncement: 'Zoom out',
      },
    ]);

    expect(results.passed).toBe(true);
  });

  test('should handle map errors with proper accessibility', async ({ page }) => {
    // Mock Google Maps API failure
    await page.route('**/maps.googleapis.com/**', route => {
      route.abort('failed');
    });

    await page.click('[data-testid="map-view-option"]');

    // Check error message accessibility
    await expect(page.locator('[data-testid="map-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="map-error-message"]')).toHaveAttribute('role', 'alert');
    await expect(page.locator('[data-testid="map-error-message"]')).toHaveAttribute('aria-live', 'polite');

    // Check retry button accessibility
    const retryButton = page.locator('[data-testid="map-retry-button"]');
    await expect(retryButton).toHaveAttribute('aria-label');
    await expect(retryButton).toHaveAttribute('role', 'button');

    // Test keyboard navigation to retry button
    await page.keyboard.press('Tab');
    await expect(retryButton).toBeFocused();
  });

  test('should have proper heading structure for map view', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Check heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    expect(headingCount).toBeGreaterThan(0);

    // Check that headings are properly nested
    for (let i = 0; i < headingCount; i++) {
      const heading = headings.nth(i);
      const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
      const level = parseInt(tagName.replace('h', ''));

      if (i > 0) {
        const prevHeading = headings.nth(i - 1);
        const prevTagName = await prevHeading.evaluate((el) => el.tagName.toLowerCase());
        const prevLevel = parseInt(prevTagName.replace('h', ''));

        // Heading levels should not skip (e.g., h1 to h3)
        expect(level - prevLevel).toBeLessThanOrEqual(1);
      }
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });

    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Check that map elements are still visible in high contrast mode
    const mapContainer = page.locator('[data-testid="appointment-map-view"]');
    await expect(mapContainer).toBeVisible();

    const zoomControls = page.locator('[data-testid="map-zoom-controls"]');
    await expect(zoomControls).toBeVisible();

    const dateNavigation = page.locator('[data-testid="map-date-navigation"]');
    await expect(dateNavigation).toBeVisible();
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Check that animations are disabled
    const animatedElements = page.locator('[data-testid="map-marker"]');
    const elementCount = await animatedElements.count();

    for (let i = 0; i < elementCount; i++) {
      const element = animatedElements.nth(i);
      const styles = await element.evaluate((el) => {
        const computedStyle = window.getComputedStyle(el);
        return {
          animation: computedStyle.animation,
          transition: computedStyle.transition,
        };
      });

      // Animations should be disabled in reduced motion mode
      expect(styles.animation).toBe('none');
      expect(styles.transition).toBe('none');
    }
  });

  test('should have proper focus indicators for map elements', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Test focus indicators for all interactive elements
    const interactiveElements = [
      '[data-testid="zoom-in-button"]',
      '[data-testid="zoom-out-button"]',
      '[data-testid="next-day-button"]',
      '[data-testid="previous-day-button"]',
      '[data-testid="today-button"]',
    ];

    for (const selector of interactiveElements) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        // Focus the element
        await element.focus();

        // Check that focus indicator is visible
        const focusStyles = await element.evaluate((el) => {
          const computedStyle = window.getComputedStyle(el);
          return {
            outline: computedStyle.outline,
            outlineWidth: computedStyle.outlineWidth,
            outlineStyle: computedStyle.outlineStyle,
            outlineColor: computedStyle.outlineColor,
          };
        });

        // Focus indicator should be visible
        expect(focusStyles.outlineWidth).not.toBe('0px');
        expect(focusStyles.outlineStyle).not.toBe('none');
      }
    }
  });

  test('should support voice control and speech recognition', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Check that elements have proper attributes for voice control
    const voiceControlElements = [
      '[data-testid="zoom-in-button"]',
      '[data-testid="zoom-out-button"]',
      '[data-testid="next-day-button"]',
      '[data-testid="previous-day-button"]',
      '[data-testid="today-button"]',
    ];

    for (const selector of voiceControlElements) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        // Check for voice control attributes
        const ariaLabel = await element.getAttribute('aria-label');
        const role = await element.getAttribute('role');

        expect(ariaLabel).toBeTruthy();
        expect(role).toBe('button');

        // Check that the element is focusable
        await element.focus();
        await expect(element).toBeFocused();
      }
    }
  });

  test('should have proper semantic markup for map content', async ({ page }) => {
    await page.click('[data-testid="map-view-option"]');
    await page.waitForSelector('[data-testid="appointment-map-view"]', { timeout: 10000 });

    // Check semantic markup
    const mapContainer = page.locator('[data-testid="appointment-map-view"]');
    await expect(mapContainer).toHaveAttribute('role', 'application');

    // Check that map has proper landmarks
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Check that navigation elements are properly marked up
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Check that buttons are properly marked up
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const type = await button.getAttribute('type');
      expect(type).toBe('button');
    }
  });
});
