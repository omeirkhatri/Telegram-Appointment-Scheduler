import { expect, test } from '@playwright/test';
import { AppointmentPage, PatientPage, StaffPage } from '../utils/page-objects';
import { testData } from '../utils/test-data';

test.describe('Daily Agenda Email System Critical Flows', () => {
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
    await staffPage.fillStaffForm(testData.staff.nurse);
    await staffPage.submitStaffForm();

    await appointmentPage.goto('/appointments');
  });

  test('should send daily agenda email to staff with appointments', async () => {
    // Create appointments for today
    const today = new Date().toISOString().split('T')[0];

    await appointmentPage.clickNewAppointment();
    const todayAppointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today
    };
    await appointmentPage.fillAppointmentForm(todayAppointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Trigger daily agenda job
    await appointmentPage.page.click('[data-testid="send-daily-agenda"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify email sending
    await appointmentPage.expectToast('Daily agenda emails sent successfully');

    // Check email delivery logs
    await expect(appointmentPage.page.locator('[data-testid="email-delivery-log"]')).toContainText(testData.staff.doctor.email);
    await expect(appointmentPage.page.locator('[data-testid="email-delivery-log"]')).toContainText('Sent');
  });

  test('should generate correct agenda content for staff', async () => {
    // Create appointments for today
    const today = new Date().toISOString().split('T')[0];

    await appointmentPage.clickNewAppointment();
    const todayAppointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today
    };
    await appointmentPage.fillAppointmentForm(todayAppointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email test section
    await appointmentPage.goto('/settings');

    // Test agenda generation
    await appointmentPage.page.click('[data-testid="test-agenda-generation"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify agenda content
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('Your Schedule for');
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('Doctor on Call');
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText(testData.patients.valid.name);
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('Total: 1 appointment');
  });

  test('should handle staff with no appointments', async () => {
    // Create appointment for one staff member only
    const today = new Date().toISOString().split('T')[0];

    await appointmentPage.clickNewAppointment();
    const todayAppointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today
    };
    await appointmentPage.fillAppointmentForm(todayAppointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Trigger daily agenda job
    await appointmentPage.page.click('[data-testid="send-daily-agenda"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify only staff with appointments receive emails
    await expect(appointmentPage.page.locator('[data-testid="email-delivery-log"]')).toContainText(testData.staff.doctor.email);
    await expect(appointmentPage.page.locator('[data-testid="email-delivery-log"]')).not.toContainText(testData.staff.nurse.email);
  });

  test('should respect staff email notification preferences', async () => {
    // Update staff member to disable email notifications
    await staffPage.goto('/staff');
    await staffPage.page.click(`[data-testid="staff-item-${testData.staff.doctor.firstName} ${testData.staff.doctor.lastName}"]`);
    await staffPage.expectStaffModalVisible();

    await staffPage.page.uncheck('[data-testid="staff-email-notifications"]');
    await staffPage.submitStaffForm();

    // Create appointment for today
    const today = new Date().toISOString().split('T')[0];

    await appointmentPage.goto('/appointments');
    await appointmentPage.clickNewAppointment();
    const todayAppointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today
    };
    await appointmentPage.fillAppointmentForm(todayAppointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Trigger daily agenda job
    await appointmentPage.page.click('[data-testid="send-daily-agenda"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify staff with disabled notifications doesn't receive email
    await expect(appointmentPage.page.locator('[data-testid="email-delivery-log"]')).not.toContainText(testData.staff.doctor.email);
  });

  test('should handle email delivery failures gracefully', async () => {
    // Mock email service failure
    await appointmentPage.page.route('**/api/email/delivery/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'SMTP server unavailable' })
      });
    });

    // Create appointment for today
    const today = new Date().toISOString().split('T')[0];

    await appointmentPage.clickNewAppointment();
    const todayAppointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today
    };
    await appointmentPage.fillAppointmentForm(todayAppointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Trigger daily agenda job
    await appointmentPage.page.click('[data-testid="send-daily-agenda"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify error handling
    await appointmentPage.expectToast('Some emails failed to send', 'error');

    // Check that failed emails are logged for retry
    await expect(appointmentPage.page.locator('[data-testid="email-delivery-log"]')).toContainText('Failed');
    await expect(appointmentPage.page.locator('[data-testid="retry-failed-emails"]')).toBeVisible();
  });

  test('should retry failed email deliveries', async () => {
    // Create appointment for today
    const today = new Date().toISOString().split('T')[0];

    await appointmentPage.clickNewAppointment();
    const todayAppointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today
    };
    await appointmentPage.fillAppointmentForm(todayAppointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Trigger daily agenda job (will fail initially)
    await appointmentPage.page.route('**/api/email/delivery/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Temporary failure' })
      });
    });

    await appointmentPage.page.click('[data-testid="send-daily-agenda"]');
    await appointmentPage.waitForLoadingToFinish();

    // Retry failed emails
    await appointmentPage.page.route('**/api/email/delivery/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await appointmentPage.page.click('[data-testid="retry-failed-emails"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify retry success
    await appointmentPage.expectToast('Failed emails retried successfully');
    await expect(appointmentPage.page.locator('[data-testid="email-delivery-log"]')).toContainText('Sent');
  });

  test('should send agenda at correct time (06:00 Dubai time)', async () => {
    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Check scheduled job time
    await expect(appointmentPage.page.locator('[data-testid="agenda-schedule-time"]')).toContainText('06:00');
    await expect(appointmentPage.page.locator('[data-testid="agenda-schedule-timezone"]')).toContainText('Asia/Dubai');

    // Check next scheduled run
    await expect(appointmentPage.page.locator('[data-testid="next-agenda-run"]')).toBeVisible();
  });

  test('should handle multiple appointments per staff member', async () => {
    // Create multiple appointments for the same staff member
    const today = new Date().toISOString().split('T')[0];

    // First appointment
    await appointmentPage.clickNewAppointment();
    const firstAppointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today,
      startTime: '10:00'
    };
    await appointmentPage.fillAppointmentForm(firstAppointment);
    await appointmentPage.submitAppointmentForm();

    // Second appointment
    await appointmentPage.clickNewAppointment();
    const secondAppointment = {
      ...testData.appointments.labTest,
      appointmentDate: today,
      startTime: '14:00'
    };
    await appointmentPage.fillAppointmentForm(secondAppointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Test agenda generation
    await appointmentPage.page.click('[data-testid="test-agenda-generation"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify agenda shows both appointments
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('10:00–11:00');
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('14:00–14:30');
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('Total: 2 appointments');
  });

  test('should format appointment times correctly in agenda', async () => {
    // Create appointment with specific time
    const today = new Date().toISOString().split('T')[0];

    await appointmentPage.clickNewAppointment();
    const appointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today,
      startTime: '09:30',
      durationMinutes: 45
    };
    await appointmentPage.fillAppointmentForm(appointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Test agenda generation
    await appointmentPage.page.click('[data-testid="test-agenda-generation"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify time format (09:30–10:15)
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText('09:30–10:15');
  });

  test('should include patient and staff information in agenda', async () => {
    // Create appointment
    const today = new Date().toISOString().split('T')[0];

    await appointmentPage.clickNewAppointment();
    const appointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today
    };
    await appointmentPage.fillAppointmentForm(appointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Test agenda generation
    await appointmentPage.page.click('[data-testid="test-agenda-generation"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify agenda includes patient and staff names
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText(testData.patients.valid.name);
    await expect(appointmentPage.page.locator('[data-testid="agenda-preview"]')).toContainText(testData.staff.doctor.firstName);
  });

  test('should handle staff with no Google Calendar ID', async () => {
    // Create staff member without Google Calendar ID
    await staffPage.goto('/staff');
    await staffPage.clickNewStaff();
    const staffWithoutCalendar = {
      ...testData.staff.nurse,
      googleCalendarId: ''
    };
    await staffPage.fillStaffForm(staffWithoutCalendar);
    await staffPage.submitStaffForm();

    // Create appointment for today
    const today = new Date().toISOString().split('T')[0];

    await appointmentPage.goto('/appointments');
    await appointmentPage.clickNewAppointment();
    const todayAppointment = {
      ...testData.appointments.doctorOnCall,
      appointmentDate: today
    };
    await appointmentPage.fillAppointmentForm(todayAppointment);
    await appointmentPage.submitAppointmentForm();

    // Navigate to email settings
    await appointmentPage.goto('/settings');

    // Trigger daily agenda job
    await appointmentPage.page.click('[data-testid="send-daily-agenda"]');
    await appointmentPage.waitForLoadingToFinish();

    // Verify agenda is still sent even without Google Calendar ID
    await appointmentPage.expectToast('Daily agenda emails sent successfully');
    await expect(appointmentPage.page.locator('[data-testid="email-delivery-log"]')).toContainText(testData.staff.nurse.email);
  });
});
