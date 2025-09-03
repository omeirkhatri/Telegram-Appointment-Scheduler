import { expect, test } from '@playwright/test';
import { AppointmentPage, PatientPage, StaffPage } from '../utils/page-objects';
import { testData } from '../utils/test-data';

test.describe('Calendar Integration Critical Flows', () => {
  let appointmentPage: AppointmentPage;
  let patientPage: PatientPage;
  let staffPage: StaffPage;

  test.beforeEach(async ({ page }) => {
    appointmentPage = new AppointmentPage(page);
    patientPage = new PatientPage(page);
    staffPage = new StaffPage(page);

    // Set up test data
    await patientPage.goto('/patients');
    await patientPage.clickNewPatient();
    await patientPage.fillPatientForm(testData.patients.valid);
    await patientPage.submitPatientForm();

    await staffPage.goto('/staff');
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.doctor);
    await staffPage.submitStaffForm();

    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.driver);
    await staffPage.submitStaffForm();

    await appointmentPage.goto('/appointments');
  });

  test('should sync appointment to Google Calendar for medical staff', async () => {
    // Create appointment with medical staff
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Verify Google Calendar sync success
    await appointmentPage.expectToast('Appointment synced to Google Calendar');

    // Check that Google Calendar event ID is stored
    await expect(appointmentPage.page.locator('[data-testid="google-calendar-sync-status"]')).toContainText('Synced');
  });

  test('should sync appointment to Google Calendar for driver', async () => {
    // Create appointment with driver
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Verify Google Calendar sync success for driver
    await appointmentPage.expectToast('Appointment synced to Google Calendar');

    // Check that driver event has minimal description (address, phone, maps link)
    await expect(appointmentPage.page.locator('[data-testid="driver-calendar-event"]')).toContainText('PICKUP DETAILS');
    await expect(appointmentPage.page.locator('[data-testid="driver-calendar-event"]')).toContainText('Google Maps');
  });

  test('should sync appointment to Google Calendar for medical staff with full details', async () => {
    // Create appointment with medical staff
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.labTest);
    await appointmentPage.submitAppointmentForm();

    // Verify Google Calendar sync success
    await appointmentPage.expectToast('Appointment synced to Google Calendar');

    // Check that medical staff event has full details
    await expect(appointmentPage.page.locator('[data-testid="medical-calendar-event"]')).toContainText('APPOINTMENT DETAILS');
    await expect(appointmentPage.page.locator('[data-testid="medical-calendar-event"]')).toContainText('LAB INFORMATION');
    await expect(appointmentPage.page.locator('[data-testid="medical-calendar-event"]')).toContainText('TRANSPORTATION');
    await expect(appointmentPage.page.locator('[data-testid="medical-calendar-event"]')).toContainText('NOTES');
  });

  test('should handle Google Calendar sync failure gracefully', async () => {
    // Mock Google Calendar API failure
    await appointmentPage.page.route('**/api/google-calendar/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Google Calendar API unavailable' })
      });
    });

    // Create appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Verify appointment is still created despite sync failure
    await appointmentPage.expectToast('Appointment created successfully');
    await appointmentPage.expectToast('Google Calendar sync failed - will retry', 'error');

    // Check that appointment exists in local database
    await appointmentPage.expectCalendarVisible();
  });

  test('should retry Google Calendar sync on failure', async () => {
    // Create appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Mock initial sync failure
    await appointmentPage.page.route('**/api/google-calendar/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Temporary failure' })
      });
    });

    // Trigger retry
    await appointmentPage.page.click('[data-testid="retry-google-sync"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify retry success
    await appointmentPage.expectToast('Google Calendar sync retried successfully');
  });

  test('should update Google Calendar event when appointment is modified', async () => {
    // Create appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Wait for initial sync
    await appointmentPage.expectToast('Appointment synced to Google Calendar');

    // Edit the appointment
    await appointmentPage.rightClickOnCalendarEvent('Doctor on Call');
    await appointmentPage.page.click('[data-testid="context-menu-edit"]');
    await appointmentPage.expectAppointmentModalVisible();

    // Update appointment time
    await appointmentPage.page.fill('[data-testid="appointment-start-time"]', '11:00');
    await appointmentPage.submitAppointmentForm();

    // Verify Google Calendar update
    await appointmentPage.expectToast('Appointment updated in Google Calendar');
  });

  test('should delete Google Calendar event when appointment is cancelled', async () => {
    // Create appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Wait for initial sync
    await appointmentPage.expectToast('Appointment synced to Google Calendar');

    // Cancel the appointment
    await appointmentPage.rightClickOnCalendarEvent('Doctor on Call');
    await appointmentPage.page.click('[data-testid="context-menu-cancel"]');
    await appointmentPage.page.click('[data-testid="confirm-cancel"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify Google Calendar deletion
    await appointmentPage.expectToast('Appointment cancelled and removed from Google Calendar');
  });

  test('should handle webhook updates from Google Calendar', async () => {
    // Create appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Wait for initial sync
    await appointmentPage.expectToast('Appointment synced to Google Calendar');

    // Simulate webhook update from Google Calendar
    await appointmentPage.page.route('**/api/webhooks/calendar', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Webhook processed successfully'
        })
      });
    });

    // Trigger webhook simulation
    await appointmentPage.page.click('[data-testid="simulate-webhook"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify webhook processing
    await appointmentPage.expectToast('Google Calendar webhook processed successfully');
  });

  test('should handle timezone conversion correctly', async () => {
    // Create appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Verify timezone conversion in Google Calendar event
    await appointmentPage.expectToast('Appointment synced to Google Calendar');

    // Check that time is correctly converted to UTC for Google Calendar
    await expect(appointmentPage.page.locator('[data-testid="google-calendar-time"]')).toContainText('06:00'); // 10:00 Dubai time = 06:00 UTC
  });

  test('should handle multiple staff members in one appointment', async () => {
    // Create appointment with multiple staff
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);

    // Add additional staff member
    await appointmentPage.page.click('[data-testid="add-staff-member"]');
    await appointmentPage.page.selectOption('[data-testid="additional-staff-select"]', testData.staff.nurse.firstName);

    await appointmentPage.submitAppointmentForm();

    // Verify Google Calendar sync for all staff members
    await appointmentPage.expectToast('Appointment synced to Google Calendar');

    // Check that separate events are created for each staff member
    await expect(appointmentPage.page.locator('[data-testid="google-calendar-events-count"]')).toContainText('2');
  });

  test('should validate Google Calendar credentials', async () => {
    // Navigate to settings to check Google Calendar integration
    await appointmentPage.goto('/settings');

    // Check Google Calendar connection status
    await expect(appointmentPage.page.locator('[data-testid="google-calendar-status"]')).toBeVisible();

    // Test connection
    await appointmentPage.page.click('[data-testid="test-google-calendar-connection"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify connection test result
    await appointmentPage.expectToast('Google Calendar connection successful');
  });

  test('should handle Google Calendar API rate limiting', async () => {
    // Mock rate limit response
    await appointmentPage.page.route('**/api/google-calendar/**', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: 60
        })
      });
    });

    // Create appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Verify rate limit handling
    await appointmentPage.expectToast('Appointment created successfully');
    await appointmentPage.expectToast('Google Calendar sync delayed due to rate limiting', 'error');

    // Check that sync is queued for retry
    await expect(appointmentPage.page.locator('[data-testid="sync-queue-status"]')).toContainText('Queued for retry');
  });
});
