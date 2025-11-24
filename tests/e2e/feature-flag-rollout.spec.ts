/**
 * Feature Flag Rollout End-to-End Tests
 *
 * Comprehensive E2E tests for feature flag rollout scenarios
 * using Playwright to test the complete user journey.
 */

import { expect, Page, test } from '@playwright/test';

// Test data
const testPatient = {
  name: 'Test Patient',
  phone: '+1234567890',
  email: 'test@example.com'
};

const testStaff = [
  { id: '1', name: 'Driver 1', staff_type: 'driver', status: 'active' },
  { id: '2', name: 'Driver 2', staff_type: 'driver', status: 'active' }
];

// Helper function to set feature flags via environment variables
async function setFeatureFlags(page: Page, flags: Record<string, boolean>) {
  await page.evaluate((flags) => {
    // Set feature flags in the browser context
    Object.entries(flags).forEach(([key, value]) => {
      localStorage.setItem(`feature_flag_${key}`, value.toString());
    });
  }, flags);
}

// Helper function to navigate to appointment form
async function navigateToAppointmentForm(page: Page) {
  await page.goto('/appointments/new');
  await page.waitForLoadState('networkidle');
}

// Helper function to create a basic appointment
async function createBasicAppointment(page: Page) {
  // Fill patient information
  await page.fill('[data-testid="patient-name"]', testPatient.name);
  await page.fill('[data-testid="patient-phone"]', testPatient.phone);
  await page.fill('[data-testid="patient-email"]', testPatient.email);

  // Select appointment type
  await page.click('[data-testid="appointment-type-consultation"]');

  // Select date and time
  await page.click('[data-testid="date-picker"]');
  await page.click('[data-testid="date-tomorrow"]');
  await page.click('[data-testid="time-9am"]');
}

test.describe('Feature Flag Rollout E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Phase 1: Foundation Rollout', () => {
    test('should show assignment mode toggle when DRIVER_ASSIGNMENT_OVERHAUL_UI is enabled', async ({ page }) => {
      // Enable Phase 1 features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);

      // Select driver transportation
      await page.click('[data-testid="transportation-driver"]');

      // Should show assignment mode toggle
      await expect(page.locator('[data-testid="assignment-mode-toggle"]')).toBeVisible();
      await expect(page.locator('text=Driver Assignment Mode')).toBeVisible();
      await expect(page.locator('text=Assign Now')).toBeVisible();
      await expect(page.locator('text=Assign Later')).toBeVisible();

      // Should not show capacity planner
      await page.goto('/capacity-planner');
      await expect(page.locator('text=Feature Not Available')).toBeVisible();
    });

    test('should not show assignment mode toggle when DRIVER_ASSIGNMENT_OVERHAUL_UI is disabled', async ({ page }) => {
      // Disable all features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: false,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: false,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);

      // Select driver transportation
      await page.click('[data-testid="transportation-driver"]');

      // Should not show assignment mode toggle
      await expect(page.locator('[data-testid="assignment-mode-toggle"]')).not.toBeVisible();
      await expect(page.locator('text=Driver Assignment Mode')).not.toBeVisible();
    });

    test('should show segment editor when DRIVER_ASSIGNMENT_OVERHAUL_UI is enabled', async ({ page }) => {
      // Enable Phase 1 features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);

      // Select segments mode
      await page.click('[data-testid="transportation-segments"]');

      // Should show segment editor
      await expect(page.locator('[data-testid="segment-editor"]')).toBeVisible();
      await expect(page.locator('text=Transportation Segments')).toBeVisible();
    });

    test('should not show segment editor when DRIVER_ASSIGNMENT_OVERHAUL_UI is disabled', async ({ page }) => {
      // Disable all features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: false,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: false,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);

      // Select segments mode
      await page.click('[data-testid="transportation-segments"]');

      // Should not show segment editor
      await expect(page.locator('[data-testid="segment-editor"]')).not.toBeVisible();
    });
  });

  test.describe('Phase 2: Capacity Planner Rollout', () => {
    test('should show capacity planner when DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER is enabled', async ({ page }) => {
      // Enable Phase 2 features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      // Navigate to capacity planner
      await page.goto('/capacity-planner');
      await page.waitForLoadState('networkidle');

      // Should show capacity planner
      await expect(page.locator('text=Capacity Planner')).toBeVisible();
      await expect(page.locator('text=Driver Lanes')).toBeVisible();
      await expect(page.locator('[data-testid="capacity-planner-dashboard"]')).toBeVisible();
    });

    test('should show unassigned queue when DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER is enabled', async ({ page }) => {
      // Enable Phase 2 features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      // Navigate to capacity planner
      await page.goto('/capacity-planner');
      await page.waitForLoadState('networkidle');

      // Should show unassigned queue
      await expect(page.locator('text=Unassigned Queue')).toBeVisible();
      await expect(page.locator('[data-testid="unassigned-queue"]')).toBeVisible();
    });

    test('should show insights panel when DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER is enabled', async ({ page }) => {
      // Enable Phase 2 features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      // Navigate to capacity planner
      await page.goto('/capacity-planner');
      await page.waitForLoadState('networkidle');

      // Should show insights panel
      await expect(page.locator('text=Capacity Insights')).toBeVisible();
      await expect(page.locator('[data-testid="insights-panel"]')).toBeVisible();
    });

    test('should show disabled state when DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER is disabled', async ({ page }) => {
      // Disable capacity planner
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      // Navigate to capacity planner
      await page.goto('/capacity-planner');
      await page.waitForLoadState('networkidle');

      // Should show disabled state
      await expect(page.locator('text=Feature Not Available')).toBeVisible();
      await expect(page.locator('text=This feature is part of the Driver Assignment Overhaul')).toBeVisible();
    });
  });

  test.describe('Phase 3: Assistive Engine Rollout', () => {
    test('should show driver recommendations when DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE is enabled', async ({ page }) => {
      // Enable Phase 3 features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);

      // Select driver transportation with assign later mode
      await page.click('[data-testid="transportation-driver"]');
      await page.click('[data-testid="assignment-mode-assign-later"]');

      // Should show driver recommendations
      await expect(page.locator('[data-testid="driver-recommendations"]')).toBeVisible();
      await expect(page.locator('text=Recommended Drivers')).toBeVisible();
    });

    test('should not show driver recommendations when DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE is disabled', async ({ page }) => {
      // Disable assistive engine
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);

      // Select driver transportation with assign later mode
      await page.click('[data-testid="transportation-driver"]');
      await page.click('[data-testid="assignment-mode-assign-later"]');

      // Should not show driver recommendations
      await expect(page.locator('[data-testid="driver-recommendations"]')).not.toBeVisible();
    });
  });

  test.describe('Phase 4: Analytics & Escalation Rollout', () => {
    test('should allow metrics API when DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS is enabled', async ({ page }) => {
      // Enable Phase 4 features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: true
      });

      // Test metrics API
      const response = await page.request.get('/api/metrics');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should return 403 for metrics API when DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS is disabled', async ({ page }) => {
      // Disable analytics
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: true
      });

      // Test metrics API
      const response = await page.request.get('/api/metrics');
      expect(response.status()).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('disabled');
    });

    test('should allow escalation monitoring API when DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION is enabled', async ({ page }) => {
      // Enable Phase 4 features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: true
      });

      // Test escalation monitoring API
      const response = await page.request.get('/api/escalation-monitoring');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should return 403 for escalation monitoring API when DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION is disabled', async ({ page }) => {
      // Disable escalation
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      // Test escalation monitoring API
      const response = await page.request.get('/api/escalation-monitoring');
      expect(response.status()).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('disabled');
    });
  });

  test.describe('Full Rollout Scenario', () => {
    test('should show all features when all flags are enabled', async ({ page }) => {
      // Enable all features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: true
      });

      // Test appointment form
      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);

      // Should show assignment mode toggle
      await page.click('[data-testid="transportation-driver"]');
      await expect(page.locator('[data-testid="assignment-mode-toggle"]')).toBeVisible();

      // Should show driver recommendations
      await page.click('[data-testid="assignment-mode-assign-later"]');
      await expect(page.locator('[data-testid="driver-recommendations"]')).toBeVisible();

      // Test capacity planner
      await page.goto('/capacity-planner');
      await expect(page.locator('text=Capacity Planner')).toBeVisible();
      await expect(page.locator('text=Driver Lanes')).toBeVisible();
      await expect(page.locator('text=Unassigned Queue')).toBeVisible();
      await expect(page.locator('text=Capacity Insights')).toBeVisible();

      // Test APIs
      const metricsResponse = await page.request.get('/api/metrics');
      expect(metricsResponse.status()).toBe(200);

      const escalationResponse = await page.request.get('/api/escalation-monitoring');
      expect(escalationResponse.status()).toBe(200);
    });
  });

  test.describe('Rollback Scenario', () => {
    test('should hide all features when all flags are disabled', async ({ page }) => {
      // Disable all features
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: false,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: false,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      // Test appointment form
      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);

      // Should not show assignment mode toggle
      await page.click('[data-testid="transportation-driver"]');
      await expect(page.locator('[data-testid="assignment-mode-toggle"]')).not.toBeVisible();

      // Should not show driver recommendations
      await page.click('[data-testid="assignment-mode-assign-later"]');
      await expect(page.locator('[data-testid="driver-recommendations"]')).not.toBeVisible();

      // Test capacity planner
      await page.goto('/capacity-planner');
      await expect(page.locator('text=Feature Not Available')).toBeVisible();

      // Test APIs
      const metricsResponse = await page.request.get('/api/metrics');
      expect(metricsResponse.status()).toBe(403);

      const escalationResponse = await page.request.get('/api/escalation-monitoring');
      expect(escalationResponse.status()).toBe(403);
    });
  });

  test.describe('Gradual Rollout Testing', () => {
    test('should support gradual rollout from Phase 1 to Phase 4', async ({ page }) => {
      // Start with Phase 1
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);

      // Should show Phase 1 features
      await page.click('[data-testid="transportation-driver"]');
      await expect(page.locator('[data-testid="assignment-mode-toggle"]')).toBeVisible();

      // Should not show Phase 2+ features
      await page.goto('/capacity-planner');
      await expect(page.locator('text=Feature Not Available')).toBeVisible();

      // Progress to Phase 2
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      // Should now show Phase 2 features
      await page.goto('/capacity-planner');
      await expect(page.locator('text=Capacity Planner')).toBeVisible();

      // Progress to Phase 3
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: false,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: false
      });

      // Should now show Phase 3 features
      await navigateToAppointmentForm(page);
      await createBasicAppointment(page);
      await page.click('[data-testid="transportation-driver"]');
      await page.click('[data-testid="assignment-mode-assign-later"]');
      await expect(page.locator('[data-testid="driver-recommendations"]')).toBeVisible();

      // Progress to Phase 4
      await setFeatureFlags(page, {
        DRIVER_ASSIGNMENT_OVERHAUL: true,
        DRIVER_ASSIGNMENT_OVERHAUL_UI: true,
        DRIVER_ASSIGNMENT_OVERHAUL_CAPACITY_PLANNER: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ASSISTIVE_ENGINE: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ANALYTICS: true,
        DRIVER_ASSIGNMENT_OVERHAUL_ESCALATION: true
      });

      // Should now show Phase 4 features
      const metricsResponse = await page.request.get('/api/metrics');
      expect(metricsResponse.status()).toBe(200);

      const escalationResponse = await page.request.get('/api/escalation-monitoring');
      expect(escalationResponse.status()).toBe(200);
    });
  });
});
