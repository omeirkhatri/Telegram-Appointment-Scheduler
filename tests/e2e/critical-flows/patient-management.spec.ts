import { expect, test } from '@playwright/test';
import { PatientPage } from '../utils/page-objects';
import { testData } from '../utils/test-data';

test.describe('Patient Management Critical Flows', () => {
  let patientPage: PatientPage;

  test.beforeEach(async ({ page }) => {
    patientPage = new PatientPage(page);
    await patientPage.goto('/patients');
  });

  test('should create a new patient with all required fields', async () => {
    // Click new patient button
    await patientPage.clickNewPatient();
    await patientPage.expectPatientModalVisible();

    // Fill patient form with valid data
    await patientPage.fillPatientForm(testData.patients.valid);

    // Submit the form
    await patientPage.submitPatientForm();

    // Verify success
    await patientPage.expectToast('Patient created successfully');
    await patientPage.expectPatientModalHidden();
    await patientPage.expectPatientInList(testData.patients.valid.name);
  });

  test('should create a new patient with minimal required fields', async () => {
    // Click new patient button
    await patientPage.clickNewPatient();
    await patientPage.expectPatientModalVisible();

    // Fill patient form with minimal data
    await patientPage.fillPatientForm(testData.patients.minimal);

    // Submit the form
    await patientPage.submitPatientForm();

    // Verify success
    await patientPage.expectToast('Patient created successfully');
    await patientPage.expectPatientModalHidden();
    await patientPage.expectPatientInList(testData.patients.minimal.name);
  });

  test('should validate required fields when creating patient', async () => {
    // Click new patient button
    await patientPage.clickNewPatient();
    await patientPage.expectPatientModalVisible();

    // Try to submit empty form
    await patientPage.submitPatientForm();

    // Verify validation errors
    await expect(patientPage.page.locator('[data-testid="patient-name-error"]')).toBeVisible();
    await expect(patientPage.page.locator('[data-testid="patient-phone-error"]')).toBeVisible();
    await expect(patientPage.page.locator('[data-testid="patient-flat-villa-no-error"]')).toBeVisible();
    await expect(patientPage.page.locator('[data-testid="patient-building-street-error"]')).toBeVisible();
    await expect(patientPage.page.locator('[data-testid="patient-area-error"]')).toBeVisible();
    await expect(patientPage.page.locator('[data-testid="patient-city-error"]')).toBeVisible();

    // Modal should still be visible
    await patientPage.expectPatientModalVisible();
  });

  test('should cancel patient creation', async () => {
    // Click new patient button
    await patientPage.clickNewPatient();
    await patientPage.expectPatientModalVisible();

    // Fill some data
    await patientPage.page.fill('[data-testid="patient-name"]', 'Test Patient');

    // Cancel the form
    await patientPage.cancelPatientForm();

    // Verify modal is closed and no patient was created
    await patientPage.expectPatientModalHidden();
    await expect(patientPage.page.locator('[data-testid="patient-list"]')).not.toContainText('Test Patient');
  });

  test('should edit an existing patient', async () => {
    // First create a patient
    await patientPage.clickNewPatient();
    await patientPage.fillPatientForm(testData.patients.minimal);
    await patientPage.submitPatientForm();
    await patientPage.expectPatientInList(testData.patients.minimal.name);

    // Click on the patient to edit
    await patientPage.page.click(`[data-testid="patient-item-${testData.patients.minimal.name}"]`);
    await patientPage.expectPatientModalVisible();

    // Update the patient name
    const updatedName = 'Updated Patient Name';
    await patientPage.page.fill('[data-testid="patient-name"]', updatedName);

    // Submit the changes
    await patientPage.submitPatientForm();

    // Verify success
    await patientPage.expectToast('Patient updated successfully');
    await patientPage.expectPatientInList(updatedName);
  });

  test('should search for patients', async () => {
    // Create a patient first
    await patientPage.clickNewPatient();
    await patientPage.fillPatientForm(testData.patients.valid);
    await patientPage.submitPatientForm();

    // Search for the patient
    const searchInput = patientPage.page.locator('[data-testid="patient-search"]');
    await searchInput.fill(testData.patients.valid.name);

    // Verify search results
    await patientPage.expectPatientInList(testData.patients.valid.name);

    // Clear search and verify all patients are shown
    await searchInput.clear();
    await patientPage.expectPatientInList(testData.patients.valid.name);
  });

  test('should handle patient creation with invalid phone number', async () => {
    // Click new patient button
    await patientPage.clickNewPatient();
    await patientPage.expectPatientModalVisible();

    // Fill form with invalid phone
    const invalidPatient = { ...testData.patients.minimal, phone: 'invalid-phone' };
    await patientPage.fillPatientForm(invalidPatient);

    // Submit the form
    await patientPage.submitPatientForm();

    // Verify validation error
    await expect(patientPage.page.locator('[data-testid="patient-phone-error"]')).toBeVisible();
    await patientPage.expectPatientModalVisible();
  });

  test('should handle patient creation with invalid Google Maps link', async () => {
    // Click new patient button
    await patientPage.clickNewPatient();
    await patientPage.expectPatientModalVisible();

    // Fill form with invalid Google Maps link
    const invalidPatient = {
      ...testData.patients.valid,
      googleMapsLink: 'not-a-valid-url'
    };
    await patientPage.fillPatientForm(invalidPatient);

    // Submit the form
    await patientPage.submitPatientForm();

    // Verify validation error
    await expect(patientPage.page.locator('[data-testid="patient-google-maps-link-error"]')).toBeVisible();
    await patientPage.expectPatientModalVisible();
  });
});
