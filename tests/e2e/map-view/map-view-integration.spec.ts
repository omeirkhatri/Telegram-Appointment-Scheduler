import { expect, test } from '@playwright/test';
import { AppointmentPage, PatientPage, StaffPage } from '../utils/page-objects';
import { testData } from '../utils/test-data';

test.describe('Map View Integration E2E Tests', () => {
  let appointmentPage: AppointmentPage;
  let patientPage: PatientPage;
  let staffPage: StaffPage;

  test.beforeEach(async ({ page }) => {
    appointmentPage = new AppointmentPage(page);
    patientPage = new PatientPage(page);
    staffPage = new StaffPage(page);

    // Set up comprehensive test data
    await patientPage.goto('/patients');

    // Create patients with different coordinates for testing
    const patients = [
      { ...testData.patients.valid, latitude: '25.2048', longitude: '55.2708' }, // Dubai
      { ...testData.patients.valid2, latitude: '25.2048', longitude: '55.2708' }, // Same location
      { ...testData.patients.valid3, latitude: '25.2048', longitude: '55.2808' }, // Nearby
    ];

    for (const patient of patients) {
      await patientPage.clickNewPatient();
      await patientPage.fillPatientForm(patient);
      await patientPage.submitPatientForm();
    }

    // Create staff members
    await staffPage.goto('/staff');
    const staffMembers = [testData.staff.doctor, testData.staff.driver, testData.staff.nurse];

    for (const staff of staffMembers) {
      await staffPage.clickNewStaff();
      await staffPage.fillStaffForm(staff);
      await staffPage.submitStaffForm();
    }

    // Navigate to appointments page
    await appointmentPage.goto('/appointments');
  });

  test('should integrate with appointment calendar view switcher', async ({ page }) => {
    // Verify view switcher is present
    await expect(page.locator('[data-testid="view-switcher"]')).toBeVisible();

    // Verify all view options are available
    await expect(page.locator('[data-testid="calendar-view-option"]')).toBeVisible();
    await expect(page.locator('[data-testid="table-view-option"]')).toBeVisible();
    await expect(page.locator('[data-testid="map-view-option"]')).toBeVisible();

    // Test switching between views
    await appointmentPage.switchToMapView();
    await expect(page.locator('[data-testid="appointment-map-view"]')).toBeVisible();

    await appointmentPage.switchToCalendarView();
    await expect(page.locator('[data-testid="appointment-calendar"]')).toBeVisible();

    await appointmentPage.switchToTableView();
    await expect(page.locator('[data-testid="appointment-table"]')).toBeVisible();
  });

  test('should maintain filter state across view switches', async ({ page }) => {
    // Create appointments with different types
    const appointments = [
      { ...testData.appointments.doctorOnCall, patientId: 1, staffId: 1 },
      { ...testData.appointments.driverOnCall, patientId: 2, staffId: 2 },
      { ...testData.appointments.nurseOnCall, patientId: 3, staffId: 3 },
    ];

    for (const appointment of appointments) {
      await appointmentPage.clickNewAppointment();
      await appointmentPage.fillAppointmentForm(appointment);
      await appointmentPage.submitAppointmentForm();
    }

    // Apply filter in calendar view
    await appointmentPage.switchToCalendarView();
    await page.locator('[data-testid="appointment-type-filter"]').click();
    await page.locator('[data-testid="filter-doctor-on-call"]').click();

    // Switch to map view
    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Verify filter is maintained
    await expect(page.locator('[data-testid="map-marker"]')).toHaveCount(1);

    // Switch back to calendar view
    await appointmentPage.switchToCalendarView();

    // Verify filter is still applied
    await expect(page.locator('[data-testid="appointment-card"]')).toHaveCount(1);
  });

  test('should handle real-time updates in map view', async ({ page }) => {
    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Create appointment in another tab/window (simulate real-time update)
    const newPage = await page.context().newPage();
    const newAppointmentPage = new AppointmentPage(newPage);
    await newAppointmentPage.goto('/appointments');
    await newAppointmentPage.clickNewAppointment();
    await newAppointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1
    });
    await newAppointmentPage.submitAppointmentForm();
    await newPage.close();

    // Verify map updates with new appointment
    await page.waitForSelector('[data-testid="map-marker"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="map-marker"]')).toHaveCount(1);
  });

  test('should handle map bounds changes and marker visibility', async ({ page }) => {
    // Create appointments at different locations
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1
    });
    await appointmentPage.submitAppointmentForm();

    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Test zooming out to see all markers
    await page.locator('[data-testid="zoom-out-button"]').click();
    await page.locator('[data-testid="zoom-out-button"]').click();

    // Test zooming in
    await page.locator('[data-testid="zoom-in-button"]').click();

    // Test panning
    await page.locator('[data-testid="appointment-map-view"]').dragTo(
      page.locator('[data-testid="appointment-map-view"]'),
      { targetPosition: { x: 100, y: 100 } }
    );
  });

  test('should handle appointment search in map view', async ({ page }) => {
    // Create appointments with different patient names
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1
    });
    await appointmentPage.submitAppointmentForm();

    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Test search functionality
    await page.locator('[data-testid="appointment-search"]').fill('John');

    // Verify search results are filtered on map
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="map-marker"]')).toHaveCount(1);

    // Clear search
    await page.locator('[data-testid="appointment-search"]').fill('');
    await page.waitForTimeout(1000);
  });

  test('should handle appointment status changes in map view', async ({ page }) => {
    // Create appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1
    });
    await appointmentPage.submitAppointmentForm();

    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });
    await page.waitForSelector('[data-testid="map-marker"]', { timeout: 5000 });

    // Click on marker to open details
    await page.locator('[data-testid="map-marker"]').first().click();
    await expect(page.locator('[data-testid="map-info-window"]')).toBeVisible();

    // Change appointment status
    await page.locator('[data-testid="status-dropdown"]').click();
    await page.locator('[data-testid="status-completed"]').click();

    // Verify marker appearance changes
    await expect(page.locator('[data-testid="map-marker"]').first()).toHaveClass(/marker-completed/);
  });

  test('should handle map view with no appointments', async ({ page }) => {
    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Verify empty state message
    await expect(page.locator('[data-testid="map-empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="map-empty-message"]')).toContainText('No appointments found');

    // Verify create appointment button is available
    await expect(page.locator('[data-testid="create-appointment-button"]')).toBeVisible();
  });

  test('should handle map view with invalid coordinates', async ({ page }) => {
    // Create patient with invalid coordinates
    await patientPage.goto('/patients');
    await patientPage.clickNewPatient();
    await patientPage.fillPatientForm({
      ...testData.patients.valid,
      latitude: 'invalid',
      longitude: 'invalid'
    });
    await patientPage.submitPatientForm();

    // Create appointment for this patient
    await appointmentPage.goto('/appointments');
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 4,
      staffId: 1
    });
    await appointmentPage.submitAppointmentForm();

    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Verify error handling for invalid coordinates
    await expect(page.locator('[data-testid="map-coordinate-error"]')).toBeVisible();
  });

  test('should handle map view performance with many appointments', async ({ page }) => {
    // Create many appointments
    for (let i = 0; i < 20; i++) {
      await appointmentPage.clickNewAppointment();
      await appointmentPage.fillAppointmentForm({
        ...testData.appointments.doctorOnCall,
        patientId: 1,
        staffId: 1,
        time: `${9 + (i % 12)}:00`
      });
      await appointmentPage.submitAppointmentForm();
    }

    await appointmentPage.switchToMapView();

    // Measure performance
    const startTime = Date.now();
    await page.waitForSelector('.gm-style', { timeout: 15000 });
    await page.waitForSelector('[data-testid="map-marker"], [data-testid="map-cluster"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // Verify performance is acceptable (less than 5 seconds)
    expect(loadTime).toBeLessThan(5000);

    // Verify clustering is working
    await expect(page.locator('[data-testid="map-cluster"]')).toBeVisible();
  });

  test('should handle map view accessibility features', async ({ page }) => {
    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Test ARIA labels
    await expect(page.locator('[data-testid="appointment-map-view"]')).toHaveAttribute('aria-label');
    await expect(page.locator('[data-testid="map-zoom-controls"]')).toHaveAttribute('aria-label');

    // Test screen reader compatibility
    await expect(page.locator('[data-testid="map-marker"]')).toHaveAttribute('role', 'button');
    await expect(page.locator('[data-testid="map-marker"]')).toHaveAttribute('aria-label');
  });

  test('should handle map view with different appointment types and colors', async ({ page }) => {
    // Create appointments of different types
    const appointmentTypes = [
      { ...testData.appointments.doctorOnCall, patientId: 1, staffId: 1 },
      { ...testData.appointments.driverOnCall, patientId: 2, staffId: 2 },
      { ...testData.appointments.nurseOnCall, patientId: 3, staffId: 3 },
    ];

    for (const appointment of appointmentTypes) {
      await appointmentPage.clickNewAppointment();
      await appointmentPage.fillAppointmentForm(appointment);
      await appointmentPage.submitAppointmentForm();
    }

    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });
    await page.waitForSelector('[data-testid="map-marker"]', { timeout: 5000 });

    // Verify different marker colors
    const markers = page.locator('[data-testid="map-marker"]');
    await expect(markers.nth(0)).toHaveClass(/marker-doctor-on-call/);
    await expect(markers.nth(1)).toHaveClass(/marker-driver-on-call/);
    await expect(markers.nth(2)).toHaveClass(/marker-nurse-on-call/);
  });
});
