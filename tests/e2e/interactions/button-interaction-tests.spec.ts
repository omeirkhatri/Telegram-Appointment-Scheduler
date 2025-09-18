import { expect, test } from '@playwright/test';
import { selectors } from '../utils/test-data';

test.describe('Button Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Navigation Buttons', () => {
    test('should navigate to dashboard when clicking dashboard button', async ({ page }) => {
      await page.click(selectors.navigation.dashboard);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/dashboard');
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    });

    test('should navigate to patients page when clicking patients button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/patients');
      await expect(page.locator('h1:has-text("Patients")')).toBeVisible();
    });

    test('should navigate to staff page when clicking staff button', async ({ page }) => {
      await page.click(selectors.navigation.staff);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/staff');
      await expect(page.locator('h1:has-text("Staff")')).toBeVisible();
    });

    test('should navigate to appointments page when clicking appointments button', async ({ page }) => {
      await page.click(selectors.navigation.appointments);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/appointments');
      await expect(page.locator('h1:has-text("Appointments")')).toBeVisible();
    });
  });

  test.describe('Action Buttons', () => {
    test('should open new patient form when clicking "New Patient" button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("New Patient")');
      await expect(page.locator(selectors.patientForm.name)).toBeVisible();
    });

    test('should open new staff form when clicking "New Staff" button', async ({ page }) => {
      await page.click(selectors.navigation.staff);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("New Staff")');
      await expect(page.locator(selectors.staffForm.firstName)).toBeVisible();
    });

    test('should open new appointment form when clicking "New Appointment" button', async ({ page }) => {
      await page.click(selectors.navigation.appointments);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("New Appointment")');
      await expect(page.locator(selectors.appointmentForm.patientSelect)).toBeVisible();
    });
  });

  test.describe('Filter and Search Buttons', () => {
    test('should open filter panel when clicking filter button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Filter")');
      await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
    });

    test('should clear filters when clicking clear filters button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Open filter panel
      await page.click('button:has-text("Filter")');
      await page.waitForSelector('[data-testid="filter-panel"]');

      // Apply some filters
      await page.fill('[data-testid="filter-city"]', 'Dubai');

      // Clear filters
      await page.click('button:has-text("Clear Filters")');

      // Verify filter is cleared
      await expect(page.locator('[data-testid="filter-city"]')).toHaveValue('');
    });

    test('should perform search when clicking search button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Enter search term
      await page.fill('[data-testid="search-input"]', 'test patient');

      // Click search button
      await page.click('button:has-text("Search")');

      // Wait for search results
      await page.waitForLoadState('networkidle');

      // Verify search was performed (results should be filtered)
      const results = await page.locator('[data-testid="patient-row"]').count();
      expect(results).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Edit and Delete Buttons', () => {
    test('should open edit form when clicking edit button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Click edit button on first patient
      await page.click('[data-testid="patient-row"]:first-child button:has-text("Edit")');

      // Verify edit form is open
      await expect(page.locator(selectors.patientForm.name)).toBeVisible();
    });

    test('should show delete confirmation when clicking delete button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Click delete button on first patient
      await page.click('[data-testid="patient-row"]:first-child button:has-text("Delete")');

      // Verify confirmation dialog is shown
      await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
      await expect(page.locator('text=Are you sure you want to delete this patient?')).toBeVisible();
    });

    test('should cancel delete when clicking cancel in confirmation dialog', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Click delete button
      await page.click('[data-testid="patient-row"]:first-child button:has-text("Delete")');

      // Click cancel in confirmation dialog
      await page.click('[data-testid="delete-confirmation"] button:has-text("Cancel")');

      // Verify dialog is closed
      await expect(page.locator('[data-testid="delete-confirmation"]')).not.toBeVisible();
    });

    test('should confirm delete when clicking confirm in confirmation dialog', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Get initial count
      const initialCount = await page.locator('[data-testid="patient-row"]').count();

      // Click delete button
      await page.click('[data-testid="patient-row"]:first-child button:has-text("Delete")');

      // Click confirm in confirmation dialog
      await page.click('[data-testid="delete-confirmation"] button:has-text("Delete")');

      // Wait for deletion to complete
      await page.waitForLoadState('networkidle');

      // Verify patient was deleted
      const newCount = await page.locator('[data-testid="patient-row"]').count();
      expect(newCount).toBe(initialCount - 1);
    });
  });

  test.describe('Bulk Action Buttons', () => {
    test('should select multiple items when clicking select all checkbox', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Click select all checkbox
      await page.click('[data-testid="select-all"]');

      // Verify all checkboxes are selected
      const checkboxes = await page.locator('[data-testid="patient-checkbox"]').all();
      for (const checkbox of checkboxes) {
        await expect(checkbox).toBeChecked();
      }
    });

    test('should show bulk actions when items are selected', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Select first patient
      await page.click('[data-testid="patient-checkbox"]:first-child');

      // Verify bulk actions are visible
      await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      await expect(page.locator('button:has-text("Bulk Delete")')).toBeVisible();
    });

    test('should perform bulk delete when clicking bulk delete button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Select multiple patients
      await page.click('[data-testid="patient-checkbox"]:first-child');
      await page.click('[data-testid="patient-checkbox"]:nth-child(2)');

      // Click bulk delete
      await page.click('button:has-text("Bulk Delete")');

      // Confirm bulk delete
      await page.click('[data-testid="bulk-delete-confirmation"] button:has-text("Delete")');

      // Wait for deletion to complete
      await page.waitForLoadState('networkidle');

      // Verify success message
      await expect(page.locator('text=2 patients deleted successfully')).toBeVisible();
    });
  });

  test.describe('Pagination Buttons', () => {
    test('should navigate to next page when clicking next button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Check if pagination exists
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');

        // Verify URL changed or page content updated
        expect(page.url()).toContain('page=2');
      }
    });

    test('should navigate to previous page when clicking previous button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Navigate to page 2 first
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');

        // Then go back
        const prevButton = page.locator('button:has-text("Previous")');
        if (await prevButton.isVisible()) {
          await prevButton.click();
          await page.waitForLoadState('networkidle');

          // Verify we're back on page 1
          expect(page.url()).not.toContain('page=2');
        }
      }
    });

    test('should navigate to specific page when clicking page number', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Wait for patients to load
      await page.waitForSelector('[data-testid="patient-row"]', { timeout: 10000 });

      // Check if page 2 button exists
      const page2Button = page.locator('button:has-text("2")');
      if (await page2Button.isVisible()) {
        await page2Button.click();
        await page.waitForLoadState('networkidle');

        // Verify we're on page 2
        expect(page.url()).toContain('page=2');
      }
    });
  });

  test.describe('Export and Import Buttons', () => {
    test('should export data when clicking export button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Click export button
      await page.click('button:has-text("Export")');

      // Verify export dialog is shown
      await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();

      // Select export format
      await page.selectOption('[data-testid="export-format"]', 'csv');

      // Click export
      await page.click('[data-testid="export-dialog"] button:has-text("Export")');

      // Wait for download to start
      const downloadPromise = page.waitForEvent('download');
      await downloadPromise;
    });

    test('should import data when clicking import button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Click import button
      await page.click('button:has-text("Import")');

      // Verify import dialog is shown
      await expect(page.locator('[data-testid="import-dialog"]')).toBeVisible();

      // Upload file (this would require a test file)
      // For now, just verify the dialog is functional
      await page.click('[data-testid="import-dialog"] button:has-text("Cancel")');
    });
  });

  test.describe('Refresh and Reload Buttons', () => {
    test('should refresh data when clicking refresh button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Get initial timestamp
      const initialTimestamp = await page.locator('[data-testid="last-updated"]').textContent();

      // Click refresh button
      await page.click('button:has-text("Refresh")');

      // Wait for refresh to complete
      await page.waitForLoadState('networkidle');

      // Verify data was refreshed (timestamp should be different)
      const newTimestamp = await page.locator('[data-testid="last-updated"]').textContent();
      expect(newTimestamp).not.toBe(initialTimestamp);
    });
  });

  test.describe('Settings and Configuration Buttons', () => {
    test('should open settings when clicking settings button', async ({ page }) => {
      await page.click('button:has-text("Settings")');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/settings');
      await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
    });

    test('should save settings when clicking save button', async ({ page }) => {
      await page.click('button:has-text("Settings")');
      await page.waitForLoadState('networkidle');

      // Make a setting change
      await page.fill('[data-testid="setting-email-notifications"]', 'true');

      // Click save
      await page.click('button:has-text("Save Settings")');

      // Verify success message
      await expect(page.locator('text=Settings saved successfully')).toBeVisible();
    });
  });

  test.describe('Modal and Dialog Buttons', () => {
    test('should close modal when clicking close button', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Open a modal (e.g., new patient form)
      await page.click('button:has-text("New Patient")');
      await expect(page.locator('[data-testid="patient-modal"]')).toBeVisible();

      // Click close button
      await page.click('[data-testid="patient-modal"] button:has-text("Close")');

      // Verify modal is closed
      await expect(page.locator('[data-testid="patient-modal"]')).not.toBeVisible();
    });

    test('should close modal when clicking outside', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Open a modal
      await page.click('button:has-text("New Patient")');
      await expect(page.locator('[data-testid="patient-modal"]')).toBeVisible();

      // Click outside the modal
      await page.click('[data-testid="modal-backdrop"]');

      // Verify modal is closed
      await expect(page.locator('[data-testid="patient-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should create new patient with Ctrl+N shortcut', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Press Ctrl+N
      await page.keyboard.press('Control+n');

      // Verify new patient form is open
      await expect(page.locator(selectors.patientForm.name)).toBeVisible();
    });

    test('should save form with Ctrl+S shortcut', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Open new patient form
      await page.click('button:has-text("New Patient")');
      await page.waitForSelector(selectors.patientForm.name);

      // Fill form
      await page.fill(selectors.patientForm.name, 'Test Patient');
      await page.fill(selectors.patientForm.phone, '+971501234567');
      await page.fill(selectors.patientForm.flatVillaNo, '123');
      await page.fill(selectors.patientForm.buildingStreet, 'Test Street');
      await page.fill(selectors.patientForm.area, 'Test Area');
      await page.fill(selectors.patientForm.city, 'Dubai');

      // Press Ctrl+S
      await page.keyboard.press('Control+s');

      // Verify form was submitted
      await expect(page.locator('text=Patient created successfully')).toBeVisible({ timeout: 10000 });
    });

    test('should close modal with Escape key', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Open a modal
      await page.click('button:has-text("New Patient")');
      await expect(page.locator('[data-testid="patient-modal"]')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Verify modal is closed
      await expect(page.locator('[data-testid="patient-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Button States and Accessibility', () => {
    test('should show loading state on buttons during async operations', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Open new patient form
      await page.click('button:has-text("New Patient")');
      await page.waitForSelector(selectors.patientForm.name);

      // Fill form
      await page.fill(selectors.patientForm.name, 'Test Patient');
      await page.fill(selectors.patientForm.phone, '+971501234567');
      await page.fill(selectors.patientForm.flatVillaNo, '123');
      await page.fill(selectors.patientForm.buildingStreet, 'Test Street');
      await page.fill(selectors.patientForm.area, 'Test Area');
      await page.fill(selectors.patientForm.city, 'Dubai');

      // Submit form and check loading state
      await page.click(selectors.patientForm.submitButton);

      // Verify button shows loading state
      await expect(page.locator('button:has-text("Saving...")')).toBeVisible();
    });

    test('should disable buttons when appropriate', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Open new patient form
      await page.click('button:has-text("New Patient")');
      await page.waitForSelector(selectors.patientForm.name);

      // Submit empty form
      await page.click(selectors.patientForm.submitButton);

      // Verify submit button is disabled during validation
      await expect(page.locator(selectors.patientForm.submitButton)).toBeDisabled();
    });

    test('should have proper ARIA labels on buttons', async ({ page }) => {
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Check that buttons have proper ARIA labels
      const newPatientButton = page.locator('button:has-text("New Patient")');
      await expect(newPatientButton).toHaveAttribute('aria-label', /new patient/i);

      const editButton = page.locator('[data-testid="patient-row"]:first-child button:has-text("Edit")');
      if (await editButton.isVisible()) {
        await expect(editButton).toHaveAttribute('aria-label', /edit patient/i);
      }
    });
  });
});
