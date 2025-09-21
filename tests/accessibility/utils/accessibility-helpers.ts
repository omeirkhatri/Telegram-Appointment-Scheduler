import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';

/**
 * Accessibility testing utilities and helpers
 */

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string;
  }>;
}

export interface AccessibilityResults {
  violations: AccessibilityViolation[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
  timestamp: string;
  url: string;
  toolOptions: any;
}

/**
 * Run axe-core accessibility audit on a page
 */
export async function runAccessibilityAudit(page: Page): Promise<AccessibilityResults> {
  const axeBuilder = new AxeBuilder({ page });

  // Configure axe-core with healthcare-specific rules
  const results = await axeBuilder
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
    .exclude('#axe-skip') // Allow skipping specific elements
    .analyze();

  return results;
}

/**
 * Assert accessibility compliance with detailed reporting
 */
export function assertAccessibilityCompliance(
  results: AccessibilityResults,
  pageName: string,
  allowMinorViolations: boolean = false,
): void {
  const { violations } = results;

  // Filter violations based on severity
  const criticalViolations = violations.filter(v => v.impact === 'critical');
  const seriousViolations = violations.filter(v => v.impact === 'serious');
  const moderateViolations = violations.filter(v => v.impact === 'moderate');
  const minorViolations = violations.filter(v => v.impact === 'minor');

  console.log(`\n🔍 Accessibility Audit Results for ${pageName}:`);
  console.log(`Total violations: ${violations.length}`);
  console.log(`Critical: ${criticalViolations.length}`);
  console.log(`Serious: ${seriousViolations.length}`);
  console.log(`Moderate: ${moderateViolations.length}`);
  console.log(`Minor: ${minorViolations.length}`);

  // Log detailed violation information
  if (violations.length > 0) {
    console.log('\n📋 Violation Details:');
    violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. ${violation.id} (${violation.impact})`);
      console.log(`   Description: ${violation.description}`);
      console.log(`   Help: ${violation.help}`);
      console.log(`   Help URL: ${violation.helpUrl}`);

      if (violation.nodes.length > 0) {
        console.log(`   Affected elements: ${violation.nodes.length}`);
        violation.nodes.slice(0, 3).forEach((node, nodeIndex) => {
          console.log(`     ${nodeIndex + 1}. ${node.target.join(' ')}`);
          console.log(`        HTML: ${node.html.substring(0, 100)}...`);
        });
        if (violation.nodes.length > 3) {
          console.log(`     ... and ${violation.nodes.length - 3} more elements`);
        }
      }
    });
  }

  // Assert based on severity
  expect(criticalViolations.length, `Critical accessibility violations found on ${pageName}`).toBe(0);
  expect(seriousViolations.length, `Serious accessibility violations found on ${pageName}`).toBe(0);
  expect(moderateViolations.length, `Moderate accessibility violations found on ${pageName}`).toBe(0);

  if (!allowMinorViolations) {
    expect(minorViolations.length, `Minor accessibility violations found on ${pageName}`).toBe(0);
  }
}

/**
 * Test keyboard navigation on a page
 */
export async function testKeyboardNavigation(page: Page, selectors: string[]): Promise<void> {
  console.log('🎹 Testing keyboard navigation...');

  for (const selector of selectors) {
    try {
      // Focus the element
      await page.focus(selector);

      // Verify element is focused
      const isFocused = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return element === document.activeElement;
      }, selector);

      expect(isFocused, `Element ${selector} should be focusable`).toBe(true);

      // Test Tab navigation
      await page.keyboard.press('Tab');

      console.log(`✅ Keyboard navigation test passed for ${selector}`);
    } catch (error) {
      console.error(`❌ Keyboard navigation test failed for ${selector}:`, error);
      throw error;
    }
  }
}

/**
 * Test keyboard navigation with specific expectations
 */
export async function runKeyboardNavigationTest(
  page: Page,
  testCases: Array<{
    selector: string;
    description: string;
    expectedFocus: boolean;
  }>,
): Promise<void> {
  console.log('🎹 Testing keyboard navigation with expectations...');

  for (const testCase of testCases) {
    try {
      // Focus the element
      await page.focus(testCase.selector);

      // Verify element is focused
      const isFocused = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        return element === document.activeElement;
      }, testCase.selector);

      expect(isFocused, `${testCase.description} should be focusable`).toBe(testCase.expectedFocus);

      console.log(`✅ Keyboard navigation test passed for ${testCase.description}`);
    } catch (error) {
      console.error(`❌ Keyboard navigation test failed for ${testCase.description}:`, error);
      throw error;
    }
  }
}

/**
 * Test screen reader compatibility
 */
export async function testScreenReaderCompatibility(page: Page): Promise<void> {
  console.log('🔊 Testing screen reader compatibility...');

  // Check for proper heading structure
  const headings = await page.evaluate(() => {
    const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(headingElements).map(heading => ({
      tag: heading.tagName.toLowerCase(),
      text: heading.textContent?.trim(),
      level: parseInt(heading.tagName.charAt(1)),
    }));
  });

  console.log(`Found ${headings.length} headings`);

  // Verify heading hierarchy
  let previousLevel = 0;
  for (const heading of headings) {
    if (heading.level > previousLevel + 1) {
      throw new Error(`Heading hierarchy issue: ${heading.tag} "${heading.text}" jumps from level ${previousLevel} to ${heading.level}`);
    }
    previousLevel = heading.level;
  }

  // Check for proper form labels
  const formElements = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, select, textarea');
    return Array.from(inputs).map(input => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');

      return {
        tag: input.tagName.toLowerCase(),
        type: input.getAttribute('type'),
        id: input.id,
        hasLabel: !!label,
        hasAriaLabel: !!ariaLabel,
        hasAriaLabelledBy: !!ariaLabelledBy,
        isLabeled: !!(label || ariaLabel || ariaLabelledBy),
      };
    });
  });

  const unlabeledElements = formElements.filter(el => !el.isLabeled);
  if (unlabeledElements.length > 0) {
    console.warn(`⚠️ Found ${unlabeledElements.length} unlabeled form elements:`, unlabeledElements);
  }

  // Check for proper ARIA landmarks
  const landmarks = await page.evaluate(() => {
    const landmarkElements = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');
    return Array.from(landmarkElements).map(el => ({
      role: el.getAttribute('role'),
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim().substring(0, 50),
    }));
  });

  console.log(`Found ${landmarks.length} ARIA landmarks:`, landmarks);

  console.log('✅ Screen reader compatibility tests completed');
}

/**
 * Test screen reader compatibility with specific expectations
 */
export async function runScreenReaderTest(
  page: Page,
  testCases: Array<{
    selector: string;
    description: string;
    expectedAnnouncement: string;
  }>,
): Promise<{ passed: boolean; results: any[] }> {
  console.log('🔊 Testing screen reader compatibility with expectations...');

  const results = [];

  for (const testCase of testCases) {
    try {
      const element = page.locator(testCase.selector);

      if (await element.isVisible()) {
        // Check for proper ARIA attributes
        const ariaLabel = await element.getAttribute('aria-label');
        const ariaLabelledBy = await element.getAttribute('aria-labelledby');
        const role = await element.getAttribute('role');
        const textContent = await element.textContent();

        const hasAccessibleName = !!(ariaLabel || ariaLabelledBy || textContent);

        results.push({
          selector: testCase.selector,
          description: testCase.description,
          hasAccessibleName,
          ariaLabel,
          ariaLabelledBy,
          role,
          textContent,
          passed: hasAccessibleName,
        });

        expect(hasAccessibleName, `${testCase.description} should have accessible name`).toBe(true);

        console.log(`✅ Screen reader test passed for ${testCase.description}`);
      } else {
        results.push({
          selector: testCase.selector,
          description: testCase.description,
          passed: false,
          error: 'Element not visible',
        });
      }
    } catch (error) {
      console.error(`❌ Screen reader test failed for ${testCase.description}:`, error);
      results.push({
        selector: testCase.selector,
        description: testCase.description,
        passed: false,
        error: error.message,
      });
    }
  }

  const passed = results.every(result => result.passed);
  return { passed, results };
}

/**
 * Test color contrast and visual accessibility
 */
export async function testVisualAccessibility(page: Page): Promise<void> {
  console.log('👁️ Testing visual accessibility...');

  // Check for proper focus indicators
  const focusableElements = await page.evaluate(() => {
    const focusable = document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    return Array.from(focusable).map(el => {
      const styles = window.getComputedStyle(el);
      const outline = styles.outline;
      const outlineWidth = styles.outlineWidth;
      const boxShadow = styles.boxShadow;

      return {
        tag: el.tagName.toLowerCase(),
        hasOutline: outline !== 'none' && outlineWidth !== '0px',
        hasBoxShadow: boxShadow !== 'none',
        hasFocusIndicator: outline !== 'none' || boxShadow !== 'none',
      };
    });
  });

  const elementsWithoutFocus = focusableElements.filter(el => !el.hasFocusIndicator);
  if (elementsWithoutFocus.length > 0) {
    console.warn(`⚠️ Found ${elementsWithoutFocus.length} focusable elements without focus indicators`);
  }

  // Check for proper alt text on images
  const images = await page.evaluate(() => {
    const imgElements = document.querySelectorAll('img');
    return Array.from(imgElements).map(img => ({
      src: img.src,
      alt: img.alt,
      hasAlt: !!img.alt,
      isDecorative: img.alt === '' && img.getAttribute('role') === 'presentation',
    }));
  });

  const imagesWithoutAlt = images.filter(img => !img.hasAlt && !img.isDecorative);
  if (imagesWithoutAlt.length > 0) {
    console.warn(`⚠️ Found ${imagesWithoutAlt.length} images without alt text:`, imagesWithoutAlt);
  }

  console.log('✅ Visual accessibility tests completed');
}

/**
 * Test mobile accessibility
 */
export async function testMobileAccessibility(page: Page): Promise<void> {
  console.log('📱 Testing mobile accessibility...');

  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  // Check for proper touch targets (minimum 44x44px)
  const touchTargets = await page.evaluate(() => {
    const interactive = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"]');
    return Array.from(interactive).map(el => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        width: rect.width,
        height: rect.height,
        isLargeEnough: rect.width >= 44 && rect.height >= 44,
      };
    });
  });

  const smallTargets = touchTargets.filter(target => !target.isLargeEnough);
  if (smallTargets.length > 0) {
    console.warn(`⚠️ Found ${smallTargets.length} touch targets smaller than 44x44px:`, smallTargets);
  }

  // Check for proper zoom support
  const viewport = await page.evaluate(() => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    return {
      hasViewportMeta: !!viewportMeta,
      content: viewportMeta?.getAttribute('content') || '',
    };
  });

  if (!viewport.hasViewportMeta) {
    console.warn('⚠️ No viewport meta tag found');
  } else if (!viewport.content.includes('user-scalable=yes') && !viewport.content.includes('user-scalable=1')) {
    console.warn('⚠️ Viewport meta tag may prevent zooming');
  }

  console.log('✅ Mobile accessibility tests completed');
}

/**
 * Generate accessibility report
 */
export function generateAccessibilityReport(
  results: AccessibilityResults,
  pageName: string,
): string {
  const report = {
    pageName,
    timestamp: new Date().toISOString(),
    summary: {
      totalViolations: results.violations.length,
      criticalViolations: results.violations.filter(v => v.impact === 'critical').length,
      seriousViolations: results.violations.filter(v => v.impact === 'serious').length,
      moderateViolations: results.violations.filter(v => v.impact === 'moderate').length,
      minorViolations: results.violations.filter(v => v.impact === 'minor').length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
    },
    violations: results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      affectedElements: violation.nodes.length,
    })),
    recommendations: generateAccessibilityRecommendations(results.violations),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Generate accessibility recommendations based on violations
 */
function generateAccessibilityRecommendations(violations: AccessibilityViolation[]): string[] {
  const recommendations: string[] = [];

  const violationTypes = new Set(violations.map(v => v.id));

  if (violationTypes.has('color-contrast')) {
    recommendations.push('Improve color contrast ratios to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)');
  }

  if (violationTypes.has('keyboard-navigation')) {
    recommendations.push('Ensure all interactive elements are keyboard accessible');
  }

  if (violationTypes.has('aria-labels')) {
    recommendations.push('Add proper ARIA labels to form elements and interactive components');
  }

  if (violationTypes.has('heading-order')) {
    recommendations.push('Fix heading hierarchy to follow logical order (h1 → h2 → h3, etc.)');
  }

  if (violationTypes.has('alt-text')) {
    recommendations.push('Add descriptive alt text to all images');
  }

  if (violationTypes.has('focus-management')) {
    recommendations.push('Implement proper focus management for dynamic content');
  }

  if (violationTypes.has('touch-targets')) {
    recommendations.push('Ensure touch targets are at least 44x44 pixels for mobile accessibility');
  }

  return recommendations;
}

/**
 * Common selectors for keyboard navigation testing
 */
export const COMMON_KEYBOARD_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
];

/**
 * Healthcare-specific accessibility selectors
 */
export const HEALTHCARE_ACCESSIBILITY_SELECTORS = [
  // Patient management
  '[data-testid="patient-form"] input',
  '[data-testid="patient-form"] select',
  '[data-testid="patient-form"] textarea',
  '[data-testid="patient-form"] button',

  // Staff management
  '[data-testid="staff-form"] input',
  '[data-testid="staff-form"] select',
  '[data-testid="staff-form"] button',

  // Appointment management
  '[data-testid="appointment-form"] input',
  '[data-testid="appointment-form"] select',
  '[data-testid="appointment-form"] textarea',
  '[data-testid="appointment-form"] button',

  // Calendar navigation
  '[data-testid="calendar-view-day"]',
  '[data-testid="calendar-view-week"]',
  '[data-testid="calendar-view-month"]',
  '[data-testid="calendar-view-agenda"]',
  '[data-testid="calendar-next-month"]',
  '[data-testid="calendar-prev-month"]',

  // Modal controls
  '[data-testid="modal-close"]',
  '[data-testid="modal-submit"]',
  '[data-testid="modal-cancel"]',
];

/**
 * Map-specific accessibility selectors
 */
export const MAP_ACCESSIBILITY_SELECTORS = [
  // Map container and controls
  '[data-testid="appointment-map-view"]',
  '[data-testid="map-zoom-controls"]',
  '[data-testid="zoom-in-button"]',
  '[data-testid="zoom-out-button"]',
  '[data-testid="map-date-navigation"]',
  '[data-testid="next-day-button"]',
  '[data-testid="previous-day-button"]',
  '[data-testid="today-button"]',
  '[data-testid="satellite-view-button"]',
  '[data-testid="street-view-button"]',

  // Map markers and info windows
  '[data-testid="map-marker"]',
  '[data-testid="map-cluster"]',
  '[data-testid="map-info-window"]',
  '[data-testid="appointment-details"]',

  // Map error states
  '[data-testid="map-error"]',
  '[data-testid="map-error-message"]',
  '[data-testid="map-retry-button"]',
  '[data-testid="map-empty-state"]',
  '[data-testid="map-empty-message"]',

  // Map filters and search
  '[data-testid="appointment-type-filter"]',
  '[data-testid="appointment-search"]',
  '[data-testid="filter-doctor-on-call"]',
  '[data-testid="filter-driver-on-call"]',
  '[data-testid="filter-nurse-on-call"]',

  // Mobile map controls
  '[data-testid="mobile-map-controls"]',
];

/**
 * Map-specific keyboard navigation test cases
 */
export const MAP_KEYBOARD_NAVIGATION_TEST_CASES = [
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
  {
    selector: '[data-testid="map-marker"]',
    description: 'Map marker',
    expectedFocus: true,
  },
];

/**
 * Map-specific screen reader test cases
 */
export const MAP_SCREEN_READER_TEST_CASES = [
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
  {
    selector: '[data-testid="next-day-button"]',
    description: 'Next day button',
    expectedAnnouncement: 'Next day',
  },
  {
    selector: '[data-testid="previous-day-button"]',
    description: 'Previous day button',
    expectedAnnouncement: 'Previous day',
  },
  {
    selector: '[data-testid="today-button"]',
    description: 'Today button',
    expectedAnnouncement: 'Today',
  },
  {
    selector: '[data-testid="map-marker"]',
    description: 'Map marker',
    expectedAnnouncement: 'Appointment marker',
  },
];
