import { expect, test } from '@playwright/test';

test.describe('Transportation Segments Driver Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Login as driver
    await page.fill('[data-testid="email-input"]', 'driver@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await expect(page.locator('[data-testid="driver-dashboard"]')).toBeVisible();
  });

  test('should view driver segments board with new terminology', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Verify new terminology is displayed
    await expect(page.locator('[data-testid="pickup-location-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-location-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="pickup-location-type-column"]')).toBeVisible();

    // Check segment details
    await expect(page.locator('[data-testid="segment-item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="pickup-location-type-office"]')).toBeVisible();
    await expect(page.locator('[data-testid="pickup-location-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-location-address"]')).toBeVisible();
  });

  test('should view transportation segment details as driver', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Click on a segment
    await page.click('[data-testid="segment-item-1"]');
    await expect(page.locator('[data-testid="segment-details-modal"]')).toBeVisible();

    // Verify new terminology in details
    await expect(page.locator('[data-testid="pickup-location-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-location-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="pickup-location-type-display"]')).toBeVisible();

    // Check pickup location details
    await expect(page.locator('[data-testid="pickup-location-address-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="pickup-location-coordinates"]')).toBeVisible();
    await expect(page.locator('[data-testid="pickup-location-building"]')).toBeVisible();

    // Check patient location details
    await expect(page.locator('[data-testid="patient-location-address-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-location-coordinates"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-location-building"]')).toBeVisible();
  });

  test('should update segment status as driver', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Click on a segment
    await page.click('[data-testid="segment-item-1"]');
    await expect(page.locator('[data-testid="segment-details-modal"]')).toBeVisible();

    // Update status to in_progress
    await page.selectOption('[data-testid="segment-status-select"]', 'in_progress');
    await page.click('[data-testid="update-segment-status-button"]');
    await expect(page.locator('[data-testid="status-updated-success"]')).toBeVisible();

    // Verify status update
    await expect(page.locator('[data-testid="segment-status-in-progress"]')).toBeVisible();
  });

  test('should add driver notes to transportation segment', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Click on a segment
    await page.click('[data-testid="segment-item-1"]');
    await expect(page.locator('[data-testid="segment-details-modal"]')).toBeVisible();

    // Add driver notes
    await page.fill('[data-testid="driver-notes-textarea"]', 'Patient was ready on time. No issues with pickup location.');
    await page.click('[data-testid="save-driver-notes-button"]');
    await expect(page.locator('[data-testid="notes-saved-success"]')).toBeVisible();

    // Verify notes are saved
    await expect(page.locator('[data-testid="driver-notes-display"]')).toBeVisible();
  });

  test('should handle pickup location type specific information', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Test office pickup location
    await page.click('[data-testid="segment-office-pickup"]');
    await expect(page.locator('[data-testid="office-pickup-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="office-address-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="office-building-display"]')).toBeVisible();

    // Test previous appointment pickup location
    await page.click('[data-testid="segment-previous-appointment-pickup"]');
    await expect(page.locator('[data-testid="previous-appointment-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="previous-appointment-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="previous-patient-location"]')).toBeVisible();

    // Test metro station pickup location
    await page.click('[data-testid="segment-metro-station-pickup"]');
    await expect(page.locator('[data-testid="metro-station-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="metro-station-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="metro-station-lines"]')).toBeVisible();

    // Test custom pickup location
    await page.click('[data-testid="segment-custom-pickup"]');
    await expect(page.locator('[data-testid="custom-pickup-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="custom-address-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="custom-location-instructions"]')).toBeVisible();
  });

  test('should view route information and navigation', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Click on a segment
    await page.click('[data-testid="segment-item-1"]');
    await expect(page.locator('[data-testid="segment-details-modal"]')).toBeVisible();

    // View route information
    await page.click('[data-testid="view-route-button"]');
    await expect(page.locator('[data-testid="route-details-modal"]')).toBeVisible();

    // Verify route information
    await expect(page.locator('[data-testid="route-distance"]')).toBeVisible();
    await expect(page.locator('[data-testid="route-duration"]')).toBeVisible();
    await expect(page.locator('[data-testid="route-directions"]')).toBeVisible();

    // Test navigation
    await page.click('[data-testid="start-navigation-button"]');
    await expect(page.locator('[data-testid="navigation-started"]')).toBeVisible();
  });

  test('should handle segment completion workflow', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Click on a segment
    await page.click('[data-testid="segment-item-1"]');
    await expect(page.locator('[data-testid="segment-details-modal"]')).toBeVisible();

    // Mark as completed
    await page.selectOption('[data-testid="segment-status-select"]', 'completed');
    await page.fill('[data-testid="completion-notes-textarea"]', 'Successfully completed pickup and dropoff. Patient was on time.');
    await page.click('[data-testid="complete-segment-button"]');
    await expect(page.locator('[data-testid="segment-completed-success"]')).toBeVisible();

    // Verify completion
    await expect(page.locator('[data-testid="segment-status-completed"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-timestamp"]')).toBeVisible();
  });

  test('should handle segment cancellation workflow', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Click on a segment
    await page.click('[data-testid="segment-item-1"]');
    await expect(page.locator('[data-testid="segment-details-modal"]')).toBeVisible();

    // Cancel segment
    await page.selectOption('[data-testid="segment-status-select"]', 'cancelled');
    await page.fill('[data-testid="cancellation-reason-textarea"]', 'Patient cancelled appointment. No pickup required.');
    await page.click('[data-testid="cancel-segment-button"]');
    await expect(page.locator('[data-testid="segment-cancelled-success"]')).toBeVisible();

    // Verify cancellation
    await expect(page.locator('[data-testid="segment-status-cancelled"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancellation-timestamp"]')).toBeVisible();
  });

  test('should view daily schedule with transportation segments', async ({ page }) => {
    // Navigate to daily schedule
    await page.click('[data-testid="daily-schedule-nav"]');
    await expect(page.locator('[data-testid="daily-schedule-view"]')).toBeVisible();

    // Verify transportation segments are displayed
    await expect(page.locator('[data-testid="transportation-segments-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="pickup-location-column"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-location-column"]')).toBeVisible();

    // Check segment details in schedule
    await expect(page.locator('[data-testid="schedule-segment-item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="schedule-pickup-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="schedule-pickup-location"]')).toBeVisible();
    await expect(page.locator('[data-testid="schedule-patient-location"]')).toBeVisible();
  });

  test('should handle transportation segment conflicts and overrides', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Check for conflicts
    await expect(page.locator('[data-testid="conflict-warning-1"]')).toBeVisible();
    await page.click('[data-testid="conflict-warning-1"]');
    await expect(page.locator('[data-testid="conflict-details-modal"]')).toBeVisible();

    // View conflict details
    await expect(page.locator('[data-testid="conflict-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-segments"]')).toBeVisible();

    // Handle conflict
    await page.click('[data-testid="resolve-conflict-button"]');
    await expect(page.locator('[data-testid="conflict-resolution-dialog"]')).toBeVisible();

    // Override conflict
    await page.click('[data-testid="override-conflict-button"]');
    await page.fill('[data-testid="override-justification"]', 'Driver override required due to traffic conditions');
    await page.click('[data-testid="confirm-override-button"]');

    // Verify override is recorded
    await expect(page.locator('[data-testid="override-recorded"]')).toBeVisible();
  });

  test('should export driver segments data', async ({ page }) => {
    // Navigate to driver segments board
    await page.click('[data-testid="driver-segments-nav"]');
    await expect(page.locator('[data-testid="driver-segments-board"]')).toBeVisible();

    // Export data
    await page.click('[data-testid="export-driver-segments-button"]');
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();

    // Select export format
    await page.selectOption('[data-testid="export-format-select"]', 'pdf');
    await page.fill('[data-testid="export-date-range-start"]', '2024-01-01');
    await page.fill('[data-testid="export-date-range-end"]', '2024-01-31');

    // Confirm export
    await page.click('[data-testid="confirm-export-button"]');
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
  });
});

