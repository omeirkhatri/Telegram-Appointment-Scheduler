import { expect, test } from '@playwright/test';
import {
  testVisualAccessibility,
  testMobileAccessibility,
  runAccessibilityAudit,
  assertAccessibilityCompliance
} from './utils/accessibility-helpers';

test.describe('Visual Accessibility Tests', () => {
  
  test('should meet visual accessibility standards on dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await testVisualAccessibility(page);
    
    // Run accessibility audit to check for visual issues
    const results = await runAccessibilityAudit(page);
    assertAccessibilityCompliance(results, 'Dashboard Visual Accessibility');
  });

  test('should meet visual accessibility standards on patients page', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    await testVisualAccessibility(page);
    
    // Check for proper color contrast
    const colorContrast = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const contrastIssues = [];
      
      // This is a simplified check - in a real implementation, you'd use a proper color contrast library
      Array.from(elements).forEach(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Check for common contrast issues
        if (color === 'rgb(128, 128, 128)' && backgroundColor === 'rgb(255, 255, 255)') {
          contrastIssues.push({
            element: el.tagName.toLowerCase(),
            color,
            backgroundColor,
            text: el.textContent?.trim().substring(0, 50) || ''
          });
        }
      });
      
      return contrastIssues;
    });
    
    console.log('Color contrast issues found:', colorContrast);
    // Note: This is a basic check - proper color contrast testing would require a dedicated library
  });

  test('should meet visual accessibility standards on staff page', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');
    
    await testVisualAccessibility(page);
    
    // Check for proper focus indicators
    const focusIndicators = await page.evaluate(() => {
      const focusableElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      
      return Array.from(focusableElements).map(el => {
        const styles = window.getComputedStyle(el);
        const outline = styles.outline;
        const outlineWidth = styles.outlineWidth;
        const boxShadow = styles.boxShadow;
        const border = styles.border;
        
        return {
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 30) || '',
          hasOutline: outline !== 'none' && outlineWidth !== '0px',
          hasBoxShadow: boxShadow !== 'none',
          hasBorder: border !== 'none',
          hasFocusIndicator: outline !== 'none' || boxShadow !== 'none' || border !== 'none'
        };
      });
    });
    
    const elementsWithoutFocus = focusIndicators.filter(el => !el.hasFocusIndicator);
    if (elementsWithoutFocus.length > 0) {
      console.warn('Elements without focus indicators:', elementsWithoutFocus);
    }
    
    // Most elements should have focus indicators
    expect(elementsWithoutFocus.length, 'Most focusable elements should have focus indicators').toBeLessThan(focusIndicators.length * 0.1);
  });

  test('should meet visual accessibility standards on appointments page', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');
    
    await testVisualAccessibility(page);
    
    // Check for proper image alt text
    const imageAccessibility = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      
      return Array.from(images).map(img => {
        const alt = img.alt;
        const src = img.src;
        const hasAlt = alt !== null && alt !== undefined;
        const isDecorative = alt === '' && img.getAttribute('role') === 'presentation';
        const hasLongDesc = img.hasAttribute('longdesc');
        const hasAriaDescribedBy = img.hasAttribute('aria-describedby');
        
        return {
          src: src.substring(src.lastIndexOf('/') + 1),
          alt,
          hasAlt,
          isDecorative,
          hasLongDesc,
          hasAriaDescribedBy,
          isAccessible: hasAlt || isDecorative || hasLongDesc || hasAriaDescribedBy
        };
      });
    });
    
    const inaccessibleImages = imageAccessibility.filter(img => !img.isAccessible);
    expect(inaccessibleImages.length, 'All images should have proper alt text or be marked as decorative').toBe(0);
  });

  test('should meet visual accessibility standards on settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await testVisualAccessibility(page);
    
    // Check for proper text sizing and readability
    const textAccessibility = await page.evaluate(() => {
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
      
      return Array.from(textElements).map(el => {
        const styles = window.getComputedStyle(el);
        const fontSize = styles.fontSize;
        const fontWeight = styles.fontWeight;
        const lineHeight = styles.lineHeight;
        const text = el.textContent?.trim() || '';
        
        return {
          tag: el.tagName.toLowerCase(),
          text: text.substring(0, 30),
          fontSize: parseFloat(fontSize),
          fontWeight,
          lineHeight: parseFloat(lineHeight),
          hasReadableText: text.length > 0,
          hasReadableSize: parseFloat(fontSize) >= 12 // Minimum 12px font size
        };
      }).filter(el => el.hasReadableText);
    });
    
    const smallTextElements = textAccessibility.filter(el => !el.hasReadableSize);
    if (smallTextElements.length > 0) {
      console.warn('Elements with small text:', smallTextElements);
    }
    
    // Most text should be readable
    expect(smallTextElements.length, 'Most text elements should have readable font sizes').toBeLessThan(textAccessibility.length * 0.1);
  });

  test('should support mobile accessibility standards', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    await testMobileAccessibility(page);
    
    // Check for proper touch targets
    const touchTargets = await page.evaluate(() => {
      const interactive = document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="link"]');
      
      return Array.from(interactive).map(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        const padding = {
          top: parseFloat(styles.paddingTop),
          right: parseFloat(styles.paddingRight),
          bottom: parseFloat(styles.paddingBottom),
          left: parseFloat(styles.paddingLeft)
        };
        
        const effectiveWidth = rect.width + padding.left + padding.right;
        const effectiveHeight = rect.height + padding.top + padding.bottom;
        
        return {
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 20) || '',
          width: rect.width,
          height: rect.height,
          effectiveWidth,
          effectiveHeight,
          isLargeEnough: effectiveWidth >= 44 && effectiveHeight >= 44
        };
      });
    });
    
    const smallTargets = touchTargets.filter(target => !target.isLargeEnough);
    if (smallTargets.length > 0) {
      console.warn('Small touch targets found:', smallTargets);
    }
    
    // Most touch targets should be large enough
    expect(smallTargets.length, 'Most touch targets should be at least 44x44 pixels').toBeLessThan(touchTargets.length * 0.2);
  });

  test('should support high contrast mode', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Simulate high contrast mode by adding CSS
    await page.addStyleTag({
      content: `
        * {
          background: white !important;
          color: black !important;
          border-color: black !important;
        }
        a {
          color: blue !important;
        }
        button {
          background: black !important;
          color: white !important;
          border: 2px solid black !important;
        }
      `
    });
    
    // Check if content is still readable
    const readability = await page.evaluate(() => {
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
      
      return Array.from(textElements).map(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        const text = el.textContent?.trim() || '';
        
        return {
          tag: el.tagName.toLowerCase(),
          text: text.substring(0, 30),
          color,
          backgroundColor,
          hasReadableText: text.length > 0,
          hasContrast: color !== backgroundColor
        };
      }).filter(el => el.hasReadableText);
    });
    
    const lowContrastElements = readability.filter(el => !el.hasContrast);
    expect(lowContrastElements.length, 'Content should be readable in high contrast mode').toBeLessThan(readability.length * 0.1);
  });

  test('should support zoom up to 200%', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    // Set zoom to 200%
    await page.evaluate(() => {
      document.body.style.zoom = '200%';
    });
    
    // Check if content is still accessible
    const zoomAccessibility = await page.evaluate(() => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      const content = document.querySelector('main, [role="main"]');
      if (!content) return null;
      
      const contentRect = content.getBoundingClientRect();
      const isContentVisible = contentRect.width <= viewport.width && contentRect.height <= viewport.height;
      
      const scrollable = document.querySelector('[style*="overflow"], [style*="scroll"]');
      const hasHorizontalScroll = document.body.scrollWidth > viewport.width;
      const hasVerticalScroll = document.body.scrollHeight > viewport.height;
      
      return {
        viewport,
        contentRect,
        isContentVisible,
        hasHorizontalScroll,
        hasVerticalScroll,
        isAccessible: isContentVisible || (!hasHorizontalScroll && hasVerticalScroll)
      };
    });
    
    if (zoomAccessibility) {
      expect(zoomAccessibility.isAccessible, 'Content should be accessible when zoomed to 200%').toBe(true);
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');
    
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Check for animations and transitions
    const motionAccessibility = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const animatedElements = [];
      
      Array.from(elements).forEach(el => {
        const styles = window.getComputedStyle(el);
        const animation = styles.animation;
        const transition = styles.transition;
        const transform = styles.transform;
        
        if (animation !== 'none' || transition !== 'all 0s ease 0s' || transform !== 'none') {
          animatedElements.push({
            tag: el.tagName.toLowerCase(),
            animation,
            transition,
            transform,
            text: el.textContent?.trim().substring(0, 30) || ''
          });
        }
      });
      
      return animatedElements;
    });
    
    console.log('Animated elements found:', motionAccessibility);
    
    // In reduced motion mode, animations should be minimal or disabled
    const problematicAnimations = motionAccessibility.filter(el => 
      el.animation !== 'none' && !el.animation.includes('0s')
    );
    
    expect(problematicAnimations.length, 'Animations should respect reduced motion preferences').toBeLessThan(5);
  });

  test('should support dark mode accessibility', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Simulate dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Check if content is still readable
    const darkModeAccessibility = await page.evaluate(() => {
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button');
      
      return Array.from(textElements).map(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        const text = el.textContent?.trim() || '';
        
        return {
          tag: el.tagName.toLowerCase(),
          text: text.substring(0, 30),
          color,
          backgroundColor,
          hasReadableText: text.length > 0,
          hasContrast: color !== backgroundColor
        };
      }).filter(el => el.hasReadableText);
    });
    
    const lowContrastElements = darkModeAccessibility.filter(el => !el.hasContrast);
    expect(lowContrastElements.length, 'Content should be readable in dark mode').toBeLessThan(darkModeAccessibility.length * 0.1);
  });

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
    
    // Open patient form modal
    await page.click('[data-testid="new-patient-button"]');
    await page.waitForSelector('[data-testid="patient-modal"]');
    
    // Check focus management
    const focusManagement = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="patient-modal"]');
      if (!modal) return null;
      
      const activeElement = document.activeElement;
      const isFocusInModal = modal.contains(activeElement);
      const hasFocusTrap = modal.hasAttribute('data-focus-trap') || modal.hasAttribute('aria-modal');
      
      return {
        isFocusInModal,
        hasFocusTrap,
        activeElementTag: activeElement?.tagName.toLowerCase(),
        isProperlyManaged: isFocusInModal || hasFocusTrap
      };
    });
    
    if (focusManagement) {
      expect(focusManagement.isProperlyManaged, 'Modal should have proper focus management').toBe(true);
    }
    
    // Test focus trap by pressing Tab multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    // Focus should still be within the modal
    const focusAfterTab = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="patient-modal"]');
      const activeElement = document.activeElement;
      return modal?.contains(activeElement) || false;
    });
    
    expect(focusAfterTab, 'Focus should be trapped within modal').toBe(true);
  });
});
