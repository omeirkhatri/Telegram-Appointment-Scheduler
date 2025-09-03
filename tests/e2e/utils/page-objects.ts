import { Page, Locator, expect } from '@playwright/test';
import { testData, selectors } from './test-data';

/**
 * Base page object class with common functionality
 */
export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForLoadingToFinish() {
    await this.page.waitForSelector(selectors.common.loadingSpinner, { state: 'hidden', timeout: 10000 });
  }

  async expectToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = this.page.locator(selectors.common.toast);
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(message);
  }

  async clickNavigationItem(item: 'patients' | 'staff' | 'appointments' | 'dashboard') {
    await this.page.click(selectors.navigation[item]);
    await this.waitForLoadingToFinish();
  }
}

/**
 * Patient management page object
 */
export class PatientPage extends BasePage {
  private get newPatientButton(): Locator {
    return this.page.locator('[data-testid="new-patient-button"]');
  }

  private get patientList(): Locator {
    return this.page.locator('[data-testid="patient-list"]');
  }

  async clickNewPatient() {
    await this.newPatientButton.click();
    await this.page.waitForSelector(selectors.modals.patientModal);
  }

  async fillPatientForm(patientData: typeof testData.patients.valid) {
    await this.page.fill(selectors.patientForm.name, patientData.name);
    await this.page.fill(selectors.patientForm.phone, patientData.phone);
    await this.page.fill(selectors.patientForm.flatVillaNo, patientData.flatVillaNo);
    await this.page.fill(selectors.patientForm.buildingStreet, patientData.buildingStreet);
    await this.page.fill(selectors.patientForm.area, patientData.area);
    await this.page.fill(selectors.patientForm.city, patientData.city);
    
    if (patientData.googleMapsLink) {
      await this.page.fill(selectors.patientForm.googleMapsLink, patientData.googleMapsLink);
    }
    
    if (patientData.medicalNotes) {
      await this.page.fill(selectors.patientForm.medicalNotes, patientData.medicalNotes);
    }
    
    if (patientData.emergencyContact) {
      await this.page.fill(selectors.patientForm.emergencyContact, patientData.emergencyContact);
    }
    
    if (patientData.preferredTransport) {
      await this.page.selectOption(selectors.patientForm.preferredTransport, patientData.preferredTransport);
    }
  }

  async submitPatientForm() {
    await this.page.click(selectors.patientForm.submitButton);
    await this.waitForLoadingToFinish();
  }

  async cancelPatientForm() {
    await this.page.click(selectors.patientForm.cancelButton);
  }

  async expectPatientInList(patientName: string) {
    await expect(this.patientList).toContainText(patientName);
  }

  async expectPatientModalVisible() {
    await expect(this.page.locator(selectors.modals.patientModal)).toBeVisible();
  }

  async expectPatientModalHidden() {
    await expect(this.page.locator(selectors.modals.patientModal)).toBeHidden();
  }
}

/**
 * Staff management page object
 */
export class StaffPage extends BasePage {
  private get newStaffButton(): Locator {
    return this.page.locator('[data-testid="new-staff-button"]');
  }

  private get staffList(): Locator {
    return this.page.locator('[data-testid="staff-list"]');
  }

  async clickNewStaff() {
    await this.newStaffButton.click();
    await this.page.waitForSelector(selectors.modals.staffModal);
  }

  async fillStaffForm(staffData: typeof testData.staff.doctor) {
    await this.page.fill(selectors.staffForm.firstName, staffData.firstName);
    await this.page.fill(selectors.staffForm.lastName, staffData.lastName);
    await this.page.selectOption(selectors.staffForm.staffType, staffData.staffType);
    await this.page.fill(selectors.staffForm.specialization, staffData.specialization);
    await this.page.fill(selectors.staffForm.phone, staffData.phone);
    await this.page.fill(selectors.staffForm.email, staffData.email);
    await this.page.fill(selectors.staffForm.googleCalendarId, staffData.googleCalendarId);
  }

  async submitStaffForm() {
    await this.page.click(selectors.staffForm.submitButton);
    await this.waitForLoadingToFinish();
  }

  async cancelStaffForm() {
    await this.page.click(selectors.staffForm.cancelButton);
  }

  async expectStaffInList(staffName: string) {
    await expect(this.staffList).toContainText(staffName);
  }

  async expectStaffModalVisible() {
    await expect(this.page.locator(selectors.modals.staffModal)).toBeVisible();
  }

  async expectStaffModalHidden() {
    await expect(this.page.locator(selectors.modals.staffModal)).toBeHidden();
  }
}

/**
 * Appointment calendar page object
 */
export class AppointmentPage extends BasePage {
  private get newAppointmentButton(): Locator {
    return this.page.locator('[data-testid="new-appointment-button"]');
  }

  private get calendarContainer(): Locator {
    return this.page.locator(selectors.calendar.container);
  }

  async clickNewAppointment() {
    await this.newAppointmentButton.click();
    await this.page.waitForSelector(selectors.modals.appointmentModal);
  }

  async fillAppointmentForm(appointmentData: typeof testData.appointments.doctorOnCall) {
    // Select patient (assuming first patient in dropdown)
    await this.page.click(selectors.appointmentForm.patientSelect);
    await this.page.click('[data-testid="patient-option-0"]');
    
    await this.page.selectOption(selectors.appointmentForm.appointmentType, appointmentData.appointmentType);
    await this.page.fill(selectors.appointmentForm.appointmentDate, appointmentData.appointmentDate);
    await this.page.fill(selectors.appointmentForm.startTime, appointmentData.startTime);
    await this.page.selectOption(selectors.appointmentForm.duration, appointmentData.durationMinutes.toString());
    await this.page.selectOption(selectors.appointmentForm.transportationType, appointmentData.transportationType);
    
    if (appointmentData.notes) {
      await this.page.fill(selectors.appointmentForm.notes, appointmentData.notes);
    }
  }

  async submitAppointmentForm() {
    await this.page.click(selectors.appointmentForm.submitButton);
    await this.waitForLoadingToFinish();
  }

  async cancelAppointmentForm() {
    await this.page.click(selectors.appointmentForm.cancelButton);
  }

  async expectAppointmentModalVisible() {
    await expect(this.page.locator(selectors.modals.appointmentModal)).toBeVisible();
  }

  async expectAppointmentModalHidden() {
    await expect(this.page.locator(selectors.modals.appointmentModal)).toBeHidden();
  }

  async expectCalendarVisible() {
    await expect(this.calendarContainer).toBeVisible();
  }

  async rightClickOnCalendarEvent(eventTitle: string) {
    const event = this.page.locator(selectors.calendar.event).filter({ hasText: eventTitle });
    await event.click({ button: 'right' });
    await this.page.waitForSelector(selectors.calendar.contextMenu);
  }

  async clickCopyAppointment() {
    await this.page.click(selectors.calendar.copyButton);
    await this.page.waitForSelector(selectors.modals.copyAppointmentModal);
  }

  async expectCopyAppointmentModalVisible() {
    await expect(this.page.locator(selectors.modals.copyAppointmentModal)).toBeVisible();
  }

  async dragAndDropEvent(fromEvent: string, toDate: string) {
    const event = this.page.locator(selectors.calendar.event).filter({ hasText: fromEvent });
    const targetDate = this.page.locator(`[data-date="${toDate}"]`);
    
    await event.dragTo(targetDate);
    await this.waitForLoadingToFinish();
  }
}

/**
 * Dashboard page object
 */
export class DashboardPage extends BasePage {
  private get statsCards(): Locator {
    return this.page.locator('[data-testid="stats-card"]');
  }

  private get recentAppointments(): Locator {
    return this.page.locator('[data-testid="recent-appointments"]');
  }

  async expectStatsVisible() {
    await expect(this.statsCards).toBeVisible();
  }

  async expectRecentAppointmentsVisible() {
    await expect(this.recentAppointments).toBeVisible();
  }

  async getStatValue(statName: string): Promise<string> {
    const statCard = this.statsCards.filter({ hasText: statName });
    return await statCard.locator('[data-testid="stat-value"]').textContent() || '';
  }
}
