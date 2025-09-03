import { test, expect } from '@playwright/test';
import { StaffPage } from '../utils/page-objects';
import { testData } from '../utils/test-data';

test.describe('Staff Management Critical Flows', () => {
  let staffPage: StaffPage;

  test.beforeEach(async ({ page }) => {
    staffPage = new StaffPage(page);
    await staffPage.goto('/staff');
  });

  test('should create a new doctor', async () => {
    // Click new staff button
    await staffPage.clickNewStaff();
    await staffPage.expectStaffModalVisible();

    // Fill staff form with doctor data
    await staffPage.fillStaffForm(testData.staff.doctor);

    // Submit the form
    await staffPage.submitStaffForm();

    // Verify success
    await staffPage.expectToast('Staff member created successfully');
    await staffPage.expectStaffModalHidden();
    await staffPage.expectStaffInList(`${testData.staff.doctor.firstName} ${testData.staff.doctor.lastName}`);
  });

  test('should create a new nurse', async () => {
    // Click new staff button
    await staffPage.clickNewStaff();
    await staffPage.expectStaffModalVisible();

    // Fill staff form with nurse data
    await staffPage.fillStaffForm(testData.staff.nurse);

    // Submit the form
    await staffPage.submitStaffForm();

    // Verify success
    await staffPage.expectToast('Staff member created successfully');
    await staffPage.expectStaffModalHidden();
    await staffPage.expectStaffInList(`${testData.staff.nurse.firstName} ${testData.staff.nurse.lastName}`);
  });

  test('should create a new driver', async () => {
    // Click new staff button
    await staffPage.clickNewStaff();
    await staffPage.expectStaffModalVisible();

    // Fill staff form with driver data
    await staffPage.fillStaffForm(testData.staff.driver);

    // Submit the form
    await staffPage.submitStaffForm();

    // Verify success
    await staffPage.expectToast('Staff member created successfully');
    await staffPage.expectStaffModalHidden();
    await staffPage.expectStaffInList(`${testData.staff.driver.firstName} ${testData.staff.driver.lastName}`);
  });

  test('should validate required fields when creating staff', async () => {
    // Click new staff button
    await staffPage.clickNewStaff();
    await staffPage.expectStaffModalVisible();

    // Try to submit empty form
    await staffPage.submitStaffForm();

    // Verify validation errors
    await expect(staffPage.page.locator('[data-testid="staff-first-name-error"]')).toBeVisible();
    await expect(staffPage.page.locator('[data-testid="staff-last-name-error"]')).toBeVisible();
    await expect(staffPage.page.locator('[data-testid="staff-type-error"]')).toBeVisible();
    await expect(staffPage.page.locator('[data-testid="staff-phone-error"]')).toBeVisible();
    await expect(staffPage.page.locator('[data-testid="staff-email-error"]')).toBeVisible();

    // Modal should still be visible
    await staffPage.expectStaffModalVisible();
  });

  test('should validate email format', async () => {
    // Click new staff button
    await staffPage.clickNewStaff();
    await staffPage.expectStaffModalVisible();

    // Fill form with invalid email
    const invalidStaff = { ...testData.staff.doctor, email: 'invalid-email' };
    await staffPage.fillStaffForm(invalidStaff);

    // Submit the form
    await staffPage.submitStaffForm();

    // Verify validation error
    await expect(staffPage.page.locator('[data-testid="staff-email-error"]')).toBeVisible();
    await staffPage.expectStaffModalVisible();
  });

  test('should validate phone number format', async () => {
    // Click new staff button
    await staffPage.clickNewStaff();
    await staffPage.expectStaffModalVisible();

    // Fill form with invalid phone
    const invalidStaff = { ...testData.staff.doctor, phone: 'invalid-phone' };
    await staffPage.fillStaffForm(invalidStaff);

    // Submit the form
    await staffPage.submitStaffForm();

    // Verify validation error
    await expect(staffPage.page.locator('[data-testid="staff-phone-error"]')).toBeVisible();
    await staffPage.expectStaffModalVisible();
  });

  test('should cancel staff creation', async () => {
    // Click new staff button
    await staffPage.clickNewStaff();
    await staffPage.expectStaffModalVisible();

    // Fill some data
    await staffPage.page.fill('[data-testid="staff-first-name"]', 'Test Staff');

    // Cancel the form
    await staffPage.cancelStaffForm();

    // Verify modal is closed and no staff was created
    await staffPage.expectStaffModalHidden();
    await expect(staffPage.page.locator('[data-testid="staff-list"]')).not.toContainText('Test Staff');
  });

  test('should edit an existing staff member', async () => {
    // First create a staff member
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.doctor);
    await staffPage.submitStaffForm();
    await staffPage.expectStaffInList(`${testData.staff.doctor.firstName} ${testData.staff.doctor.lastName}`);

    // Click on the staff member to edit
    const staffName = `${testData.staff.doctor.firstName} ${testData.staff.doctor.lastName}`;
    await staffPage.page.click(`[data-testid="staff-item-${staffName}"]`);
    await staffPage.expectStaffModalVisible();

    // Update the staff member's specialization
    const updatedSpecialization = 'Updated Specialization';
    await staffPage.page.fill('[data-testid="staff-specialization"]', updatedSpecialization);

    // Submit the changes
    await staffPage.submitStaffForm();

    // Verify success
    await staffPage.expectToast('Staff member updated successfully');
    await expect(staffPage.page.locator('[data-testid="staff-list"]')).toContainText(updatedSpecialization);
  });

  test('should search for staff members', async () => {
    // Create a staff member first
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.doctor);
    await staffPage.submitStaffForm();

    // Search for the staff member
    const searchInput = staffPage.page.locator('[data-testid="staff-search"]');
    await searchInput.fill(testData.staff.doctor.firstName);

    // Verify search results
    await staffPage.expectStaffInList(testData.staff.doctor.firstName);

    // Clear search and verify all staff are shown
    await searchInput.clear();
    await staffPage.expectStaffInList(testData.staff.doctor.firstName);
  });

  test('should filter staff by type', async () => {
    // Create different types of staff
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.doctor);
    await staffPage.submitStaffForm();

    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.nurse);
    await staffPage.submitStaffForm();

    // Filter by doctor type
    await staffPage.page.selectOption('[data-testid="staff-type-filter"]', 'doctor');

    // Verify only doctors are shown
    await staffPage.expectStaffInList(testData.staff.doctor.firstName);
    await expect(staffPage.page.locator('[data-testid="staff-list"]')).not.toContainText(testData.staff.nurse.firstName);

    // Filter by nurse type
    await staffPage.page.selectOption('[data-testid="staff-type-filter"]', 'nurse');

    // Verify only nurses are shown
    await staffPage.expectStaffInList(testData.staff.nurse.firstName);
    await expect(staffPage.page.locator('[data-testid="staff-list"]')).not.toContainText(testData.staff.doctor.firstName);
  });

  test('should handle duplicate email addresses', async () => {
    // Create first staff member
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.doctor);
    await staffPage.submitStaffForm();

    // Try to create second staff member with same email
    await staffPage.clickNewStaff();
    const duplicateStaff = { ...testData.staff.nurse, email: testData.staff.doctor.email };
    await staffPage.fillStaffForm(duplicateStaff);
    await staffPage.submitStaffForm();

    // Verify error message
    await staffPage.expectToast('Email address already exists', 'error');
    await staffPage.expectStaffModalVisible();
  });

  test('should handle duplicate Google Calendar IDs', async () => {
    // Create first staff member
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.doctor);
    await staffPage.submitStaffForm();

    // Try to create second staff member with same Google Calendar ID
    await staffPage.clickNewStaff();
    const duplicateStaff = { ...testData.staff.nurse, googleCalendarId: testData.staff.doctor.googleCalendarId };
    await staffPage.fillStaffForm(duplicateStaff);
    await staffPage.submitStaffForm();

    // Verify error message
    await staffPage.expectToast('Google Calendar ID already exists', 'error');
    await staffPage.expectStaffModalVisible();
  });
});
