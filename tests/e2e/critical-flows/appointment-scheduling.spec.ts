import { test, expect } from '@playwright/test';
import { AppointmentPage, PatientPage, StaffPage } from '../utils/page-objects';
import { testData } from '../utils/test-data';

test.describe('Appointment Scheduling Critical Flows', () => {
  let appointmentPage: AppointmentPage;
  let patientPage: PatientPage;
  let staffPage: StaffPage;

  test.beforeEach(async ({ page }) => {
    appointmentPage = new AppointmentPage(page);
    patientPage = new PatientPage(page);
    staffPage = new StaffPage(page);
    
    // Set up test data - create a patient and staff member
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
    
    // Navigate to appointments page
    await appointmentPage.goto('/appointments');
  });

  test('should create a Doctor on Call appointment', async () => {
    // Click new appointment button
    await appointmentPage.clickNewAppointment();
    await appointmentPage.expectAppointmentModalVisible();

    // Fill appointment form
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);

    // Submit the form
    await appointmentPage.submitAppointmentForm();

    // Verify success
    await appointmentPage.expectToast('Appointment created successfully');
    await appointmentPage.expectAppointmentModalHidden();
    await appointmentPage.expectCalendarVisible();
  });

  test('should create a Lab Test appointment', async () => {
    // Click new appointment button
    await appointmentPage.clickNewAppointment();
    await appointmentPage.expectAppointmentModalVisible();

    // Fill appointment form
    await appointmentPage.fillAppointmentForm(testData.appointments.labTest);

    // Submit the form
    await appointmentPage.submitAppointmentForm();

    // Verify success
    await appointmentPage.expectToast('Appointment created successfully');
    await appointmentPage.expectAppointmentModalHidden();
    await appointmentPage.expectCalendarVisible();
  });

  test('should create a Teleconsultation appointment', async () => {
    // Click new appointment button
    await appointmentPage.clickNewAppointment();
    await appointmentPage.expectAppointmentModalVisible();

    // Fill appointment form
    await appointmentPage.fillAppointmentForm(testData.appointments.teleconsultation);

    // Submit the form
    await appointmentPage.submitAppointmentForm();

    // Verify success
    await appointmentPage.expectToast('Appointment created successfully');
    await appointmentPage.expectAppointmentModalHidden();
    await appointmentPage.expectCalendarVisible();
  });

  test('should validate required fields when creating appointment', async () => {
    // Click new appointment button
    await appointmentPage.clickNewAppointment();
    await appointmentPage.expectAppointmentModalVisible();

    // Try to submit empty form
    await appointmentPage.submitAppointmentForm();

    // Verify validation errors
    await expect(appointmentPage.page.locator('[data-testid="appointment-patient-error"]')).toBeVisible();
    await expect(appointmentPage.page.locator('[data-testid="appointment-type-error"]')).toBeVisible();
    await expect(appointmentPage.page.locator('[data-testid="appointment-date-error"]')).toBeVisible();
    await expect(appointmentPage.page.locator('[data-testid="appointment-start-time-error"]')).toBeVisible();

    // Modal should still be visible
    await appointmentPage.expectAppointmentModalVisible();
  });

  test('should validate appointment date is not in the past', async () => {
    // Click new appointment button
    await appointmentPage.clickNewAppointment();
    await appointmentPage.expectAppointmentModalVisible();

    // Fill form with past date
    const pastAppointment = { 
      ...testData.appointments.doctorOnCall, 
      appointmentDate: '2020-01-01' 
    };
    await appointmentPage.fillAppointmentForm(pastAppointment);

    // Submit the form
    await appointmentPage.submitAppointmentForm();

    // Verify validation error
    await expect(appointmentPage.page.locator('[data-testid="appointment-date-error"]')).toBeVisible();
    await appointmentPage.expectAppointmentModalVisible();
  });

  test('should validate appointment time is within working hours', async () => {
    // Click new appointment button
    await appointmentPage.clickNewAppointment();
    await appointmentPage.expectAppointmentModalVisible();

    // Fill form with time outside working hours
    const invalidTimeAppointment = { 
      ...testData.appointments.doctorOnCall, 
      startTime: '23:00' 
    };
    await appointmentPage.fillAppointmentForm(invalidTimeAppointment);

    // Submit the form
    await appointmentPage.submitAppointmentForm();

    // Verify validation error
    await expect(appointmentPage.page.locator('[data-testid="appointment-time-error"]')).toBeVisible();
    await appointmentPage.expectAppointmentModalVisible();
  });

  test('should cancel appointment creation', async () => {
    // Click new appointment button
    await appointmentPage.clickNewAppointment();
    await appointmentPage.expectAppointmentModalVisible();

    // Fill some data
    await appointmentPage.page.selectOption('[data-testid="appointment-type"]', 'Doctor on Call');

    // Cancel the form
    await appointmentPage.cancelAppointmentForm();

    // Verify modal is closed
    await appointmentPage.expectAppointmentModalHidden();
  });

  test('should copy an existing appointment', async () => {
    // First create an appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Right-click on the appointment to open context menu
    await appointmentPage.rightClickOnCalendarEvent('Doctor on Call');

    // Click copy appointment
    await appointmentPage.clickCopyAppointment();
    await appointmentPage.expectCopyAppointmentModalVisible();

    // Update the date for the copied appointment
    const newDate = '2024-12-25';
    await appointmentPage.page.fill('[data-testid="copy-appointment-date"]', newDate);

    // Submit the copy
    await appointmentPage.page.click('[data-testid="copy-appointment-submit"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify success
    await appointmentPage.expectToast('Appointment copied successfully');
    await appointmentPage.expectCopyAppointmentModalHidden();
  });

  test('should drag and drop to reschedule appointment', async () => {
    // First create an appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Wait for the appointment to appear on calendar
    await appointmentPage.page.waitForSelector('[data-testid="calendar-event"]');

    // Drag and drop the appointment to a new date
    const newDate = '2024-12-25';
    await appointmentPage.dragAndDropEvent('Doctor on Call', newDate);

    // Verify success
    await appointmentPage.expectToast('Appointment rescheduled successfully');
  });

  test('should handle appointment conflicts', async () => {
    // Create first appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Try to create conflicting appointment
    await appointmentPage.clickNewAppointment();
    const conflictingAppointment = { 
      ...testData.appointments.labTest,
      appointmentDate: testData.appointments.doctorOnCall.appointmentDate,
      startTime: testData.appointments.doctorOnCall.startTime
    };
    await appointmentPage.fillAppointmentForm(conflictingAppointment);
    await appointmentPage.submitAppointmentForm();

    // Verify conflict warning
    await expect(appointmentPage.page.locator('[data-testid="appointment-conflict-warning"]')).toBeVisible();
    
    // Should still allow creation with override
    await appointmentPage.page.click('[data-testid="override-conflict"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify success
    await appointmentPage.expectToast('Appointment created successfully');
  });

  test('should filter appointments by type', async () => {
    // Create different types of appointments
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.labTest);
    await appointmentPage.submitAppointmentForm();

    // Filter by Doctor on Call type
    await appointmentPage.page.check('[data-testid="filter-doctor-on-call"]');

    // Verify only Doctor on Call appointments are shown
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).toContainText('Doctor on Call');
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).not.toContainText('Lab Test');

    // Clear filter
    await appointmentPage.page.uncheck('[data-testid="filter-doctor-on-call"]');

    // Verify all appointments are shown
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).toContainText('Doctor on Call');
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).toContainText('Lab Test');
  });

  test('should filter appointments by staff member', async () => {
    // Create appointment with specific staff
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Filter by staff member
    await appointmentPage.page.selectOption('[data-testid="staff-filter"]', testData.staff.doctor.firstName);

    // Verify only appointments with that staff member are shown
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).toContainText(testData.staff.doctor.firstName);
  });

  test('should handle appointment deletion', async () => {
    // First create an appointment
    await appointmentPage.clickNewAppointment();
    await appointmentPage.fillAppointmentForm(testData.appointments.doctorOnCall);
    await appointmentPage.submitAppointmentForm();

    // Right-click on the appointment to open context menu
    await appointmentPage.rightClickOnCalendarEvent('Doctor on Call');

    // Click delete appointment
    await appointmentPage.page.click('[data-testid="context-menu-delete"]');

    // Confirm deletion
    await appointmentPage.page.click('[data-testid="confirm-delete"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify success
    await appointmentPage.expectToast('Appointment deleted successfully');
    await expect(appointmentPage.page.locator('[data-testid="calendar-event"]')).not.toContainText('Doctor on Call');
  });
});
