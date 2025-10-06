import { expect, test } from '@playwright/test';

test.describe('Transportation Segments Dispatcher Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Login as dispatcher (assuming there's a login flow)
    await page.fill('[data-testid="email-input"]', 'dispatcher@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
  });

  test('should create transportation segment with office pickup location', async ({ page }) => {
    // Navigate to appointments
    await page.click('[data-testid="appointments-nav"]');
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible();

    // Create new appointment
    await page.click('[data-testid="create-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-form"]')).toBeVisible();

    // Fill appointment details
    await page.fill('[data-testid="patient-name-input"]', 'John Doe');
    await page.fill('[data-testid="appointment-date-input"]', '2024-01-15');
    await page.fill('[data-testid="appointment-time-input"]', '10:00');
    await page.selectOption('[data-testid="appointment-type-select"]', 'doctor_on_call');

    // Add transportation segment
    await page.click('[data-testid="add-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-form"]')).toBeVisible();

    // Select pickup location type
    await page.click('[data-testid="pickup-location-type-office"]');
    await expect(page.locator('[data-testid="office-location-selector"]')).toBeVisible();

    // Confirm office location
    await page.click('[data-testid="confirm-office-location-button"]');
    await expect(page.locator('[data-testid="office-location-confirmed"]')).toBeVisible();

    // Fill patient location
    await page.fill('[data-testid="patient-location-address"]', '456 Patient St, New York, NY');
    await page.fill('[data-testid="patient-location-building"]', 'Patient Building');

    // Set travel details
    await page.fill('[data-testid="travel-mode-select"]', 'driving');
    await page.fill('[data-testid="buffer-minutes-input"]', '20');
    await page.fill('[data-testid="instructions-textarea"]', 'Call patient 10 minutes before arrival');

    // Save transportation segment
    await page.click('[data-testid="save-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-saved"]')).toBeVisible();

    // Save appointment
    await page.click('[data-testid="save-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-created-success"]')).toBeVisible();
  });

  test('should create transportation segment with previous appointment pickup', async ({ page }) => {
    // Navigate to appointments
    await page.click('[data-testid="appointments-nav"]');
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible();

    // Create new appointment
    await page.click('[data-testid="create-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-form"]')).toBeVisible();

    // Fill appointment details
    await page.fill('[data-testid="patient-name-input"]', 'Jane Smith');
    await page.fill('[data-testid="appointment-date-input"]', '2024-01-15');
    await page.fill('[data-testid="appointment-time-input"]', '14:00');
    await page.selectOption('[data-testid="appointment-type-select"]', 'lab_test');

    // Add transportation segment
    await page.click('[data-testid="add-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-form"]')).toBeVisible();

    // Select pickup location type
    await page.click('[data-testid="pickup-location-type-previous-appointment"]');
    await expect(page.locator('[data-testid="previous-appointment-selector"]')).toBeVisible();

    // Select previous appointment
    await page.click('[data-testid="previous-appointment-option-1"]');
    await expect(page.locator('[data-testid="previous-appointment-selected"]')).toBeVisible();

    // Fill patient location
    await page.fill('[data-testid="patient-location-address"]', '789 New Patient St, New York, NY');
    await page.fill('[data-testid="patient-location-building"]', 'New Patient Building');

    // Set travel details
    await page.fill('[data-testid="travel-mode-select"]', 'driving');
    await page.fill('[data-testid="buffer-minutes-input"]', '15');
    await page.fill('[data-testid="instructions-textarea"]', 'Continue from previous appointment');

    // Save transportation segment
    await page.click('[data-testid="save-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-saved"]')).toBeVisible();

    // Save appointment
    await page.click('[data-testid="save-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-created-success"]')).toBeVisible();
  });

  test('should create transportation segment with metro station pickup', async ({ page }) => {
    // Navigate to appointments
    await page.click('[data-testid="appointments-nav"]');
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible();

    // Create new appointment
    await page.click('[data-testid="create-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-form"]')).toBeVisible();

    // Fill appointment details
    await page.fill('[data-testid="patient-name-input"]', 'Bob Johnson');
    await page.fill('[data-testid="appointment-date-input"]', '2024-01-15');
    await page.fill('[data-testid="appointment-time-input"]', '16:00');
    await page.selectOption('[data-testid="appointment-type-select"]', 'physiotherapy');

    // Add transportation segment
    await page.click('[data-testid="add-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-form"]')).toBeVisible();

    // Select pickup location type
    await page.click('[data-testid="pickup-location-type-metro-station"]');
    await expect(page.locator('[data-testid="metro-station-selector"]')).toBeVisible();

    // Select metro station
    await page.click('[data-testid="metro-station-option-1"]');
    await expect(page.locator('[data-testid="metro-station-selected"]')).toBeVisible();

    // Fill patient location
    await page.fill('[data-testid="patient-location-address"]', '321 Metro Patient St, New York, NY');
    await page.fill('[data-testid="patient-location-building"]', 'Metro Patient Building');

    // Set travel details
    await page.fill('[data-testid="travel-mode-select"]', 'driving');
    await page.fill('[data-testid="buffer-minutes-input"]', '25');
    await page.fill('[data-testid="instructions-textarea"]', 'Pick up from metro station entrance');

    // Save transportation segment
    await page.click('[data-testid="save-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-saved"]')).toBeVisible();

    // Save appointment
    await page.click('[data-testid="save-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-created-success"]')).toBeVisible();
  });

  test('should create transportation segment with custom location pickup', async ({ page }) => {
    // Navigate to appointments
    await page.click('[data-testid="appointments-nav"]');
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible();

    // Create new appointment
    await page.click('[data-testid="create-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-form"]')).toBeVisible();

    // Fill appointment details
    await page.fill('[data-testid="patient-name-input"]', 'Alice Wilson');
    await page.fill('[data-testid="appointment-date-input"]', '2024-01-15');
    await page.fill('[data-testid="appointment-time-input"]', '18:00');
    await page.selectOption('[data-testid="appointment-type-select"]', 'iv_therapy');

    // Add transportation segment
    await page.click('[data-testid="add-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-form"]')).toBeVisible();

    // Select pickup location type
    await page.click('[data-testid="pickup-location-type-custom"]');
    await expect(page.locator('[data-testid="custom-location-selector"]')).toBeVisible();

    // Enter custom location
    await page.fill('[data-testid="custom-location-input"]', '123 Custom Pickup St, New York, NY');
    await page.click('[data-testid="search-custom-location-button"]');
    await expect(page.locator('[data-testid="custom-location-found"]')).toBeVisible();

    // Fill patient location
    await page.fill('[data-testid="patient-location-address"]', '654 Custom Patient St, New York, NY');
    await page.fill('[data-testid="patient-location-building"]', 'Custom Patient Building');

    // Set travel details
    await page.fill('[data-testid="travel-mode-select"]', 'driving');
    await page.fill('[data-testid="buffer-minutes-input"]', '30');
    await page.fill('[data-testid="instructions-textarea"]', 'Custom pickup location - call for exact address');

    // Save transportation segment
    await page.click('[data-testid="save-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-saved"]')).toBeVisible();

    // Save appointment
    await page.click('[data-testid="save-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-created-success"]')).toBeVisible();
  });

  test('should edit existing transportation segment', async ({ page }) => {
    // Navigate to appointments
    await page.click('[data-testid="appointments-nav"]');
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible();

    // Find existing appointment with transportation segment
    await page.click('[data-testid="appointment-item-1"]');
    await expect(page.locator('[data-testid="appointment-details"]')).toBeVisible();

    // Edit transportation segment
    await page.click('[data-testid="edit-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-edit-form"]')).toBeVisible();

    // Change pickup location type
    await page.click('[data-testid="pickup-location-type-custom"]');
    await expect(page.locator('[data-testid="custom-location-selector"]')).toBeVisible();

    // Update custom location
    await page.fill('[data-testid="custom-location-input"]', 'Updated Custom Location, New York, NY');
    await page.click('[data-testid="search-custom-location-button"]');

    // Update travel details
    await page.fill('[data-testid="buffer-minutes-input"]', '35');
    await page.fill('[data-testid="instructions-textarea"]', 'Updated instructions for custom pickup');

    // Save changes
    await page.click('[data-testid="save-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-updated"]')).toBeVisible();
  });

  test('should delete transportation segment', async ({ page }) => {
    // Navigate to appointments
    await page.click('[data-testid="appointments-nav"]');
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible();

    // Find existing appointment with transportation segment
    await page.click('[data-testid="appointment-item-1"]');
    await expect(page.locator('[data-testid="appointment-details"]')).toBeVisible();

    // Delete transportation segment
    await page.click('[data-testid="delete-transportation-segment-button"]');
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    await expect(page.locator('[data-testid="transportation-segment-deleted"]')).toBeVisible();
  });

  test('should view transportation segments in calendar view', async ({ page }) => {
    // Navigate to calendar
    await page.click('[data-testid="calendar-nav"]');
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();

    // Switch to transportation segments view
    await page.click('[data-testid="transportation-segments-view"]');
    await expect(page.locator('[data-testid="transportation-segments-calendar"]')).toBeVisible();

    // Verify segments are displayed with new terminology
    await expect(page.locator('[data-testid="pickup-location-label"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-location-label"]')).toBeVisible();

    // Check segment details
    await page.click('[data-testid="transportation-segment-item-1"]');
    await expect(page.locator('[data-testid="segment-details-modal"]')).toBeVisible();

    // Verify new terminology is used
    await expect(page.locator('[data-testid="pickup-location-type-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="pickup-location-address-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-location-address-display"]')).toBeVisible();
  });

  test('should handle transportation segment conflicts', async ({ page }) => {
    // Navigate to appointments
    await page.click('[data-testid="appointments-nav"]');
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible();

    // Create appointment with conflicting transportation segment
    await page.click('[data-testid="create-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-form"]')).toBeVisible();

    // Fill appointment details
    await page.fill('[data-testid="patient-name-input"]', 'Conflict Patient');
    await page.fill('[data-testid="appointment-date-input"]', '2024-01-15');
    await page.fill('[data-testid="appointment-time-input"]', '10:00');
    await page.selectOption('[data-testid="appointment-type-select"]', 'doctor_on_call');

    // Add transportation segment
    await page.click('[data-testid="add-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-form"]')).toBeVisible();

    // Select pickup location type
    await page.click('[data-testid="pickup-location-type-office"]');
    await page.click('[data-testid="confirm-office-location-button"]');

    // Fill patient location
    await page.fill('[data-testid="patient-location-address"]', '456 Patient St, New York, NY');

    // Set travel details
    await page.fill('[data-testid="travel-mode-select"]', 'driving');
    await page.fill('[data-testid="buffer-minutes-input"]', '20');

    // Save transportation segment
    await page.click('[data-testid="save-transportation-segment-button"]');

    // Check for conflicts
    await expect(page.locator('[data-testid="conflict-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-details"]')).toBeVisible();

    // Handle conflict
    await page.click('[data-testid="resolve-conflict-button"]');
    await expect(page.locator('[data-testid="conflict-resolution-dialog"]')).toBeVisible();

    // Override conflict
    await page.click('[data-testid="override-conflict-button"]');
    await page.fill('[data-testid="override-justification"]', 'Emergency override required');
    await page.click('[data-testid="confirm-override-button"]');

    // Verify override is recorded
    await expect(page.locator('[data-testid="override-recorded"]')).toBeVisible();
  });

  test('should handle transportation segment time calculations', async ({ page }) => {
    // Navigate to appointments
    await page.click('[data-testid="appointments-nav"]');
    await expect(page.locator('[data-testid="appointments-page"]')).toBeVisible();

    // Create appointment with transportation segment
    await page.click('[data-testid="create-appointment-button"]');
    await expect(page.locator('[data-testid="appointment-form"]')).toBeVisible();

    // Fill appointment details
    await page.fill('[data-testid="patient-name-input"]', 'Time Calculation Patient');
    await page.fill('[data-testid="appointment-date-input"]', '2024-01-15');
    await page.fill('[data-testid="appointment-time-input"]', '10:00');
    await page.selectOption('[data-testid="appointment-type-select"]', 'doctor_on_call');

    // Add transportation segment
    await page.click('[data-testid="add-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-form"]')).toBeVisible();

    // Select pickup location type
    await page.click('[data-testid="pickup-location-type-office"]');
    await page.click('[data-testid="confirm-office-location-button"]');

    // Fill patient location
    await page.fill('[data-testid="patient-location-address"]', '456 Patient St, New York, NY');

    // Set travel details
    await page.fill('[data-testid="travel-mode-select"]', 'driving');
    await page.fill('[data-testid="buffer-minutes-input"]', '20');

    // Calculate route
    await page.click('[data-testid="calculate-route-button"]');
    await expect(page.locator('[data-testid="route-calculation-results"]')).toBeVisible();

    // Verify time calculations
    await expect(page.locator('[data-testid="estimated-travel-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="estimated-distance"]')).toBeVisible();
    await expect(page.locator('[data-testid="calculated-pickup-time"]')).toBeVisible();

    // Save transportation segment
    await page.click('[data-testid="save-transportation-segment-button"]');
    await expect(page.locator('[data-testid="transportation-segment-saved"]')).toBeVisible();
  });

  test('should export transportation segments data', async ({ page }) => {
    // Navigate to transportation segments
    await page.click('[data-testid="transportation-segments-nav"]');
    await expect(page.locator('[data-testid="transportation-segments-page"]')).toBeVisible();

    // Export data
    await page.click('[data-testid="export-transportation-segments-button"]');
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();

    // Select export format
    await page.selectOption('[data-testid="export-format-select"]', 'csv');
    await page.fill('[data-testid="export-date-range-start"]', '2024-01-01');
    await page.fill('[data-testid="export-date-range-end"]', '2024-01-31');

    // Confirm export
    await page.click('[data-testid="confirm-export-button"]');
    await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
  });
});

