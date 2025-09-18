import { expect, test } from '@playwright/test';
import { selectors, testData } from '../utils/test-data';

test.describe('Form Submission Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Patient Form', () => {
    test('should submit patient form with valid data', async ({ page }) => {
      // Navigate to patients page
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Click "New Patient" button
      await page.click('button:has-text("New Patient")');
      await page.waitForSelector(selectors.patientForm.name);

      // Fill out the form
      await page.fill(selectors.patientForm.name, testData.patients.valid.name);
      await page.fill(selectors.patientForm.phone, testData.patients.valid.phone);
      await page.fill(selectors.patientForm.flatVillaNo, testData.patients.valid.flat_villa_no);
      await page.fill(selectors.patientForm.buildingStreet, testData.patients.valid.building_street);
      await page.fill(selectors.patientForm.area, testData.patients.valid.area);
      await page.fill(selectors.patientForm.city, testData.patients.valid.city);
      await page.fill(selectors.patientForm.medicalNotes, testData.patients.valid.medical_notes);
      await page.fill(selectors.patientForm.emergencyContact, testData.patients.valid.emergency_contact);

      // Submit the form
      await page.click(selectors.patientForm.submitButton);

      // Wait for success message or redirect
      await expect(page.locator('text=Patient created successfully')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for invalid patient data', async ({ page }) => {
      // Navigate to patients page
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Click "New Patient" button
      await page.click('button:has-text("New Patient")');
      await page.waitForSelector(selectors.patientForm.name);

      // Try to submit empty form
      await page.click(selectors.patientForm.submitButton);

      // Check for validation errors
      await expect(page.locator('text=Name is required')).toBeVisible();
      await expect(page.locator('text=Phone number is required')).toBeVisible();
    });

    test('should cancel patient form', async ({ page }) => {
      // Navigate to patients page
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Click "New Patient" button
      await page.click('button:has-text("New Patient")');
      await page.waitForSelector(selectors.patientForm.name);

      // Fill some data
      await page.fill(selectors.patientForm.name, 'Test Patient');

      // Click cancel
      await page.click(selectors.patientForm.cancelButton);

      // Verify form is closed
      await expect(page.locator(selectors.patientForm.name)).not.toBeVisible();
    });
  });

  test.describe('Staff Form', () => {
    test('should submit staff form with valid data', async ({ page }) => {
      // Navigate to staff page
      await page.click(selectors.navigation.staff);
      await page.waitForLoadState('networkidle');

      // Click "New Staff" button
      await page.click('button:has-text("New Staff")');
      await page.waitForSelector(selectors.staffForm.firstName);

      // Fill out the form
      await page.fill(selectors.staffForm.firstName, testData.staff.valid.first_name);
      await page.fill(selectors.staffForm.lastName, testData.staff.valid.last_name);
      await page.selectOption(selectors.staffForm.staffType, testData.staff.valid.staff_type);
      await page.fill(selectors.staffForm.specialization, testData.staff.valid.specialization);
      await page.fill(selectors.staffForm.phone, testData.staff.valid.phone);
      await page.fill(selectors.staffForm.email, testData.staff.valid.email);

      // Select available days
      await page.check('input[type="checkbox"][value="1"]'); // Monday
      await page.check('input[type="checkbox"][value="2"]'); // Tuesday
      await page.check('input[type="checkbox"][value="3"]'); // Wednesday

      // Submit the form
      await page.click(selectors.staffForm.submitButton);

      // Wait for success message
      await expect(page.locator('text=Staff created successfully')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for invalid staff data', async ({ page }) => {
      // Navigate to staff page
      await page.click(selectors.navigation.staff);
      await page.waitForLoadState('networkidle');

      // Click "New Staff" button
      await page.click('button:has-text("New Staff")');
      await page.waitForSelector(selectors.staffForm.firstName);

      // Try to submit empty form
      await page.click(selectors.staffForm.submitButton);

      // Check for validation errors
      await expect(page.locator('text=First name is required')).toBeVisible();
      await expect(page.locator('text=Last name is required')).toBeVisible();
      await expect(page.locator('text=Phone number is required')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
    });

    test('should validate Google Calendar ID', async ({ page }) => {
      // Navigate to staff page
      await page.click(selectors.navigation.staff);
      await page.waitForLoadState('networkidle');

      // Click "New Staff" button
      await page.click('button:has-text("New Staff")');
      await page.waitForSelector(selectors.staffForm.firstName);

      // Fill required fields
      await page.fill(selectors.staffForm.firstName, 'Test');
      await page.fill(selectors.staffForm.lastName, 'Staff');
      await page.fill(selectors.staffForm.phone, '+971501234567');
      await page.fill(selectors.staffForm.email, 'test@example.com');

      // Enter invalid Google Calendar ID
      await page.fill(selectors.staffForm.googleCalendarId, 'invalid-email');
      await page.click('button:has-text("Validate")');

      // Check for validation error
      await expect(page.locator('text=Invalid Google Calendar ID format')).toBeVisible();
    });
  });

  test.describe('Appointment Form', () => {
    test('should submit appointment form with valid data', async ({ page }) => {
      // Navigate to appointments page
      await page.click(selectors.navigation.appointments);
      await page.waitForLoadState('networkidle');

      // Click "New Appointment" button
      await page.click('button:has-text("New Appointment")');
      await page.waitForSelector(selectors.appointmentForm.patientSelect);

      // Fill out the form
      await page.selectOption(selectors.appointmentForm.patientSelect, testData.appointments.valid.patient_id);
      await page.selectOption(selectors.appointmentForm.appointmentType, testData.appointments.valid.appointment_type);
      await page.fill(selectors.appointmentForm.appointmentDate, testData.appointments.valid.appointment_date);
      await page.fill(selectors.appointmentForm.startTime, testData.appointments.valid.start_time);
      await page.fill(selectors.appointmentForm.duration, testData.appointments.valid.duration.toString());
      await page.fill(selectors.appointmentForm.notes, testData.appointments.valid.notes);

      // Submit the form
      await page.click(selectors.appointmentForm.submitButton);

      // Wait for success message
      await expect(page.locator('text=Appointment created successfully')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for invalid appointment data', async ({ page }) => {
      // Navigate to appointments page
      await page.click(selectors.navigation.appointments);
      await page.waitForLoadState('networkidle');

      // Click "New Appointment" button
      await page.click('button:has-text("New Appointment")');
      await page.waitForSelector(selectors.appointmentForm.patientSelect);

      // Try to submit empty form
      await page.click(selectors.appointmentForm.submitButton);

      // Check for validation errors
      await expect(page.locator('text=Patient is required')).toBeVisible();
      await expect(page.locator('text=Appointment date is required')).toBeVisible();
      await expect(page.locator('text=Start time is required')).toBeVisible();
    });

    test('should validate appointment time constraints', async ({ page }) => {
      // Navigate to appointments page
      await page.click(selectors.navigation.appointments);
      await page.waitForLoadState('networkidle');

      // Click "New Appointment" button
      await page.click('button:has-text("New Appointment")');
      await page.waitForSelector(selectors.appointmentForm.patientSelect);

      // Fill form with past date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await page.selectOption(selectors.appointmentForm.patientSelect, testData.appointments.valid.patient_id);
      await page.fill(selectors.appointmentForm.appointmentDate, yesterdayStr);
      await page.fill(selectors.appointmentForm.startTime, '10:00');
      await page.fill(selectors.appointmentForm.duration, '60');

      // Submit the form
      await page.click(selectors.appointmentForm.submitButton);

      // Check for validation error
      await expect(page.locator('text=Appointment date must be today or in the future')).toBeVisible();
    });

    test('should handle transportation type selection', async ({ page }) => {
      // Navigate to appointments page
      await page.click(selectors.navigation.appointments);
      await page.waitForLoadState('networkidle');

      // Click "New Appointment" button
      await page.click('button:has-text("New Appointment")');
      await page.waitForSelector(selectors.appointmentForm.patientSelect);

      // Fill basic appointment data
      await page.selectOption(selectors.appointmentForm.patientSelect, testData.appointments.valid.patient_id);
      await page.selectOption(selectors.appointmentForm.appointmentType, testData.appointments.valid.appointment_type);
      await page.fill(selectors.appointmentForm.appointmentDate, testData.appointments.valid.appointment_date);
      await page.fill(selectors.appointmentForm.startTime, testData.appointments.valid.start_time);
      await page.fill(selectors.appointmentForm.duration, testData.appointments.valid.duration.toString());

      // Select driver transportation
      await page.selectOption(selectors.appointmentForm.transportationType, 'driver');

      // Check that driver selection appears
      await expect(page.locator('select[name="driver_id"]')).toBeVisible();

      // Try to submit without selecting driver
      await page.click(selectors.appointmentForm.submitButton);

      // Check for validation error
      await expect(page.locator('text=Driver ID is required when transportation type is driver')).toBeVisible();
    });
  });

  test.describe('Form Loading States', () => {
    test('should show loading state during form submission', async ({ page }) => {
      // Navigate to patients page
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Click "New Patient" button
      await page.click('button:has-text("New Patient")');
      await page.waitForSelector(selectors.patientForm.name);

      // Fill out the form
      await page.fill(selectors.patientForm.name, testData.patients.valid.name);
      await page.fill(selectors.patientForm.phone, testData.patients.valid.phone);
      await page.fill(selectors.patientForm.flatVillaNo, testData.patients.valid.flat_villa_no);
      await page.fill(selectors.patientForm.buildingStreet, testData.patients.valid.building_street);
      await page.fill(selectors.patientForm.area, testData.patients.valid.area);
      await page.fill(selectors.patientForm.city, testData.patients.valid.city);

      // Submit the form and check loading state
      await page.click(selectors.patientForm.submitButton);

      // Check that submit button shows loading state
      await expect(page.locator('button:has-text("Saving...")')).toBeVisible();
    });

    test('should disable form fields during submission', async ({ page }) => {
      // Navigate to staff page
      await page.click(selectors.navigation.staff);
      await page.waitForLoadState('networkidle');

      // Click "New Staff" button
      await page.click('button:has-text("New Staff")');
      await page.waitForSelector(selectors.staffForm.firstName);

      // Fill out the form
      await page.fill(selectors.staffForm.firstName, testData.staff.valid.first_name);
      await page.fill(selectors.staffForm.lastName, testData.staff.valid.last_name);
      await page.selectOption(selectors.staffForm.staffType, testData.staff.valid.staff_type);
      await page.fill(selectors.staffForm.phone, testData.staff.valid.phone);
      await page.fill(selectors.staffForm.email, testData.staff.valid.email);

      // Submit the form
      await page.click(selectors.staffForm.submitButton);

      // Check that form fields are disabled during submission
      await expect(page.locator(selectors.staffForm.firstName)).toBeDisabled();
      await expect(page.locator(selectors.staffForm.submitButton)).toBeDisabled();
    });
  });

  test.describe('Form Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/patients', route => route.abort());

      // Navigate to patients page
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Click "New Patient" button
      await page.click('button:has-text("New Patient")');
      await page.waitForSelector(selectors.patientForm.name);

      // Fill out the form
      await page.fill(selectors.patientForm.name, testData.patients.valid.name);
      await page.fill(selectors.patientForm.phone, testData.patients.valid.phone);
      await page.fill(selectors.patientForm.flatVillaNo, testData.patients.valid.flat_villa_no);
      await page.fill(selectors.patientForm.buildingStreet, testData.patients.valid.building_street);
      await page.fill(selectors.patientForm.area, testData.patients.valid.area);
      await page.fill(selectors.patientForm.city, testData.patients.valid.city);

      // Submit the form
      await page.click(selectors.patientForm.submitButton);

      // Check for error message
      await expect(page.locator('text=Failed to create patient')).toBeVisible({ timeout: 10000 });
    });

    test('should handle server validation errors', async ({ page }) => {
      // Mock server validation error
      await page.route('**/api/patients', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Validation failed',
            details: {
              phone: 'Phone number already exists'
            }
          })
        });
      });

      // Navigate to patients page
      await page.click(selectors.navigation.patients);
      await page.waitForLoadState('networkidle');

      // Click "New Patient" button
      await page.click('button:has-text("New Patient")');
      await page.waitForSelector(selectors.patientForm.name);

      // Fill out the form
      await page.fill(selectors.patientForm.name, testData.patients.valid.name);
      await page.fill(selectors.patientForm.phone, testData.patients.valid.phone);
      await page.fill(selectors.patientForm.flatVillaNo, testData.patients.valid.flat_villa_no);
      await page.fill(selectors.patientForm.buildingStreet, testData.patients.valid.building_street);
      await page.fill(selectors.patientForm.area, testData.patients.valid.area);
      await page.fill(selectors.patientForm.city, testData.patients.valid.city);

      // Submit the form
      await page.click(selectors.patientForm.submitButton);

      // Check for server validation error
      await expect(page.locator('text=Phone number already exists')).toBeVisible({ timeout: 10000 });
    });
  });
});
