import { expect, test } from '@playwright/test';
import {
    assertAccessibilityCompliance,
    runAccessibilityAudit,
    testScreenReaderCompatibility
} from './utils/accessibility-helpers';

test.describe('Screen Reader Compatibility Tests', () => {

  test('should be compatible with screen readers on dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await testScreenReaderCompatibility(page);

    // Also run accessibility audit to check for screen reader specific issues
    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Dashboard Screen Reader Compatibility');
  });

  test('should be compatible with screen readers on patients page', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    await testScreenReaderCompatibility(page);

    // Check for proper form labels
    const formLabels = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      return Array.from(inputs).map(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const placeholder = input.getAttribute('placeholder');

        return {
          tag: input.tagName.toLowerCase(),
          type: input.getAttribute('type'),
          id: input.id,
          hasLabel: !!label,
          hasAriaLabel: !!ariaLabel,
          hasAriaLabelledBy: !!ariaLabelledBy,
          hasPlaceholder: !!placeholder,
          isProperlyLabeled: !!(label || ariaLabel || ariaLabelledBy)
        };
      });
    });

    const unlabeledElements = formLabels.filter(el => !el.isProperlyLabeled);
    expect(unlabeledElements.length, 'All form elements should be properly labeled for screen readers').toBe(0);
  });

  test('should be compatible with screen readers on staff page', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');

    await testScreenReaderCompatibility(page);

    // Check for proper table headers and structure
    const tableStructure = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      return Array.from(tables).map(table => {
        const headers = table.querySelectorAll('th');
        const rows = table.querySelectorAll('tr');
        const hasHeaders = headers.length > 0;
        const hasProperStructure = rows.length > 0;

        return {
          hasHeaders,
          hasProperStructure,
          headerCount: headers.length,
          rowCount: rows.length
        };
      });
    });

    if (tableStructure.length > 0) {
      tableStructure.forEach((table, index) => {
        expect(table.hasHeaders, `Table ${index + 1} should have proper headers for screen readers`).toBe(true);
        expect(table.hasProperStructure, `Table ${index + 1} should have proper structure`).toBe(true);
      });
    }
  });

  test('should be compatible with screen readers on appointments page', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');

    await testScreenReaderCompatibility(page);

    // Check for proper calendar accessibility
    const calendarAccessibility = await page.evaluate(() => {
      const calendar = document.querySelector('[data-testid="appointment-calendar"]');
      if (!calendar) return null;

      const hasAriaLabel = calendar.hasAttribute('aria-label');
      const hasRole = calendar.hasAttribute('role');
      const hasAriaLive = calendar.hasAttribute('aria-live');

      return {
        hasAriaLabel,
        hasRole,
        hasAriaLive,
        isAccessible: hasAriaLabel || hasRole
      };
    });

    if (calendarAccessibility) {
      expect(calendarAccessibility.isAccessible, 'Calendar should have proper ARIA attributes for screen readers').toBe(true);
    }
  });

  test('should be compatible with screen readers on settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await testScreenReaderCompatibility(page);

    // Check for proper section structure
    const sectionStructure = await page.evaluate(() => {
      const sections = document.querySelectorAll('section, [role="region"]');
      return Array.from(sections).map(section => {
        const hasHeading = !!section.querySelector('h1, h2, h3, h4, h5, h6');
        const hasAriaLabel = section.hasAttribute('aria-label');
        const hasAriaLabelledBy = section.hasAttribute('aria-labelledby');

        return {
          tag: section.tagName.toLowerCase(),
          hasHeading,
          hasAriaLabel,
          hasAriaLabelledBy,
          isProperlyLabeled: hasHeading || hasAriaLabel || hasAriaLabelledBy
        };
      });
    });

    sectionStructure.forEach((section, index) => {
      expect(section.isProperlyLabeled, `Section ${index + 1} should be properly labeled for screen readers`).toBe(true);
    });
  });

  test('should provide proper ARIA landmarks', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const landmarks = await page.evaluate(() => {
      const landmarkElements = document.querySelectorAll(
        '[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], ' +
        'header, nav, main, aside, footer'
      );

      return Array.from(landmarkElements).map(el => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 50) || '',
        hasAriaLabel: el.hasAttribute('aria-label'),
        hasAriaLabelledBy: el.hasAttribute('aria-labelledby')
      }));
    });

    console.log('ARIA Landmarks found:', landmarks);

    // Check for essential landmarks
    const landmarkRoles = landmarks.map(l => l.role);
    expect(landmarkRoles, 'Page should have main content landmark').toContain('main');
    expect(landmarkRoles, 'Page should have navigation landmark').toContain('navigation');
  });

  test('should provide proper heading hierarchy', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    const headingHierarchy = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(headings).map(heading => ({
        tag: heading.tagName.toLowerCase(),
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent?.trim() || '',
        id: heading.id || '',
        hasId: !!heading.id
      }));
    });

    console.log('Heading hierarchy:', headingHierarchy);

    // Check for proper heading hierarchy
    let previousLevel = 0;
    for (const heading of headingHierarchy) {
      if (heading.level > previousLevel + 1) {
        throw new Error(`Heading hierarchy issue: ${heading.tag} "${heading.text}" jumps from level ${previousLevel} to ${heading.level}`);
      }
      previousLevel = heading.level;
    }

    // Check for at least one h1
    const h1Count = headingHierarchy.filter(h => h.level === 1).length;
    expect(h1Count, 'Page should have exactly one h1 heading').toBe(1);
  });

  test('should provide proper form accessibility', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');

    const formAccessibility = await page.evaluate(() => {
      const form = document.querySelector('[data-testid="patient-form"]');
      if (!form) return null;

      const inputs = form.querySelectorAll('input, select, textarea');
      const labels = form.querySelectorAll('label');

      const inputAccessibility = Array.from(inputs).map(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const ariaDescribedBy = input.getAttribute('aria-describedby');
        const required = input.hasAttribute('required');
        const ariaRequired = input.getAttribute('aria-required');

        return {
          tag: input.tagName.toLowerCase(),
          type: input.getAttribute('type'),
          id: input.id,
          hasLabel: !!label,
          hasAriaLabel: !!ariaLabel,
          hasAriaLabelledBy: !!ariaLabelledBy,
          hasAriaDescribedBy: !!ariaDescribedBy,
          isRequired: required,
          hasAriaRequired: ariaRequired === 'true',
          isProperlyLabeled: !!(label || ariaLabel || ariaLabelledBy),
          isProperlyRequired: !required || ariaRequired === 'true'
        };
      });

      return {
        formHasAriaLabel: form.hasAttribute('aria-label'),
        formHasAriaLabelledBy: form.hasAttribute('aria-labelledby'),
        inputCount: inputs.length,
        labelCount: labels.length,
        inputAccessibility
      };
    });

    if (formAccessibility) {
      expect(formAccessibility.inputCount, 'Form should have inputs').toBeGreaterThan(0);

      const unlabeledInputs = formAccessibility.inputAccessibility.filter(input => !input.isProperlyLabeled);
      expect(unlabeledInputs.length, 'All form inputs should be properly labeled').toBe(0);

      const improperlyRequiredInputs = formAccessibility.inputAccessibility.filter(input => !input.isProperlyRequired);
      expect(improperlyRequiredInputs.length, 'All required inputs should have proper ARIA required attributes').toBe(0);
    }
  });

  test('should provide proper error message accessibility', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');

    // Try to submit empty form to trigger validation errors
    await page.click('[data-testid="patient-submit"]');

    // Wait for validation errors to appear
    await page.waitForTimeout(1000);

    const errorAccessibility = await page.evaluate(() => {
      const errorMessages = document.querySelectorAll('[data-testid*="error"], .error, [role="alert"]');

      return Array.from(errorMessages).map(error => {
        const hasRoleAlert = error.getAttribute('role') === 'alert';
        const hasAriaLive = error.hasAttribute('aria-live');
        const hasAriaAtomic = error.hasAttribute('aria-atomic');
        const isVisible = error.offsetParent !== null;

        return {
          tag: error.tagName.toLowerCase(),
          text: error.textContent?.trim() || '',
          hasRoleAlert,
          hasAriaLive,
          hasAriaAtomic,
          isVisible,
          isAccessible: hasRoleAlert || hasAriaLive
        };
      });
    });

    if (errorAccessibility.length > 0) {
      errorAccessibility.forEach((error, index) => {
        expect(error.isAccessible, `Error message ${index + 1} should be accessible to screen readers`).toBe(true);
        expect(error.isVisible, `Error message ${index + 1} should be visible`).toBe(true);
      });
    }
  });

  test('should provide proper button accessibility', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const buttonAccessibility = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');

      return Array.from(buttons).map(button => {
        const hasAriaLabel = button.hasAttribute('aria-label');
        const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');
        const hasText = button.textContent?.trim().length > 0;
        const hasTitle = button.hasAttribute('title');
        const isDisabled = button.hasAttribute('disabled');
        const ariaDisabled = button.getAttribute('aria-disabled');

        return {
          tag: button.tagName.toLowerCase(),
          text: button.textContent?.trim() || '',
          hasAriaLabel,
          hasAriaLabelledBy,
          hasText,
          hasTitle,
          isDisabled,
          hasAriaDisabled: ariaDisabled === 'true',
          isProperlyLabeled: hasText || hasAriaLabel || hasAriaLabelledBy || hasTitle,
          isProperlyDisabled: !isDisabled || ariaDisabled === 'true'
        };
      });
    });

    buttonAccessibility.forEach((button, index) => {
      expect(button.isProperlyLabeled, `Button ${index + 1} should be properly labeled`).toBe(true);
      expect(button.isProperlyDisabled, `Button ${index + 1} should have proper disabled state`).toBe(true);
    });
  });

  test('should provide proper link accessibility', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const linkAccessibility = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href], [role="link"]');

      return Array.from(links).map(link => {
        const hasText = link.textContent?.trim().length > 0;
        const hasAriaLabel = link.hasAttribute('aria-label');
        const hasAriaLabelledBy = link.hasAttribute('aria-labelledby');
        const hasTitle = link.hasAttribute('title');
        const href = link.getAttribute('href');
        const isExternal = href?.startsWith('http') && !href.includes(window.location.hostname);
        const hasExternalIndicator = link.textContent?.includes('external') || link.hasAttribute('aria-label');

        return {
          tag: link.tagName.toLowerCase(),
          text: link.textContent?.trim() || '',
          href: href || '',
          hasText,
          hasAriaLabel,
          hasAriaLabelledBy,
          hasTitle,
          isExternal,
          hasExternalIndicator,
          isProperlyLabeled: hasText || hasAriaLabel || hasAriaLabelledBy || hasTitle,
          isProperlyExternal: !isExternal || hasExternalIndicator
        };
      });
    });

    linkAccessibility.forEach((link, index) => {
      expect(link.isProperlyLabeled, `Link ${index + 1} should be properly labeled`).toBe(true);
      expect(link.isProperlyExternal, `External link ${index + 1} should indicate it opens in new window`).toBe(true);
    });
  });

  test('should provide proper table accessibility', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    const tableAccessibility = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');

      return Array.from(tables).map(table => {
        const hasCaption = !!table.querySelector('caption');
        const hasAriaLabel = table.hasAttribute('aria-label');
        const hasAriaLabelledBy = table.hasAttribute('aria-labelledby');
        const headers = table.querySelectorAll('th');
        const hasHeaders = headers.length > 0;
        const hasScope = Array.from(headers).some(th => th.hasAttribute('scope'));
        const hasAriaSort = Array.from(headers).some(th => th.hasAttribute('aria-sort'));

        return {
          hasCaption,
          hasAriaLabel,
          hasAriaLabelledBy,
          hasHeaders,
          hasScope,
          hasAriaSort,
          headerCount: headers.length,
          isProperlyLabeled: hasCaption || hasAriaLabel || hasAriaLabelledBy,
          hasProperHeaders: hasHeaders && (hasScope || hasAriaSort)
        };
      });
    });

    if (tableAccessibility.length > 0) {
      tableAccessibility.forEach((table, index) => {
        expect(table.isProperlyLabeled, `Table ${index + 1} should be properly labeled`).toBe(true);
        expect(table.hasProperHeaders, `Table ${index + 1} should have proper headers`).toBe(true);
      });
    }
  });
});
