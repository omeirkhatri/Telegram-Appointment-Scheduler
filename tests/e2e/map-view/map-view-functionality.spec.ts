import { expect, test } from '@playwright/test';
import { AppointmentPage, PatientPage, StaffPage } from '../utils/page-objects';
import { testData } from '../utils/test-data';

test.describe('Map View Functionality E2E Tests', () => {
  let appointmentPage: AppointmentPage;
  let patientPage: PatientPage;
  let staffPage: StaffPage;

  test.beforeEach(async ({ page }) => {
    appointmentPage = new AppointmentPage(page);
    patientPage = new PatientPage(page);
    staffPage = new StaffPage(page);

    // Set up test data - create patients with coordinates
    await patientPage.goto('/patients');
    await patientPage.clickNewPatient();
    await patientPage.fillPatientForm({
      ...testData.patients.valid,
      latitude: '25.2048',
      longitude: '55.2708'
    });
    await patientPage.submitPatientForm();

    await patientPage.clickNewPatient();
    await patientPage.fillPatientForm({
      ...testData.patients.valid2,
      latitude: '25.2048',
      longitude: '55.2708'
    });
    await patientPage.submitPatientForm();

    // Create staff members
    await staffPage.goto('/staff');
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.doctor);
    await staffPage.submitStaffForm();

    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.driver);
    await staffPage.submitStaffForm();

    // Navigate to appointments page
    await appointmentPage.goto('/appointments');
  });

  test('should display map view when selected', async ({ page }) => {
    // Switch to map view
    await appointmentPage.switchToMapView();

    // Verify map container is visible
    await expect(page.locator('[data-testid="appointment-map-view"]')).toBeVisible();

    // Verify Google Maps is loaded
    await expect(page.locator('.gm-style')).toBeVisible();

    // Verify map controls are present
    await expect(page.locator('[data-testid="map-zoom-controls"]')).toBeVisible();
    await expect(page.locator('[data-testid="map-date-navigation"]')).toBeVisible();
  });

  test('should create appointment by clicking on map', async ({ page }) => {
    await appointmentPage.switchToMapView();

    // Wait for map to load
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Click on map to create appointment
    await page.locator('[data-testid="appointment-map-view"]').click({
      position: { x: 400, y: 300 }
    });

    // Verify appointment modal opens
    await expect(page.locator('[data-testid="appointment-modal"]')).toBeVisible();

    // Fill appointment form
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Verify success
    await appointmentPage.expectToast('Appointment created successfully');
    await appointmentPage.expectAppointmentModalHidden();
  });

  test('should display appointment markers on map', async ({ page }) => {
    // Create an appointment first
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1
    });
    await appointmentPage.submitAppointmentForm();
    await appointmentPage.expectToast('Appointment created successfully');

    // Switch to map view
    await appointmentPage.switchToMapView();

    // Wait for map and markers to load
    await page.waitForSelector('.gm-style', { timeout: 10000 });
    await page.waitForSelector('[data-testid="map-marker"]', { timeout: 5000 });

    // Verify marker is visible
    await expect(page.locator('[data-testid="map-marker"]')).toBeVisible();

    // Verify marker has correct appointment type color
    const marker = page.locator('[data-testid="map-marker"]').first();
    await expect(marker).toHaveClass(/marker-doctor-on-call/);
  });

  test('should show appointment details when marker is clicked', async ({ page }) => {
    // Create an appointment first
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1
    });
    await appointmentPage.submitAppointmentForm();
    await appointmentPage.expectToast('Appointment created successfully');

    // Switch to map view
    await appointmentPage.switchToMapView();

    // Wait for map and markers to load
    await page.waitForSelector('.gm-style', { timeout: 10000 });
    await page.waitForSelector('[data-testid="map-marker"]', { timeout: 5000 });

    // Click on marker
    await page.locator('[data-testid="map-marker"]').first().click();

    // Verify info window appears
    await expect(page.locator('[data-testid="map-info-window"]')).toBeVisible();

    // Verify appointment details are shown
    await expect(page.locator('[data-testid="appointment-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="appointment-type"]')).toContainText('Doctor on Call');
  });

  test('should filter appointments by date in map view', async ({ page }) => {
    // Create appointments for different dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create today's appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1,
      date: today.toISOString().split('T')[0]
    });
    await appointmentPage.submitAppointmentForm();

    // Create tomorrow's appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.driverOnCall,
      patientId: 2,
      staffId: 2,
      date: tomorrow.toISOString().split('T')[0]
    });
    await appointmentPage.submitAppointmentForm();

    // Switch to map view
    await appointmentPage.switchToMapView();

    // Wait for map to load
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Verify both markers are visible initially
    await expect(page.locator('[data-testid="map-marker"]')).toHaveCount(2);

    // Navigate to tomorrow
    await page.locator('[data-testid="next-day-button"]').click();

    // Wait for markers to update
    await page.waitForTimeout(1000);

    // Verify only tomorrow's appointment marker is visible
    await expect(page.locator('[data-testid="map-marker"]')).toHaveCount(1);
  });

  test('should filter appointments by type in map view', async ({ page }) => {
    // Create different types of appointments
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1
    });
    await appointmentPage.submitAppointmentForm();

    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.driverOnCall,
      patientId: 2,
      staffId: 2
    });
    await appointmentPage.submitAppointmentForm();

    // Switch to map view
    await appointmentPage.switchToMapView();

    // Wait for map to load
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Verify both markers are visible initially
    await expect(page.locator('[data-testid="map-marker"]')).toHaveCount(2);

    // Apply filter for Doctor on Call only
    await page.locator('[data-testid="appointment-type-filter"]').click();
    await page.locator('[data-testid="filter-doctor-on-call"]').click();

    // Wait for markers to update
    await page.waitForTimeout(1000);

    // Verify only Doctor on Call marker is visible
    await expect(page.locator('[data-testid="map-marker"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="map-marker"]').first()).toHaveClass(/marker-doctor-on-call/);
  });

  test('should handle marker clustering when appointments are close together', async ({ page }) => {
    // Create multiple appointments at the same location
    for (let i = 0; i < 5; i++) {
      await appointmentPage.clickNewAppointment();
      await appointmentPage.fillAppointmentForm({
        ...testData.appointments.doctorOnCall,
        patientId: 1,
        staffId: 1,
        time: `${10 + i}:00`
      });
      await appointmentPage.submitAppointmentForm();
    }

    // Switch to map view
    await appointmentPage.switchToMapView();

    // Wait for map to load
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Verify cluster marker is visible
    await expect(page.locator('[data-testid="map-cluster"]')).toBeVisible();

    // Click on cluster to expand
    await page.locator('[data-testid="map-cluster"]').click();

    // Verify individual markers are now visible
    await expect(page.locator('[data-testid="map-marker"]')).toHaveCount(5);
  });

  test('should handle map navigation controls', async ({ page }) => {
    await appointmentPage.switchToMapView();

    // Wait for map to load
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Test zoom controls
    await page.locator('[data-testid="zoom-in-button"]').click();
    await page.locator('[data-testid="zoom-out-button"]').click();

    // Test date navigation
    await page.locator('[data-testid="previous-day-button"]').click();
    await page.locator('[data-testid="next-day-button"]').click();
    await page.locator('[data-testid="today-button"]').click();

    // Test view controls
    await page.locator('[data-testid="satellite-view-button"]').click();
    await page.locator('[data-testid="street-view-button"]').click();
  });

  test('should handle mobile touch interactions', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await appointmentPage.switchToMapView();

    // Wait for map to load
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Test touch interactions
    await page.locator('[data-testid="appointment-map-view"]').tap();

    // Test swipe gestures for date navigation
    await page.locator('[data-testid="map-date-navigation"]').swipe('left');
    await page.locator('[data-testid="map-date-navigation"]').swipe('right');

    // Verify mobile-specific controls are visible
    await expect(page.locator('[data-testid="mobile-map-controls"]')).toBeVisible();
  });

  test('should handle map errors gracefully', async ({ page }) => {
    // Mock Google Maps API failure
    await page.route('**/maps.googleapis.com/**', route => {
      route.abort('failed');
    });

    await appointmentPage.switchToMapView();

    // Verify error message is displayed
    await expect(page.locator('[data-testid="map-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="map-error-message"]')).toContainText('Failed to load map');

    // Verify retry button is available
    await expect(page.locator('[data-testid="map-retry-button"]')).toBeVisible();

    // Test retry functionality
    await page.locator('[data-testid="map-retry-button"]').click();
  });

  test('should maintain map state when switching between views', async ({ page }) => {
    // Create an appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1
    });
    await appointmentPage.submitAppointmentForm();

    // Switch to map view
    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });

    // Navigate to a specific date
    await page.locator('[data-testid="next-day-button"]').click();

    // Switch to calendar view
    await appointmentPage.switchToCalendarView();

    // Switch back to map view
    await appointmentPage.switchToMapView();

    // Verify map state is maintained (same date)
    await expect(page.locator('[data-testid="current-date-display"]')).toContainText(
      new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()
    );
  });

  test('should handle appointment CRUD operations in map view', async ({ page }) => {
    // Create appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm({
      ...testData.appointments.doctorOnCall,
      patientId: 1,
      staffId: 1
    });
    await appointmentPage.submitAppointmentForm();
    await appointmentPage.expectToast('Appointment created successfully');

    // Switch to map view
    await appointmentPage.switchToMapView();
    await page.waitForSelector('.gm-style', { timeout: 10000 });
    await page.waitForSelector('[data-testid="map-marker"]', { timeout: 5000 });

    // Test update - right click on marker
    await page.locator('[data-testid="map-marker"]').first().click({ button: 'right' });
    await expect(page.locator('[data-testid="appointment-context-menu"]')).toBeVisible();
    await page.locator('[data-testid="edit-appointment"]').click();

    // Verify edit modal opens
    await expect(page.locator('[data-testid="appointment-modal"]')).toBeVisible();

    // Test delete - right click on marker
    await page.locator('[data-testid="map-marker"]').first().click({ button: 'right' });
    await page.locator('[data-testid="delete-appointment"]').click();
    await page.locator('[data-testid="confirm-delete"]').click();

    // Verify appointment is deleted
    await appointmentPage.expectToast('Appointment deleted successfully');
    await expect(page.locator('[data-testid="map-marker"]')).toHaveCount(0);
  });
});
