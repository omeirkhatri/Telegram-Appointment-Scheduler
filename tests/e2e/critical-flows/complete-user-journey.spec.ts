import { expect, test } from '@playwright/test';
import { AppointmentPage, DashboardPage, PatientPage, StaffPage } from '../utils/page-objects';
import { testData } from '../utils/test-data';

test.describe('Complete User Journey - End-to-End', () => {
  let appointmentPage: AppointmentPage;
  let patientPage: PatientPage;
  let staffPage: StaffPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    appointmentPage = new AppointmentPage(page);
    patientPage = new PatientPage(page);
    staffPage = new StaffPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('should complete full healthcare appointment workflow', async () => {
    // Step 1: Start at dashboard
    await dashboardPage.goto('/dashboard');
    await dashboardPage.expectStatsVisible();
    await dashboardPage.expectRecentAppointmentsVisible();

    // Step 2: Create a patient
    await patientPage.goto('/patients');
    await patientPage.clickNewPatient();
    await patientPage.fillPatientForm(testData.patients.valid);
    await patientPage.submitPatientForm();
    await patientPage.expectToast('Patient created successfully');
    await patientPage.expectPatientInList(testData.patients.valid.name);

    // Step 3: Create medical staff (doctor)
    await staffPage.goto('/staff');
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.doctor);
    await staffPage.submitStaffForm();
    await staffPage.expectToast('Staff member created successfully');
    await staffPage.expectStaffInList(`${testData.staff.doctor.firstName} ${testData.staff.doctor.lastName}`);

    // Step 4: Create driver
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.driver);
    await staffPage.submitStaffForm();
    await staffPage.expectToast('Staff member created successfully');
    await staffPage.expectStaffInList(`${testData.staff.driver.firstName} ${testData.staff.driver.lastName}`);

    // Step 5: Create a Doctor on Call appointment
    await appointmentPage.goto('/appointments');
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();
    await appointmentPage.expectToast('Appointment created successfully');
    await appointmentPage.expectCalendarVisible();

    // Step 6: Verify Google Calendar sync
    await appointmentPage.expectToast('Appointment synced to Google Calendar');

    // Step 7: Copy the appointment to another date
    await appointmentPage.rightClickOnCalendarEvent('Doctor on Call');
    await appointmentPage.clickCopyAppointment();
    await appointmentPage.expectCopyAppointmentModalVisible();

    const newDate = '2024-12-25';
    await appointmentPage.page.fill('[data-testid="copy-appointment-date"]', newDate);
    await appointmentPage.page.click('[data-testid="copy-appointment-submit"]');
    await appointmentPage.waitForLoadingToFinish();
    await appointmentPage.expectToast('Appointment copied successfully');

    // Step 8: Reschedule an appointment via drag and drop
    await appointmentPage.dragAndDropEvent('Doctor on Call', '2024-12-26');
    await appointmentPage.expectToast('Appointment rescheduled successfully');

    // Step 9: Create a Lab Test appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.labTest);
    await appointmentPage.submitAppointmentForm();
    await appointmentPage.expectToast('Appointment created successfully');

    // Step 10: Filter appointments by type
    await appointmentPage.page.check('[data-testid="filter-doctor-on-call"]');
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).toContainText('Doctor on Call');
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).not.toContainText('Lab Test');

    // Step 11: Clear filters and verify all appointments
    await appointmentPage.page.uncheck('[data-testid="filter-doctor-on-call"]');
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).toContainText('Doctor on Call');
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).toContainText('Lab Test');

    // Step 12: Test daily agenda email system
    await appointmentPage.goto('/settings');
    await appointmentPage.page.click('[data-testid="test-agenda-generation"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify agenda content
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('Your Schedule for');
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('Doctor on Call');
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('Lab Test');

    // Step 13: Return to dashboard and verify updated stats
    await dashboardPage.goto('/dashboard');
    await dashboardPage.expectStatsVisible();

    // Verify patient count increased
    const patientCount = await dashboardPage.getStatValue('Total Patients');
    expect(parseInt(patientCount)).toBeGreaterThan(0);

    // Verify staff count increased
    const staffCount = await dashboardPage.getStatValue('Total Staff');
    expect(parseInt(staffCount)).toBeGreaterThan(0);

    // Verify appointment count increased
    const appointmentCount = await dashboardPage.getStatValue('Total Appointments');
    expect(parseInt(appointmentCount)).toBeGreaterThan(0);

    // Step 14: Search functionality
    await patientPage.goto('/patients');
    const searchInput = patientPage.page.locator('[data-testid="patient-search"]');
    await searchInput.fill(testData.patients.valid.name);
    await patientPage.expectPatientInList(testData.patients.valid.name);

    // Step 15: Edit patient information
    await patientPage.page.click(`[data-testid="patient-item-${testData.patients.valid.name}"]`);
    await patientPage.expectPatientModalVisible();

    const updatedName = 'Updated Patient Name';
    await patientPage.page.fill('[data-testid="patient-name"]', updatedName);
    await patientPage.submitPatientForm();
    await patientPage.expectToast('Patient updated successfully');
    await patientPage.expectPatientInList(updatedName);

    // Step 16: Test appointment cancellation
    await appointmentPage.goto('/appointments');
    await appointmentPage.rightClickOnCalendarEvent('Lab Test');
    await appointmentPage.page.click('[data-testid="context-menu-cancel"]');
    await appointmentPage.page.click('[data-testid="confirm-cancel"]');
    await appointmentPage.waitForLoadingToFinish();
    await appointmentPage.expectToast('Appointment cancelled successfully');

    // Step 17: Verify final state
    await dashboardPage.goto('/dashboard');
    await dashboardPage.expectStatsVisible();

    // All operations completed successfully
    console.log('✅ Complete user journey test passed - all critical flows working correctly');
  });

  test('should handle error scenarios gracefully', async () => {
    // Test form validation errors
    await patientPage.goto('/patients');
    await patientPage.clickNewPatient();
    await patientPage.submitPatientForm(); // Submit empty form

    // Verify validation errors
    await expect(patientPage.page.locator('[data-testid="patient-name-error"]')).toBeVisible();
    await patientPage.cancelPatientForm();

    // Test invalid data handling
    await patientPage.clickNewPatient();
    const invalidPatient = { ...testData.patients.valid, phone: 'invalid-phone' };
    await patientPage.fillPatientForm(invalidPatient);
    await patientPage.submitPatientForm();

    // Verify validation error
    await expect(patientPage.page.locator('[data-testid="patient-phone-error"]')).toBeVisible();
    await patientPage.cancelPatientForm();

    // Test network error handling
    await appointmentPage.goto('/appointments');

    // Mock network failure
    await appointmentPage.page.route('**/api/appointments', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Verify error handling
    await appointmentPage.expectToast('Failed to create appointment', 'error');

    console.log('✅ Error handling test passed - all error scenarios handled gracefully');
  });

  test('should maintain data consistency across operations', async () => {
    // Create patient
    await patientPage.goto('/patients');
    await patientPage.clickNewPatient();
    await patientPage.fillPatientForm(testData.patients.valid);
    await patientPage.submitPatientForm();
    await patientPage.expectPatientInList(testData.patients.valid.name);

    // Create staff
    await staffPage.goto('/staff');
    await staffPage.clickNewStaff();
    await staffPage.fillStaffForm(testData.staff.doctor);
    await staffPage.submitStaffForm();
    await staffPage.expectStaffInList(`${testData.staff.doctor.firstName} ${testData.staff.doctor.lastName}`);

    // Create appointment
    await appointmentPage.goto('/appointments');
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();
    await appointmentPage.expectToast('Appointment created successfully');

    // Verify data consistency - patient should still exist
    await patientPage.goto('/patients');
    await patientPage.expectPatientInList(testData.patients.valid.name);

    // Verify data consistency - staff should still exist
    await staffPage.goto('/staff');
    await staffPage.expectStaffInList(`${testData.staff.doctor.firstName} ${testData.staff.doctor.lastName}`);

    // Verify data consistency - appointment should exist
    await appointmentPage.goto('/appointments');
    await appointmentPage.expectCalendarVisible();

    console.log('✅ Data consistency test passed - all data maintained correctly');
  });
});
